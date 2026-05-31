// ─────────────────────────────────────────────────────────────────────────────
// congressApi.ts — thin client for the data sources.
//   • Roster:         unitedstates.github.io (no key; permissive CORS)
//   • Member bio:     Congress.gov /member/{bioguide}
//   • Bill summaries: Congress.gov /bill/{congress}/{type}/{number}/summaries
//   • House votes:    Congress.gov /house-vote/{congress}/{session}[/{roll}/members]
// Network-touching functions are intentionally simple; the parsers below are
// pure and unit-tested.
// ─────────────────────────────────────────────────────────────────────────────

import type { BillSummary, RawLegislator, RollCall, VoteCast, VotePosition } from '../types';
import { config, withCongressParams } from './config';
import { runWithConcurrency } from './concurrency';

const ROSTER_PRIMARY = 'https://unitedstates.github.io/congress-legislators/legislators-current.json';
const ROSTER_FALLBACK =
  'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.json';

export async function fetchRoster(signal?: AbortSignal): Promise<RawLegislator[]> {
  for (const url of [ROSTER_PRIMARY, ROSTER_FALLBACK]) {
    try {
      const res = await fetch(url, { signal });
      if (res.ok) return (await res.json()) as RawLegislator[];
    } catch {
      // try the next source
    }
  }
  throw new Error('Unable to load the Congress roster from either source.');
}

function congressUrl(path: string, params?: Record<string, string | number>): string {
  const url = new URL(`${config.congressBase}${path}`, window.location.origin);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  return withCongressParams(url).toString();
}

async function congressJson<T>(path: string, params?: Record<string, string | number>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(congressUrl(path, params), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Congress.gov request failed (${res.status})`);
  return (await res.json()) as T;
}

// ── Member detail ─────────────────────────────────────────────────────────────

export interface CongressMemberDetail {
  bioguideId: string;
  directOrderName?: string;
  officialUrl?: string;
  birthYear?: string | number;
  sponsoredLegislation?: { count?: number };
  cosponsoredLegislation?: { count?: number };
  terms?: { item?: { chamber?: string; startYear?: number; endYear?: number }[] };
}

export async function fetchMemberDetail(bioguide: string, signal?: AbortSignal): Promise<CongressMemberDetail> {
  const data = await congressJson<{ member: CongressMemberDetail }>(`/member/${bioguide}`, undefined, signal);
  return data.member;
}

// ── Bill summaries ────────────────────────────────────────────────────────────

interface RawSummary {
  text?: string;
  actionDate?: string;
  actionDesc?: string;
  updateDate?: string;
}

/** Pick the most recent, richest summary from the list. */
export function pickSummary(summaries: RawSummary[], billUrl: string): BillSummary | null {
  if (!summaries.length) return null;
  const sorted = [...summaries].sort((a, b) =>
    (b.actionDate ?? b.updateDate ?? '').localeCompare(a.actionDate ?? a.updateDate ?? ''),
  );
  const best = sorted.find((s) => s.text) ?? sorted[0];
  if (!best.text) return null;
  return { text: best.text, actionDate: best.actionDate, actionDesc: best.actionDesc, url: billUrl };
}

/** Public congress.gov web URL for a bill (for link-outs). */
export function billWebUrl(congress: number, type: string, number: string): string {
  const slug: Record<string, string> = {
    hr: 'house-bill',
    s: 'senate-bill',
    hjres: 'house-joint-resolution',
    sjres: 'senate-joint-resolution',
    hconres: 'house-concurrent-resolution',
    sconres: 'senate-concurrent-resolution',
    hres: 'house-resolution',
    sres: 'senate-resolution',
  };
  const t = slug[type.toLowerCase()] ?? 'house-bill';
  return `https://www.congress.gov/bill/${congress}th-congress/${t}/${number}`;
}

export async function fetchBillSummary(
  congress: number,
  type: string,
  number: string,
  signal?: AbortSignal,
): Promise<BillSummary | null> {
  const data = await congressJson<{ summaries?: RawSummary[] }>(
    `/bill/${congress}/${type.toLowerCase()}/${number}/summaries`,
    undefined,
    signal,
  );
  return pickSummary(data.summaries ?? [], billWebUrl(congress, type, number));
}

// ── House roll-call votes ─────────────────────────────────────────────────────

/** Normalize Congress.gov vote strings ("Aye"/"No"/…) to our VoteCast. */
export function normalizeVoteCast(raw: string | undefined): VoteCast {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'yea':
    case 'aye':
    case 'yes':
      return 'Yea';
    case 'nay':
    case 'no':
      return 'Nay';
    case 'present':
      return 'Present';
    default:
      return 'Not Voting';
  }
}

