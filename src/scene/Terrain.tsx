import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Orthophoto, TerrainSurvey } from '../domain/types'
import { useAppStore } from '../state/store'
import { CONTOUR_INK, SOIL_PROFILE } from './palette'
import { BASE_RL, buildSkirtArrays, buildTerrainArrays } from './terrainGeometry'

/* Shared uniforms: layer switches are uniform changes, not shader recompiles. */
const surfaceUniforms = {
  uBase: { value: BASE_RL },
  uInterval: { value: 5 },
  uContours: { value: 0 },
  /** 0 = aerial image, 1 = hypsometric tint. */
  uTint: { value: 0 },
  uInk: { value: new THREE.Color(CONTOUR_INK) },
}

const ELEVATION_VARYING = {
  head: 'varying float vElev;\nuniform float uBase;\n',
  body: '#include <begin_vertex>\n  vElev = position.y + uBase;',
}

/**
 * Surface material: aerial image or elevation tint (blended by a uniform), lit by the
 * scene, with optional contour lines drawn in the fragment shader.
 */
function makeSurfaceMaterial(map: THREE.Texture | null) {
  const m = new THREE.MeshStandardMaterial({
    map,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
  })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, surfaceUniforms)
    shader.vertexShader =
      ELEVATION_VARYING.head +
      shader.vertexShader.replace('#include <begin_vertex>', ELEVATION_VARYING.body)
    shader.fragmentShader =
      'varying float vElev;\nuniform float uInterval;\nuniform float uContours;\nuniform float uTint;\nuniform vec3 uInk;\n' +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
  diffuseColor *= mix(texture2D(map, vMapUv), vec4(1.0), uTint);
#endif`,
        )
        .replace(
          '#include <color_fragment>',
          `#ifdef USE_COLOR
  diffuseColor.rgb *= mix(vec3(1.0), vColor.rgb, uTint);
#endif
  // Distance to the nearest contour in screen pixels gives a crisp ~1 px line at any zoom.
  float f = vElev / uInterval;
  float minor = 1.0 - smoothstep(0.0, 1.0, abs(fract(f - 0.5) - 0.5) / max(fwidth(f), 1e-4));
  float g = vElev / (uInterval * 5.0);
  float major = 1.0 - smoothstep(0.0, 1.6, abs(fract(g - 0.5) - 0.5) / max(fwidth(g), 1e-4));
  diffuseColor.rgb = mix(diffuseColor.rgb, uInk, uContours * max(minor * 0.22, major * 0.45));`,
        )
  }
  m.customProgramCacheKey = () => `terrain-surface-${map ? 'map' : 'tint'}`
  return m
}

/**
 * Block sides painted as a soil profile by depth below the ground above: topsoil,
 * red laterite, weathered rock, bedrock, with soft transitions and faint bedding.
 */
function makeSkirtMaterial() {
  const m = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide })
  const c = Object.fromEntries(
    Object.entries(SOIL_PROFILE).map(([k, v]) => [k, { value: new THREE.Color(v) }]),
  )
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uBase = { value: BASE_RL }
    Object.assign(shader.uniforms, {
      uTopsoil: c.topsoil,
      uLaterite: c.laterite,
      uSaprolite: c.saprolite,
      uBedrock: c.bedrock,
    })
    shader.vertexShader =
      'attribute float aTop;\nvarying float vDepth;\nvarying float vElev;\nuniform float uBase;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vElev = position.y + uBase;\n  vDepth = aTop - vElev;',
      )
    shader.fragmentShader =
      'varying float vDepth;\nvarying float vElev;\nuniform vec3 uTopsoil;\nuniform vec3 uLaterite;\nuniform vec3 uSaprolite;\nuniform vec3 uBedrock;\n' +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  vec3 soil = uTopsoil;
  soil = mix(soil, uLaterite, smoothstep(0.6, 2.0, vDepth));
  soil = mix(soil, uSaprolite, smoothstep(7.0, 13.0, vDepth));
  soil = mix(soil, uBedrock, smoothstep(22.0, 34.0, vDepth));
  // Faint horizontal bedding so the cut face does not look painted flat.
  soil *= 0.9 + 0.05 * sin(vElev * 2.3) + 0.03 * sin(vElev * 7.1);
  diffuseColor.rgb = soil * 0.82;`,
      )
  }
  m.customProgramCacheKey = () => 'terrain-skirt-soil'
  return m
}

function orthoTexture(photo: Orthophoto, maxAnisotropy: number) {
  const t = new THREE.DataTexture(photo.rgba, photo.width, photo.height, THREE.RGBAFormat)
  t.colorSpace = THREE.SRGBColorSpace
  t.flipY = false // row 0 is the southern edge, matching v = 0 in the mesh UVs
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.generateMipmaps = true
  t.anisotropy = Math.min(8, maxAnisotropy)
  t.needsUpdate = true
  return t
}

function geometryFrom(
  positions: Float32Array,
  index: Uint32Array,
  extra: Record<string, [Float32Array, number]> = {},
) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  for (const [name, [data, size]] of Object.entries(extra)) {
    g.setAttribute(name, new THREE.BufferAttribute(data, size))
  }
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
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy())

  const geometry = useMemo(() => {
    const t = buildTerrainArrays(survey.grid, survey.elevations)
    const s = buildSkirtArrays(survey.grid, survey.elevations)
    return {
      surface: geometryFrom(t.positions, t.index, { color: [t.colors, 3], uv: [t.uvs, 2] }),
      skirt: geometryFrom(s.positions, s.index, { aTop: [s.tops, 1] }),
    }
  }, [survey])

  const texture = useMemo(
    () => (survey.orthophoto ? orthoTexture(survey.orthophoto, maxAnisotropy) : null),
    [survey, maxAnisotropy],
  )
  const materials = useMemo(
    () => ({ surface: makeSurfaceMaterial(texture), skirt: makeSkirtMaterial() }),
    [texture],
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
      texture?.dispose()
      materials.surface.dispose()
      materials.skirt.dispose()
    },
    [texture, materials],
  )

  // Without an aerial image the tint is the only colouring available.
  const tint = layers.tint || !texture
  useEffect(() => {
    surfaceUniforms.uContours.value = layers.contours ? 1 : 0
    surfaceUniforms.uTint.value = tint ? 1 : 0
    invalidate()
  }, [layers.contours, tint, invalidate])

  return (
    <group scale={[1, exaggeration, 1]} visible={layers.terrain}>
      <mesh geometry={geometry.surface} material={materials.surface} castShadow receiveShadow />
      <mesh geometry={geometry.skirt} material={materials.skirt} receiveShadow />
    </group>
  )
}
