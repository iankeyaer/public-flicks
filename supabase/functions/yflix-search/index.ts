const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ───────── embed aggregator fallbacks (TMDB-based) ───────── */
function buildEmbedSources(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number,
): { name: string; quality: string; url: string }[] {
  const s = season || 1;
  const e = episode || 1;
  const out: { name: string; quality: string; url: string }[] = [];
  const add = (n: string, q: string, m: string, t: string) =>
    out.push({ name: n, quality: q, url: mediaType === 'movie' ? m : t });

  add('VidSrc.to', 'HD', `https://vidsrc.to/embed/movie/${tmdbId}`, `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`);
  add('Vidnest', 'HD', `https://vidsrc.cc/v2/embed/movie/${tmdbId}`, `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${s}/${e}`);
  add('Vidzee', '1080p', `https://vidsrc.xyz/embed/movie/${tmdbId}`, `https://vidsrc.xyz/embed/tv/${tmdbId}/${s}/${e}`);
  add('VidRock', 'HD', `https://vidsrc.icu/embed/movie/${tmdbId}`, `https://vidsrc.icu/embed/tv/${tmdbId}/${s}/${e}`);
  add('VidSrc.wtf', 'HD', `https://vidsrc.wtf/api/1/movie/?id=${tmdbId}`, `https://vidsrc.wtf/api/1/tv/?id=${tmdbId}&s=${s}&e=${e}`);
  add('RiveEmbed', '1080p', `https://rivestream.org/embed?type=movie&id=${tmdbId}`, `https://rivestream.org/embed?type=tv&id=${tmdbId}&s=${s}&e=${e}`);
  add('SmashyStream', 'HD', `https://player.smashy.stream/${tmdbId}`, `https://player.smashy.stream/${tmdbId}?s=${s}&e=${e}`);
  add('111Movies', 'HD', `https://111movies.com/movie/${tmdbId}`, `https://111movies.com/tv/${tmdbId}/${s}/${e}`);
  add('Videasy', '1080p', `https://player.videasy.net/movie/${tmdbId}`, `https://player.videasy.net/tv/${tmdbId}/${s}/${e}`);
  add('VidLink', 'HD', `https://vidlink.pro/movie/${tmdbId}`, `https://vidlink.pro/tv/${tmdbId}/${s}/${e}`);
  add('VidFast', 'HD', `https://vidfast.pro/movie/${tmdbId}`, `https://vidfast.pro/tv/${tmdbId}/${s}/${e}`);
  add('Embed.su', '1080p', `https://embed.su/embed/movie/${tmdbId}`, `https://embed.su/embed/tv/${tmdbId}/${s}/${e}`);
  add('2Embed', 'HD', `https://www.2embed.cc/embed/movie?tmdb=${tmdbId}`, `https://www.2embed.cc/embed/tv?tmdb=${tmdbId}&s=${s}&e=${e}`);
  add('MoviesAPI', 'HD', `https://moviesapi.club/movie/${tmdbId}`, `https://moviesapi.club/tv/${tmdbId}/${s}/${e}`);
  add('AutoEmbed', 'HD', `https://autoembed.co/movie/tmdb/${tmdbId}`, `https://autoembed.co/tv/tmdb/${tmdbId}/${s}/${e}`);
  add('MultiEmbed', 'HD', `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`, `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`);
  add('VidSrc.xyz', 'HD', `https://vidsrc.xyz/embed/movie/${tmdbId}`, `https://vidsrc.xyz/embed/tv/${tmdbId}/${s}/${e}`);
  add('PrimeWire', 'HD', `https://www.primewire.tf/embed/movie?tmdb=${tmdbId}`, `https://www.primewire.tf/embed/tv?tmdb=${tmdbId}&s=${s}&e=${e}`);
  add('WarezCDN', 'HD', `https://embed.warezcdn.com/filme/${tmdbId}`, `https://embed.warezcdn.com/serie/${tmdbId}/${s}/${e}`);
  add('SuperFlix', 'HD', `https://superflix.stream/movie/${tmdbId}`, `https://superflix.stream/tv/${tmdbId}/${s}/${e}`);
  add('VidUp', 'HD', `https://vidup.io/embed/movie/${tmdbId}`, `https://vidup.io/embed/tv/${tmdbId}/${s}/${e}`);
  add('VidSrc.wtf #2', 'HD', `https://vidsrc.wtf/api/2/movie/?id=${tmdbId}`, `https://vidsrc.wtf/api/2/tv/?id=${tmdbId}&s=${s}&e=${e}`);
  add('VidSrc.wtf #3', 'HD', `https://vidsrc.wtf/api/3/movie/?id=${tmdbId}`, `https://vidsrc.wtf/api/3/tv/?id=${tmdbId}&s=${s}&e=${e}`);

  return out;
}

/* ───────── yflix.to scraping via Firecrawl ───────── */

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1';

async function firecrawlScrape(
  apiKey: string,
  url: string,
  waitFor = 5000,
): Promise<string | null> {
  try {
    const res = await fetch(`${FIRECRAWL_URL}/scrape`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['html'], waitFor, onlyMainContent: false }),
    });
    if (!res.ok) {
      console.error('Firecrawl scrape error:', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    return json?.data?.html || json?.html || null;
  } catch (err) {
    console.error('Firecrawl scrape exception:', err);
    return null;
  }
}

