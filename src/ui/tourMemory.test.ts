import { describe, expect, it } from 'vitest'
import { markTourSeen, resetTour, tourSeen } from './tourMemory'

const fake = () => {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  }
}

describe('tour memory', () => {
  it('starts unseen, is remembered once marked and can be reset', () => {
    const store = fake()
    expect(tourSeen(store)).toBe(false)
    markTourSeen(store)
    expect(tourSeen(store)).toBe(true)
    resetTour(store)
    expect(tourSeen(store)).toBe(false)
  })

  it('never nags when storage is unavailable or throws', () => {
    expect(tourSeen(null)).toBe(true)
    const denied = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    expect(tourSeen(denied)).toBe(true)
    expect(() => markTourSeen(denied)).not.toThrow()
    expect(() => resetTour(denied)).not.toThrow()
  })
})
