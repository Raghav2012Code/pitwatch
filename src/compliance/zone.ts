import type { PitZone, Vec2 } from '../domain/types'
import { pointInPolygon, polygonArea } from '../geo/polygon'

/*
 * The one place that answers "which pit zone governs this ground". The depth rule (R2), the
 * inspector's point reading and the profile chart all need the same answer: the zone whose
 * approved floor the ground is deepest below, not whichever zone happens to be first in the
 * permit. Pure, so the multi-zone display shape is testable without rendering the panels.
 */

/** One ground sample: plan position and the surface height there (m RL). */
export interface ZoneSample {
  p: Vec2
  h: number
}

/**
 * The pit zone whose approved floor the sampled ground is deepest below. A zone is compared on
 * its deepest sample inside it; samples outside every zone are ignored. The highest
 * `approvedFloorElevation - h` wins; the first zone wins a tie.
 *
 * A sample with a non-finite height (off the survey grid, or a gap in a profile) cannot be
 * ranked by depth, but it still proves the ground is inside a zone. When nothing can be ranked,
 * the zone with the lowest floor is returned, so a point we know sits in a pit zone keeps
 * naming that zone's floor instead of pretending the point is outside every zone.
 */
export function governingPitZone(
  zones: readonly PitZone[],
  samples: readonly ZoneSample[],
): PitZone | undefined {
  let best: PitZone | undefined
  let deepest = -Infinity
  // Lowest-floor zone that merely contains an unrankable sample; used only if nothing ranks.
  let unranked: PitZone | undefined
  for (const zone of zones) {
    let below = -Infinity
    let contains = false
    for (const sample of samples) {
      if (!pointInPolygon(sample.p, zone.polygon)) continue
      contains = true
      if (!Number.isFinite(sample.h)) continue
      const depth = zone.approvedFloorElevation - sample.h
      if (depth > below) below = depth
    }
    if (below > deepest) {
      deepest = below
      best = zone
    }
    if (contains && (!unranked || zone.approvedFloorElevation < unranked.approvedFloorElevation)) {
      unranked = zone
    }
  }
  return best ?? unranked
}

/** The pit zone with the greatest plan area, for framing the camera on the main pit. */
export function largestPitZone(zones: readonly PitZone[]): PitZone | undefined {
  let best: PitZone | undefined
  let area = -Infinity
  for (const zone of zones) {
    const next = polygonArea(zone.polygon)
    if (next > area) {
      area = next
      best = zone
    }
  }
  return best
}

/** Label/value pairs for the lease section's approved-floor rows, one per pit zone. */
export function pitFloorRows(zones: readonly PitZone[]): { label: string; value: string }[] {
  return zones.map((zone) => ({
    // A single zone keeps the shipped wording exactly; with more than one, name the zone so
    // each floor is pinned to the permit it comes from.
    label: zones.length === 1 ? 'Approved floor' : `Approved floor (${zone.id})`,
    value: `${zone.approvedFloorElevation} m RL`,
  }))
}
