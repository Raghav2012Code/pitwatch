import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Orthophoto, TerrainSurvey } from '../domain/types'
import { useAppStore } from '../state/store'
import type { TerrainMarks } from './marks'
import { OVERLAY, SOIL_PROFILE } from './palette'
import { BASE_RL, buildSkirtArrays, buildTerrainArrays } from './terrainGeometry'
import { makeSurfaceUniforms, type SurfaceUniforms } from './surfaceUniforms'

/*
 * Morph: every vertex also carries the other survey's height (aAltY) and normal
 * (aAltNormal); uMorph blends 0 = this survey, 1 = the other. Without a second survey the
 * alternates equal the originals, so uMorph has no effect.
 */
const MORPH_HEAD = 'attribute float aAltY;\nuniform float uMorph;\n'
const MORPH_POSITION =
  'vec3 transformed = vec3(position);\n  transformed.y = mix(position.y, aAltY, uMorph);'

const ELEVATION_VARYING = {
  head:
    MORPH_HEAD +
    'attribute vec3 aAltNormal;\nvarying float vElev;\nuniform float uBase;\nattribute float aChange;\nattribute vec3 aFinding;\nvarying float vChange;\nvarying vec3 vFinding;\n',
  normal: 'vec3 objectNormal = normalize(mix(vec3(normal), aAltNormal, uMorph));',
  body:
    MORPH_POSITION +
    '\n  vElev = transformed.y + uBase;\n  vChange = aChange;\n  vFinding = aFinding;',
}

type Uniform<T> = { value: T }

/**
 * Surface material: aerial image or elevation tint (blended by a uniform), lit by the
 * scene, with optional contour lines drawn in the fragment shader.
 */
