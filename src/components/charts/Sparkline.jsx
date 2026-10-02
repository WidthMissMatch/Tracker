export function Sparkline({ values, width = 56, height = 16, color }) {
  if (!values || values.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...values);
  const range = Math.max(1e-6, Math.max(...values) - min);
  const step = width / (values.length - 1);
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} className="sparkline" aria-hidden="true">
      <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={color} fillOpacity="0.12" />
      <path d={d} stroke={color} strokeWidth="1" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
