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
