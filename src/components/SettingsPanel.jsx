import { useEffect, useRef } from 'react';
import { LIMITS } from '../state/useSettings.js';
import { SHORTCUTS } from '../state/shortcuts.js';
import { CloseIcon } from './icons/UiIcons.jsx';

function Toggle({ label, checked, onChange }) {
  return (
    <label className="set-row">
      <span>{label}</span>
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Slider({ label, value, min, max, step, format, onChange }) {
  return (
    <label className="set-row stacked">
      <span className="set-lbl"><span>{label}</span><span className="set-val">{format(value)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="set-row stacked">
      <span className="set-lbl"><span>{label}</span></span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={o === value}
                  className={o === value ? 'on' : ''} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({ open, settings, set, reset, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={`settings ${open ? 'open' : ''}`}
        aria-label="Settings"
        aria-hidden={!open}
        inert={open ? undefined : ''}
        tabIndex={-1}
      >
        <div className="settings-head">
          <h2>Settings</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close settings"><CloseIcon /></button>
        </div>

        <div className="settings-body">
          <h3>View</h3>
          <Slider label="Zoom" value={settings.zoom} min={LIMITS.zoom[0]} max={LIMITS.zoom[1]} step={0.05}
                  format={(v) => `${v.toFixed(2)}×`} onChange={(v) => set('zoom', v)} />
          <Toggle label="Follow target" checked={settings.follow} onChange={(v) => set('follow', v)} />
          <Toggle label="Floor grid" checked={settings.showGrid} onChange={(v) => set('showGrid', v)} />
          <Toggle label="Bounding box" checked={settings.showBox} onChange={(v) => set('showBox', v)} />
          <Toggle label="Full segment path" checked={settings.showPath} onChange={(v) => set('showPath', v)} />

          <h3>Overlays</h3>
          <Toggle label="Filter estimate" checked={settings.showEstimate} onChange={(v) => set('showEstimate', v)} />
          <Toggle label="One-step prediction" checked={settings.showPred} onChange={(v) => set('showPred', v)} />
          <Toggle label="Upcoming predictions" checked={settings.showFuture} onChange={(v) => set('showFuture', v)} />
          <Toggle label="HUD (target box, footer)" checked={settings.showHUD} onChange={(v) => set('showHUD', v)} />
          <Segmented label="Lock state" value={settings.lockMode}
                     options={['auto', 'tracking', 'locked', 'firing']} onChange={(v) => set('lockMode', v)} />
          <Slider label="Trail length" value={settings.trailLen} min={LIMITS.trailLen[0]} max={LIMITS.trailLen[1]} step={20}
                  format={(v) => `${v} steps`} onChange={(v) => set('trailLen', v)} />

          <h3>Playback</h3>
          <Slider label="Speed" value={settings.speed} min={LIMITS.speed[0]} max={LIMITS.speed[1]} step={0.1}
                  format={(v) => `${v.toFixed(1)}×`} onChange={(v) => set('speed', v)} />

          <h3>Keyboard</h3>
          <dl className="shortcuts">
            {SHORTCUTS.map((s) => (
              <div key={s.label}>
                <dt>{s.keys.map((k) => <kbd key={k}>{k}</kbd>)}</dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>

          <button type="button" className="reset-btn" onClick={reset}>Reset to defaults</button>

          <p className="about">
            This page replays a recorded run of the IMM filter — no tracking runs in the
            browser. Each step shows the stored ground truth, estimate, prediction, mode
            probabilities and RF classification for that radar cycle.
          </p>
        </div>
      </aside>
    </>
  );
}
