import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'
import type { PerspectiveCamera } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Vec2 } from '../domain/types'
import { sampleBilinear } from '../geo/grid'
import { useAppStore } from '../state/store'
import { useTerrain } from '../state/terrain'
import { useCameraState } from './cameraState'
import {
  easeInOutCubic,
  focusPose,
  headingOf,
  metresPerPixel,
  northUp,
  presetPose,
  type Pose,
  type V3,
} from './presets'
import { BASE_RL, toScene } from './terrainGeometry'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Flight {
  from: Pose
  to: Pose
  start: number
  ms: number
}

/**
 * Orbit/pan/zoom controls plus animated flights to the preset views.
 * @param pit     pit centre in scene x/z
 * @param floorRL approved floor RL, used to aim the camera into the pit
 */
export function CameraRig({ pit, floorRL }: { pit: Vec2; floorRL: number }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const flight = useRef<Flight | null>(null)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const exaggeration = useAppStore((s) => s.exaggeration)
  const view = useAppStore((s) => s.view)
  const focus = useAppStore((s) => s.focus)

  const floorY = (floorRL - BASE_RL) * exaggeration

  const publish = useCallback(() => {
    const c = controls.current
    if (!c) return
    const camera = c.object as PerspectiveCamera
    const pos = camera.position.toArray() as V3
    const target = c.target.toArray() as V3
    useCameraState.setState({
      heading: headingOf(pos, target),
      metresPerPixel: metresPerPixel(camera.position.distanceTo(c.target), camera.fov, size.height),
    })
  }, [size.height])

  const apply = useCallback(
    (p: Pose) => {
      const c = controls.current
      if (!c) return
      c.object.position.set(...p.position)
      c.target.set(...p.target)
      c.update()
      publish()
      invalidate()
    },
    [publish, invalidate],
  )

  const flyTo = useCallback(
    (to: Pose, ms: number) => {
      const c = controls.current
      if (!c) return
      if (reducedMotion()) return apply(to)
      flight.current = {
        from: { position: c.object.position.toArray() as V3, target: c.target.toArray() as V3 },
        to,
        start: performance.now(),
        ms,
      }
      invalidate()
    },
    [apply, invalidate],
  )

  // Opening shot: start high above the pit and settle into the oblique view.
  // Only on mount; later changes go through the view requests below.
  const floorYAtMount = useRef(floorY)
  const introDone = useRef(false)
  useEffect(() => {
    if (introDone.current) return
    introDone.current = true
    apply(presetPose('intro', pit, floorYAtMount.current))
    flyTo(presetPose('oblique', pit, floorYAtMount.current), 2600)
  }, [apply, flyTo, pit])

  useEffect(() => {
    if (view.n === 0) return
    const c = controls.current
    if (!c) return
    if (view.kind === 'north') {
      flyTo(northUp(c.object.position.toArray() as V3, c.target.toArray() as V3), 900)
    } else {
      flyTo(presetPose(view.kind, pit, floorY), view.kind === 'intro' ? 2600 : 1300)
    }
    // Only react to new requests, not to exaggeration changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.n])

  // Fly to a point on the ground (a finding picked in the list or on the map).
  useEffect(() => {
    if (!focus) return
    const survey = useTerrain.getState().surveys.current
    if (!survey) return
    const z = sampleBilinear(survey.grid, survey.elevations, focus.p) ?? BASE_RL
    const [x, , sz] = toScene(survey.grid, focus.p, z)
    flyTo(focusPose([x, (z - BASE_RL) * exaggeration, sz]), 1300)
    // Only react to new requests, not to exaggeration changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.n])

  // Keep the aim point on the same ground feature when the vertical scale changes.
  const lastEx = useRef(exaggeration)
  useEffect(() => {
    const c = controls.current
    if (!c || lastEx.current === exaggeration) return
    const before = c.target.y
    c.target.y *= exaggeration / lastEx.current
    c.object.position.y += c.target.y - before
    lastEx.current = exaggeration
    c.update()
    publish()
    invalidate()
  }, [exaggeration, publish, invalidate])

  useEffect(publish, [publish])

  useFrame(() => {
    const f = flight.current
    const c = controls.current
    if (!f || !c) return
    const t = Math.min(1, (performance.now() - f.start) / f.ms)
    const e = easeInOutCubic(t)
    const lerp = (a: V3, b: V3): V3 => [
      a[0] + (b[0] - a[0]) * e,
      a[1] + (b[1] - a[1]) * e,
      a[2] + (b[2] - a[2]) * e,
    ]
    c.object.position.set(...lerp(f.from.position, f.to.position))
    c.target.set(...lerp(f.from.target, f.to.target))
    c.update()
    publish()
    if (t < 1) invalidate()
    else flight.current = null
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.09}
      maxPolarAngle={1.42}
      minDistance={140}
      maxDistance={5600}
      screenSpacePanning={false}
      onStart={() => (flight.current = null)}
      onChange={publish}
    />
  )
}
