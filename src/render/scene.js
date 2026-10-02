// World-space drawing: background, bounding box, floor grid, paths.
import { MONO } from './palette.js';

export function drawBackground(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = '#081210';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.05, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(45, 75, 60, 0.50)');
  g.addColorStop(0.5, 'rgba(18, 32, 26, 0.35)');
  g.addColorStop(1, 'rgba(0, 4, 2, 0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Grid on the box floor (z = z0).
export function drawFloorGrid(ctx, project, [x0, y0, z0, x1, y1], divisions = 8) {
  ctx.save();
  ctx.strokeStyle = 'rgba(109, 242, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= divisions; i++) {
    const tx = x0 + ((x1 - x0) * i) / divisions;
    const ty = y0 + ((y1 - y0) * i) / divisions;
    let a = project(tx, y0, z0), b = project(tx, y1, z0);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    a = project(x0, ty, z0); b = project(x1, ty, z0);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.restore();
}

// Wireframe box with the three axes from the origin corner highlighted.
export function drawBox(ctx, project, [x0, y0, z0, x1, y1, z1]) {
  const P = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ].map(([x, y, z]) => project(x, y, z));

  const back = [[1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [7, 4], [1, 5], [2, 6], [3, 7]];
  const axes = [
    { to: 1, label: 'X', line: 'rgba(255, 100, 100, 0.85)', text: '#ff8282' },
    { to: 3, label: 'Y', line: 'rgba(120, 230, 120, 0.85)', text: '#8cf08c' },
    { to: 4, label: 'Z', line: 'rgba(120, 170, 255, 0.90)', text: '#96beff' },
  ];

  ctx.save();
  ctx.strokeStyle = 'rgba(109, 242, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  for (const [a, b] of back) {
    ctx.moveTo(P[a][0], P[a][1]);
    ctx.lineTo(P[b][0], P[b][1]);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.lineWidth = 1.6;
  for (const ax of axes) {
    ctx.strokeStyle = ax.line;
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    ctx.lineTo(P[ax.to][0], P[ax.to][1]);
    ctx.stroke();
  }

  ctx.font = `600 11px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const ax of axes) {
    const [px, py] = P[ax.to];
    ctx.fillStyle = 'rgba(11, 15, 23, 0.85)';
    ctx.fillRect(px - 9, py - 8, 18, 16);
    ctx.fillStyle = ax.text;
    ctx.fillText(ax.label, px, py);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(P[0][0], P[0][1], 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Dashed vertical from a point to the box floor, with a footprint tick.
export function drawDropLine(ctx, project, [wx, wy, wz], floorZ, color) {
  const top = project(wx, wy, wz);
  const foot = project(wx, wy, floorZ);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(top[0], top[1]);
  ctx.lineTo(foot[0], foot[1]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(foot[0] - 4, foot[1]); ctx.lineTo(foot[0] + 4, foot[1]);
  ctx.moveTo(foot[0], foot[1] - 2); ctx.lineTo(foot[0], foot[1] + 2);
  ctx.stroke();
  ctx.restore();
}

export function strokePolyline(ctx, pts, { color, width = 1, dash = null, alpha = 1 }) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();
}

// Catmull-Rom style smooth stroke through screen points.
export function strokeSmooth(ctx, pts, { color, width, glow = 0, alpha = 1 }) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}
