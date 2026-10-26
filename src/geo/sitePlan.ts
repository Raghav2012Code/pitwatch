import type { GridSpec } from '../domain/types'
import type { Polygon, Vec2 } from '../domain/types'
import { pointInPolygon } from './polygon'

interface BoundaryEdge {
  start: number
  end: number
  direction: number
}

const RIGHT_TURN_ORDER = [1, 0, 3, 2]

function validateGrid(grid: GridSpec): void {
  if (
    !Number.isInteger(grid.cols) ||
    !Number.isInteger(grid.rows) ||
    grid.cols < 1 ||
    grid.rows < 1 ||
    !Number.isFinite(grid.cellSize) ||
    grid.cellSize <= 0 ||
    !Number.isFinite(grid.originXY.x) ||
    !Number.isFinite(grid.originXY.y)
  ) {
    throw new RangeError('Grid dimensions, cell size, and origin must be finite and valid')
  }
}

function coordinate(value: number): string {
  // Number#toString is the shortest round-trippable representation; fixed decimals can collapse
  // small but valid grid cells (for example, a 0.1 mm cell rounded to 0.001 m).
  return String(value === 0 ? 0 : value)
}

/**
 * Trace the exact perimeter of occupied grid cells as north-up SVG paths.
 *
 * This follows exposed cell edges rather than interpolating across cell centres: every filled
 * area therefore remains exactly the union of cells already classified by the caller. Shared
 * edges are cancelled, loops retain their winding (including holes), and diagonal contacts use
 * a deterministic right-turn rule so they remain separate outlines.
 *
 * The output uses the grid's cell-edge extent as its viewBox: x starts half a cell west of
 * `originXY.x`, y=0 is the north edge, and row 0 is at the bottom. Use `fill-rule="evenodd"`
 * when filling the paths so holes remain empty.
 */
export function cellMaskToSvgPath(grid: GridSpec, cells: ArrayLike<number | boolean>): string {
  validateGrid(grid)
  const count = grid.cols * grid.rows
  if (!Number.isSafeInteger(count) || cells.length !== count) {
    throw new RangeError(`Cell mask must contain exactly ${count} entries`)
  }

  const active = (col: number, row: number) =>
    col >= 0 && row >= 0 && col < grid.cols && row < grid.rows
      ? Boolean(cells[row * grid.cols + col])
      : false

  const stride = grid.cols + 1
  const edges: BoundaryEdge[] = []
  const outgoing = new Map<number, number[]>()
  const add = (start: number, end: number, direction: number) => {
    const index = edges.length
    edges.push({ start, end, direction })
    const at = outgoing.get(start)
    if (at) at.push(index)
    else outgoing.set(start, [index])
  }

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (!active(col, row)) continue
      const southWest = row * stride + col
      const southEast = southWest + 1
      const northWest = southWest + stride
      const northEast = northWest + 1

      // Edges are clockwise in SVG coordinates, keeping occupied cells on the right.
      if (!active(col, row + 1)) add(northWest, northEast, 0)
      if (!active(col + 1, row)) add(northEast, southEast, 1)
      if (!active(col, row - 1)) add(southEast, southWest, 2)
      if (!active(col - 1, row)) add(southWest, northWest, 3)
    }
  }

  const point = (vertex: number): [number, number] => {
    const row = Math.floor(vertex / stride)
    const col = vertex - row * stride
    const x = grid.originXY.x - grid.cellSize / 2 + col * grid.cellSize
    const y = (grid.rows - row) * grid.cellSize
    return [x, y]
  }

  const visited = new Uint8Array(edges.length)
  const paths: string[] = []
  for (let first = 0; first < edges.length; first++) {
    if (visited[first]) continue
    const loop: number[] = []
    let edgeIndex = first
    const start = edges[first]!.start
    let guard = edges.length + 1
    while (guard-- > 0) {
      const edge = edges[edgeIndex]!
      if (visited[edgeIndex]) break
      visited[edgeIndex] = 1
      loop.push(edge.start)
      if (edge.end === start) break

      const candidates = (outgoing.get(edge.end) ?? []).filter((candidate) => !visited[candidate])
      if (candidates.length === 0) break
      const turnRank = (candidate: number) => {
        const turn = (edges[candidate]!.direction - edge.direction + 4) % 4
        return RIGHT_TURN_ORDER.indexOf(turn)
      }
      edgeIndex = candidates.reduce((best, candidate) =>
        turnRank(candidate) < turnRank(best) ? candidate : best,
      )
    }

    if (loop.length < 4 || edges[edgeIndex]?.end !== start) continue

    const simplified = loop.filter((vertex, i) => {
      const previous = loop[(i + loop.length - 1) % loop.length]!
      const next = loop[(i + 1) % loop.length]!
      const [px, py] = point(previous)
      const [x, y] = point(vertex)
      const [nx, ny] = point(next)
      return (x - px) * (ny - y) !== (y - py) * (nx - x)
    })
    if (simplified.length < 4) continue

    const [firstX, firstY] = point(simplified[0]!)
    const commands = [`M${coordinate(firstX)} ${coordinate(firstY)}`]
    for (let i = 1; i < simplified.length; i++) {
      const [x, y] = point(simplified[i]!)
      commands.push(`L${coordinate(x)} ${coordinate(y)}`)
    }
    commands.push('Z')
    paths.push(commands.join(''))
  }

  return paths.join('')
}

