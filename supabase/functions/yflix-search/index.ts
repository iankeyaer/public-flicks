const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SiteResult {
  name: string;
  watchUrl: string;
}

async function searchSite(
  apiKey: string,
  site: string,
  siteName: string,
  title: string,
  year?: string
): Promise<SiteResult | null> {
  try {
    const searchQuery = `site:${site} ${title} ${year || ''}`.trim();
    console.log(`Searching ${siteName}:`, searchQuery);

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
      console.error(`${siteName} search error:`, searchData);
      return null;
    }

    const results = searchData.data || searchData.results || [];
    for (const result of results) {
      const url = result.url || result.link || '';
      if (url.includes('/watch/') || url.includes('/movie/') || url.includes('/tv/')) {
        console.log(`${siteName} found:`, url);
        return { name: siteName, watchUrl: url };
      }
    }

    // Fallback: try map endpoint
    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: `https://${site}`, search: title, limit: 10 }),
    });
    const mapData = await mapResponse.json();
    if (mapResponse.ok) {
      for (const link of (mapData.links || [])) {
        if (link.includes('/watch/') || link.includes('/movie/') || link.includes('/tv/')) {
          console.log(`${siteName} map found:`, link);
          return { name: siteName, watchUrl: link };
        }
      }
    }

    return null;
  } catch (err) {
    console.error(`${siteName} error:`, err);
    return null;
  }
}

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

    // Search both sites in parallel
    const [yflixResult, sflixResult] = await Promise.all([
      searchSite(apiKey, 'yflix.to', 'YFlix', title, year),
      searchSite(apiKey, 'sflix.ps', 'SFlix', title, year),
    ]);

    const sources: { name: string; quality: string; url: string }[] = [];

    if (yflixResult) {
      let url = yflixResult.watchUrl;
      if (type === 'tv' && season && episode) {
        url = `${url}#ep=${season},${episode}`;
      }
      sources.push({ name: 'YFlix', quality: 'HD', url });
    }

    if (sflixResult) {
      let url = sflixResult.watchUrl;
      if (type === 'tv' && season && episode) {
        // sflix typically uses query params or path for episodes
        if (url.includes('?')) {
          url = `${url}&season=${season}&episode=${episode}`;
        } else {
          url = `${url}?season=${season}&episode=${episode}`;
        }
      }
      sources.push({ name: 'SFlix', quality: 'HD', url });
    }

    if (sources.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No results found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sources }),
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
