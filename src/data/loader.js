// Fetches the dataset produced by scripts/build-data.mjs. Segment files are
// cached so revisiting a trajectory is instant.

const BASE = `${import.meta.env.BASE_URL}data/`;
const segmentCache = new Map();

async function getJson(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`);
  return res.json();
}

export function loadManifest() {
  return getJson('manifest.json');
}

export function loadSegment(segment) {
  if (!segmentCache.has(segment.id)) {
    const p = getJson(segment.file).catch((err) => {
      segmentCache.delete(segment.id);
      throw err;
    });
    segmentCache.set(segment.id, p);
  }
  return segmentCache.get(segment.id);
}
