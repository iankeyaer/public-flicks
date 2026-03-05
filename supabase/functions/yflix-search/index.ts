const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ───────── Search yflix.to via Firecrawl (bypasses Cloudflare) ───────── */
async function searchYflix(
  title: string,
  type: 'movie' | 'tv',
  year?: string,
): Promise<string | null> {
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlKey) {
    console.error('FIRECRAWL_API_KEY not configured');
    return null;
  }

  const keyword = encodeURIComponent(title);
  const searchUrl = `https://yflix.to/browser?keyword=${keyword}`;
  console.log(`Scraping yflix.to search via Firecrawl: ${searchUrl}`);

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['html'],
        waitFor: 3000,
      }),
    });

    if (!res.ok) {
      console.error(`Firecrawl scrape returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const html = data?.data?.html || data?.html || '';

    if (!html) {
      console.error('Firecrawl returned no HTML');
      return null;
    }

    // Parse results - find watch URLs with year context
    const watchLinks: { url: string; context: string }[] = [];
    const linkPattern = /href="((?:https?:\/\/yflix\.to)?\/watch\/[^"]+)"/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1].startsWith('http')
        ? match[1]
        : `https://yflix.to${match[1]}`;
      const startIdx = match.index;
      const context = html.substring(startIdx, startIdx + 600);
      watchLinks.push({ url, context });
    }

    // Deduplicate
    const seen = new Set<string>();
    const uniqueLinks = watchLinks.filter((l) => {
      if (seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    });

    console.log(`Found ${uniqueLinks.length} unique watch links on yflix.to`);
    if (uniqueLinks.length === 0) return null;

    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Match by title slug + year
    for (const link of uniqueLinks) {
      const slug = link.url.split('/watch/')[1]?.split('.')[0] || '';
      const normalizedSlug = slug.replace(/-/g, '').replace(/\d+$/, '');
      const ctx = link.context;

      const titleMatch =
        normalizedSlug === normalizedTitle ||
        normalizedSlug.includes(normalizedTitle) ||
        normalizedTitle.includes(normalizedSlug);

      if (titleMatch && year && ctx.includes(year)) {
        console.log(`Matched by title+year: ${link.url}`);
        return link.url;
      }
    }

    // Match by title slug only
    for (const link of uniqueLinks) {
      const slug = link.url.split('/watch/')[1]?.split('.')[0] || '';
      const normalizedSlug = slug.replace(/-/g, '').replace(/\d+$/, '');
      if (
        normalizedSlug === normalizedTitle ||
        normalizedSlug.includes(normalizedTitle) ||
        normalizedTitle.includes(normalizedSlug)
      ) {
        console.log(`Matched by title slug: ${link.url}`);
        return link.url;
      }
    }

    console.log(`No exact match, returning first: ${uniqueLinks[0].url}`);
    return uniqueLinks[0].url;
  } catch (err) {
    console.error('Firecrawl search error:', err);
    return null;
  }
}

/* ───────── Main handler ───────── */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, type, season, episode, tmdbId, year } = await req.json();

    if (!tmdbId && !title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title or TMDB ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const s = season || 1;
    const e = episode || 1;
    const searchTitle = title || `${tmdbId}`;

    // ── Step 1: Search yflix.to for the watch page URL ──
    const watchUrl = await searchYflix(searchTitle, mediaType, year);

    if (!watchUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No results found for "${searchTitle}" on yflix.to`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 2: Try VPS extractor for direct HLS/MP4 streams ──
    const rawExtractorUrl = Deno.env.get('VPS_EXTRACTOR_URL');
    const extractorKey = Deno.env.get('VPS_API_KEY');
    const normalizedExtractorUrl = rawExtractorUrl
      ? /^https?:\/\//i.test(rawExtractorUrl)
        ? rawExtractorUrl
        : `https://${rawExtractorUrl}`
      : null;

    if (normalizedExtractorUrl && extractorKey) {
      try {
        console.log(`Calling VPS extractor for: ${watchUrl}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const extractRes = await fetch(
          `${normalizedExtractorUrl.replace(/\/$/, '')}/extract`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': extractorKey,
            },
            body: JSON.stringify({
              tmdbId,
              type: mediaType,
              season: s,
              episode: e,
              watchUrl,
            }),
            signal: controller.signal,
          },
        );
        clearTimeout(timeout);

        if (extractRes.ok) {
          const extractData = await extractRes.json();
          if (extractData.success && extractData.sources?.length > 0) {
            console.log(`VPS extractor returned ${extractData.sources.length} sources`);
            return new Response(
              JSON.stringify({
                success: true,
                sources: extractData.sources.map((src: any, idx: number) => ({
                  name: src.name || `Server ${idx + 1}`,
                  quality: src.quality || 'HD',
                  url: src.url,
                  type: src.type || 'hls',
                })),
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
        }
        console.log('VPS extractor returned no sources, falling back to embed');
      } catch (err) {
        console.error('VPS extractor error:', err);
      }
    }

    // ── Step 3: Return the yflix watch page URL as embed fallback ──
    console.log(`Returning yflix.to watch URL: ${watchUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        sources: [
          {
            name: 'YFlix',
            quality: '1080p',
            url: watchUrl,
            type: 'embed',
          },
        ],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
