// CORS Proxy for @movie-web/providers (makeSimpleProxyFetcher format)
// and for m3u8/ts segment proxying

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cookie, x-referer, x-origin, x-user-agent, x-x-real-ip, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-Final-Destination, X-Set-Cookie",
};

// Header mapping from proxy headers to real headers
const headerMap: Record<string, string> = {
  "x-cookie": "Cookie",
  "x-referer": "Referer",
  "x-origin": "Origin",
  "x-user-agent": "User-Agent",
  "x-x-real-ip": "X-Real-Ip",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Legacy m3u8 proxy: ?url=...
  const legacyUrl = url.searchParams.get("url");
  if (legacyUrl) {
    return handleLegacyProxy(req, url, legacyUrl);
  }

  // Simple proxy format: ?destination=...
  const destination = url.searchParams.get("destination");
  if (destination) {
    return handleSimpleProxy(req, destination);
  }

  return new Response(JSON.stringify({ error: "Missing destination or url parameter" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function handleSimpleProxy(req: Request, destination: string): Promise<Response> {
  try {
    // Map proxy headers to real headers
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };

    for (const [proxyHeader, realHeader] of Object.entries(headerMap)) {
      const value = req.headers.get(proxyHeader);
      if (value) headers[realHeader] = value;
    }

    // Forward any non-mapped headers from the request (except internal ones)
    const skipHeaders = new Set([
      "host", "connection", "content-length", "accept-encoding",
      ...Object.keys(headerMap),
      "authorization", "apikey", "x-client-info",
    ]);

    req.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (!skipHeaders.has(lk) && !lk.startsWith("x-supabase")) {
        headers[key] = value;
      }
    });

    const fetchOpts: RequestInit = {
      method: req.method === "POST" ? "POST" : "GET",
      headers,
      redirect: "follow",
    };

    // Forward body for POST requests
    if (req.method === "POST") {
      const body = await req.text();
      if (body) fetchOpts.body = body;
    }

    const res = await fetch(destination, fetchOpts);
    const responseBody = await res.arrayBuffer();

    // Build response headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
    };

    // Set content type
    const contentType = res.headers.get("content-type");
    if (contentType) responseHeaders["Content-Type"] = contentType;

    // Pass through set-cookie as X-Set-Cookie
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) responseHeaders["X-Set-Cookie"] = setCookie;

    // Set final destination for redirect tracking
    responseHeaders["X-Final-Destination"] = res.url;

    return new Response(responseBody, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (e) {
    console.error("Simple proxy error:", e);
    return new Response(JSON.stringify({ error: "Proxy fetch failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handleLegacyProxy(req: Request, url: URL, targetUrl: string): Promise<Response> {
  const referer = url.searchParams.get("referer") || "";
  const origin = url.searchParams.get("origin") || "";

  try {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };
    if (referer) headers["Referer"] = referer;
    if (origin) headers["Origin"] = origin;

    const res = await fetch(targetUrl, { headers });
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const body = await res.arrayBuffer();

    // Rewrite m3u8 playlist URLs
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
    console.error("Legacy proxy error:", e);
    return new Response(JSON.stringify({ error: "Proxy fetch failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
