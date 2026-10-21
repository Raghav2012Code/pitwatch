import { useEffect, useRef, type ReactNode } from 'react'
import { useAppStore } from '../../state/store'
import type { DashboardRoute } from './nav'
import { PAGES } from './nav'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/**
 * Sidebar, header and the page. The sidebar is a slim rail on the 3D map (the map wants the
 * width) and full width everywhere else, until the viewer picks one with the collapse control.
 */
export function AppShell({ route, children }: { route: DashboardRoute; children: ReactNode }) {
  const sidebar = useAppStore((s) => s.sidebar)
  const menuOpen = useAppStore((s) => s.menuOpen)
  const setMenuOpen = useAppStore((s) => s.setMenuOpen)
  const rail = sidebar === 'rail' || (sidebar === 'auto' && route === 'monitor')
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    document.title = `${PAGES[route].title} – PitWatch 3D`
    // Moving to another screen closes the phone drawer.
    useAppStore.getState().setMenuOpen(false)
  }, [route])

  // The phone drawer: Esc closes it and focus goes back to the button that opened it.
  useEffect(() => {
    if (!menuOpen) return
    opener.current = document.activeElement as HTMLElement | null
    document.querySelector<HTMLElement>('#sidebar .nav-item')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener.current?.focus?.()
    }
  }, [menuOpen, setMenuOpen])

  return (
    <div className="shell" data-rail={rail || undefined} data-menu={menuOpen || undefined}>
      <button
        type="button"
        className="skip-link"
        onClick={() => document.getElementById('content')?.focus()}
      >
        Skip to content
      </button>
      <Sidebar route={route} rail={rail} />
      <div className="shell-main">
        <Header route={route} />
        {children}
      </div>
      <button
        type="button"
        className="shell-scrim"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={() => setMenuOpen(false)}
      />
    </div>
  )
}

/** A scrolling dashboard page: the shell's content area with a readable column. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <main id="content" tabIndex={0} className="page">
      <div className="page-inner">{children}</div>
    </main>
  )
}
