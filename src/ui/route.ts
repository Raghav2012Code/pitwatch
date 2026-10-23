import { useSyncExternalStore } from 'react'

/**
 * The landing page and the dashboard screens, addressed by URL hash so links and the back
 * button work without a router.
 */
export type Route =
  | 'home'
  | 'overview'
  | 'monitor'
  | 'findings'
  | 'rules'
  | 'uncertainty'
  | 'about'
  | 'terms'
  | 'license'
  | 'contact'

export const ROUTE_HREF: Record<Route, string> = {
  home: '#/',
  overview: '#/overview',
  monitor: '#/monitor',
  findings: '#/findings',
  rules: '#/rules',
  uncertainty: '#/uncertainty',
  about: '#/about',
  terms: '#/terms',
  license: '#/license',
  contact: '#/contact',
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

/** The standalone pages linked from the landing page footer. */
export const LEGAL_ROUTES = ['terms', 'license', 'contact'] as const
export type LegalRoute = (typeof LEGAL_ROUTES)[number]
export const isLegal = (route: Route): route is LegalRoute =>
  (LEGAL_ROUTES as readonly string[]).includes(route)

/** Everything except the landing page and the legal pages lives inside the dashboard shell. */
export const isDashboard = (route: Route): boolean => route !== 'home' && !isLegal(route)

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
