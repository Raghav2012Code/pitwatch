import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { TerrainSurvey } from '../domain/types'
import { useAppStore } from '../state/store'
import { CONTOUR_INK, STRATA_BANDS } from './palette'
import { BASE_RL, buildSkirtArrays, buildTerrainArrays } from './terrainGeometry'

/* Shared uniforms: flipping contours on or off is a uniform change, not a recompile. */
const contourUniforms = {
  uBase: { value: BASE_RL },
  uInterval: { value: 5 },
  uShow: { value: 1 },
  uInk: { value: new THREE.Color(CONTOUR_INK) },
}

/** Lit, vertex-tinted terrain with contour lines drawn in the fragment shader. */
function makeTerrainMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, contourUniforms)
    shader.vertexShader =
      'varying float vElev;\nuniform float uBase;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vElev = position.y + uBase;',
      )
    shader.fragmentShader =
      'varying float vElev;\nuniform float uInterval;\nuniform float uShow;\nuniform vec3 uInk;\n' +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  // Distance to the nearest contour, in screen pixels, gives a crisp ~1 px line at any zoom.
  float f = vElev / uInterval;
  float minor = 1.0 - smoothstep(0.0, 1.0, abs(fract(f - 0.5) - 0.5) / max(fwidth(f), 1e-4));
  float g = vElev / (uInterval * 5.0);
  float major = 1.0 - smoothstep(0.0, 1.6, abs(fract(g - 0.5) - 0.5) / max(fwidth(g), 1e-4));
  diffuseColor.rgb = mix(diffuseColor.rgb, uInk, uShow * max(minor * 0.26, major * 0.55));`,
      )
  }
  m.customProgramCacheKey = () => 'terrain-contours'
  return m
}

/** Block sides painted with horizontal rock layers by elevation, like a block diagram. */
function makeSkirtMaterial() {
  const m = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide })
  const bands = STRATA_BANDS.map((c) => new THREE.Color(c))
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uBase = { value: BASE_RL }
    shader.uniforms.uBands = { value: bands }
    shader.vertexShader =
      'varying float vElev;\nuniform float uBase;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vElev = position.y + uBase;',
      )
    shader.fragmentShader =
      `varying float vElev;\nuniform vec3 uBands[${bands.length}];\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  int band = int(mod(floor((470.0 - vElev) / 14.0), ${bands.length}.0));
  diffuseColor.rgb = uBands[band] * 0.92;`,
      )
  }
  m.customProgramCacheKey = () => 'terrain-skirt'
  return m
}

function geometryFrom(positions: Float32Array, index: Uint32Array, colors?: Float32Array) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  if (colors) g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.setIndex(new THREE.BufferAttribute(index, 1))
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

/** Terrain surface plus block sides. Built once per survey; exaggeration is a y-scale. */
export function Terrain({ survey }: { survey: TerrainSurvey }) {
  const exaggeration = useAppStore((s) => s.exaggeration)
  const layers = useAppStore((s) => s.layers)
  const invalidate = useThree((s) => s.invalidate)

  const geometry = useMemo(() => {
    const t = buildTerrainArrays(survey.grid, survey.elevations)
    const s = buildSkirtArrays(survey.grid, survey.elevations)
    return {
      surface: geometryFrom(t.positions, t.index, t.colors),
      skirt: geometryFrom(s.positions, s.index),
    }
  }, [survey])
  const materials = useMemo(
    () => ({ surface: makeTerrainMaterial(), skirt: makeSkirtMaterial() }),
    [],
  )

  useEffect(
    () => () => {
      geometry.surface.dispose()
      geometry.skirt.dispose()
    },
    [geometry],
  )
  useEffect(
    () => () => {
      materials.surface.dispose()
      materials.skirt.dispose()
    },
    [materials],
  )

  useEffect(() => {
    contourUniforms.uShow.value = layers.contours ? 1 : 0
    invalidate()
  }, [layers.contours, invalidate])

  return (
    <group scale={[1, exaggeration, 1]} visible={layers.terrain}>
      <mesh geometry={geometry.surface} material={materials.surface} castShadow receiveShadow />
      <mesh geometry={geometry.skirt} material={materials.skirt} receiveShadow />
    </group>
  )
}
