const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ───────── embed aggregator sources (TMDB-based) ───────── */
interface Provider {
  name: string;
  quality: string;
  movieUrl: (id: number) => string;
  tvUrl: (id: number, s: number, e: number) => string;
}

const PROVIDERS: Provider[] = [
  { name: 'VidLink', quality: 'HD', movieUrl: (id) => `https://vidlink.pro/movie/${id}`, tvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}` },
  { name: 'VidFast', quality: 'HD', movieUrl: (id) => `https://vidfast.pro/movie/${id}`, tvUrl: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}` },
  { name: 'Embed.su', quality: '1080p', movieUrl: (id) => `https://embed.su/embed/movie/${id}`, tvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}` },
  { name: '2Embed', quality: 'HD', movieUrl: (id) => `https://www.2embed.cc/embed/movie?tmdb=${id}`, tvUrl: (id, s, e) => `https://www.2embed.cc/embed/tv?tmdb=${id}&s=${s}&e=${e}` },
  { name: 'RiveEmbed', quality: '1080p', movieUrl: (id) => `https://rivestream.org/embed?type=movie&id=${id}`, tvUrl: (id, s, e) => `https://rivestream.org/embed?type=tv&id=${id}&s=${s}&e=${e}` },
  { name: 'SmashyStream', quality: 'HD', movieUrl: (id) => `https://player.smashy.stream/${id}`, tvUrl: (id, s, e) => `https://player.smashy.stream/${id}?s=${s}&e=${e}` },
  { name: 'VidSrc.to', quality: 'HD', movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}` },
  { name: 'Vidnest', quality: 'HD', movieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
  { name: 'Vidzee', quality: '1080p', movieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}` },
  { name: 'VidRock', quality: 'HD', movieUrl: (id) => `https://vidsrc.icu/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc.wtf', quality: 'HD', movieUrl: (id) => `https://vidsrc.wtf/api/1/movie/?id=${id}`, tvUrl: (id, s, e) => `https://vidsrc.wtf/api/1/tv/?id=${id}&s=${s}&e=${e}` },
  { name: 'MoviesAPI', quality: 'HD', movieUrl: (id) => `https://moviesapi.club/movie/${id}`, tvUrl: (id, s, e) => `https://moviesapi.club/tv/${id}/${s}/${e}` },
  { name: 'AutoEmbed', quality: 'HD', movieUrl: (id) => `https://autoembed.co/movie/tmdb/${id}`, tvUrl: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}/${s}/${e}` },
  { name: 'MultiEmbed', quality: 'HD', movieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`, tvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
  { name: '111Movies', quality: 'HD', movieUrl: (id) => `https://111movies.com/movie/${id}`, tvUrl: (id, s, e) => `https://111movies.com/tv/${id}/${s}/${e}` },
  { name: 'PrimeWire', quality: 'HD', movieUrl: (id) => `https://www.primewire.tf/embed/movie?tmdb=${id}`, tvUrl: (id, s, e) => `https://www.primewire.tf/embed/tv?tmdb=${id}&s=${s}&e=${e}` },
  { name: 'WarezCDN', quality: 'HD', movieUrl: (id) => `https://embed.warezcdn.com/filme/${id}`, tvUrl: (id, s, e) => `https://embed.warezcdn.com/serie/${id}/${s}/${e}` },
  { name: 'SuperFlix', quality: 'HD', movieUrl: (id) => `https://superflix.stream/movie/${id}`, tvUrl: (id, s, e) => `https://superflix.stream/tv/${id}/${s}/${e}` },
];

/* ───────── Health check: HEAD request to see if embed URL responds ───────── */
async function checkProvider(
  provider: Provider,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season: number,
  episode: number,
): Promise<{ name: string; quality: string; url: string; type: 'embed'; alive: boolean }> {
  const url = mediaType === 'movie'
    ? provider.movieUrl(tmdbId)
    : provider.tvUrl(tmdbId, season, episode);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    return {
      name: provider.name,
      quality: provider.quality,
      url,
      type: 'embed',
      alive: res.ok || res.status === 302 || res.status === 301,
    };
  } catch {
    return {
      name: provider.name,
      quality: provider.quality,
      url,
      type: 'embed',
      alive: false,
    };
  }
}

/* ───────── Main handler ───────── */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, type, season, episode, tmdbId } = await req.json();

    if (!title && !tmdbId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title or TMDB ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const s = season || 1;
    const e = episode || 1;

    if (!tmdbId) {
      return new Response(
        JSON.stringify({ success: true, sources: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Health-check all providers in parallel
    console.log(`Health-checking ${PROVIDERS.length} providers for ${mediaType} ${tmdbId}`);

    const results = await Promise.allSettled(
      PROVIDERS.map(p => checkProvider(p, tmdbId, mediaType, s, e)),
    );

    const alive: typeof results extends PromiseSettledResult<infer T>[] ? T[] : never[] = [];
    const dead: typeof alive = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.alive) {
          alive.push(result.value);
        } else {
          dead.push(result.value);
        }
      }
    }

    // Sort: alive first, then dead as fallback
    const allSources = [
      ...alive.map(({ name, quality, url, type }) => ({ name, quality, url, type })),
      ...dead.map(({ name, quality, url, type }) => ({ name, quality, url, type })),
    ];

    console.log(
      `${alive.length} alive + ${dead.length} dead = ${allSources.length} total for ${mediaType} "${title || tmdbId}"`,
    );

    return new Response(
      JSON.stringify({ success: true, sources: allSources }),
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
