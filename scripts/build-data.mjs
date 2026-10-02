// Split the recorded IMM trace (data/raso.json) into a small manifest plus one
// file per segment under public/data/, so the page can paint after loading a
// few KB and fetch each trajectory on demand.
//
//   public/data/manifest.json        segment metadata + per-segment summaries
//   public/data/segments/seg-NN.json rows for one segment
//
// Row fields (unchanged from the source trace):
//   c  cycle index            g  ground-truth position [x,y,z]
//   e  filter estimate [x,y,z] v  estimated velocity [vx,vy,vz]
//   p  one-step prediction    rc RF classifier label index
//   ii active IMM bank        cf RF confidence (0–100)
//   pr mode probabilities [CTRA, Singer, Bike]

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data', 'raso.json');
const OUT = join(ROOT, 'public', 'data');
const SPARK_POINTS = 32;

const round = (x, d) => {
  const k = 10 ** d;
  return Math.round(x * k) / k;
};
const vec = (a, d = 3) => a.map((x) => round(x, d));
const errorOf = (r) => Math.hypot(r.g[0] - r.e[0], r.g[1] - r.e[1], r.g[2] - r.e[2]);

const src = JSON.parse(readFileSync(SRC, 'utf8'));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'segments'), { recursive: true });

const segments = src.segs.map((seg) => {
  const rows = src.rows.filter((r) => r.s === seg.id).sort((a, b) => a.c - b.c);
  if (rows.length === 0) throw new Error(`segment ${seg.id} has no rows`);

  const errs = rows.map(errorOf);
  const sorted = [...errs].sort((a, b) => a - b);
  const mae = errs.reduce((s, x) => s + x, 0) / errs.length;
  const rmse = Math.sqrt(errs.reduce((s, x) => s + x * x, 0) / errs.length);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  const stride = Math.max(1, Math.floor(rows.length / SPARK_POINTS));
  const errSpark = [];
  for (let i = 0; i < rows.length; i += stride) errSpark.push(round(errs[i], 3));

  const file = `segments/seg-${String(seg.id).padStart(2, '0')}.json`;
  const compact = rows.map((r) => ({
    c: r.c,
    g: vec(r.g),
    e: vec(r.e),
    v: vec(r.v),
    p: vec(r.p),
    rc: r.rc,
    ii: r.ii,
    cf: round(r.cf, 2),
    pr: vec(r.pr, 4),
  }));
  writeFileSync(join(OUT, file), JSON.stringify(compact));

  return {
    id: seg.id,
    label: seg.label,
    n: rows.length,
    cycleStart: rows[0].c,
    cycleEnd: rows[rows.length - 1].c,
    bbox: vec(seg.bb),
    stats: { mae: round(mae, 4), rmse: round(rmse, 4), p95: round(p95, 4) },
    errSpark,
    file,
  };
});

const manifest = {
  source: 'data/raso.json',
  totalRows: src.rows.length,
  modes: ['CTRA', 'Singer', 'Bike'],
  banks: 5,
  rfLabels: ['Drone', 'Missile', 'Car', 'F1', 'Cat', 'Bird', 'Airplane', 'Ball', 'Artillery', 'Pedestrian'],
  segments,
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));

console.log(`[data] ${segments.length} segments, ${src.rows.length} rows → public/data/`);
