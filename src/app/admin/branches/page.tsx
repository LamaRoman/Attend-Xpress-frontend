'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import {
  Building2,
  MapPin,
  Star,
  Crosshair,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react'

// Mapbox-powered geofence map — loaded client-side only to avoid SSR issues.
const GeofenceMap = dynamic(() => import('@/components/GeoFenceMap'), { ssr: false })

interface Branch {
  id: string
  name: string
  address: string | null
  isMain: boolean
  isActive: boolean
  officeLat: number | null
  officeLng: number | null
  geofenceRadius: number | null
}

// Kathmandu fallback so the map renders something meaningful when a branch
// has no geofence set yet.
const KATHMANDU = { lat: 27.7172, lng: 85.324 }
const DEFAULT_RADIUS_M = 200

function BranchesPageInner() {
  const router = useRouter()
  const { user, isLoading, language } = useAuth()
  const isNp = language === 'NEPALI'

  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Per-edit-session state (lat/lng/radius). Initialized from the selected
  // branch when the modal opens; defaults to Kathmandu/200m if branch has
  // never had geofence configured.
  const [lat, setLat] = useState<number>(KATHMANDU.lat)
  const [lng, setLng] = useState<number>(KATHMANDU.lng)
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS_M)
  const [hasOverride, setHasOverride] = useState(false)

  // Route guard — non-ORG_ADMIN should never see this page.
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) {
      router.replace('/admin')
    }
  }, [user, isLoading, router])

  const loadBranches = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/api/v1/branches')
    if (res.data && Array.isArray(res.data)) setBranches(res.data as Branch[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user?.role === 'ORG_ADMIN') loadBranches()
  }, [user, loadBranches])

  const openEdit = (b: Branch) => {
    setEditing(b)
    setError('')
    const present = b.officeLat != null && b.officeLng != null
    setHasOverride(present)
    setLat(present ? Number(b.officeLat) : KATHMANDU.lat)
    setLng(present ? Number(b.officeLng) : KATHMANDU.lng)
    setRadius(b.geofenceRadius ?? DEFAULT_RADIUS_M)
  }

  const closeEdit = () => {
    setEditing(null)
    setError('')
  }

  const handleUseCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError(isNp ? 'ब्राउजरमा स्थान सेवा उपलब्ध छैन' : 'Geolocation is not available')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setError('')
      },
      () => setError(isNp ? 'स्थान प्राप्त गर्न सकिएन' : 'Could not get location'),
    )
  }

  // The map fires this on click — drop a pin at the clicked coordinate.
  const handleMapLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat)
    setLng(newLng)
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    setError('')
    const res = await api.put(`/api/v1/branches/${editing.id}/geofence`, {
      officeLat: lat,
      officeLng: lng,
      geofenceRadius: radius,
    })
    setSaving(false)
    if (res.error) {
      setError(res.error.message || (isNp ? 'सुरक्षित गर्न सकिएन' : 'Could not save'))
      return
    }
    setToast(isNp ? 'जियोफेन्स अपडेट भयो' : 'Geofence updated')
    setTimeout(() => setToast(''), 2500)
    closeEdit()
    loadBranches()
  }

  // Clear the override entirely — the branch will fall back to org-level
  // geofence (per the resolveGeofenceConfig rules from Phase 5).
  const handleClearOverride = async () => {
    if (!editing) return
    if (!confirm(isNp
      ? 'जियोफेन्स ओभरराइड हटाउने? शाखा अब संगठन-स्तरको जियोफेन्स प्रयोग गर्नेछ।'
      : 'Clear the geofence override? This branch will fall back to the organization-level geofence.',
    )) return
    setSaving(true)
    const res = await api.put(`/api/v1/branches/${editing.id}/geofence`, {
      officeLat: null,
      officeLng: null,
      geofenceRadius: null,
    })
    setSaving(false)
    if (res.error) {
      setError(res.error.message || (isNp ? 'हटाउन सकिएन' : 'Could not clear'))
      return
    }
    setToast(isNp ? 'ओभरराइड हटाइयो' : 'Override cleared')
    setTimeout(() => setToast(''), 2500)
    closeEdit()
    loadBranches()
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
        </div>
      </AdminLayout>
    )
  }
  if (!user || user.role !== 'ORG_ADMIN') return null

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isNp ? 'शाखाहरू' : 'Branches'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isNp
              ? 'आफ्नो संगठनका शाखाहरूको जियोफेन्स सेट गर्नुहोस्। नाम र ठेगाना सुपर एडमिनले मात्र परिवर्तन गर्न सक्छ।'
              : "Configure each branch's geofence. Name and address can only be changed by a Super Admin."}
          </p>
        </header>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
          </div>
        ) : branches.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            {isNp ? 'कुनै शाखा फेला परेन।' : 'No branches found.'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    {isNp ? 'शाखा' : 'Branch'}
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 md:table-cell">
                    {isNp ? 'ठेगाना' : 'Address'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    {isNp ? 'जियोफेन्स' : 'Geofence'}
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((b) => {
                  const hasGeo = b.officeLat != null && b.officeLng != null
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">{b.name}</span>
                          {b.isMain && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                              title={isNp ? 'मुख्य शाखा' : 'Main branch'}
                            >
                              <Star className="h-2.5 w-2.5" />
                              {isNp ? 'मुख्य' : 'Main'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-sm text-slate-600 md:table-cell">
                        {b.address || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        {b.isMain ? (
                          <span
                            className="text-xs text-slate-400"
                            title={isNp
                              ? 'मुख्य शाखाले संगठन-स्तरको जियोफेन्स प्रयोग गर्छ'
                              : 'Main branch uses the org-level geofence'}
                          >
                            {isNp ? 'संगठन-स्तरबाट' : 'Inherits org geofence'}
                          </span>
                        ) : hasGeo ? (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span className="font-mono">
                              {Number(b.officeLat).toFixed(4)}, {Number(b.officeLng).toFixed(4)}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span>{b.geofenceRadius ?? DEFAULT_RADIUS_M}m</span>
                          </div>
                        ) : (
                          <span
                            className="text-xs text-slate-400"
                            title={isNp
                              ? 'संगठन-स्तरको जियोफेन्समा फलब्याक'
                              : 'Falls back to org-level geofence'}
                          >
                            {isNp ? 'सेट गरिएको छैन' : 'Not set'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {b.isMain ? (
                          <span
                            className="text-xs text-slate-400"
                            title={isNp
                              ? 'संगठन सेटिङबाट व्यवस्थापन हुन्छ'
                              : 'Managed in organization settings'}
                          >
                            {isNp ? 'संगठन सेटिङ' : 'Org settings'}
                          </span>
                        ) : (
                          <button
                            onClick={() => openEdit(b)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            {isNp ? 'सम्पादन' : 'Edit'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
            <CheckCircle className="h-4 w-4" />
            {toast}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {isNp ? 'जियोफेन्स सम्पादन' : 'Edit Geofence'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{editing.name}</p>
              </div>
              <button
                onClick={closeEdit}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {!hasOverride && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {isNp
                    ? 'यो शाखाको जियोफेन्स अहिले संगठन-स्तरमा सेट छ। तल नक्सामा क्लिक गरेर शाखा-स्तरको ओभरराइड सेट गर्नुहोस्।'
                    : 'This branch is currently using the org-level geofence. Click on the map below to set a branch-level override.'}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-600">
                  {isNp ? 'नक्सामा क्लिक गरेर पिन सार्नुहोस्' : 'Click the map to move the pin'}
                </div>
                <button
                  onClick={handleUseCurrentLocation}
                  className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Crosshair className="h-3 w-3" />
                  {isNp ? 'मेरो स्थान' : 'Use my location'}
                </button>
              </div>

              <div className="h-64 overflow-hidden rounded-lg border border-slate-200">
                <GeofenceMap
                  latitude={lat}
                  longitude={lng}
                  radius={radius}
                  onLocationChange={handleMapLocationChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-xs font-medium text-slate-500">
                    {isNp ? 'अक्षांश' : 'Latitude'}
                  </label>
                  <div className="mt-0.5 font-mono text-sm text-slate-800">{lat.toFixed(6)}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">
                    {isNp ? 'देशान्तर' : 'Longitude'}
                  </label>
                  <div className="mt-0.5 font-mono text-sm text-slate-800">{lng.toFixed(6)}</div>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-500">
                    {isNp ? 'दायरा' : 'Radius'}
                  </label>
                  <span className="text-xs font-medium text-slate-700">{radius}m</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={10}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>50m</span>
                  <span>1000m</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
              {hasOverride ? (
                <button
                  onClick={handleClearOverride}
                  disabled={saving}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  title={isNp
                    ? 'ओभरराइड हटाउनुहोस् (संगठन-स्तरमा फलब्याक)'
                    : 'Clear override (fall back to org-level)'}
                >
                  <Trash2 className="h-3 w-3" />
                  {isNp ? 'ओभरराइड हटाउनुहोस्' : 'Clear override'}
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  onClick={closeEdit}
                  disabled={saving}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? (isNp ? 'सुरक्षित गर्दै…' : 'Saving…') : isNp ? 'सुरक्षित गर्नुहोस्' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default function BranchesPage() {
  return <BranchesPageInner />
}
