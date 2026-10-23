import { useMemo } from 'react'
import { COMPLIANCE_CONFIG } from '../../compliance/config'
import { changeThreshold } from '../../compliance/change'
import { readPoint } from '../../compliance/inspect'
import { governingPitZone } from '../../compliance/zone'
import { localToLatLon } from '../../geo/latlon'
import { measureOnSurface } from '../../geo/measure'
import { pointInPolygon } from '../../geo/polygon'
import { profileAlong } from '../../geo/profile'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { formatLat, formatLon } from '../format'
import { FindingIcon, MeasureIcon, PickIcon } from '../icons'
import { CoordinateEntry } from './CoordinateEntry'
import { EmptyNote, Row, Section } from './parts'
import { ProfileChart } from './ProfileChart'

const WAYS = [
  {
    Icon: PickIcon,
    title: 'Inspect a point',
    text: 'With the Inspect tool, click the terrain to read position, elevation and permit status.',
  },
  {
    Icon: FindingIcon,
    title: 'Open a finding',
    text: 'Click a pin on the map, or use Show on map in the Findings tab.',
  },
  {
    Icon: MeasureIcon,
    title: 'Measure a line',
    text: 'Switch to Measure (M), click two points, and get distances and an elevation profile.',
  },
]

const n = (v: number, d = 0) =>
  v.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d })
const signed = (v: number, d = 1) => `${v < 0 ? '−' : '+'}${n(Math.abs(v), d)}`

function Point() {
  const p = useAppStore((s) => s.picked)!
  const clear = useAppStore((s) => s.clearPicks)
  const selectFinding = useAppStore((s) => s.selectFinding)
  // Read only what this panel renders. A whole-store subscription re-rendered the inspector on
  // every write, including plain status changes it does not show.
  const surveys = useTerrain((s) => s.surveys)
  const limits = useTerrain((s) => s.limits)
  const findings = useTerrain((s) => s.findings)
  const mine = useTerrain((s) => s.mine)
  const { baseline, current } = surveys
  const r = useMemo(
    () =>
      baseline && current && limits ? readPoint(p, baseline, current, limits, findings) : null,
    [p, baseline, current, limits, findings],
  )
  if (!r || !mine) return null
  const ll = localToLatLon(mine.originLatLon, p)
  const sigma = current!.verticalUncertainty
  const cfg = COMPLIANCE_CONFIG
  const limit = changeThreshold(r.dhSigma, cfg)

  return (
    <Section title="Selected point" provenance="derived">
      <dl>
        <Row label="Position" value={`E ${n(p.x)} m, N ${n(p.y)} m`} mono />
        <Row label="Lat, lon" value={`${formatLat(ll.lat)}, ${formatLon(ll.lon)}`} mono />
        <Row
          label="Elevation"
          value={r.elevation === null ? '—' : `${n(r.elevation, 1)} ± ${n(sigma, 2)} m RL`}
          mono
        />
        <Row
          label="Baseline"
          value={
            r.baseline === null
              ? '—'
              : `${n(r.baseline, 1)} ± ${n(baseline!.verticalUncertainty, 2)} m RL`
          }
          mono
        />
        <Row
          label="Change"
          value={r.dh === null ? '—' : `${signed(r.dh)} ± ${n(r.dhSigma, 2)} m`}
          mono
        />
        <Row label="Slope" value={r.slopeDeg === null ? '—' : `${n(r.slopeDeg)}°`} mono />
      </dl>
      <p className="mt-1 text-[12.5px] leading-5 text-ink-dim">
        {r.dh === null && 'No reading here: the point is outside the survey grid.'}
        {r.dh !== null &&
          r.change === 'excavated' &&
          `Excavated: lowered by more than ${n(limit, 2)} m.`}
        {r.dh !== null && r.change === 'filled' && `Filled: raised by more than ${n(limit, 2)} m.`}
        {r.dh !== null &&
          r.change === 'none' &&
          `No significant change (threshold ±${n(limit, 2)} m).`}
      </p>
      <dl className="mt-2 border-t border-line pt-2">
        <Row
          label="Lease"
          value={`${r.insideLease ? 'Inside' : 'Outside'}, ${n(r.leaseDistance)} m from the boundary${r.inBuffer ? ', in the safety buffer' : ''}`}
        />
        {r.pit && (
          <Row
            label="Pit floor"
            value={
              r.pit.above === null
                ? `Approved ${r.pit.floor} m RL`
                : `${n(Math.abs(r.pit.above), 1)} m ${r.pit.above < 0 ? 'below' : 'above'} the approved ${r.pit.floor} m RL`
            }
          />
        )}
        <div className="flex items-baseline gap-3 py-1.5">
          <dt className="w-[104px] shrink-0 text-[12.5px] text-ink-faint">Findings</dt>
          <dd className="flex min-w-0 flex-1 flex-wrap gap-1.5 text-[13px] text-ink">
            {r.findingIds.length === 0
              ? 'None here'
              : r.findingIds.map((id) => {
                  const f = findings.find((x) => x.id === id)!
                  return (
                    <button
                      key={id}
                      type="button"
                      className="font-mono text-[12px] text-accent underline underline-offset-2"
                      onClick={() => selectFinding(id, f.centroid)}
                    >
                      {id}
                    </button>
                  )
                })}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        className="btn mt-1 text-[12.5px] text-accent underline"
        onClick={clear}
      >
        Clear point
      </button>
    </Section>
  )
}

