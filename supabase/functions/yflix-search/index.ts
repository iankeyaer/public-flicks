const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EmbedResult {
  name: string;
  quality: string;
  url: string; // the actual embed / video-player URL
}

/**
 * Scrape a watch page and pull out the first embeddable video iframe src.
 * Falls back to the watch-page URL itself if no iframe is found.
 */
async function extractEmbed(
  apiKey: string,
  watchUrl: string,
  siteName: string,
): Promise<string> {
  try {
    console.log(`Scraping ${siteName} watch page for embed:`, watchUrl);

    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: watchUrl,
        formats: ['html'],
        waitFor: 3000, // wait for JS to render the player
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error(`${siteName} scrape error:`, json);
      return watchUrl;
    }

    const html: string = json.data?.html || json.html || '';

    // Look for iframe src attributes that point to known embed / video domains
    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;
    const embedHints = [
      'embed', 'player', 'vidsrc', 'vidcloud', 'rabbitstream',
      'upstream', 'mixdrop', 'streamtape', 'doodstream', 'filemoon',
      'vidplay', 'mycloud', 'mp4upload', 'streamsb', 'supervideo',
      'vidoza', 'vidmoly', 'closeload', 'playtaku', 'megacloud',
      'rapid', 'streamwish',
    ];

    while ((match = iframeRegex.exec(html)) !== null) {
      const src = match[1];
      if (embedHints.some((h) => src.toLowerCase().includes(h))) {
        const embedUrl = src.startsWith('//') ? `https:${src}` : src;
        console.log(`${siteName} embed found:`, embedUrl);
        return embedUrl;
      }
    }

    // Secondary: look for any iframe src that looks like a video player
    iframeRegex.lastIndex = 0;
    while ((match = iframeRegex.exec(html)) !== null) {
      const src = match[1];
      // Skip social / ad iframes
      if (
        !src.includes('google') &&
        !src.includes('facebook') &&
        !src.includes('twitter') &&
        !src.includes('ads') &&
        src.startsWith('http')
      ) {
        console.log(`${siteName} fallback iframe:`, src);
        return src;
      }
    }

    console.log(`${siteName} no embed iframe found, using watch URL`);
    return watchUrl;
  } catch (err) {
    console.error(`${siteName} embed extraction error:`, err);
    return watchUrl;
  }
}

/**
 * Search a streaming site for the title using Firecrawl search + map.
 */
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
      if (url.includes('/watch/') || url.includes('/movie/') || url.includes('/tv/')) {
        console.log(`${siteName} found:`, url);
        return url;
      }
    }

    // Fallback: map endpoint
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
      for (const link of mapData.links || []) {
        if (link.includes('/watch/') || link.includes('/movie/') || link.includes('/tv/')) {
          console.log(`${siteName} map found:`, link);
          return link;
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Search both sites in parallel for watch-page URLs
    const [yflixUrl, sflixUrl] = await Promise.all([
      searchSite(apiKey, 'yflix.to', 'YFlix', title, year),
      searchSite(apiKey, 'sflix.ps', 'SFlix', title, year),
    ]);

    // 2. For every watch URL found, scrape the page to get the actual embed URL
    const embedPromises: Promise<EmbedResult | null>[] = [];

    if (yflixUrl) {
      let url = yflixUrl;
      if (type === 'tv' && season && episode) url = `${url}#ep=${season},${episode}`;
      embedPromises.push(
        extractEmbed(apiKey, url, 'YFlix').then((embedUrl) => ({
          name: 'Server 1',
          quality: 'HD',
          url: embedUrl,
        })),
      );
    }

    if (sflixUrl) {
      let url = sflixUrl;
      if (type === 'tv' && season && episode) {
        url = url.includes('?')
          ? `${url}&season=${season}&episode=${episode}`
          : `${url}?season=${season}&episode=${episode}`;
      }
      embedPromises.push(
        extractEmbed(apiKey, url, 'SFlix').then((embedUrl) => ({
          name: 'Server 2',
          quality: 'HD',
          url: embedUrl,
        })),
      );
    }

    const results = (await Promise.all(embedPromises)).filter(Boolean) as EmbedResult[];

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No results found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, sources: results }),
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
