import { classColor } from '../data/classes.js';
import { fmt, pad } from '../data/format.js';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, RestartIcon } from './icons/UiIcons.jsx';

function Timeline({ segments, activeIdx, progress, onSelect, onSeek }) {
  const total = segments.reduce((s, x) => s + x.n, 0);

  const handleClick = (i, e) => {
    if (i !== activeIdx) {
      onSelect(i);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  };

  return (
    <div className="timeline" role="group" aria-label="Segments">
      {segments.map((s, i) => {
        const color = classColor(s.label);
        const active = i === activeIdx;
        const prog = active ? progress : i < activeIdx ? 1 : 0;
        return (
          <button
            type="button"
            key={s.id}
            className={`tl-seg ${active ? 'active' : ''}`}
            style={{ flexGrow: Math.max(0.04, s.n / total), '--seg-color': color }}
            onClick={(e) => handleClick(i, e)}
            title={active ? `${s.label} — click to seek` : s.label}
          >
            <span className="num">SEG {pad(s.id)}</span>
            <span className="lab">{s.label}</span>
            <span className="progress" style={{ width: `${prog * 100}%` }} />
            {active && <span className="playhead" style={{ left: `${prog * 100}%` }} />}
          </button>
        );
      })}
    </div>
  );
}

export function Transport({ segments, activeIdx, row, progress, paused, speed, playback, onSpeed }) {
  return (
    <footer className="transport">
      <div className="transport-controls">
        <button type="button" className="tbtn" onClick={playback.prev} title="Previous segment (,)" aria-label="Previous segment"><PrevIcon /></button>
        <button type="button" className="tbtn primary" onClick={playback.togglePause} title="Play / pause (Space)" aria-label={paused ? 'Play' : 'Pause'}>
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
        <button type="button" className="tbtn" onClick={playback.next} title="Next segment (.)" aria-label="Next segment"><NextIcon /></button>
        <button type="button" className="tbtn" onClick={playback.restart} title="Restart segment (R)" aria-label="Restart segment"><RestartIcon /></button>
        <div className="speed-stepper" role="group" aria-label="Playback speed">
          <button type="button" onClick={() => onSpeed(speed / 1.5)} aria-label="Slower">−</button>
          <div className="val">{speed >= 1 ? speed.toFixed(1) : speed.toFixed(2)}×</div>
          <button type="button" onClick={() => onSpeed(speed * 1.5)} aria-label="Faster">+</button>
        </div>
      </div>

      <Timeline
        segments={segments}
        activeIdx={activeIdx}
        progress={progress}
        onSelect={playback.selectSegment}
        onSeek={(f) => playback.seek(Math.floor(f * (segments[activeIdx].n - 1)))}
      />

      <div className="coord-mini" aria-label="Ground-truth position">
        {['X', 'Y', 'Z'].map((ax, i) => (
          <div key={ax}><div className="k">Truth {ax}</div><div className="v">{fmt(row?.g[i])}</div></div>
        ))}
      </div>
    </footer>
  );
}
