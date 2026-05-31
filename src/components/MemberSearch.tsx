import { useEffect, useMemo, useRef, useState } from 'react';
import type { Member } from '../types';
import { PARTY_COLOR } from '../lib/party';
import { memberPrefix, PARTY_LETTER } from '../lib/format';

interface MemberSearchProps {
  members: Member[];
  onSelect: (member: Member) => void;
}

function rank(member: Member, q: string): number {
  const name = member.fullName.toLowerCase();
  const last = member.lastName.toLowerCase();
  if (last.startsWith(q)) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  if (member.stateName.toLowerCase().includes(q)) return 3;
  return 99;
}

// Typeahead that jumps the chart to a member. Behaves as an accessible combobox.
export function MemberSearch({ members, onSelect }: MemberSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return members
      .map((m) => ({ m, r: rank(m, q) }))
      .filter((x) => x.r < 99)
      .sort((a, b) => a.r - b.r || a.m.lastName.localeCompare(b.m.lastName))
      .slice(0, 8)
      .map((x) => x.m);
  }, [members, query]);

  useEffect(() => setHighlight(0), [query]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (m: Member) => {
    onSelect(m);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-xs">
      <div className="relative">
        <SearchIcon />
        <input
          type="text"
          value={query}
          placeholder="Search members…"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="member-search-list"
          aria-autocomplete="list"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-[9px] border border-[var(--color-hairline)] bg-[var(--color-surface)] py-1.5 pl-8 pr-3 text-[13px] text-[var(--color-ink)] shadow-[var(--shadow-card)] outline-none placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-accent)]"
        />
      </div>

      {open && results.length > 0 && (
        <ul
          id="member-search-list"
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-80 w-full overflow-auto rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-panel)] hc-scroll"
        >
          {results.map((m, i) => (
            <li
              key={m.bioguide}
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(m);
              }}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5"
              style={{ backgroundColor: i === highlight ? 'var(--color-hairline-soft)' : 'transparent' }}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: PARTY_COLOR[m.party] }}
                aria-hidden
              />
              <span className="truncate text-[13px] text-[var(--color-ink)]">
                {memberPrefix(m)} {m.fullName}
              </span>
              <span className="ml-auto shrink-0 text-[11px] text-[var(--color-ink-faint)]">
                {PARTY_LETTER[m.party]} · {m.state}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      aria-hidden
      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
    >
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
