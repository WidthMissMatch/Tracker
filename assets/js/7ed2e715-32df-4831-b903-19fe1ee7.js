// app.jsx — RASO Mission Control main component

const { useState, useEffect, useRef, useMemo, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "altitude": 1800,
  "fov": 900,
  "horizonFrac": 0.42,
  "follow": true,
  "showPred": true,
  "showGrid": true,
  "showTerrain": true,
  "showMountains": true,
  "showClouds": true,
  "showHUD": true,
  "showCanopy": true,
  "trailLen": 600,
  "speed": 1.0,
  "lockMode": "auto"
}/*EDITMODE-END*/;

// ───────────────────────────── Helpers ─────────────────────────────

const RF_LABELS = ['Drone','Missile','Car','F1','Cat','Bird','Airplane','Ball','Artillery','Pedestrian'];

function fmt(n, d = 1) {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 10000) return n.toFixed(0);
  return n.toFixed(d);
}
function fmtCoord(arr) {
  return arr.map(v => fmt(v, 1)).join(', ');
}

// ───────────────────────────── Sparkline ─────────────────────────────

function Sparkline({ values, w = 56, h = 14, color = '#6df2ff', fill = true }) {
  if (!values || values.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...values), max = Math.max(...values);
  const range = Math.max(1e-6, max - min);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 2 - ((v - min) / range) * (h - 4)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} className="seg-spark">
      {fill && <path d={area} fill={color} fillOpacity="0.12" />}
      <path d={d} stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ───────────────────────────── ModeProb area chart ─────────────────────────────

function ModeProbArea({ history, w = 280, h = 80 }) {
  // history: array of [ctra, singer, bike] (each 0..1ish)
  if (!history || history.length < 2) {
    return <svg viewBox={`0 0 ${w} ${h}`} className="modeprob-area" />;
  }
  const n = history.length;
  const colors = ['#6df2ff', '#ffb663', '#b58cff'];
  const labels = ['CTRA', 'Singer', 'Bike'];

  // Stacked area: for each x, compute cumulative
  const xs = (i) => (i / (n - 1)) * w;
  function buildLayer(idx) {
    let topPath = '', bottomPath = '';
    for (let i = 0; i < n; i++) {
      const v = history[i];
      const total = (v[0] + v[1] + v[2]) || 1;
      let cumBelow = 0;
      for (let k = 0; k < idx; k++) cumBelow += v[k] / total;
      const cumTop = cumBelow + v[idx] / total;
      const x = xs(i).toFixed(1);
      const yT = (h - cumTop * h).toFixed(1);
      const yB = (h - cumBelow * h).toFixed(1);
      topPath += `${i ? 'L' : 'M'} ${x} ${yT} `;
      bottomPath = `L ${x} ${yB} ` + bottomPath;
    }
    return topPath + bottomPath + 'Z';
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="modeprob-area" preserveAspectRatio="none">
      <defs>
        {colors.map((c, i) => (
          <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.9" />
            <stop offset="100%" stopColor={c} stopOpacity="0.55" />
          </linearGradient>
        ))}
      </defs>
      {[2, 1, 0].map(idx => (
        <path key={idx} d={buildLayer(idx)} fill={`url(#g${idx})`} />
      ))}
    </svg>
  );
}

// ───────────────────────────── Segment list ─────────────────────────────

