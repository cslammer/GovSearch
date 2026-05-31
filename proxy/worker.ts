/**
 * Hemicycle data proxy — Cloudflare Worker (reference implementation).
 *
 * Why this exists:
 *   • Congress.gov needs an API key that should stay server-side (not shipped in
 *     the client bundle), and its CORS headers aren't guaranteed for browsers.
 *   • Senate.gov publishes roll-call XML but sits behind Akamai, which blocks
 *     non-browser User-Agents and cross-origin requests.
 *
 * This worker is a NARROW, allowlisted pass-through — only two upstreams, only
 * GET — never an open proxy. It:
 *   • /congress/*  → https://api.congress.gov/v3/*   (+ injects ?api_key=, format=json)
 *   • /senate/*    → https://www.senate.gov/*        (+ a browser-like User-Agent)
 *   • adds permissive CORS headers and lightly caches responses.
 *
 * Deploy: see proxy/README in the main README. Set the secret CONGRESS_API_KEY
 * with `wrangler secret put CONGRESS_API_KEY`. Optionally set ALLOW_ORIGIN to
 * lock CORS to your site's origin.
 */

export interface Env {
  CONGRESS_API_KEY: string;
  /** Optional: restrict CORS to a single origin (default "*"). */
  ALLOW_ORIGIN?: string;
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const CONGRESS_UPSTREAM = 'https://api.congress.gov/v3';
const SENATE_UPSTREAM = 'https://www.senate.gov';

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cors = corsHeaders(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: cors });
    }

    const url = new URL(request.url);
    let upstream: URL;
    let extraHeaders: Record<string, string> = {};

    if (url.pathname.startsWith('/congress/')) {
      const rest = url.pathname.slice('/congress'.length);
      upstream = new URL(CONGRESS_UPSTREAM + rest);
      // Carry through query params, then inject key + json.
      url.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));
      if (env.CONGRESS_API_KEY) upstream.searchParams.set('api_key', env.CONGRESS_API_KEY);
      if (!upstream.searchParams.has('format')) upstream.searchParams.set('format', 'json');
    } else if (url.pathname.startsWith('/senate/')) {
      const rest = url.pathname.slice('/senate'.length);
      upstream = new URL(SENATE_UPSTREAM + rest);
      url.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));
      extraHeaders = { 'User-Agent': BROWSER_UA, Accept: 'text/xml,application/xml;q=0.9,*/*;q=0.8' };
    } else {
      return new Response('Not Found', { status: 404, headers: cors });
    }

    // Edge cache: these endpoints are highly cacheable (vote history is immutable).
    const cacheKey = new Request(upstream.toString(), { method: 'GET' });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      const r = new Response(cached.body, cached);
      Object.entries(cors).forEach(([k, v]) => r.headers.set(k, v));
      return r;
    }

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(upstream.toString(), {
        headers: extraHeaders,
        cf: { cacheTtl: 1800, cacheEverything: true },
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Upstream fetch failed' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const res = new Response(upstreamRes.body, upstreamRes);
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    if (!res.headers.has('Cache-Control')) {
      res.headers.set('Cache-Control', 'public, max-age=1800');
    }
    if (upstreamRes.ok) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },
};
