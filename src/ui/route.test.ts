import { describe, expect, it } from 'vitest'
import { HOME_HREF, MONITOR_HREF, plannedHash } from './route'

describe('plannedHash', () => {
  it('leaves the addresses that name a screen alone', () => {
    for (const hash of ['', HOME_HREF, MONITOR_HREF]) expect(plannedHash(hash)).toBeNull()
  })

  it('sends every other hash to the home hash', () => {
    for (const hash of ['#', '#/monitor/extra', '#/Monitor', '#/typo', '#findings', '#/../'])
      expect(plannedHash(hash)).toBe(HOME_HREF)
  })
})
