import { useEffect } from 'react'
import { acquireTerrainProvider, releaseTerrainProvider } from './data/WorkerTerrainProvider'
import { useTerrain } from './state/terrain'
import { HomePage } from './ui/HomePage'
import { AboutPage } from './ui/pages/AboutPage'
import { FindingsPage } from './ui/pages/FindingsPage'
import { MapPage } from './ui/pages/MapPage'
import { OverviewPage } from './ui/pages/OverviewPage'
import { RulesPage } from './ui/pages/RulesPage'
import { UncertaintyPage } from './ui/pages/UncertaintyPage'
import { LegalPage } from './ui/LegalPage'
import { isLegal, plannedHash, useRoute } from './ui/route'
import type { DashboardRoute } from './ui/shell/nav'
import { AppShell } from './ui/shell/AppShell'

const PAGES: Record<DashboardRoute, () => React.JSX.Element> = {
  overview: OverviewPage,
  monitor: MapPage,
  findings: FindingsPage,
  rules: RulesPage,
  uncertainty: UncertaintyPage,
  about: AboutPage,
}

export default function App() {
  const route = useRoute()

  // Build the synthetic surveys once, in a worker, as soon as the app opens. Every screen reads
  // them from the store, so moving between screens neither rebuilds nor leaks the worker.
  useEffect(() => {
    void useTerrain.getState().load(acquireTerrainProvider())
    return () => releaseTerrainProvider()
  }, [])

  // An address that names no screen is rewritten to the home hash, so the address bar always
  // describes what is on screen. `replaceState` keeps the correction out of the back history.
  useEffect(() => {
    const settle = () => {
      const target = plannedHash(window.location.hash)
      if (!target) return
      const { pathname, search } = window.location
      window.history.replaceState(null, '', `${pathname}${search}${target}`)
    }
    settle()
    window.addEventListener('hashchange', settle)
    return () => window.removeEventListener('hashchange', settle)
  }, [])

  useEffect(() => {
    if (route === 'home') document.title = 'PitWatch 3D'
  }, [route])

  if (route === 'home') return <HomePage />
  if (isLegal(route)) return <LegalPage route={route} />
  const Page = PAGES[route]
  return (
    <AppShell route={route}>
      <Page />
    </AppShell>
  )
}
