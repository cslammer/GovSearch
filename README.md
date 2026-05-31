# Hemicycle

An interactive explorer for the U.S. Congress. Every member is rendered as a seat in their
chamber — Democrats and Republicans on opposite sides of the aisle, each state's delegation
clustered together. Click a seat to open a detail panel with the member's bio, voting
participation, and a scrollable record of recent roll-call votes, each with a plain-language
summary of the bill.

The seating chart works with **zero configuration**. Voting records light up once you add a
free Congress.gov API key (House) and, for the Senate, deploy the included proxy.

- **Visual target:** Stripe.com — clean, generous whitespace, refined typography, subtle depth.
- **Stack:** React + TypeScript + Vite · Tailwind CSS v4 · Framer Motion · TanStack Query · SVG
  (with d3 helpers) for the hemicycle geometry. Builds to a deployable static site.

---

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173). The seating chart loads immediately from
public data — no key required.

To unlock voting records in development, add a key (see below) to `.env.local`. The Vite dev
server proxies API calls and injects the key, so House **and** Senate votes work in `npm run dev`.

```bash
cp .env.example .env.local
# edit .env.local and set CONGRESS_API_KEY=...
npm run dev
```

### Scripts

| Script              | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Vite dev server (with the Congress/Senate proxy)      |
| `npm run build`     | Typecheck (`tsc -b`) + production build to `dist/`     |
| `npm run preview`   | Serve the built `dist/` locally                       |
| `npm run typecheck` | Type-check only                                       |
| `npm run test`      | Run the unit/component test suite (Vitest, offline)   |
| `npm run lint`      | ESLint                                                 |
| `npm run format`    | Prettier                                              |

---

## Getting and setting the Congress.gov API key

