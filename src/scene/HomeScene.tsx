import { Line } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type * as THREE from 'three'
import type { ComplianceFinding, Polygon, TerrainSurvey } from '../domain/types'
import { centroidOf } from '../geo/polygon'
import { sampleBilinear } from '../geo/grid'
import { useAppStore } from '../state/store'
import { useTerrain } from '../state/terrain'
import { OVERLAY } from './palette'
import { Terrain, type TerrainMarks } from './Terrain'
import { BASE_RL, toScene } from './terrainGeometry'

/*
 * The home-page model: the same simulated surveys and engine output as the monitor,
 * slowly turning while the story steps change what it shows:
 *   0–1 baseline, 2 current, 3 measured change, 4+ findings with lease line and pins.
 * No controls, so scrolling the page is never captured by the canvas.
 */

const backdrop = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--color-backdrop').trim() ||
  '#e8e4d9'

const TONE_COLOR = {
  warning: OVERLAY.warning,
  violation: OVERLAY.violation,
  critical: OVERLAY.critical,
} as const

const toneOf = (f: ComplianceFinding) => (f.severity === 'critical' ? 'critical' : f.status)

function buildMarks(survey: TerrainSurvey, findings: readonly ComplianceFinding[]) {
  const n = survey.grid.cols * survey.grid.rows
  const change = useTerrain.getState().change
  const marks: TerrainMarks = { change: new Float32Array(n), finding: new Float32Array(n * 3) }
  if (change) {
    for (let i = 0; i < n; i++)
      marks.change[i] = change.excavated[i] ? -1 : change.filled[i] ? 1 : 0
  }
  const slot = { warning: 0, violation: 1, critical: 2 }
  for (const f of findings) {
    for (const i of f.cells) marks.finding[i * 3 + slot[toneOf(f)]] = 1
  }
  return marks
}

/** Polyline along the lease boundary, a few metres above the ground, every ~16 m. */
function leaseLine(survey: TerrainSurvey, lease: Polygon, ex: number) {
  const pts: [number, number, number][] = []
  for (let k = 0; k < lease.length; k++) {
    const a = lease[k]
    const b = lease[(k + 1) % lease.length]
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 16))
    for (let s = 0; s <= steps; s++) {
      const p = { x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps }
      const z = sampleBilinear(survey.grid, survey.elevations, p) ?? BASE_RL
      const [x, , sz] = toScene(survey.grid, p, z)
      pts.push([x, (z - BASE_RL) * ex + 6, sz])
    }
  }
  return pts
}

function Pin({ f, survey, ex }: { f: ComplianceFinding; survey: TerrainSurvey; ex: number }) {
  const head = useRef<THREE.Mesh>(null)
  const z = sampleBilinear(survey.grid, survey.elevations, f.centroid) ?? BASE_RL
  const [x, , sz] = toScene(survey.grid, f.centroid, z)
  const base = (z - BASE_RL) * ex
  const height = f.status === 'violation' ? 150 : 100
  const color = TONE_COLOR[toneOf(f)]
  useFrame(({ clock }) => {
    if (f.status === 'violation' && head.current) {
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

/** Slow orbit around the pit. */
function Orbit({ target }: { target: [number, number, number] }) {
  const angle = useRef(0.55)
  useFrame(({ camera }, dt) => {
    angle.current += dt * 0.045
    const r = 2050
    camera.position.set(
      target[0] + Math.sin(angle.current) * r,
      target[1] + 1550,
      target[2] + Math.cos(angle.current) * r,
    )
    camera.lookAt(target[0], target[1], target[2])
  })
  return null
}

export default function HomeScene({ step }: { step: number }) {
  const baseline = useTerrain((s) => s.surveys.baseline)
  const current = useTerrain((s) => s.surveys.current)
  const limits = useTerrain((s) => s.limits)
  const findings = useTerrain((s) => s.findings)
  const ex = useAppStore((s) => s.exaggeration)
  const fog = useMemo(() => backdrop(), [])

  const marks = useMemo(
    () => (current ? buildMarks(current, findings) : undefined),
    [current, findings],
  )
  const lease = useMemo(
    () => (current && limits ? leaseLine(current, limits.leaseBoundary, ex) : null),
    [current, limits, ex],
  )
  const target = useMemo<[number, number, number] | null>(() => {
    if (!current || !limits) return null
    const c = centroidOf(limits.pitZones[0].polygon)
    const [x, , z] = toScene(current.grid, c, 360)
    return [x, -40 * ex, z]
  }, [current, limits, ex])

  if (!baseline || !current || !target) return null
  const overlay: [number, number] = step >= 4 ? [0, 1] : step === 3 ? [1, 0] : [0, 0]

  return (
    <Canvas
      shadows="percentage"
      flat
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
      <group visible={step < 2}>
        <Terrain survey={baseline} />
      </group>
      <group visible={step >= 2}>
        <Terrain survey={current} marks={marks} overlay={overlay} />
      </group>
      {step >= 4 && lease && <Line points={lease} color="#fbfaf6" lineWidth={2.5} />}
      {step >= 4 && findings.map((f) => <Pin key={f.id} f={f} survey={current} ex={ex} />)}
      <Orbit target={target} />
    </Canvas>
  )
}