function SegmentList({ segments, activeIdx, onSelect, segmentSparks }) {
  return (
    <div className="left">
      <div className="panel-head">
        <div className="ttl">Trajectories</div>
        <div className="ct">{segments.length} SEG · 70 626 ROW</div>
      </div>
      <div className="seg-list">
        {segments.map((seg, i) => {
          const color = classColor(seg.label);
          const klass = getClassKey(seg.label);
          return (
            <div key={seg.id}
                 className={`seg-item ${i === activeIdx ? 'active' : ''}`}
                 onClick={() => onSelect(i)}>
              <div className="seg-icon" style={{ color }}>
                <ClassIcon label={seg.label} />
              </div>
              <div className="seg-meta">
                <div className="name">{seg.label}</div>
                <div className="sub">SEG {String(seg.id).padStart(2,'0')} · {seg.n.toString().padStart(3, ' ')} smp · cyc {seg.cs}–{seg.ce}</div>
              </div>
              <div className="seg-bars">
                <Sparkline values={segmentSparks[i] || []} color={color} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────── Topbar ─────────────────────────────

function TopBar({ paused, currentRow, segment, fps }) {
  const cls = currentRow ? RF_LABELS[currentRow.rc] : '—';
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark"></div>
        <div className="brand-text">
          <div className="t1">RASO IMM Console</div>
          <div className="t2">v2 · radar tracker</div>
        </div>
      </div>
      <div className={`live-pill ${paused ? 'paused' : ''}`}>
        <span className="dot"></span>
        {paused ? 'PAUSED' : 'LIVE'}
      </div>
      <div className="tb-spacer"></div>
      <div className="tb-stat">
        <div className="lbl">Cycle</div>
        <div className="val tnum">{currentRow ? currentRow.c.toString().padStart(5,'0') : '—'}</div>
      </div>
      <div className="tb-stat">
        <div className="lbl">Step</div>
        <div className="val tnum">{currentRow ? `${(currentRow.localStep ?? 0)+1} / ${segment?.n ?? '—'}` : '—'}</div>
      </div>
      <div className="tb-stat">
        <div className="lbl">RF Class</div>
        <div className="val accent" style={{color: classColor(segment?.label)}}>{cls}</div>
      </div>
      <div className="tb-stat">
        <div className="lbl">RF Conf</div>
        <div className="val">{currentRow ? `${currentRow.cf}%` : '—'}</div>
      </div>
      <div className="tb-stat">
        <div className="lbl">IMM Bank</div>
        <div className="val warn">B{currentRow ? currentRow.ii : '—'}</div>
      </div>
      <div className="tb-stat" style={{borderRight: 0}}>
        <div className="lbl">Render</div>
        <div className="val tnum">{fps} fps</div>
      </div>
    </div>
  );
}

// ───────────────────────────── Right side panel ─────────────────────────────

function RightPanel({ currentRow, segment, modeProbHistory, errHistory, errPercentile }) {
  const speed = currentRow ? Math.hypot(...currentRow.v) : 0;
  const err = currentRow ? Math.hypot(currentRow.g[0]-currentRow.e[0], currentRow.g[1]-currentRow.e[1], currentRow.g[2]-currentRow.e[2]) : 0;
  const prevErr = errHistory.length >= 2 ? errHistory[errHistory.length - 2] : err;
  const errDelta = err - prevErr;
  const mae = errHistory.length ? errHistory.reduce((s,x)=>s+x,0) / errHistory.length : 0;
  const rmse = errHistory.length ? Math.sqrt(errHistory.reduce((s,x)=>s+x*x,0) / errHistory.length) : 0;

  const probs = currentRow ? currentRow.pr : [0,0,0];
  const probTotal = probs[0] + probs[1] + probs[2] || 1;
  const probNorm = probs.map(p => p / probTotal);

  const errMax = Math.max(errPercentile || 1, ...errHistory, 1e-6);
  const sparkW = 280, sparkH = 50;
  const sparkPath = useMemo(() => {
    if (errHistory.length < 2) return '';
    const step = sparkW / (errHistory.length - 1);
    return errHistory.map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (sparkH - 2 - (Math.min(v, errMax) / errMax) * (sparkH - 4)).toFixed(1);
      return `${i ? 'L' : 'M'} ${x} ${y}`;
    }).join(' ');
  }, [errHistory, errMax]);

  return (
    <div className="right">
      {/* Coordinates */}
      <div className="section">
        <div className="sttl"><span>Position</span><span className="tag">XYZ · units</span></div>
        <div className="kv-grid">
          <div className="k">GT</div>
          <div className="v accent"><span className="ax">x</span>{fmt(currentRow?.g[0])} <span className="ax">y</span>{fmt(currentRow?.g[1])} <span className="ax">z</span>{fmt(currentRow?.g[2])}</div>
          <div className="k">EST</div>
          <div className="v"><span className="ax">x</span>{fmt(currentRow?.e[0])} <span className="ax">y</span>{fmt(currentRow?.e[1])} <span className="ax">z</span>{fmt(currentRow?.e[2])}</div>
          <div className="k">PRED+1</div>
          <div className="v warn"><span className="ax">x</span>{fmt(currentRow?.p[0])} <span className="ax">y</span>{fmt(currentRow?.p[1])} <span className="ax">z</span>{fmt(currentRow?.p[2])}</div>
          <div className="k">‖VEL‖</div>
          <div className="v"><span className="ax">|</span>{fmt(speed, 2)}<span className="ax"> u/s</span></div>
        </div>
      </div>

      {/* Error gauge */}
      <div className="section">
        <div className="sttl"><span>Tracking Error</span><span className="tag">‖GT − EST‖</span></div>
        <div className="err-row">
          <div className="big">{fmt(err, 2)}</div>
          <div className="unit">u · L₂</div>
          <div className={`delta ${errDelta >= 0 ? 'up' : 'dn'}`}>
            {errDelta >= 0 ? '▲' : '▼'} {fmt(Math.abs(errDelta), 2)}
          </div>
        </div>
        <svg viewBox={`0 0 ${sparkW} ${sparkH}`} className="err-spark" preserveAspectRatio="none">
          <defs>
            <linearGradient id="errg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6868" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#ff6868" stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          {/* p95 line */}
          <line x1="0" x2={sparkW} y1={sparkH - (errPercentile/errMax)*sparkH} y2={sparkH - (errPercentile/errMax)*sparkH}
                stroke="rgba(255,182,99,0.4)" strokeDasharray="3 3" strokeWidth="1" />
          {sparkPath && (
            <>
              <path d={`${sparkPath} L ${sparkW} ${sparkH} L 0 ${sparkH} Z`} fill="url(#errg)" />
              <path d={sparkPath} stroke="#ff8888" strokeWidth="1.4" fill="none" />
            </>
          )}
        </svg>
        <div className="err-stats">
          <div className="err-stat"><div className="l">MAE</div><div className="v">{fmt(mae, 3)}</div></div>
          <div className="err-stat"><div className="l">RMSE</div><div className="v">{fmt(rmse, 3)}</div></div>
        </div>
      </div>

      {/* IMM banks */}
      <div className="section">
        <div className="sttl"><span>IMM Bank</span><span className="tag">5 banks</span></div>
        <div className="bank-row">
          {[0,1,2,3,4].map(i => (
            <div key={i} className={`bank-dot ${currentRow && currentRow.ii === i ? 'active' : ''}`}>
              B{i}
            </div>
          ))}
        </div>
      </div>

      {/* Mode probabilities */}
      <div className="section">
        <div className="sttl"><span>Mode Probability</span><span className="tag">stacked · last {modeProbHistory.length}</span></div>
        <ModeProbArea history={modeProbHistory} />
        <div className="modeprob-legend">
          <div className="it"><span className="sw" style={{background:'#6df2ff'}}/>CTRA<span className="v tnum">{(probNorm[0]*100).toFixed(0)}%</span></div>
          <div className="it"><span className="sw" style={{background:'#ffb663'}}/>Singer<span className="v tnum">{(probNorm[1]*100).toFixed(0)}%</span></div>
          <div className="it"><span className="sw" style={{background:'#b58cff'}}/>Bike<span className="v tnum">{(probNorm[2]*100).toFixed(0)}%</span></div>
        </div>
      </div>

      {/* RF Confidence */}
      <div className="section">
        <div className="sttl"><span>RF Confidence</span><span className="tag">0–100</span></div>
        <div className="conf-bar">
          <div className="conf-fill" style={{width: `${currentRow?.cf || 0}%`}} />
          <div className="lbl">{currentRow?.cf || 0}%</div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Stage (canvas + overlays) ─────────────────────────────

// Lock state from RF confidence
function lockStateFromRow(row, override) {
  if (override && override !== 'auto') return override;
  if (!row) return 'tracking';
  const cf = row.cf || 0;
  if (cf >= 80) return 'firing';
  if (cf >= 50) return 'locked';
  return 'tracking';
}

function Stage({ data, segIdx, currentRow, frame, stepIdx, paused, tweaks, fpsRef, follow, subStepRef, onZoomIn, onZoomOut, onZoomReset, onFollowToggle }) {
  const canvasRef = useRef(null);
  const headingSmoothRef = useRef(0);
  const wcSmoothRef = useRef(null);

  const seg = data?.segs[segIdx];
  const block = useMemo(() => {
    if (!data || !seg) return [];
    return data.rows.filter(r => r.s === seg.id);
  }, [data, seg]);

  // World center: follow current GT position, or segment centroid
  const worldCenter = useMemo(() => {
    if (!seg) return [0, 0];
    const [xmn, ymn, , xmx, ymx] = seg.bb;
    return [(xmn + xmx) / 2, (ymn + ymx) / 2];
  }, [seg]);

  // Smooth heading derived from velocity vector — heading 0° = looking along +y
  const headingDeg = useMemo(() => {
    if (!currentRow) return 0;
    const [vx, vy] = currentRow.v;
    if (Math.hypot(vx, vy) < 1e-3) return 0;
    // World yaw: rotate world so velocity vector points "forward" (+y)
    return Math.atan2(vx, vy) * 180 / Math.PI;
  }, [currentRow]);

  // Bank derived from heading rate (turning = banking)
  const bankRef = useRef(0);
  const lastHeadingRef = useRef(headingDeg);
  useEffect(() => {
    const dh = ((headingDeg - lastHeadingRef.current + 540) % 360) - 180;
    const targetBank = Math.max(-30, Math.min(30, dh * 1.5));
    bankRef.current = bankRef.current * 0.85 + targetBank * 0.15;
    lastHeadingRef.current = headingDeg;
  }, [headingDeg]);

  // Pitch — slight forward dip; stable
  const pitchDeg = -8;

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let frameCount = 0, fpsTick = performance.now();

    const lerp = (a, b, t) => a + (b - a) * t;
    const lerpVec = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
    const render = () => {
      try {
      const now = performance.now();
      frameCount++;
      if (now - fpsTick > 500) {
        fpsRef.current = Math.round(frameCount * 1000 / (now - fpsTick));
        frameCount = 0; fpsTick = now;
      }
      // Interpolated "live row" — uses fractional sub-step for smooth motion.
      let liveRow = currentRow;
      if (block.length && subStepRef && subStepRef.current != null) {
        const f = Math.max(0, Math.min(block.length - 1, paused ? stepIdx : subStepRef.current));
        const i0 = Math.floor(f), i1 = Math.min(block.length - 1, i0 + 1);
        const frac = f - i0;
        const r0 = block[i0], r1 = block[i1];
        if (r0 && r1) {
          liveRow = {
            ...r0,
            g: lerpVec(r0.g, r1.g, frac),
            e: lerpVec(r0.e, r1.e, frac),
            p: lerpVec(r0.p, r1.p, frac),
            v: lerpVec(r0.v, r1.v, frac),
            cf: lerp(r0.cf || 0, r1.cf || 0, frac),
          };
        }
      }
      const iw = Math.min(window.innerWidth || 1400, 4000);
      const ih = Math.min(window.innerHeight || 900, 3000);
      const w = iw - 180 - 240;
      const h = ih - 42 - 60;
      const rect = { width: Math.max(200, Math.min(3000, w)), height: Math.max(200, Math.min(2000, h)) };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const tW = Math.round(rect.width * dpr);
      const tH = Math.round(rect.height * dpr);
      if (canvas.width !== tW) canvas.width = tW;
      if (canvas.height !== tH) canvas.height = tH;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const cx = rect.width / 2;
      const cy = rect.height / 2;

      // ── Ground (top-down, fills entire frame)
      drawGround(ctx, rect.width, rect.height);

      if (!seg || !block.length) return;

      // ── 3D camera: NO follow-yaw. Static azimuth/elevation gives the
      // "trajectory inside a 3D box" feel.
      const [xmn, ymn, zmn, xmx, ymx, zmx] = seg.bb;
      // Pad z range so it's never zero
      const zPad = Math.max(1, (zmx - zmn) * 0.1);
      const z0 = zmn - zPad, z1 = zmx + zPad * 2;
      const xSpan = Math.max(1, xmx - xmn);
      const ySpan = Math.max(1, ymx - ymn);
      const zSpan = Math.max(1, z1 - z0);

      // Camera looks at center of bbox by default; if "follow" is on, track the live object
      const cxBox = (xmn + xmx) / 2;
      const cyBox = (ymn + ymx) / 2;
      const czBox = (z0 + z1) / 2;
      const followingObj = follow && liveRow;
      const tcx = followingObj ? liveRow.g[0] : cxBox;
      const tcy = followingObj ? liveRow.g[1] : cyBox;
      const tcz = followingObj ? liveRow.g[2] : czBox;
      // Smooth follow — avoids jitter
      if (!wcSmoothRef.current) wcSmoothRef.current = [tcx, tcy, tcz];
      // Snap when not following (instant) so toggling off recenters cleanly
      if (!followingObj) {
        wcSmoothRef.current[0] = tcx;
        wcSmoothRef.current[1] = tcy;
        wcSmoothRef.current[2] = tcz;
      } else {
        wcSmoothRef.current[0] += (tcx - wcSmoothRef.current[0]) * 0.18;
        wcSmoothRef.current[1] += (tcy - wcSmoothRef.current[1]) * 0.18;
        wcSmoothRef.current[2] += (tcz - wcSmoothRef.current[2]) * 0.18;
      }
      const cxw = wcSmoothRef.current[0];
      const cyw = wcSmoothRef.current[1];
      const czw = wcSmoothRef.current[2];

      // Scale: pick so bbox fits comfortably on screen at this fov
      const span = Math.max(xSpan, ySpan, zSpan);
      const targetSpan = Math.min(rect.width, rect.height) * 0.55;
      const scale = Math.max(0.00005, Math.min(80, targetSpan / span)) * (tweaks.fov / 900);

      // Camera angles — slight rotation + tilt to show all three axes
      const azimuth = -0.55;
      const elevation = 0.55;

      const project = make3DProjector({
        cx, cy,
        worldCx: cxw, worldCy: cyw, worldCz: czw,
        scale, azimuth, elevation,
      });

      // 3D bbox + floor grid (the "corner of a box" look)
      const bbox3 = [xmn, ymn, z0, xmx, ymx, z1];
      if (tweaks.showGrid) draw3DFloorGrid(ctx, project, bbox3, 8);
      draw3DBox(ctx, project, bbox3);

      // ── Full segment trajectory: thin dotted line over the WHOLE segment
      const idx = Math.min(stepIdx, block.length - 1);
      {
        const allPts = block
          .map(r => project(r.g[0], r.g[1], r.g[2]))
          .filter(p => isFinite(p[0]));
        if (allPts.length >= 2) {
          ctx.save();
          ctx.strokeStyle = 'rgba(160, 220, 240, 0.30)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 5]);
          ctx.beginPath();
          ctx.moveTo(allPts[0][0], allPts[0][1]);
          for (let i = 1; i < allPts.length; i++) ctx.lineTo(allPts[i][0], allPts[i][1]);
          ctx.stroke();
          ctx.restore();
        }
      }

      // ── Travelled trail (behind the object) — solid orange + glow, in 3D
      if (idx > 0) {
        const start = Math.max(0, idx - tweaks.trailLen);
        const pastPts = block.slice(start, idx + 1)
          .map(r => project(r.g[0], r.g[1], r.g[2]))
          .filter(p => isFinite(p[0]));
        if (pastPts.length >= 2) {
          ctx.globalAlpha = 0.20;
          strokeSmoothPath(ctx, pastPts, { color: '#ffae3d', width: 6, shadow: 4 });
          ctx.globalAlpha = 0.95;
          strokeSmoothPath(ctx, pastPts, { color: '#ffae3d', width: 2.4, shadow: 8 });
          ctx.globalAlpha = 1;
        }
      }

      // ── Next-6 prediction dots, rolling forward — RED, in 3D
      const FUTURE_COUNT = 6;
      if (idx < block.length - 1) {
        const futEnd = Math.min(block.length - 1, idx + FUTURE_COUNT);
        ctx.save();
        ctx.shadowColor = '#ff3838';
        for (let i = idx + 1; i <= futEnd; i++) {
          const r = block[i];
          // Future predictions: use predicted x,y but ground-truth z for height
          const [px, py] = project(r.p[0], r.p[1], r.g[2]);
          if (!isFinite(px)) continue;
          const age = (i - idx - 1) / Math.max(1, FUTURE_COUNT - 1);
          const alpha = Math.max(0.25, 1 - age * 0.7);
          const radius = 4.5 - age * 1.8;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#ff3838';
          ctx.shadowBlur = 12 - age * 6;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = alpha * 0.6;
          ctx.strokeStyle = '#ff7878';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, radius + 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Object in 3D + drop line to ground
      let objScreen = null;
      let predScreen = null;
      if (liveRow) {
        // Drop line from object down to z=0 ground inside bbox
        draw3DDropLine(ctx, project, liveRow.g[0], liveRow.g[1], liveRow.g[2],
          'rgba(255, 174, 61, 0.45)');
        const [sx, sy, k] = project(liveRow.g[0], liveRow.g[1], liveRow.g[2]);
        if (isFinite(sx)) {
          objScreen = [sx, sy, k];
          // Tracked object: filled diamond in ORANGE
          ctx.save();
          ctx.fillStyle = '#ffae3d';
          ctx.shadowColor = '#ffae3d'; ctx.shadowBlur = 12;
          const s = 7;
          ctx.beginPath();
          ctx.moveTo(sx, sy - s); ctx.lineTo(sx + s, sy);
          ctx.lineTo(sx, sy + s); ctx.lineTo(sx - s, sy); ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        if (tweaks.showPred) {
          // Prediction also drops a line for clarity
          draw3DDropLine(ctx, project, liveRow.p[0], liveRow.p[1], liveRow.g[2],
            'rgba(255, 56, 56, 0.4)');
          const [psx, psy] = project(liveRow.p[0], liveRow.p[1], liveRow.g[2]);
          if (isFinite(psx)) {
            predScreen = [psx, psy];
            ctx.save();
            const pulse = 0.5 + 0.5 * Math.sin(now / 250);
            ctx.shadowColor = '#ff3838';
            ctx.shadowBlur = 14 + pulse * 6;
            ctx.fillStyle = '#ff3838';
            ctx.beginPath();
            ctx.arc(psx, psy, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 56, 56, 0.7)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(psx, psy, 10 + pulse * 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // ── HUD chrome — minimal: just target box/lock + bottom status line
      if (tweaks.showHUD) {
        if (predScreen) {
          const lock = lockStateFromRow(liveRow, tweaks.lockMode);
          const boxSize = 110;
          const range = liveRow
            ? (Math.hypot(liveRow.g[0] - cxw, liveRow.g[1] - cyw) / 100).toFixed(2) + 'KM'
            : '—';
          drawTargetBox(ctx, predScreen[0], predScreen[1], boxSize, lock, seg.label, range, now);
          drawLockBanner(ctx, predScreen[0], predScreen[1] - boxSize/2 - 60, lock,
            (liveRow?.cf || 0) / 100, now);
        }
        if (predScreen && objScreen) {
          drawPredictionRing(ctx, predScreen[0], predScreen[1], now);
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 56, 56, 0.6)';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(objScreen[0], objScreen[1]);
          ctx.lineTo(predScreen[0], predScreen[1]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        const lock = lockStateFromRow(liveRow, tweaks.lockMode);
        drawHUDFooter(ctx, rect.width, rect.height, {
          left:   `${lock === 'firing' ? 'LOCKED' : lock === 'locked' ? 'LOCKED' : 'TRACKING'}`,
          center: `SEG ${String(seg.id).padStart(2,'0')} \u00B7 ${seg.label.toUpperCase()} \u00B7 STEP ${idx+1}/${block.length}`,
          right:  `RF ${liveRow?.cf ?? 0}%   B${liveRow?.ii ?? 0}`,
        });
      }

      raf = requestAnimationFrame(render);
      } catch (err) {
        console.error('RENDER ERROR:', err.message, err.stack);
        raf = requestAnimationFrame(render);
      }
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [seg, block, currentRow, frame, tweaks, worldCenter, follow, headingDeg]);

  return (
    <div className="stage" onContextMenu={(e)=>e.preventDefault()}>
      <canvas ref={canvasRef} className="stage-canvas" />
      <div className="zoom-controls" role="toolbar" aria-label="Zoom">
        <button className="zoom-btn" onClick={onZoomIn} title="Zoom in (+)">+</button>
        <div className="zoom-readout tnum" title="Sensor FOV">{Math.round(tweaks.fov)}</div>
        <button className="zoom-btn" onClick={onZoomOut} title="Zoom out (−)">−</button>
        <button className="zoom-btn small" onClick={onZoomReset} title="Reset zoom (0)">⟳</button>
        <button
          className={`zoom-btn small ${follow ? 'on' : ''}`}
          onClick={onFollowToggle}
          title={follow ? 'Following target — click to release (F)' : 'Click to follow target (F)'}>
          {follow ? '◉' : '○'}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────── Bottom transport ─────────────────────────────

function Bottom({ data, segIdx, onSelect, currentRow, segment, paused, onPause, onPrev, onNext, onReset, speed, onSpeed, segmentProgress }) {
  if (!data) return <div className="bottom" />;
  const total = data.segs.reduce((s, x) => s + x.n, 0);
  const widths = data.segs.map(s => Math.max(0.04, s.n / total));
  return (
    <div className="bottom">
      <div className="transport">
        <button className="tbtn" onClick={onPrev} title="Previous segment (,)"><UI.Prev /></button>
        <button className="tbtn primary" onClick={onPause}>{paused ? <UI.Play/> : <UI.Pause/>}</button>
        <button className="tbtn" onClick={onNext} title="Next segment (.)"><UI.Next /></button>
        <button className="tbtn" onClick={onReset} title="Reset (R)"><UI.Reset /></button>
        <div className="speed-stepper">
          <button onClick={() => onSpeed(speed / 1.5)}>−</button>
          <div className="val">{speed >= 1 ? speed.toFixed(1) : speed.toFixed(2)}×</div>
          <button onClick={() => onSpeed(speed * 1.5)}>+</button>
        </div>
      </div>

      <div className="timeline-wrap">
        <div className="timeline">
          {data.segs.map((s, i) => {
            const color = classColor(s.label);
            const prog = i === segIdx ? segmentProgress : (i < segIdx ? 1 : 0);
            return (
              <div key={s.id}
                   className={`tl-seg ${i === segIdx ? 'active' : ''}`}
                   onClick={() => onSelect(i)}
                   style={{ flex: widths[i], borderLeft: `3px solid ${color}33` }}
                   title={s.label}>
                <div className="num">SEG {String(s.id).padStart(2,'0')}</div>
                <div className="lab" style={{color: i === segIdx ? color : undefined}}>{s.label}</div>
                <div className="progress" style={{width: `${prog*100}%`, background: color}} />
                {i === segIdx && (
                  <div className="tl-playhead" style={{left: `${prog * 100}%`, background: color, boxShadow: `0 0 8px ${color}`}} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="transport-right">
        <div className="coord-mini">
          <div><div className="k">GT·X</div><div className="v">{fmt(currentRow?.g[0])}</div></div>
          <div><div className="k">GT·Y</div><div className="v">{fmt(currentRow?.g[1])}</div></div>
          <div><div className="k">GT·Z</div><div className="v">{fmt(currentRow?.g[2])}</div></div>
        </div>
        <div style={{display:'flex', gap: 4}}>
          <span className="kbd">␣</span>
          <span className="kbd">,</span>
          <span className="kbd">.</span>
          <span className="kbd">F</span>
          <span className="kbd">T</span>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── App ─────────────────────────────

function App() {
  const [data, setData] = useState(null);
  const [segIdx, setSegIdx] = useState(3); // start on F1 Monaco for visual interest
  const [stepIdx, setStepIdx] = useState(0); // step within current segment
  const [paused, setPaused] = useState(false);
  const [follow, setFollow] = useState(true);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const fpsRef = useRef(0);
  const [, force] = useState(0);

  // load data
  useEffect(() => {
    const dataUrl = (window.__resources && window.__resources.rasoData) || 'data/raso.json';
    fetch(dataUrl).then(r => r.json()).then(d => {
      setData(d);
      setStepIdx(0);
    });
  }, []);

  const segment = data?.segs[segIdx];
  const block = useMemo(() => {
    if (!data || !segment) return [];
    return data.rows.filter(r => r.s === segment.id);
  }, [data, segment]);

  const currentRow = block.length ? { ...block[Math.min(stepIdx, block.length - 1)], localStep: Math.min(stepIdx, block.length - 1) } : null;
  const segProgress = block.length ? Math.min(stepIdx, block.length - 1) / Math.max(1, block.length - 1) : 0;

  // Playback loop — rAF-driven continuous float clock; integer stepIdx is
  // derived for panel readouts, but Stage reads `subStepRef` for smooth motion.
  const subStepRef = useRef(0);
  useEffect(() => { subStepRef.current = stepIdx; }, [segIdx]); // reset on seg change
  useEffect(() => {
    if (paused || !block.length) return;
    // Each data step plays for ~150ms at speed=1× — slow enough to read each
    // sample, but the rAF interpolator keeps motion buttery between them.
    const stepsPerSec = (1000 / 150) * t.speed;
    let raf = 0, last = performance.now();
    const tick = (now) => {
      const dt = Math.min(80, now - last); last = now;
      subStepRef.current += (dt / 1000) * stepsPerSec;
      if (subStepRef.current >= block.length - 1) {
        subStepRef.current = 0;
        setSegIdx(s => (s + 1) % data.segs.length);
        setStepIdx(0);
      } else {
        const next = Math.floor(subStepRef.current);
        setStepIdx(prev => prev !== next ? next : prev);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, block.length, t.speed, data, segIdx]);

  // (legacy interval removed — replaced by rAF clock above)

  // FPS refresh
  useEffect(() => {
    const id = setInterval(() => force(x => (x + 1) % 1024), 250);
    return () => clearInterval(id);
  }, []);

  // Reset step on segment change
  useEffect(() => { setStepIdx(0); }, [segIdx]);

  // History buffers
  const errHistory = useMemo(() => {
    if (!block.length) return [];
    const start = Math.max(0, stepIdx - 60);
    return block.slice(start, stepIdx + 1).map(r => Math.hypot(r.g[0]-r.e[0], r.g[1]-r.e[1], r.g[2]-r.e[2]));
  }, [block, stepIdx]);
  const errPercentile = useMemo(() => {
    if (!block.length) return 1;
    const all = block.map(r => Math.hypot(r.g[0]-r.e[0], r.g[1]-r.e[1], r.g[2]-r.e[2])).sort((a,b)=>a-b);
    return all[Math.floor(all.length * 0.95)] || 1;
  }, [block]);
  const modeProbHistory = useMemo(() => {
    if (!block.length) return [];
    const start = Math.max(0, stepIdx - 80);
    return block.slice(start, stepIdx + 1).map(r => r.pr);
  }, [block, stepIdx]);

  // Per-segment sparklines (full segment, downsampled to ~30 pts) for left list
  const segmentSparks = useMemo(() => {
    if (!data) return [];
    return data.segs.map(s => {
      const sb = data.rows.filter(r => r.s === s.id);
      if (!sb.length) return [];
      const target = 30;
      const stride = Math.max(1, Math.floor(sb.length / target));
      const errs = [];
      for (let i = 0; i < sb.length; i += stride) {
        const r = sb[i];
        errs.push(Math.hypot(r.g[0]-r.e[0], r.g[1]-r.e[1], r.g[2]-r.e[2]));
      }
      return errs;
    });
  }, [data]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); setPaused(p => !p); }
      else if (e.code === 'KeyF') setFollow(f => !f);
      else if (e.code === 'KeyR') setStepIdx(0);
      else if (e.code === 'KeyP') setTweak('showPred', !t.showPred);
      else if (e.code === 'KeyH') setTweak('showHUD', !t.showHUD);
      else if (e.code === 'Comma') setSegIdx(s => (s - 1 + data.segs.length) % data.segs.length);
      else if (e.code === 'Period') setSegIdx(s => (s + 1) % data.segs.length);
      else if (e.code === 'Equal' || e.code === 'NumpadAdd') setTweak('speed', Math.min(20, t.speed * 1.5));
      else if (e.code === 'Minus' || e.code === 'NumpadSubtract') setTweak('speed', Math.max(0.1, t.speed / 1.5));
      else if (e.code === 'BracketRight' || e.code === 'KeyZ') setTweak('fov', Math.min(6000, t.fov * 1.4));
      else if (e.code === 'BracketLeft' || e.code === 'KeyX') setTweak('fov', Math.max(150, t.fov / 1.4));
      else if (e.code === 'Digit0' || e.code === 'Numpad0') setTweak('fov', 900);
      else {
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= (data?.segs.length || 0)) {
          setSegIdx(num - 1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [data, t.speed, t.showPred]);

  if (!data) {
    return (
      <div className="app">
        <div className="loading"><div className="ld">
          <div className="lspin" />
          <div className="lt">Loading IMM trace…</div>
        </div></div>
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar paused={paused} currentRow={currentRow} segment={segment} fps={fpsRef.current} />
      <SegmentList segments={data.segs} activeIdx={segIdx} onSelect={setSegIdx} segmentSparks={segmentSparks} />
      <Stage data={data} segIdx={segIdx} currentRow={currentRow} stepIdx={stepIdx} frame={stepIdx} paused={paused}
             tweaks={t} fpsRef={fpsRef} follow={follow} subStepRef={subStepRef}
             onZoomIn={() => setTweak('fov', Math.min(6000, t.fov * 1.4))}
             onZoomOut={() => setTweak('fov', Math.max(150, t.fov / 1.4))}
             onZoomReset={() => setTweak('fov', 900)}
             onFollowToggle={() => { const v = !follow; setFollow(v); setTweak('follow', v); }} />
      <RightPanel currentRow={currentRow} segment={segment} modeProbHistory={modeProbHistory} errHistory={errHistory} errPercentile={errPercentile} />
      <Bottom data={data} segIdx={segIdx} onSelect={setSegIdx} currentRow={currentRow} segment={segment}
              paused={paused} onPause={() => setPaused(p => !p)}
              onPrev={() => setSegIdx(s => (s - 1 + data.segs.length) % data.segs.length)}
              onNext={() => setSegIdx(s => (s + 1) % data.segs.length)}
              onReset={() => setStepIdx(0)}
              speed={t.speed} onSpeed={(v) => setTweak('speed', Math.max(0.1, Math.min(20, v)))}
              segmentProgress={segProgress} />

      <TweaksPanel>
        <TweakSection label="Sensor view" />
        <TweakSlider label="Sensor zoom" value={t.fov} min={150} max={6000} step={20} unit="" onChange={v => setTweak('fov', v)} />
        <TweakSlider label="Pod altitude (read-out)" value={t.altitude} min={500} max={5000} step={50} unit="" onChange={v => setTweak('altitude', v)} />
        <TweakToggle label="Track target (slew)" value={t.follow} onChange={v => { setTweak('follow', v); setFollow(v); }} />
        <TweakSection label="Scene" />
        <TweakToggle label="Ground features" value={t.showTerrain} onChange={v => setTweak('showTerrain', v)} />
        <TweakToggle label="Reference grid" value={t.showGrid} onChange={v => setTweak('showGrid', v)} />
        <TweakToggle label="Display vignette" value={t.showCanopy} onChange={v => setTweak('showCanopy', v)} />
        <TweakSection label="HUD" />
        <TweakToggle label="Show HUD" value={t.showHUD} onChange={v => setTweak('showHUD', v)} />
        <TweakRadio label="Lock state" value={t.lockMode} options={['auto','tracking','locked','firing']} onChange={v => setTweak('lockMode', v)} />
        <TweakSlider label="Trail length" value={t.trailLen} min={20} max={2000} step={20} unit="" onChange={v => setTweak('trailLen', v)} />
        <TweakToggle label="Prediction ring" value={t.showPred} onChange={v => setTweak('showPred', v)} />
        <TweakSection label="Playback" />
        <TweakSlider label="Speed" value={t.speed} min={0.1} max={20} step={0.1} unit="×" onChange={v => setTweak('speed', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
