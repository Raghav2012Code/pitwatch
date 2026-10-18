import { lazy, Suspense } from 'react'
import { useTerrain } from '../state/terrain'
import { Relief } from './schematic'
import {
  ScaleAndExaggeration,
  SceneStatus,
  TerrainLegend,
  TitleBlock,
  ViewControls,
} from './viewport/MapHud'
import { SceneErrorBoundary } from './viewport/SceneErrorBoundary'

// three.js is large; fetch it only when the monitor actually shows the model.
const TerrainScene = lazy(() => import('../scene/TerrainScene'))

export function Viewport() {
  const status = useTerrain((s) => s.status)
  const error = useTerrain((s) => s.error)
  const ready = status === 'ready'

  return (
    <main aria-label="3D mine view" className="viewport absolute inset-0">
      <Relief className="fade-in" />

      {/* Stage = the area left visible between the floating panels, framed like a map sheet. */}
      <div className="stage neatline frame-in absolute">
        <div
          className="scene-wrap absolute inset-[6px]"
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

        {!ready && (
          <SceneStatus
            label="Building the terrain model"
            error={status === 'error' ? `Could not load the survey: ${error}` : undefined}
          />
        )}

        {ready && (
          <>
            <TitleBlock />
            <ViewControls />
            <TerrainLegend />
            <ScaleAndExaggeration />
          </>
        )}
      </div>
    </main>
  )
}
