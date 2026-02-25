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
  // Prioritize iframe-friendly hosts first for in-app playback.
  { name: 'Embed.su', quality: '1080p', movieUrl: (id) => `https://embed.su/embed/movie/${id}`, tvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc.to', quality: 'HD', movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}` },
  { name: 'Vidnest', quality: 'HD', movieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
  { name: 'Vidzee', quality: '1080p', movieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}` },
  { name: 'VidRock', quality: 'HD', movieUrl: (id) => `https://vidsrc.icu/embed/movie/${id}`, tvUrl: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}` },
  { name: '2Embed', quality: 'HD', movieUrl: (id) => `https://www.2embed.cc/embed/movie?tmdb=${id}`, tvUrl: (id, s, e) => `https://www.2embed.cc/embed/tv?tmdb=${id}&s=${s}&e=${e}` },
  { name: 'RiveEmbed', quality: '1080p', movieUrl: (id) => `https://rivestream.org/embed?type=movie&id=${id}`, tvUrl: (id, s, e) => `https://rivestream.org/embed?type=tv&id=${id}&s=${s}&e=${e}` },
  { name: 'VidFast', quality: 'HD', movieUrl: (id) => `https://vidfast.pro/movie/${id}`, tvUrl: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}` },
  { name: 'VidLink', quality: 'HD', movieUrl: (id) => `https://vidlink.pro/movie/${id}`, tvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}` },
  { name: 'SmashyStream', quality: 'HD', movieUrl: (id) => `https://player.smashy.stream/${id}`, tvUrl: (id, s, e) => `https://player.smashy.stream/${id}?s=${s}&e=${e}` },
  { name: 'VidSrc.wtf', quality: 'HD', movieUrl: (id) => `https://vidsrc.wtf/api/1/movie/?id=${id}`, tvUrl: (id, s, e) => `https://vidsrc.wtf/api/1/tv/?id=${id}&s=${s}&e=${e}` },
  { name: 'MoviesAPI', quality: 'HD', movieUrl: (id) => `https://moviesapi.club/movie/${id}`, tvUrl: (id, s, e) => `https://moviesapi.club/tv/${id}/${s}/${e}` },
  { name: 'AutoEmbed', quality: 'HD', movieUrl: (id) => `https://autoembed.co/movie/tmdb/${id}`, tvUrl: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}/${s}/${e}` },
  { name: 'MultiEmbed', quality: 'HD', movieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`, tvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
  { name: '111Movies', quality: 'HD', movieUrl: (id) => `https://111movies.com/movie/${id}`, tvUrl: (id, s, e) => `https://111movies.com/tv/${id}/${s}/${e}` },
  { name: 'PrimeWire', quality: 'HD', movieUrl: (id) => `https://www.primewire.tf/embed/movie?tmdb=${id}`, tvUrl: (id, s, e) => `https://www.primewire.tf/embed/tv?tmdb=${id}&s=${s}&e=${e}` },
  { name: 'WarezCDN', quality: 'HD', movieUrl: (id) => `https://embed.warezcdn.com/filme/${id}`, tvUrl: (id, s, e) => `https://embed.warezcdn.com/serie/${id}/${s}/${e}` },
  { name: 'SuperFlix', quality: 'HD', movieUrl: (id) => `https://superflix.stream/movie/${id}`, tvUrl: (id, s, e) => `https://superflix.stream/tv/${id}/${s}/${e}` },
];

/* ───────── Embed compatibility checks ───────── */
const EMBED_BLOCK_HINTS = [
  'iframe sandbox detected',
  'disable sandbox',
  'sandbox detected',
  'frame embedding is disabled',
  'cannot be embedded',
  'refused to connect',
];

function blocksEmbeddingByHeaders(headers: Headers): boolean {
  const xFrameOptions = headers.get('x-frame-options')?.toLowerCase() ?? '';
  if (xFrameOptions.includes('deny') || xFrameOptions.includes('sameorigin')) return true;

  const csp = headers.get('content-security-policy')?.toLowerCase() ?? '';
  const frameAncestors = csp.match(/frame-ancestors[^;]*/)?.[0] ?? '';
  if (frameAncestors.includes("'none'") || frameAncestors.includes("'self'")) return true;

  return false;
}

function hasSandboxBlockHint(html: string): boolean {
  const lower = html.toLowerCase();
  return EMBED_BLOCK_HINTS.some((hint) => lower.includes(hint));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timeout);
  }
}

/* ───────── Health check: ensure embed URL responds and is iframe-safe ───────── */
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
    const headRes = await fetchWithTimeout(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const headReachable = headRes.ok || headRes.status === 301 || headRes.status === 302;
    if (!headReachable || blocksEmbeddingByHeaders(headRes.headers)) {
      return {
        name: provider.name,
        quality: provider.quality,
        url,
        type: 'embed',
        alive: false,
      };
    }

    // Lightweight GET to catch known sandbox-block pages that still answer HEAD/200.
    try {
      const getRes = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Range: 'bytes=0-12000',
          Accept: 'text/html,*/*;q=0.8',
        },
      }, 7000);

      const contentType = getRes.headers.get('content-type')?.toLowerCase() ?? '';
      const shouldInspectBody = getRes.ok && contentType.includes('text/html');

      if (blocksEmbeddingByHeaders(getRes.headers)) {
        return {
          name: provider.name,
          quality: provider.quality,
          url,
          type: 'embed',
          alive: false,
        };
      }

      if (shouldInspectBody) {
        const htmlSnippet = (await getRes.text()).slice(0, 12000);
        if (hasSandboxBlockHint(htmlSnippet)) {
          return {
            name: provider.name,
            quality: provider.quality,
            url,
            type: 'embed',
            alive: false,
          };
        }
      }
    } catch {
      // If deep inspection fails, keep provider as tentatively alive based on HEAD.
    }

    return {
      name: provider.name,
      quality: provider.quality,
      url,
      type: 'embed',
      alive: true,
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

    // Sort: alive first, then dead as fallback. Within each group, prioritize iframe-friendly hosts.
    const preferredRank: Record<string, number> = {
      'VidSrc.to': 1,
      Vidnest: 2,
      Vidzee: 3,
      VidRock: 4,
      '2Embed': 5,
      RiveEmbed: 6,
      'Embed.su': 7,
      VidFast: 8,
      VidLink: 9,
    };

    const rank = (name: string) => preferredRank[name] ?? 100;
    const byPreferredRank = <T extends { name: string }>(a: T, b: T) => rank(a.name) - rank(b.name);

    const allSources = [
      ...alive.map(({ name, quality, url, type }) => ({ name, quality, url, type })).sort(byPreferredRank),
      ...dead.map(({ name, quality, url, type }) => ({ name, quality, url, type })).sort(byPreferredRank),
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
