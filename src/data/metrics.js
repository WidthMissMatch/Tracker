// Pure helpers over trace rows. No rendering, no React.

export const trackError = (r) =>
  Math.hypot(r.g[0] - r.e[0], r.g[1] - r.e[1], r.g[2] - r.e[2]);

export const speedOf = (r) => Math.hypot(r.v[0], r.v[1], r.v[2]);

export function mean(xs) {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

export function rms(xs) {
  return xs.length ? Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length) : 0;
}

export function normalize(probs) {
  const total = probs.reduce((s, p) => s + p, 0) || 1;
  return probs.map((p) => p / total);
}

// Lock state shown on the HUD, gated by RF confidence.
export function lockState(confidence, override = 'auto') {
  if (override !== 'auto') return override;
  if (confidence >= 80) return 'firing';
  if (confidence >= 50) return 'locked';
  return 'tracking';
}

const lerp = (a, b, t) => a + (b - a) * t;
const lerpVec = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

// Row at a fractional step, interpolating positions for smooth motion.
// Discrete fields (class, bank, cycle) come from the earlier sample.
export function rowAt(rows, f) {
  if (!rows.length) return null;
  const x = Math.max(0, Math.min(rows.length - 1, f));
  const i0 = Math.floor(x);
  const i1 = Math.min(rows.length - 1, i0 + 1);
  const t = x - i0;
  const r0 = rows[i0];
  const r1 = rows[i1];
  if (t === 0) return r0;
  return {
    ...r0,
    g: lerpVec(r0.g, r1.g, t),
    e: lerpVec(r0.e, r1.e, t),
    p: lerpVec(r0.p, r1.p, t),
    v: lerpVec(r0.v, r1.v, t),
    cf: lerp(r0.cf, r1.cf, t),
  };
}
