import { useCallback, useState } from 'react';

export const DEFAULT_SETTINGS = {
  zoom: 1,
  follow: true,
  speed: 1,
  trailLen: 600,
  lockMode: 'auto',
  showGrid: true,
  showBox: true,
  showPath: true,
  showEstimate: true,
  showPred: true,
  showFuture: true,
  showHUD: true,
};

export const LIMITS = {
  zoom: [0.15, 8],
  speed: [0.1, 20],
  trailLen: [20, 2000],
};

const STORAGE_KEY = 'raso.settings.v1';

function clamp(key, value) {
  const range = LIMITS[key];
  return range ? Math.max(range[0], Math.min(range[1], value)) : value;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const merged = { ...DEFAULT_SETTINGS };
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      if (typeof saved[k] === typeof DEFAULT_SETTINGS[k]) merged[k] = clamp(k, saved[k]);
    }
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// View settings, remembered per browser.
export function useSettings() {
  const [settings, setSettings] = useState(load);

  const set = useCallback((key, value) => {
    setSettings((prev) => {
      const v = typeof value === 'function' ? value(prev[key]) : value;
      const next = { ...prev, [key]: clamp(key, v) };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable (private mode) — settings just won't persist.
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return [settings, set, reset];
}
