// ─────────────────────────────────────────────────────────────────────────────
// config.ts — resolves how the app reaches vote data, and the current Congress.
//
// The seating chart needs NONE of this (it reads the public roster directly).
// Vote data has three reachability modes, in priority order:
//   1. Absolute proxy   — VITE_API_BASE points at a deployed serverless proxy.
//   2. Dev proxy        — `npm run dev`; Vite's server.proxy injects the key.
//   3. Direct fallback  — VITE_CONGRESS_API_KEY set; call api.congress.gov with
//                         ?api_key= (House only; key is embedded in the bundle).
// With none of these in production, votes are "unconfigured" → the panel shows
// friendly setup guidance instead of erroring.
// ─────────────────────────────────────────────────────────────────────────────

const env = import.meta.env;
const apiBase = (env.VITE_API_BASE ?? '').replace(/\/$/, '');
const directKey = env.VITE_CONGRESS_API_KEY ?? '';
const isDev = !!env.DEV;

export type VoteMode = 'proxy-absolute' | 'proxy-relative' | 'direct' | 'unconfigured';

function resolveCongressBase(): { base: string; mode: VoteMode } {
  if (apiBase) return { base: `${apiBase}/congress`, mode: 'proxy-absolute' };
  if (isDev) return { base: '/api/congress', mode: 'proxy-relative' };
  if (directKey) return { base: 'https://api.congress.gov/v3', mode: 'direct' };
  return { base: '/api/congress', mode: 'unconfigured' };
}

const congress = resolveCongressBase();

export const config = {
  /** "1" → render from bundled fixtures instead of the network. */
  useFixtures: env.VITE_USE_FIXTURES === '1',

  congressBase: congress.base,
  voteMode: congress.mode,
  directKey,

  /** Senate roll-call XML ALWAYS needs the proxy (Akamai blocks browsers). */
  senateBase: apiBase ? `${apiBase}/senate` : '/api/senate',

  /** True if we have any path to Congress.gov House votes. */
  votesConfigured: congress.mode !== 'unconfigured',
  /** Senate works only via a proxy (absolute or dev), never in direct mode. */
  senateConfigured: !!apiBase || isDev,
} as const;

/** Append api_key only in direct mode; always request JSON. */
export function withCongressParams(url: URL): URL {
  if (!url.searchParams.has('format')) url.searchParams.set('format', 'json');
  if (config.voteMode === 'direct' && config.directKey && !url.searchParams.has('api_key')) {
    url.searchParams.set('api_key', config.directKey);
  }
  return url;
}

// ── Current Congress / session, derived from the date ────────────────────────

/** The Congress number for a given year (119th covers 2025–2026). */
export function congressForDate(date = new Date()): number {
  return Math.floor((date.getFullYear() - 1789) / 2) + 1;
}

/** Session 1 in the odd (first) year, session 2 in the even (second) year. */
export function sessionForDate(date = new Date()): number {
  const year = date.getFullYear();
  const congressNum = congressForDate(date);
  const firstYear = 1789 + (congressNum - 1) * 2;
  return year - firstYear + 1;
}

export const CURRENT_CONGRESS = congressForDate();
export const CURRENT_SESSION = sessionForDate();