function makeSurfaceMaterial(
  map: THREE.Texture | null,
  map2: THREE.Texture | null,
  morph: Uniform<number>,
  uniforms: SurfaceUniforms,
) {
  const m = new THREE.MeshStandardMaterial({
    map,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
  })
  // Per-material: x = change-map strength, y = findings strength (0–1, animated).
  const overlay = { value: new THREE.Vector2(0, 0) }
  m.userData.overlay = overlay
  const color = (hex: string) => ({ value: new THREE.Color(hex) })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, {
      uOverlay: overlay,
      uCut: color(OVERLAY.cut),
      uFill: color(OVERLAY.fill),
      uWarn: color(OVERLAY.warning),
      uViol: color(OVERLAY.violation),
      uCrit: color(OVERLAY.critical),
      uMorph: morph,
      uMap2: { value: map2 ?? map },
    })
    shader.vertexShader =
      ELEVATION_VARYING.head +
      shader.vertexShader
        .replace('#include <beginnormal_vertex>', ELEVATION_VARYING.normal)
        .replace('#include <begin_vertex>', ELEVATION_VARYING.body)
    shader.fragmentShader =
      'varying float vElev;\nuniform float uInterval;\nuniform float uContours;\nuniform float uTint;\nuniform vec3 uInk;\n' +
      'uniform float uMorph;\nuniform sampler2D uMap2;\n' +
      'varying float vChange;\nvarying vec3 vFinding;\nuniform vec2 uOverlay;\nuniform vec3 uCut;\nuniform vec3 uFill;\nuniform vec3 uWarn;\nuniform vec3 uViol;\nuniform vec3 uCrit;\n' +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
  // With the tint on, keep the photo's light and dark detail (tracks, scrub, rock) at
  // reduced strength, so the tint reads as a survey layer over real ground.
  vec4 photo = mix(texture2D(map, vMapUv), texture2D(uMap2, vMapUv), uMorph);
  float luma = dot(photo.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 detail = vec3(clamp(mix(1.0, luma / 0.22, 0.35), 0.75, 1.2));
  diffuseColor.rgb *= mix(photo.rgb, detail, uTint);
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
  diffuseColor.rgb = mix(diffuseColor.rgb, uInk, uContours * max(minor * 0.22, major * 0.45));

  // Overlays: unchanged ground dims so the marked cells stand out.
  float cutW = clamp(-vChange, 0.0, 1.0);
  float fillW = clamp(vChange, 0.0, 1.0);
  float changed = cutW + fillW;
  vec3 changeCol = (cutW * uCut + fillW * uFill) / max(changed, 1e-3);
  diffuseColor.rgb *= 1.0 - 0.35 * uOverlay.x * (1.0 - changed);
  diffuseColor.rgb = mix(diffuseColor.rgb, changeCol, 0.82 * uOverlay.x * changed);
  float flagged = clamp(vFinding.x + vFinding.y + vFinding.z, 0.0, 1.0);
  vec3 findCol = (vFinding.x * uWarn + vFinding.y * uViol + vFinding.z * uCrit) / max(flagged, 1e-3);
  diffuseColor.rgb *= 1.0 - 0.35 * uOverlay.y * (1.0 - flagged);
  diffuseColor.rgb = mix(diffuseColor.rgb, findCol, 0.88 * uOverlay.y * flagged);`,
        )
  }
  m.customProgramCacheKey = () => `terrain-surface-${map ? 'map' : 'tint'}`
  return m
}

/**
 * Block sides painted as a soil profile by depth below the ground above: topsoil,
 * red laterite, weathered rock, bedrock, with soft transitions and faint bedding.
 */
function makeSkirtMaterial(morph: Uniform<number>) {
  const m = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide })
  const c = Object.fromEntries(
    Object.entries(SOIL_PROFILE).map(([k, v]) => [k, { value: new THREE.Color(v) }]),
  )
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uBase = { value: BASE_RL }
    shader.uniforms.uMorph = morph
    Object.assign(shader.uniforms, {
      uTopsoil: c.topsoil,
      uLaterite: c.laterite,
      uSaprolite: c.saprolite,
      uBedrock: c.bedrock,
    })
    shader.vertexShader =
      MORPH_HEAD +
      'attribute float aTop;\nattribute float aAltTop;\nvarying float vDepth;\nvarying float vElev;\nuniform float uBase;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        MORPH_POSITION +
          '\n  vElev = transformed.y + uBase;\n  vDepth = mix(aTop, aAltTop, uMorph) - vElev;',
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

/** Shadow-map material that follows the morph, so shadows match the blended surface. */
function makeDepthMaterial(morph: Uniform<number>) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uMorph = morph
    shader.vertexShader =
      MORPH_HEAD + shader.vertexShader.replace('#include <begin_vertex>', MORPH_POSITION)
  }
  m.customProgramCacheKey = () => 'terrain-depth-morph'
  return m
}

/** Vertex normals of a surface built from `elevations`, for the morph target. */
function normalsOf(g: TerrainSurvey['grid'], elevations: Float32Array) {
  const t = buildTerrainArrays(g, elevations)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(t.positions, 3))
  geo.setIndex(new THREE.BufferAttribute(t.index, 1))
  geo.computeVertexNormals()
  const n = geo.getAttribute('normal').array as Float32Array
  geo.dispose()
  return n
}

/** The y of each xyz position. */
const ys = (positions: Float32Array) => positions.filter((_, i) => i % 3 === 1)

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

/**
 * Terrain surface plus block sides. Built once per survey; exaggeration is a y-scale.
 * Optional `marks` with `overlay` = [change, findings] strengths (0–1) colour cells on the
 * surface; strengths ease towards their targets. Optional `morphTo` (same grid) with
 * `morph` (read every frame, 0–1) blends shape, shading and image towards that survey.
 */
export function Terrain({
  survey,
  marks,
  overlay = [0, 0],
  morphTo,
  morph,
  onPick,
}: {
  survey: TerrainSurvey
  marks?: TerrainMarks
  overlay?: readonly [number, number]
  morphTo?: TerrainSurvey
  morph?: () => number
  /** Called with the world position of a click (not a drag) on the surface. */
  onPick?: (point: THREE.Vector3) => void
}) {
  const exaggeration = useAppStore((s) => s.exaggeration)
  const layers = useAppStore((s) => s.layers)
  const invalidate = useThree((s) => s.invalidate)
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy())

  const geometry = useMemo(() => {
    const t = buildTerrainArrays(survey.grid, survey.elevations)
    const s = buildSkirtArrays(survey.grid, survey.elevations)
    const n = survey.grid.cols * survey.grid.rows
    const alt = morphTo ?? survey
    const altSkirt = morphTo ? buildSkirtArrays(alt.grid, alt.elevations) : s
    const surface = geometryFrom(t.positions, t.index, {
      color: [t.colors, 3],
      uv: [t.uvs, 2],
      aChange: [marks?.change ?? new Float32Array(n), 1],
      aFinding: [marks?.finding ?? new Float32Array(n * 3), 3],
      aAltY: [Float32Array.from(alt.elevations, (z) => z - BASE_RL), 1],
    })
    const ownNormals = surface.getAttribute('normal').array as Float32Array
    surface.setAttribute(
      'aAltNormal',
      new THREE.BufferAttribute(morphTo ? normalsOf(alt.grid, alt.elevations) : ownNormals, 3),
    )
    return {
      surface,
      skirt: geometryFrom(s.positions, s.index, {
        aTop: [s.tops, 1],
        aAltTop: [altSkirt.tops, 1],
        aAltY: [ys(altSkirt.positions), 1],
      }),
    }
  }, [survey, morphTo, marks])

  const texture = useMemo(
    () => (survey.orthophoto ? orthoTexture(survey.orthophoto, maxAnisotropy) : null),
    [survey, maxAnisotropy],
  )
  const texture2 = useMemo(
    () => (morphTo?.orthophoto ? orthoTexture(morphTo.orthophoto, maxAnisotropy) : null),
    [morphTo, maxAnisotropy],
  )
  const materials = useMemo(() => {
    const morphU = { value: 0 }
    // This surface owns its layer uniforms; the setter below is the only thing that writes them.
    const uniforms = makeSurfaceUniforms()
    return {
      getMorph: () => morphU.value,
      setMorph: (v: number) => {
        morphU.value = v
      },
      setLayers: (contours: boolean, tint: boolean) => {
        uniforms.uContours.value = contours ? 1 : 0
        uniforms.uTint.value = tint ? 1 : 0
      },
      surface: makeSurfaceMaterial(texture, texture2, morphU, uniforms),
      skirt: makeSkirtMaterial(morphU),
      depth: makeDepthMaterial(morphU),
    }
  }, [texture, texture2])

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
      texture2?.dispose()
      materials.surface.dispose()
      materials.skirt.dispose()
      materials.depth.dispose()
    },
    [texture, texture2, materials],
  )

  // Without an aerial image the tint is the only colouring available.
  const tint = layers.tint || !texture
  const setLayers = materials.setLayers
  useEffect(() => {
    setLayers(layers.contours, tint)
    invalidate()
  }, [layers.contours, tint, invalidate, setLayers])

  // Ease overlay strengths towards their targets (about 0.6 s).
  const [targetChange, targetFindings] = overlay
  useFrame((_, dt) => {
    if (morph) {
      // Glide towards the requested blend instead of jumping with each scroll event.
      const target = Math.min(1, Math.max(0, morph()))
      const m = materials.getMorph()
      if (Math.abs(target - m) > 1e-4) {
        materials.setMorph(
          Math.abs(target - m) < 0.002 ? target : m + (target - m) * Math.min(1, dt * 8),
        )
        invalidate()
      }
    }
    const u = (materials.surface.userData.overlay as { value: THREE.Vector2 }).value
    const k = Math.min(1, dt * 5)
    const dx = targetChange - u.x
    const dy = targetFindings - u.y
    if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) return
    u.set(u.x + dx * k, u.y + dy * k)
    invalidate()
  })

  return (
    <group scale={[1, exaggeration, 1]} visible={layers.terrain}>
      <mesh
        geometry={geometry.surface}
        material={materials.surface}
        customDepthMaterial={materials.depth}
        castShadow
        receiveShadow
        onClick={
          onPick
            ? (e) => {
                if (e.delta > 4) return // a drag, not a click
                e.stopPropagation()
                onPick(e.point)
              }
            : undefined
        }
      />
      <mesh geometry={geometry.skirt} material={materials.skirt} receiveShadow />
    </group>
  )
}
