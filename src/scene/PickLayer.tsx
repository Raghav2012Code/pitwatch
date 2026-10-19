import { Line } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { TerrainSurvey, Vec2 } from '../domain/types'
import { profileAlong } from '../geo/profile'
import { useAppStore } from '../state/store'
import { onGround } from './overlayGeometry'
import { OVERLAY } from './palette'
import { useScreenHeight } from './useScreenSize'

const SIZE_PX = 22

/** Round marker: a letter for the measure ends, a ring with a centre dot for an inspected point. */
function markerTexture(label: string) {
  const px = 3
  const w = 24
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = w * px
  const c = canvas.getContext('2d')!
  c.scale(px, px)
  c.beginPath()
  c.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2)
  c.fillStyle = label ? OVERLAY.accent : OVERLAY.lease
  c.fill()
  c.lineWidth = 2
  c.strokeStyle = label ? OVERLAY.lease : OVERLAY.accent
  c.stroke()
  if (label) {
    c.fillStyle = OVERLAY.lease
    c.font = '700 12px "JetBrains Mono Variable", ui-monospace, monospace'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(label, w / 2, w / 2 + 0.5)
  } else {
    c.beginPath()
    c.arc(w / 2, w / 2, 3, 0, Math.PI * 2)
    c.fillStyle = OVERLAY.accent
    c.fill()
  }
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Marker({
  survey,
  p,
  label,
  ex,
}: {
  survey: TerrainSurvey
  p: Vec2
  label: string
  ex: number
}) {
  const map = useMemo(() => markerTexture(label), [label])
  useEffect(() => () => map.dispose(), [map])
  const h = useScreenHeight(SIZE_PX)
  return (
    <sprite
      position={onGround(survey, p, ex, 8)}
      scale={[h, h, 1]}
      renderOrder={11}
      // Never intercept clicks meant for the terrain underneath.
      raycast={() => null}
    >
      <spriteMaterial map={map} sizeAttenuation={false} depthTest={false} transparent />
    </sprite>
  )
}

/** The inspected point, and the measure line with its two ends, on the current survey. */
export function PickLayer({ survey }: { survey: TerrainSurvey }) {
  const picked = useAppStore((s) => s.picked)
  const a = useAppStore((s) => s.measureA)
  const b = useAppStore((s) => s.measureB)
  const ex = useAppStore((s) => s.exaggeration)

  const line = useMemo(() => {
    if (!a || !b) return null
    const { points } = profileAlong(survey.grid, a, b)
    return points.map((p) => onGround(survey, p, ex, 5))
  }, [survey, a, b, ex])

  return (
    <>
      {picked && <Marker survey={survey} p={picked} label="" ex={ex} />}
      {line && <Line points={line} color={OVERLAY.accent} lineWidth={3} />}
      {a && <Marker survey={survey} p={a} label="A" ex={ex} />}
      {b && <Marker survey={survey} p={b} label="B" ex={ex} />}
    </>
  )
}
