const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1';

/* ───────── Types ───────── */
interface StreamResult {
  name: string;
  quality: string;
  url: string;
  type: 'direct' | 'embed'; // direct = m3u8/mp4, embed = iframe
}

/* ───────── Firecrawl helper ───────── */
async function firecrawlScrape(
  apiKey: string,
  url: string,
  waitFor = 6000,
): Promise<{ html: string | null; rawHtml: string | null }> {
  try {
    const res = await fetch(`${FIRECRAWL_URL}/scrape`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        formats: ['html', 'rawHtml'],
        waitFor,
        onlyMainContent: false,
      }),
    });
    if (!res.ok) {
      console.error('Firecrawl scrape error:', res.status);
      return { html: null, rawHtml: null };
    }
    const json = await res.json();
    return {
      html: json?.data?.html || json?.html || null,
      rawHtml: json?.data?.rawHtml || json?.rawHtml || null,
    };
  } catch (err) {
    console.error('Firecrawl exception:', err);
    return { html: null, rawHtml: null };
  }
}

/* ───────── Extract m3u8/mp4 URLs from HTML/JS content ───────── */
function extractStreamUrls(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // Match m3u8 URLs
  const m3u8Regex = /(?:https?:)?\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi;
  let match;
  while ((match = m3u8Regex.exec(html)) !== null) {
    let url = match[0].replace(/["'\\;,\)}\]]+$/, '');
    if (!url.startsWith('http')) url = 'https:' + url;
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  // Match mp4 URLs
  const mp4Regex = /(?:https?:)?\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi;
  while ((match = mp4Regex.exec(html)) !== null) {
    let url = match[0].replace(/["'\\;,\)}\]]+$/, '');
    if (!url.startsWith('http')) url = 'https:' + url;
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  // Match file/source patterns in JS: file:"url", source:"url", src:"url"
  const jsPatterns = /(?:file|source|src|video_url|stream_url|playback_url)\s*[:=]\s*["']([^"']+(?:\.m3u8|\.mp4)[^"']*)/gi;
  while ((match = jsPatterns.exec(html)) !== null) {
    let url = match[1];
    if (!url.startsWith('http')) url = 'https:' + url;
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  // Filter out ad/tracking URLs
  return urls.filter(u =>
    !u.includes('google') &&
    !u.includes('facebook') &&
    !u.includes('analytics') &&
    !u.includes('tracker') &&
    !u.includes('advertisement') &&
    u.length > 20
  );
}

/* ───────── Build embed source URLs (TMDB-based) ───────── */
interface EmbedProvider {
  name: string;
  quality: string;
  movieUrl: (id: number) => string;
  tvUrl: (id: number, s: number, e: number) => string;
  scrapable: boolean; // whether we should attempt m3u8 extraction
}

const PROVIDERS: EmbedProvider[] = [
  {
    name: 'VidSrc.to',
    quality: 'HD',
    movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    scrapable: true,
  },
  {
    name: 'Vidnest',
    quality: 'HD',
    movieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
    scrapable: true,
  },
  {
    name: 'Vidzee',
    quality: '1080p',
    movieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`,
    scrapable: true,
  },
  {
    name: 'VidRock',
    quality: 'HD',
    movieUrl: (id) => `https://vidsrc.icu/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`,
    scrapable: true,
  },
  {
    name: 'RiveEmbed',
    quality: '1080p',
    movieUrl: (id) => `https://rivestream.org/embed?type=movie&id=${id}`,
    tvUrl: (id, s, e) => `https://rivestream.org/embed?type=tv&id=${id}&s=${s}&e=${e}`,
    scrapable: true,
  },
  {
    name: 'Embed.su',
    quality: '1080p',
    movieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
    scrapable: true,
  },
  {
    name: 'Videasy',
    quality: '1080p',
    movieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    tvUrl: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
    scrapable: true,
  },
  {
    name: 'VidLink',
    quality: 'HD',
    movieUrl: (id) => `https://vidlink.pro/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
    scrapable: true,
  },
  {
    name: 'VidFast',
    quality: 'HD',
    movieUrl: (id) => `https://vidfast.pro/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}`,
    scrapable: true,
  },
  {
    name: 'SmashyStream',
    quality: 'HD',
    movieUrl: (id) => `https://player.smashy.stream/${id}`,
    tvUrl: (id, s, e) => `https://player.smashy.stream/${id}?s=${s}&e=${e}`,
    scrapable: true,
  },
  // Non-scrapable (iframe-only fallbacks)
  {
    name: 'VidSrc.wtf',
    quality: 'HD',
    movieUrl: (id) => `https://vidsrc.wtf/api/1/movie/?id=${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.wtf/api/1/tv/?id=${id}&s=${s}&e=${e}`,
    scrapable: false,
  },
  {
    name: '2Embed',
    quality: 'HD',
    movieUrl: (id) => `https://www.2embed.cc/embed/movie?tmdb=${id}`,
    tvUrl: (id, s, e) => `https://www.2embed.cc/embed/tv?tmdb=${id}&s=${s}&e=${e}`,
    scrapable: false,
  },
  {
    name: 'MoviesAPI',
    quality: 'HD',
    movieUrl: (id) => `https://moviesapi.club/movie/${id}`,
    tvUrl: (id, s, e) => `https://moviesapi.club/tv/${id}/${s}/${e}`,
    scrapable: false,
  },
  {
    name: 'AutoEmbed',
    quality: 'HD',
    movieUrl: (id) => `https://autoembed.co/movie/tmdb/${id}`,
    tvUrl: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}/${s}/${e}`,
    scrapable: false,
  },
  {
    name: 'MultiEmbed',
    quality: 'HD',
    movieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    tvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    scrapable: false,
  },
  {
    name: '111Movies',
    quality: 'HD',
    movieUrl: (id) => `https://111movies.com/movie/${id}`,
    tvUrl: (id, s, e) => `https://111movies.com/tv/${id}/${s}/${e}`,
    scrapable: false,
  },
  {
    name: 'PrimeWire',
    quality: 'HD',
    movieUrl: (id) => `https://www.primewire.tf/embed/movie?tmdb=${id}`,
    tvUrl: (id, s, e) => `https://www.primewire.tf/embed/tv?tmdb=${id}&s=${s}&e=${e}`,
    scrapable: false,
  },
  {
    name: 'WarezCDN',
    quality: 'HD',
    movieUrl: (id) => `https://embed.warezcdn.com/filme/${id}`,
    tvUrl: (id, s, e) => `https://embed.warezcdn.com/serie/${id}/${s}/${e}`,
    scrapable: false,
  },
  {
    name: 'SuperFlix',
    quality: 'HD',
    movieUrl: (id) => `https://superflix.stream/movie/${id}`,
    tvUrl: (id, s, e) => `https://superflix.stream/tv/${id}/${s}/${e}`,
    scrapable: false,
  },
];

/* ───────── Attempt to extract direct stream from a single provider ───────── */
async function extractFromProvider(
  apiKey: string,
  provider: EmbedProvider,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season: number,
  episode: number,
): Promise<StreamResult | null> {
  const embedUrl = mediaType === 'movie'
    ? provider.movieUrl(tmdbId)
    : provider.tvUrl(tmdbId, season, episode);

  try {
    const { html, rawHtml } = await firecrawlScrape(apiKey, embedUrl, 8000);
    const content = (rawHtml || '') + (html || '');

    if (!content) {
      console.log(`${provider.name}: no content returned`);
      return null;
    }

    const streamUrls = extractStreamUrls(content);
    if (streamUrls.length > 0) {
      // Prefer m3u8 over mp4
      const m3u8 = streamUrls.find(u => u.includes('.m3u8'));
      const best = m3u8 || streamUrls[0];
      console.log(`✓ ${provider.name}: extracted direct URL`);
      return {
        name: provider.name,
        quality: provider.quality,
        url: best,
        type: 'direct',
      };
    }

    console.log(`${provider.name}: no stream URLs found in scraped content`);
    return null;
  } catch (err) {
    console.error(`${provider.name} extraction error:`, err);
    return null;
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
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

    const directSources: StreamResult[] = [];
    const embedSources: StreamResult[] = [];

    if (tmdbId && firecrawlKey) {
      // Scrape the top scrapable providers in parallel (batch of 5 at a time to avoid rate limits)
      const scrapableProviders = PROVIDERS.filter(p => p.scrapable);
      console.log(`Attempting extraction from ${scrapableProviders.length} providers for ${mediaType} ${tmdbId}`);

      const BATCH_SIZE = 5;
      for (let i = 0; i < scrapableProviders.length; i += BATCH_SIZE) {
        const batch = scrapableProviders.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(provider =>
            extractFromProvider(firecrawlKey, provider, tmdbId, mediaType, s, e)
          ),
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            directSources.push(result.value);
          }
        }

        // If we found at least 2 direct sources, stop early (save Firecrawl credits)
        if (directSources.length >= 2) {
          console.log(`Found ${directSources.length} direct sources, stopping early`);
          break;
        }
      }
    }

    // Build embed fallbacks for all providers
    if (tmdbId) {
      for (const provider of PROVIDERS) {
        // Skip if we already have a direct source from this provider
        if (directSources.some(ds => ds.name === provider.name)) continue;

        const url = mediaType === 'movie'
          ? provider.movieUrl(tmdbId)
          : provider.tvUrl(tmdbId, s, e);

        embedSources.push({
          name: provider.name,
          quality: provider.quality,
          url,
          type: 'embed',
        });
      }
    }

    // Direct sources first (auto-play best), then embeds as fallback
    const allSources = [...directSources, ...embedSources];

    console.log(
      `Returning ${directSources.length} direct + ${embedSources.length} embed = ${allSources.length} total for ${mediaType} "${title || tmdbId}"`,
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
