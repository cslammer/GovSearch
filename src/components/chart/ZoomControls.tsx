interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const btn =
  'flex h-8 w-8 items-center justify-center text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-hairline-soft)] hover:text-[var(--color-ink)] focus-visible:bg-[var(--color-hairline-soft)]';

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      <button type="button" className={btn} onClick={onZoomIn} aria-label="Zoom in">
        <PlusIcon />
      </button>
      <div className="h-px bg-[var(--color-hairline)]" />
      <button type="button" className={btn} onClick={onZoomOut} aria-label="Zoom out">
        <MinusIcon />
      </button>
      <div className="h-px bg-[var(--color-hairline)]" />
      <button type="button" className={btn} onClick={onReset} aria-label="Reset view">
        <ResetIcon />
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M7.5 3v9M3 7.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M3 7.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function ResetIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path
        d="M3.5 6.5A4 4 0 1 1 3 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M2 4.2v2.6h2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
