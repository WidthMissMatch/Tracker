import { useRef, useState } from 'react';
import { Inspector } from './components/Inspector.jsx';
import { SettingsPanel } from './components/SettingsPanel.jsx';
import { Stage } from './components/Stage.jsx';
import { TopBar } from './components/TopBar.jsx';
import { TrajectoryList } from './components/TrajectoryList.jsx';
import { Transport } from './components/Transport.jsx';
import { useDataset } from './data/useDataset.js';
import { useKeyboardShortcuts } from './state/shortcuts.js';
import { usePlayback } from './state/usePlayback.js';
import { DEFAULT_SETTINGS, useSettings } from './state/useSettings.js';

const INITIAL_SEGMENT = 3; // F1 — Monaco: the most visually interesting lap

export default function App() {
  const [settings, set, resetSettings] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fpsRef = useRef(0);

  const [segIdx, setSegIdx] = useState(INITIAL_SEGMENT);
  const { manifest, rows, error } = useDataset(segIdx);
  const playback = usePlayback({
    segIdx,
    setSegIdx,
    segmentCount: manifest?.segments.length ?? 0,
    rowCount: rows?.length ?? 0,
    speed: settings.speed,
  });

  const zoomBy = (k) => set('zoom', (z) => z * k);
  const speedBy = (k) => set('speed', (s) => s * k);

  useKeyboardShortcuts(
    {
      togglePause: playback.togglePause,
      stepBack: () => playback.stepBy(-1),
      stepForward: () => playback.stepBy(1),
      prevSegment: playback.prev,
      nextSegment: playback.next,
      restart: playback.restart,
      toggleFollow: () => set('follow', (f) => !f),
      faster: () => speedBy(1.5),
      slower: () => speedBy(1 / 1.5),
      zoomIn: () => zoomBy(1.4),
      zoomOut: () => zoomBy(1 / 1.4),
      resetZoom: () => set('zoom', DEFAULT_SETTINGS.zoom),
      togglePred: () => set('showPred', (v) => !v),
      toggleHUD: () => set('showHUD', (v) => !v),
      toggleSettings: () => setSettingsOpen((o) => !o),
      closeSettings: () => setSettingsOpen(false),
    },
    (n) => manifest && n <= manifest.segments.length && playback.selectSegment(n - 1),
  );

  if (error) {
    return (
      <div className="fullscreen-msg error">
        <div>Couldn't load the tracker data.</div>
        <code>{String(error.message || error)}</code>
      </div>
    );
  }
  if (!manifest) {
    return (
      <div className="fullscreen-msg">
        <div className="spinner" />
        <div>Loading IMM trace…</div>
      </div>
    );
  }

  const segment = manifest.segments[segIdx];
  const step = rows ? Math.min(playback.stepIdx, rows.length - 1) : 0;
  const row = rows?.[step] ?? null;
  const progress = rows ? step / Math.max(1, rows.length - 1) : 0;

  return (
    <div className="app">
      <TopBar
        row={row}
        step={step}
        segment={segment}
        rfLabels={manifest.rfLabels}
        paused={playback.paused}
        fpsRef={fpsRef}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <TrajectoryList
        segments={manifest.segments}
        totalRows={manifest.totalRows}
        activeIdx={segIdx}
        onSelect={playback.selectSegment}
      />
      <Stage
        segment={segment}
        rows={rows}
        stepRef={playback.stepRef}
        settings={settings}
        fpsRef={fpsRef}
        onZoom={zoomBy}
        onZoomReset={() => set('zoom', DEFAULT_SETTINGS.zoom)}
        onToggleFollow={() => set('follow', (f) => !f)}
      />
      <Inspector rows={rows} step={step} segment={segment} manifest={manifest} />
      <Transport
        segments={manifest.segments}
        activeIdx={segIdx}
        row={row}
        progress={progress}
        paused={playback.paused}
        speed={settings.speed}
        playback={playback}
        onSpeed={(v) => set('speed', v)}
      />
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        set={set}
        reset={resetSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
