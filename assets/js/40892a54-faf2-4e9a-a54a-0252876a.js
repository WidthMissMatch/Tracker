// icons.jsx — class iconography (Bird/Car/F1/Airplane/Missile/Pedestrian/etc)
// Stylized line silhouettes, monochrome (currentColor), at 24×24

const ClassIcons = {
  Bird: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12 C 6 5, 9 5, 12 11 C 15 5, 18 5, 21 12" />
      <path d="M12 11 L 12.5 16" />
      <circle cx="13" cy="16.5" r="0.6" fill="currentColor" />
    </svg>
  ),
  Car: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 14 L 4.5 9.5 C 5 8.5, 6 8, 7 8 L 17 8 C 18 8, 19 8.5, 19.5 9.5 L 21 14" />
      <rect x="3" y="14" width="18" height="3" rx="1" />
      <circle cx="7" cy="17" r="1.5" fill="currentColor" />
      <circle cx="17" cy="17" r="1.5" fill="currentColor" />
      <path d="M6.5 11 L 17.5 11" opacity="0.5" />
    </svg>
  ),
  F1: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 14 L 4 12.5 L 8 12.5 L 9.5 10.5 L 14.5 10.5 L 16 12.5 L 22 12.5 L 22 15 L 2 15 Z" />
      <circle cx="6" cy="16" r="1.7" fill="currentColor" />
      <circle cx="18" cy="16" r="1.7" fill="currentColor" />
      <path d="M11 9 L 13 9" />
    </svg>
  ),
  Airplane: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 13 L 22 11 L 22 13 L 13 14 L 9 19 L 7 19 L 8.5 14 L 5 14 L 3.5 16 L 2 16 Z" />
    </svg>
  ),
  Missile: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12 L 17 12 L 21 9 L 21 15 L 17 12" />
      <path d="M6 9 L 4 6" />
      <path d="M6 15 L 4 18" />
      <path d="M11 9 L 11 7" />
      <path d="M11 15 L 11 17" />
    </svg>
  ),
  Pedestrian: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7 L 12 13" />
      <path d="M12 13 L 9 19" />
      <path d="M12 13 L 15 19" />
      <path d="M9 10 L 12 11 L 15 9" />
    </svg>
  ),
  Drone: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M7.5 7.5 L 10.5 10.5" />
      <path d="M16.5 7.5 L 13.5 10.5" />
      <path d="M7.5 16.5 L 10.5 13.5" />
      <path d="M16.5 16.5 L 13.5 13.5" />
      <rect x="10" y="10" width="4" height="4" rx="0.6" />
    </svg>
  ),
  Cat: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 11 L 6.5 6 L 9 9 L 15 9 L 17.5 6 L 19 11" />
      <path d="M5 11 C 5 16, 8 18, 12 18 C 16 18, 19 16, 19 11" />
      <circle cx="9.5" cy="12.5" r="0.6" fill="currentColor" />
      <circle cx="14.5" cy="12.5" r="0.6" fill="currentColor" />
      <path d="M11 14.5 L 12 15.5 L 13 14.5" />
    </svg>
  ),
  Ball: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12 L 20 12" />
      <path d="M12 4 L 12 20" />
      <path d="M6 6 L 18 18" opacity="0.4" />
    </svg>
  ),
  Artillery: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 17 L 21 17" />
      <path d="M5 17 L 5 14 L 8 14 L 8 17" />
      <path d="M8 14 L 18 9" strokeWidth="2.5" />
      <circle cx="6.5" cy="17" r="1.5" />
    </svg>
  ),
};

const RF_LABEL_TO_KEY = {
  'Bird': 'Bird', 'Car': 'Car', 'F1': 'F1', 'Airplane': 'Airplane',
  'Missile': 'Missile', 'Pedestrian': 'Pedestrian', 'Drone': 'Drone',
  'Cat': 'Cat', 'Ball': 'Ball', 'Artillery': 'Artillery',
};

const CLASS_COLOR = {
  Bird: '#7be39a', Car: '#ffd76d', F1: '#ff7e5b',
  Airplane: '#6df2ff', Missile: '#ff6868', Pedestrian: '#b58cff',
  Drone: '#79b6ff', Cat: '#ffa8d8', Ball: '#a3e6ff', Artillery: '#ffb663',
};

function getClassKey(label) {
  if (!label) return 'Drone';
  if (label.startsWith('F1')) return 'F1';
  return RF_LABEL_TO_KEY[label] || 'Drone';
}
function ClassIcon({ label, ...rest }) {
  const key = getClassKey(label);
  const Icon = ClassIcons[key] || ClassIcons.Drone;
  return <Icon {...rest} />;
}
function classColor(label) {
  return CLASS_COLOR[getClassKey(label)] || '#6df2ff';
}

// UI control icons
const UI = {
  Play: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M7 5 L 7 19 L 19 12 Z"/></svg>,
  Pause: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>,
  Reset: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12 a 9 9 0 1 0 3.5 -7"/><path d="M3 4 L 3 9 L 8 9"/></svg>,
  Prev: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M16 5 L 16 19 L 6 12 Z"/><rect x="4" y="5" width="2" height="14"/></svg>,
  Next: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5 L 8 19 L 18 12 Z"/><rect x="18" y="5" width="2" height="14"/></svg>,
  Follow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2 L 12 5"/><path d="M12 19 L 12 22"/><path d="M2 12 L 5 12"/><path d="M19 12 L 22 12"/></svg>,
  Tilt: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 16 L 12 8 L 21 16"/><path d="M3 19 L 21 19"/></svg>,
  Pred: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="6" cy="12" r="2"/><path d="M8 12 L 14 12" strokeDasharray="2 2"/><circle cx="17" cy="12" r="3"/></svg>,
  Plus: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5 L 12 19"/><path d="M5 12 L 19 12"/></svg>,
  Minus: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M5 12 L 19 12"/></svg>,
};

Object.assign(window, { ClassIcons, ClassIcon, classColor, getClassKey, UI, CLASS_COLOR });
