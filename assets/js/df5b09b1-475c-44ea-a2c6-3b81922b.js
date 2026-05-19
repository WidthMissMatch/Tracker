// scene.jsx — F-35 cockpit HUD scene
// First-person view from a high-altitude jet looking down-forward at the ground
// where a tracked object moves. Sky + procedural mountains/clouds + ground plane
// with the target rendered far below; HUD chrome (pitch ladder, bank, FPM, target
// box, prediction circle, lock state) drawn on top in green.

// ─────────────────────────────  Sky + horizon  ─────────────────────────────

// Draw atmospheric sky gradient (high altitude — deep blue at top, lighter at horizon)
function drawSky(ctx, w, h, horizonY, pitch = 0, bank = 0) {
  ctx.save();
  // The "sky" extends from top of screen to horizonY; below that is ground.
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
  grad.addColorStop(0,    '#070d1c');
  grad.addColorStop(0.45, '#162542');
  grad.addColorStop(0.85, '#3a5882');
  grad.addColorStop(1,    '#88a4c4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, horizonY + 4);
  // Subtle scan-band glow at horizon line
  const hg = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + 8);
  hg.addColorStop(0, 'rgba(180, 210, 240, 0)');
  hg.addColorStop(1, 'rgba(220, 235, 255, 0.18)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, horizonY - 30, w, 38);
  ctx.restore();
}

// Procedural mountain silhouette ridge along the horizon — three depths for parallax.
// `panX` shifts mountains horizontally (proxies plane heading rotation)
function drawMountains(ctx, w, h, horizonY, panX = 0) {
  ctx.save();
  // Far range — pale, hazy
  drawRange(ctx, w, horizonY,  -panX * 0.10, 24, 'rgba(120, 150, 185, 0.55)', 0.013);
  // Mid range
  drawRange(ctx, w, horizonY,  -panX * 0.22, 38, 'rgba(75, 100, 138, 0.78)', 0.020);
  // Near range — darker, sharper
  drawRange(ctx, w, horizonY,  -panX * 0.40, 56, 'rgba(35, 55, 88, 0.95)',  0.030);
  ctx.restore();
}

function drawRange(ctx, w, horizonY, offset, amplitude, fill, freq) {
  // multi-octave ridge using cheap sin combos
  ctx.beginPath();
  ctx.moveTo(0, horizonY + 2);
  const step = 6;
  for (let x = 0; x <= w + step; x += step) {
    const u = (x + offset);
    const y = horizonY
      - amplitude * (
          Math.sin(u * freq) * 0.55 +
          Math.sin(u * freq * 2.1 + 1.7) * 0.30 +
          Math.sin(u * freq * 5.3 + 0.4) * 0.15
        )
      - amplitude * 0.10;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, horizonY + 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// (Mountains, clouds, sky helpers retained above — unused in nadir mode but
// kept for compatibility.)

// ─────────────────────────────  Ground (cockpit looking down)  ─────────────────────────────
// We use a strong perspective: ground sits below horizonY, receding into vanishing point.
// Project a world (gx, gy) point on the ground into screen using a "flying-camera" model.
//
// camHeight  — how high (in world units) the camera is above ground
// fwd        — forward axis world distance the camera looks along (we slide world so
//              currentObject is straight ahead at distance ~ fwd)
// camYaw     — heading in radians (rotates world around vertical axis)
// pitchDeg   — camera pitch (positive = nose up); shifts horizon up/down
// bankDeg    — roll angle; rotates whole scene around screen center

// Nadir / top-down projector: camera is high above the ground looking straight
// DOWN. World origin is the point directly under the aircraft.
//   - (wx, wy) is the world coordinate on the ground
//   - yaw rotates the world so velocity vector aligns with +y (screen up)
//   - scale = px per world unit (proxy for "1 / altitude * focal_length")
// We add a small "tilt" so the far edges fall off in perspective, giving the
// frame more visual depth without losing the looking-down feel.
function makeNadirProjector({
  cx, cy,           // screen center (px) — directly under aircraft
  worldCx, worldCy, // world coords of point under aircraft
  yaw,              // world heading rotation (radians)
  scale,            // px per world unit at center
  tilt = 0,         // forward tilt in radians (0 = pure nadir)
}) {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const project = (wx, wy /* on ground */) => {
    const dx = wx - worldCx;
    const dy = wy - worldCy;
    // rotate around vertical so +y world = forward (screen up)
    const rx =  dx * cosY + dy * sinY;
    const ry = -dx * sinY + dy * cosY;
    // tilt: looking slightly forward shrinks far points in y and adds perspective
    const denom = Math.max(0.2, cosT - (ry * sinT) * 0.0008);
    const sx = cx + (rx * scale) / denom;
    const sy = cy - (ry * scale * cosT) / denom;
    return [sx, sy, 1 / denom];
  };
  project.cx = cx;
  project.cy = cy;
  project.scale = scale;
  return project;
}

// Backwards-compat wrapper: keep old name available
function makeCockpitProjector(opts) { return makeNadirProjector(opts); }

// 3D oblique/isometric-style projector. World axes:
//   +x → east, +y → north, +z → up (altitude)
// Camera angle is fixed (no yaw following) so the user can see motion as a
// trajectory inside a 3D box. Returns [sx, sy, depth].
function make3DProjector({
  cx, cy,             // screen center (px) — should be the screen "origin" of the 3D box
  worldCx, worldCy, worldCz = 0,  // world point that maps to (cx, cy)
  scale,              // px per world unit
  azimuth = -0.6,     // camera rotation around z-axis (radians) — turning view
  elevation = 0.55,   // camera tilt from horizontal (radians) — looking down
}) {
  const cosA = Math.cos(azimuth), sinA = Math.sin(azimuth);
  const cosE = Math.cos(elevation), sinE = Math.sin(elevation);
  const project = (wx, wy, wz = 0) => {
    const dx = wx - worldCx;
    const dy = wy - worldCy;
    const dz = (wz - worldCz);
    // Rotate around z (azimuth)
    const rx = dx * cosA - dy * sinA;
    const ry = dx * sinA + dy * cosA;
    // Tilt around x (elevation): y goes into depth, z goes up the screen
    const sx = cx + rx * scale;
    const sy = cy - (ry * sinE + dz * cosE) * scale;
    const depth = ry * cosE - dz * sinE; // positive = farther
    return [sx, sy, depth];
  };
  project.cx = cx;
  project.cy = cy;
  project.scale = scale;
  project.azimuth = azimuth;
  project.elevation = elevation;
  return project;
}

// Draw a 3D bounding-box wireframe (the "corner of a box") with axis labels.
// `bbox` is [xmin, ymin, zmin, xmax, ymax, zmax] in world units.
function draw3DBox(ctx, project, bbox) {
  const [x0, y0, z0, x1, y1, z1] = bbox;
  // 8 corners of the box
  const C = [
    [x0,y0,z0], [x1,y0,z0], [x1,y1,z0], [x0,y1,z0], // bottom 0..3
    [x0,y0,z1], [x1,y0,z1], [x1,y1,z1], [x0,y1,z1], // top    4..7
  ];
  const P = C.map(([x,y,z]) => project(x,y,z));

  // Edges, marked as "back" (drawn faded) or "front" (drawn solid corner)
  // We highlight the three edges meeting at the (x0,y0,z0) corner = "origin corner"
  const edges = [
    // bottom face
    [0,1,'back'], [1,2,'back'], [2,3,'back'], [3,0,'origin-y'],
    // top face
    [4,5,'back'], [5,6,'back'], [6,7,'back'], [7,4,'back'],
    // verticals
    [0,4,'origin-z'], [1,5,'back'], [2,6,'back'], [3,7,'back'],
    // mark x edge on bottom
  ];
  // The three "corner of a box" axes: from origin corner (idx 0):
  //   along +x → idx 1 (origin-x)
  //   along +y → idx 3 (origin-y)
  //   along +z → idx 4 (origin-z)
  // Override the [0,1] edge to origin-x:
  edges[0] = [0,1,'origin-x'];

  ctx.save();
  for (const [a,b,kind] of edges) {
    const pa = P[a], pb = P[b];
    if (kind === 'back') {
      ctx.strokeStyle = 'rgba(109, 242, 255, 0.10)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
    } else if (kind === 'origin-x') {
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.85)'; // X red
      ctx.lineWidth = 1.6;
      ctx.setLineDash([]);
    } else if (kind === 'origin-y') {
      ctx.strokeStyle = 'rgba(120, 230, 120, 0.85)'; // Y green
      ctx.lineWidth = 1.6;
      ctx.setLineDash([]);
    } else if (kind === 'origin-z') {
      ctx.strokeStyle = 'rgba(120, 170, 255, 0.9)'; // Z blue
      ctx.lineWidth = 1.6;
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Axis labels at the far end of each highlighted edge
  ctx.font = '600 11px ui-monospace, "JetBrains Mono", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const labels = [
    { p: P[1], txt: 'X', color: 'rgba(255, 130, 130, 1)' },
    { p: P[3], txt: 'Y', color: 'rgba(140, 240, 140, 1)' },
    { p: P[4], txt: 'Z', color: 'rgba(150, 190, 255, 1)' },
  ];
  for (const L of labels) {
    ctx.fillStyle = 'rgba(11, 15, 23, 0.85)';
    ctx.fillRect(L.p[0]-9, L.p[1]-8, 18, 16);
    ctx.fillStyle = L.color;
    ctx.fillText(L.txt, L.p[0], L.p[1]);
  }

  // Origin tick at the corner
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath(); ctx.arc(P[0][0], P[0][1], 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Floor grid (z=0) inside the bbox extents — a thin grid that recedes in 3D.
function draw3DFloorGrid(ctx, project, bbox, divisions = 8) {
  const [x0, y0, z0, x1, y1] = bbox;
  ctx.save();
  ctx.strokeStyle = 'rgba(109, 242, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= divisions; i++) {
    const tx = x0 + (x1 - x0) * (i / divisions);
    const ty = y0 + (y1 - y0) * (i / divisions);
    // line along y at fixed x
    let p1 = project(tx, y0, z0), p2 = project(tx, y1, z0);
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    // line along x at fixed y
    p1 = project(x0, ty, z0); p2 = project(x1, ty, z0);
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
  }
  ctx.restore();
}

// Vertical "drop line" from a 3D point down to its z=0 ground projection,
// with a small ground footprint marker. Sells the 3D space.
function draw3DDropLine(ctx, project, wx, wy, wz, color = 'rgba(255, 174, 61, 0.5)') {
  const top = project(wx, wy, wz);
  const ground = project(wx, wy, 0);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(ground[0], ground[1]); ctx.stroke();
  ctx.setLineDash([]);
  // ground footprint cross
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(ground[0]-4, ground[1]); ctx.lineTo(ground[0]+4, ground[1]);
  ctx.moveTo(ground[0], ground[1]-2); ctx.lineTo(ground[0], ground[1]+2);
  ctx.stroke();
  ctx.restore();
}

// Top-down ground fill — dark, slightly textured, fills the whole screen.
// Acts as the canvas under the HUD/grid/target.
function drawGround(ctx, w, h) {
  ctx.save();
  // Base dark green
  ctx.fillStyle = '#0a1612';
  ctx.fillRect(0, 0, w, h);
  // Radial vignette — center is slightly lifted (under-aircraft pool of light)
  const grad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h) * 0.05, w/2, h/2, Math.max(w,h) * 0.7);
  grad.addColorStop(0,    'rgba(50, 80, 60, 0.55)');
  grad.addColorStop(0.45, 'rgba(20, 35, 25, 0.35)');
  grad.addColorStop(1,    'rgba(0, 4, 0, 0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Top-down concentric grid + range rings — gives the "looking straight down
// from a tracking pod" feel. Grid is dense near center, sparser at edges.
function drawNadirGrid(ctx, project, w, h, gridSpacing = 200, gridExtent = 6000) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(80, 130, 105, 0.28)';
  // Vertical lines (constant world-x)
  for (let x = -gridExtent; x <= gridExtent; x += gridSpacing) {
    ctx.beginPath();
    let started = false;
    for (let y = -gridExtent; y <= gridExtent; y += gridSpacing * 0.5) {
      const [sx, sy] = project(x, y);
      if (!isFinite(sx)) continue;
      if (!started) { ctx.moveTo(sx, sy); started = true; }
      else ctx.lineTo(sx, sy);
    }
    if (started) ctx.stroke();
  }
  // Horizontal lines (constant world-y)
  for (let y = -gridExtent; y <= gridExtent; y += gridSpacing) {
    ctx.beginPath();
    let started = false;
    for (let x = -gridExtent; x <= gridExtent; x += gridSpacing * 0.5) {
      const [sx, sy] = project(x, y);
      if (!isFinite(sx)) continue;
      if (!started) { ctx.moveTo(sx, sy); started = true; }
      else ctx.lineTo(sx, sy);
    }
    if (started) ctx.stroke();
  }
  ctx.restore();
}

// (drawGroundGrid alias removed — call drawNadirGrid directly.)

// Procedural ground features for nadir view: irregular field patches and a
// snaking road/river. All drawn in world coords through the projector so they
// scroll/rotate as the aircraft moves.
function drawGroundFeatures(ctx, project, time) {
  ctx.save();
  // Field/forest patches arranged around origin
  const patches = [
    { x: -2200, y: -1800, w: 1400, h: 1100, c: 'rgba(60, 78, 50, 0.55)' },
    { x:  -200, y: -2400, w: 1600, h: 900,  c: 'rgba(72, 92, 60, 0.50)' },
    { x:  1500, y:  -300, w: 1800, h: 1300, c: 'rgba(50, 68, 42, 0.60)' },
    { x: -2800, y:   400, w: 1500, h: 1500, c: 'rgba(78, 98, 64, 0.45)' },
    { x:  -600, y:  1900, w: 1900, h: 1400, c: 'rgba(55, 72, 46, 0.58)' },
    { x:  1800, y:  2400, w: 1200, h: 1200, c: 'rgba(70, 88, 58, 0.50)' },
  ];
  for (const p of patches) {
    const corners = [
      project(p.x,         p.y),
      project(p.x + p.w,   p.y),
      project(p.x + p.w,   p.y + p.h),
      project(p.x,         p.y + p.h),
    ];
    if (corners.some(c => !isFinite(c[0]))) continue;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i][0], corners[i][1]);
    ctx.closePath();
    ctx.fill();
  }
  // Snaking river — drawn as a polyline through world coords
  ctx.strokeStyle = 'rgba(70, 110, 145, 0.60)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let started = false;
  for (let y = -5000; y <= 5000; y += 80) {
    const x = Math.sin(y * 0.0008) * 700 + Math.sin(y * 0.0021) * 250 - 600;
    const [sx, sy] = project(x, y);
    if (!isFinite(sx)) continue;
    if (!started) { ctx.moveTo(sx, sy); started = true; }
    else ctx.lineTo(sx, sy);
  }
  if (started) ctx.stroke();
  // A road
  ctx.strokeStyle = 'rgba(120, 110, 90, 0.50)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  started = false;
  for (let x = -5000; x <= 5000; x += 80) {
    const y = Math.sin(x * 0.0006) * 500 + Math.cos(x * 0.0019) * 220 + 1800;
    const [sx, sy] = project(x, y);
    if (!isFinite(sx)) continue;
    if (!started) { ctx.moveTo(sx, sy); started = true; }
    else ctx.lineTo(sx, sy);
  }
  if (started) ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─────────────────────────────  Nadir HUD overlays  ─────────────────────────────

// Concentric range rings centered on the aircraft (screen center) with km labels.
function drawRangeRings(ctx, cx, cy, scale, ranges = [500, 1500, 3000, 5000]) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.font = '9px JetBrains Mono, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const r of ranges) {
    const px = r * scale;
    if (px < 30) continue;
    ctx.strokeStyle = 'rgba(61, 255, 122, 0.18)';
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, px, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // label on the right side
    ctx.fillStyle = 'rgba(61, 255, 122, 0.55)';
    ctx.shadowColor = HUD_GREEN; ctx.shadowBlur = 3;
    ctx.fillText(`${(r/1000).toFixed(r >= 1000 ? 1 : 2)}KM`, cx + px + 4, cy - 1);
    ctx.shadowBlur = 0;
  }
  // crosshair lines through center (heading reference)
  ctx.strokeStyle = 'rgba(61, 255, 122, 0.30)';
  ctx.setLineDash([4, 6]);
  const maxR = Math.max(...ranges) * scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
  ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// Aircraft icon at screen center (top-down silhouette of an F-35-style fighter)
function drawAircraftIcon(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = HUD_GREEN;
  ctx.shadowColor = HUD_GREEN; ctx.shadowBlur = 8;
  // Fuselage
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(2, -2);
  ctx.lineTo(14, 6);    // wing tip right
  ctx.lineTo(14, 9);
  ctx.lineTo(2, 5);
  ctx.lineTo(2, 12);    // tail
  ctx.lineTo(6, 14);
  ctx.lineTo(6, 16);
  ctx.lineTo(-6, 16);
  ctx.lineTo(-6, 14);
  ctx.lineTo(-2, 12);
  ctx.lineTo(-2, 5);
  ctx.lineTo(-14, 9);
  ctx.lineTo(-14, 6);
  ctx.lineTo(-2, -2);
  ctx.closePath();
  ctx.fill();
  // small outline ring
  ctx.strokeStyle = 'rgba(61, 255, 122, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// Cardinal direction labels around screen center (rotates with yaw)
function drawCardinals(ctx, cx, cy, yaw, radius) {
  ctx.save();
  ctx.font = 'bold 11px JetBrains Mono, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = HUD_GREEN;
  ctx.shadowColor = HUD_GREEN; ctx.shadowBlur = 4;
  // World north is direction yaw=0 in world, after rotation it appears at angle -yaw on screen
  // (because we rotate world by -yaw). Use unit vectors and rotate.
  const cardinals = [['N', 0], ['E', Math.PI/2], ['S', Math.PI], ['W', -Math.PI/2]];
  for (const [label, ang] of cardinals) {
    const screenAng = ang - yaw - Math.PI/2; // -π/2 because screen +y is down
    const x = cx + Math.cos(screenAng) * radius;
    const y = cy + Math.sin(screenAng) * radius;
    ctx.fillText(label, x, y);
  }
  ctx.restore();
}

const HUD_GREEN = '#3dff7a';
const HUD_GREEN_DIM = 'rgba(61, 255, 122, 0.40)';
const HUD_AMBER = '#ffd23d';
const HUD_RED = '#ff5050';

function hudStroke(ctx, color = HUD_GREEN, width = 1.6, glow = 4) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
}
function hudFill(ctx, color = HUD_GREEN, glow = 0) {
  ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
}
function hudText(ctx, txt, x, y, opts = {}) {
  ctx.save();
  ctx.font = (opts.weight || '500') + ' ' + (opts.size || 12) + 'px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = opts.color || HUD_GREEN;
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  if (opts.glow !== false) { ctx.shadowColor = opts.color || HUD_GREEN; ctx.shadowBlur = opts.glow || 6; }
  ctx.fillText(txt, x, y);
  ctx.restore();
}

// Pitch ladder — horizontal lines stacked vertically with degree labels.
// `pitchDeg` is the current camera/aircraft pitch; the ladder is offset so
// the 0° line sits on the horizon.
function drawPitchLadder(ctx, cx, cy, pitchDeg, bankDeg, w, h) {
  ctx.save();
  // Rotate around screen center for bank
  ctx.translate(cx, cy);
  ctx.rotate(-bankDeg * Math.PI / 180);
  // Each 5° = ~36px on screen
  const pxPerDeg = 7.2;
  hudStroke(ctx, HUD_GREEN, 1.3, 4);
  ctx.font = '11px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = HUD_GREEN;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = HUD_GREEN; ctx.shadowBlur = 5;
  for (let p = -30; p <= 30; p += 5) {
    if (p === 0) continue;
    const yOff = (pitchDeg - p) * pxPerDeg; // when pitch increases, lines move down
    if (Math.abs(yOff) > h * 0.45) continue;
    const half = p > 0 ? 56 : 56;
    const dashed = p < 0;
    ctx.setLineDash(dashed ? [5, 4] : []);
    // Left bar
    ctx.beginPath();
    ctx.moveTo(-half - 60, yOff);
    ctx.lineTo(-30, yOff);
    // Tick down toward horizon (positive pitch ticks point down, negative up)
    const tickY = p > 0 ? yOff + 6 : yOff - 6;
    ctx.lineTo(-30, tickY);
    ctx.stroke();
    // Right bar
    ctx.beginPath();
    ctx.moveTo(30, yOff);
    ctx.lineTo(half + 60, yOff);
    ctx.lineTo(30, tickY);
    ctx.stroke();
    // Labels
    ctx.setLineDash([]);
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.abs(p)), -half - 64, yOff);
    ctx.textAlign = 'left';
    ctx.fillText(String(Math.abs(p)), half + 64, yOff);
  }
  // Horizon line itself (0°)
  ctx.setLineDash([]);
  hudStroke(ctx, HUD_GREEN, 1.6, 6);
  ctx.beginPath();
  ctx.moveTo(-w * 0.35, 0); ctx.lineTo(-30, 0);
  ctx.moveTo(30, 0); ctx.lineTo(w * 0.35, 0);
  ctx.stroke();
  ctx.restore();
}

