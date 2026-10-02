import { useEffect, useState } from 'react';
import { loadManifest, loadSegment } from './loader.js';

// Loads the manifest once, then the rows for the active segment (prefetching
// the next one so auto-advance doesn't stall). `rows` is null until the
// active segment's rows are in, never the previous segment's.
export function useDataset(segIdx) {
  const [manifest, setManifest] = useState(null);
  const [loaded, setLoaded] = useState({ segIdx: -1, rows: null });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadManifest().then(setManifest, setError);
  }, []);

  useEffect(() => {
    if (!manifest) return;
    const segs = manifest.segments;
    let cancelled = false;
    loadSegment(segs[segIdx]).then(
      (rows) => {
        if (cancelled) return;
        setLoaded({ segIdx, rows });
        loadSegment(segs[(segIdx + 1) % segs.length]).catch(() => {});
      },
      (err) => !cancelled && setError(err),
    );
    return () => {
      cancelled = true;
    };
  }, [manifest, segIdx]);

  return { manifest, rows: loaded.segIdx === segIdx ? loaded.rows : null, error };
}
