import { classColor } from '../data/classes.js';
import { fmtInt, pad } from '../data/format.js';
import { Sparkline } from './charts/Sparkline.jsx';
import { ClassIcon } from './icons/ClassIcon.jsx';

export function TrajectoryList({ segments, totalRows, activeIdx, onSelect }) {
  return (
    <nav className="sidebar" aria-label="Trajectories">
      <div className="panel-head">
        <div className="ttl">Trajectories</div>
        <div className="ct">{segments.length} seg · {fmtInt(totalRows)} samples</div>
      </div>
      <ul className="seg-list">
        {segments.map((seg, i) => {
          const color = classColor(seg.label);
          return (
            <li key={seg.id}>
              <button
                type="button"
                className={`seg-item ${i === activeIdx ? 'active' : ''}`}
                onClick={() => onSelect(i)}
                aria-current={i === activeIdx ? 'true' : undefined}
                title={`${seg.label} — ${fmtInt(seg.n)} samples, cycles ${seg.cycleStart}–${seg.cycleEnd}${i < 9 ? ` (key ${i + 1})` : ''}`}
              >
                <span className="seg-icon" style={{ color }}>
                  <ClassIcon label={seg.label} />
                </span>
                <span className="seg-meta">
                  <span className="name">{seg.label}</span>
                  <span className="sub">
                    SEG {pad(seg.id)} · MAE {seg.stats.mae.toFixed(2)}
                  </span>
                </span>
                <Sparkline values={seg.errSpark} color={color} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
