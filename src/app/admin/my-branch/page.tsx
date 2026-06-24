'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import { Building2, MapPin, Star, Info } from 'lucide-react'

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

const KATHMANDU = { lat: 27.7172, lng: 85.324 }
const DEFAULT_RADIUS_M = 200

/**
 * BRANCH_ADMIN's read-only view of their own branch.
 *
 * Useful for diagnosing clock-in failures: branch admin can verify what
 * geofence is configured before reporting an issue to ORG_ADMIN.
 *
 * Backend already scopes /api/v1/branches to return only the BRANCH_ADMIN's
 * own branch — so we just read the first (and only) entry.
 */
export default function MyBranchPage() {
  const router = useRouter()
  const { user, isLoading, language } = useAuth()
  const isNp = language === 'NEPALI'

  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'BRANCH_ADMIN')) {
      router.replace('/admin')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role !== 'BRANCH_ADMIN') return
    api.get('/api/v1/branches').then((res) => {
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setBranch((res.data as Branch[])[0])
      }
      setLoading(false)
    })
  }, [user])

  if (isLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
        </div>
      </AdminLayout>
    )
  }
  if (!user || user.role !== 'BRANCH_ADMIN') return null

  // The main branch always inherits the org geofence — never show its own coords.
  const hasGeo =
    branch && !branch.isMain && branch.officeLat != null && branch.officeLng != null
  const mapLat = hasGeo ? Number(branch!.officeLat) : KATHMANDU.lat
  const mapLng = hasGeo ? Number(branch!.officeLng) : KATHMANDU.lng
  const mapRadius = branch?.geofenceRadius ?? DEFAULT_RADIUS_M

  // Read-only: the map's click handler is a no-op. Users can pan/zoom but
  // can't actually move the pin.
  const noopLocationChange = () => {}

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isNp ? 'मेरो शाखा' : 'My Branch'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isNp
              ? 'तपाईंको शाखाको जियोफेन्स कन्फिगरेसन। परिवर्तनको लागि संगठन प्रशासकलाई सम्पर्क गर्नुहोस्।'
              : 'Geofence configuration for your branch. Contact your org admin to make changes.'}
          </p>
        </header>

        {!branch ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            {isNp ? 'शाखा फेला परेन।' : 'Branch not found.'}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">{branch.name}</span>
                  {branch.isMain && (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                      title={isNp ? 'मुख्य शाखा' : 'Main branch'}
                    >
                      <Star className="h-2.5 w-2.5" />
                      {isNp ? 'मुख्य' : 'Main'}
                    </span>
                  )}
                </div>
                {branch.address && (
                  <div className="mt-1 text-xs text-slate-500">{branch.address}</div>
                )}
              </div>

              <div className="space-y-4 p-5">
                {branch.isMain ? (
                  <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>
                      {isNp
                        ? 'मुख्य शाखाले सधैं संगठन-स्तरको जियोफेन्स प्रयोग गर्छ।'
                        : 'This is the main branch — it always uses the organization-level geofence.'}
                    </span>
                  </div>
                ) : !hasGeo ? (
                  <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>
                      {isNp
                        ? 'यो शाखाले संगठन-स्तरको जियोफेन्स प्रयोग गर्दैछ। शाखा-स्तरको ओभरराइड सेट गर्न संगठन प्रशासकलाई सम्पर्क गर्नुहोस्।'
                        : 'This branch is using the organization-level geofence. Contact your org admin to set a branch-level override.'}
                    </span>
                  </div>
                ) : null}

                <div className="h-64 overflow-hidden rounded-lg border border-slate-200">
                  <GeofenceMap
                    latitude={mapLat}
                    longitude={mapLng}
                    radius={mapRadius}
                    onLocationChange={noopLocationChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">
                      {isNp ? 'अक्षांश' : 'Latitude'}
                    </label>
                    <div className="mt-0.5 font-mono text-sm text-slate-800">
                      {hasGeo ? mapLat.toFixed(6) : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">
                      {isNp ? 'देशान्तर' : 'Longitude'}
                    </label>
                    <div className="mt-0.5 font-mono text-sm text-slate-800">
                      {hasGeo ? mapLng.toFixed(6) : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">
                      {isNp ? 'दायरा' : 'Radius'}
                    </label>
                    <div className="mt-0.5 flex items-center gap-1 text-sm text-slate-800">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {hasGeo ? `${mapRadius}m` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