// Bank / roll indicator at top of HUD — arc with tick marks; pointer shows current bank.
function drawBankIndicator(ctx, cx, topY, bankDeg) {
  ctx.save();
  ctx.translate(cx, topY + 130);
  hudStroke(ctx, HUD_GREEN, 1.4, 4);
  // Reference arc (-60 to 60 across top)
  ctx.beginPath();
  ctx.arc(0, 0, 110, Math.PI + Math.PI / 3, Math.PI * 2 - Math.PI / 3);
  ctx.stroke();
  // Tick marks every 10°, longer at 0/30/60
  ctx.font = '10px JetBrains Mono, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = HUD_GREEN;
  ctx.shadowColor = HUD_GREEN; ctx.shadowBlur = 4;
  for (let t = -60; t <= 60; t += 10) {
    const ang = -Math.PI / 2 + (t * Math.PI / 180);
    const isMaj = (t % 30) === 0;
    const r1 = 110, r2 = isMaj ? 100 : 105;
    const x1 = Math.cos(ang) * r1, y1 = Math.sin(ang) * r1;
    const x2 = Math.cos(ang) * r2, y2 = Math.sin(ang) * r2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // Bank pointer (triangle)
  const ang = -Math.PI / 2 + (bankDeg * Math.PI / 180);
  ctx.save();
  ctx.rotate(ang);
  ctx.translate(0, -110);
  ctx.fillStyle = HUD_GREEN;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-6, -10); ctx.lineTo(6, -10); ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// Heading tape across top
function drawHeadingTape(ctx, cx, topY, headingDeg, w) {
  ctx.save();
  const tapeY = topY + 28;
  const tapeW = Math.min(w * 0.60, 520);
  const left = cx - tapeW / 2;
  // Frame
  hudStroke(ctx, HUD_GREEN, 1.2, 3);
  ctx.beginPath();
  ctx.moveTo(left, tapeY); ctx.lineTo(left + tapeW, tapeY);
  ctx.stroke();
  // Ticks every 10° on a 90° window
  const pxPerDeg = tapeW / 90;
  const startDeg = Math.floor((headingDeg - 45) / 5) * 5;
  ctx.font = '10px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = HUD_GREEN;
  ctx.textAlign = 'center';
  ctx.shadowColor = HUD_GREEN; ctx.shadowBlur = 3;
  for (let d = startDeg; d <= startDeg + 95; d += 5) {
    const offset = (d - headingDeg) * pxPerDeg;
    const x = cx + offset;
    if (x < left - 5 || x > left + tapeW + 5) continue;
    const norm = ((d % 360) + 360) % 360;
    const isMaj = norm % 30 === 0;
    const isMid = norm % 10 === 0;
    const tickH = isMaj ? 10 : (isMid ? 6 : 3);
    ctx.beginPath();
    ctx.moveTo(x, tapeY);
    ctx.lineTo(x, tapeY + tickH);
    ctx.stroke();
    if (isMaj) {
      const lab = norm === 0 ? 'N'
                : norm === 90 ? 'E'
                : norm === 180 ? 'S'
                : norm === 270 ? 'W'
                : String(norm).padStart(2, '0');
      ctx.fillText(lab, x, tapeY + 22);
    }
  }
  // Center caret + readout
  ctx.fillStyle = HUD_GREEN;
  ctx.beginPath();
  ctx.moveTo(cx, tapeY - 6); ctx.lineTo(cx - 5, tapeY - 14); ctx.lineTo(cx + 5, tapeY - 14); ctx.closePath();
  ctx.fill();
  // Heading box
  const boxW = 46, boxH = 16;
  hudStroke(ctx, HUD_GREEN, 1.2, 3);
  ctx.strokeRect(cx - boxW/2, tapeY - 32, boxW, boxH);
  ctx.font = 'bold 11px JetBrains Mono, Consolas, monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(((headingDeg % 360) + 360) % 360)).padStart(3, '0'), cx, tapeY - 32 + boxH/2 + 1);
  ctx.restore();
}

// Vertical altitude tape on right side
function drawAltitudeTape(ctx, x, cy, h, alt) {
  ctx.save();
  const tapeH = Math.min(h * 0.45, 360);
  const top = cy - tapeH / 2;
  hudStroke(ctx, HUD_GREEN, 1.2, 3);
  // Outer rect
  ctx.beginPath();
  ctx.moveTo(x, top); ctx.lineTo(x, top + tapeH); ctx.stroke();
  // Ticks: each 100ft = 12px
  const pxPerUnit = 0.6; // 60 units = ~36px
  const baseAlt = Math.round(alt / 100) * 100;
  ctx.font = '10px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = HUD_GREEN;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = HUD_GREEN; ctx.shadowBlur = 3;
  for (let d = -300; d <= 300; d += 50) {
    const v = baseAlt + d;
    const yOff = (alt - v) * pxPerUnit;
    const y = cy + yOff;
    if (y < top || y > top + tapeH) continue;
    const isMaj = v % 100 === 0;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + (isMaj ? 10 : 5), y);
    ctx.stroke();
    if (isMaj) ctx.fillText(String(v), x + 14, y);
  }
  // Center readout box
  hudStroke(ctx, HUD_GREEN, 1.4, 4);
  ctx.beginPath();
  ctx.moveTo(x, cy - 11); ctx.lineTo(x - 7, cy - 11);
  ctx.lineTo(x - 7, cy + 11); ctx.lineTo(x, cy + 11);
  ctx.lineTo(x + 4, cy); ctx.closePath();
  ctx.stroke();
  ctx.font = 'bold 12px JetBrains Mono, Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = HUD_GREEN;
  ctx.fillText(String(Math.round(alt)), x - 2, cy + 1);
  // Label
  ctx.font = '9px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = HUD_GREEN_DIM;
  ctx.textAlign = 'center';
  ctx.fillText('ALT', x + 16, top - 6);
  ctx.restore();
}

