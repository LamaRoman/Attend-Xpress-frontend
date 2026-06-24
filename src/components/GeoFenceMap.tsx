'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface GeofenceMapProps {
  latitude: number
  longitude: number
  radius: number
  onLocationChange: (lat: number, lng: number) => void
}

/** Approximate a circle as a GeoJSON polygon (for geofence overlay). */
function circleGeoJSON(
  center: [number, number],
  radiusMeters: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center
  const dx = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180))
  const dy = radiusMeters / 110540
  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    coords.push([lng + dx * Math.cos(angle), lat + dy * Math.sin(angle)])
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  }
}

export default function GeofenceMap({
  latitude,
  longitude,
  radius,
  onLocationChange,
}: GeofenceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const loadedRef = useRef(false)
  const onLocationChangeRef = useRef(onLocationChange)
  onLocationChangeRef.current = onLocationChange
  // Keep latest props in a ref so the 'load' callback sees them
  const coordsRef = useRef({ latitude, longitude, radius })
  coordsRef.current = { latitude, longitude, radius }

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 15,
    })

    map.on('load', () => {
      loadedRef.current = true
      const { latitude: lat, longitude: lng, radius: r } = coordsRef.current

      // Geofence circle overlay
      map.addSource('geofence', {
        type: 'geojson',
        data: circleGeoJSON([lng, lat], r),
      })
      map.addLayer({
        id: 'geofence-fill',
        type: 'fill',
        source: 'geofence',
        paint: { 'fill-color': '#334155', 'fill-opacity': 0.1 },
      })
      map.addLayer({
        id: 'geofence-outline',
        type: 'line',
        source: 'geofence',
        paint: { 'line-color': '#334155', 'line-width': 2, 'line-opacity': 0.8 },
      })

      // Draggable marker
      const marker = new mapboxgl.Marker({ draggable: true })
        .setLngLat([lng, lat])
        .addTo(map)
      marker.on('dragend', () => {
        const pos = marker.getLngLat()
        onLocationChangeRef.current(pos.lat, pos.lng)
      })
      markerRef.current = marker
    })

    // Map click sets a new location
    map.on('click', (e) => {
      onLocationChangeRef.current(e.lngLat.lat, e.lngLat.lng)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      loadedRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync marker + circle when coords/radius change after initial load
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return

    markerRef.current?.setLngLat([longitude, latitude])

    const source = map.getSource('geofence') as mapboxgl.GeoJSONSource | undefined
    source?.setData(circleGeoJSON([longitude, latitude], radius))

    map.panTo([longitude, latitude])
  }, [latitude, longitude, radius])

  return (
    <div
      ref={containerRef}
      className="z-0 h-96 w-full overflow-hidden rounded-xl border-2 border-slate-200"
    />
  )
}
