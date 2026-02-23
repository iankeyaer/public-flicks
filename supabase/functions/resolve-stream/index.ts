const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface StreamResult {
  provider: string;
  quality: string;
  url: string;
  type: 'hls' | 'mp4';
  headers?: Record<string, string>;
}

interface ResolveRequest {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

// ─── Provider Resolvers ───

async function resolveVidsrcPro(tmdbId: number, mediaType: string, season?: number, episode?: number): Promise<StreamResult | null> {
  try {
    const path = mediaType === 'movie'
      ? `/embed/movie/${tmdbId}`
      : `/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
    
    const embedUrl = `https://vidsrc.pro${path}`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://vidsrc.pro/',
      },
    });
    
    if (!res.ok) return null;
    const html = await res.text();
    
    // Try to extract m3u8 URL from the page
    const m3u8Match = html.match(/(?:file|source|src)\s*[:=]\s*['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/i);
    if (m3u8Match) {
      return {
        provider: 'VidSrc Pro',
        quality: '1080p',
        url: m3u8Match[1],
        type: 'hls',
        headers: { 'Referer': 'https://vidsrc.pro/', 'Origin': 'https://vidsrc.pro' },
      };
    }

    // Try to find API endpoint or data source in the HTML
    const dataMatch = html.match(/data-?(?:src|url|source)\s*=\s*['"](https?:\/\/[^'"]+)['"]/i);
    if (dataMatch) {
      const dataUrl = dataMatch[1];
      if (dataUrl.includes('.m3u8')) {
        return {
          provider: 'VidSrc Pro',
          quality: '1080p',
          url: dataUrl,
          type: 'hls',
          headers: { 'Referer': 'https://vidsrc.pro/' },
        };
      }
    }

    return null;
  } catch (e) {
    console.error('VidSrc Pro resolver error:', e);
    return null;
  }
}

