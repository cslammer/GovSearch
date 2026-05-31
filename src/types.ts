// ─────────────────────────────────────────────────────────────────────────────
// Domain types for Hemicycle.
//
// There are two layers:
//   1. "Raw*" types mirror the upstream data sources verbatim (congress-legislators
//      roster JSON, Congress.gov API JSON). They are intentionally loose.
//   2. The normalized types (Member, MemberVote, …) are what the UI consumes.
// ─────────────────────────────────────────────────────────────────────────────

export type Chamber = 'house' | 'senate';

/** Actual party affiliation. Independents are 'I'. */
export type Party = 'D' | 'R' | 'I';

/** The party whose side of the aisle a member is seated on. Always D or R. */
export type Bloc = 'D' | 'R';

/** Normalized vote position. Congress.gov "Aye"/"No" are mapped to Yea/Nay. */
export type VoteCast = 'Yea' | 'Nay' | 'Present' | 'Not Voting';

// ── Raw congress-legislators roster ──────────────────────────────────────────

export interface RawTerm {
  type: 'rep' | 'sen';
  start: string;
  end: string;
  state: string;
  district?: number;
  party?: string;
  caucus?: string;
  class?: number;
  state_rank?: 'junior' | 'senior';
}

export interface RawLeadershipRole {
  title: string;
  chamber?: string;
  start?: string;
  end?: string;
  current?: boolean;
}

export interface RawLegislator {
  id: {
    bioguide: string;
    lis?: string;
    thomas?: string;
    govtrack?: number;
    wikipedia?: string;
  };
  name: {
    first: string;
    middle?: string;
    last: string;
    suffix?: string;
    nickname?: string;
    official_full?: string;
  };
  bio?: {
    birthday?: string;
    gender?: string;
  };
  terms: RawTerm[];
  leadership_roles?: RawLeadershipRole[];
}

// ── Normalized member ─────────────────────────────────────────────────────────

export interface MemberTerm {
  chamber: Chamber;
  start: string;
  end: string;
  state: string;
  district: number | null;
  party: Party;
}

export interface Member {
  bioguide: string;
  /** Senate LIS id — the join key for Senate.gov roll-call XML. */
  lisId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  chamber: Chamber;
  /** Actual party (I for independents). */
  party: Party;
  /** Side of the aisle: independents fold into the party they caucus with. */
  bloc: Bloc;
  isIndependent: boolean;
  /** Two-letter state code, e.g. "CA". */
  state: string;
  /** Full state name, e.g. "California". */
  stateName: string;
  /** House district number; 0 = at-large; null for senators. */
  district: number | null;
  senatorRank?: 'junior' | 'senior';
  birthday?: string;
  gender?: string;
  terms: MemberTerm[];
  /** ISO date of the member's earliest term start. */
  firstTermStart: string;
  /** Whole years from firstTermStart to today. */
  yearsInOffice: number;
  /** Current leadership title, if any (e.g. "Speaker of the House"). */
  leadershipTitle?: string;
  photoUrl: string;
  photoThumb: string;
  initials: string;
}

// ── Votes ─────────────────────────────────────────────────────────────────────

/** One member's position on a single roll-call vote. */
export interface MemberVote {
  rollId: string;
  chamber: Chamber;
  congress: number;
  session: number;
  rollNumber: number;
  voteCast: VoteCast;
  date: string;
  question: string;
  result: string;
  legislationType?: string;
  legislationNumber?: string;
  legislationUrl?: string;
  title?: string;
}

/** A full roll-call vote with every member's position (used to compute stats). */
export interface RollCall {
  rollId: string;
  chamber: Chamber;
  congress: number;
  session: number;
  rollNumber: number;
  date: string;
  question: string;
  result: string;
  legislationType?: string;
  legislationNumber?: string;
  title?: string;
  positions: VotePosition[];
}

export interface VotePosition {
  bioguide: string;
  voteCast: VoteCast;
  party: Party;
}

/** Shared index built once per chamber and read by every member panel. */
export interface VoteIndex {
  chamber: Chamber;
  congress: number;
  session: number;
  // A plain object (not a Map) so the index survives JSON serialization to
  // localStorage — a Map would stringify to {} and lose its methods on reload,
  // crashing any reader that calls .get().
  byBioguide: Record<string, MemberVote[]>;
  rollCalls: RollCall[];
  /** Roll calls successfully loaded. */
  loaded: number;
  /** Roll calls attempted (window size). */
  requested: number;
  /** Roll calls that failed to load. */
  failed: number;
  windowStart?: string;
  windowEnd?: string;
}

export interface MemberStats {
  /** cast / eligible, where cast = Yea+Nay+Present. null if no data. */
  participationPct: number | null;
  eligibleVotes: number;
  castVotes: number;
  missedVotes: number;
  /** % of party-split votes where the member voted with their bloc. null if n/a. */
  partyUnityPct: number | null;
  partyVotesConsidered: number;
  windowLabel: string;
}

/** A plain-language bill summary fetched from Congress.gov. */
export interface BillSummary {
  text: string;
  actionDate?: string;
  actionDesc?: string;
  url: string;
}
