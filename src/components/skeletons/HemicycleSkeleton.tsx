// A calm, on-brand loading state for the chart: faint concentric arcs of dots,
// shimmering — not a spinner.
export function HemicycleSkeleton() {
  const rings = 7;
  const dots: { cx: number; cy: number }[] = [];
  for (let r = 0; r < rings; r++) {
    const radius = 22 + r * 12;
    const count = 10 + r * 5;
    for (let i = 0; i < count; i++) {
      const a = Math.PI * (i / (count - 1));
      dots.push({ cx: 108 + radius * Math.cos(a), cy: 104 - radius * Math.sin(a) });
    }
  }
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden>
      <svg viewBox="0 0 216 116" width="100%" height="100%" className="max-h-full">
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={2.6} className="hc-skeleton" fill="var(--color-hairline)" />
        ))}
      </svg>
    </div>
  );
}