1. Request a free key at **https://api.data.gov/signup/** (instant, no cost).
2. Set it depending on how you run the app:

   - **Development:** put it in `.env.local` as `CONGRESS_API_KEY=...`. The Vite dev proxy reads
     it server-side; it is **not** exposed to the browser.
   - **Production (recommended):** set it as a secret on the proxy (see
     [Production & the proxy](#production--the-proxy)). The key stays server-side.
   - **Production without a backend (fallback):** set `VITE_CONGRESS_API_KEY=...` at build time.
     ⚠️ **Any `VITE_`-prefixed variable is embedded in the public client bundle** — the key will be
     visible to anyone. Only use this for throwaway demos, and never reuse that key elsewhere. This
     mode also can't reach the Senate, and may hit CORS limits depending on the API's headers.

If no key is configured at all, the chart and bios still work fully; the vote section of the
detail panel shows a friendly note explaining how to add one.

### Environment variables

All are optional. See [`.env.example`](./.env.example).

| Variable               | Used by         | Purpose                                                          |
| ---------------------- | --------------- | --------------------------------------------------------------- |
| `CONGRESS_API_KEY`     | dev proxy, worker | Server-side Congress.gov key (kept out of the bundle)         |
| `VITE_CONGRESS_API_KEY`| client (fallback) | Embeds the key in the bundle — demos only (see warning above) |
| `VITE_API_BASE`        | client          | Absolute URL of a deployed proxy, e.g. `https://…workers.dev`    |
| `VITE_USE_FIXTURES`    | client          | `1` → render the chart from bundled sample data (offline)       |
| `VITE_BASE_PATH`       | build           | Base path for sub-directory hosting (e.g. `/hemicycle/`)         |

---

## Data sources

Hemicycle uses only public, official-or-open data. It never fabricates votes or summaries — if
data is unavailable, it degrades gracefully and says so.

1. **Member roster** (no key) — the open
   [`unitedstates/congress-legislators`](https://github.com/unitedstates/congress-legislators)
   dataset: `legislators-current.json` (with a raw.githubusercontent.com fallback). Provides each
   member's name, party, state, district, chamber, `bioguide` ID, and term history. We pick the
   term whose date range contains today to determine current chamber/party/state/district, and
   fold independents into the party they caucus with (while keeping their `Independent` label).

2. **Member photos** (no key) — the
   [`unitedstates/images`](https://github.com/unitedstates/images) repo, by Bioguide ID
   (`…/225x275/{bioguide}.jpg` for the chart, `450x550` for the panel). The chart renders
   instantly as colored rings and fades photos in afterward; a 404 falls back to a clean,
   party-tinted initials avatar.

3. **Votes + bill summaries** — the official
   [Congress.gov API v3](https://api.congress.gov/) (`https://api.congress.gov/v3/`):
   - **Member**, **bill**, and **bill `…/summaries`** endpoints for bios and plain-language
     summaries.
   - **House roll-call votes** via `/house-vote/{congress}/{session}` and
     `/{rollCallNumber}/members`, which return each member's position keyed by `bioguideId`.
   - **Senate roll-call votes:** the Congress.gov API does **not** expose Senate votes, so
     Hemicycle reads the Senate's own published roll-call XML from
     [Senate.gov](https://www.senate.gov/legislative/votes.htm) and joins positions back to
     members via their LIS id. Senate.gov is behind Akamai and **cannot be called directly from a
     browser**, so Senate votes require the proxy.

   Per-member history is computed by fetching the most recent roll calls for the current (119th)
   Congress once, indexing every member's position, and computing stats from that shared index.
   Results are cached aggressively (immutable history) and persisted to `localStorage`.

### How the stats are computed (and what they mean)

Stats are an **honest sample of a recent window of roll-call votes — not a lifetime record**, and
the UI labels them as such with the date range and the exact denominator.

- **Participation** = votes cast ÷ votes eligible, where "cast" includes Yea / Nay / **Present**,
  and "Not Voting" counts as missed.
- **Party unity** = of the *party-split* votes (a majority of Democrats opposed a majority of
  Republicans) the member cast, the share where they voted with their own bloc. Independents are
  measured against the party they caucus with.

---

## Production & the proxy

A static build (`dist/`) can be hosted anywhere (Netlify, Vercel, GitHub Pages, S3, …). For
voting data in production you have two options:

### Option A — Deploy the proxy (recommended)

The included [`proxy/`](./proxy) is a small **Cloudflare Worker** that:

- forwards `/congress/*` → `api.congress.gov` (injecting the key **server-side**),
- forwards `/senate/*` → `www.senate.gov` (with a browser User-Agent, past Akamai),
- adds CORS headers and caches responses.

It's a narrow, allowlisted pass-through (two upstreams, GET only) — not an open proxy.

```bash
cd proxy
npm install
npx wrangler secret put CONGRESS_API_KEY   # paste your api.data.gov key
npx wrangler deploy
```

Then build the site pointing at it:

```bash
VITE_API_BASE=https://hemicycle-proxy.<your-subdomain>.workers.dev npm run build
```

This keeps the key out of the bundle, fixes any Congress.gov CORS issues, and enables Senate
votes. The same `/api/congress` and `/api/senate` paths are used in dev (Vite proxy) and prod
(worker), so the client code is identical in both.

> **Vercel / Netlify:** the same logic ports directly to an Edge/serverless function that rewrites
> `/api/congress/*` and `/api/senate/*`. Set `CONGRESS_API_KEY` as an environment secret and a
> rewrite/route to the function; `worker.ts` is small enough to adapt in a few lines.

### Option B — No backend (demo only)

Build with `VITE_CONGRESS_API_KEY` to call Congress.gov directly. House votes and bill summaries
work if the API returns permissive CORS for your origin (verify in your browser's devtools first).
The key is **public** in this mode and the Senate is unavailable. See the key warning above.

---

## Accessibility & responsiveness

- The seating chart is a keyboard-navigable composite widget (roving tabindex): arrow keys move
  between seats, Enter/Space opens a member, and every seat has a descriptive ARIA label.
- Party is encoded by color **and** letter, not color alone. Visible focus rings throughout.
- `prefers-reduced-motion` is respected.
- The hemicycle pans and zooms (wheel/pinch + drag). On small screens the app defaults to a
  compact, state-grouped **grid**, and a toggle switches between chart and grid on any screen.

---

## Project structure

```
src/
  lib/         Pure, unit-tested core:
               hemicycle (seat geometry) · seating (party split + state clustering) ·
               roster (normalization) · stats · voteIndex · summarize · congressApi · senateApi
  hooks/       TanStack Query data hooks + pan/zoom + photo loader + URL state
  components/  Header · ChamberToggle · LayoutToggle · Legend · MemberSearch ·
               chart/ (Hemicycle, Seat, SeatTooltip, ZoomControls) · GroupedGrid ·
               panel/ (DetailPanel, MemberBio, VoteStats, VoteList, VoteRow, VoteFilter) ·
               skeletons/ · states/
  __fixtures__/  Sample data for tests and the offline demo flag
proxy/         Cloudflare Worker reference proxy (Congress.gov + Senate.gov)
```

The geometry and seating algorithms are documented inline. The seat layout uses a
parliamentarch-style annulus; state delegations are kept as clean radial wedges by applying the
same angular cut points across every row.

---

## Testing

```bash
npm run test
```

The suite is fully offline (no network), covering the geometry (seat counts, no overlaps),
seating (party separation, contiguous state wedges, independents, mega-delegations), roster
normalization, the stats math (including Present / Not-Voting edge cases), bill-summary
truncation, vote indexing, and key component behaviors (chart rendering, grid grouping, vote
filtering, and the graceful no-key/Senate notices).

---

## Notes & limitations

- Vote coverage via the Congress.gov API begins with the 118th Congress (2023). The window is the
  most recent ~60 roll calls of the current Congress.
- This is an independent project built on open data; it is **not** affiliated with or endorsed by
  the U.S. government. Member photos are public domain via the unitedstates project.
