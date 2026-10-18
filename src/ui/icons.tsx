import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const TintIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3.5" width="14" height="13" rx="1.5" />
    <path d="M3 8h14M3 12.5h14" />
  </Svg>
)

export const ContourIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 13c2-4 5-6 8-6s5 2 6 4" />
    <path d="M6 15.5c1.5-2.5 3.5-4 5.5-4s3.4 1.2 4 2.5" />
    <path d="M2.5 9.5c2.5-4 6-6 9-6 2.4 0 4.6 1.2 6 3" />
  </Svg>
)

export const PanelLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="3.5" width="15" height="13" rx="1.5" />
    <path d="M7.5 3.5v13" />
  </Svg>
)

export const PanelRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="3.5" width="15" height="13" rx="1.5" />
    <path d="M12.5 3.5v13" />
  </Svg>
)

export const FullscreenIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7.5V3h4.5M12.5 3H17v4.5M17 12.5V17h-4.5M7.5 17H3v-4.5" />
  </Svg>
)

/** Brand mark: open-pit cross-section with stepped benches. */
export function PitMark(props: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" {...props}>
      <path d="M1 7h4l2 3h3l1.5 3h1l1.5-3h3l2-3h4" />
    </Svg>
  )
}

export const TerrainIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 15l4.5-6 3 4 2.5-3 6 5" />
    <path d="M2 17.5h16" />
  </Svg>
)

export const ChangeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 13c2.5 0 3-6 7-6s4.5 6 7 6" />
    <path d="M3 13h14" strokeDasharray="2 2" />
  </Svg>
)

export const BoundaryIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5l9-2 4 6-3 8-10-2z" />
  </Svg>
)

export const BufferIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5l9-2 4 6-3 8-10-2z" strokeDasharray="2 2.2" />
    <path d="M6.5 7l5.5-1.3 2.6 3.8-1.9 5-6.4-1.3z" />
  </Svg>
)

export const FloorIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 6h3l2 3h6l2-3h3" />
    <path d="M3 13h14" />
    <path d="M5 13l2 3h6l2-3" strokeDasharray="1.5 1.8" />
  </Svg>
)

export const FindingIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="3" />
    <circle cx="10" cy="10" r="7" strokeDasharray="2 2.5" />
  </Svg>
)

export const LabelIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4h9l5 6-5 6H3z" />
    <path d="M6 10h4" />
  </Svg>
)

export const PickIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 2v4M10 14v4M2 10h4M14 10h4" />
    <circle cx="10" cy="10" r="1.6" />
  </Svg>
)

export const MeasureIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 14L14 3l3 3L6 17z" />
    <path d="M7 10l1.5 1.5M9.5 7.5L11 9M12 5l1.5 1.5" />
  </Svg>
)

export const ResetViewIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8V4h4M16 12v4h-4" />
    <path d="M4 4l4.5 4.5M16 16l-4.5-4.5" />
  </Svg>
)

/* Severity glyphs: each level has its own shape, so colour is never the only signal. */
export const WarningGlyph = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 3l8 14H2z" />
    <path d="M10 8.5v4M10 14.8v.1" />
  </Svg>
)

export const ViolationGlyph = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 2.5h6l4.5 4.5v6L13 17.5H7L2.5 13V7z" />
    <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" />
  </Svg>
)

export const CriticalGlyph = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 2l8 8-8 8-8-8z" />
    <path d="M10 6.5v4.5M10 13.4v.1" />
  </Svg>
)

export const PendingGlyph = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="7" strokeDasharray="2.2 2.2" />
  </Svg>
)
