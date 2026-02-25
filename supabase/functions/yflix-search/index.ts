const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EmbedResult {
  name: string;
  quality: string;
  url: string;
  latencyMs: number;
}

const EMBED_HINTS = [
  'embed',
  'player',
  'vidsrc',
  'rabbitstream',
  'vidcloud',
  'streamwish',
  'mixdrop',
  'streamtape',
  'mp4upload',
  'm3u8',
  'playlist',
  '.m3u8',
  '/e/',
  '/v/',
  'megacloud',
  'upcloud',
];

const BLOCK_HINTS = [
  'doubleclick',
  'googletagmanager',
  'google-analytics',
  'facebook',
  'twitter',
  'ads',
  'analytics',
  'banner',
  'pixel',
  'youtube',
  'youtu.be',
  'vimeo',
  'trailer',
  'imdb',
  'themoviedb',
  'tmdb',
];

function normalizeCandidate(raw: string, baseUrl: string): string | null {
  try {
    if (!raw) return null;

    let value = raw
      .trim()
      .replace(/^['"`]|['"`]$/g, '')
      .replace(/\\\//g, '/')
      .replace(/&amp;/g, '&');

    if (!value) return null;
    if (value.startsWith('//')) value = `https:${value}`;

    const absolute = value.startsWith('http') ? value : new URL(value, baseUrl).toString();
    return absolute;
  } catch {
    return null;
  }
}

function scoreCandidate(url: string): number {
  const lower = url.toLowerCase();
  if (BLOCK_HINTS.some((hint) => lower.includes(hint))) return -100;

  let score = 0;
  if (EMBED_HINTS.some((hint) => lower.includes(hint))) score += 60;
  if (lower.includes('/embed/')) score += 30;
  if (lower.includes('/e/')) score += 20;
  if (lower.includes('.m3u8')) score += 35;

  // Heavily penalize watch/details pages
  if (lower.includes('/watch/') || lower.includes('/movie/') || lower.includes('/tv/')) score -= 45;

  return score;
}

function extractIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  const idRegexes = [
    /data-id=["']([^"']+)["']/gi,
    /data-linkid=["']([^"']+)["']/gi,
    /data-link-id=["']([^"']+)["']/gi,
    /data-episode-id=["']([^"']+)["']/gi,
    /"id"\s*:\s*"?(\d+)"?/gi,
  ];

  for (const regex of idRegexes) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const id = match[1]?.trim();
      if (id) ids.add(id);
    }
  }

  return Array.from(ids);
}

function extractLinkIdsFromEpisodesHtml(html: string): string[] {
  const ids = new Set<string>();
  const regexes = [
    /data-linkid=["']([^"']+)["']/gi,
    /data-link-id=["']([^"']+)["']/gi,
    /data-id=["']([^"']+)["']/gi,
  ];

  for (const regex of regexes) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const id = match[1]?.trim();
      if (id) ids.add(id);
    }
  }

  return Array.from(ids);
}

function extractSourceIdsFromRawHtml(raw: string): string[] {
  const ids = new Set<string>();

  const regexes = [
    /\/ajax\/sources\/([a-zA-Z0-9_-]+)/gi,
    /data-linkid=["']([^"']+)["']/gi,
    /data-link-id=["']([^"']+)["']/gi,
  ];

  for (const regex of regexes) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(raw)) !== null) {
      const id = match[1]?.trim();
      if (id) ids.add(id);
    }
  }

  return Array.from(ids);
}

