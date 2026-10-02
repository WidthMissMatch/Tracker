// Monochrome 24×24 silhouettes per target class (stroke = currentColor).
import { classKey } from '../../data/classes.js';

const LINE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const SHAPES = {
  Bird: (
    <>
      <path d="M3 12 C 6 5, 9 5, 12 11 C 15 5, 18 5, 21 12" />
      <path d="M12 11 L 12.5 16" />
      <circle cx="13" cy="16.5" r="0.6" fill="currentColor" />
    </>
  ),
  Car: (
    <>
      <path d="M3 14 L 4.5 9.5 C 5 8.5, 6 8, 7 8 L 17 8 C 18 8, 19 8.5, 19.5 9.5 L 21 14" />
      <rect x="3" y="14" width="18" height="3" rx="1" />
      <circle cx="7" cy="17" r="1.5" fill="currentColor" />
      <circle cx="17" cy="17" r="1.5" fill="currentColor" />
      <path d="M6.5 11 L 17.5 11" opacity="0.5" />
    </>
  ),
  F1: (
    <>
      <path d="M2 14 L 4 12.5 L 8 12.5 L 9.5 10.5 L 14.5 10.5 L 16 12.5 L 22 12.5 L 22 15 L 2 15 Z" />
      <circle cx="6" cy="16" r="1.7" fill="currentColor" />
      <circle cx="18" cy="16" r="1.7" fill="currentColor" />
      <path d="M11 9 L 13 9" />
    </>
  ),
  Airplane: <path d="M2 13 L 22 11 L 22 13 L 13 14 L 9 19 L 7 19 L 8.5 14 L 5 14 L 3.5 16 L 2 16 Z" />,
  Missile: (
    <>
      <path d="M3 12 L 17 12 L 21 9 L 21 15 L 17 12" />
      <path d="M6 9 L 4 6" />
      <path d="M6 15 L 4 18" />
      <path d="M11 9 L 11 7" />
      <path d="M11 15 L 11 17" />
    </>
  ),
  Pedestrian: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7 L 12 13" />
      <path d="M12 13 L 9 19" />
      <path d="M12 13 L 15 19" />
      <path d="M9 10 L 12 11 L 15 9" />
    </>
  ),
  Drone: (
    <>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M7.5 7.5 L 10.5 10.5 M16.5 7.5 L 13.5 10.5 M7.5 16.5 L 10.5 13.5 M16.5 16.5 L 13.5 13.5" />
      <rect x="10" y="10" width="4" height="4" rx="0.6" />
    </>
  ),
  Cat: (
    <>
      <path d="M5 11 L 6.5 6 L 9 9 L 15 9 L 17.5 6 L 19 11" />
      <path d="M5 11 C 5 16, 8 18, 12 18 C 16 18, 19 16, 19 11" />
      <circle cx="9.5" cy="12.5" r="0.6" fill="currentColor" />
      <circle cx="14.5" cy="12.5" r="0.6" fill="currentColor" />
      <path d="M11 14.5 L 12 15.5 L 13 14.5" />
    </>
  ),
  Ball: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12 L 20 12 M12 4 L 12 20" />
      <path d="M6 6 L 18 18" opacity="0.4" />
    </>
  ),
  Artillery: (
    <>
      <path d="M3 17 L 21 17" />
      <path d="M5 17 L 5 14 L 8 14 L 8 17" />
      <path d="M8 14 L 18 9" strokeWidth="2.5" />
      <circle cx="6.5" cy="17" r="1.5" />
    </>
  ),
};

export function ClassIcon({ label, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...LINE} {...rest}>
      {SHAPES[classKey(label)]}
    </svg>
  );
}
