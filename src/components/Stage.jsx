import { useEffect, useRef } from 'react';
import { createCamera, renderFrame } from '../render/renderer.js';
import { FitIcon, FollowIcon, MinusIcon, PlusIcon } from './icons/UiIcons.jsx';

const MAX_DPR = 2;

// Canvas host. Owns one long-lived animation loop that reads the latest props
// through a ref, so React re-renders never restart it.
export function Stage({ segment, rows, stepRef, settings, fpsRef, onZoom, onZoomReset, onToggleFollow }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const propsRef = useRef(null);
  propsRef.current = { segment, rows, settings };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const camera = createCamera();
    const size = { w: 0, h: 0 };
    let lastSegment = null;

    const ro = new ResizeObserver(([entry]) => {
      size.w = Math.max(1, Math.floor(entry.contentRect.width));
      size.h = Math.max(1, Math.floor(entry.contentRect.height));
    });
    ro.observe(host);

    let raf = 0;
    let frames = 0;
    let fpsSince = performance.now();

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      frames++;
      if (now - fpsSince >= 500) {
        fpsRef.current = Math.round((frames * 1000) / (now - fpsSince));
        frames = 0;
        fpsSince = now;
      }
      if (!size.w) return;

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const tw = Math.round(size.w * dpr);
      const th = Math.round(size.h * dpr);
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const p = propsRef.current;
      if (p.segment !== lastSegment) {
        camera.pos = null; // snap to the new segment instead of gliding across the world
        lastSegment = p.segment;
      }
      try {
        renderFrame(ctx, {
          width: size.w,
          height: size.h,
          segment: p.segment,
          rows: p.rows,
          step: stepRef.current,
          settings: p.settings,
          camera,
          now,
        });
      } catch (err) {
        console.error('[stage] render failed', err);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [stepRef, fpsRef]);

  return (
    <main className="stage" ref={hostRef}>
      <canvas ref={canvasRef} className="stage-canvas" aria-label="3D view of the tracked trajectory" />

      <div className="stage-legend" aria-hidden="true">
        <span><i className="sw truth" />Ground truth</span>
        {settings.showEstimate && <span><i className="sw estimate" />Estimate</span>}
        {(settings.showPred || settings.showFuture) && <span><i className="sw prediction" />Prediction</span>}
      </div>

      <div className="stage-controls" role="toolbar" aria-label="View">
        <button type="button" className="ctl-btn" onClick={() => onZoom(1.4)} title="Zoom in (])" aria-label="Zoom in"><PlusIcon /></button>
        <div className="ctl-readout" title="Zoom">{settings.zoom.toFixed(1)}×</div>
        <button type="button" className="ctl-btn" onClick={() => onZoom(1 / 1.4)} title="Zoom out ([)" aria-label="Zoom out"><MinusIcon /></button>
        <button type="button" className="ctl-btn" onClick={onZoomReset} title="Reset zoom (0)" aria-label="Reset zoom"><FitIcon /></button>
        <button
          type="button"
          className={`ctl-btn ${settings.follow ? 'on' : ''}`}
          onClick={onToggleFollow}
          title={settings.follow ? 'Following target (F)' : 'Follow target (F)'}
          aria-pressed={settings.follow}
          aria-label="Follow target"
        >
          <FollowIcon />
        </button>
      </div>

      {!rows && (
        <div className="stage-loading"><div className="spinner" />Loading segment…</div>
      )}
    </main>
  );
}