/** Search yflix.to for a title, return the watch-page slug */
async function findYflixSlug(
  apiKey: string,
  title: string,
  type: 'movie' | 'tv',
): Promise<string | null> {
  try {
    // Use Firecrawl search to find the yflix.to page
    const res = await fetch(`${FIRECRAWL_URL}/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `site:yflix.to ${title} ${type === 'tv' ? 'TV' : 'movie'}`,
        limit: 5,
      }),
    });
    if (!res.ok) {
      console.error('Firecrawl search error:', res.status);
      return null;
    }
    const json = await res.json();
    const results = json?.data || json?.results || [];

    for (const r of results) {
      const url: string = r.url || '';
      // yflix.to watch pages: /watch/title-slug.xxxxx
      const match = url.match(/yflix\.to\/watch\/([^?#]+)/);
      if (match) {
        console.log('Found yflix slug:', match[1], 'from', url);
        return match[1];
      }
    }
    return null;
  } catch (err) {
    console.error('findYflixSlug error:', err);
    return null;
  }
}

/** Extract iframe embed src from rendered yflix.to HTML */
function extractIframeSrc(html: string): string[] {
  const srcs: string[] = [];
  // Match iframe src attributes
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = iframeRegex.exec(html)) !== null) {
    const src = m[1];
    // Skip tracking pixels, ads, same-site iframes
    if (
      src.includes('yflix.to') ||
      src.includes('google') ||
      src.includes('facebook') ||
      src.includes('doubleclick') ||
      src.length < 10 ||
      src.startsWith('about:') ||
      src === '#'
    ) continue;
    srcs.push(src);
  }
  return srcs;
}

/** Extract episode eid from yflix watch page HTML */
function findEpisodeEid(
  html: string,
  season: number,
  episode: number,
): string | null {
  // Look for: data-season="X" ... eid="XXXXX" num="Y"
  // Episodes are in <ul data-season="X"><li><a eid="..." num="Y">
  const seasonRegex = new RegExp(
    `data-season=["']${season}["'][^]*?</ul>`,
    'i',
  );
  const seasonMatch = html.match(seasonRegex);
  if (!seasonMatch) return null;

  const seasonHtml = seasonMatch[0];
  const epRegex = new RegExp(
    `eid=["']([^"']+)["'][^>]*num=["']${episode}["']`,
    'i',
  );
  const epMatch = seasonHtml.match(epRegex);
  return epMatch ? epMatch[1] : null;
}

async function scrapeYflixSources(
  apiKey: string,
  title: string,
  type: 'movie' | 'tv',
  season: number,
  episode: number,
): Promise<{ name: string; quality: string; url: string }[]> {
  const sources: { name: string; quality: string; url: string }[] = [];

  // Step 1: Find the yflix.to slug
  const slug = await findYflixSlug(apiKey, title, type);
  if (!slug) {
    console.log('No yflix slug found for:', title);
    return sources;
  }

  // Step 2: Build the watch URL with episode hash
  let watchUrl = `https://yflix.to/watch/${slug}`;
  if (type === 'tv') {
    watchUrl += `#ep=${season},${episode}`;
  }
  console.log('Scraping yflix watch page:', watchUrl);

  // Step 3: Scrape with Firecrawl (wait for JS to render player)
  const html = await firecrawlScrape(apiKey, watchUrl, 8000);
  if (!html) {
    console.log('Failed to scrape yflix page');
    return sources;
  }

  // Step 4: Extract iframe embed sources from rendered HTML
  const iframeSrcs = extractIframeSrc(html);
  console.log('Found iframe sources:', iframeSrcs.length, iframeSrcs);

  for (let i = 0; i < iframeSrcs.length; i++) {
    sources.push({
      name: `YFlix Server ${i + 1}`,
      quality: 'HD',
      url: iframeSrcs[i],
    });
  }

  // If no iframe found, try the watch page URL directly as a fallback
  if (sources.length === 0) {
    // Also check for data-src or other dynamic attributes
    const dataSrcRegex = /data-src=["']([^"']+)["']/gi;
    let dm;
    while ((dm = dataSrcRegex.exec(html)) !== null) {
      const src = dm[1];
      if (
        src.includes('embed') ||
        src.includes('player') ||
        src.includes('stream')
      ) {
        sources.push({
          name: `YFlix Stream ${sources.length + 1}`,
          quality: 'HD',
          url: src,
        });
      }
    }
  }

  return sources;
}

/* ───────── main handler ───────── */

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
    const allSources: { name: string; quality: string; url: string }[] = [];

    // Try yflix.to scraping first (if Firecrawl key available)
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (firecrawlKey && title) {
      console.log(`Attempting yflix.to scrape for: ${title}`);
      try {
        const yflixSources = await scrapeYflixSources(
          firecrawlKey,
          title,
          mediaType,
          season || 1,
          episode || 1,
        );
        allSources.push(...yflixSources);
        console.log(`YFlix returned ${yflixSources.length} source(s)`);
      } catch (err) {
        console.error('YFlix scraping failed:', err);
      }
    }

    // Add embed aggregator fallbacks
    if (tmdbId) {
      const embedSources = buildEmbedSources(tmdbId, mediaType, season, episode);
      allSources.push(...embedSources);
    }

    console.log(`Returning ${allSources.length} total sources for ${mediaType} "${title || tmdbId}"`);

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