// Vertical airspeed tape on left
function drawAirspeedTape(ctx, x, cy, h, kts) {
  ctx.save();
  const tapeH = Math.min(h * 0.45, 360);
  const top = cy - tapeH / 2;
  hudStroke(ctx, HUD_GREEN, 1.2, 3);
  ctx.beginPath();
  ctx.moveTo(x, top); ctx.lineTo(x, top + tapeH); ctx.stroke();
  ctx.font = '10px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = HUD_GREEN;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = HUD_GREEN; ctx.shadowBlur = 3;
  for (let d = -120; d <= 120; d += 20) {
    const v = Math.round(kts / 20) * 20 + d;
    const yOff = (kts - v) * 1.2;
    const y = cy + yOff;
    if (y < top || y > top + tapeH || v < 0) continue;
    const isMaj = v % 40 === 0;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - (isMaj ? 10 : 5), y);
    ctx.stroke();
    if (isMaj) ctx.fillText(String(v), x - 14, y);
  }
  // Center readout
  hudStroke(ctx, HUD_GREEN, 1.4, 4);
  ctx.beginPath();
  ctx.moveTo(x, cy - 11); ctx.lineTo(x + 7, cy - 11);
  ctx.lineTo(x + 7, cy + 11); ctx.lineTo(x, cy + 11);
  ctx.lineTo(x - 4, cy); ctx.closePath();
  ctx.stroke();
  ctx.font = 'bold 12px JetBrains Mono, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = HUD_GREEN;
  ctx.fillText(String(Math.round(kts)), x + 2, cy + 1);
  ctx.font = '9px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = HUD_GREEN_DIM;
  ctx.textAlign = 'center';
  ctx.fillText('KIAS', x - 16, top - 6);
  ctx.restore();
}

