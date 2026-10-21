import { useMemo, useState, type FormEvent } from 'react'
import { COMPLIANCE_CONFIG } from '../../compliance/config'
import { changeThreshold } from '../../compliance/change'
import { readPoint } from '../../compliance/inspect'
import { localToLatLon } from '../../geo/latlon'
import { cellAt, extent } from '../../geo/grid'
import { measureOnSurface } from '../../geo/measure'
import { pointInPolygon } from '../../geo/polygon'
import { profileAlong } from '../../geo/profile'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { formatLat, formatLon } from '../format'
import { FindingIcon, MeasureIcon, PickIcon } from '../icons'
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

/**
 * Keyboard route to the map tools: type a position instead of clicking the 3D view. Acts like a
 * click for the active tool (Inspect reads the point, Measure sets A, then B).
 */
function GoTo() {
  const pickPoint = useAppStore((s) => s.pickPoint)
  const tool = useAppStore((s) => s.tool)
  const grid = useTerrain((s) => s.surveys.current?.grid)
  const [error, setError] = useState('')
  if (!grid) return null
  const { min, max } = extent(grid)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const east = String(data.get('e'))
    const north = String(data.get('n'))
    const p = { x: Number(east), y: Number(north) }
    if (east === '' || north === '' || !cellAt(grid, p)) {
      setError(
        `Enter a position inside the survey: E ${n(min.x)} to ${n(max.x)} m, N ${n(min.y)} to ${n(max.y)} m.`,
      )
      return
    }
    setError('')
    pickPoint(p)
  }

  return (
    <Section title="Go to position">
      <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-2">
        {(['e', 'n'] as const).map((k) => (
          <label key={k} className="flex flex-col gap-1 text-[12.5px] text-ink-faint">
            {k === 'e' ? 'Easting (m)' : 'Northing (m)'}
            <input
              name={k}
              type="number"
              step="any"
              inputMode="decimal"
              className="w-[104px] rounded-[3px] border border-line-strong bg-white px-2 py-1 font-mono text-[12px] text-ink"
            />
          </label>
        ))}
        <button type="submit" className="btn text-[12.5px] text-accent underline">
          {tool === 'inspect' ? 'Inspect' : 'Set measure point'}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] leading-5 text-violation">
          {error}
        </p>
      )}
    </Section>
  )
}

function Point() {
  const p = useAppStore((s) => s.picked)!
  const clear = useAppStore((s) => s.clearPicks)
  const selectFinding = useAppStore((s) => s.selectFinding)
  const { surveys, limits, findings, mine } = useTerrain()
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
        {r.change === 'excavated' && `Excavated: lowered by more than ${n(limit, 2)} m.`}
        {r.change === 'filled' && `Filled: raised by more than ${n(limit, 2)} m.`}
        {r.change === 'none' && `No significant change (threshold ±${n(limit, 2)} m).`}
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
  const { surveys, limits } = useTerrain()
  const { baseline, current } = surveys

  const m = useMemo(
    () => (current && b ? measureOnSurface(current.grid, current.elevations, a, b) : null),
    [current, a, b],
  )
  const profile = useMemo(
    () =>
      current && baseline && b
        ? profileAlong(current.grid, a, b, current.elevations, baseline.elevations)
        : null,
    [current, baseline, a, b],
  )
  const zone = limits?.pitZones[0]
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

  if (ready && (picked || a)) {
    return (
      <>
        {tool === 'measure' ? (
          <>
            {a && <Measurement />}
            {picked && <Point />}
          </>
        ) : (
          <>
            {picked && <Point />}
            {a && <Measurement />}
          </>
        )}
        <GoTo />
      </>
    )
  }

  return (
    <>
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
      {ready && <GoTo />}
    </>
  )
}
