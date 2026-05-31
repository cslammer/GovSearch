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

    idle(() => {
      if (cancelled) return;
      // Modest concurrency; bump version periodically so seats fade in in waves.
      let sinceFlush = 0;
      runWithConcurrency(pending, 12, async (entry) => {
        await load(entry);
        if (cancelled) return;
        if (++sinceFlush % 8 === 0) setVersion((v) => v + 1);
      }).then(() => {
        if (!cancelled) setVersion((v) => v + 1);
      });
    });

    return () => {
      cancelled = true;
    };
    // urls identity changes per chamber switch; that's the intended trigger.
  }, [urls]);

  return { ready: ready.current, failed: failed.current, version };
}
