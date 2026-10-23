import type { ComponentType, SVGProps } from 'react'
import { CubeIcon, FindingIcon, InfoIcon, OverviewIcon, RulesIcon, SigmaIcon } from '../icons'
import type { Route } from '../route'

export type DashboardRoute = Exclude<Route, 'home' | 'terms' | 'license' | 'contact'>

interface Page {
  /** Sidebar label and the page heading. */
  title: string
  /** One line under the heading, in the header. */
  subtitle: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const PAGES: Record<DashboardRoute, Page> = {
  overview: {
    title: 'Overview',
    subtitle: 'Where the mine stands against its permit',
    Icon: OverviewIcon,
  },
  monitor: {
    title: '3D map',
    subtitle: 'Orbit the pit, switch surveys and inspect any point',
    Icon: CubeIcon,
  },
  findings: {
    title: 'Findings',
    subtitle: 'Every place the rule engine flagged, with the evidence',
    Icon: FindingIcon,
  },
  rules: {
    title: 'Permit rules',
    subtitle: 'The three lease conditions and how each one is tested',
    Icon: RulesIcon,
  },
  uncertainty: {
    title: 'Uncertainty',
    subtitle: 'How much change the surveys can actually support',
    Icon: SigmaIcon,
  },
  about: {
    title: 'About the data',
    subtitle: 'What is simulated and what each kind of data can show',
    Icon: InfoIcon,
  },
}

export const NAV_GROUPS: { label: string; routes: DashboardRoute[] }[] = [
  { label: 'Workspace', routes: ['overview', 'monitor', 'findings'] },
  { label: 'Reference', routes: ['rules', 'uncertainty', 'about'] },
]
