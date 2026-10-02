export function fmt(n, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 10000) return n.toFixed(0);
  return n.toFixed(digits);
}

export const pad = (n, width = 2) => String(n).padStart(width, '0');

export const fmtInt = (n) => n.toLocaleString('en-US');
