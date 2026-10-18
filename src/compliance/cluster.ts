/**
 * Groups flagged cells into connected regions (8-connected: diagonal neighbours join).
 * `flag[i]` is the group key of cell i, or 0 for unflagged; only cells with the same key
 * join. Returns each region's cell indices, in scan order, regions ordered by first cell.
 */
export function connectedComponents(flag: Uint8Array, cols: number, rows: number): number[][] {
  const seen = new Uint8Array(flag.length)
  const regions: number[][] = []
  const stack: number[] = []
  for (let start = 0; start < flag.length; start++) {
    if (!flag[start] || seen[start]) continue
    const key = flag[start]
    const cells: number[] = []
    seen[start] = 1
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()!
      cells.push(i)
      const c = i % cols
      const r = (i - c) / cols
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue
          const j = rr * cols + cc
          if (flag[j] === key && !seen[j]) {
            seen[j] = 1
            stack.push(j)
          }
        }
      }
    }
    regions.push(cells.sort((a, b) => a - b))
  }
  return regions
}
