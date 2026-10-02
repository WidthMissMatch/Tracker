import { normalize } from '../../data/metrics.js';

const W = 280;
const H = 72;

export const MODE_COLORS = ['var(--estimate)', 'var(--warn)', 'var(--violet)'];

// Stacked area of normalised mode probabilities over the recent window.
export function ModeProbChart({ history }) {
  if (history.length < 2) {
    return <svg viewBox={`0 0 ${W} ${H}`} className="modeprob-chart" />;
  }
  const n = history.length;
  const norm = history.map(normalize);
  const x = (i) => ((i / (n - 1)) * W).toFixed(1);

  const layer = (k) => {
    let top = '';
    let bottom = '';
    for (let i = 0; i < n; i++) {
      let below = 0;
      for (let j = 0; j < k; j++) below += norm[i][j];
      const above = below + norm[i][k];
      top += `${i ? 'L' : 'M'}${x(i)} ${(H - above * H).toFixed(1)} `;
      bottom = `L${x(i)} ${(H - below * H).toFixed(1)} ` + bottom;
    }
    return `${top}${bottom}Z`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="modeprob-chart" preserveAspectRatio="none" role="img"
         aria-label="Mode probabilities over the recent window">
      {MODE_COLORS.map((c, k) => (
        <path key={k} d={layer(k)} fill={c} fillOpacity="0.75" />
      ))}
    </svg>
  );
}
