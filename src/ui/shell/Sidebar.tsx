import { MINE_INFO } from '../../data/fixtures/mine'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { ChevronLeftIcon, HomeIcon, PitMark } from '../icons'
import { HOME_HREF, ROUTE_HREF, type Route } from '../route'
import { NAV_GROUPS, PAGES } from './nav'

/**
 * The dashboard's navigation. Full width on desktop, a slim icon rail when the screen needs the
 * room (the 3D map by default) and a drawer on phones. In the rail the labels stay in the page
 * for screen readers and show as tooltips.
 */
export function Sidebar({ route, rail }: { route: Route; rail: boolean }) {
  const setSidebar = useAppStore((s) => s.setSidebar)
  const ready = useTerrain((s) => s.status === 'ready')
  const flagged = useTerrain((s) => s.findings.length)

  return (
    <div id="sidebar" className="sidebar">
      <a href={HOME_HREF} className="sidebar-brand" aria-label="PitWatch home">
        <span className="brand-mark">
          <PitMark className="h-6 w-[38px]" />
        </span>
        <span className="cond sidebar-wordmark">PitWatch</span>
      </a>

      <nav aria-label="Dashboard" className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <section key={group.label}>
            <h2 className="nav-group">{group.label}</h2>
            <ul role="list">
              {group.routes.map((id) => {
                const { title, Icon } = PAGES[id]
                return (
                  <li key={id}>
                    <a
                      href={ROUTE_HREF[id]}
                      className="nav-item"
                      aria-current={route === id ? 'page' : undefined}
                      title={rail ? title : undefined}
                    >
                      <Icon className="nav-icon" />
                      <span className="nav-label">{title}</span>
                      {id === 'findings' && ready && flagged > 0 && (
                        <span className="nav-count">
                          {flagged}
                          <span className="sr-only"> flagged</span>
                        </span>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-mine">
          <div className="sidebar-mine-name">{MINE_INFO.name}</div>
          <div className="sidebar-mine-meta">{MINE_INFO.operator}</div>
        </div>
        <a href={HOME_HREF} className="nav-item" title={rail ? 'Back to the home page' : undefined}>
          <HomeIcon className="nav-icon" />
          <span className="nav-label">Back to home page</span>
        </a>
        <button
          type="button"
          className="nav-item sidebar-collapse"
          aria-expanded={!rail}
          aria-controls="sidebar"
          title={rail ? 'Expand sidebar' : undefined}
          onClick={() => setSidebar(rail ? 'open' : 'rail')}
        >
          <ChevronLeftIcon className="nav-icon" />
          <span className="nav-label">{rail ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        </button>
      </div>
    </div>
  )
}
