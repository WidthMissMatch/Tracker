// App-wide constants and the options a host page can pass in the URL.

export const REPO_URL = 'https://github.com/WidthMissMatch/Tracker';
export const DEFAULT_SEGMENT = 3; // F1 — Monaco: the most visually interesting lap

// True when rendered inside an iframe. Comparing window references is allowed
// even across origins / in a sandbox; anything that throws means "framed".
function detectFramed() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function readParams(search) {
  const q = new URLSearchParams(search);
  const num = (key) => {
    if (!q.has(key)) return undefined;
    const v = Number(q.get(key));
    return Number.isFinite(v) ? v : undefined;
  };
  const bool = (key) => {
    if (!q.has(key)) return undefined;
    return !['0', 'false', 'no', 'off'].includes(q.get(key).toLowerCase());
  };
  return {
    segment: num('seg'),        // segment index, 0-based
    autoplay: bool('autoplay'), // start playing (default true)
    speed: num('speed'),        // playback speed multiplier
    zoom: num('zoom'),
    follow: bool('follow'),
    hud: bool('hud'),
    panels: bool('panels'),     // false → stage + transport only
    embed: bool('embed'),       // force embedded behaviour on/off
  };
}

const params = readParams(window.location.search);

export const OPTIONS = {
  ...params,
  framed: params.embed ?? detectFramed(),
};
