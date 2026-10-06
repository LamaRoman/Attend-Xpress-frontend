'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import { adToBS, bsToAD, getDaysInBSMonth, BS_MONTHS_NP, BS_MONTHS_EN } from '@/components/BSDatePicker'
import MiniCalendar from '@/components/MiniCalendar'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
} from 'lucide-react'

type CalendarMode = 'NEPALI' | 'ENGLISH'
type Language = 'NEPALI' | 'ENGLISH'

const NP_WEEKDAYS = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि']
const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface AttendanceRecord {
  id: string
  checkInTime: string
  checkOutTime: string | null
  duration: number | null
  status: string
  isManualEntry: boolean
  modificationNote: string | null
  arrivalStatus: 'ON_TIME' | 'LATE'
  minutesLate: number
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  employeeId: string | null
  joinedAt: string | null
}

interface OrgConfig {
  workStartTime: string
  lateThresholdMinutes: number
  workingDays: string
}

// Multiple records per day — date cell rowSpans all of them
interface DayRow {
  dateStr: string
  isWorkingDay: boolean
  records: AttendanceRecord[]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

// Returns true when checkout is on a different calendar day than checkin (overnight shift)
function isNextDay(checkIn: string, checkOut: string): boolean {
  return checkIn.split('T')[0] !== checkOut.split('T')[0]
}

function formatDateLabel(dateStr: string, calendarMode: CalendarMode, language: Language) {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  if (calendarMode === 'NEPALI') {
    const bs = adToBS(d)
    const weekday = language === 'NEPALI' ? NP_WEEKDAYS[dow] : EN_WEEKDAYS[dow]
    const month = language === 'NEPALI' ? BS_MONTHS_NP[bs.month - 1] : BS_MONTHS_EN[bs.month - 1]
    const day = String(bs.day)
    return `${weekday}, ${month} ${day}`
  }
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// IMPORTANT: must use local date components (getFullYear/Month/Date), NOT
// toISOString() which is UTC.  The server runs with TZ=Asia/Kathmandu so
// it constructs Date objects in local (NPT) time.  Using toISOString()
// here shifts the date back by 5h45m — in NPT, midnight local time is
// 6:15pm the previous UTC day, so toISOString() would yield yesterday's
// date and the first day of every BS month would be silently dropped from
// the query window.
function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysInRange(start: Date, end: Date): string[] {
  const days: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    days.push(isoDate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function weekOf(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diffToMon)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return { start: mon, end: sun }
}

function monthOf(date: Date, calendarMode: CalendarMode): { start: Date; end: Date } {
  if (calendarMode === 'NEPALI') {
    const bs = adToBS(date)
    const start = bsToAD(bs.year, bs.month, 1)
    start.setHours(0, 0, 0, 0)
    const lastDay = getDaysInBSMonth(bs.year, bs.month)
    const end = bsToAD(bs.year, bs.month, lastDay)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function periodLabel(
  period: { start: Date; end: Date },
  view: 'weekly' | 'monthly' | 'calendar',
  calendarMode: CalendarMode,
  language: Language,
): string {
  if (calendarMode === 'NEPALI') {
    const fmt = (bs: { year: number; month: number; day: number }) => {
      const m = language === 'NEPALI' ? BS_MONTHS_NP[bs.month - 1] : BS_MONTHS_EN[bs.month - 1]
      const d = String(bs.day)
      const y = String(bs.year)
      return { m, d, y }
    }
    if (view === 'weekly') {
      const s = fmt(adToBS(period.start))
      const e = fmt(adToBS(period.end))
      return `${s.m} ${s.d} – ${e.m} ${e.d}, ${e.y}`
    }
    const { m, y } = fmt(adToBS(period.start))
    return `${m} ${y}`
  }
  if (view === 'weekly') {
    return (
      period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' – ' +
      period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    )
  }
  return period.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function EmployeeAttendancePage() {
  const { user, isLoading, calendarMode, language } = useAuth()
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  const [view, setView] = useState<'weekly' | 'monthly' | 'calendar'>('weekly')
  const [anchor, setAnchor] = useState(new Date())

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [orgConfig, setOrgConfig] = useState<OrgConfig | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [holidayMap, setHolidayMap] = useState<Record<string, { name: string; nameNepali?: string }>>({})
  const [leaveDetails, setLeaveDetails] = useState<Record<string, { type: string; status: string; reason: string }>>({})
  // Employee-resolved working days from payrollContext (roster-aware)
  const [empWorkingDays, setEmpWorkingDays] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'ORG_ADMIN' && user.role !== 'BRANCH_ADMIN')))
      router.push('/login')
  }, [user, isLoading, router])

  const period = view === 'weekly' ? weekOf(anchor) : monthOf(anchor, calendarMode)
  const startKey = isoDate(period.start)
  const endKey = isoDate(period.end)

  useEffect(() => {
    if (!user || (user.role !== 'ORG_ADMIN' && user.role !== 'BRANCH_ADMIN')) return
    let cancelled = false
    setLoading(true)
    setError('')

    let url = `/api/v1/attendance/user/${userId}?startDate=${startKey}&endDate=${endKey}`
    if (view === 'monthly' || view === 'calendar') {
      const bs = adToBS(period.start)
      url += `&bsYear=${bs.year}&bsMonth=${bs.month}`
    }
    api.get(url)
      .then((res) => {
        if (cancelled) return
        if (res.error) {
          setError(res.error.message ?? 'Failed to load attendance')
        } else {
          const d = res.data as any
          setEmployee(d.employee)
          setOrgConfig(d.orgConfig)
          setRecords(d.records)
          const ctx = d.payrollContext
          setHolidayMap(ctx?.holidayMap ?? {})
          setLeaveDetails(ctx?.leaveDetails ?? {})
          // Employee-resolved working days (roster-aware since PR #196) —
          // falls back to org-level when the context isn't present (weekly view)
          setEmpWorkingDays(ctx?.workingDays ?? null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, startKey, endKey, view])

  const prev = () => {
    if (calendarMode === 'NEPALI' && view !== 'weekly') {
      const bs = adToBS(anchor)
      const newMonth = bs.month === 1 ? 12 : bs.month - 1
      const newYear = bs.month === 1 ? bs.year - 1 : bs.year
      setAnchor(bsToAD(newYear, newMonth, 1))
      return
    }
    const d = new Date(anchor)
    view === 'weekly' ? d.setDate(d.getDate() - 7) : d.setMonth(d.getMonth() - 1)
    setAnchor(d)
  }
  const next = () => {
    if (calendarMode === 'NEPALI' && view !== 'weekly') {
      const bs = adToBS(anchor)
      const newMonth = bs.month === 12 ? 1 : bs.month + 1
      const newYear = bs.month === 12 ? bs.year + 1 : bs.year
      setAnchor(bsToAD(newYear, newMonth, 1))
      return
    }
    const d = new Date(anchor)
    view === 'weekly' ? d.setDate(d.getDate() + 7) : d.setMonth(d.getMonth() + 1)
    setAnchor(d)
  }
  const goToday = () => setAnchor(new Date())

  // Group ALL records by check-in date — preserves every record, no overwriting.
  // IMPORTANT: checkInTime from the API is a UTC ISO string (e.g. "2026-05-25T19:15Z").
  // The server stores and queries in NPT (Asia/Kathmandu), so we must convert to
  // the NPT local date before grouping — not split on 'T' which gives the UTC date.
  // Example: 1am NPT May 26 = May 25 19:15 UTC → split gives "2026-05-25" (wrong),
  // but the row key for that day is "2026-05-26" (NPT local) → record disappears.
  // en-CA locale gives YYYY-MM-DD format which matches our isoDate() output.
  // Prefer the employee-resolved working days (roster-aware, matches payroll);
  // org-level config is the fallback for the weekly view (no payroll context).
  const workingDayNums = new Set(
    (empWorkingDays ?? orgConfig?.workingDays ?? '0,1,2,3,4,5').split(',').map(Number),
  )
  const recordsByDate = new Map<string, AttendanceRecord[]>()
  for (const r of records) {
    const date = new Date(r.checkInTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' })
    if (!recordsByDate.has(date)) recordsByDate.set(date, [])
    recordsByDate.get(date)!.push(r)
  }

  const today = isoDate(new Date())
  const rows: DayRow[] = daysInRange(period.start, period.end).map((dateStr) => {
    const dow = new Date(dateStr + 'T00:00:00').getDay()
    return {
      dateStr,
      isWorkingDay: workingDayNums.has(dow),
      records: recordsByDate.get(dateStr) ?? [],
    }
  })

  // Summary — 1 present day regardless of number of clock-ins.
  // Late/On Time determined by the FIRST clock-in of the day only.
  //
  // Present counts ONLY scheduled working, non-holiday days with a clock-in —
  // this matches the payslip's workingDaysPresent (payroll.service.getDaysPresent).
  // A clock-in on an off-day or holiday is NOT present; it goes to the
  // "off-day work" bucket below and is paid as overtime. See PAYROLL-ALLOWANCES-NOTES.md.
  const joinedAtStr = employee?.joinedAt ?? null
  const pastRows   = rows.filter((r) => r.dateStr <= today)
  const workDays   = pastRows.filter((r) => r.isWorkingDay && !holidayMap[r.dateStr])
  const present    = workDays.filter((r) => r.records.length > 0).length
  const absent     = workDays.filter((r) => r.records.length === 0 && (!joinedAtStr || r.dateStr >= joinedAtStr)).length
  const late       = workDays.filter((r) => r.records[0]?.arrivalStatus === 'LATE').length
  const onTime     = workDays.filter((r) => r.records[0]?.arrivalStatus === 'ON_TIME').length
  // Off-day / holiday work — clock-ins on a non-working day OR a holiday.
  // Days + hours, shown as its own stat (excluded from Present, paid as OT).
  const offDayWorkRows = pastRows.filter(
    (r) => r.records.length > 0 && (!r.isWorkingDay || !!holidayMap[r.dateStr]),
  )
  const offDayWorkDays = offDayWorkRows.length
  const offDayWorkHours =
    Math.round(
      (offDayWorkRows.reduce(
        (sum, r) => sum + r.records.reduce((s, rec) => s + (rec.duration ?? 0), 0),
        0,
      ) /
        60) *
        10,
    ) / 10
  // Dates (AD "YYYY-MM-DD") worked on an off-day/holiday — coloured distinctly
  // on the calendar grid so they read as overtime, not present.
  const offDayWorkDates = new Set(offDayWorkRows.map((r) => r.dateStr))

  const printAttendance = () => {
    if (!employee) return
    const w = window.open('', '_blank')
    if (!w) return
    const orgName = user?.organization?.name || 'Attend Xpress'
    const empName = `${employee.firstName} ${employee.lastName}`
    const empId = employee.employeeId ? `ID: ${employee.employeeId}` : employee.email
    const label = periodLabel(period, view, calendarMode, language)
    const isNp = language === 'NEPALI'
    const todayStr = isoDate(new Date())

    const rowsHtml = rows
      .map(({ dateStr, isWorkingDay, records: dayRecords }) => {
        const dateLabel = formatDateLabel(dateStr, calendarMode, language)
        const isFuture = dateStr > todayStr
        const isPreJoinPrint = employee?.joinedAt ? dateStr < employee.joinedAt : false
        if (!isWorkingDay && dayRecords.length === 0)
          return `<tr class="dayoff"><td>${dateLabel}</td><td colspan="4" style="color:#94a3b8">${isNp ? 'बिदा' : 'Day off'}</td></tr>`
        if (isFuture || isPreJoinPrint) return `<tr class="future"><td>${dateLabel}</td><td colspan="4">—</td></tr>`
        if (dayRecords.length === 0) {
          const todayMark =
            dateStr === todayStr ? `<span class="today-tag">${isNp ? 'आज' : 'Today'}</span>` : ''
          return `<tr><td>${dateLabel}${todayMark}</td><td>—</td><td>—</td><td>—</td><td><span class="badge absent">${isNp ? 'अनुपस्थित' : 'Absent'}</span></td></tr>`
        }
        return dayRecords
          .map((record, idx) => {
            const todayMark =
              idx === 0 && dateStr === todayStr
                ? `<span class="today-tag">${isNp ? 'आज' : 'Today'}</span>`
                : ''
            const overnight = record.checkOutTime
              ? isNextDay(record.checkInTime, record.checkOutTime)
              : false
            const checkOut = record.checkOutTime
              ? formatTime(record.checkOutTime) +
                (overnight ? ' <span class="nextday">+1</span>' : '')
              : '—'
            const hours = record.duration != null ? formatDuration(record.duration) : '—'
            const isOnTime = record.arrivalStatus === 'ON_TIME'
            const status =
              idx > 0
                ? '—'
                : isOnTime
                  ? `<span class="badge ontime">${isNp ? 'समयमा' : 'On Time'}</span>`
                  : `<span class="badge late">${isNp ? 'ढिलो' : 'Late'}${record.minutesLate > 0 ? ` · ${record.minutesLate}m` : ''}</span>`
            const dateCell =
              idx === 0 ? `<td rowspan="${dayRecords.length}">${dateLabel}${todayMark}</td>` : ''
            return `<tr>${dateCell}<td>${formatTime(record.checkInTime)}</td><td>${checkOut}</td><td>${hours}</td><td>${status}</td></tr>`
          })
          .join('')
      })
      .join('')

    const doc = w.document
    doc.open()
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${empName} — ${label}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;font-size:13px;color:#0f172a;background:white;padding:32px}.header{border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px}.org{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}.name{font-size:22px;font-weight:700}.meta{font-size:12px;color:#475569;margin-top:2px}.period{font-size:14px;font-weight:600;margin-top:6px}.summary{display:flex;gap:16px;margin-bottom:20px}.chip{border:1px solid #e2e8f0;border-radius:8px;padding:8px 16px;text-align:center}.chip .val{font-size:20px;font-weight:700}.chip .lbl{font-size:10px;color:#64748b;text-transform:uppercase}.chip.present{border-color:#a7f3d0;background:#f0fdf4;color:#065f46}.chip.absent{border-color:#fecaca;background:#fff1f2;color:#9f1239}.chip.ontime{border-color:#bae6fd;background:#f0f9ff;color:#0c4a6e}.chip.late{border-color:#fde68a;background:#fffbeb;color:#78350f}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;padding:8px 10px;border-bottom:1px solid #e2e8f0;background:#f8fafc}td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}tr.dayoff td{color:#94a3b8;background:#f8fafc;font-size:12px}tr.future td{opacity:.4}.badge{display:inline-block;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:500}.badge.absent{background:#fff1f2;color:#9f1239;border:1px solid #fecaca}.badge.ontime{background:#f0fdf4;color:#065f46;border:1px solid #a7f3d0}.badge.late{background:#fffbeb;color:#78350f;border:1px solid #fde68a}.today-tag{margin-left:6px;font-size:10px;color:#f59e0b;font-weight:600}.nextday{font-size:9px;color:#6366f1;font-weight:600;vertical-align:super}.footer{margin-top:24px;font-size:11px;color:#94a3b8;text-align:right}@media print{body{padding:16px}@page{margin:1.5cm}}</style>
</head><body>
<div class="header"><div class="org">${orgName}</div><div class="name">${empName}</div><div class="meta">${empId}</div><div class="period">${label}</div></div>
<div class="summary">
  <div class="chip present"><div class="val">${present}</div><div class="lbl">${isNp ? 'उपस्थित' : 'Present'}</div></div>
  <div class="chip absent"><div class="val">${absent}</div><div class="lbl">${isNp ? 'अनुपस्थित' : 'Absent'}</div></div>
  <div class="chip ontime"><div class="val">${onTime}</div><div class="lbl">${isNp ? 'समयमा' : 'On Time'}</div></div>
  <div class="chip late"><div class="val">${late}</div><div class="lbl">${isNp ? 'ढिलो' : 'Late'}</div></div>
  ${offDayWorkDays > 0 ? `<div class="chip"><div class="val">${offDayWorkDays} · ${offDayWorkHours}h</div><div class="lbl">${isNp ? 'बिदाको दिन काम' : 'Off-day work'}</div></div>` : ''}
</div>
<table><thead><tr><th>${isNp ? 'मिति' : 'Date'}</th><th>${isNp ? 'चेक इन' : 'Check In'}</th><th>${isNp ? 'चेक आउट' : 'Check Out'}</th><th>${isNp ? 'घण्टा' : 'Hours'}</th><th>${isNp ? 'स्थिति' : 'Status'}</th></tr></thead>
<tbody>${rowsHtml}</tbody></table>
<div class="footer">${isNp ? 'प्रिन्ट मिति' : 'Printed'}: ${new Date().toLocaleString()}</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`)
    doc.close()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }
  if (!user) return null

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/attendance')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              {employee ? (
                <>
                  <h1 className="text-xl font-semibold text-slate-900">
                    {employee.firstName} {employee.lastName}
                  </h1>
                  <p className="text-sm text-slate-500">
                    {employee.employeeId ? `ID: ${employee.employeeId}` : employee.email}
                  </p>
                </>
              ) : (
                <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(['weekly', 'monthly', 'calendar'] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v)
                  setAnchor(new Date())
                }}
                className={
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-colors ' +
                  (view === v
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700')
                }
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Period navigator — hidden in calendar view (MiniCalendar has its own) */}
        {view !== 'calendar' && <div className="flex items-center justify-between">
          <button
            onClick={prev}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            {view === 'weekly' ? 'Prev week' : 'Prev month'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-800">
              {periodLabel(period, view, calendarMode, language)}
            </span>
            <button
              onClick={goToday}
              className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-50"
            >
              Today
            </button>
          </div>
          <button
            onClick={next}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          >
            {view === 'weekly' ? 'Next week' : 'Next month'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>}

        {/* Summary + Print */}
        {!loading && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              {[
                {
                  label: 'Present',
                  value: present,
                  color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                },
                {
                  label: 'Absent',
                  value: absent,
                  color: 'bg-rose-50 text-rose-700 border-rose-200',
                },
                { label: 'On Time', value: onTime, color: 'bg-sky-50 text-sky-700 border-sky-200' },
                {
                  label: 'Late',
                  value: late,
                  color: 'bg-amber-50 text-amber-700 border-amber-200',
                },
                ...(offDayWorkDays > 0
                  ? [{
                      label:
                        (language === 'NEPALI' ? 'बिदाको दिन काम · ' : 'Off-day work · ') +
                        `${offDayWorkHours}h`,
                      value: offDayWorkDays,
                      color: 'bg-purple-50 text-purple-700 border-purple-200',
                    }]
                  : []),
              ].map((s) => (
                <div
                  key={s.label}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${s.color}`}
                >
                  <span className="text-sm font-semibold">{s.value}</span>
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={printAttendance}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
            <span className="text-sm text-rose-700">{error}</span>
          </div>
        )}

        {/* Table / Calendar grid */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
            </div>
          ) : view === 'calendar' ? (
            /* ── MiniCalendar ── */
            <div className="p-2">
              <MiniCalendar
                initialBs={calendarMode === 'NEPALI'}
                isNp={language === 'NEPALI'}
                presentDays={new Set(rows.filter(r => r.records.length > 0 && !offDayWorkDates.has(r.dateStr)).map(r => r.dateStr))}
                lateDays={new Set(rows.filter(r => r.records[0]?.arrivalStatus === 'LATE').map(r => r.dateStr))}
                offDayWorkDates={offDayWorkDates}
                rejectedLeaveDates={new Set(
                  Object.entries(leaveDetails)
                    .filter(([, l]) => l.status === 'REJECTED')
                    .map(([d]) => d),
                )}
                joinedAfter={employee?.joinedAt ?? undefined}
                workingDaysOverride={empWorkingDays ?? orgConfig?.workingDays}
                holidayOverride={new Map(
                  Object.entries(holidayMap).map(([d, h]) => [
                    d,
                    language === 'NEPALI' && h.nameNepali ? h.nameNepali : h.name,
                  ]),
                )}
                overrideLeaveMap={(() => {
                  const map = new Map<string, { name: string; reason: string }[]>()
                  const empName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'
                  Object.entries(leaveDetails).forEach(([date, leave]) => {
                    if (leave.status === 'APPROVED') {
                      const typeLabel = leave.type === 'SICK' ? 'Sick Leave'
                        : leave.type === 'ANNUAL' ? 'Annual Leave'
                        : 'Unpaid Leave'
                      map.set(date, [{ name: empName, reason: leave.reason || typeLabel }])
                    }
                  })
                  return map
                })()}
                onMonthChange={(d) => setAnchor(d)}
              />
            </div>
          ) : (
            /* ── Table view (weekly / monthly) ── */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Date', 'Check In', 'Check Out', 'Hours', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ dateStr, isWorkingDay, records: dayRecords }) => {
                    const isFuture = dateStr > today
                    const isToday = dateStr === today
                    const isPreJoinTbl = employee?.joinedAt ? dateStr < employee.joinedAt : false

                    if (!isWorkingDay && dayRecords.length === 0) {
                      return (
                        <tr key={dateStr} className="bg-slate-50/30">
                          <td className="px-4 py-3 text-slate-400">
                            <span className="text-xs">
                              {formatDateLabel(dateStr, calendarMode, language)}
                            </span>
                          </td>
                          <td colSpan={4} className="px-4 py-3 text-xs">
                            <span className="text-slate-300">Day off</span>
                          </td>
                        </tr>
                      )
                    }

                    if (isFuture || isPreJoinTbl) {
                      return (
                        <tr key={dateStr} className="opacity-40">
                          <td className="px-4 py-3 text-slate-500">
                            <span className="text-xs">
                              {formatDateLabel(dateStr, calendarMode, language)}
                            </span>
                          </td>
                          <td colSpan={4} className="px-4 py-3 text-xs text-slate-300">
                            —
                          </td>
                        </tr>
                      )
                    }

                    if (dayRecords.length === 0) {
                      return (
                        <tr key={dateStr} className={isToday ? 'bg-amber-50/30' : ''}>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium ${isToday ? 'text-amber-700' : 'text-slate-700'}`}
                            >
                              {formatDateLabel(dateStr, calendarMode, language)}
                              {isToday && (
                                <span className="ml-1.5 text-[10px] text-amber-500">Today</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">—</td>
                          <td className="px-4 py-3 text-slate-300">—</td>
                          <td className="px-4 py-3 text-slate-300">—</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                              <XCircle className="h-3 w-3" />
                              Absent
                            </span>
                          </td>
                        </tr>
                      )
                    }

                    return dayRecords.map((record, idx) => {
                      const overnight = record.checkOutTime
                        ? isNextDay(record.checkInTime, record.checkOutTime)
                        : false
                      const isOnTime = record.arrivalStatus === 'ON_TIME'

                      return (
                        <tr
                          key={record.id}
                          className={`transition-colors hover:bg-slate-50/50 ${isToday ? 'bg-emerald-50/20' : ''}`}
                        >
                          {idx === 0 && (
                            <td className="px-4 py-3 align-top" rowSpan={dayRecords.length}>
                              <span className="text-xs font-medium text-slate-700">
                                {formatDateLabel(dateStr, calendarMode, language)}
                                {isToday && (
                                  <span className="ml-1.5 text-[10px] text-emerald-500">Today</span>
                                )}
                              </span>
                              {record.isManualEntry && (
                                <div className="text-[10px] text-violet-500">Manual entry</div>
                              )}
                            </td>
                          )}

                          <td className="px-4 py-3 font-medium text-slate-900">
                            {formatTime(record.checkInTime)}
                          </td>

                          <td className="px-4 py-3 font-medium text-slate-900">
                            {record.checkOutTime ? (
                              <span className="inline-flex items-center gap-1">
                                {formatTime(record.checkOutTime)}
                                {overnight && (
                                  <span className="rounded bg-indigo-50 px-1 py-0.5 text-[9px] font-semibold text-indigo-500">
                                    +1
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {record.duration != null ? (
                              formatDuration(record.duration)
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {idx === 0 ? (
                              isOnTime ? (
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                  <CheckCircle className="h-3 w-3" />
                                  On Time
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                  <Clock className="h-3 w-3" />
                                  Late {record.minutesLate > 0 ? `· ${record.minutesLate}m` : ''}
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
