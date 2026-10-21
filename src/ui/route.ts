import { useSyncExternalStore } from 'react'

/** Two screens, addressed by URL hash so links and the back button work without a router. */
export type Route = 'home' | 'monitor'

export const MONITOR_HREF = '#/monitor'
export const HOME_HREF = '#/'

const read = (): Route => (window.location.hash === MONITOR_HREF ? 'monitor' : 'home')

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export const useRoute = () => useSyncExternalStore(subscribe, read)

/**
 * Where an address that names no screen should go, or `null` when the hash is one of ours.
 *
 * Without this, any hash that is not exactly the monitor hash renders the home page while the
 * address bar claims something else, so a typo or a stale bookmark quietly lies about where the
 * visitor is. The empty hash is the root address and is left alone.
 */
export const plannedHash = (hash: string): string | null =>
  hash === '' || hash === HOME_HREF || hash === MONITOR_HREF ? null : HOME_HREF