// Flight Path Marker — the little circle with horizontal bars and a downward stem
// at the center of the HUD, indicating where the aircraft's velocity vector points.
function drawFPM(ctx, cx, cy) {
  ctx.save();
  hudStroke(ctx, HUD_GREEN, 1.6, 6);
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy); ctx.lineTo(cx - 8, cy);
  ctx.moveTo(cx + 8,  cy); ctx.lineTo(cx + 18, cy);
  ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy - 14);
  ctx.stroke();
  ctx.restore();
}

// Boresight cross (gun cross) — slightly above center, fixed reference
function drawBoresight(ctx, cx, cy) {
  ctx.save();
  hudStroke(ctx, HUD_GREEN, 1.4, 5);
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 5, cy);
  ctx.moveTo(cx + 5,  cy); ctx.lineTo(cx + 14, cy);
  ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 5);
  ctx.moveTo(cx, cy + 5);  ctx.lineTo(cx, cy + 14);
  ctx.stroke();
  ctx.restore();
}

// Target box (TD box) around tracked object
// state: 'tracking' | 'locked' | 'firing'
function drawTargetBox(ctx, sx, sy, size, state, label, range, time = 0) {
  ctx.save();
  const half = size / 2;
  let color = HUD_GREEN;
  let dashed = true;
  let corners = false;
  if (state === 'locked') { color = HUD_AMBER; dashed = false; corners = true; }
  else if (state === 'firing') { color = HUD_RED; dashed = false; corners = true; }
  hudStroke(ctx, color, state === 'tracking' ? 1.4 : 2, state === 'tracking' ? 5 : 9);
  if (state === 'tracking') {
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(sx - half, sy - half, size, size);
    ctx.setLineDash([]);
  } else {
    // Solid corners (TD-style)
    const c = 12;
    ctx.beginPath();
    // top-left
    ctx.moveTo(sx - half, sy - half + c); ctx.lineTo(sx - half, sy - half); ctx.lineTo(sx - half + c, sy - half);
    // top-right
    ctx.moveTo(sx + half - c, sy - half); ctx.lineTo(sx + half, sy - half); ctx.lineTo(sx + half, sy - half + c);
    // bottom-right
    ctx.moveTo(sx + half, sy + half - c); ctx.lineTo(sx + half, sy + half); ctx.lineTo(sx + half - c, sy + half);
    // bottom-left
    ctx.moveTo(sx - half + c, sy + half); ctx.lineTo(sx - half, sy + half); ctx.lineTo(sx - half, sy + half - c);
    ctx.stroke();
    if (state === 'firing') {
      // Crosshair through center
      const blink = (Math.sin(time * 0.012) > 0);
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(sx - half * 1.4, sy); ctx.lineTo(sx - half * 0.5, sy);
        ctx.moveTo(sx + half * 0.5, sy); ctx.lineTo(sx + half * 1.4, sy);
        ctx.moveTo(sx, sy - half * 1.4); ctx.lineTo(sx, sy - half * 0.5);
        ctx.moveTo(sx, sy + half * 0.5); ctx.lineTo(sx, sy + half * 1.4);
        ctx.stroke();
      }
    }
  }
  // Label above box
  ctx.font = 'bold 11px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 5;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label.toUpperCase(), sx - half, sy - half - 4);
  // Range below box
  ctx.font = '10px JetBrains Mono, Consolas, monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('R ' + range, sx - half, sy + half + 4);
  // State indicator (right side)
  ctx.textAlign = 'right';
  ctx.fillText(state.toUpperCase(), sx + half, sy + half + 4);
  ctx.restore();
}

