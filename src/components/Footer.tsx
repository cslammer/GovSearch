export function Footer() {
  return (
    <footer className="border-t border-[var(--color-hairline)] px-5 py-5 text-[12px] text-[var(--color-ink-faint)]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Built with open data. Not affiliated with the U.S. government.
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          <span>Roster &amp; photos:{' '}
            <a className="underline hover:text-[var(--color-ink-soft)]" href="https://github.com/unitedstates/congress-legislators" target="_blank" rel="noreferrer">
              unitedstates project
            </a>
          </span>
          <span>Votes &amp; bills:{' '}
            <a className="underline hover:text-[var(--color-ink-soft)]" href="https://api.congress.gov/" target="_blank" rel="noreferrer">
              Congress.gov
            </a>{' '}&amp;{' '}
            <a className="underline hover:text-[var(--color-ink-soft)]" href="https://www.senate.gov/legislative/votes.htm" target="_blank" rel="noreferrer">
              Senate.gov
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
}
