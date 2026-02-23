import {
  makeProviders,
  makeStandardFetcher,
  targets,
} from "@movie-web/providers";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResolveRequest {
  tmdbId: string;
  mediaType: "movie" | "show";
  title: string;
  releaseYear: number;
  season?: number;
  episode?: number;
  episodeTitle?: string;
}

// ─── CORS Proxy for m3u8 segments ───
async function handleProxy(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");
  const referer = url.searchParams.get("referer") || "";
  const origin = url.searchParams.get("origin") || "";

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };
    if (referer) headers["Referer"] = referer;
    if (origin) headers["Origin"] = origin;

    const res = await fetch(targetUrl, { headers });
    const contentType =
      res.headers.get("content-type") || "application/octet-stream";
    const body = await res.arrayBuffer();

    // If it's an m3u8 playlist, rewrite segment URLs to go through the proxy
    if (
      contentType.includes("mpegurl") ||
      contentType.includes("m3u8") ||
      targetUrl.endsWith(".m3u8")
    ) {
      let text = new TextDecoder().decode(body);
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      const selfUrl = url.origin + url.pathname;

      // Rewrite relative URLs in the playlist to absolute proxied URLs
      text = text.replace(/^(?!#)(.*\.(?:m3u8|ts|m4s|mp4|key).*)$/gm, (line) => {
        const absoluteUrl = line.startsWith("http")
          ? line
          : baseUrl + line;
        return `${selfUrl}?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`;
      });

      return new Response(text, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return new Response(body, {
      status: res.status,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("Proxy error:", e);
    return new Response(JSON.stringify({ error: "Proxy fetch failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Handle proxy requests for CORS
  if (url.pathname.endsWith("/proxy") || url.searchParams.has("url")) {
    return handleProxy(req);
  }

  try {
    const body: ResolveRequest = await req.json();
    const { tmdbId, mediaType, title, releaseYear, season, episode, episodeTitle } = body;

    if (!tmdbId || !mediaType || !title) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "tmdbId, mediaType, and title are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `Resolving streams for ${mediaType} "${title}" (TMDB: ${tmdbId})${mediaType === "show" ? ` S${season}E${episode}` : ""}`
    );

    // Initialize providers (server-side / NATIVE target)
    const providers = makeProviders({
      fetcher: makeStandardFetcher(fetch),
      target: targets.NATIVE,
    });

    // Build the media object
    let media;
    if (mediaType === "show") {
      media = {
        type: "show" as const,
        tmdbId: String(tmdbId),
        title,
        releaseYear,
        season: {
          number: season || 1,
          tmdbId: String(tmdbId),
        },
        episode: {
          number: episode || 1,
          tmdbId: String(tmdbId),
          title: episodeTitle || `Episode ${episode || 1}`,
        },
      };
    } else {
      media = {
        type: "movie" as const,
        tmdbId: String(tmdbId),
        title,
        releaseYear,
      };
    }

    // Run the scraper
    const result = await providers.runAll({
      media,
      // Emit events for each source found
      events: {
        init(evt) {
          console.log(`Checking ${evt.sourceIds.length} sources...`);
        },
        start(id) {
          console.log(`  → Trying source: ${id}`);
        },
        update(evt) {
          console.log(`  → Update from ${evt.id}: ${evt.status}`);
        },
      },
    });

    if (!result) {
      console.log("No streams found from any provider");
      return new Response(
        JSON.stringify({
          success: true,
          streams: [],
          fallbackEmbeds: getFallbackEmbeds(
            tmdbId,
            mediaType === "show" ? "tv" : "movie",
            season,
            episode
          ),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process the result - extract stream URLs
    const streams = [];

    if (result.stream) {
      for (const quality of result.stream.qualities
        ? Object.entries(result.stream.qualities)
        : []) {
        const [qualityKey, qualityData] = quality;
        if (qualityData?.url) {
          streams.push({
            provider: result.sourceId || "unknown",
            quality: qualityKey,
            url: qualityData.url,
            type: qualityData.url.includes(".m3u8") ? "hls" : "mp4",
            headers: result.stream.headers || {},
          });
        }
      }

      // Also check for playlist (m3u8 master)
      if (result.stream.playlist) {
        streams.push({
          provider: result.sourceId || "unknown",
          quality: "auto",
          url: result.stream.playlist,
          type: "hls",
          headers: result.stream.headers || {},
        });
      }
    }

    // Handle embeds from the result
    if (result.embeds && Array.isArray(result.embeds)) {
      for (const embed of result.embeds) {
        if (embed.stream) {
          for (const [qKey, qData] of Object.entries(
            embed.stream.qualities || {}
          )) {
            if ((qData as any)?.url) {
              streams.push({
                provider: embed.embedId || "embed",
                quality: qKey,
                url: (qData as any).url,
                type: (qData as any).url.includes(".m3u8") ? "hls" : "mp4",
                headers: embed.stream.headers || {},
              });
            }
          }
          if (embed.stream.playlist) {
            streams.push({
              provider: embed.embedId || "embed",
              quality: "auto",
              url: embed.stream.playlist,
              type: "hls",
              headers: embed.stream.headers || {},
            });
          }
        }
      }
    }

    console.log(`Resolved ${streams.length} direct stream(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        streams,
        fallbackEmbeds:
          streams.length === 0
            ? getFallbackEmbeds(
                tmdbId,
                mediaType === "show" ? "tv" : "movie",
                season,
                episode
              )
            : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Resolve error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getFallbackEmbeds(
  tmdbId: string,
  mediaType: string,
  season?: number,
  episode?: number
) {
  const s = season || 1;
  const e = episode || 1;

  return [
    {
      name: "VidSrc Pro",
      quality: "1080p",
      url:
        mediaType === "movie"
          ? `https://vidsrc.pro/embed/movie/${tmdbId}`
          : `https://vidsrc.pro/embed/tv/${tmdbId}/${s}/${e}`,
    },
    {
      name: "Embed SU",
      quality: "HD",
      url:
        mediaType === "movie"
          ? `https://embed.su/embed/movie/${tmdbId}`
          : `https://embed.su/embed/tv/${tmdbId}/${s}/${e}`,
    },
    {
      name: "VidSrc CC",
      quality: "1080p",
      url:
        mediaType === "movie"
          ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
          : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${s}/${e}`,
    },
  ];
}
