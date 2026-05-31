import { useCallback, useEffect, useRef, useState } from 'react';

export interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

interface Options {
  minScale?: number;
  maxScale?: number;
}

const EASE = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

/**
 * Pan + zoom for an SVG chart. Works in the SVG's viewBox user-coordinate space
 * so it composes with the seat geometry. Returns the current transform, a set
 * of pointer/wheel handlers, and an imperative `focusOn` tween (used by search).
 */
export function usePanZoom(
  svgRef: React.RefObject<SVGSVGElement | null>,
  view: { w: number; h: number },
  opts: Options = {},
) {
  const minScale = opts.minScale ?? 1;
  const maxScale = opts.maxScale ?? 8;
  const [t, setT] = useState<Transform>({ scale: 1, tx: 0, ty: 0 });
  const tRef = useRef(t);
  tRef.current = t;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);
  const rafRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  const clamp = useCallback(
    (s: number) => Math.min(maxScale, Math.max(minScale, s)),
    [minScale, maxScale],
  );

  // Map a client (screen) point into SVG viewBox user coordinates.
  const toUser = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg || !svg.getScreenCTM) return { x: 0, y: 0 };
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: pt.x, y: pt.y };
    },
    [svgRef],
  );

  const cancelTween = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  const zoomAt = useCallback(
    (userX: number, userY: number, nextScale: number) => {
      setT((prev) => {
        const s = clamp(nextScale);
        // Keep the content point under the cursor fixed.
        const cx = (userX - prev.tx) / prev.scale;
        const cy = (userY - prev.ty) / prev.scale;
        return { scale: s, tx: userX - s * cx, ty: userY - s * cy };
      });
    },
    [clamp],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      cancelTween();
      const { x, y } = toUser(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(x, y, tRef.current.scale * factor);
    },
    [toUser, zoomAt],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    cancelTween();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) setDragging(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      const prev = pointers.current.get(e.pointerId)!;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 1) {
        // Pan: convert the screen delta into user units via the CTM scale.
        const svg = svgRef.current;
        const ctm = svg?.getScreenCTM?.();
        const k = ctm ? ctm.a : 1;
        const dx = (e.clientX - prev.x) / (k || 1);
        const dy = (e.clientY - prev.y) / (k || 1);
        setT((p) => ({ ...p, tx: p.tx + dx, ty: p.ty + dy }));
      } else if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = toUser((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (pinchDist.current > 0) {
          zoomAt(mid.x, mid.y, tRef.current.scale * (dist / pinchDist.current));
        }
        pinchDist.current = dist;
      }
    },
    [svgRef, toUser, zoomAt],
  );

  const endPointer = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = 0;
    if (pointers.current.size === 0) setDragging(false);
  }, []);

  /** Smoothly center content point (cx, cy) at a target scale. */
  const focusOn = useCallback(
    (cx: number, cy: number, scale = 2.4) => {
      cancelTween();
      const s = clamp(scale);
      const target = { scale: s, tx: view.w / 2 - s * cx, ty: view.h / 2 - s * cy };
      const start = { ...tRef.current };
      const t0 = performance.now();
      const dur = 460;
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const k = EASE(p);
        setT({
          scale: start.scale + (target.scale - start.scale) * k,
          tx: start.tx + (target.tx - start.tx) * k,
          ty: start.ty + (target.ty - start.ty) * k,
        });
        if (p < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [view.w, view.h, clamp],
  );

  const reset = useCallback(() => {
    cancelTween();
    setT({ scale: 1, tx: 0, ty: 0 });
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      cancelTween();
      zoomAt(view.w / 2, view.h / 2, tRef.current.scale * factor);
    },
    [view.w, view.h, zoomAt],
  );

  useEffect(() => () => cancelTween(), []);

  return {
    transform: t,
    dragging,
    handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer },
    focusOn,
    reset,
    zoomBy,
  };
}
