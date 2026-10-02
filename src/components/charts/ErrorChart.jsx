import { useId } from 'react';

const W = 280;
const H = 56;

// Rolling tracking-error area with the segment's 95th-percentile reference.
export function ErrorChart({ values, p95 }) {
  const gradId = useId();
  const max = Math.max(p95 || 1, ...values, 1e-6) * 1.1;
  const y = (v) => H - 2 - (Math.min(v, max) / max) * (H - 4);
  const step = values.length > 1 ? W / (values.length - 1) : 0;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const p95y = y(p95);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="error-chart" preserveAspectRatio="none" role="img"
         aria-label="Tracking error over the recent window">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--bad)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--bad)" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={p95y} y2={p95y} stroke="var(--warn)" strokeOpacity="0.5"
            strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      {values.length > 1 && (
        <>
          <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={`url(#${gradId})`} />
          <path d={d} stroke="var(--bad)" strokeWidth="1.4" fill="none" vectorEffect="non-scaling-stroke" />
        </>
      )}
    </svg>
  );
}
