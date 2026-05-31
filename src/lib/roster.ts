// ─────────────────────────────────────────────────────────────────────────────
// roster.ts — normalize the unitedstates/congress-legislators dataset into the
// Member shape the UI consumes. The roster is the ONLY data source needed to
// render the full seating chart (no API key required).
// ─────────────────────────────────────────────────────────────────────────────

import type { Bloc, Chamber, Member, MemberTerm, Party, RawLegislator, RawTerm } from '../types';
import { initialsFor, photoUrl } from './photos';
import { stateName } from './states';

function partyFromString(p?: string): Party {
  switch ((p ?? '').toLowerCase()) {
    case 'democrat':
    case 'democratic':
      return 'D';
    case 'republican':
      return 'R';
    // Anything else (Independent, Libertarian, blank, unknown) → Independent,
    // rather than throwing. Caucus then decides the seating bloc.
    default:
      return 'I';
  }
}

function chamberFromType(type: RawTerm['type']): Chamber {
  return type === 'sen' ? 'senate' : 'house';
}

/**
 * Pick the member's *current* term: the one whose [start, end] window contains
 * `today`. Falls back to the term with the latest start date (handles members
 * sworn in between data refreshes or with slightly stale end dates).
 */
export function currentTerm(terms: RawTerm[], today: Date): RawTerm | undefined {
  if (terms.length === 0) return undefined;
  const t = today.getTime();
  const containing = terms.filter((term) => {
    const start = Date.parse(term.start);
    const end = Date.parse(term.end);
    return !Number.isNaN(start) && !Number.isNaN(end) && start <= t && t <= end;
  });
  const pool = containing.length > 0 ? containing : terms;
  return pool.reduce((latest, term) =>
    Date.parse(term.start) >= Date.parse(latest.start) ? term : latest,
  );
}

function wholeYearsBetween(fromIso: string, today: Date): number {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return 0;
  let years = today.getFullYear() - from.getFullYear();
  const monthDelta = today.getMonth() - from.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < from.getDate())) years -= 1;
  return Math.max(0, years);
}

/** Current leadership title, if the member holds one now. */
function leadershipTitle(raw: RawLegislator, today: Date): string | undefined {
  const roles = raw.leadership_roles;
  if (!roles?.length) return undefined;
  const t = today.getTime();
  const active = roles.filter((r) => {
    if (r.current === true) return true;
    if (!r.end) return r.current !== false;
    const end = Date.parse(r.end);
    return Number.isNaN(end) ? false : end >= t;
  });
  const pick = active[active.length - 1] ?? roles[roles.length - 1];
  return pick?.title;
}

/** Normalize a single raw legislator. Returns null if it has no usable term. */
export function normalizeMember(raw: RawLegislator, today: Date = new Date()): Member | null {
  const term = currentTerm(raw.terms, today);
  if (!term) return null;

  const party = partyFromString(term.party);
  const caucusParty = term.caucus ? partyFromString(term.caucus) : undefined;

  // Bloc = which side of the aisle. Independents fold into the party they
  // caucus with; a caucus-less independent defaults to D (rare; documented).
  let bloc: Bloc;
  if (party === 'D' || party === 'R') {
    bloc = party;
  } else if (caucusParty === 'D' || caucusParty === 'R') {
    bloc = caucusParty;
  } else {
    bloc = 'D';
  }

  const chamber = chamberFromType(term.type);
  const firstName = raw.name.first;
  const lastName = raw.name.last;
  const fullName = raw.name.official_full ?? `${firstName} ${lastName}`.trim();

  const terms: MemberTerm[] = raw.terms.map((tm) => ({
    chamber: chamberFromType(tm.type),
    start: tm.start,
    end: tm.end,
    state: tm.state,
    district: tm.district ?? null,
    party: partyFromString(tm.party),
  }));
  const firstTermStart = raw.terms.reduce(
    (min, tm) => (tm.start < min ? tm.start : min),
    raw.terms[0].start,
  );

  return {
    bioguide: raw.id.bioguide,
    lisId: raw.id.lis,
    firstName,
    lastName,
    fullName,
    chamber,
    party,
    bloc,
    isIndependent: party === 'I',
    state: term.state,
    stateName: stateName(term.state),
    district: chamber === 'senate' ? null : (term.district ?? null),
    senatorRank: term.state_rank,
    birthday: raw.bio?.birthday,
    gender: raw.bio?.gender,
    terms,
    firstTermStart,
    yearsInOffice: wholeYearsBetween(firstTermStart, today),
    leadershipTitle: leadershipTitle(raw, today),
    photoUrl: photoUrl(raw.id.bioguide, '450x550'),
    photoThumb: photoUrl(raw.id.bioguide, '225x275'),
    initials: initialsFor(firstName, lastName),
  };
}

/** Normalize a full roster, dropping any entries without a usable term. */
export function normalizeRoster(raw: RawLegislator[], today: Date = new Date()): Member[] {
  const out: Member[] = [];
  for (const r of raw) {
    const m = normalizeMember(r, today);
    if (m) out.push(m);
  }
  return out;
}

export function membersByChamber(members: Member[], chamber: Chamber): Member[] {
  return members.filter((m) => m.chamber === chamber);
}
