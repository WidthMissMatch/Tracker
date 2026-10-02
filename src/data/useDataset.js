import { useCallback, useEffect, useState } from 'react';
import { loadManifest, loadSegment } from './loader.js';

// Loads the manifest once, then the rows for the active segment (prefetching
// the next one so auto-advance doesn't stall). `rows` is null until the active
// segment's rows are in — never the previous segment's. Manifest and segment
// failures are reported separately so a bad segment doesn't take down the app;
// `retry()` reloads whichever failed.
export function useDataset(segIdx) {
  const [manifest, setManifest] = useState(null);
  const [manifestError, setManifestError] = useState(null);
  const [loaded, setLoaded] = useState({ segIdx: -1, rows: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (manifest) return;
    let cancelled = false;
    setManifestError(null);
    loadManifest().then(
      (m) => !cancelled && setManifest(m),
      (err) => !cancelled && setManifestError(err),
    );
    return () => {
      cancelled = true;
    };
  }, [manifest, attempt]);

  useEffect(() => {
    if (!manifest) return;
    const segs = manifest.segments;
    let cancelled = false;
    setLoaded((prev) => (prev.error ? { segIdx: -1, rows: null, error: null } : prev));
    loadSegment(segs[segIdx]).then(
      (rows) => {
        if (cancelled) return;
        setLoaded({ segIdx, rows, error: null });
        loadSegment(segs[(segIdx + 1) % segs.length]).catch(() => {});
      },
      (error) => !cancelled && setLoaded({ segIdx, rows: null, error }),
    );
    return () => {
      cancelled = true;
    };
  }, [manifest, segIdx, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const current = loaded.segIdx === segIdx;

  return {
    manifest,
    manifestError,
    rows: current ? loaded.rows : null,
    segmentError: current ? loaded.error : null,
    retry,
  };
}
