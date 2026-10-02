import { useCallback, useState } from 'react';
import { OPTIONS } from '../config.js';

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

// Embedded copies don't persist: one host page shouldn't change what another
// host (or the standalone site) opens with. Storage can also be unavailable
// (sandboxed iframe, private mode), so every access is guarded.
const PERSIST = !OPTIONS.framed;

function clamp(key, value) {
  const range = LIMITS[key];
  return range ? Math.max(range[0], Math.min(range[1], value)) : value;
}

function readStored() {
  if (!PERSIST) return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeStored(settings) {
  if (!PERSIST) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable or full — settings just won't persist.
  }
}

// defaults < saved settings < URL options
function initialSettings() {
  const saved = readStored();
  const fromUrl = {
    zoom: OPTIONS.zoom,
    speed: OPTIONS.speed,
    follow: OPTIONS.follow,
    showHUD: OPTIONS.hud,
  };
  const merged = { ...DEFAULT_SETTINGS };
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    for (const v of [saved[k], fromUrl[k]]) {
      if (typeof v === typeof def && (typeof v !== 'number' || Number.isFinite(v))) merged[k] = clamp(k, v);
    }
  }
  return merged;
}

// View settings, remembered per browser on the standalone site.
export function useSettings() {
  const [settings, setSettings] = useState(initialSettings);

  const set = useCallback((key, value) => {
    setSettings((prev) => {
      const v = typeof value === 'function' ? value(prev[key]) : value;
      const next = { ...prev, [key]: clamp(key, v) };
      writeStored(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    writeStored(DEFAULT_SETTINGS);
  }, []);

  return [settings, set, reset];
}
