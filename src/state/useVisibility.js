import { useEffect, useState } from 'react';

// True while the page is visible and on screen. Used to stop playback and
// rendering when the tab is hidden or an embedding page has scrolled the
// iframe out of view (an IntersectionObserver with the implicit root measures
// against the top-level viewport, through any ancestor frames).
export function useVisibility() {
  const [onScreen, setOnScreen] = useState(true);
  const [docVisible, setDocVisible] = useState(() => document.visibilityState !== 'hidden');

  useEffect(() => {
    const onChange = () => setDocVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  useEffect(() => {
    const el = document.getElementById('root');
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return onScreen && docVisible;
}
