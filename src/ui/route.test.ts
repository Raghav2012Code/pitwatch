import { describe, expect, it } from 'vitest'
import { HOME_HREF, ROUTE_HREF, plannedHash } from './route'

describe('plannedHash', () => {
  it('leaves the addresses that name a screen alone', () => {
    for (const hash of ['', ...Object.values(ROUTE_HREF)]) expect(plannedHash(hash)).toBeNull()
  })

  it('sends every other hash to the home hash', () => {
    for (const hash of [
      '#',
      '#/monitor/extra',
      '#/Monitor',
      '#/typo',
      '#findings',
      '#/../',
      '#/overview/',
    ])
      expect(plannedHash(hash)).toBe(HOME_HREF)
  })
})
