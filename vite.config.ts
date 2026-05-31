import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// A browser-like User-Agent so Senate.gov's Akamai WAF serves the roll-call XML.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// App config (dev server + production build). Test config lives in
// vitest.config.ts to keep vite's and vitest's types cleanly separated.
export default defineConfig(({ mode }) => {
  // Load all env vars (not only VITE_-prefixed) so the dev proxy can read the
  // server-side CONGRESS_API_KEY and keep it out of the client bundle.
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.CONGRESS_API_KEY || env.VITE_CONGRESS_API_KEY || '';

  // Base path for the built site. GitHub Pages project sites live under
  // /<repo>/ (supplied by the deploy workflow as VITE_BASE_PATH). Normalize to a
  // leading + trailing slash, which Vite requires.
  let base = process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || '/';
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;

  return {
    base,
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Congress.gov v3 — inject the API key server-side + request JSON.
        '/api/congress': {
          target: 'https://api.congress.gov/v3',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/congress/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              try {
                const u = new URL(proxyReq.path, 'https://api.congress.gov');
                if (apiKey && !u.searchParams.has('api_key')) {
                  u.searchParams.set('api_key', apiKey);
                }
                if (!u.searchParams.has('format')) u.searchParams.set('format', 'json');
                proxyReq.path = u.pathname + u.search;
              } catch {
                /* leave path untouched on parse failure */
              }
            });
          },
        },
        // Senate.gov roll-call XML — spoof a browser UA past Akamai.
        '/api/senate': {
          target: 'https://www.senate.gov',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/senate/, ''),
          headers: {
            'User-Agent': BROWSER_UA,
            Accept: 'text/xml,application/xml;q=0.9,*/*;q=0.8',
          },
        },
      },
    },
  };
});
