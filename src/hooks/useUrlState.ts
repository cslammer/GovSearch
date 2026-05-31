import { useEffect } from 'react';
import type { Chamber } from '../types';

export interface UrlState {
  chamber: Chamber;
  member?: string;
}

export function readUrlState(): UrlState {
  if (typeof window === 'undefined') return { chamber: 'house' };
  const p = new URLSearchParams(window.location.search);
  const chamber = p.get('chamber') === 'senate' ? 'senate' : 'house';
  const member = p.get('member') ?? undefined;
  return { chamber, member };
}

/** Reflect chamber + selected member into the URL (shareable, back-button). */
export function useSyncUrl(state: UrlState) {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    p.set('chamber', state.chamber);
    if (state.member) p.set('member', state.member);
    else p.delete('member');
    const next = `${window.location.pathname}?${p.toString()}`;
    window.history.replaceState(null, '', next);
  }, [state.chamber, state.member]);
}
