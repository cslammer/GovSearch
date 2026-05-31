// ─────────────────────────────────────────────────────────────────────────────
// Hard-coded Congress.gov API key.
//
// ▶ PASTE YOUR KEY BETWEEN THE QUOTES BELOW, then rebuild / redeploy.
//   Get a free key (instant, by email) at: https://api.data.gov/signup/
//
//   export const HARDCODED_CONGRESS_KEY = 'a1B2c3D4...your key...';
//
// This is the ONLY change needed to unlock House votes + bill summaries on a
// static host such as GitHub Pages — no proxy or env vars required.
//
// Heads-up (accepted tradeoff): this key is compiled into the public client
// bundle, so anyone can read it. That's fine for THIS key — the api.data.gov
// Congress.gov key is free, read-only, public-data, rate-limited (~5,000/hr),
// and re-issued in seconds. Don't reuse it for anything sensitive.
//
// Leaving it blank is also fine: the seating chart and bios work without it;
// only the votes section shows a "add a key" note.
// ─────────────────────────────────────────────────────────────────────────────
export const HARDCODED_CONGRESS_KEY = 'TdOt84jvIMDoRMqbV81a46fdWyZhahaininyYepZ';
