interface ExtractedMetadata {
  title: string;
  authors: string;
  year: number | null;
  sourceUrl?: string;
}

function extractMetaContent(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  }

  return null;
}

function extractMetaContents(html: string, name: string): string[] {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "gi"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "gi"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "gi"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, "gi"),
  ];

  const values: string[] = [];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = match[1]?.replace(/\s+/g, " ").trim();
      if (value) values.push(value);
    }
  }

  return values;
}

// Helper to clean up titles from filenames
export function cleanFilenameTitle(filename: string): string {
  // Remove extension
  let base = filename.replace(/\.[^/.]+$/, "");
  
  // Decode URL encoding if present
  try {
    base = decodeURIComponent(base);
  } catch {
    // Ignore URL decode errors
  }

  // Replace dashes, underscores, and dots with spaces
  base = base.replace(/[-_.]/g, " ");

  // Convert multiple spaces to a single space
  base = base.replace(/\s+/g, " ").trim();

  // Convert to Title Case
  return base
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Fetch metadata from arXiv
async function fetchArxivMetadata(arxivId: string): Promise<ExtractedMetadata | null> {
  try {
    const response = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`);
    if (!response.ok) return null;

    const xml = await response.text();

    // extract title inside <entry>
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return null;

    const entryContent = entryMatch[1];

    // Extract title and clean whitespace/newlines
    const titleMatch = entryContent.match(/<title>([\s\S]*?)<\/title>/);
    let title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
    
    // Remove "Title:" prefix if arXiv API returns it
    if (title.toLowerCase().startsWith("title:")) {
      title = title.slice(6).trim();
    }

    // Extract all authors
    const authorMatches = [...entryContent.matchAll(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g)];
    const authors = authorMatches.map((m) => m[1].trim()).join(", ") || "Unknown Author";

    // Extract published year
    const publishedMatch = entryContent.match(/<published>(\d{4})/);
    const year = publishedMatch ? parseInt(publishedMatch[1], 10) : null;

    return {
      title: title || "Untitled arXiv Paper",
      authors,
      year,
      sourceUrl: `https://arxiv.org/abs/${arxivId}`,
    };
  } catch {
    return null;
  }
}

// Fetch metadata from Crossref (DOI)
async function fetchCrossrefMetadata(doi: string): Promise<ExtractedMetadata | null> {
  try {
    // Clean DOI prefix if present
    const cleanDoi = doi.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, "").trim();
    
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
      headers: {
        "User-Agent": "EurekaScholar/1.0 (mailto:scholar@eureka.org)",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const work = data.message;

    const title = work.title?.[0] || "Untitled Document";
    
    // Join authors: "First Last"
    const authorsList = work.author || [];
    const authors = authorsList
      .map((auth: { given?: string; family?: string }) => {
        if (auth.given && auth.family) return `${auth.given} ${auth.family}`;
        return auth.family || auth.given || "";
      })
      .filter(Boolean)
      .join(", ") || "Unknown Author";

    // Get year from published date
    let year: number | null = null;
    const dateParts = work.published?.["date-parts"]?.[0] || work.created?.["date-parts"]?.[0];
    if (dateParts && dateParts[0]) {
      year = parseInt(dateParts[0], 10);
    }

    return {
      title,
      authors,
      year,
      sourceUrl: `https://doi.org/${cleanDoi}`,
    };
  } catch {
    return null;
  }
}

