import { Line } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ComplianceFinding, TerrainSurvey } from '../domain/types'
import { insetSegments } from '../geo/polygon'
import { useAppStore } from '../state/store'
import { useTerrain } from '../state/terrain'
import { toneOf } from './marks'
import { OVERLAY, TONE_COLOR } from './palette'
import { leaseLine, onGround } from './overlayGeometry'

/** Badge size on screen, pixels tall. */
const BADGE_PX = 26
const BADGE_W = 76
const BADGE_H = 28

/** Polygon outline per tone, so the shape (not just the colour) tells the severity. */
const SHAPE = {
  warning: { sides: 3, turn: -Math.PI / 2 },
  violation: { sides: 8, turn: Math.PI / 8 },
  critical: { sides: 4, turn: 0 },
}

/** Paper badge: severity shape in the tone colour, then the finding id. */
function badgeTexture(tone: keyof typeof SHAPE, id: string) {
  const px = 3
  const canvas = document.createElement('canvas')
  canvas.width = BADGE_W * px
  canvas.height = BADGE_H * px
  const c = canvas.getContext('2d')!
  c.scale(px, px)
  c.fillStyle = OVERLAY.lease
  c.strokeStyle = TONE_COLOR[tone]
  c.lineWidth = 2
  c.beginPath()
  c.roundRect(1, 1, BADGE_W - 2, BADGE_H - 2, (BADGE_H - 2) / 2)
  c.fill()
  c.stroke()
  const { sides, turn } = SHAPE[tone]
  const [cx, cy, r] = [15, BADGE_H / 2, 10.5]
  c.fillStyle = TONE_COLOR[tone]
  c.beginPath()
  for (let i = 0; i < sides; i++) {
    const t = turn + (i * 2 * Math.PI) / sides
    c.lineTo(cx + r * Math.cos(t), cy + r * Math.sin(t))
  }
  c.closePath()
  c.fill()
  // Same inner marks as the panel glyphs: cross for a violation, bar and dot otherwise.
  c.strokeStyle = OVERLAY.lease
  c.lineWidth = 1.8
  c.lineCap = 'round'
  c.beginPath()
  if (tone === 'violation') {
    c.moveTo(cx - 3.5, cy - 3.5)
    c.lineTo(cx + 3.5, cy + 3.5)
    c.moveTo(cx + 3.5, cy - 3.5)
    c.lineTo(cx - 3.5, cy + 3.5)
  } else {
    const dy = tone === 'warning' ? 1.5 : 0
    c.moveTo(cx, cy - 4 + dy)
    c.lineTo(cx, cy + 0.5 + dy)
    c.moveTo(cx, cy + 3.4 + dy)
    c.lineTo(cx, cy + 3.5 + dy)
  }
  c.stroke()
  c.fillStyle = OVERLAY.badgeInk
  c.font = '600 12px "JetBrains Mono Variable", ui-monospace, monospace'
  c.textBaseline = 'middle'
  c.fillText(id, 29, BADGE_H / 2 + 0.5)
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Stick with a badge on top. The badge keeps its screen size at any zoom. */
function FindingPin({
  f,
  survey,
  ex,
}: {
  f: ComplianceFinding
  survey: TerrainSurvey
  ex: number
}) {
  const tone = toneOf(f)
  const [x, y, z] = onGround(survey, f.centroid, ex, 0)
  const height = 90
  const size = useThree((s) => s.size)
  const fov = useThree((s) => (s.camera as THREE.PerspectiveCamera).fov)
  const map = useMemo(() => badgeTexture(tone, f.id), [tone, f.id])
  useEffect(() => () => map.dispose(), [map])
  // Unattenuated sprites are sized in view-space units: fraction of height × 2·tan(fov/2).
  const h = (BADGE_PX / size.height) * 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[1.6, 1.6, height, 6]} />
        <meshBasicMaterial color={TONE_COLOR[tone]} />
      </mesh>
      <sprite position={[0, height, 0]} scale={[h * (BADGE_W / BADGE_H), h, 1]} renderOrder={10}>
        <spriteMaterial map={map} sizeAttenuation={false} depthTest={false} transparent />
      </sprite>
    </group>
  )
}

/** Permit and finding overlays for the monitor, driven by the layer switches. */
export function Overlays({ survey }: { survey: TerrainSurvey }) {
  const limits = useTerrain((s) => s.limits)
  const findings = useTerrain((s) => s.findings)
  const layers = useAppStore((s) => s.layers)
  const ex = useAppStore((s) => s.exaggeration)

  const lease = useMemo(
    () => (limits ? leaseLine(survey, limits.leaseBoundary, ex) : null),
    [survey, limits, ex],
  )
  // Marching squares over the lease is the slow part; it only depends on the permit.
  const bufferPlan = useMemo(
    () => (limits ? insetSegments(limits.leaseBoundary, limits.safetyBufferMetres) : null),
    [limits],
  )
  const buffer = useMemo(
    () => bufferPlan?.map((p) => onGround(survey, p, ex)) ?? null,
    [bufferPlan, survey, ex],
  )

  return (
    <>
      {layers.lease && lease && <Line points={lease} color={OVERLAY.lease} lineWidth={2.5} />}
      {layers.buffer && buffer && buffer.length > 0 && (
        <Line
          points={buffer}
          segments
          color={OVERLAY.lease}
          lineWidth={1.2}
          transparent
          opacity={0.7}
        />
      )}
      {layers.findings &&
        findings.map((f) => <FindingPin key={f.id} f={f} survey={survey} ex={ex} />)}
    </>
  )
}
