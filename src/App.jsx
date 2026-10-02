import { useRef, useState } from 'react';
import { Inspector } from './components/Inspector.jsx';
import { SettingsPanel } from './components/SettingsPanel.jsx';
import { Stage } from './components/Stage.jsx';
import { StatusScreen } from './components/StatusScreen.jsx';
import { TopBar } from './components/TopBar.jsx';
import { TrajectoryList } from './components/TrajectoryList.jsx';
import { Transport } from './components/Transport.jsx';
import { DEFAULT_SEGMENT, OPTIONS } from './config.js';
import { useDataset } from './data/useDataset.js';
import { useKeyboardShortcuts } from './state/shortcuts.js';
import { usePlayback } from './state/usePlayback.js';
import { DEFAULT_SETTINGS, useSettings } from './state/useSettings.js';
import { useVisibility } from './state/useVisibility.js';

const showPanels = OPTIONS.panels !== false;

export default function App() {
  const [settings, set, resetSettings] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fpsRef = useRef(0);
  const active = useVisibility();

  const [segIdx, setSegIdx] = useState(Math.max(0, Math.floor(OPTIONS.segment ?? DEFAULT_SEGMENT)));
  const { manifest, manifestError, rows, segmentError, retry } = useDataset(segIdx);
  const playback = usePlayback({
    segIdx,
    setSegIdx,
    segmentCount: manifest?.segments.length ?? 0,
    rowCount: rows?.length ?? 0,
    speed: settings.speed,
    active,
    autoplay: OPTIONS.autoplay !== false,
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

  if (manifestError) {
    return (
      <StatusScreen
        error
        title="Couldn't load the tracker data."
        detail={String(manifestError.message || manifestError)}
        action={{ label: 'Try again', onClick: retry }}
      />
    );
  }
  if (!manifest) return <StatusScreen title="Loading IMM trace…" />;

  // A ?seg= past the end falls back to the default rather than crashing.
  if (segIdx >= manifest.segments.length) {
    setSegIdx(Math.min(DEFAULT_SEGMENT, manifest.segments.length - 1));
    return null;
  }

  const segment = manifest.segments[segIdx];
  const step = rows ? Math.min(playback.stepIdx, rows.length - 1) : 0;
  const row = rows?.[step] ?? null;
  const progress = rows ? step / Math.max(1, rows.length - 1) : 0;

  return (
    <div className={`app ${showPanels ? '' : 'no-panels'} ${OPTIONS.framed ? 'framed' : ''}`}>
      <TopBar
        row={row}
        step={step}
        segment={segment}
        rfLabels={manifest.rfLabels}
        paused={playback.paused}
        fpsRef={fpsRef}
        showRepoLink={!OPTIONS.framed}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      {showPanels && (
        <TrajectoryList
          segments={manifest.segments}
          totalRows={manifest.totalRows}
          activeIdx={segIdx}
          onSelect={playback.selectSegment}
        />
      )}
      <Stage
        segment={segment}
        rows={rows}
        error={segmentError}
        onRetry={retry}
        stepRef={playback.stepRef}
        settings={settings}
        paused={playback.paused}
        active={active}
        fpsRef={fpsRef}
        onZoom={zoomBy}
        onZoomReset={() => set('zoom', DEFAULT_SETTINGS.zoom)}
        onToggleFollow={() => set('follow', (f) => !f)}
      />
      {showPanels && <Inspector rows={rows} step={step} segment={segment} manifest={manifest} />}
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