// Prediction circle — green, real-time, sits ahead of object
function drawPredictionRing(ctx, sx, sy, time, intensity = 1) {
  ctx.save();
  const breathe = 1 + 0.10 * Math.sin(time * 0.005);
  hudStroke(ctx, HUD_GREEN, 1.6, 8 * intensity);
  ctx.beginPath();
  ctx.arc(sx, sy, 14 * breathe, 0, Math.PI * 2);
  ctx.stroke();
  // Inner dot
  ctx.fillStyle = HUD_GREEN;
  ctx.shadowColor = HUD_GREEN; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
  // Tag
  ctx.font = '9px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = HUD_GREEN;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('PRED +1', sx + 18, sy - 1);
  ctx.restore();
}

// Big lock-state banner above target (TRACKING / LOCKED / FIRE)
function drawLockBanner(ctx, cx, topY, state, conf, time = 0) {
  ctx.save();
  const map = {
    tracking: { txt: 'TRACKING',     color: HUD_GREEN, glow: 5 },
    locked:   { txt: 'LOCKED',       color: HUD_AMBER, glow: 8 },
    firing:   { txt: 'FIRE \u00B7 FIRE \u00B7 FIRE', color: HUD_RED,   glow: 12 },
  }[state] || { txt: state.toUpperCase(), color: HUD_GREEN, glow: 5 };
  ctx.font = 'bold 16px JetBrains Mono, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = map.color;
  ctx.shadowColor = map.color; ctx.shadowBlur = map.glow;
  // Blink for firing
  if (state === 'firing' && Math.sin(time * 0.015) < 0) ctx.globalAlpha = 0.35;
  ctx.fillText(map.txt, cx, topY + 70);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// "G" / mode bar across the bottom of HUD
function drawHUDFooter(ctx, w, h, info) {
  ctx.save();
  const y = h - 60;
  ctx.font = '11px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = HUD_GREEN;
  ctx.shadowColor = HUD_GREEN; ctx.shadowBlur = 4;
  ctx.textBaseline = 'middle';
  // Left cluster
  ctx.textAlign = 'left';
  ctx.fillText(info.left, 30, y);
  // Center cluster
  ctx.textAlign = 'center';
  ctx.fillText(info.center, w / 2, y);
  // Right cluster
  ctx.textAlign = 'right';
  ctx.fillText(info.right, w - 30, y);
  // bottom hairlines
  hudStroke(ctx, HUD_GREEN_DIM, 1, 0);
  ctx.beginPath();
  ctx.moveTo(20, y - 18); ctx.lineTo(w - 20, y - 18);
  ctx.moveTo(20, y + 18); ctx.lineTo(w - 20, y + 18);
  ctx.stroke();
  ctx.restore();
}

// Canopy frame vignette — corner brackets to suggest looking through HUD glass
function drawCanopyFrame(ctx, w, h) {
  ctx.save();
  // Subtle dark corners
  const grad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h) * 0.35, w/2, h/2, Math.max(w,h) * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0, 8, 4, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Faint scanlines (CRT vibe)
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#3dff7a';
  for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}

