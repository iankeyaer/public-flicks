const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, season, episode, tmdbId } = await req.json();

    if (!tmdbId) {
      return new Response(
        JSON.stringify({ success: false, error: 'tmdbId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const s = season || 1;
    const e = episode || 1;

    const rawExtractorUrl = Deno.env.get('VPS_EXTRACTOR_URL');
    const extractorKey = Deno.env.get('VPS_API_KEY');

    if (!rawExtractorUrl || !extractorKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'VPS extractor not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const normalizedExtractorUrl = /^https?:\/\//i.test(rawExtractorUrl)
      ? rawExtractorUrl
      : `https://${rawExtractorUrl}`;

    const body: Record<string, unknown> = { tmdbId, type: mediaType };
    if (mediaType === 'tv') {
      body.season = s;
      body.episode = e;
    }

    console.log(`Calling VPS extractor:`, body);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let extractRes: Response;
    try {
      extractRes = await fetch(
        `${normalizedExtractorUrl.replace(/\/$/, '')}/extract`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': extractorKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!extractRes.ok) {
      const text = await extractRes.text();
      console.error(`VPS extractor returned ${extractRes.status}: ${text}`);
      return new Response(
        JSON.stringify({ success: false, error: `Extractor error (${extractRes.status})` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const extractData = await extractRes.json();
    if (!extractData.success || !extractData.sources?.length) {
      return new Response(
        JSON.stringify({ success: false, error: extractData.error || 'No streams found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

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
