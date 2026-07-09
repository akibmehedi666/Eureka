async function test() {
  const docId = '8476568';
  const openAlexUrl = `https://api.openalex.org/works?search=${docId}`;
  try {
    console.log('Fetching OpenAlex search:', openAlexUrl);
    const response = await fetch(openAlexUrl, {
      headers: {
        "User-Agent": "EurekaScholar/1.0 (mailto:scholar@eureka.org)",
      },
    });
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Results count:', data.results?.length);
    if (data.results && data.results.length > 0) {
      for (const work of data.results.slice(0, 3)) {
        console.log('--- Result ---');
        console.log('Title:', work.title);
        console.log('Authors:', work.authorships?.map(a => a.author?.display_name).join(', '));
        console.log('Year:', work.publication_year);
        console.log('DOI:', work.doi);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
