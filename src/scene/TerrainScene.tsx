import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { largestPitZone } from '../compliance/zone'
import { centroidOf } from '../geo/polygon'
import { useAppStore } from '../state/store'
import { useTerrain } from '../state/terrain'
import { CameraRig } from './CameraRig'
import { buildMarks } from './marks'
import { Overlays } from './Overlays'
import { Terrain } from './Terrain'
import { fromScene, toScene } from './terrainGeometry'
import { ViewOffset } from './ViewOffset'

/** Backdrop colour behind the model; fog fades distant terrain into it. */
const horizon = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--color-backdrop').trim() ||
  '#e8e4d9'

/** Asks the on-demand canvas for a frame when `on` changes (it does not render by itself). */
function Redraw({ on }: { on: unknown }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [on, invalidate])
  return null
}

/** Eased morph target: 1 shows the baseline survey, 0 the current one. */
const epochMorph = () => (useAppStore.getState().epoch === 'baseline' ? 1 : 0)

/**
 * The 3D view: current survey surface on a block, lit from the north-west (the
 * cartographic convention, so relief reads correctly), with orbit controls.
 * Loaded lazily so three.js is only fetched when the monitor opens.
 */
export default function TerrainScene() {
  const survey = useTerrain((s) => s.surveys.current)
  const baseline = useTerrain((s) => s.surveys.baseline)
  const epoch = useAppStore((s) => s.epoch)
  const pickPoint = useAppStore((s) => s.pickPoint)
  const limits = useTerrain((s) => s.limits)
  const change = useTerrain((s) => s.change)
  const findings = useTerrain((s) => s.findings)
  const showChange = useAppStore((s) => s.layers.change)
  const showFindings = useAppStore((s) => s.layers.findings)
  const fog = useMemo(() => horizon(), [])

  // Marks are built once; the layer switches only change how strongly they show.
  const marks = useMemo(
    () => (survey ? buildMarks(survey.grid.cols * survey.grid.rows, change, findings) : undefined),
    [survey, change, findings],
  )

  const aim = useMemo(() => {
    if (!survey || !limits) return null
    // Frame the main pit by area, not by permit order: a small satellite zone listed first
    // must not decide where the camera looks.
    const zone = largestPitZone(limits.pitZones)
    if (!zone) return null
    const c = centroidOf(zone.polygon)
    const [x, , z] = toScene(survey.grid, c, zone.approvedFloorElevation)
    return { pit: { x, y: z }, floorRL: zone.approvedFloorElevation }
  }, [survey, limits])

  if (!survey || !aim) return null

  return (
    <Canvas
      shadows="percentage"
      flat
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 35, near: 10, far: 16000, position: [0, 4000, 900] }}
      gl={{ antialias: true, alpha: true }}
    >
      <fog attach="fog" args={[fog, 5200, 12000]} />
      {/* Cool sky fill and a warm, fairly low sun from the north-west. */}
      <hemisphereLight args={['#e4ebee', '#6b5a48', 0.95]} />
      <directionalLight
        position={[-1700, 1400, -1100]}
        color="#fff0dc"
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1500}
        shadow-camera-right={1500}
        shadow-camera-top={1500}
        shadow-camera-bottom={-1500}
        shadow-camera-near={500}
        shadow-camera-far={6000}
        shadow-bias={-0.0004}
        shadow-normalBias={1.5}
      />
      <Terrain
        survey={survey}
        marks={marks}
        overlay={epoch === 'current' ? [showChange ? 1 : 0, showFindings ? 1 : 0] : [0, 0]}
        morphTo={baseline}
        morph={epochMorph}
        onPick={(pt) => pickPoint(fromScene(survey.grid, pt.x, pt.z))}
      />
      <Redraw on={epoch} />
      <Overlays survey={survey} />
      <CameraRig pit={aim.pit} floorRL={aim.floorRL} />
      <ViewOffset region=".stage" />
    </Canvas>
  )
}
