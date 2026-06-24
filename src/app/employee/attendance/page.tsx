'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { bsToAD, adToBS, BS_MONTHS_EN, BS_MONTHS_NP } from '@/components/BSDatePicker'
import MiniCalendar from '@/components/MiniCalendar'
import {
  ChevronLeft,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Timer,
  AlertCircle,
} from 'lucide-react'
import PoweredBy from '@/components/PoweredBy'

interface AttendanceRecord {
  id: string
  checkInTime: string
  checkOutTime: string | null
  duration: number | null
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'AUTO_CLOSED'
  bsYear: number
  bsMonth: number
  bsDay: number
  notes: string | null
}

interface AttendanceSummary {
  daysPresent: number
  totalMinutes: number
  lateCount: number
  workStartTime: string | null
}

interface AttendanceData {
  records: AttendanceRecord[]
  pagination: { total: number; limit: number; offset: number; hasMore: boolean }
  summary: AttendanceSummary | null
}

export default function EmployeeAttendancePage() {
  const { user, isLoading, language } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'

  // Initialise to the BS month that matches the first day of the current AD month
  // (same anchor MiniCalendar uses for its viewDate)
  const initViewDate = (() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })()
  const initBS = adToBS(initViewDate)

  const [selectedYear, setSelectedYear] = useState(initBS.year)
  const [selectedMonth, setSelectedMonth] = useState(initBS.month)
  const [data, setData] = useState<AttendanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [presentDays, setPresentDays] = useState<Set<string> | undefined>(undefined)

  // Auto-fetch whenever the viewed BS month changes
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const toAdStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    setLoading(true)
    setError('')
    setPresentDays(undefined)

    api
      .get(`/api/v1/attendance/my?bsYear=${selectedYear}&bsMonth=${selectedMonth}&limit=50&offset=0`)
      .then((res) => {
        if (cancelled) return
        if (res.error) throw new Error(res.error.message)
        const att = res.data as AttendanceData
        setData(att)

        const pDays = new Set<string>()
        att.records.forEach((r) => {
          try {
            const adDate = bsToAD(r.bsYear, r.bsMonth, r.bsDay)
            pDays.add(toAdStr(adDate))
          } catch { /* skip invalid dates */ }
        })
        setPresentDays(pDays)
      })
      .catch((e: any) => {
        if (!cancelled) setError(e.message || 'Failed to load attendance')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedYear, selectedMonth, user])

  // Called by MiniCalendar when the user navigates to a new month
  const handleMonthChange = useCallback((d: Date) => {
    const bs = adToBS(d)
    setSelectedYear(bs.year)
    setSelectedMonth(bs.month)
  }, [])

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return isNp ? `${h} घ. ${m} मि.` : `${h}h ${m}m`
  }

  const isLateRecord = (record: AttendanceRecord, workStartTime: string | null): boolean => {
    if (!workStartTime || !record.checkInTime) return false
    const [startHour, startMin] = workStartTime.split(':').map(Number)
    const checkIn = new Date(record.checkInTime)
    const workStart = new Date(checkIn)
    workStart.setHours(startHour, startMin, 0, 0)
    return checkIn > workStart
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-500" />
      </div>
    )
  }
  if (!user) return null

  const summary = data?.summary ?? null
  const records = data?.records ?? []

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-lg px-4">
          <div className="flex h-16 items-center gap-3">
            <button
              onClick={() => router.push('/employee')}
              className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="rounded-xl bg-slate-900 p-2">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">
                {isNp ? 'उपस्थिति इतिहास' : 'Attendance History'}
              </h1>
              <p className="text-xs text-gray-500">
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full flex-1 space-y-4 px-3 py-3">

        {/* Calendar — navigation drives attendance fetch */}
        <MiniCalendar
          initialBs={true}
          isNp={isNp}
          presentDays={presentDays}
          noLeaves={true}
          expanded={true}
          onMonthChange={handleMonthChange}
        />

        {/* Stats + records — capped width so they stay readable below the full-width calendar */}
        <div className="mx-auto w-full max-w-2xl space-y-4">

        {/* Loading spinner */}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-slate-400" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
              label={isNp ? 'उपस्थित' : 'Days Present'}
              value={String(summary.daysPresent)}
              color="emerald"
            />
            <StatCard
              icon={<Timer className="h-4 w-4 text-blue-600" />}
              label={isNp ? 'जम्मा घण्टा' : 'Total Hours'}
              value={`${Math.floor(summary.totalMinutes / 60)}h ${summary.totalMinutes % 60}m`}
              color="blue"
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              label={isNp ? 'ढिलो आगमन' : 'Late Arrivals'}
              value={String(summary.lateCount)}
              color="amber"
            />
          </div>
        )}

        {/* Records */}
        {data && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {isNp
                  ? `${BS_MONTHS_NP[selectedMonth - 1]} ${selectedYear}`
                  : `${BS_MONTHS_EN[selectedMonth - 1]} ${selectedYear}`}
              </h2>
              {summary && (
                <span className="text-xs text-slate-400">
                  {summary.daysPresent} {isNp ? 'रेकर्ड' : 'record(s)'}
                </span>
              )}
            </div>

            {records.length === 0 ? (
              <div className="py-14 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-400">
                  {isNp
                    ? 'यस महिनामा कोई उपस्थिति रेकर्ड छैन'
                    : 'No attendance records for this month'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {records.map((record) => {
                  const late = isLateRecord(record, summary?.workStartTime ?? null)
                  const isActive = record.status === 'CHECKED_IN'
                  const autoClosed = record.status === 'AUTO_CLOSED'

                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50/60"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            isActive
                              ? 'bg-green-100 text-green-700'
                              : late
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {record.bsDay}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {formatTime(record.checkInTime)}
                            {record.checkOutTime && (
                              <span className="font-normal text-slate-400">
                                {' → '}
                                {formatTime(record.checkOutTime)}
                              </span>
                            )}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            {late && !isActive && (
                              <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                {isNp ? 'ढिलो' : 'Late'}
                              </span>
                            )}
                            {autoClosed && (
                              <span className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                                {isNp ? 'स्वतः बन्द' : 'Auto-closed'}
                              </span>
                            )}
                            {isActive && (
                              <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                                {isNp ? 'सक्रिय' : 'Active'}
                              </span>
                            )}
                            {!late && !isActive && !autoClosed && (
                              <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                {isNp ? 'समयमा' : 'On time'}
                              </span>
                            )}
                            {record.notes && (
                              <span className="max-w-[140px] truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500" title={record.notes}>
                                {record.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {record.duration != null ? (
                          <p className="text-sm font-semibold text-slate-700">
                            {formatDuration(record.duration)}
                          </p>
                        ) : isActive ? (
                          <p className="animate-pulse text-xs font-medium text-green-600">
                            {isNp ? 'जारी छ' : 'In progress'}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        </div>{/* end max-w-2xl */}
      </div>
      <PoweredBy />
    </div>
  )
}

/* ── Sub-components ── */

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'emerald' | 'blue' | 'amber'
}) {
  const cls = {
    emerald: 'bg-emerald-50 border-emerald-100',
    blue: 'bg-blue-50    border-blue-100',
    amber: 'bg-amber-50   border-amber-100',
  }[color]

  return (
    <div className={`${cls} rounded-xl border p-3 text-center`}>
      <div className="mb-1.5 flex justify-center">{icon}</div>
      <p className="text-base font-bold leading-tight text-slate-900">{value}</p>
      <p className="mt-1 text-[10px] leading-tight text-slate-500">{label}</p>
    </div>
  )
}
