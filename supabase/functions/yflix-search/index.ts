const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ───────── Search yflix.to and find the correct watch page ───────── */
async function searchYflix(
  title: string,
  type: 'movie' | 'tv',
  year?: string,
): Promise<string | null> {
  const keyword = encodeURIComponent(title);
  const searchUrl = `https://yflix.to/browser?keyword=${keyword}`;

  console.log(`Searching yflix.to: ${searchUrl}`);

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
  });

  if (!res.ok) {
    console.error(`yflix search returned ${res.status}`);
    return null;
  }

  const html = await res.text();

  // Parse search results - look for links like /watch/shelter.8kxbz
  // Each result card has: <a href="/watch/slug.id"> and nearby year info
  // Pattern: find all watch links with their surrounding context
  const resultPattern =
    /<a[^>]*href="(https:\/\/yflix\.to\/watch\/[^"]+)"[^>]*>[\s\S]*?<\/a>/gi;

  // Simpler approach: extract all watch URLs and their nearby text
  const watchLinks: { url: string; context: string }[] = [];

  // Find film items - they have class "film-item" or similar card structure
  // Each card has a link and metadata including year
  const cardPattern =
    /href="(https?:\/\/yflix\.to\/watch\/[^"]+)"[\s\S]*?(?:Movie|TV)[\s\S]*?(\d{4})[\s\S]*?(\d+)\s*min/gi;

  let match;
  while ((match = cardPattern.exec(html)) !== null) {
    watchLinks.push({
      url: match[1],
      context: match[0],
    });
  }

  // If cardPattern didn't work, try a simpler pattern
  if (watchLinks.length === 0) {
    const simplePattern =
      /href="(https?:\/\/yflix\.to\/watch\/[^"]+)"/gi;
    while ((match = simplePattern.exec(html)) !== null) {
      // Get surrounding context (200 chars after the match)
      const startIdx = match.index;
      const context = html.substring(startIdx, startIdx + 500);
      watchLinks.push({ url: match[1], context });
    }
  }

  console.log(`Found ${watchLinks.length} watch links on yflix.to`);

  if (watchLinks.length === 0) return null;

  // Try to match by title and year
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const link of watchLinks) {
    const ctx = link.context.toLowerCase();
    // Check if context contains the year
    if (year && ctx.includes(year)) {
      // Check if URL slug roughly matches the title
      const slug = link.url.split('/watch/')[1]?.split('.')[0] || '';
      const normalizedSlug = slug.replace(/-/g, '').replace(/\d+$/, '');
      if (
        normalizedSlug === normalizedTitle ||
        normalizedSlug.includes(normalizedTitle) ||
        normalizedTitle.includes(normalizedSlug)
      ) {
        console.log(`Matched by title+year: ${link.url}`);
        return link.url;
      }
    }
  }

  // Fallback: match by title slug only
  for (const link of watchLinks) {
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

  // Last resort: return first result
  console.log(`No exact match, returning first result: ${watchLinks[0].url}`);
  return watchLinks[0].url;
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

    // ── Step 1: Search yflix.to for the watch page URL ──
    const searchTitle = title || `${tmdbId}`;
    const watchUrl = await searchYflix(searchTitle, mediaType, year);

    if (!watchUrl) {
      console.log(`No results found on yflix.to for "${searchTitle}"`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `No results found for "${searchTitle}" on yflix.to`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 2: Try VPS extractor for direct HLS/MP4 streams from the yflix watch page ──
    const rawExtractorUrl = Deno.env.get('VPS_EXTRACTOR_URL');
    const extractorKey = Deno.env.get('VPS_API_KEY');
    const normalizedExtractorUrl = rawExtractorUrl
      ? /^https?:\/\//i.test(rawExtractorUrl)
        ? rawExtractorUrl
        : `https://${rawExtractorUrl}`
      : null;

    if (normalizedExtractorUrl && extractorKey) {
      try {
        console.log(`Calling VPS extractor for yflix watch page: ${watchUrl}`);
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
              watchUrl, // Pass the yflix watch URL to the extractor
            }),
            signal: controller.signal,
          },
        );
        clearTimeout(timeout);

        if (extractRes.ok) {
          const extractData = await extractRes.json();
          if (extractData.success && extractData.sources?.length > 0) {
            console.log(
              `VPS extractor returned ${extractData.sources.length} direct sources`,
            );
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
        console.error('VPS extractor error (falling back to embed):', err);
      }
    } else {
      console.log('VPS extractor not configured, using yflix watch page as embed');
    }

    // ── Step 3: Return the yflix watch page URL as embed fallback ──
    console.log(`Returning yflix.to watch page as source: ${watchUrl}`);

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
