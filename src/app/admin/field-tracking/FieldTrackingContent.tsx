'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import BSDatePicker, { adToBS, BS_MONTHS_EN } from '@/components/BSDatePicker'
import {
  MapPin,
  RefreshCw,
  Clock,
  User,
  Navigation,
  Radio,
  ChevronLeft,
  Calendar,
  AlertCircle,
  Users,
  Search,
  X,
  UserCheck,
  Trash2,
  Building2,
  Lock,
} from 'lucide-react'
import { FeatureLockScreen } from '@/components/FeatureLock'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface CurrentStop {
  lat: number
  lng: number
  arrivedAt: string
  durationMinutes: number
}
interface LivePosition {
  membershipId: string
  employeeId: string | null
  firstName: string
  lastName: string
  checkInTime: string
  attendanceRecordId: string
  lat: number
  lng: number
  accuracy: number | null
  recordedAt: string
  currentStop?: CurrentStop | null
}
interface DetectedStop {
  lat: number
  lng: number
  arrivedAt: string
  departedAt: string
  durationMinutes: number
  pingCount: number
}
interface RoutePoint {
  lat: number
  lng: number
  accuracy: number | null
  recordedAt: string
}
interface FieldEmployee {
  id: string
  membershipId: string
  firstName: string
  lastName: string
  employeeId: string | null
  isFieldStaff: boolean
  branchId: string | null
}
interface Branch {
  id: string
  name: string
  isMain: boolean
}
type Tab = 'live' | 'route' | 'manage'

const STAFF_COLORS = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#be185d',
  '#ca8a04',
]

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

// Use LOCAL date, not UTC. toISOString() returns UTC which causes Nepal users
// to see yesterday's date between midnight and 5:45 AM local time.
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const elapsedSince = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function LiveMap({
  positions,
  selectedId,
  onSelect,
  selectedStops = [],
}: {
  positions: LivePosition[]
  selectedId: string | null
  onSelect: (id: string) => void
  selectedStops?: DetectedStop[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const stopMarkersRef = useRef<mapboxgl.Marker[]>([])
  const onSelectRef = useRef(onSelect)
  const fittedRef = useRef(false) // track if we've done the initial fit
  onSelectRef.current = onSelect

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [85.324, 27.7172],
      zoom: 12,
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      fittedRef.current = false
    }
  }, [])

  // Update live-position markers whenever positions change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const wasEmpty = markersRef.current.size === 0

    // Remove markers for employees no longer in the list
    const seen = new Set(positions.map((p) => p.membershipId))
    markersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    })

    // Add or update markers
    positions.forEach((pos, idx) => {
      const color = STAFF_COLORS[idx % STAFF_COLORS.length]
      const isSelected = pos.membershipId === selectedId
      const existing = markersRef.current.get(pos.membershipId)
      if (existing) {
        existing.setLngLat([pos.lng, pos.lat])
        // Update size if selection changed
        const el = existing.getElement()
        el.style.width = isSelected ? '20px' : '16px'
        el.style.height = isSelected ? '20px' : '16px'
        el.style.background = color
      } else {
        const el = document.createElement('div')
        el.style.cssText = `width:${isSelected ? 20 : 16}px;height:${isSelected ? 20 : 16}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;transition:all .2s`
        el.addEventListener('click', () => onSelectRef.current(pos.membershipId))
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([pos.lng, pos.lat])
          .addTo(map)
        markersRef.current.set(pos.membershipId, marker)
      }
    })

    // Only fit/fly on the very first load (not on every 15s refresh).
    // After the user manually pans/zooms, the map stays exactly where they left it.
    if (wasEmpty && positions.length > 0 && !fittedRef.current) {
      fittedRef.current = true
      if (positions.length === 1) {
        // Single point — flyTo at a street-level zoom; fitBounds on one point zooms way out.
        map.flyTo({ center: [positions[0].lng, positions[0].lat], zoom: 16, speed: 1.2 })
      } else {
        // Multiple employees — fit all of them into view.
        const bounds = new mapboxgl.LngLatBounds()
        positions.forEach((p) => bounds.extend([p.lng, p.lat]))
        map.fitBounds(bounds, { padding: 80, maxZoom: 16 })
      }
    }
  }, [positions, selectedId])

  // Render stop markers for the selected employee
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear previous stop markers
    stopMarkersRef.current.forEach((m) => m.remove())
    stopMarkersRef.current = []

    if (!selectedId || selectedStops.length === 0) return

    selectedStops.forEach((stop, i) => {
      const el = document.createElement('div')
      el.style.cssText = `
        display:flex;flex-direction:column;align-items:center;cursor:default;
      `
      // Duration label above the dot
      const label = document.createElement('div')
      label.textContent = `${stop.durationMinutes}m`
      label.style.cssText = `
        background:#ea580c;color:white;font-size:11px;font-weight:700;
        padding:2px 6px;border-radius:10px;white-space:nowrap;
        box-shadow:0 1px 3px rgba(0,0,0,.3);margin-bottom:3px;
      `
      // Dot
      const dot = document.createElement('div')
      dot.style.cssText = `
        width:12px;height:12px;border-radius:50%;
        background:#ea580c;border:2px solid white;
        box-shadow:0 1px 4px rgba(0,0,0,.35);
      `
      el.appendChild(label)
      el.appendChild(dot)

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map)
      stopMarkersRef.current.push(marker)
    })
  }, [selectedId, selectedStops])

  return <div ref={containerRef} className="z-0 h-full w-full rounded-xl border border-slate-200" />
}