// Helper: smooth path
function strokeSmoothPath(ctx, pts, opts) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) { ctx.lineTo(pts[1][0], pts[1][1]); }
  else {
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const cx1 = p1[0] + (p2[0] - p0[0]) / 6;
      const cy1 = p1[1] + (p2[1] - p0[1]) / 6;
      const cx2 = p2[0] - (p3[0] - p1[0]) / 6;
      const cy2 = p2[1] - (p3[1] - p1[1]) / 6;
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, p2[0], p2[1]);
    }
  }
  if (opts.shadow) { ctx.shadowColor = opts.color; ctx.shadowBlur = opts.shadow; }
  ctx.strokeStyle = opts.color;
  ctx.lineWidth = opts.width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (opts.dash) ctx.setLineDash(opts.dash);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
}

Object.assign(window, {
  makeCockpitProjector, makeNadirProjector,
  drawSky, drawMountains,
  drawGround, drawNadirGrid, drawGroundFeatures,
  drawRangeRings, drawAircraftIcon, drawCardinals,
  drawPitchLadder, drawBankIndicator, drawHeadingTape,
  drawAltitudeTape, drawAirspeedTape,
  drawFPM, drawBoresight,
  drawTargetBox, drawPredictionRing, drawLockBanner,
  drawHUDFooter, drawCanopyFrame,
  strokeSmoothPath,
  HUD_GREEN, HUD_GREEN_DIM, HUD_AMBER, HUD_RED,
});
