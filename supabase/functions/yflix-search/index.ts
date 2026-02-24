const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, type, year, season, episode } = await req.json();

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

    // Step 1: Search yflix.to for the title
    const searchQuery = `site:yflix.to/watch ${title} ${year || ''}`.trim();
    console.log('Searching:', searchQuery);

    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchQuery, limit: 5 }),
    });

    const searchData = await searchResponse.json();
    if (!searchResponse.ok) {
      console.error('Search error:', searchData);
      return new Response(
        JSON.stringify({ success: false, error: 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = searchData.data || searchData.results || [];
    let watchUrl = '';
    for (const result of results) {
      const url = result.url || result.link || '';
      if (url.includes('yflix.to/watch/')) {
        watchUrl = url;
        break;
      }
    }

    if (!watchUrl) {
      // Fallback: try map
      const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: 'https://yflix.to', search: title, limit: 10 }),
      });
      const mapData = await mapResponse.json();
      if (mapResponse.ok) {
        for (const link of (mapData.links || [])) {
          if (link.includes('/watch/')) {
            watchUrl = link;
            break;
          }
        }
      }
    }

    if (!watchUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'No results found on yflix' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found watch URL:', watchUrl);

    // Step 2: Scrape the yflix watch page to extract embedded player URLs
    // Append episode hash for TV shows
    let scrapeUrl = watchUrl;
    if (type === 'tv' && season && episode) {
      scrapeUrl = `${watchUrl}#ep=${season},${episode}`;
    }

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: scrapeUrl,
        formats: ['html'],
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok) {
      console.error('Scrape error:', scrapeData);
      // Fallback: return the watch URL to open in new tab
      return new Response(
        JSON.stringify({ success: true, watchUrl, sources: [], fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = scrapeData.data?.html || scrapeData.html || '';
    
    // Extract iframe src URLs from the page - these are the actual video embeds
    const iframeSrcRegex = /iframe[^>]*src=["']([^"']+)["']/gi;
    const embedUrls: string[] = [];
    let match;
    while ((match = iframeSrcRegex.exec(html)) !== null) {
      const src = match[1];
      // Filter for actual video embed URLs (not ads)
      if (src && !src.includes('google') && !src.includes('facebook') && !src.includes('anigo') && !src.includes('ads')) {
        embedUrls.push(src);
      }
    }

    // Also look for data-src or data-url patterns used by lazy-loaded players
    const dataSrcRegex = /data-(?:src|url)=["']([^"']*(?:embed|player|stream)[^"']*)["']/gi;
    while ((match = dataSrcRegex.exec(html)) !== null) {
      if (match[1] && !embedUrls.includes(match[1])) {
        embedUrls.push(match[1]);
      }
    }

    console.log('Found embed URLs:', embedUrls);

    const sources = embedUrls.map((url, idx) => ({
      name: `Server ${idx + 1}`,
      quality: 'HD',
      url,
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        watchUrl, 
        sources,
        fallback: sources.length === 0,
      }),
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