// ── Route replay tunables ────────────────────────────────────────────────
// Pings reporting an accuracy radius worse than this are dropped before
// drawing — they are almost always WiFi/cell-tower triangulation noise
// rather than true GPS fixes, and they are the root cause of "straight
// line through 6 buildings" artifacts in the replay.
const ROUTE_ACCURACY_THRESHOLD_M = 50
// Max plausible speed in m/s for a field staff member. Pings that imply
// faster travel than this between consecutive points are GPS noise (tower
// jump, WiFi triangulation artifact) and are dropped. 30 m/s ≈ 108 km/h —
// generous enough for driving, strict enough to catch teleport glitches.
const MAX_SPEED_MS = 30

/** Haversine distance in metres. */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Remove GPS outliers that imply impossible speed between consecutive pings.
 * A ping is dropped if the implied speed from the previous *kept* ping
 * exceeds MAX_SPEED_MS. This eliminates cell-tower jumps and WiFi
 * triangulation noise that cause "straight line through buildings."
 */
function removeSpeedOutliers(points: RoutePoint[]): RoutePoint[] {
  if (points.length < 2) return points
  const result: RoutePoint[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1]
    const curr = points[i]
    const dist = haversineM(prev.lat, prev.lng, curr.lat, curr.lng)
    const dtSec =
      (new Date(curr.recordedAt).getTime() - new Date(prev.recordedAt).getTime()) / 1000
    if (dtSec <= 0) continue // duplicate timestamp
    const speed = dist / dtSec
    if (speed <= MAX_SPEED_MS) {
      result.push(curr)
    }
    // else: drop this ping — it's a GPS glitch
  }
  return result
}


/** IDs of all Mapbox sources/layers added for the current route draw. */
type RouteLayerIds = { sources: string[]; layers: string[] }

