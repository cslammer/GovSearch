import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// App-wide safety net: a runtime error renders a recoverable message instead of
// a blank white screen. "Reset" clears the persisted cache (the usual culprit
// for a stale/incompatible cached shape) and reloads.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it for debugging; harmless in production.
    console.error('Hemicycle crashed:', error, info);
  }

  private reset = () => {
    try {
      // Clear any persisted query cache, then hard reload.
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith('hemicycle-cache')) window.localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--color-ink)]">
            Something went wrong
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
            The app hit an unexpected error. Resetting clears any locally cached data and reloads —
            this usually fixes it.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 rounded-lg bg-[var(--color-ink)] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Reset and reload
          </button>
        </div>
      </div>
    );
  }
}
