import { lazy, Suspense } from 'react'
import { useAppStore } from '../state/store'
import { useTerrain } from '../state/terrain'
import { Relief } from './schematic'
import { Timeline } from './Timeline'
import { ScaleBar, SceneStatus, ToolControls, ViewControls } from './viewport/MapHud'
import { SceneErrorBoundary } from './viewport/SceneErrorBoundary'

// three.js is large; fetch it only when the monitor actually shows the model.
const TerrainScene = lazy(() => import('../scene/TerrainScene'))

/**
 * The map: a full-height 3D view on a sheet of survey paper that fills the whole area, so
 * the model appears edge to edge. The stage is the part not covered by the side panels; the
 * canvas and map controls sit inside it.
 */
export function Viewport() {
  const status = useTerrain((s) => s.status)
  const error = useTerrain((s) => s.error)
  const findings = useTerrain((s) => s.findings)
  const epoch = useAppStore((s) => s.epoch)
  const ready = status === 'ready'
  const tool = useAppStore((s) => s.tool)
  // The label follows the survey on screen and the engine's output, so a screen reader
  // hears what the map currently shows rather than a stale sentence.
  const sceneLabel =
    `3D terrain of the fictional Venthar Ridge pit, ${epoch} survey.` +
    (ready ? ` ${findings.length} findings marked.` : '') +
    ' Drag to orbit, right-drag to pan, scroll to zoom.'

  return (
    <main
      id="content"
      tabIndex={-1}
      aria-label="3D mine view"
      className="viewport absolute inset-0"
    >
      <Relief className="opacity-45" />
      <div
        className="scene-wrap absolute inset-0"
        data-tool={tool}
        role="img"
        aria-label={sceneLabel}
      >
        {ready && (
          <SceneErrorBoundary
            fallback={(m) => <SceneStatus label="" error={`The 3D view could not start: ${m}`} />}
          >
            <Suspense fallback={<SceneStatus label="Loading the 3D engine" />}>
              <TerrainScene />
            </Suspense>
          </SceneErrorBoundary>
        )}
      </div>

      {/* HUD layer over the uncovered part of the map; clicks pass through to the canvas. */}
      <div className="stage absolute">
        {!ready && (
          <SceneStatus
            label="Building the terrain model"
            error={status === 'error' ? `Could not load the survey: ${error}` : undefined}
            onRetry={status === 'error' ? () => void useTerrain.getState().retry() : undefined}
          />
        )}

        {ready && (
          <>
            <ViewControls />
            <ScaleBar />
            <ToolControls />
          </>
        )}
        <Timeline />
      </div>
    </main>
  )
}