function RouteMap({ points, stops = [] }: { points: RoutePoint[]; stops?: DetectedStop[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const loadedRef = useRef(false)
  const addedRef = useRef<RouteLayerIds>({ sources: [], layers: [] })

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [85.324, 27.7172],
      zoom: 12,
    })
    map.on('load', () => { loadedRef.current = true })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, [])

  // Draw route whenever points change
  useEffect(() => {
    const map = mapRef.current
    if (!map || points.length === 0) return
    const draw = () => {
      if (!loadedRef.current) {
        map.once('load', draw)
        return
      }

      // Remove previously added layers/sources
      const prev = addedRef.current
      prev.layers.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id) })
      prev.sources.forEach((id) => { if (map.getSource(id)) map.removeSource(id) })
      addedRef.current = { sources: [], layers: [] }

      const track = (type: 'sources' | 'layers', id: string) =>
        addedRef.current[type].push(id)

      // Filter: accuracy threshold → speed-based outlier removal
      const accuracyFiltered = points.filter(
        (p) => p.accuracy != null && p.accuracy <= ROUTE_ACCURACY_THRESHOLD_M,
      )
      const clean = removeSpeedOutliers(
        accuracyFiltered.length >= 2 ? accuracyFiltered : points,
      )

      // Suppress pings that lie inside a stop cluster — connecting them with
      // a line would draw GPS jitter noise as fake walking. Only keep one
      // representative ping per stop (the centroid) so the stop marker
      // anchors correctly but no line is drawn through the cluster.
      const insideStop = (p: RoutePoint) =>
        stops.some(
          (s) => haversineM(p.lat, p.lng, s.lat, s.lng) <= 50,
        )
      const dedupedForRoute: RoutePoint[] = []
      let lastWasStop = false
      for (const p of clean) {
        if (insideStop(p)) {
          if (!lastWasStop) {
            // Keep the first ping of each stop cluster as an anchor point
            dedupedForRoute.push(p)
          }
          lastWasStop = true
        } else {
          dedupedForRoute.push(p)
          lastWasStop = false
        }
      }

      const usable = (dedupedForRoute.length >= 2 ? dedupedForRoute : clean).length >= 2
        ? (dedupedForRoute.length >= 2 ? dedupedForRoute : clean)
        : points

      // Start/end circle markers via GeoJSON layers
      const firstRaw = usable[0]
      const lastRaw = usable[usable.length - 1]
      ;[
        { id: 'route-start', pt: firstRaw, color: '#16a34a' },
        { id: 'route-end', pt: lastRaw, color: '#dc2626' },
      ].forEach(({ id, pt, color }) => {
        map.addSource(id, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
            properties: {},
          },
        })
        map.addLayer({
          id,
          type: 'circle',
          source: id,
          paint: {
            'circle-radius': 7,
            'circle-color': color,
            'circle-stroke-color': 'white',
            'circle-stroke-width': 2,
          },
        })
        track('sources', id)
        track('layers', id)
      })

      // Stop markers (dwell points)
      stops.forEach((stop, i) => {
        const id = `route-stop-${i}`
        map.addSource(id, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [stop.lng, stop.lat] },
            properties: {},
          },
        })
        map.addLayer({
          id: `${id}-ring`,
          type: 'circle',
          source: id,
          paint: {
            'circle-radius': 18,
            'circle-color': 'rgba(234, 88, 12, 0.15)',
            'circle-stroke-color': '#ea580c',
            'circle-stroke-width': 2,
          },
        })
        track('sources', id)
        track('layers', `${id}-ring`)

        // Duration label via symbol layer
        const labelId = `${id}-label`
        map.addSource(labelId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [stop.lng, stop.lat] },
            properties: { label: `${stop.durationMinutes}m` },
          },
        })
        map.addLayer({
          id: labelId,
          type: 'symbol',
          source: labelId,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-offset': [0, -2],
            'text-anchor': 'bottom',
          },
          paint: {
            'text-color': '#ea580c',
            'text-halo-color': 'white',
            'text-halo-width': 1.5,
          },
        })
        track('sources', labelId)
        track('layers', labelId)
      })

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds()
      usable.forEach((p) => bounds.extend([p.lng, p.lat]))
      stops.forEach((s) => bounds.extend([s.lng, s.lat]))
      map.fitBounds(bounds, { padding: 40 })

    }

    draw()
  }, [points, stops])

  return <div ref={containerRef} className="z-0 h-full w-full rounded-xl border border-slate-200" />
}

