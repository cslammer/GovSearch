import type { Member, Party, VoteCast } from '../types';
import { ordinal } from './ordinal';

export const PARTY_LABEL: Record<Party, string> = {
  D: 'Democrat',
  R: 'Republican',
  I: 'Independent',
};

export const PARTY_LETTER: Record<Party, string> = { D: 'D', R: 'R', I: 'I' };

/** "Rep." for House, "Sen." for Senate. */
export function memberPrefix(member: Member): string {
  return member.chamber === 'senate' ? 'Sen.' : 'Rep.';
}

/** Short role line, e.g. "Senior Senator from Vermont" or "Representative, CA-12". */
export function roleLine(member: Member): string {
  if (member.chamber === 'senate') {
    const rank = member.senatorRank ? `${cap(member.senatorRank)} ` : '';
    return `${rank}Senator from ${member.stateName}`;
  }
  if (member.district === 0 || member.district == null) {
    return `Representative for ${member.stateName} (At-Large)`;
  }
  return `Representative for ${member.stateName}'s ${ordinal(member.district)} District`;
}

/** District descriptor for tooltips: "12th District" or "At-Large". */
export function districtLabel(member: Member): string | null {
  if (member.chamber === 'senate') return null;
  if (member.district === 0 || member.district == null) return 'At-Large';
  return `${ordinal(member.district)} District`;
}

/**
 * One-line tooltip summary.
 *   House:  "Rep. Jane Doe (D) — California, 12th District"
 *   Senate: "Sen. John Roe (R) — Texas"
 */
export function tooltipLine(member: Member): string {
  const base = `${memberPrefix(member)} ${member.fullName} (${PARTY_LETTER[member.party]}) — ${member.stateName}`;
  const dist = districtLabel(member);
  return dist ? `${base}, ${dist}` : base;
}

export function yearsInOfficeLabel(years: number): string {
  if (years <= 0) return 'First year in office';
  return `${years} year${years === 1 ? '' : 's'} in office`;
}

export function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const VOTE_TONE: Record<VoteCast, string> = {
  Yea: 'yea',
  Nay: 'nay',
  Present: 'present',
  'Not Voting': 'absent',
};
export function voteTone(v: VoteCast): string {
  return VOTE_TONE[v];
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
