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

    // Coalesce re-renders: photos resolve in a burst, but we flush at most a few
    // times per second (a trailing-edge throttle) so newly-loaded photos appear
    // in calm waves WITHOUT a flood of re-renders interrupting a hovered seat's
    // CSS scale transition (the cause of the hover flicker).
    const FLUSH_MS = 250;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleFlush = () => {
      if (timer || cancelled) return;
      timer = setTimeout(() => {
        timer = null;
        if (!cancelled) setVersion((v) => v + 1);
      }, FLUSH_MS);
    };

    idle(() => {
      if (cancelled) return;
      runWithConcurrency(pending, 12, async (entry) => {
        await load(entry);
        if (cancelled) return;
        scheduleFlush();
      }).then(() => {
        // Final flush so the last wave of photos always appears.
        if (cancelled) return;
        if (timer) clearTimeout(timer);
        timer = null;
        setVersion((v) => v + 1);
      });
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // urls identity changes per chamber switch; that's the intended trigger.
  }, [urls]);

  return { ready: ready.current, failed: failed.current, version };
}