function FieldTrackingPageInner() {
  const { user, isLoading: authLoading, calendarMode, features } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('live')
  const isBs = calendarMode === 'NEPALI'

  const [livePositions, setLivePositions] = useState<LivePosition[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedLiveStops, setSelectedLiveStops] = useState<DetectedStop[]>([])
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const [routeMembershipId, setRouteMembershipId] = useState('')
  const [routeDate, setRouteDate] = useState(todayISO())
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [routeStops, setRouteStops] = useState<DetectedStop[]>([])
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [routeLoaded, setRouteLoaded] = useState(false)
  const [routeSearch, setRouteSearch] = useState('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [datesLoading, setDatesLoading] = useState(false)

  const [allEmployees, setAllEmployees] = useState<FieldEmployee[]>([])
  const [manageSearch, setManageSearch] = useState('')
  const [assignLoading, setAssignLoading] = useState<string | null>(null)
  const [manageError, setManageError] = useState<string | null>(null)

  // Branches for the Live-tab filter. selectedBranchId is 'ALL' or a branch id.
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<'ALL' | string>('ALL')

  useEffect(() => {
    if (authLoading) return
    // Role gate — unchanged.
    if (
      !user ||
      (user.role !== 'ORG_ADMIN' && user.role !== 'BRANCH_ADMIN' && user.role !== 'SUPER_ADMIN')
    ) {
      router.push('/admin')
      return
    }
    // Org-feature gate — if the super admin hasn't enabled Live Tracking
    // for this org, the page is off limits. SUPER_ADMIN is exempt (they
    // have no org context of their own and shouldn't be locked out).
    if (user.role !== 'SUPER_ADMIN' && !features.liveTracking) {
      router.push('/admin')
    }
  }, [user, authLoading, features.liveTracking, router])

  const fetchLive = useCallback(async () => {
    const res = await api.get('/api/field-tracking/live')
    if (res.error) {
      setLiveError(res.error.message)
    } else {
      setLivePositions((res.data as LivePosition[]) || [])
      setLiveError(null)
      setLastRefresh(new Date())
    }
    setLiveLoading(false)
  }, [])

  const fetchAllEmployees = useCallback(async () => {
    const res = await api.get('/api/users')
    if (!res.error && res.data) {
      const mapped = (res.data as any[]).map((u: any) => ({
        id: u.id,
        membershipId: u.membershipId,
        firstName: u.firstName,
        lastName: u.lastName,
        employeeId: u.employeeId ?? null,
        isFieldStaff: u.isFieldStaff ?? false,
        branchId: u.branchId ?? null,
      }))
      setAllEmployees(mapped)
      const firstField = mapped.find((e: FieldEmployee) => e.isFieldStaff)
      if (firstField && !routeMembershipId) setRouteMembershipId(firstField.membershipId)
    }
  }, [routeMembershipId])

  const fetchBranches = useCallback(async () => {
    const res = await api.get('/api/branches')
    if (!res.error && Array.isArray(res.data)) setBranches(res.data as Branch[])
  }, [])

  useEffect(() => {
    if (authLoading || !user) return
    fetchLive()
    fetchAllEmployees()
    fetchBranches()
  }, [authLoading, user, fetchLive, fetchAllEmployees, fetchBranches])

  const fieldStaffList = allEmployees.filter((e) => e.isFieldStaff)
  const fieldEmployees = fieldStaffList

  // Fetch available dates when the selected employee changes, then auto-load the latest
  useEffect(() => {
    if (!routeMembershipId) {
      setAvailableDates([])
      return
    }
    let cancelled = false
    setDatesLoading(true)
    setAvailableDates([])
    setRouteLoaded(false)
    api.get(`/api/field-tracking/dates?membershipId=${routeMembershipId}`).then((res) => {
      if (cancelled) return
      setDatesLoading(false)
      if (!res.error && Array.isArray(res.data) && (res.data as string[]).length > 0) {
        const dates = res.data as string[]
        setAvailableDates(dates)
        // Auto-select the latest date (route will be fetched by the routeDate effect below)
        setRouteDate(dates[0])
      } else {
        setAvailableDates([])
      }
    })
    return () => { cancelled = true }
  }, [routeMembershipId])


  useEffect(() => {
    if (!autoRefresh || tab !== 'live') return
    const interval = setInterval(fetchLive, 15_000)
    return () => clearInterval(interval)
  }, [autoRefresh, tab, fetchLive])

  // Fetch today's stops for the selected employee on the live map
  useEffect(() => {
    if (!selectedId) {
      setSelectedLiveStops([])
      return
    }
    const pos = livePositions.find((p) => p.membershipId === selectedId)
    if (!pos) return
    api
      .get(`/api/field-tracking/stops?membershipId=${selectedId}&date=${todayISO()}`)
      .then((res) => {
        if (!res.error && res.data) setSelectedLiveStops(res.data as DetectedStop[])
      })
      .catch(() => {})
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRoute = useCallback(async () => {
    if (!routeMembershipId || !routeDate) return
    setRouteLoading(true)
    setRouteError(null)
    setRouteStops([])
    const [routeRes, stopsRes] = await Promise.all([
      api.get(`/api/field-tracking/route?membershipId=${routeMembershipId}&date=${routeDate}`),
      api.get(`/api/field-tracking/stops?membershipId=${routeMembershipId}&date=${routeDate}`),
    ])
    if (routeRes.error) {
      setRouteError(routeRes.error.message)
      setRoutePoints([])
    } else {
      setRoutePoints((routeRes.data as RoutePoint[]) || [])
    }
    if (!stopsRes.error && stopsRes.data) {
      setRouteStops(stopsRes.data as DetectedStop[])
    }
    setRouteLoading(false)
    setRouteLoaded(true)
  }, [routeMembershipId, routeDate])

  // Auto-fetch route when routeDate changes (from date chip tap or auto-load)
  useEffect(() => {
    if (routeMembershipId && routeDate) {
      fetchRoute()
    }
  }, [routeDate, routeMembershipId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFieldStaff = async (emp: FieldEmployee, assign: boolean) => {
    setAssignLoading(emp.id)
    setManageError(null)
    const res = await api.put(`/api/users/${emp.id}`, { isFieldStaff: assign })
    if (res.error) {
      setManageError(res.error.message)
    } else {
      setAllEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, isFieldStaff: assign } : e)),
      )
    }
    setAssignLoading(null)
  }

  const unassigned = allEmployees.filter(
    (e) =>
      !e.isFieldStaff &&
      (manageSearch === '' ||
        `${e.firstName} ${e.lastName} ${e.employeeId ?? ''}`
          .toLowerCase()
          .includes(manageSearch.toLowerCase())),
  )
  const selectedPos = livePositions.find((p) => p.membershipId === selectedId)

  // membershipId → branchId, sourced from the user list. Live positions don't
  // carry branchId themselves, so we cross-reference.
  const branchByMembership = new Map(allEmployees.map((e) => [e.membershipId, e.branchId]))
  const visibleLivePositions =
    selectedBranchId === 'ALL'
      ? livePositions
      : livePositions.filter((p) => branchByMembership.get(p.membershipId) === selectedBranchId)
  const livePerBranch = (branchId: string) =>
    livePositions.filter((p) => branchByMembership.get(p.membershipId) === branchId).length

  if (authLoading) return null

  const TabBtn = ({
    id,
    icon: Icon,
    label,
    locked = false,
  }: {
    id: Tab
    icon: any
    label: string
    locked?: boolean
  }) => (
    <button
      onClick={() => setTab(id)}
      title={locked ? 'Upgrade to unlock' : undefined}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        locked
          ? tab === id
            ? 'text-amber-700'
            : 'text-slate-400 hover:text-amber-700'
          : tab === id
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {locked && <Lock className="h-3 w-3" />}
    </button>
  )

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Navigation className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Field Tracking</h1>
              <p className="text-xs text-slate-500">{fieldStaffList.length} field staff assigned</p>
            </div>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <TabBtn id="live" icon={Radio} label="Live" />
            <TabBtn
              id="route"
              icon={Navigation}
              label="Route Replay"
              locked={user?.role !== 'SUPER_ADMIN' && !features.routeReplay}
            />
            <TabBtn id="manage" icon={Users} label="Manage Staff" />
          </div>
        </div>

        {/* ── LIVE ── */}
        {tab === 'live' && (
          <div className="flex flex-1 gap-4 overflow-hidden">
            <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                <span className="text-xs text-slate-500">
                  Updated {formatTime(lastRefresh.toISOString())}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAutoRefresh((v) => !v)}
                    className={`text-xs font-medium ${autoRefresh ? 'text-green-600' : 'text-slate-400'}`}
                  >
                    {autoRefresh ? '● Auto' : '○ Auto'}
                  </button>
                  <button
                    onClick={() => {
                      setLiveLoading(true)
                      fetchLive()
                    }}
                    className="rounded p-1 text-slate-400 hover:text-slate-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {liveError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {liveError}
                </div>
              )}
              {branches.length > 1 && (
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2">
                  <button
                    onClick={() => setSelectedBranchId('ALL')}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${selectedBranchId === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    All
                    <span
                      className={`rounded-full px-1.5 text-[10px] ${selectedBranchId === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}
                    >
                      {livePositions.length}
                    </span>
                  </button>
                  {branches.map((b) => {
                    const count = livePerBranch(b.id)
                    const active = selectedBranchId === b.id
                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBranchId(b.id)}
                        title={b.isMain ? 'Main branch' : undefined}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                      >
                        <Building2 className="h-3 w-3" />
                        {b.name}
                        <span
                          className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {liveLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-slate-400">
                  Loading…
                </div>
              ) : visibleLivePositions.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center">
                  <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">
                    {livePositions.length === 0
                      ? 'No field staff active'
                      : 'No staff in this branch'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {livePositions.length === 0
                      ? 'Staff appear here when clocked in'
                      : 'Try a different branch or "All"'}
                  </p>
                </div>
              ) : (
                visibleLivePositions.map((pos, idx) => {
                  const color = STAFF_COLORS[idx % STAFF_COLORS.length]
                  const isSelected = selectedId === pos.membershipId
                  return (
                    <button
                      key={pos.membershipId}
                      onClick={() => setSelectedId(isSelected ? null : pos.membershipId)}
                      className={`rounded-xl border px-3 py-3 text-left transition-all ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium text-slate-900">
                          {pos.firstName} {pos.lastName}
                        </span>
                        {pos.employeeId && (
                          <span className="ml-auto text-xs text-slate-400">#{pos.employeeId}</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 pl-5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          In {formatTime(pos.checkInTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Radio className="h-3 w-3" />
                          {elapsedSince(pos.recordedAt)}
                        </span>
                      </div>
                      {pos.currentStop && (
                        <div className="mt-1.5 ml-5 flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
                          <MapPin className="h-3 w-3" />
                          Stopped here for {pos.currentStop.durationMinutes}m
                        </div>
                      )}
                      {pos.accuracy && (
                        <p className="mt-1 pl-5 text-xs text-slate-400">
                          ±{Math.round(pos.accuracy)}m accuracy
                        </p>
                      )}
                    </button>
                  )
                })
              )}
            </div>
            <div className="relative flex-1 overflow-hidden rounded-xl">
              <LiveMap
                positions={visibleLivePositions}
                selectedId={selectedId}
                onSelect={setSelectedId}
                selectedStops={selectedLiveStops}
              />
              {selectedPos && (
                <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-slate-900">
                      {selectedPos.firstName} {selectedPos.lastName}
                    </span>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="ml-2 text-slate-400 hover:text-slate-700"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedPos.lat.toFixed(5)}, {selectedPos.lng.toFixed(5)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Last ping {elapsedSince(selectedPos.recordedAt)}
                  </p>
                  {selectedPos.currentStop && (
                    <div className="mt-1.5 flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
                      <MapPin className="h-3 w-3" />
                      Stopped for {selectedPos.currentStop.durationMinutes}m
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ROUTE REPLAY ── */}
        {tab === 'route' && user?.role !== 'SUPER_ADMIN' && !features.routeReplay && (
          <FeatureLockScreen featureKey="routeReplay" />
        )}

        {(features.routeReplay || user?.role === 'SUPER_ADMIN') && tab === 'route' && (
          <div className="flex flex-1 gap-4 overflow-hidden">
            <div className="flex w-72 shrink-0 flex-col gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Route Replay</h2>
                <label className="mb-1 block text-xs font-medium text-slate-700">Employee</label>
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee…"
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-8 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                  {routeSearch && (
                    <button
                      onClick={() => setRouteSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="mb-3 max-h-48 space-y-1 overflow-y-auto">
                  {allEmployees
                    .filter((e) => {
                      if (!routeSearch) return true
                      const q = routeSearch.toLowerCase()
                      return (
                        e.firstName.toLowerCase().includes(q) ||
                        e.lastName.toLowerCase().includes(q) ||
                        (e.employeeId ?? '').toLowerCase().includes(q)
                      )
                    })
                    .map((e) => (
                      <button
                        key={e.membershipId}
                        onClick={() => {
                          setRouteMembershipId(e.membershipId)
                          setRouteSearch('')
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          routeMembershipId === e.membershipId
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">
                          {e.firstName} {e.lastName}
                          {e.employeeId ? ` (#${e.employeeId})` : ''}
                        </span>
                        {e.isFieldStaff && (
                          <span className={`shrink-0 text-[10px] ${
                            routeMembershipId === e.membershipId ? 'text-slate-300' : 'text-emerald-600'
                          }`}>
                            Field
                          </span>
                        )}
                      </button>
                    ))}
                  {allEmployees.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400">No employees found</p>
                  )}
                </div>

                {routeMembershipId && (
                  <>
                    {datesLoading ? (
                      <p className="py-2 text-xs text-slate-400">Loading…</p>
                    ) : availableDates.length === 0 ? (
                      <p className="py-2 text-xs text-slate-400">No location data for this employee.</p>
                    ) : (
                      <>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Recent
                        </label>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {availableDates.slice(0, 5).map((d) => {
                            const [y, m, day] = d.split('-').map(Number)
                            let label: string
                            if (isBs) {
                              const bs = adToBS(new Date(y, m - 1, day))
                              label = `${BS_MONTHS_EN[bs.month - 1]} ${bs.day}`
                            } else {
                              label = new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            }
                            return (
                              <button
                                key={d}
                                onClick={() => setRouteDate(d)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                  routeDate === d
                                    ? 'bg-slate-900 text-white'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Other date
                        </label>
                        {isBs ? (
                          <BSDatePicker
                            value={routeDate}
                            onChange={(adDateStr) => setRouteDate(adDateStr)}
                            highlightDates={availableDates}
                          />
                        ) : (
                          <input
                            type="date"
                            value={routeDate}
                            max={todayISO()}
                            onChange={(e) => setRouteDate(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
              {routeLoaded && !routeError && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Summary
                  </h3>
                  {routePoints.length === 0 ? (
                    <p className="text-sm text-slate-500">No location data for this date.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Pings recorded</span>
                        <span className="font-medium text-slate-900">{routePoints.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">First ping</span>
                        <span className="font-medium text-slate-900">
                          {formatTime(routePoints[0].recordedAt)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Last ping</span>
                        <span className="font-medium text-slate-900">
                          {formatTime(routePoints[routePoints.length - 1].recordedAt)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {routeLoaded && routePoints.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Legend
                  </h3>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-600" />
                      Start point
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-600" />
                      Last recorded point
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full border-2 border-orange-500 bg-orange-200" />
                      Stop (dwell point)
                    </div>
                  </div>
                </div>
              )}
              {routeLoaded && routeStops.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Stops ({routeStops.length})
                  </h3>
                  <div className="space-y-2">
                    {routeStops.map((stop, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2"
                      >
                        <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 border-orange-500 bg-orange-200" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-orange-800">
                              {stop.durationMinutes} min
                            </span>
                            <span className="text-[10px] text-orange-600">
                              Stop #{i + 1}
                            </span>
                          </div>
                          <p className="text-[11px] text-orange-700">
                            {formatTime(stop.arrivedAt)} – {formatTime(stop.departedAt)}
                          </p>
                          <p className="text-[10px] text-orange-500">
                            {Number(stop.lat).toFixed(5)}, {Number(stop.lng).toFixed(5)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {routeLoaded && routeStops.length === 0 && routePoints.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  No stops detected (employee did not stay in one spot for 10+ minutes).
                </div>
              )}
              {routeError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {routeError}
                </div>
              )}
            </div>
            <div className="relative flex-1 overflow-hidden rounded-xl">
              {!routeLoaded ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-center">
                    <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">
                      Select an employee and date
                    </p>
                    <p className="mt-1 text-xs text-slate-400">then click Show Route</p>
                  </div>
                </div>
              ) : (
                <RouteMap points={routePoints} stops={routeStops} />
              )}
            </div>
          </div>
        )}

        {/* ── MANAGE STAFF ── */}
        {tab === 'manage' && (
          <div className="flex flex-1 gap-6 overflow-hidden">
            {/* Left — assign */}
            <div className="flex w-80 shrink-0 flex-col gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="mb-1 text-sm font-semibold text-slate-900">Assign Field Staff</h2>
                <p className="mb-3 text-xs text-slate-500">
                  Search an employee and click Assign to enable location tracking.
                </p>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or employee ID…"
                    value={manageSearch}
                    onChange={(e) => setManageSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-8 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                  {manageSearch && (
                    <button
                      onClick={() => setManageSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {manageError && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {manageError}
                  </div>
                )}
                <div className="max-h-96 space-y-1.5 overflow-y-auto">
                  {unassigned.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      {manageSearch
                        ? 'No employees match your search.'
                        : 'All employees are already assigned as field staff.'}
                    </p>
                  ) : (
                    unassigned.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {emp.firstName} {emp.lastName}
                          </p>
                          {emp.employeeId && (
                            <p className="text-xs text-slate-400">#{emp.employeeId}</p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleFieldStaff(emp, true)}
                          disabled={assignLoading === emp.id}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                          {assignLoading === emp.id ? (
                            '…'
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3" />
                              Assign
                            </>
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right — current field staff table */}
            <div className="flex flex-1 flex-col gap-3 overflow-hidden">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Current Field Staff</h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {fieldStaffList.length}
                </span>
              </div>
              {fieldStaffList.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
                  <div className="text-center">
                    <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">
                      No field staff assigned yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Search and assign employees on the left
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Employee ID</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fieldStaffList.map((emp) => {
                        const isLive = livePositions.some(
                          (p) => p.membershipId === emp.membershipId,
                        )
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-slate-300'}`}
                                />
                                <span className="font-medium text-slate-900">
                                  {emp.firstName} {emp.lastName}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {emp.employeeId ? `#${emp.employeeId}` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {isLive ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                  <Radio className="h-3 w-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                                  Off shift
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => toggleFieldStaff(emp, false)}
                                disabled={assignLoading === emp.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                              >
                                {assignLoading === emp.id ? (
                                  '…'
                                ) : (
                                  <>
                                    <Trash2 className="h-3 w-3" />
                                    Remove
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default function FieldTrackingContent() {
  return <FieldTrackingPageInner />
}
