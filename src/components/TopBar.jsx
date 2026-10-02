import { useEffect, useState } from 'react';
import { classColor } from '../data/classes.js';
import { pad } from '../data/format.js';
import { GithubIcon, SettingsIcon } from './icons/UiIcons.jsx';

const REPO_URL = 'https://github.com/WidthMissMatch/Tracker';

// Polls the renderer's fps counter without re-rendering the whole app.
function useFps(fpsRef) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFps(fpsRef.current), 500);
    return () => clearInterval(id);
  }, [fpsRef]);
  return fps;
}

function Stat({ label, children, style }) {
  return (
    <div className="tb-stat">
      <div className="lbl">{label}</div>
      <div className="val" style={style}>{children}</div>
    </div>
  );
}

export function TopBar({ row, step, segment, rfLabels, paused, fpsRef, onOpenSettings }) {
  const fps = useFps(fpsRef);
  const rfClass = row ? rfLabels[row.rc] : '—';

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true" />
        <div className="brand-text">
          <div className="t1">RASO IMM Console</div>
          <div className="t2">Recorded tracker replay</div>
        </div>
      </div>

      <div className={`status-pill ${paused ? 'paused' : ''}`}>
        <span className="dot" />
        {paused ? 'Paused' : 'Replaying'}
      </div>

      <div className="tb-spacer" />

      <div className="tb-stats">
        <Stat label="Cycle">{row ? pad(row.c, 5) : '—'}</Stat>
        <Stat label="Step">{row && segment ? `${step + 1} / ${segment.n}` : '—'}</Stat>
        <Stat label="RF class" style={{ color: classColor(rfClass) }}>{rfClass}</Stat>
        <Stat label="RF conf">{row ? `${Math.round(row.cf)}%` : '—'}</Stat>
        <Stat label="IMM bank" style={{ color: 'var(--violet)' }}>{row ? `B${row.ii}` : '—'}</Stat>
        <Stat label="Render">{fps} fps</Stat>
      </div>

      <div className="tb-actions">
        <button type="button" className="icon-btn" onClick={onOpenSettings} title="Settings (S)" aria-label="Open settings">
          <SettingsIcon />
        </button>
        <a className="icon-btn" href={REPO_URL} target="_blank" rel="noreferrer" title="Source on GitHub" aria-label="Source on GitHub">
          <GithubIcon />
        </a>
      </div>
    </header>
  );
}
