const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Build embeddable player URLs from multiple aggregator services.
 * These services accept TMDB IDs and return an iframe-ready player.
 */
function buildEmbedSources(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number,
): { name: string; quality: string; url: string }[] {
  const sources: { name: string; quality: string; url: string }[] = [];

  // VidSrc.to - popular embed aggregator
  if (mediaType === 'movie') {
    sources.push({
      name: 'Server 1',
      quality: 'HD',
      url: `https://vidsrc.to/embed/movie/${tmdbId}`,
    });
  } else {
    sources.push({
      name: 'Server 1',
      quality: 'HD',
      url: `https://vidsrc.to/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
    });
  }

  // VidSrc.icu - alternative
  if (mediaType === 'movie') {
    sources.push({
      name: 'Server 2',
      quality: 'HD',
      url: `https://vidsrc.icu/embed/movie/${tmdbId}`,
    });
  } else {
    sources.push({
      name: 'Server 2',
      quality: 'HD',
      url: `https://vidsrc.icu/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
    });
  }

  // embed.su
  if (mediaType === 'movie') {
    sources.push({
      name: 'Server 3',
      quality: '1080p',
      url: `https://embed.su/embed/movie/${tmdbId}`,
    });
  } else {
    sources.push({
      name: 'Server 3',
      quality: '1080p',
      url: `https://embed.su/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
    });
  }

  // multiembed.mov
  if (mediaType === 'movie') {
    sources.push({
      name: 'Server 4',
      quality: 'HD',
      url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
    });
  } else {
    sources.push({
      name: 'Server 4',
      quality: 'HD',
      url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season || 1}&e=${episode || 1}`,
    });
  }

  return sources;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, type, year, season, episode, tmdbId } = await req.json();

    if (!title && !tmdbId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title or TMDB ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const mediaType = type === 'tv' ? 'tv' : 'movie';

    if (!tmdbId) {
      return new Response(
        JSON.stringify({ success: false, error: 'TMDB ID is required for streaming' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const sources = buildEmbedSources(
      tmdbId,
      mediaType as 'movie' | 'tv',
      season,
      episode,
    );

    console.log(`Returning ${sources.length} embed source(s) for ${mediaType} ${tmdbId}`);

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