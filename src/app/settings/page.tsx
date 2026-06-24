'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import AdminLayout from '@/components/AdminLayout'
import { api } from '@/lib/api'
import dynamic from 'next/dynamic'
import DocumentTypeManager from '@/components/DocumentTypeManager'

import {
  ArrowLeft,
  LogOut,
  Settings,
  Globe,
  Calendar,
  Building,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle,
  AlertCircle,
  Shield,
  X,
  Languages,
  RefreshCw,
  Check,
  LocateFixed,
  Compass,
  Clock,
  BookOpen,
} from 'lucide-react'

// Mapbox-powered geofence map — loaded client-side only to avoid SSR issues.
const GeofenceMap = dynamic(() => import('@/components/GeoFenceMap'), { ssr: false })

interface OrgSettings {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  calendarMode: 'NEPALI' | 'ENGLISH'
  language: 'NEPALI' | 'ENGLISH'
  isActive: boolean
}

function OrgSettingsPageInner() {
  const { user, isLoading, logout, isAdmin, language: currentLang, refreshUser, features } = useAuth()
  const router = useRouter()
  const isNepali = currentLang === 'NEPALI'

  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [saving, setSaving] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    language: 'NEPALI' as 'NEPALI' | 'ENGLISH',
    calendarMode: 'NEPALI' as 'NEPALI' | 'ENGLISH',
    geofenceEnabled: false,
    officeLat: '',
    officeLng: '',
    geofenceRadius: 100,
    attendanceMode: 'QR_ONLY' as 'QR_ONLY' | 'MOBILE_ONLY' | 'BOTH',
    workingDays: '0,1,2,3,4,5',
    workStartTime: '10:00',
    workEndTime: '18:00',
    lateThresholdMinutes: 10,
    earlyClockInGraceMinutes: 15,
    lateClockOutGraceMinutes: 30,
    notificationRetentionDays: 30,
    // ── Leave Balance Policy ──────────────────────────────────────────────
    maxDailyCheckins: null as number | null,
    autoCloseGraceMinutes: 240,
  })

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/login')
    }
  }, [user, isLoading, isAdmin, router])

  const loadSettings = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/api/v1/org-settings')
    if (res.data) {
      const data = res.data as any
      setSettings(data)
      setFormData({
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        language: data.language,
        calendarMode: data.calendarMode,
        geofenceEnabled: data.geofenceEnabled || false,
        attendanceMode: data.attendanceMode || 'QR_ONLY',
        workingDays: data.workingDays || '0,1,2,3,4,5',
        officeLat: data.officeLat || '',
        officeLng: data.officeLng || '',
        geofenceRadius: data.geofenceRadius || 100,
        workStartTime: data.workStartTime || '10:00',
        workEndTime: data.workEndTime || '18:00',
        lateThresholdMinutes: data.lateThresholdMinutes || 10,
        earlyClockInGraceMinutes: data.earlyClockInGraceMinutes ?? 15,
        lateClockOutGraceMinutes: data.lateClockOutGraceMinutes ?? 30,
        notificationRetentionDays: 30,
        maxDailyCheckins: data.maxDailyCheckins ?? null,
        autoCloseGraceMinutes: data.autoCloseGraceMinutes ?? 240,
      })
      const configRes = await api.get('/api/v1/config')
      if (configRes.data) {
        const configMap = (configRes.data as any).configMap || {}
        setFormData((prev) => ({
          ...prev,
          notificationRetentionDays: configMap.notificationRetentionDays
            ? parseInt(configMap.notificationRetentionDays)
            : 30,
        }))
      }
      setLastRefreshed(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user && isAdmin) loadSettings()
  }, [user, isAdmin, loadSettings])

  const handleSave = async () => {
    setSaving(true)
    setError('')

    const res = await api.put('/api/v1/org-settings', {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      language: formData.language,
      calendarMode: formData.calendarMode,
      geofenceEnabled: formData.geofenceEnabled,
      attendanceMode: formData.attendanceMode,
      workingDays: formData.workingDays,
      officeLat: formData.officeLat ? parseFloat(formData.officeLat) : null,
      officeLng: formData.officeLng ? parseFloat(formData.officeLng) : null,
      geofenceRadius: formData.geofenceRadius,
      workStartTime: formData.workStartTime,
      workEndTime: formData.workEndTime,
      lateThresholdMinutes: formData.lateThresholdMinutes,
      earlyClockInGraceMinutes: formData.earlyClockInGraceMinutes,
      lateClockOutGraceMinutes: formData.lateClockOutGraceMinutes,
      maxDailyCheckins: formData.maxDailyCheckins,
      autoCloseGraceMinutes: formData.autoCloseGraceMinutes,
    })

    await api.put('/api/v1/config/notificationRetentionDays', {
      value: String(Math.min(90, Math.max(7, formData.notificationRetentionDays))),
    })

    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(isNepali ? 'सेटिङ्स सफलतापूर्वक अपडेट गरियो।' : 'Settings updated successfully.')
      const updated = res.data as any
      setSettings(updated)
      setFormData({
        name: updated.name,
        email: updated.email || '',
        phone: updated.phone || '',
        address: updated.address || '',
        language: updated.language,
        calendarMode: updated.calendarMode,
        geofenceEnabled: updated.geofenceEnabled || false,
        attendanceMode: updated.attendanceMode || 'QR_ONLY',
        workingDays: updated.workingDays || '0,1,2,3,4,5',
        officeLat: updated.officeLat || '',
        officeLng: updated.officeLng || '',
        geofenceRadius: updated.geofenceRadius || 100,
        workStartTime: updated.workStartTime || '10:00',
        workEndTime: updated.workEndTime || '18:00',
        lateThresholdMinutes: updated.lateThresholdMinutes || 10,
        earlyClockInGraceMinutes: updated.earlyClockInGraceMinutes ?? 15,
        lateClockOutGraceMinutes: updated.lateClockOutGraceMinutes ?? 30,
        notificationRetentionDays: formData.notificationRetentionDays,
        maxDailyCheckins: updated.maxDailyCheckins ?? null,
        autoCloseGraceMinutes: updated.autoCloseGraceMinutes ?? 240,
      })
      await refreshUser()
      setLastRefreshed(new Date())
      setTimeout(() => setSuccess(''), 5000)
    }

    setSaving(false)
  }

  const getCurrentLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData({
            ...formData,
            officeLat: pos.coords.latitude.toString(),
            officeLng: pos.coords.longitude.toString(),
          })
        },
        () => {
          setError(isNepali ? 'स्थान प्राप्त गर्न सकिएन' : 'Could not get location')
        },
      )
    }
  }

  const handleMapLocationChange = (lat: number, lng: number) => {
    setFormData({ ...formData, officeLat: lat.toString(), officeLng: lng.toString() })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <AdminLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="rounded-lg p-2 transition-colors hover:bg-slate-100"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-900 p-2">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-slate-900">
                    {isNepali ? 'संगठन सेटिङ्स' : 'Organization settings'}
                  </h1>
                  <p className="text-sm text-slate-500">{settings?.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastRefreshed && (
                <span className="text-xs text-slate-400">
                  {isNepali ? 'पछिल्लो अपडेट:' : 'Updated'}{' '}
                  {lastRefreshed.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              )}
              <button
                onClick={loadSettings}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {isNepali ? 'रिफ्रेश' : 'Refresh'}
              </button>
              <button
                onClick={logout}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <span className="text-sm font-medium text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">{success}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* ── Language & Calendar ── */}
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-800 p-2.5">
                  <Languages className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    {isNepali ? 'भाषा र क्यालेन्डर' : 'Language & Calendar'}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {isNepali
                      ? 'तपाईंको संगठनको प्राथमिकता सेट गर्नुहोस्'
                      : 'Set your organization preferences'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-8 p-6">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Globe className="h-4 w-4 text-slate-400" />
                  {isNepali ? 'प्रदर्शन भाषा' : 'Display language'}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {(['NEPALI', 'ENGLISH'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setFormData({ ...formData, language: lang })}
                      className={`group relative rounded-xl border-2 p-5 transition-all duration-200 ${formData.language === lang ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <div className="text-center">
                        <div className="mb-2 text-2xl font-bold text-slate-800">
                          {lang === 'NEPALI' ? 'नेपाली' : 'English'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lang === 'NEPALI' ? 'Nepali' : 'अंग्रेजी'}
                        </div>
                      </div>
                      {formData.language === lang && (
                        <div className="absolute right-3 top-3">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {isNepali ? 'क्यालेन्डर मोड' : 'Calendar mode'}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {(['NEPALI', 'ENGLISH'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFormData({ ...formData, calendarMode: mode })}
                      className={`group relative rounded-xl border-2 p-5 transition-all duration-200 ${formData.calendarMode === mode ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <div className="text-center">
                        <div className="mb-2 text-lg font-semibold text-slate-800">
                          {mode === 'NEPALI' ? 'बि.सं.' : 'A.D.'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {mode === 'NEPALI' ? 'Bikram Sambat' : 'Gregorian'}
                        </div>
                      </div>
                      {formData.calendarMode === mode && (
                        <div className="absolute right-3 top-3">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Organization Info ── */}
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-800 p-2.5">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    {isNepali ? 'संगठन विवरण' : 'Organization details'}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {isNepali
                      ? 'तपाईंको संगठनको आधारभूत जानकारी'
                      : 'Basic information about your organization'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Building className="h-4 w-4 text-slate-400" />
                  {isNepali ? 'संगठनको नाम' : 'Organization name'}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base transition-all placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  placeholder={isNepali ? 'तपाईंको संगठनको नाम' : 'Your organization name'}
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {isNepali ? 'इमेल' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    placeholder="info@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {isNepali ? 'फोन' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    placeholder="+977 1 2345678"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {isNepali ? 'ठेगाना' : 'Address'}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  placeholder={isNepali ? 'काठमाडौं, नेपाल' : 'Kathmandu, Nepal'}
                />
              </div>
            </div>
          </div>

          {/* ── Work Schedule ── */}
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-800 p-2.5">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    {isNepali ? 'कार्य समयतालिका' : 'Work Schedule'}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {isNepali
                      ? 'कार्यालयको समय, ढिलो सीमा र ग्रेस पिरियड सेट गर्नुहोस्'
                      : 'Set office hours, late threshold, and grace periods'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
              {/* Opening / Closing times */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {isNepali ? 'खुल्ने समय' : 'Opening Time'}
                  </label>
                  <input
                    type="time"
                    value={formData.workStartTime}
                    onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                  <p className="text-xs text-slate-500">
                    {isNepali
                      ? 'कर्मचारीहरू यो समय पछि आए ढिलो मानिन्छ'
                      : 'Employees arriving after this time are marked late'}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {isNepali ? 'बन्द हुने समय' : 'Closing Time'}
                  </label>
                  <input
                    type="time"
                    value={formData.workEndTime}
                    onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                  <p className="text-xs text-slate-500">
                    {isNepali
                      ? 'कार्यालय बन्द हुने समय — AUTO_CLOSED रेकर्डहरू यहाँ सीमित हुन्छन्'
                      : 'Office closing time — forgotten clock-outs are capped here'}
                  </p>
                </div>
              </div>

              {/* Working Days */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {isNepali ? 'कार्य दिनहरू' : 'Working Days'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { day: 0, en: 'Sun', np: 'आइत' },
                    { day: 1, en: 'Mon', np: 'सोम' },
                    { day: 2, en: 'Tue', np: 'मंगल' },
                    { day: 3, en: 'Wed', np: 'बुध' },
                    { day: 4, en: 'Thu', np: 'बिहि' },
                    { day: 5, en: 'Fri', np: 'शुक्र' },
                    { day: 6, en: 'Sat', np: 'शनि' },
                  ].map(({ day, en, np }) => {
                    const activeDays = formData.workingDays.split(',').map(Number)
                    const isActive = activeDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const current = formData.workingDays.split(',').map(Number)
                          const updated = isActive
                            ? current.filter((d) => d !== day)
                            : [...current, day].sort()
                          if (updated.length > 0) {
                            setFormData({ ...formData, workingDays: updated.join(',') })
                          }
                        }}
                        className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-150 ${
                          isActive
                            ? 'border-slate-800 bg-slate-800 text-white'
                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {isNepali ? np : en}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  {isNepali
                    ? 'कार्य दिन चयन गर्नुहोस्। बिदाका दिनहरू तलब गणनामा अनुपस्थितिमा गनिँदैन।'
                    : "Select working days. Non-working days are paid holidays and won't count as absences."}
                </p>
              </div>

              {/* Late threshold + Notification retention */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {isNepali ? 'ढिलो आगमन सीमा (मिनेट)' : 'Late Threshold (Minutes)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="5"
                    value={formData.lateThresholdMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lateThresholdMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    placeholder="10"
                  />
                  <p className="text-xs text-slate-500">
                    {isNepali
                      ? 'यो मिनेट भन्दा बढी ढिलो भएमा सूचना पठाउनुहोस्। (डिफल्ट: १०)'
                      : 'Notify when employee is late by more than this. (Default: 10)'}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {isNepali ? 'सूचना राख्ने दिन' : 'Notification Retention (days)'}
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="90"
                    value={formData.notificationRetentionDays ?? 30}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationRetentionDays: Math.min(
                          90,
                          Math.max(7, parseInt(e.target.value) || 30),
                        ),
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                  <p className="text-xs text-slate-500">
                    {isNepali
                      ? 'सूचनाहरू यो दिन पछि स्वतः हटाइनेछ। (न्यूनतम: ७, अधिकतम: ९०)'
                      : 'Notifications older than this will be auto-deleted. Min: 7, Max: 90 days.'}
                  </p>
                </div>
              </div>

              {/* Daily Clock-in Limit */}
              <div className="border-t border-slate-100 pt-4">
                <div className="mb-1 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-medium text-slate-700">
                    {isNepali ? 'दैनिक क्लक-इन सीमा' : 'Daily Clock-in Limit'}
                  </p>
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  {isNepali
                    ? 'एक कर्मचारीले दिनमा कति पटक क्लक-इन गर्न सक्छ। खाली छाड्नुस् भने असीमित हुन्छ।'
                    : 'Maximum clock-ins per employee per day. Leave blank for unlimited (recommended for offices).'}
                </p>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {isNepali ? 'अधिकतम क्लक-इन' : 'Max clock-ins per day'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      value={formData.maxDailyCheckins ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxDailyCheckins: e.target.value === '' ? null : parseInt(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                      placeholder={isNepali ? 'असीमित' : 'Unlimited'}
                    />
                    <p className="text-xs text-slate-500">
                      {isNepali
                        ? 'काफे / रेस्टुरेन्टका लागि ३–५ राख्नुहोस्। अफिसका लागि खाली छाड्नुस्।'
                        : 'Set 3–5 for cafes or restaurants with break shifts. Leave blank for offices.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-close grace + Payroll overtime grace periods */}
              <div className="pb-1 pt-2">
                <p className="mb-1 text-sm font-medium text-slate-700">
                  {isNepali ? 'Auto-close Grace (मिनेट)' : 'Auto-close Grace (min)'}
                </p>
                <p className="mb-3 text-xs text-slate-400">
                  {isNepali
                    ? `Closing Time सेट गरिएको छ भने, बिर्सिएको clock-out shift अन्त्यको ${Math.round(formData.autoCloseGraceMinutes / 60)} घण्टापछि स्वत: बन्द हुन्छ। यो सीमा पार भएपछि record स्वत: बन्द हुन्छ। राति पार हुने shift पनि सही तरिकाले सम्हालिन्छ। Closing Time नभएको खण्डमा मध्यरातलाई सीमा मानिन्छ।`
                    : `Forgotten clock-outs are auto-closed this many minutes after shift end. Cross-midnight shifts are handled correctly. If no Closing Time is configured, midnight is the fallback. (Default: 240 min / 4 hrs)`}
                </p>
                <input
                  type="number"
                  min="30"
                  max="1440"
                  step="30"
                  value={formData.autoCloseGraceMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      autoCloseGraceMinutes: parseInt(e.target.value) || 240,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  placeholder="240"
                />
              </div>

              {/* Payroll overtime grace periods */}
              <div className="pb-1 pt-2">
                <p className="mb-1 text-sm font-medium text-slate-700">
                  {isNepali ? 'पेरोल ओभरटाइम ग्रेस' : 'Payroll Overtime Grace'}
                </p>
                <p className="mb-4 text-xs text-slate-400">
                  {isNepali
                    ? 'यी मिनेटहरूलाई पेरोल ओभरटाइम गणनामा समावेश गरिँदैन — स्वत: बन्द हुने व्यवहारसँग कुनै सम्बन्ध छैन।'
                    : 'These minutes are excluded from payroll overtime calculations only — they have no effect on auto-close behaviour.'}
                </p>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {isNepali ? 'सुरु ग्रेस (मिनेट)' : 'Early Clock-in Grace (min)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="5"
                      value={formData.earlyClockInGraceMinutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          earlyClockInGraceMinutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                      placeholder="15"
                    />
                    <p className="text-xs text-slate-500">
                      {isNepali
                        ? 'शुरु समय भन्दा यति मिनेट अगाडि आएमा ओभरटाइम मानिँदैन। (डिफल्ट: १५)'
                        : 'Clock-ins this many minutes before shift start are treated as on-time. (Default: 15)'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {isNepali ? 'अन्त ग्रेस (मिनेट)' : 'Late Clock-out Grace (min)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      step="5"
                      value={formData.lateClockOutGraceMinutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lateClockOutGraceMinutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                      placeholder="30"
                    />
                    <p className="text-xs text-slate-500">
                      {isNepali
                        ? 'अन्त समय पछि यति मिनेटसम्म ओभरटाइम मानिँदैन। (डिफल्ट: ३०)'
                        : 'Clock-outs this many minutes after shift end are treated as on-time. (Default: 30)'}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── Geofencing ── */}
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-800 p-2.5">
                  <Compass className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    {isNepali ? 'जियोफेन्सिङ' : 'Geofencing'}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {isNepali
                      ? 'कर्मचारीहरू कार्यालय नजिक मात्र चेक इन गर्न सक्छन्'
                      : 'Employees can only check in when near the office'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <label className="group mb-6 flex cursor-pointer items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.geofenceEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, geofenceEnabled: e.target.checked })
                    }
                    className="sr-only"
                  />
                  <div
                    className={`h-6 w-10 rounded-full transition-colors duration-200 ${formData.geofenceEnabled ? 'bg-slate-800' : 'bg-slate-200'}`}
                  >
                    <div
                      className={`absolute top-1 h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${formData.geofenceEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900">
                  {isNepali ? 'जियोफेन्सिङ सक्रिय गर्नुहोस्' : 'Enable geofencing'}
                </span>
              </label>

              {formData.geofenceEnabled && (
                <div className="animate-in slide-in-from-top-2 space-y-5 duration-200">
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      {isNepali
                        ? 'नक्सामा क्लिक गर्नुहोस् वा मार्कर तान्नुहोस् स्थान सेट गर्न।'
                        : 'Click on the map or drag the marker to set location. Dashed circle shows geofence area.'}
                    </p>
                    {formData.officeLat && formData.officeLng && (
                      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          {isNepali ? 'हालको स्थान: ' : 'Current location: '}
                          <span className="font-mono font-medium">
                            {Number(formData.officeLat).toFixed(6)},{' '}
                            {Number(formData.officeLng).toFixed(6)}
                          </span>
                          {' · '}
                          {formData.geofenceRadius}m {isNepali ? 'दायरा' : 'radius'}
                        </span>
                      </div>
                    )}
                    <GeofenceMap
                      latitude={formData.officeLat ? Number(formData.officeLat) : 27.7172}
                      longitude={formData.officeLng ? Number(formData.officeLng) : 85.324}
                      radius={formData.geofenceRadius}
                      onLocationChange={handleMapLocationChange}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">
                        {isNepali ? 'अक्षांश' : 'Latitude'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={formData.officeLat}
                          onChange={(e) => setFormData({ ...formData, officeLat: e.target.value })}
                          placeholder="27.7172"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pl-8 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                        />
                        <MapPin className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">
                        {isNepali ? 'देशान्तर' : 'Longitude'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={formData.officeLng}
                          onChange={(e) => setFormData({ ...formData, officeLng: e.target.value })}
                          placeholder="85.3240"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pl-8 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                        />
                        <Compass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-500">
                        {isNepali ? 'अनुमति दायरा' : 'Allowed radius'}
                      </label>
                      <span className="text-sm font-medium text-slate-700">
                        {formData.geofenceRadius}m
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={formData.geofenceRadius}
                      onChange={(e) =>
                        setFormData({ ...formData, geofenceRadius: Number(e.target.value) })
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-slate-800"
                    />
                    <div className="flex justify-between px-1 text-[10px] text-slate-400">
                      <span>50m</span>
                      <span>275m</span>
                      <span>500m</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                  >
                    <LocateFixed className="h-4 w-4" />
                    {isNepali ? 'हालको स्थान प्रयोग गर्नुहोस्' : 'Use current location'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Document Type Manager — plan-gated ── */}
          {features.documentUpload && (
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
              <DocumentTypeManager language={formData.language} />
            </div>
          )}

          {/* ── Save ── */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => router.push('/admin')}
              className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              {isNepali ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-slate-900 hover:to-slate-800 hover:shadow disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{isNepali ? 'सेभ हुँदैछ...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span>{isNepali ? 'सेभ गर्नुहोस्' : 'Save changes'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 pb-6 pt-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <Shield className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-900">
                {isNepali ? 'संगठन सेटिङ्स' : 'Organization settings'}
              </p>
              <p className="text-[10px] text-slate-500">
                {isNepali ? 'Attend Xpress' : 'Attend Xpress'}
              </p>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </AdminLayout>
  )
}

export default function OrgSettingsPage() {
  return <OrgSettingsPageInner />
}
