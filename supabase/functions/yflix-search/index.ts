const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Build embeddable player URLs from multiple aggregator services.
 * All accept TMDB IDs and return iframe-ready players.
 */
function buildEmbedSources(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number,
): { name: string; quality: string; url: string }[] {
  const s = season || 1;
  const e = episode || 1;
  const sources: { name: string; quality: string; url: string }[] = [];

  const add = (name: string, quality: string, movieUrl: string, tvUrl: string) => {
    sources.push({
      name,
      quality,
      url: mediaType === 'movie' ? movieUrl : tvUrl,
    });
  };

  // 1. VidSrc.to
  add('VidSrc.to', 'HD',
    `https://vidsrc.to/embed/movie/${tmdbId}`,
    `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`);

  // 2. Vidnest (vidsrc.cc)
  add('Vidnest', 'HD',
    `https://vidsrc.cc/v2/embed/movie/${tmdbId}`,
    `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${s}/${e}`);

  // 3. Vidzee (vidsrc.store / vsembed.ru)
  add('Vidzee', '1080p',
    `https://vidsrc.xyz/embed/movie/${tmdbId}`,
    `https://vidsrc.xyz/embed/tv/${tmdbId}/${s}/${e}`);

  // 4. VidRock (vidsrc.icu)
  add('VidRock', 'HD',
    `https://vidsrc.icu/embed/movie/${tmdbId}`,
    `https://vidsrc.icu/embed/tv/${tmdbId}/${s}/${e}`);

  // 5. VidSrc.wtf (API 1)
  add('VidSrc.wtf', 'HD',
    `https://vidsrc.wtf/api/1/movie/?id=${tmdbId}`,
    `https://vidsrc.wtf/api/1/tv/?id=${tmdbId}&s=${s}&e=${e}`);

  // 6. RiveEmbed
  add('RiveEmbed', '1080p',
    `https://rivestream.org/embed?type=movie&id=${tmdbId}`,
    `https://rivestream.org/embed?type=tv&id=${tmdbId}&s=${s}&e=${e}`);

  // 7. SmashyStream
  add('SmashyStream', 'HD',
    `https://player.smashy.stream/${tmdbId}`,
    `https://player.smashy.stream/${tmdbId}?s=${s}&e=${e}`);

  // 8. 111Movies
  add('111Movies', 'HD',
    `https://111movies.com/movie/${tmdbId}`,
    `https://111movies.com/tv/${tmdbId}/${s}/${e}`);

  // 9. Videasy
  add('Videasy', '1080p',
    `https://player.videasy.net/movie/${tmdbId}`,
    `https://player.videasy.net/tv/${tmdbId}/${s}/${e}`);

  // 10. VidLink
  add('VidLink', 'HD',
    `https://vidlink.pro/movie/${tmdbId}`,
    `https://vidlink.pro/tv/${tmdbId}/${s}/${e}`);

  // 11. VidFast
  add('VidFast', 'HD',
    `https://vidfast.pro/movie/${tmdbId}`,
    `https://vidfast.pro/tv/${tmdbId}/${s}/${e}`);

  // 12. Embed.su
  add('Embed.su', '1080p',
    `https://embed.su/embed/movie/${tmdbId}`,
    `https://embed.su/embed/tv/${tmdbId}/${s}/${e}`);

  // 13. 2Embed
  add('2Embed', 'HD',
    `https://www.2embed.cc/embed/movie?tmdb=${tmdbId}`,
    `https://www.2embed.cc/embed/tv?tmdb=${tmdbId}&s=${s}&e=${e}`);

  // 14. MoviesAPI
  add('MoviesAPI', 'HD',
    `https://moviesapi.club/movie/${tmdbId}`,
    `https://moviesapi.club/tv/${tmdbId}/${s}/${e}`);

  // 15. AutoEmbed
  add('AutoEmbed', 'HD',
    `https://autoembed.co/movie/tmdb/${tmdbId}`,
    `https://autoembed.co/tv/tmdb/${tmdbId}/${s}/${e}`);

  // 16. MultiEmbed
  add('MultiEmbed', 'HD',
    `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
    `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`);

  // 17. VidSrc.xyz
  add('VidSrc.xyz', 'HD',
    `https://vidsrc.xyz/embed/movie/${tmdbId}`,
    `https://vidsrc.xyz/embed/tv/${tmdbId}/${s}/${e}`);

  // 18. PrimeWire
  add('PrimeWire', 'HD',
    `https://www.primewire.tf/embed/movie?tmdb=${tmdbId}`,
    `https://www.primewire.tf/embed/tv?tmdb=${tmdbId}&s=${s}&e=${e}`);

  // 19. WarezCDN
  add('WarezCDN', 'HD',
    `https://embed.warezcdn.com/filme/${tmdbId}`,
    `https://embed.warezcdn.com/serie/${tmdbId}/${s}/${e}`);

  // 20. SuperFlix
  add('SuperFlix', 'HD',
    `https://superflix.stream/movie/${tmdbId}`,
    `https://superflix.stream/tv/${tmdbId}/${s}/${e}`);

  // 21. VidUp
  add('VidUp', 'HD',
    `https://vidup.io/embed/movie/${tmdbId}`,
    `https://vidup.io/embed/tv/${tmdbId}/${s}/${e}`);

  // 22. VidSrc.wtf (API 2)
  add('VidSrc.wtf #2', 'HD',
    `https://vidsrc.wtf/api/2/movie/?id=${tmdbId}`,
    `https://vidsrc.wtf/api/2/tv/?id=${tmdbId}&s=${s}&e=${e}`);

  // 23. VidSrc.wtf (API 3)
  add('VidSrc.wtf #3', 'HD',
    `https://vidsrc.wtf/api/3/movie/?id=${tmdbId}`,
    `https://vidsrc.wtf/api/3/tv/?id=${tmdbId}&s=${s}&e=${e}`);

  return sources;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, type, season, episode, tmdbId } = await req.json();

    if (!tmdbId) {
      return new Response(
        JSON.stringify({ success: false, error: 'TMDB ID is required for streaming' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const sources = buildEmbedSources(tmdbId, mediaType, season, episode);

    console.log(`Returning ${sources.length} embed sources for ${mediaType} ${tmdbId}`);

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