/** Trace the cells belonging to a finding as a north-up SVG path. */
export function cellIndicesToSvgPath(grid: GridSpec, indices: readonly number[]): string {
  validateGrid(grid)
  const count = grid.cols * grid.rows
  if (!Number.isSafeInteger(count)) throw new RangeError('Grid contains too many cells')

  const cells = new Uint8Array(count)
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      throw new RangeError(`Cell index ${index} is outside the grid`)
    }
    cells[index] = 1
  }
  return cellMaskToSvgPath(grid, cells)
}

/**
 * Return a deterministic point inside a simple polygon, or null for a degenerate polygon.
 *
 * The midpoint of a polygon's bounding box or vertex centroid can fall outside a concave shape.
 * Instead, scan horizontal bands between consecutive vertex levels, pair their edge crossings,
 * and choose the midpoint of the widest interior span. Each candidate is verified with the same
 * even-odd point-in-polygon rule used by the geometry utilities.
 */
export function polygonInteriorPoint(polygon: Polygon): Vec2 | null {
  if (
    polygon.length < 3 ||
    polygon.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))
  ) {
    return null
  }

  const levels = [...new Set(polygon.map((point) => point.y))].sort((a, b) => a - b)
  let best: Vec2 | null = null
  let bestWidth = 0

  for (let band = 0; band + 1 < levels.length; band++) {
    const low = levels[band]!
    const high = levels[band + 1]!
    const y = low + (high - low) / 2
    if (!(y > low && y < high)) continue

    const crossings: number[] = []
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!
      const b = polygon[(i + 1) % polygon.length]!
      if (a.y > y === b.y > y) continue
      crossings.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y))
    }
    crossings.sort((a, b) => a - b)

    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const left = crossings[i]!
      const right = crossings[i + 1]!
      const width = right - left
      if (width <= bestWidth) continue
      const candidate = { x: left + width / 2, y }
      if (pointInPolygon(candidate, polygon)) {
        best = candidate
        bestWidth = width
      }
    }
  }

  return best
}

export interface ElevationContour {
  /** Elevation represented by this isoline, in metres RL. */
  level: number
  /** One SVG path containing all disconnected north-up contour segments at this level. */
  d: string
}

interface ContourPoint {
  key: string
  x: number
  y: number
}

interface ContourSegment {
  start: ContourPoint
  end: ContourPoint
}

const svgNumber = (value: number) => String(Object.is(value, -0) ? 0 : value)
// Bound main-thread work to about 16 million grid-cell/level visits. The current 513² survey
// with 5 m contours over its ~150 m relief needs only about 7.9 million visits.
const MAX_CONTOUR_CELL_VISITS = 16_000_000

/**
 * Derive north-up elevation isolines from the sampled survey surface.
 *
 * Elevations live at grid-cell centres. Marching squares interpolates the requested RL along
 * each crossing edge, so the drawing shows measured/simulated surface geometry without adding
 * roads or other fixture-only decoration. Ambiguous saddle cells use their centre average; an
 * exact tie consistently connects the high side. Returned x values are local map coordinates,
 * and y=0 is the north edge of the grid's cell-edge extent (the same viewBox as the mask paths).
 */
