import type { Bloc, Member, Party } from '../types';

// Deliberate, refined party colors — used as accents (seat rings, indicators),
// never as loud fills. Independents read neutral green-gray.
export const PARTY_COLOR: Record<Party, string> = {
  D: '#2f6feb', // refined blue
  R: '#d6453d', // refined red
  I: '#4f9d77', // neutral green
};

/** A softer tint of each party color, for fills/backgrounds. */
export const PARTY_TINT: Record<Party, string> = {
  D: '#eaf0fd',
  R: '#fdeceb',
  I: '#e9f5ef',
};

export const BLOC_COLOR: Record<Bloc, string> = {
  D: PARTY_COLOR.D,
  R: PARTY_COLOR.R,
};

/** Ring color for a member's seat: actual party (independents stay neutral). */
export function seatRingColor(member: Member): string {
  return PARTY_COLOR[member.party];
}
