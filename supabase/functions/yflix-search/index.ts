const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function searchSite(
  apiKey: string,
  site: string,
  siteName: string,
  title: string,
  year?: string,
): Promise<string | null> {
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
      if (url.includes('/watch/') || url.includes('/movie/') || url.includes('/tv/') || url.includes('-free-') || url.includes('-hd-')) {
        console.log(`${siteName} found:`, url);
        return url;
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const mediaType = type === 'tv' ? 'tv' : 'movie';

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const [yflixFound, sflixFound] = await Promise.all([
      searchSite(apiKey, 'yflix.to', 'YFlix', title, year),
      searchSite(apiKey, 'sflix.ps', 'SFlix', title, year),
    ]);

    const sources: { name: string; quality: string; url: string }[] = [];

    if (yflixFound) {
      let url = yflixFound;
      if (mediaType === 'tv' && season && episode) {
        url = `${url}${url.includes('?') ? '&' : '?'}season=${season}&episode=${episode}`;
      }
      sources.push({ name: 'YFlix', quality: 'HD', url });
    }

    if (sflixFound) {
      let url = sflixFound;
      if (mediaType === 'tv' && season && episode) {
        url = `${url}${url.includes('?') ? '&' : '?'}season=${season}&episode=${episode}`;
      }
      sources.push({ name: 'SFlix', quality: 'HD', url });
    }

    if (!sources.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'No results found for this title' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Returning ${sources.length} source(s)`);

    return new Response(
      JSON.stringify({ success: true, sources }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