async function resolveSourceIdToEmbed(origin: string, watchUrl: string, sourceId: string): Promise<string | null> {
  try {
    const endpoint = `${origin}/ajax/sources/${encodeURIComponent(sourceId)}`;
    const response = await fetch(endpoint, {
      headers: {
        'Referer': watchUrl,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return null;

    let rawCandidate = '';
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      rawCandidate = json?.link || json?.url || json?.src || '';
    } else {
      const text = await response.text();
      const jsonLinkMatch = text.match(/"(?:link|url|src)"\s*:\s*"([^"]+)"/i);
      rawCandidate = jsonLinkMatch?.[1] || text.trim();
    }

    const candidate = normalizeCandidate(rawCandidate, watchUrl);
    if (!candidate) return null;
    if (scoreCandidate(candidate) <= 0) return null;

    return candidate;
  } catch {
    return null;
  }
}

async function tryDirectAjaxEmbed(watchUrl: string, siteName: string): Promise<string | null> {
  try {
    const urlObj = new URL(watchUrl);
    const origin = `${urlObj.protocol}//${urlObj.host}`;

    const commonHeaders = {
      'Referer': watchUrl,
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    };

    const episodeIdCandidates = new Set<string>();

    const numericFromUrl = watchUrl.match(/-(\d+)(?:$|[?#])/);
    if (numericFromUrl?.[1]) episodeIdCandidates.add(numericFromUrl[1]);

    const watchSlug = watchUrl.match(/\/watch\/([^?#]+)/)?.[1];
    if (watchSlug) {
      episodeIdCandidates.add(watchSlug);
      const token = watchSlug.split('.').pop();
      if (token) episodeIdCandidates.add(token);
    }

    const pageRes = await fetch(watchUrl, { headers: commonHeaders });
    if (pageRes.ok) {
      const pageHtml = await pageRes.text();
      for (const id of extractIdsFromHtml(pageHtml)) episodeIdCandidates.add(id);
    }

    for (const episodeId of episodeIdCandidates) {
      const episodesEndpoint = `${origin}/ajax/movie/episodes/${encodeURIComponent(episodeId)}`;
      const episodesRes = await fetch(episodesEndpoint, {
        headers: {
          ...commonHeaders,
          'Accept': 'text/html, */*;q=0.1',
        },
      });

      if (!episodesRes.ok) continue;

      const episodesHtml = await episodesRes.text();
      const linkIds = extractLinkIdsFromEpisodesHtml(episodesHtml);

      for (const linkId of linkIds) {
        const embedUrl = await resolveSourceIdToEmbed(origin, watchUrl, linkId);
        if (embedUrl) {
          console.log(`${siteName} direct AJAX embed found:`, embedUrl);
          return embedUrl;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`${siteName} direct AJAX extraction failed:`, error);
    return null;
  }
}

async function extractEmbed(apiKey: string, watchUrl: string, siteName: string, type: 'movie' | 'tv'): Promise<string | null> {
  try {
    if (type === 'movie') {
      const directEmbed = await tryDirectAjaxEmbed(watchUrl, siteName);
      if (directEmbed) return directEmbed;
    }

    console.log(`Scraping ${siteName} watch page for embed:`, watchUrl);

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: watchUrl,
        formats: ['html', 'rawHtml', 'links'],
        waitFor: 15000,
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok) {
      console.error(`${siteName} scrape error:`, scrapeData);
      return null;
    }

    const html: string = scrapeData.data?.html || scrapeData.html || '';
    const rawHtml: string = scrapeData.data?.rawHtml || scrapeData.rawHtml || '';
    const links: string[] = scrapeData.data?.links || scrapeData.links || [];
    const combinedHtml = `${html}\n${rawHtml}`;

    const urlObj = new URL(watchUrl);
    const origin = `${urlObj.protocol}//${urlObj.host}`;

    // Try extracting source IDs from raw HTML and resolving via /ajax/sources/{id}
    const rawSourceIds = extractSourceIdsFromRawHtml(combinedHtml);
    for (const sourceId of rawSourceIds) {
      const embedUrl = await resolveSourceIdToEmbed(origin, watchUrl, sourceId);
      if (embedUrl) {
        console.log(`${siteName} raw-html AJAX embed found:`, embedUrl);
        return embedUrl;
      }
    }

    const candidates = new Set<string>();

    for (const link of links) {
      const normalized = normalizeCandidate(link, watchUrl);
      if (normalized) candidates.add(normalized);
    }

    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = iframeRegex.exec(combinedHtml)) !== null) {
      const normalized = normalizeCandidate(match[1], watchUrl);
      if (normalized) candidates.add(normalized);
    }

    const mediaRegex = /<(video|source)[^>]+src=["']([^"']+)["'][^>]*>/gi;
    while ((match = mediaRegex.exec(combinedHtml)) !== null) {
      const normalized = normalizeCandidate(match[2], watchUrl);
      if (normalized) candidates.add(normalized);
    }

    const rawHttpRegex = /https?:\/\/[^\s"'<>\\]+/gi;
    const escapedHttpRegex = /https?:\\\/\\\/[^\s"'<>]+/gi;
    const rawMatches = combinedHtml.match(rawHttpRegex) || [];
    const escapedMatches = combinedHtml.match(escapedHttpRegex) || [];

    for (const raw of [...rawMatches, ...escapedMatches]) {
      const normalized = normalizeCandidate(raw, watchUrl);
      if (normalized) candidates.add(normalized);
    }

    const ranked = Array.from(candidates)
      .map((url) => ({ url, score: scoreCandidate(url) }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (best && best.score > 0) {
      console.log(`${siteName} scraped embed found:`, best.url);
      return best.url;
    }

    console.log(`${siteName} no playable embed found`);
    return null;
  } catch (err) {
    console.error(`${siteName} embed extraction error:`, err);
    return null;
  }
}

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

    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: `https://${site}`, search: title, limit: 20 }),
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

async function buildSource(
  apiKey: string,
  siteName: string,
  watchUrl: string,
  type: 'movie' | 'tv',
): Promise<EmbedResult | null> {
  const startedAt = Date.now();
  const embedUrl = await extractEmbed(apiKey, watchUrl, siteName, type);
  if (!embedUrl) return null;

  return {
    name: siteName,
    quality: 'HD',
    url: embedUrl,
    latencyMs: Date.now() - startedAt,
  };
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

    const mediaType = type === 'tv' ? 'tv' : 'movie';

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const [yflixFound, sflixFound] = await Promise.all([
      searchSite(apiKey, 'yflix.to', 'YFlix', title, year),
      searchSite(apiKey, 'sflix.ps', 'SFlix', title, year),
    ]);

    const watchUrls: { siteName: string; url: string }[] = [];

    if (yflixFound) {
      let yUrl = yflixFound;
      if (mediaType === 'tv' && season && episode) {
        yUrl = `${yUrl}#ep=${season},${episode}`;
      }
      watchUrls.push({ siteName: 'YFlix', url: yUrl });
    }

    if (sflixFound) {
      let sUrl = sflixFound;
      if (mediaType === 'tv' && season && episode) {
        sUrl = sUrl.includes('?')
          ? `${sUrl}&season=${season}&episode=${episode}`
          : `${sUrl}?season=${season}&episode=${episode}`;
      }
      watchUrls.push({ siteName: 'SFlix', url: sUrl });
    }

    if (!watchUrls.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'No results found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const extracted = (await Promise.all(
      watchUrls.map((item) => buildSource(apiKey, item.siteName, item.url, mediaType)),
    )).filter(Boolean) as EmbedResult[];

    if (!extracted.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'No playable embedded streams found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    extracted.sort((a, b) => a.latencyMs - b.latencyMs);

    const sources = extracted.map((source, index) => ({
      name: `Server ${index + 1}`,
      quality: source.quality,
      url: source.url,
    }));

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
