const solid = { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true };
const line = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const PlayIcon = () => <svg {...solid}><path d="M7 5 L 7 19 L 19 12 Z" /></svg>;
export const PauseIcon = () => (
  <svg {...solid}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
);
export const PrevIcon = () => (
  <svg {...solid}><path d="M16 5 L 16 19 L 6 12 Z" /><rect x="4" y="5" width="2" height="14" /></svg>
);
export const NextIcon = () => (
  <svg {...solid}><path d="M8 5 L 8 19 L 18 12 Z" /><rect x="18" y="5" width="2" height="14" /></svg>
);
export const RestartIcon = () => (
  <svg {...line}><path d="M3 12 a 9 9 0 1 0 3.5 -7" /><path d="M3 4 L 3 9 L 8 9" /></svg>
);
export const FollowIcon = () => (
  <svg {...line}>
    <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" />
    <path d="M12 2 L 12 5 M12 19 L 12 22 M2 12 L 5 12 M19 12 L 22 12" />
  </svg>
);
export const PlusIcon = () => <svg {...line}><path d="M12 5 L 12 19 M5 12 L 19 12" /></svg>;
export const MinusIcon = () => <svg {...line}><path d="M5 12 L 19 12" /></svg>;
export const FitIcon = () => (
  <svg {...line}><path d="M4 9 V 4 H 9 M15 4 H 20 V 9 M20 15 V 20 H 15 M9 20 H 4 V 15" /></svg>
);
export const SettingsIcon = () => (
  <svg {...line}>
    <path d="M4 6 H 14 M18 6 H 20 M4 12 H 6 M10 12 H 20 M4 18 H 12 M16 18 H 20" />
    <circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="14" cy="18" r="2" />
  </svg>
);
export const CloseIcon = () => <svg {...line}><path d="M6 6 L 18 18 M18 6 L 6 18" /></svg>;
export const GithubIcon = () => (
  <svg {...solid}>
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
  </svg>
);
