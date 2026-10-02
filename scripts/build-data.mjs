// Split the recorded IMM trace (data/raso.json) into a small manifest plus one
// file per segment under public/data/, so the page can paint after loading a
// few KB and fetch each trajectory on demand.
//
//   public/data/manifest.json        segment metadata + per-segment summaries
//   public/data/segments/seg-NN.<hash>.json one segment, column-oriented (see below)
//
// Segment names carry a content hash so browsers and the service worker can
// cache them forever; only the small manifest needs revalidating.
//
// Segment files store one array per field instead of one object per row —
// ~15% smaller after gzip. Vector fields are flattened (x0,y0,z0,x1,…);
// src/data/loader.js turns them back into row objects. Fields, as in the
// source trace:
//   c  cycle index            g  ground-truth position [x,y,z]
//   e  filter estimate [x,y,z] v  estimated velocity [vx,vy,vz]
//   p  one-step prediction    rc RF classifier label index
//   ii active IMM bank        cf RF confidence (0–100)
//   pr mode probabilities [CTRA, Singer, Bike]

import { createHash } from 'node:crypto';
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

  const flat = (key, digits) => rows.flatMap((r) => vec(r[key], digits));
  const columns = {
    n: rows.length,
    c: rows.map((r) => r.c),
    g: flat('g', 3),
    e: flat('e', 3),
    p: flat('p', 3),
    v: flat('v', 2),
    pr: flat('pr', 3),
    rc: rows.map((r) => r.rc),
    ii: rows.map((r) => r.ii),
    cf: rows.map((r) => round(r.cf, 1)),
  };
  const body = JSON.stringify(columns);
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 10);
  const file = `segments/seg-${String(seg.id).padStart(2, '0')}.${hash}.json`;
  writeFileSync(join(OUT, file), body);

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
  format: 2,
  source: 'data/raso.json',
  totalRows: src.rows.length,
  modes: ['CTRA', 'Singer', 'Bike'],
  banks: 5,
  rfLabels: ['Drone', 'Missile', 'Car', 'F1', 'Cat', 'Bird', 'Airplane', 'Ball', 'Artillery', 'Pedestrian'],
  segments,
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest));

console.log(`[data] ${segments.length} segments, ${src.rows.length} rows → public/data/`);
