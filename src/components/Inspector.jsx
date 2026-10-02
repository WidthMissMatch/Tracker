import { useMemo } from 'react';
import { classColor } from '../data/classes.js';
import { fmt } from '../data/format.js';
import { mean, normalize, rms, speedOf, trackError } from '../data/metrics.js';
import { ErrorChart } from './charts/ErrorChart.jsx';
import { MODE_COLORS, ModeProbChart } from './charts/ModeProbChart.jsx';

const ERROR_WINDOW = 60;
const MODE_WINDOW = 80;

function Section({ title, tag, children }) {
  return (
    <section className="section">
      <h2 className="sttl"><span>{title}</span>{tag && <span className="tag">{tag}</span>}</h2>
      {children}
    </section>
  );
}

function Vec({ v, className }) {
  return (
    <div className={`v ${className || ''}`}>
      <span className="ax">x</span>{fmt(v?.[0])} <span className="ax">y</span>{fmt(v?.[1])} <span className="ax">z</span>{fmt(v?.[2])}
    </div>
  );
}

export function Inspector({ rows, step, segment, manifest }) {
  const row = rows?.[step] ?? null;

  const errWindow = useMemo(() => {
    if (!rows) return [];
    return rows.slice(Math.max(0, step - ERROR_WINDOW), step + 1).map(trackError);
  }, [rows, step]);

  const modeWindow = useMemo(() => {
    if (!rows) return [];
    return rows.slice(Math.max(0, step - MODE_WINDOW), step + 1).map((r) => r.pr);
  }, [rows, step]);

  const err = errWindow.at(-1) ?? 0;
  const errDelta = errWindow.length > 1 ? err - errWindow.at(-2) : 0;
  const probs = row ? normalize(row.pr) : [0, 0, 0];
  const rfClass = row ? manifest.rfLabels[row.rc] : '—';
  const conf = row ? Math.round(row.cf) : 0;

  return (
    <aside className="inspector" aria-label="Filter state">
      <Section title="Position" tag="world units">
        <div className="kv-grid">
          <div className="k">Truth</div><Vec v={row?.g} className="truth" />
          <div className="k">Est</div><Vec v={row?.e} className="estimate" />
          <div className="k">Pred+1</div><Vec v={row?.p} className="prediction" />
          <div className="k">|Vel|</div>
          <div className="v">{row ? fmt(speedOf(row), 2) : '—'}<span className="ax"> u/s</span></div>
        </div>
      </Section>

      <Section title="Tracking error" tag="‖truth − est‖">
        <div className="err-row">
          <div className="big">{fmt(err, 2)}</div>
          <div className="unit">u</div>
          <div className={`delta ${errDelta > 0 ? 'up' : 'dn'}`} title="Change since previous step">
            {errDelta > 0 ? '▲' : '▼'} {fmt(Math.abs(errDelta), 2)}
          </div>
        </div>
        <ErrorChart values={errWindow} p95={segment.stats.p95} />
        <div className="chart-caption">
          <span>last {errWindow.length} steps</span>
          <span><i className="dash" /> segment p95 {fmt(segment.stats.p95, 2)}</span>
        </div>
        <div className="err-stats">
          <div className="err-stat"><div className="l">MAE · window</div><div className="v">{fmt(mean(errWindow), 3)}</div></div>
          <div className="err-stat"><div className="l">RMSE · window</div><div className="v">{fmt(rms(errWindow), 3)}</div></div>
          <div className="err-stat"><div className="l">MAE · segment</div><div className="v">{fmt(segment.stats.mae, 3)}</div></div>
          <div className="err-stat"><div className="l">RMSE · segment</div><div className="v">{fmt(segment.stats.rmse, 3)}</div></div>
        </div>
      </Section>

      <Section title="Mode probability" tag={`last ${modeWindow.length}`}>
        <ModeProbChart history={modeWindow} />
        <div className="modeprob-legend">
          {manifest.modes.map((name, k) => (
            <div className="it" key={name}>
              <span className="sw" style={{ background: MODE_COLORS[k] }} />
              {name}
              <span className="pct">{(probs[k] * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Active IMM bank" tag={`${manifest.banks} banks`}>
        <div className="bank-row">
          {Array.from({ length: manifest.banks }, (_, i) => (
            <div key={i} className={`bank-dot ${row?.ii === i ? 'active' : ''}`}>B{i}</div>
          ))}
        </div>
      </Section>

      <Section title="RF classifier">
        <div className="rf-class">
          <span className="rf-name" style={{ color: classColor(rfClass) }}>{rfClass}</span>
          <span className="rf-truth">truth: {segment.label}</span>
        </div>
        <div className="conf-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={conf} aria-label="RF confidence">
          <div className="conf-fill" style={{ width: `${conf}%` }} />
          <div className="conf-marks"><i style={{ left: '50%' }} /><i style={{ left: '80%' }} /></div>
          <div className="lbl">{conf}%</div>
        </div>
        <div className="chart-caption"><span>confidence</span><span>lock ≥ 50 · fire ≥ 80</span></div>
      </Section>
    </aside>
  );
}
