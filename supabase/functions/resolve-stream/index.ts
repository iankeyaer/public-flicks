// CORS Proxy for m3u8/ts segments — the scraping now runs client-side

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

      text = text.replace(
        /^(?!#)(.*\.(?:m3u8|ts|m4s|mp4|key).*)$/gm,
        (line) => {
          const absoluteUrl = line.startsWith("http") ? line : baseUrl + line;
          return `${selfUrl}?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`;
        }
      );

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
});
