import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { centroidOf } from '../geo/polygon'
import { useTerrain } from '../state/terrain'
import { CameraRig } from './CameraRig'
import { Terrain } from './Terrain'
import { toScene } from './terrainGeometry'

/** Paper colour behind the model; fog fades distant terrain into it. */
const paper = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--color-bg-2').trim() || '#ece9e1'

/**
 * The 3D view: current survey surface on a block, lit from the north-west (the
 * cartographic convention, so relief reads correctly), with orbit controls.
 * Loaded lazily so three.js is only fetched when the monitor opens.
 */
export default function TerrainScene() {
  const survey = useTerrain((s) => s.surveys.current)
  const limits = useTerrain((s) => s.limits)
  const fog = useMemo(() => paper(), [])

  const aim = useMemo(() => {
    if (!survey || !limits) return null
    const zone = limits.pitZones[0]
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
      <hemisphereLight args={['#fffaf0', '#5f5040', 0.75]} />
      <directionalLight
        position={[-1700, 1500, -1100]}
        intensity={2.6}
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
      <Terrain survey={survey} />
      <CameraRig pit={aim.pit} floorRL={aim.floorRL} />
    </Canvas>
  )
}
