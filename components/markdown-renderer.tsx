import React from "react";

interface MarkdownRendererProps {
  content: string | null | undefined;
}

// Memoized: prevents re-renders when parent state changes (status toggle, theme, etc.)
export const MarkdownRenderer = React.memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) {
    return <span className="italic text-ink-muted/50 font-sans text-xs">No entry recorded.</span>;
  }

  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeLines: string[] = [];
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        elements.push(
          <pre 
            key={`code-${i}`} 
            className="bg-ink text-paper p-3 my-2 font-mono text-[11px] overflow-x-auto border-l-2 border-accent leading-normal select-text"
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Handle Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="font-serif text-sm font-bold mt-4 mb-1.5 text-ink leading-snug">
          {parseInline(line.slice(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="font-serif text-base font-bold mt-5 mb-2 text-ink leading-snug">
          {parseInline(line.slice(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="font-serif text-lg font-bold mt-6 mb-2.5 text-ink leading-snug">
          {parseInline(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Handle Lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      elements.push(
        <li key={i} className="list-disc pl-1 ml-4 text-xs leading-relaxed text-ink/90 my-1 font-sans">
          {parseInline(line.trim().slice(2))}
        </li>
      );
      continue;
    }

    // Handle Empty lines
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Handle regular paragraphs
    elements.push(
      <p key={i} className="text-xs leading-relaxed text-ink/95 my-1.5 font-sans">
        {parseInline(line)}
      </p>
    );
  }

  return <div className="space-y-0.5 select-text">{elements}</div>;
});

function parseInline(text: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-bold text-ink">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="bg-border/60 px-1 font-mono text-[10px] text-accent-secondary font-semibold">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index} className="italic text-ink-muted">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
