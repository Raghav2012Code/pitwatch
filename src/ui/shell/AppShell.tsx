import { useEffect, useRef, type ReactNode } from 'react'
import { useAppStore } from '../../state/store'
import type { DashboardRoute } from './nav'
import { PAGES } from './nav'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/**
 * Sidebar, header and the page. The sidebar opens as a slim icon rail on every page, so content
 * gets the width; the viewer expands it with the control at its foot and the choice sticks.
 */
export function AppShell({ route, children }: { route: DashboardRoute; children: ReactNode }) {
  const sidebar = useAppStore((s) => s.sidebar)
  const menuOpen = useAppStore((s) => s.menuOpen)
  const setMenuOpen = useAppStore((s) => s.setMenuOpen)
  const rail = sidebar === 'rail'
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    document.title = `${PAGES[route].title} – PitWatch 3D`
    // Moving to another screen closes the phone drawer.
    useAppStore.getState().setMenuOpen(false)
  }, [route])

  // The phone drawer: Esc closes it and focus goes back to the button that opened it. While the
  // drawer is open Tab stays inside it — the page behind the scrim must not take focus.
  useEffect(() => {
    if (!menuOpen) return
    opener.current = document.activeElement as HTMLElement | null
    const sidebar = document.querySelector<HTMLElement>('#sidebar')
    // The drawer is `visibility: hidden` until the browser applies the open style, and a focus()
    // in that frame is dropped even once it reports visible, so retry until it sticks rather
    // than guess a duration.
    let frame = 0
    let raf = requestAnimationFrame(function move() {
      const target = sidebar?.querySelector<HTMLElement>('.nav-item')
      target?.focus()
      if (document.activeElement !== target && frame++ < 10) {
        raf = requestAnimationFrame(move)
      }
    })
    // Visible focusable controls of the drawer, in tab order.
    const focusables = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMenuOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]!
      const last = items[items.length - 1]!
      const focus = e.shiftKey ? last : first
      // A control outside the drawer (or the edge in the shift direction) wraps inside.
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        focus.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        focus.focus()
      } else if (!items.includes(document.activeElement as HTMLElement)) {
        e.preventDefault()
        focus.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
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
