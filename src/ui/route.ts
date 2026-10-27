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

/** The part of a hash that names the screen: `#/monitor?finding=R1-1` is the `#/monitor` screen. */
const pathOf = (hash: string): string => hash.split('?')[0]!

const read = (): Route => BY_HASH.get(pathOf(window.location.hash)) ?? 'home'

/** The finding a shared link points at (`#/monitor?finding=R1-1`), or null. */
export const findingFromHash = (hash: string): string | null =>
  new URLSearchParams(hash.split('?')[1] ?? '').get('finding')

/** A link that opens the 3D map on one finding, for sharing. */
export const findingLink = (id: string): string =>
  `${window.location.origin}${window.location.pathname}${window.location.search}${ROUTE_HREF.monitor}?finding=${encodeURIComponent(id)}`

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
  hash === '' || BY_HASH.has(pathOf(hash)) ? null : HOME_HREF
