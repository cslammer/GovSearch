import { useEffect, useRef, useState } from 'react';
import { runWithConcurrency } from '../lib/concurrency';

// Rings-first rendering: the chart paints colored seats instantly, then this
// hook preloads member thumbnails in throttled batches (during idle time) so
// photos fade in without a 435-request stall. A failed image is remembered so
// the seat keeps its initials avatar and we never retry it.

interface PhotoState {
  ready: Set<string>;
  failed: Set<string>;
  version: number; // bumps to trigger re-render as batches resolve
}

const idle = (cb: () => void): number => {
  const ric = (window as Window & { requestIdleCallback?: (c: () => void) => number })
    .requestIdleCallback;
  return ric ? ric(cb) : window.setTimeout(cb, 16);
};

export function usePhotoLoader(urls: Map<string, string>): PhotoState {
  const ready = useRef(new Set<string>());
  const failed = useRef(new Set<string>());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Only fetch ones we haven't already resolved.
    const pending = [...urls.entries()].filter(
      ([id]) => !ready.current.has(id) && !failed.current.has(id),
    );
    if (pending.length === 0) return;

    const load = ([id, url]: [string, string]) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          ready.current.add(id);
          resolve();
        };
        img.onerror = () => {
          failed.current.add(id);
          resolve();
        };
        img.src = url;
      });

    // Coalesce re-renders: as images resolve we request a SINGLE re-render per
    // animation frame instead of one every N images. This keeps newly-loaded
    // photos appearing promptly while preventing a burst of re-renders from
    // interrupting a hover's CSS scale transition (the cause of hover flicker).
    let rafId = 0;
    const scheduleFlush = () => {
      if (rafId || cancelled) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (!cancelled) setVersion((v) => v + 1);
      });
    };

    idle(() => {
      if (cancelled) return;
      runWithConcurrency(pending, 12, async (entry) => {
        await load(entry);
        if (cancelled) return;
        scheduleFlush();
      }).then(() => {
        if (!cancelled) scheduleFlush();
      });
    });

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
    // urls identity changes per chamber switch; that's the intended trigger.
  }, [urls]);

  return { ready: ready.current, failed: failed.current, version };
}
