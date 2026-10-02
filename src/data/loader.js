// Fetches the dataset produced by scripts/build-data.mjs.
//
// Paths are relative to the page, so the same build works at a site root, under
// /Tracker/, and inside a sandboxed iframe (opaque origin — requests are then
// cross-origin, which GitHub Pages allows via `Access-Control-Allow-Origin: *`).
//
// Requests time out and retry with backoff, responses are shape-checked, and
// failed segment loads are evicted from the cache so a retry refetches.

const BASE = `${import.meta.env.BASE_URL}data/`;
const SUPPORTED_FORMAT = 2;
const TIMEOUT_MS = 15000;
const RETRIES = 2;
const segmentCache = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJsonOnce(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} for ${url}`);
      err.retryable = res.status >= 500 || res.status === 429;
      throw err;
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      const t = new Error(`Timed out loading ${url}`);
      t.retryable = true;
      throw t;
    }
    if (err instanceof TypeError) err.retryable = true; // network failure
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(path) {
  const url = BASE + path;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchJsonOnce(url);
    } catch (err) {
      if (!err.retryable || attempt >= RETRIES) throw err;
      await sleep(500 * 2 ** attempt);
    }
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(`Invalid data: ${msg}`);
}

export async function loadManifest() {
  const m = await getJson('manifest.json');
  assert(m && m.format === SUPPORTED_FORMAT, `format ${m?.format}, expected ${SUPPORTED_FORMAT} — run \`npm run data\``);
  assert(Array.isArray(m.segments) && m.segments.length > 0, 'manifest has no segments');
  assert(Array.isArray(m.rfLabels) && Array.isArray(m.modes), 'manifest is missing label tables');
  return m;
}

// Column-oriented segment file → array of row objects.
function toRows(col, segment) {
  const n = col?.n;
  assert(Number.isInteger(n) && n > 1, `segment ${segment.id} has no rows`);
  for (const k of ['g', 'e', 'p', 'v', 'pr']) {
    assert(col[k]?.length === n * 3, `segment ${segment.id} field ${k} has wrong length`);
  }
  for (const k of ['c', 'rc', 'ii', 'cf']) {
    assert(col[k]?.length === n, `segment ${segment.id} field ${k} has wrong length`);
  }

  const vec = (arr, i) => arr.slice(i * 3, i * 3 + 3);
  const rows = new Array(n);
  for (let i = 0; i < n; i++) {
    rows[i] = {
      c: col.c[i],
      g: vec(col.g, i),
      e: vec(col.e, i),
      p: vec(col.p, i),
      v: vec(col.v, i),
      pr: vec(col.pr, i),
      rc: col.rc[i],
      ii: col.ii[i],
      cf: col.cf[i],
    };
  }
  return rows;
}

export function loadSegment(segment) {
  if (!segmentCache.has(segment.id)) {
    const p = getJson(segment.file)
      .then((col) => toRows(col, segment))
      .catch((err) => {
        segmentCache.delete(segment.id);
        throw err;
      });
    segmentCache.set(segment.id, p);
  }
  return segmentCache.get(segment.id);
}
