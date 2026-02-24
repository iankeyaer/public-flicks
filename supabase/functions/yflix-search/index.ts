const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, type, year } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search yflix.to for the title
    const searchQuery = `site:yflix.to ${title} ${year || ''} ${type === 'tv' ? 'TV' : 'movie'}`.trim();
    console.log('Searching:', searchQuery);

    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error('Firecrawl search error:', searchData);
      return new Response(
        JSON.stringify({ success: false, error: 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find yflix.to/watch/ URLs from search results
    const results = searchData.data || searchData.results || [];
    const watchUrls: string[] = [];

    for (const result of results) {
      const url = result.url || result.link || '';
      if (url.includes('yflix.to/watch/')) {
        watchUrls.push(url);
      }
    }

    // Also try a direct map of yflix.to to find the URL
    if (watchUrls.length === 0) {
      console.log('No search results, trying map...');
      const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://yflix.to',
          search: title,
          limit: 10,
        }),
      });

      const mapData = await mapResponse.json();
      if (mapResponse.ok) {
        const links = mapData.links || [];
        for (const link of links) {
          if (link.includes('/watch/')) {
            watchUrls.push(link);
          }
        }
      }
    }

    if (watchUrls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No results found on yflix' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found watch URLs:', watchUrls);

    return new Response(
      JSON.stringify({ success: true, watchUrl: watchUrls[0], allUrls: watchUrls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
