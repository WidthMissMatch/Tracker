import { useEffect, useRef } from 'react';

// Human-readable list shown in the settings panel; keep in sync with CODE_TO_ACTION.
export const SHORTCUTS = [
  { keys: ['Space'], label: 'Play / pause' },
  { keys: ['←', '→'], label: 'Step back / forward' },
  { keys: [',', '.'], label: 'Previous / next segment' },
  { keys: ['1–9'], label: 'Jump to segment' },
  { keys: ['R'], label: 'Restart segment' },
  { keys: ['F'], label: 'Follow target' },
  { keys: ['+', '−'], label: 'Faster / slower' },
  { keys: ['[', ']'], label: 'Zoom out / in' },
  { keys: ['0'], label: 'Reset zoom' },
  { keys: ['P'], label: 'Prediction marker' },
  { keys: ['H'], label: 'HUD overlay' },
  { keys: ['S'], label: 'Settings panel' },
];

const CODE_TO_ACTION = {
  Space: 'togglePause',
  ArrowLeft: 'stepBack',
  ArrowRight: 'stepForward',
  Comma: 'prevSegment',
  Period: 'nextSegment',
  KeyR: 'restart',
  KeyF: 'toggleFollow',
  Equal: 'faster',
  NumpadAdd: 'faster',
  Minus: 'slower',
  NumpadSubtract: 'slower',
  BracketRight: 'zoomIn',
  BracketLeft: 'zoomOut',
  Digit0: 'resetZoom',
  Numpad0: 'resetZoom',
  KeyP: 'togglePred',
  KeyH: 'toggleHUD',
  KeyS: 'toggleSettings',
  Escape: 'closeSettings',
};

// `actions` maps action names to handlers; `onDigit(n)` handles 1–9.
export function useKeyboardShortcuts(actions, onDigit) {
  const ref = useRef({ actions, onDigit });
  ref.current = { actions, onDigit };

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const name = CODE_TO_ACTION[e.code];
      const fn = name && ref.current.actions[name];
      if (fn) {
        e.preventDefault();
        fn();
        return;
      }
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (m) ref.current.onDigit(Number(m[1]));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