function normalizeParty(raw: string | undefined): VotePosition['party'] {
  const p = (raw ?? '').trim().toUpperCase();
  if (p.startsWith('D')) return 'D';
  if (p.startsWith('R')) return 'R';
  return 'I';
}

interface RawHouseVoteListItem {
  congress: number;
  sessionNumber?: number;
  session?: number;
  rollCallNumber?: number;
  rollNumber?: number;
  startDate?: string;
  updateDate?: string;
  legislationType?: string;
  legislationNumber?: string;
  voteQuestion?: string;
  result?: string;
}

interface RawHouseVoteListResponse {
  houseRollCallVotes?: RawHouseVoteListItem[];
  houseRollCallVote?: RawHouseVoteListItem[];
}

interface RawHouseMemberVote {
  bioguideID?: string;
  bioguideId?: string;
  voteCast?: string;
  voteState?: string;
  voteParty?: string;
}

interface RawHouseVoteMembersResponse {
  houseRollCallVoteMemberVotes?: {
    results?: { item?: RawHouseMemberVote[] } | RawHouseMemberVote[];
    legislationType?: string;
    legislationNumber?: string;
    voteQuestion?: string;
    result?: string;
    startDate?: string;
    rollCallNumber?: number;
    sessionNumber?: number;
    congress?: number;
  };
}

function asArray<T>(v: T[] | { item?: T[] } | undefined): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.item ?? [];
}

export interface HouseVoteRef {
  congress: number;
  session: number;
  rollNumber: number;
  date: string;
  question: string;
  result: string;
  legislationType?: string;
  legislationNumber?: string;
}

/** Fetch the most recent `limit` House roll-call refs for a congress/session. */
export async function fetchHouseVoteList(
  congress: number,
  session: number,
  limit: number,
  signal?: AbortSignal,
): Promise<HouseVoteRef[]> {
  const data = await congressJson<RawHouseVoteListResponse>(
    `/house-vote/${congress}/${session}`,
    { limit, sort: 'updateDate+desc' },
    signal,
  );
  const items = data.houseRollCallVotes ?? data.houseRollCallVote ?? [];
  return items.map((it) => ({
    congress: it.congress ?? congress,
    session: it.sessionNumber ?? it.session ?? session,
    rollNumber: it.rollCallNumber ?? it.rollNumber ?? 0,
    date: it.startDate ?? it.updateDate ?? '',
    question: it.voteQuestion ?? '',
    result: it.result ?? '',
    legislationType: it.legislationType,
    legislationNumber: it.legislationNumber,
  }));
}

/** Fetch one House roll call with every member's position. */
export async function fetchHouseVoteMembers(ref: HouseVoteRef, signal?: AbortSignal): Promise<RollCall> {
  const data = await congressJson<RawHouseVoteMembersResponse>(
    `/house-vote/${ref.congress}/${ref.session}/${ref.rollNumber}/members`,
    undefined,
    signal,
  );
  const body = data.houseRollCallVoteMemberVotes;
  const items = asArray(body?.results);
  const positions: VotePosition[] = items.map((m) => ({
    bioguide: m.bioguideId ?? m.bioguideID ?? '',
    voteCast: normalizeVoteCast(m.voteCast),
    party: normalizeParty(m.voteParty),
  }));
  return {
    rollId: `H-${ref.congress}-${ref.session}-${ref.rollNumber}`,
    chamber: 'house',
    congress: ref.congress,
    session: ref.session,
    rollNumber: ref.rollNumber,
    date: body?.startDate ?? ref.date,
    question: body?.voteQuestion ?? ref.question,
    result: body?.result ?? ref.result,
    legislationType: body?.legislationType ?? ref.legislationType,
    legislationNumber: body?.legislationNumber ?? ref.legislationNumber,
    positions: positions.filter((p) => p.bioguide),
  };
}

export interface FetchRollCallsResult {
  rollCalls: RollCall[];
  requested: number;
  failed: number;
}

/**
 * Fetch the recent House roll calls and their member positions, with a
 * concurrency cap and partial-failure tolerance.
 */
export async function fetchHouseRollCalls(
  congress: number,
  session: number,
  windowSize: number,
  signal?: AbortSignal,
): Promise<FetchRollCallsResult> {
  const refs = await fetchHouseVoteList(congress, session, windowSize, signal);
  let failed = 0;
  const rollCalls = await runWithConcurrency(refs, 5, async (ref) => {
    try {
      return await fetchHouseVoteMembers(ref, signal);
    } catch {
      failed += 1;
      return null;
    }
  });
  return {
    rollCalls: rollCalls.filter((rc): rc is RollCall => rc !== null && rc.positions.length > 0),
    requested: refs.length,
    failed,
  };
}
