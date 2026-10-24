import { describe, expect, it } from 'vitest'
import type { GridSpec } from '../domain/types'
import { extent } from '../geo/grid'
import { BASE_RL, buildSkirtArrays, buildTerrainArrays, SKIRT_RL } from './terrainGeometry'

const grid: GridSpec = { cols: 513, rows: 513, cellSize: 4, originXY: { x: 0, y: 0 } }
const elevations = Float32Array.from(
  { length: grid.cols * grid.rows },
  (_, i) => 400 + (i % grid.cols) * 0.001 + Math.floor(i / grid.cols) * 0.002,
)

describe('513 × 513 terrain geometry', () => {
  it('covers the 0–2048 m grid extent with expected surface counts and bounded UVs', () => {
    const { positions, uvs, index } = buildTerrainArrays(grid, elevations)

    expect(positions.length / 3).toBe(513 * 513)
    expect(index.length).toBe(512 * 512 * 6)
    expect(extent(grid)).toEqual({ min: { x: 0, y: 0 }, max: { x: 2048, y: 2048 } })
    expect([positions[0] + 1024, -positions[2] + 1024]).toEqual([0, 0])
    const last = positions.length - 3
    expect([positions[last] + 1024, -positions[last + 2] + 1024]).toEqual([2048, 2048])
    let minUv = Infinity
    let maxUv = -Infinity
    for (let i = 0; i < uvs.length; i += 2) {
      minUv = Math.min(minUv, uvs[i], uvs[i + 1])
      maxUv = Math.max(maxUv, uvs[i], uvs[i + 1])
    }
    expect(minUv).toBe(0)
    expect(maxUv).toBe(1)
  })

  it('produces finite surface coordinates and upward finite triangle normals', () => {
    const { positions, index } = buildTerrainArrays(grid, elevations)
    expect(positions.every(Number.isFinite)).toBe(true)

    let finiteNormals = true
    let upwardNormals = true
    for (let i = 0; i < index.length; i += 3) {
      const a = index[i] * 3
      const b = index[i + 1] * 3
      const c = index[i + 2] * 3
      const ux = positions[b] - positions[a]
      const uy = positions[b + 1] - positions[a + 1]
      const uz = positions[b + 2] - positions[a + 2]
      const vx = positions[c] - positions[a]
      const vy = positions[c + 1] - positions[a + 1]
      const vz = positions[c + 2] - positions[a + 2]
      const normal = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
      finiteNormals &&= normal.every(Number.isFinite)
      upwardNormals &&= normal[1] > 0
    }
    expect(finiteNormals).toBe(true)
    expect(upwardNormals).toBe(true)
  })

  it('covers every perimeter point with top and skirt vertices', () => {
    const { positions, tops, index } = buildSkirtArrays(grid, elevations)
    const perimeterPoints = 4 * (grid.cols - 1)

    expect(positions.length / 3).toBe(perimeterPoints * 2)
    expect(tops.length).toBe(perimeterPoints * 2)
    expect(index.length).toBe(perimeterPoints * 6)

    const covered = new Set<string>()
    let finiteSkirtCoordinates = true
    for (let vertex = 0; vertex < positions.length / 3; vertex += 2) {
      finiteSkirtCoordinates &&= Number.isFinite(positions[vertex * 3])
      finiteSkirtCoordinates &&= Number.isFinite(positions[vertex * 3 + 1])
      finiteSkirtCoordinates &&= Number.isFinite(positions[vertex * 3 + 2])
      expect(tops[vertex]).toBe(tops[vertex + 1])
      expect(positions[vertex * 3 + 1]).toBe(tops[vertex] - BASE_RL)
      expect(positions[(vertex + 1) * 3 + 1]).toBe(SKIRT_RL - BASE_RL)
      covered.add(`${positions[vertex * 3]},${positions[vertex * 3 + 2]}`)
    }
    expect(finiteSkirtCoordinates).toBe(true)
    expect(covered.size).toBe(perimeterPoints)
  })
})
