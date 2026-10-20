import { Line } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ComplianceFinding, TerrainSurvey } from '../domain/types'
import { sampleBilinear } from '../geo/grid'
import { useAppStore } from '../state/store'
import { useStory } from '../state/story'
import { useTerrain } from '../state/terrain'
import { buildMarks, toneOf } from './marks'
import { leaseLine } from './overlayGeometry'
import { TONE_COLOR } from './palette'
import { Terrain } from './Terrain'
import { BASE_RL, toScene } from './terrainGeometry'

/*
 * The home-page model: the same simulated surveys and engine output as the monitor,
 * slowly turning (whole block in frame) while the story steps change what it shows:
 *   baseline, morphing smoothly to current as the page scrolls between those two steps,
 *   then 3 measured change, 4+ findings with lease line and pins.
 * No controls, so scrolling the page is never captured by the canvas.
 */

const backdrop = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--color-backdrop').trim() ||
  '#e8e4d9'

/** Scroll position in time, 0 = baseline, 1 = current (read every frame). */
const readTime = () => useStory.getState().t

function Pin({ f, survey, ex }: { f: ComplianceFinding; survey: TerrainSurvey; ex: number }) {
  const head = useRef<THREE.Mesh>(null)
  const z = sampleBilinear(survey.grid, survey.elevations, f.centroid) ?? BASE_RL
  const [x, , sz] = toScene(survey.grid, f.centroid, z)
  const base = (z - BASE_RL) * ex
  const height = f.status === 'violation' ? 150 : 100
  const color = TONE_COLOR[toneOf(f)]
  useFrame(({ clock }) => {
    if (f.status === 'violation' && head.current && !reducedMotion()) {
      head.current.scale.setScalar(1 + 0.18 * Math.sin(clock.elapsedTime * 3))
    }
  })
  return (
    <group position={[x, base, sz]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[2.2, 2.2, height, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={head} position={[0, height, 0]}>
        <sphereGeometry args={[14, 20, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}

/** Camera elevation above the horizon, radians (about 38°). */
const ELEVATION = 0.66
/** Half the diagonal of the 2048 m block: the circle its corners sweep while turning. */
const SWEEP = Math.hypot(1024, 1024)
/** Block thickness in scene units at 1.5× (ground to the base of the sides). */
const THICKNESS = 260

/**
 * Slow orbit around the block centre. The distance is recomputed from the canvas size so
 * the whole block, corners included, stays in frame at every angle and aspect ratio.
 */
function Orbit({ target }: { target: [number, number, number] }) {
  const angle = useRef(0.55)
  useFrame(({ camera, size }, dt) => {
    if (!reducedMotion()) angle.current += dt * 0.045
    const cam = camera as THREE.PerspectiveCamera
    const v = THREE.MathUtils.degToRad(cam.fov) / 2
    const h = Math.atan(Math.tan(v) * (size.width / size.height))
    const halfW = SWEEP
    const halfH = SWEEP * Math.sin(ELEVATION) + (THICKNESS / 2) * Math.cos(ELEVATION)
    // Fit the wider of the two, plus room for the near corners looming larger.
    const d = Math.max(halfW / Math.tan(h), halfH / Math.tan(v)) + SWEEP * 0.2
    const flat = d * Math.cos(ELEVATION)
    camera.position.set(
      target[0] + Math.sin(angle.current) * flat,
      target[1] + d * Math.sin(ELEVATION),
      target[2] + Math.cos(angle.current) * flat,
    )
    camera.lookAt(target[0], target[1], target[2])
  })
  return null
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** `active` false stops rendering altogether (the story is scrolled out of view). */
export default function HomeScene({ step, active }: { step: number; active: boolean }) {
  const baseline = useTerrain((s) => s.surveys.baseline)
  const current = useTerrain((s) => s.surveys.current)
  const limits = useTerrain((s) => s.limits)
  const findings = useTerrain((s) => s.findings)
  const ex = useAppStore((s) => s.exaggeration)
  const fog = useMemo(() => backdrop(), [])

  const change = useTerrain((s) => s.change)
  const marks = useMemo(
    () =>
      current ? buildMarks(current.grid.cols * current.grid.rows, change, findings) : undefined,
    [current, change, findings],
  )
  const lease = useMemo(
    () => (current && limits ? leaseLine(current, limits.leaseBoundary, ex) : null),
    [current, limits, ex],
  )
  // Middle of the block: grid centre, halfway down its visible thickness.
  const target = useMemo<[number, number, number] | null>(
    () => (current ? [0, -60 * ex, 0] : null),
    [current, ex],
  )

  if (!baseline || !current || !target) return null
  const overlay: [number, number] = step >= 4 ? [0, 1] : step === 3 ? [1, 0] : [0, 0]

  return (
    <Canvas
      shadows="percentage"
      flat
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 2]}
      camera={{ fov: 35, near: 10, far: 16000, position: [0, 3000, 2000] }}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: 'none' }}
    >
      <fog attach="fog" args={[fog, 5200, 12000]} />
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
        survey={baseline}
        morphTo={current}
        morph={readTime}
        marks={marks}
        overlay={overlay}
      />
      {step >= 4 && lease && <Line points={lease} color="#fbfaf6" lineWidth={2.5} />}
      {step >= 4 && findings.map((f) => <Pin key={f.id} f={f} survey={current} ex={ex} />)}
      <Orbit target={target} />
    </Canvas>
  )
}
