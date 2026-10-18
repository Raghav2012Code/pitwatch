import { lazy, Suspense } from 'react'
import { useTerrain } from '../state/terrain'
import { Timeline } from './Timeline'
import { ScaleBar, SceneStatus, ViewControls } from './viewport/MapHud'
import { SceneErrorBoundary } from './viewport/SceneErrorBoundary'

// three.js is large; fetch it only when the monitor actually shows the model.
const TerrainScene = lazy(() => import('../scene/TerrainScene'))

/**
 * The map: a full-height 3D view under a sky that fills the whole area, so the model
 * appears edge to edge. The stage is the part not covered by the side panels; the
 * canvas and map controls sit inside it.
 */
export function Viewport() {
  const status = useTerrain((s) => s.status)
  const error = useTerrain((s) => s.error)
  const ready = status === 'ready'

  return (
    <main aria-label="3D mine view" className="viewport absolute inset-0">
      <div
        className="scene-wrap absolute inset-0"
        role="img"
        aria-label="3D terrain of the fictional Venthar Ridge pit, current survey. Drag to orbit, right-drag to pan, scroll to zoom."
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
          />
        )}

        {ready && (
          <>
            <ViewControls />
            <ScaleBar />
          </>
        )}
        <Timeline />
      </div>
    </main>
  )
}