async function resolveEmbedSu(tmdbId: number, mediaType: string, season?: number, episode?: number): Promise<StreamResult | null> {
  try {
    const path = mediaType === 'movie'
      ? `/embed/movie/${tmdbId}`
      : `/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
    
    const embedUrl = `https://embed.su${path}`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://embed.su/',
      },
    });
    
    if (!res.ok) return null;
    const html = await res.text();
    
    // Look for encoded/obfuscated source data
    const m3u8Match = html.match(/(?:file|source|src|url)\s*[:=]\s*['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/i);
    if (m3u8Match) {
      return {
        provider: 'Embed SU',
        quality: 'HD',
        url: m3u8Match[1],
        type: 'hls',
        headers: { 'Referer': 'https://embed.su/', 'Origin': 'https://embed.su' },
      };
    }

    // Try to find base64 encoded data
    const b64Match = html.match(/atob\s*\(\s*['"]([A-Za-z0-9+/=]+)['"]\s*\)/);
    if (b64Match) {
      try {
        const decoded = atob(b64Match[1]);
        const urlInDecoded = decoded.match(/(https?:\/\/[^\s'"<>]+\.m3u8[^\s'"<>]*)/i);
        if (urlInDecoded) {
          return {
            provider: 'Embed SU',
            quality: 'HD',
            url: urlInDecoded[1],
            type: 'hls',
            headers: { 'Referer': 'https://embed.su/' },
          };
        }
      } catch { /* ignore decode errors */ }
    }

    return null;
  } catch (e) {
    console.error('Embed SU resolver error:', e);
    return null;
  }
}

async function resolveVidsrcCC(tmdbId: number, mediaType: string, season?: number, episode?: number): Promise<StreamResult | null> {
  try {
    const path = mediaType === 'movie'
      ? `/v2/embed/movie/${tmdbId}`
      : `/v2/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
    
    const embedUrl = `https://vidsrc.cc${path}`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://vidsrc.cc/',
      },
    });
    
    if (!res.ok) return null;
    const html = await res.text();
    
    const m3u8Match = html.match(/(?:file|source|src|url)\s*[:=]\s*['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/i);
    if (m3u8Match) {
      return {
        provider: 'VidSrc CC',
        quality: '1080p',
        url: m3u8Match[1],
        type: 'hls',
        headers: { 'Referer': 'https://vidsrc.cc/', 'Origin': 'https://vidsrc.cc' },
      };
    }

    // Check for mp4 direct links
    const mp4Match = html.match(/(?:file|source|src|url)\s*[:=]\s*['"](https?:\/\/[^'"]*\.mp4[^'"]*)['"]/i);
    if (mp4Match) {
      return {
        provider: 'VidSrc CC',
        quality: '1080p',
        url: mp4Match[1],
        type: 'mp4',
        headers: { 'Referer': 'https://vidsrc.cc/' },
      };
    }

    return null;
  } catch (e) {
    console.error('VidSrc CC resolver error:', e);
    return null;
  }
}

async function resolveAutoEmbed(tmdbId: number, mediaType: string, season?: number, episode?: number): Promise<StreamResult | null> {
  try {
    const path = mediaType === 'movie'
      ? `/embed/movie/${tmdbId}`
      : `/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
    
    const embedUrl = `https://player.autoembed.cc${path}`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://player.autoembed.cc/',
      },
    });
    
    if (!res.ok) return null;
    const html = await res.text();
    
    const m3u8Match = html.match(/(?:file|source|src|url)\s*[:=]\s*['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/i);
    if (m3u8Match) {
      return {
        provider: 'AutoEmbed',
        quality: '1080p',
        url: m3u8Match[1],
        type: 'hls',
        headers: { 'Referer': 'https://player.autoembed.cc/', 'Origin': 'https://player.autoembed.cc' },
      };
    }

    return null;
  } catch (e) {
    console.error('AutoEmbed resolver error:', e);
    return null;
  }
}

async function resolveVidBinge(tmdbId: number, mediaType: string, season?: number, episode?: number): Promise<StreamResult | null> {
  try {
    const path = mediaType === 'movie'
      ? `/embed/movie/${tmdbId}`
      : `/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
    
    const embedUrl = `https://vidbinge.dev${path}`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://vidbinge.dev/',
      },
    });
    
    if (!res.ok) return null;
    const html = await res.text();
    
    const m3u8Match = html.match(/(?:file|source|src|url)\s*[:=]\s*['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/i);
    if (m3u8Match) {
      return {
        provider: 'VidBinge',
        quality: 'HD',
        url: m3u8Match[1],
        type: 'hls',
        headers: { 'Referer': 'https://vidbinge.dev/', 'Origin': 'https://vidbinge.dev' },
      };
    }

    return null;
  } catch (e) {
    console.error('VidBinge resolver error:', e);
    return null;
  }
}

// ─── CORS Proxy for m3u8 segments ───

async function handleProxy(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  const referer = url.searchParams.get('referer') || '';
  const origin = url.searchParams.get('origin') || '';

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };
    if (referer) headers['Referer'] = referer;
    if (origin) headers['Origin'] = origin;

    const res = await fetch(targetUrl, { headers });
    
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const body = await res.arrayBuffer();

    return new Response(body, {
      status: res.status,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('Proxy error:', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── Main Handler ───

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // Handle proxy requests for CORS
  if (url.pathname.endsWith('/proxy') || url.searchParams.has('url')) {
    return handleProxy(req);
  }

  try {
    const { tmdbId, mediaType, season, episode }: ResolveRequest = await req.json();

    if (!tmdbId || !mediaType) {
      return new Response(
        JSON.stringify({ success: false, error: 'tmdbId and mediaType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resolving streams for ${mediaType} ${tmdbId}${mediaType === 'tv' ? ` S${season}E${episode}` : ''}`);

    // Try all providers in parallel
    const resolvers = [
      resolveVidsrcPro(tmdbId, mediaType, season, episode),
      resolveEmbedSu(tmdbId, mediaType, season, episode),
      resolveVidsrcCC(tmdbId, mediaType, season, episode),
      resolveAutoEmbed(tmdbId, mediaType, season, episode),
      resolveVidBinge(tmdbId, mediaType, season, episode),
    ];

    const results = await Promise.allSettled(resolvers);
    const streams: StreamResult[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        streams.push(result.value);
      }
    }

    console.log(`Resolved ${streams.length} direct stream(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        streams,
        // Fallback embed sources in case no direct URLs are resolved
        fallbackEmbeds: streams.length === 0 ? getFallbackEmbeds(tmdbId, mediaType, season, episode) : [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Resolve error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getFallbackEmbeds(tmdbId: number, mediaType: string, season?: number, episode?: number) {
  const s = season || 1;
  const e = episode || 1;
  
  return [
    {
      name: 'VidSrc Pro',
      quality: '1080p',
      url: mediaType === 'movie'
        ? `https://vidsrc.pro/embed/movie/${tmdbId}`
        : `https://vidsrc.pro/embed/tv/${tmdbId}/${s}/${e}`,
    },
    {
      name: 'Embed SU',
      quality: 'HD',
      url: mediaType === 'movie'
        ? `https://embed.su/embed/movie/${tmdbId}`
        : `https://embed.su/embed/tv/${tmdbId}/${s}/${e}`,
    },
    {
      name: 'VidSrc CC',
      quality: '1080p',
      url: mediaType === 'movie'
        ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
        : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${s}/${e}`,
    },
  ];
}
