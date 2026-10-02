// Screen-space HUD overlays drawn on top of the scene.
import { HUD_AMBER, HUD_GREEN, HUD_GREEN_DIM, HUD_RED, MONO } from './palette.js';

const LOCK_STYLE = {
  tracking: { color: HUD_GREEN, banner: 'TRACKING', glow: 5 },
  locked: { color: HUD_AMBER, banner: 'LOCKED', glow: 8 },
  firing: { color: HUD_RED, banner: 'FIRE · FIRE · FIRE', glow: 12 },
};

// Target designator box around (sx, sy).
export function drawTargetBox(ctx, sx, sy, size, state, { title, caption }, now) {
  const { color } = LOCK_STYLE[state];
  const half = size / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.lineWidth = state === 'tracking' ? 1.4 : 2;
  ctx.shadowBlur = state === 'tracking' ? 5 : 9;

  if (state === 'tracking') {
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(sx - half, sy - half, size, size);
    ctx.setLineDash([]);
  } else {
    const c = 12;
    ctx.beginPath();
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = sx + dx * half, y = sy + dy * half;
      ctx.moveTo(x - dx * c, y); ctx.lineTo(x, y); ctx.lineTo(x, y - dy * c);
    }
    ctx.stroke();
    if (state === 'firing' && Math.sin(now * 0.012) > 0) {
      ctx.beginPath();
      ctx.moveTo(sx - half * 1.4, sy); ctx.lineTo(sx - half * 0.5, sy);
      ctx.moveTo(sx + half * 0.5, sy); ctx.lineTo(sx + half * 1.4, sy);
      ctx.moveTo(sx, sy - half * 1.4); ctx.lineTo(sx, sy - half * 0.5);
      ctx.moveTo(sx, sy + half * 0.5); ctx.lineTo(sx, sy + half * 1.4);
      ctx.stroke();
    }
  }

  ctx.fillStyle = color;
  ctx.shadowBlur = 4;
  ctx.font = `bold 11px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(title, sx - half, sy - half - 4);
  ctx.font = `10px ${MONO}`;
  ctx.textBaseline = 'top';
  ctx.fillText(caption, sx - half, sy + half + 4);
  ctx.restore();
}

// Big lock-state text, centred on cx with its baseline at bottomY.
export function drawLockBanner(ctx, cx, bottomY, state, now) {
  const s = LOCK_STYLE[state];
  ctx.save();
  ctx.font = `bold 15px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = s.color;
  ctx.shadowColor = s.color;
  ctx.shadowBlur = s.glow;
  if (state === 'firing' && Math.sin(now * 0.015) < 0) ctx.globalAlpha = 0.35;
  ctx.fillText(s.banner, cx, bottomY);
  ctx.restore();
}

export function drawPredictionMarker(ctx, sx, sy, color, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now / 250);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14 + pulse * 6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(sx, sy, 10 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawEstimateMarker(ctx, sx, sy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sx, sy, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx - 10, sy); ctx.lineTo(sx - 7, sy);
  ctx.moveTo(sx + 7, sy); ctx.lineTo(sx + 10, sy);
  ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy - 7);
  ctx.moveTo(sx, sy + 7); ctx.lineTo(sx, sy + 10);
  ctx.stroke();
  ctx.restore();
}

export function drawFooter(ctx, w, h, { left, center, right }) {
  const y = h - 24;
  ctx.save();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = HUD_GREEN;
  ctx.shadowColor = HUD_GREEN;
  ctx.shadowBlur = 4;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(left, 24, y);
  ctx.textAlign = 'center';
  ctx.fillText(center, w / 2, y);
  ctx.textAlign = 'right';
  ctx.fillText(right, w - 24, y);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = HUD_GREEN_DIM;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, y - 15); ctx.lineTo(w - 16, y - 15);
  ctx.stroke();
  ctx.restore();
}
