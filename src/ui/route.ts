import { useSyncExternalStore } from 'react'

/**
 * The landing page and the dashboard screens, addressed by URL hash so links and the back
 * button work without a router.
 */
export type Route = 'home' | 'overview' | 'monitor' | 'findings' | 'rules' | 'uncertainty' | 'about'

export const ROUTE_HREF: Record<Route, string> = {
  home: '#/',
  overview: '#/overview',
  monitor: '#/monitor',
  findings: '#/findings',
  rules: '#/rules',
  uncertainty: '#/uncertainty',
  about: '#/about',
}

export const HOME_HREF = ROUTE_HREF.home
export const OVERVIEW_HREF = ROUTE_HREF.overview
export const MONITOR_HREF = ROUTE_HREF.monitor

const BY_HASH = new Map<string, Route>(
  (Object.entries(ROUTE_HREF) as [Route, string][]).map(([route, hash]) => [hash, route]),
)

const read = (): Route => BY_HASH.get(window.location.hash) ?? 'home'

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export const useRoute = () => useSyncExternalStore(subscribe, read)

/** Everything except the landing page lives inside the dashboard shell. */
export const isDashboard = (route: Route): boolean => route !== 'home'

/** Goes to a screen by changing the hash, which `useRoute` and the back button both follow. */
export const navigate = (route: Route) => {
  if (window.location.hash !== ROUTE_HREF[route]) window.location.hash = ROUTE_HREF[route]
}

/**
 * Where an address that names no screen should go, or `null` when the hash is one of ours.
 *
 * Without this, any hash that is not exactly one of ours renders the home page while the
 * address bar claims something else, so a typo or a stale bookmark quietly lies about where the
 * visitor is. The empty hash is the root address and is left alone.
 */
export const plannedHash = (hash: string): string | null =>
  hash === '' || BY_HASH.has(hash) ? null : HOME_HREF
