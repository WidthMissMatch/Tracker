# Tracker — RASO IMM Console

A replay viewer for an Interacting Multiple Model (IMM) radar tracker.
Recorded filter output for nine trajectories — two birds, a car, three
Formula 1 laps (Monaco, Silverstone, Abu Dhabi), an airplane, a missile and
a pedestrian — is replayed step by step against the ground truth, with live
error metrics, mode probabilities and the RF classifier's output.

**Live:** https://widthmissmatch.github.io/Tracker/ ·
**Embedding guide & live demo:** https://widthmissmatch.github.io/Tracker/embed-demo.html

![Console screenshot](docs/screenshot.jpg)

> **Replay, not a live filter.** The tracker ran offline; this page plays
> back its stored output (`data/raso.json`). Nothing is estimated in the
> browser — positions are only interpolated between recorded samples so the
> motion looks smooth.

## What it shows

- **3D view** — the segment's bounding box, the ground-truth trail (amber),
  the filter estimate (cyan), the one-step prediction and the next few
  predictions (red), with a target box whose lock state follows RF
  confidence (lock ≥ 50 %, fire ≥ 80 %).
- **Tracking error** — ‖truth − estimate‖ over the last 60 steps with the
  segment's 95th-percentile line, plus MAE/RMSE for the window and for the
  whole segment.
- **Mode probability** — stacked CTRA / Singer / Bike weights over time.
- **Active IMM bank** (B0–B4) and the **RF class** with its confidence.

Works on desktop, tablet and phone; the layout follows the viewport (or the
iframe, when embedded).

## Controls

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` `→` | Step back / forward |
| `,` `.` | Previous / next segment |
| `1`–`9` | Jump to segment |
| `R` | Restart segment |
| `F` | Follow target |
| `+` `−` | Faster / slower |
| `[` `]` | Zoom out / in, `0` resets |
| `P` / `H` | Toggle prediction / HUD |
| `S` | Settings panel |

Clicking the active segment in the bottom timeline seeks within it. On the
standalone site, view settings are remembered per browser.

## Embedding

```html
<iframe
  src="https://widthmissmatch.github.io/Tracker/?seg=3"
  sandbox="allow-scripts"
  title="IMM radar tracker replay"
  loading="lazy"
  style="width:100%; height:640px; border:0"></iframe>
```

`allow-scripts` is the only sandbox permission needed. URL options:

| Parameter | Effect |
| --- | --- |
| `seg=0…8` | Segment to open (default 3, F1 Monaco) |
| `autoplay=0` | Open paused |
| `speed=2` | Playback speed (0.1–20) |
| `zoom=1.5` | Initial zoom (0.15–8) |
| `follow=0` | Fixed camera instead of following the target |
| `hud=0` | Hide the target box and footer |
| `panels=0` | Stage and playback bar only |
| `embed=1` / `embed=0` | Force embedded behaviour on/off (normally detected) |

Embedded copies don't persist settings (one host can't change what another
opens with), hide the GitHub link (popups are usually sandboxed away), and
pause playback and rendering while scrolled out of view. Inside a sandbox
without `allow-same-origin` the page runs on an opaque origin and fetches its
files cross-origin, which GitHub Pages allows (`Access-Control-Allow-Origin: *`);
the local dev/preview servers send the same header so embeds can be tested
locally via `/embed-demo.html`.

## Serving and robustness

- **Small first load** — ~61 KB of gzipped JS, a 2 KB manifest, then one
  ~95 KB (gzipped) file per trajectory, fetched on demand; the next segment
  is prefetched.
- **Long-lived caching** — segment files and build assets have content
  hashes in their names. A service worker (`public/sw.js`) serves them
  cache-first and the page shell network-first, so repeat visits are instant
  and the replay works offline after one visit. It is skipped automatically
  where unavailable (e.g. sandboxed iframes).
- **Failure handling** — requests time out after 15 s and retry with backoff
  on network errors and 5xx; data is shape-checked before use; a failed
  segment shows a retry overlay without taking down the rest of the page; a
  render error is caught by an error boundary instead of leaving a blank
  frame.
- **Idle when idle** — while paused the canvas only redraws when something
  changes, and nothing runs while the tab is hidden or the iframe is off
  screen.

## Project layout

```
data/raso.json            Source trace (16,126 samples, 9 segments)
scripts/build-data.mjs    Builds public/data/: manifest + one hashed file per segment
public/
  sw.js                   Service worker (offline cache)
  embed-demo.html         Embedding guide with live sandboxed iframes
  fonts/                  Self-hosted Inter and JetBrains Mono subsets
src/
  config.js               Constants and URL options (seg, autoplay, panels, …)
  data/                   Loading + validation, class colours, metrics, formatting
  render/                 Canvas drawing — pure functions, no React
    renderer.js           Draws one frame from (segment, rows, step, settings)
    scene.js / hud.js     World-space geometry / screen-space overlays
    projection.js         Fixed-angle 3D → 2D projector
  state/                  Playback clock, settings, shortcuts, visibility
  components/             React UI: TopBar, TrajectoryList, Stage, Inspector,
                          Transport, SettingsPanel, StatusScreen, ErrorBoundary,
                          charts/, icons/
  styles/                 Tokens + one stylesheet per area
```

Data, state and rendering are separate layers: `render/` never imports React,
`data/` never draws, and components only wire the two together.

### Data format

`npm run data` writes `public/data/manifest.json` (segment labels, bounding
boxes, cycle ranges, error summaries) and
`public/data/segments/seg-NN.<hash>.json`. Segment files are column-oriented
— one array per field, vectors flattened `x0,y0,z0,x1,…` — and
`src/data/loader.js` turns them back into rows:

| Field | Meaning |
| --- | --- |
| `c` | Radar cycle index |
| `g` / `e` / `p` | Ground truth / filter estimate / one-step prediction `[x, y, z]` |
| `v` | Estimated velocity `[vx, vy, vz]` |
| `pr` | Mode probabilities `[CTRA, Singer, Bike]` |
| `ii` | Active IMM bank (0–4) |
| `rc`, `cf` | RF class index and confidence (0–100) |

To replay a different run, replace `data/raso.json` (same shape: `segs` +
`rows`) and rebuild.

## Development

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
npm run preview   # serve dist/ — includes /embed-demo.html
```

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every
push to `main` (Settings → Pages → Source: **GitHub Actions**).

## Stack

React 18 and Vite, vanilla canvas 2D, hand-written SVG charts and icons. No
charting library, and no requests to third-party hosts at runtime.