async function fetchHtmlMetadata(url: string): Promise<ExtractedMetadata | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EurekaScholar/1.0; +mailto:scholar@eureka.org)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    const citationTitle = extractMetaContent(html, "citation_title");
    const citationAuthors = extractMetaContents(html, "citation_author");
    const citationDoi = extractMetaContent(html, "citation_doi");
    const citationDate =
      extractMetaContent(html, "citation_publication_date") ||
      extractMetaContent(html, "citation_date") ||
      extractMetaContent(html, "citation_year");

    if (citationDoi) {
      const crossrefMeta = await fetchCrossrefMetadata(citationDoi);
      if (crossrefMeta) {
        return { ...crossrefMeta, sourceUrl: url };
      }
    }

    if (citationTitle) {
      const yearMatch = citationDate?.match(/\d{4}/);
      return {
        title: citationTitle,
        authors: citationAuthors.join(", ") || "Unknown Author",
        year: yearMatch ? parseInt(yearMatch[0], 10) : null,
        sourceUrl: url,
      };
    }

    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (titleMatch?.[1]) {
      const title = titleMatch[1].replace(/\s+/g, " ").trim();
      if (title && !/^(document from|ieee xplore)/i.test(title)) {
        return {
          title,
          authors: "Web Resource",
          year: new Date().getFullYear(),
          sourceUrl: url,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchIeeeMetadata(url: string): Promise<ExtractedMetadata | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EurekaScholar/1.0; +mailto:scholar@eureka.org)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    const doi =
      extractMetaContent(html, "citation_doi") ||
      html.match(/doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i)?.[1] ||
      null;

    if (doi) {
      const crossrefMeta = await fetchCrossrefMetadata(doi);
      if (crossrefMeta) {
        return { ...crossrefMeta, sourceUrl: url };
      }
    }

    const title = extractMetaContent(html, "citation_title");
    const authors = extractMetaContents(html, "citation_author");
    const date =
      extractMetaContent(html, "citation_publication_date") ||
      extractMetaContent(html, "citation_date");

    if (title) {
      const yearMatch = date?.match(/\d{4}/);
      return {
        title,
        authors: authors.join(", ") || "Unknown Author",
        year: yearMatch ? parseInt(yearMatch[0], 10) : null,
        sourceUrl: url,
      };
    }

    const documentId = url.match(/\/document\/(\d+)/)?.[1];
    if (documentId) {
      const metadataUrl = `https://ieeexplore.ieee.org/rest/document/${documentId}/metadata`;
      const metaResponse = await fetch(metadataUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EurekaScholar/1.0; +mailto:scholar@eureka.org)",
          Accept: "application/json",
        },
      });

      if (metaResponse.ok) {
        const data = await metaResponse.json();
        const apiTitle = data?.title || data?.articleTitle;
        const apiAuthors = (data?.authors || [])
          .map((author: { preferredName?: string; name?: string }) => author.preferredName || author.name)
          .filter(Boolean)
          .join(", ");
        const apiYear = data?.publicationYear || data?.pubYear;

        if (apiTitle) {
          return {
            title: apiTitle,
            authors: apiAuthors || "Unknown Author",
            year: apiYear ? parseInt(String(apiYear), 10) : null,
            sourceUrl: url,
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Main parser entry point
export async function extractMetadata(input: string): Promise<ExtractedMetadata | null> {
  const trimmed = input.trim();

  // 1. Check for arXiv ID or URL
  // Matches: 1706.03762, https://arxiv.org/abs/1706.03762, https://arxiv.org/pdf/1706.03762.pdf etc.
  const arxivIdRegex = /(?:arxiv\.org\/(?:abs|pdf)\/|arxiv:)?(\d{4}\.\d{4,5}(?:v\d+)?)/i;
  const arxivMatch = trimmed.match(arxivIdRegex);
  if (arxivMatch && arxivMatch[1]) {
    return await fetchArxivMetadata(arxivMatch[1]);
  }

  // 2. Check for DOI or DOI URL
  // Matches: 10.1145/3313831.3376166, https://doi.org/10.1145/3313831.3376166, dx.doi.org/10.1145/3313831.3376166
  const doiRegex = /(?:doi\.org\/|doi:)?(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;
  const doiMatch = trimmed.match(doiRegex);
  if (doiMatch && doiMatch[1]) {
    return await fetchCrossrefMetadata(doiMatch[1]);
  }

  // 3. IEEE Xplore URLs
  if (/ieeexplore\.ieee\.org/i.test(trimmed)) {
    const ieeeMeta = await fetchIeeeMetadata(trimmed);
    if (ieeeMeta) return ieeeMeta;
  }

  // 4. Fallback generic fetch (if it is a URL, check if we can scrape title)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const htmlMeta = await fetchHtmlMetadata(trimmed);
    if (htmlMeta) return htmlMeta;
  }

  return null;
}
