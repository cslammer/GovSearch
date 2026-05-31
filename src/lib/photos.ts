// Member photos come from the unitedstates/images repo, addressable by Bioguide
// ID. If an image 404s, the UI falls back to a generated initials avatar.

const BASE = 'https://unitedstates.github.io/images/congress';

export function photoUrl(bioguide: string, size: '450x550' | '225x275' = '450x550'): string {
  return `${BASE}/${size}/${bioguide}.jpg`;
}

/** Up to two initials from a member's name, e.g. "Nancy Pelosi" → "NP". */
export function initialsFor(first: string, last: string): string {
  const a = first.trim()[0] ?? '';
  const b = last.trim()[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

// A small, calm palette for initials avatars, tinted by party. Chosen to read
// as "no photo yet" rather than competing with the party rings.
const AVATAR_BG: Record<string, string> = {
  D: '#e8edf7',
  R: '#f7e9e9',
  I: '#eaf0ec',
};
const AVATAR_FG: Record<string, string> = {
  D: '#41577e',
  R: '#7e4848',
  I: '#4c6657',
};

export function avatarColors(party: string): { bg: string; fg: string } {
  return {
    bg: AVATAR_BG[party] ?? AVATAR_BG.I,
    fg: AVATAR_FG[party] ?? AVATAR_FG.I,
  };
}
