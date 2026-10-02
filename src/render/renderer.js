// Draws one frame of the tracking scene. Pure function of its inputs apart
// from `camera`, which carries the smoothed follow position between frames.
// Returns { settled }: false while the camera is still gliding, so callers know
// a paused scene needs more frames before it can stop redrawing.
import { lockState, rowAt, speedOf } from '../data/metrics.js';
import { pad } from '../data/format.js';
import { make3DProjector } from './projection.js';
import { drawBackground, drawBox, drawDropLine, drawFloorGrid, strokePolyline, strokeSmooth } from './scene.js';
import {
  drawEstimateMarker, drawFooter, drawLockBanner, drawPredictionMarker, drawTargetBox,
} from './hud.js';
import { ESTIMATE, PREDICTION, TRUTH } from './palette.js';

const FUTURE_COUNT = 6;
const FOLLOW_SMOOTHING = 0.18;
const TARGET_BOX = 96;
const NARROW = 560; // px — below this the HUD footer drops its centre text

export function createCamera() {
  return { pos: null };
}

/**
 * @param {CanvasRenderingContext2D} ctx  already scaled for devicePixelRatio
 * @param {object} f
 * @param {number} f.width, f.height  CSS pixels
 * @param {object} f.segment          manifest segment (bbox, label, id)
 * @param {Array}  f.rows             rows for that segment
 * @param {number} f.step             fractional playback position
 * @param {object} f.settings         user settings (zoom, follow, show*, trailLen, lockMode)
 * @param {object} f.camera           from createCamera()
 * @param {number} f.now              performance.now()
 */
export function renderFrame(ctx, { width: w, height: h, segment, rows, step, settings, camera, now }) {
  drawBackground(ctx, w, h);
  if (!segment || !rows?.length) return { settled: true };

  const live = rowAt(rows, step);
  const idx = Math.min(rows.length - 1, Math.floor(step));

  // Box around the whole segment; z padded so flat tracks still get height.
  const [xmn, ymn, zmn, xmx, ymx, zmx] = segment.bbox;
  const zPad = Math.max(1, (zmx - zmn) * 0.1);
  const box = [xmn, ymn, zmn - zPad, xmx, ymx, zmx + zPad * 2];
  const floorZ = box[2];
  const span = Math.max(1, xmx - xmn, ymx - ymn, box[5] - box[2]);

  // Camera: follow the target (smoothed) or sit on the box centre.
  const centre = [(xmn + xmx) / 2, (ymn + ymx) / 2, (box[2] + box[5]) / 2];
  const target = settings.follow ? live.g : centre;
  let settled = true;
  if (!camera.pos || !settings.follow) {
    camera.pos = [...target];
  } else {
    for (let i = 0; i < 3; i++) {
      const d = target[i] - camera.pos[i];
      camera.pos[i] += d * FOLLOW_SMOOTHING;
      if (Math.abs(d) > span * 1e-4) settled = false;
    }
  }

  const scale = ((Math.min(w, h) * 0.55) / span) * settings.zoom;
  const project = make3DProjector({
    cx: w / 2, cy: h / 2,
    worldCx: camera.pos[0], worldCy: camera.pos[1], worldCz: camera.pos[2],
    scale,
  });
  const toScreen = (p) => project(p[0], p[1], p[2]);

  if (settings.showGrid) drawFloorGrid(ctx, project, box);
  if (settings.showBox) drawBox(ctx, project, box);

  // Whole segment, faint and dotted.
  if (settings.showPath) {
    strokePolyline(ctx, rows.map((r) => toScreen(r.g)), {
      color: 'rgba(160, 220, 240, 0.30)', dash: [2, 5],
    });
  }

  // Recent history: truth (thick, glowing) and estimate (thin).
  const start = Math.max(0, idx - settings.trailLen);
  const past = rows.slice(start, idx + 1);
  const truthPts = past.map((r) => toScreen(r.g)).concat([toScreen(live.g)]);
  strokeSmooth(ctx, truthPts, { color: TRUTH, width: 6, glow: 4, alpha: 0.2 });
  strokeSmooth(ctx, truthPts, { color: TRUTH, width: 2.4, glow: 8, alpha: 0.95 });
  if (settings.showEstimate) {
    const estPts = past.map((r) => toScreen(r.e)).concat([toScreen(live.e)]);
    strokePolyline(ctx, estPts, { color: ESTIMATE, width: 1, alpha: 0.75 });
  }

  // Upcoming one-step predictions, fading with distance ahead.
  if (settings.showFuture) {
    ctx.save();
    ctx.fillStyle = PREDICTION;
    ctx.shadowColor = PREDICTION;
    const end = Math.min(rows.length - 1, idx + FUTURE_COUNT);
    for (let i = idx + 1; i <= end; i++) {
      const [px, py] = toScreen(rows[i].p);
      const age = (i - idx - 1) / (FUTURE_COUNT - 1);
      ctx.globalAlpha = Math.max(0.25, 1 - age * 0.7);
      ctx.shadowBlur = 10 - age * 6;
      ctx.beginPath();
      ctx.arc(px, py, 3.5 - age * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Current target: truth diamond, estimate reticle, prediction marker.
  drawDropLine(ctx, project, live.g, floorZ, 'rgba(255, 174, 61, 0.45)');
  const [gx, gy] = toScreen(live.g);
  ctx.save();
  ctx.fillStyle = TRUTH;
  ctx.shadowColor = TRUTH;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(gx, gy - 7); ctx.lineTo(gx + 7, gy); ctx.lineTo(gx, gy + 7); ctx.lineTo(gx - 7, gy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const [ex, ey] = toScreen(live.e);
  if (settings.showEstimate) drawEstimateMarker(ctx, ex, ey, ESTIMATE);

  if (settings.showPred) {
    drawDropLine(ctx, project, live.p, floorZ, 'rgba(255, 77, 77, 0.4)');
    const [px, py] = toScreen(live.p);
    strokePolyline(ctx, [[gx, gy], [px, py]], { color: 'rgba(255, 77, 77, 0.6)', width: 1.2, dash: [4, 4] });
    drawPredictionMarker(ctx, px, py, PREDICTION, now);
  }

  if (settings.showHUD) {
    const state = lockState(live.cf, settings.lockMode);
    drawTargetBox(ctx, ex, ey, TARGET_BOX, state, {
      title: segment.label.toUpperCase(),
      caption: `|v| ${speedOf(live).toFixed(1)} u/s`,
    }, now);
    drawLockBanner(ctx, ex, ey - TARGET_BOX / 2 - 22, state, now);
    drawFooter(ctx, w, h, {
      left: state === 'tracking' ? 'TRACKING' : 'LOCKED',
      center: w < NARROW ? '' : `SEG ${pad(segment.id)} · ${segment.label.toUpperCase()} · STEP ${idx + 1}/${rows.length}`,
      right: `RF ${Math.round(live.cf)}%   B${live.ii}`,
    });
  }
  return { settled };
}