export function elevationContoursToSvgPaths(
  grid: GridSpec,
  elevations: ArrayLike<number>,
  interval: number,
): ElevationContour[] {
  validateGrid(grid)
  const count = grid.cols * grid.rows
  if (!Number.isSafeInteger(count) || elevations.length !== count) {
    throw new RangeError(`Elevation grid must contain exactly ${count} values`)
  }
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new RangeError('Contour interval must be finite and greater than zero')
  }

  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < elevations.length; i++) {
    const elevation = elevations[i]!
    if (!Number.isFinite(elevation)) throw new RangeError(`Elevation at index ${i} must be finite`)
    min = Math.min(min, elevation)
    max = Math.max(max, elevation)
  }
  if (grid.cols < 2 || grid.rows < 2 || min === max) return []

  const firstLevel = Math.ceil(min / interval)
  const lastLevel = Math.floor(max / interval)
  const levelCount = Math.max(0, lastLevel - firstLevel + 1)
  if (
    !Number.isSafeInteger(firstLevel) ||
    !Number.isSafeInteger(lastLevel) ||
    levelCount > 512 ||
    grid.cols * grid.rows * levelCount > MAX_CONTOUR_CELL_VISITS
  ) {
    throw new RangeError('Contour interval would create too much grid work')
  }
  const contours: ElevationContour[] = []

  for (let levelIndex = firstLevel; levelIndex <= lastLevel; levelIndex++) {
    const level = levelIndex * interval
    if (level <= min || level >= max) continue

    const segments: ContourSegment[] = []
    for (let row = 0; row < grid.rows - 1; row++) {
      for (let col = 0; col < grid.cols - 1; col++) {
        // Corner order is north-west, north-east, south-east, south-west.
        const northRow = row + 1
        const northWest = northRow * grid.cols + col
        const northEast = northWest + 1
        const southWest = row * grid.cols + col
        const southEast = southWest + 1
        const nw = elevations[northWest]!
        const ne = elevations[northEast]!
        const se = elevations[southEast]!
        const sw = elevations[southWest]!
        const nwHigh = nw >= level
        const neHigh = ne >= level
        const seHigh = se >= level
        const swHigh = sw >= level
        const caseIndex = (nwHigh ? 1 : 0) | (neHigh ? 2 : 0) | (seHigh ? 4 : 0) | (swHigh ? 8 : 0)
        if (caseIndex === 0 || caseIndex === 15) continue

        const xWest = grid.originXY.x + col * grid.cellSize
        const xEast = xWest + grid.cellSize
        const yNorth = (grid.rows - 1 - northRow) * grid.cellSize + grid.cellSize / 2
        const ySouth = yNorth + grid.cellSize
        const crossing: (ContourPoint | undefined)[] = [undefined, undefined, undefined, undefined]
        let crossingCount = 0
        const cross = (
          edge: number,
          nodeA: number,
          nodeB: number,
          valueA: number,
          valueB: number,
          ax: number,
          ay: number,
          bx: number,
          by: number,
        ) => {
          const t = Math.min(1, Math.max(0, (level - valueA) / (valueB - valueA)))
          const key =
            t === 0
              ? `v${nodeA}`
              : t === 1
                ? `v${nodeB}`
                : `e${Math.min(nodeA, nodeB)}:${Math.max(nodeA, nodeB)}`
          crossing[edge] = {
            key,
            x: ax + (bx - ax) * t,
            y: ay + (by - ay) * t,
          }
          crossingCount++
        }

        if (nwHigh !== neHigh) cross(0, northWest, northEast, nw, ne, xWest, yNorth, xEast, yNorth)
        if (neHigh !== seHigh) cross(1, northEast, southEast, ne, se, xEast, yNorth, xEast, ySouth)
        if (seHigh !== swHigh) cross(2, southEast, southWest, se, sw, xEast, ySouth, xWest, ySouth)
        if (swHigh !== nwHigh) cross(3, southWest, northWest, sw, nw, xWest, ySouth, xWest, yNorth)

        const crossed: number[] = []
        for (let edge = 0; edge < 4; edge++) if (crossing[edge]) crossed.push(edge)
        let pairs: readonly (readonly [number, number])[]
        if (crossingCount === 2) {
          pairs = [[crossed[0]!, crossed[1]!]]
        } else if (crossingCount === 4 && (caseIndex === 5 || caseIndex === 10)) {
          const centre = (nw + ne + se + sw) / 4
          const centreHigh = centre >= level
          if (caseIndex === 5) {
            pairs = centreHigh
              ? [
                  [0, 1],
                  [2, 3],
                ]
              : [
                  [0, 3],
                  [1, 2],
                ]
          } else {
            pairs = centreHigh
              ? [
                  [0, 3],
                  [1, 2],
                ]
              : [
                  [0, 1],
                  [2, 3],
                ]
          }
        } else {
          continue
        }

        for (const [a, b] of pairs) {
          const start = crossing[a]
          const end = crossing[b]
          if (start && end && start.key !== end.key) segments.push({ start, end })
        }
      }
    }

    if (segments.length === 0) continue
    const byPoint = new Map<string, number[]>()
    const points = new Map<string, ContourPoint>()
    segments.forEach((segment, index) => {
      points.set(segment.start.key, segment.start)
      points.set(segment.end.key, segment.end)
      for (const key of [segment.start.key, segment.end.key]) {
        const connected = byPoint.get(key)
        if (connected) connected.push(index)
        else byPoint.set(key, [index])
      }
    })

    const used = new Uint8Array(segments.length)
    const paths: string[] = []
    for (let first = 0; first < segments.length; first++) {
      if (used[first]) continue
      const segment = segments[first]!
      const startKey =
        (byPoint.get(segment.start.key)?.length ?? 0) !== 2
          ? segment.start.key
          : (byPoint.get(segment.end.key)?.length ?? 0) !== 2
            ? segment.end.key
            : segment.start.key
      const line: string[] = [startKey]
      let current = startKey
      let segmentIndex = first
      let guard = segments.length + 1
      while (guard-- > 0) {
        if (used[segmentIndex]) break
        used[segmentIndex] = 1
        const item = segments[segmentIndex]!
        current = item.start.key === current ? item.end.key : item.start.key
        line.push(current)
        if (current === startKey) break
        const next = (byPoint.get(current) ?? []).find((index) => !used[index])
        if (next === undefined) break
        segmentIndex = next
      }

      if (line.length < 2) continue
      const commands = line.map((key, index) => {
        const point = points.get(key)!
        return `${index ? 'L' : 'M'}${svgNumber(point.x)} ${svgNumber(point.y)}`
      })
      paths.push(commands.join(''))
    }
    contours.push({ level, d: paths.join('') })
  }

  return contours
}
