import { useCallback, useEffect, useRef, useState } from 'react';

// One recorded sample plays for this long at 1× speed.
const STEP_MS = 150;

/**
 * Replay clock. `stepRef` is a fractional position advanced every animation
 * frame (the canvas reads it for smooth motion); `stepIdx` is the integer
 * sample shown in the panels and only changes when a new sample is reached.
 * At the end of a segment playback moves on to the next one. The active
 * segment index is owned by the caller (the dataset loader needs it too).
 */
export function usePlayback({ segIdx, setSegIdx, segmentCount, rowCount, speed }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const stepRef = useRef(0);

  const seek = useCallback((step) => {
    stepRef.current = step;
    setStepIdx(Math.floor(step));
  }, []);

  const selectSegment = useCallback((i) => {
    if (!segmentCount) return;
    const next = ((i % segmentCount) + segmentCount) % segmentCount;
    seek(0);
    setSegIdx(next);
  }, [segmentCount, seek, setSegIdx]);

  const stepBy = useCallback((delta) => {
    if (!rowCount) return;
    seek(Math.max(0, Math.min(rowCount - 1, Math.floor(stepRef.current) + delta)));
  }, [rowCount, seek]);

  useEffect(() => {
    if (paused || !rowCount) return;
    const stepsPerMs = speed / STEP_MS;
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(80, now - last);
      last = now;
      const next = stepRef.current + dt * stepsPerMs;
      if (next >= rowCount - 1) {
        selectSegment(segIdx + 1);
        return;
      }
      stepRef.current = next;
      const i = Math.floor(next);
      setStepIdx((prev) => (prev === i ? prev : i));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, rowCount, speed, segIdx, selectSegment]);

  return {
    stepIdx,
    stepRef,
    paused,
    togglePause: useCallback(() => setPaused((p) => !p), []),
    selectSegment,
    next: () => selectSegment(segIdx + 1),
    prev: () => selectSegment(segIdx - 1),
    restart: () => seek(0),
    seek,
    stepBy,
  };
}