function Measurement() {
  const a = useAppStore((s) => s.measureA)!
  const b = useAppStore((s) => s.measureB)
  const clear = useAppStore((s) => s.clearPicks)
  const surveys = useTerrain((s) => s.surveys)
  const limits = useTerrain((s) => s.limits)
  const { baseline, current } = surveys

  const m = useMemo(
    () => (current && b ? measureOnSurface(current.grid, current.elevations, a, b) : null),
    [current, a, b],
  )
  // The profile is only built when both ends are on the grid: a line with an end outside the
  // survey has no elevation to read, and it must not ask for an unbounded number of samples.
  const profile = useMemo(
    () =>
      current && baseline && b && m
        ? profileAlong(current.grid, a, b, current.elevations, baseline.elevations)
        : null,
    [current, baseline, a, b, m],
  )
  // Overlapping pit zones: the chart uses the zone the line is deepest below, which is the same
  // zone the depth rule would blame, rather than whichever zone happens to come first.
  const zone = useMemo(
    () =>
      limits && profile
        ? governingPitZone(
            limits.pitZones,
            profile.points.map((p, i) => ({ p, h: profile.series[0]?.[i] ?? NaN })),
          )
        : undefined,
    [limits, profile],
  )
  const inPit = useMemo(
    () => profile?.points.map((p) => (zone ? pointInPolygon(p, zone.polygon) : false)) ?? [],
    [profile, zone],
  )
  if (!current) return null
  const sigma = current.verticalUncertainty
  const dzSigma = Math.SQRT2 * sigma // two independent point readings

  return (
    <Section title="Measurement" provenance="derived">
      {!b ? (
        <EmptyNote>
          Point A is set at E {n(a.x)} m, N {n(a.y)} m. Click a second point on the map.
        </EmptyNote>
      ) : !m || !profile ? (
        <EmptyNote>One end is outside the survey area. Click another point.</EmptyNote>
      ) : (
        <>
          <dl>
            <Row label="Horizontal" value={`${n(m.horizontalDistance, 1)} m`} mono />
            <Row label="Slope distance" value={`${n(m.slopeDistance, 1)} m`} mono />
            <Row label="Elevation change" value={`${signed(m.dz)} ± ${n(dzSigma, 2)} m`} mono />
            <Row
              label="Average grade"
              value={
                m.horizontalDistance > 0 ? `${signed((100 * m.dz) / m.horizontalDistance)} %` : '—'
              }
              mono
            />
          </dl>
          <div className="mt-3">
            <ProfileChart
              profile={profile}
              floor={zone?.approvedFloorElevation ?? null}
              inPit={inPit}
              sigma={sigma}
            />
            {profile.limited && (
              <p className="mt-1.5 text-[11.5px] leading-4 text-ink-faint">
                The line is longer than the survey samples finely: the profile is read every{' '}
                {n(profile.step, 1)} m instead of every half cell.
              </p>
            )}
          </div>
        </>
      )}
      <p className="mt-2 text-[11.5px] leading-4 text-ink-faint">
        Measured on the current survey. Elevations carry the survey&apos;s vertical uncertainty;
        horizontal position error is not modelled.
      </p>
      <button
        type="button"
        className="btn mt-1 text-[12.5px] text-accent underline"
        onClick={clear}
      >
        Clear measurement
      </button>
    </Section>
  )
}

export function InspectorPanel() {
  const picked = useAppStore((s) => s.picked)
  const a = useAppStore((s) => s.measureA)
  const tool = useAppStore((s) => s.tool)
  const ready = useTerrain((s) => s.status === 'ready')

  return (
    <>
      {/* Always at the top of the tab, whether or not a point is already selected. */}
      {ready && <CoordinateEntry />}
      {ready && (picked || a) ? (
        tool === 'measure' ? (
          <>
            {a && <Measurement />}
            {picked && <Point />}
          </>
        ) : (
          <>
            {picked && <Point />}
            {a && <Measurement />}
          </>
        )
      ) : (
        <Section title="Nothing selected">
          <ul className="space-y-2">
            {WAYS.map(({ Icon, title, text }) => (
              <li key={title} className="hint-row">
                <span className="hint-icon">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <div className="text-[13px] font-medium text-ink">{title}</div>
                  <div className="text-[12.5px] leading-5 text-ink-dim">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  )
}
