import type { LatLon, Vec2 } from '../domain/types'

/*
 * Display-only conversion between the local metric grid and lat/lon, using a local
 * equirectangular approximation around the mine origin. Good to well under a metre
 * across a 2 km site. A real system would use a projected CRS such as UTM instead.
 */

const EARTH_RADIUS_M = 6_371_008.8
const DEG = 180 / Math.PI

export function localToLatLon(origin: LatLon, p: Vec2): LatLon {
  return {
    lat: origin.lat + (p.y / EARTH_RADIUS_M) * DEG,
    lon: origin.lon + (p.x / (EARTH_RADIUS_M * Math.cos(origin.lat / DEG))) * DEG,
  }
}

export function latLonToLocal(origin: LatLon, ll: LatLon): Vec2 {
  return {
    x: ((ll.lon - origin.lon) / DEG) * EARTH_RADIUS_M * Math.cos(origin.lat / DEG),
    y: ((ll.lat - origin.lat) / DEG) * EARTH_RADIUS_M,
  }
}
