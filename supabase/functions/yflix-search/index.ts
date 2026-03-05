const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ───────── Embed-only providers (fallback when VPS extractor fails) ───────── */
interface Provider {
  name: string;
  quality: string;
  movieUrl: (id: number) => string;
  tvUrl: (id: number, s: number, e: number) => string;
}

const EMBED_PROVIDERS: Provider[] = [
  { name: 'VidSrc.to', quality: 'HD', movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}` },
  { name: 'Vidnest', quality: 'HD', movieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
  { name: 'Embed.su', quality: '1080p', movieUrl: (id) => `https://embed.su/embed/movie/${id}`, tvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}` },
  { name: 'Vidzee', quality: '1080p', movieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}` },
  { name: 'VidRock', quality: 'HD', movieUrl: (id) => `https://vidsrc.icu/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}` },
  { name: '2Embed', quality: 'HD', movieUrl: (id) => `https://www.2embed.cc/embed/movie?tmdb=${id}`, tvUrl: (id, s, e) => `https://www.2embed.cc/embed/tv?tmdb=${id}&s=${s}&e=${e}` },
];

/* ───────── Main handler ───────── */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, type, season, episode, tmdbId } = await req.json();

    if (!tmdbId) {
      return new Response(
        JSON.stringify({ success: false, error: 'TMDB ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const s = season || 1;
    const e = episode || 1;

    // ── Step 1: Try VPS extractor for direct HLS/MP4 streams ──
    const rawExtractorUrl = Deno.env.get('VPS_EXTRACTOR_URL');
    const extractorKey = Deno.env.get('VPS_API_KEY');
    const normalizedExtractorUrl = rawExtractorUrl
      ? (/^https?:\/\//i.test(rawExtractorUrl) ? rawExtractorUrl : `https://${rawExtractorUrl}`)
      : null;

    if (normalizedExtractorUrl && extractorKey) {
      try {
        console.log(`Calling VPS extractor for ${mediaType} ${tmdbId}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const extractRes = await fetch(`${normalizedExtractorUrl.replace(/\/$/, '')}/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': extractorKey,
          },
          body: JSON.stringify({ tmdbId, type: mediaType, season: s, episode: e }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (extractRes.ok) {
          const extractData = await extractRes.json();
          if (extractData.success && extractData.sources?.length > 0) {
            console.log(`VPS extractor returned ${extractData.sources.length} direct sources`);
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
        console.log('VPS extractor returned no sources, falling back to embeds');
      } catch (err) {
        console.error('VPS extractor error (falling back to embeds):', err);
      }
    } else {
      console.log('VPS extractor not configured, using embed fallback');
    }

    // ── Step 2: Fallback to embed URLs ──
    const embedSources = EMBED_PROVIDERS.map((p) => ({
      name: p.name,
      quality: p.quality,
      url: mediaType === 'movie' ? p.movieUrl(tmdbId) : p.tvUrl(tmdbId, s, e),
      type: 'embed' as const,
    }));

    console.log(`Returning ${embedSources.length} embed fallback sources for ${mediaType} "${title || tmdbId}"`);

    return new Response(
      JSON.stringify({ success: true, sources: embedSources }),
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
