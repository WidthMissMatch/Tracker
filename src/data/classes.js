// Target classes: colour and icon key for every segment label / RF label.

export const CLASS_COLOR = {
  Bird: '#7be39a',
  Car: '#ffd76d',
  F1: '#ff7e5b',
  Airplane: '#6df2ff',
  Missile: '#ff6868',
  Pedestrian: '#b58cff',
  Drone: '#79b6ff',
  Cat: '#ffa8d8',
  Ball: '#a3e6ff',
  Artillery: '#ffb663',
};

const DEFAULT_KEY = 'Drone';

// Segment labels like "F1 — Monaco" share the F1 class.
export function classKey(label) {
  if (!label) return DEFAULT_KEY;
  if (label.startsWith('F1')) return 'F1';
  return label in CLASS_COLOR ? label : DEFAULT_KEY;
}

export function classColor(label) {
  return CLASS_COLOR[classKey(label)];
}
