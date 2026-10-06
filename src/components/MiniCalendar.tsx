'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Maximize2, X, CalendarDays } from 'lucide-react'
import {
  adToBS,
  bsToAD,
  getDaysInBSMonth,
  BS_MONTHS_NP,
  BS_MONTHS_EN,
  toNepaliDigits,
} from '@/components/BSDatePicker'
import { api } from '@/lib/api'

// ── Tithi (lunar day) calculation ──────────────────────────────────────────
const SYNODIC_MONTH = 29.530588853
const REF_NEW_MOON_JD = 2451550.26

function toJulianDay(date: Date): number {
  let y = date.getFullYear()
  let m = date.getMonth() + 1
  const d = date.getDate()
  if (m <= 2) { y--; m += 12 }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    d + B - 1524.5
  )
}

function getTithi(date: Date): number {
  const jd = toJulianDay(date) + 5.75 / 24
  let phase = ((jd - REF_NEW_MOON_JD) % SYNODIC_MONTH) / SYNODIC_MONTH
  if (phase < 0) phase += 1
  const t = Math.floor(phase * 30) + 1
  return t > 30 ? 30 : t
}

const TITHI_NP = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा',
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'औंसी',
]

// ──────────────────────────────────────────────────────────────────────────

interface MiniCalendarProps {
  initialBs?: boolean
  isBs?: boolean      // alias accepted from admin page
  isNp?: boolean
  /** AD "YYYY-MM-DD" dates that have an attendance record — enables absent-day mode */
  presentDays?: Set<string>
  /** AD "YYYY-MM-DD" dates where the employee clocked in late — colours those cells amber */
  lateDays?: Set<string>
  /** AD "YYYY-MM-DD" dates worked on an off-day/holiday — coloured purple (overtime, not present) */
  offDayWorkDates?: Set<string>
  /** Suppress leave fetch and leave coloring entirely (employee self-view) */
  noLeaves?: boolean
  /** When provided, replaces the internal all-users leave fetch with this map */
  overrideLeaveMap?: Map<string, { name: string; reason: string }[]>
  /** Render at full-page scale inline (no portal, no fullscreen toggle) */
  expanded?: boolean
  /** Called (with first-of-month AD Date) whenever the calendar navigates to a new month */
  onMonthChange?: (d: Date) => void
  // ── Payroll-context props (admin per-employee view) ──────────────────────
  // These mirror what payroll generation computes, so the calendar an admin
  // sees matches the payslip. All keys are AD "YYYY-MM-DD" strings.
  /** Days covered by a REJECTED leave request (still absent) — tooltip marker */
  rejectedLeaveDates?: Set<string>
  /** Employee join date — earlier days are muted and never counted absent */
  joinedAfter?: string
  /** Employee-resolved working days ("0,1,…") — replaces the org-settings
   *  fetch so a rostered (e.g. Sat+Sun) employee's off-days are their own */
  workingDaysOverride?: string
  /** AD date → holiday name — replaces the internal holiday fetch with the
   *  payroll-context holidays, so org-excluded holidays don't show */
  holidayOverride?: Map<string, string>
  /** When true (and expanded), render a side panel listing the visible month's
   *  holidays by name — national (inherited) and org-specific, tagged. */
  showHolidayList?: boolean
}

export default function MiniCalendar({
  initialBs,
  isBs: isBsProp,
  isNp = true,
  presentDays,
  lateDays,
  offDayWorkDates,
  noLeaves = false,
  overrideLeaveMap,
  expanded = false,
  onMonthChange,
  rejectedLeaveDates,
  joinedAfter,
  workingDaysOverride,
  holidayOverride,
  showHolidayList = false,
}: MiniCalendarProps) {
  const today = new Date()
  const todayBS = adToBS(today)

  const [isBs, setIsBs] = useState(isBsProp ?? initialBs ?? true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )
  // key: "bsYear-bsMonth-bsDay" → holiday display name
  const [holidayMap, setHolidayMap] = useState<Map<string, string>>(new Map())
  // Richer list for the side panel — keeps each holiday's BS/AD date and whether
  // it's org-specific (vs an inherited national holiday).
  const [holidayItems, setHolidayItems] = useState<
    { bsYear: number; bsMonth: number; bsDay: number; ad: Date; name: string; isOrg: boolean }[]
  >([])
  // set of JS day-of-week numbers (0=Sun…6=Sat) that are weekly off
  const [offDays, setOffDays] = useState<Set<number>>(new Set([6]))
  // key: "YYYY-MM-DD" (AD) → list of { name, reason }
  const [leaveMap, setLeaveMap] = useState<Map<string, { name: string; reason: string }[]>>(new Map())
  // popup shown when a leave day is clicked
  const [leavePopup, setLeavePopup] = useState<{ entries: { name: string; reason: string }[] } | null>(null)

  const viewBS = adToBS(viewDate)
  const year = isBs ? viewBS.year : viewDate.getFullYear()
  const month = isBs ? viewBS.month : viewDate.getMonth() + 1

  // Fire onMonthChange when the user navigates (skip initial mount)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    onMonthChange?.(viewDate)
  }, [viewDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Working days: explicit override (employee-resolved, from payroll
  // context) wins; otherwise fetch the org-level config once.
  useEffect(() => {
    const applyWorkingDays = (wd: string) => {
      const workingSet = new Set(wd.split(',').map(Number))
      const off = new Set<number>()
      for (let d = 0; d <= 6; d++) {
        if (!workingSet.has(d)) off.add(d)
      }
      setOffDays(off)
    }
    if (workingDaysOverride) {
      applyWorkingDays(workingDaysOverride)
      return
    }
    api.get('/api/v1/org-settings')
      .then(res => {
        if (res.error || !res.data) return
        applyWorkingDays((res.data as any).workingDays ?? '0,1,2,3,4,5')
      })
      .catch(() => { })
  }, [workingDaysOverride])

  // Fetch holidays whenever the BS year in view changes — skipped when the
  // caller supplies payroll-context holidays (org exclusions already applied).
  useEffect(() => {
    if (holidayOverride) return
    api.get(`/api/v1/holidays?bsYear=${viewBS.year}`)
      .then(res => {
        if (res.error) {
          console.error('[MiniCalendar] holiday fetch error:', res.error)
          return
        }
        const map = new Map<string, string>()
        const items: typeof holidayItems = []
        const list = Array.isArray(res.data) ? res.data : []
        list.forEach((h: any) => {
          if (h.isActive) {
            const key = `${h.bsYear}-${h.bsMonth}-${h.bsDay}`
            const label = (isNp && h.nameNepali) ? h.nameNepali : h.name
            map.set(key, label)
            items.push({
              bsYear: h.bsYear,
              bsMonth: h.bsMonth,
              bsDay: h.bsDay,
              ad: new Date(h.date),
              name: label,
              isOrg: !!h.organizationId,
            })
          }
        })
        setHolidayMap(map)
        setHolidayItems(items)
      })
      .catch(err => console.error('[MiniCalendar] holiday fetch exception:', err))
  }, [viewBS.year, isNp, holidayOverride])

  // Derive effective leave map — respects noLeaves and overrideLeaveMap
  const hasOverrideLeaveMap = overrideLeaveMap !== undefined
  const effectiveLeaveMap = noLeaves
    ? (new Map<string, { name: string; reason: string }[]>())
    : hasOverrideLeaveMap
      ? overrideLeaveMap!
      : leaveMap

  // Fetch approved leaves — skipped when noLeaves or an override is supplied
  useEffect(() => {
    if (noLeaves || hasOverrideLeaveMap) return
    const toStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    // Compute the exact AD date range of the visible calendar cells
    let firstDay: Date, lastDay: Date
    if (isBs) {
      firstDay = bsToAD(year, month, 1)
      lastDay = bsToAD(year, month, getDaysInBSMonth(year, month))
    } else {
      firstDay = new Date(year, month - 1, 1)
      lastDay = new Date(year, month, 0)
    }

    const fromDate = toStr(firstDay)
    const toDate = toStr(lastDay)

    api.get(`/api/v1/leaves?status=APPROVED&fromDate=${fromDate}&toDate=${toDate}&limit=100`)
      .then(res => {
        if (res.error) {
          console.error('[MiniCalendar] leave fetch error:', res.error)
          return
        }
        const list: any[] = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.leaves ?? []

        console.log(`[MiniCalendar] leaves ${fromDate}→${toDate}:`, list.length)

        const map = new Map<string, { name: string; reason: string }[]>()

        const toAdStr = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

        list.forEach(leave => {
          const name = leave.user
            ? `${leave.user.firstName} ${leave.user.lastName}`
            : 'Employee'
          const reason: string = leave.reason ?? ''

          const s = new Date(leave.startDate)
          const e = new Date(leave.endDate)
          const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate())
          const end = new Date(e.getFullYear(), e.getMonth(), e.getDate())

          while (cur <= end) {
            const key = toAdStr(cur)
            const arr = map.get(key) ?? []
            if (!arr.find(x => x.name === name)) arr.push({ name, reason })
            map.set(key, arr)
            cur.setDate(cur.getDate() + 1)
          }
        })
        setLeaveMap(map)
      })
      .catch(err => console.error('[MiniCalendar] leave fetch exception:', err))
  }, [isBs, year, month, noLeaves, hasOverrideLeaveMap])

  const daysInMonth = isBs
    ? getDaysInBSMonth(year, month)
    : new Date(year, month, 0).getDate()

  const firstWeekday = isBs
    ? bsToAD(year, month, 1).getDay()
    : new Date(year, month - 1, 1).getDay()

  const prevMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))

  const nextMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const monthLabel = isBs
    ? `${isNp ? BS_MONTHS_NP[month - 1] : BS_MONTHS_EN[month - 1]} ${isNp ? toNepaliDigits(year) : year}`
    : viewDate.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', { month: 'long', year: 'numeric' })

  const subLabel = isBs
    ? viewDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : `${BS_MONTHS_EN[viewBS.month - 1]} ${viewBS.year} BS`

  const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const DAYS_NP = ['आ', 'सो', 'मं', 'बु', 'बि', 'शु', 'श']
  const weekdays = isNp ? DAYS_NP : DAYS_EN

  const isToday = (day: number) => {
    if (isBs)
      return todayBS.year === year && todayBS.month === month && todayBS.day === day
    return (
      today.getFullYear() === year &&
      today.getMonth() + 1 === month &&
      today.getDate() === day
    )
  }

  // ── Shared calendar body ────────────────────────────────────────────────
  const renderCalendar = (full: boolean) => {
    const s = full
      ? {
        wrap: 'fixed inset-0 z-50 flex flex-col bg-white p-6 overflow-auto',
        weekdayText: 'text-sm font-medium',
        weekdayPy: 'py-2',
        bsCell: 'h-[calc((100vh-160px)/6)] min-h-16 flex flex-col justify-between rounded-xl px-2 py-1.5',
        adCell: 'h-[calc((100vh-160px)/6)] min-h-16 flex flex-col items-center justify-between rounded-xl py-1.5',
        dayText: 'text-2xl',
        tithiText: 'text-xs',
        secText: 'text-xs',
        headerText: 'text-xl',
        subText: 'text-sm',
        gap: 'gap-1',
        dayAlign: 'text-center',
      }
      : expanded
        ? {
          wrap: 'relative w-full rounded-2xl border border-slate-200 bg-white px-5 pb-5 pt-4 shadow-sm',
          weekdayText: 'text-xs font-semibold uppercase tracking-wider',
          weekdayPy: 'py-3',
          bsCell: 'h-20 flex flex-col justify-between rounded-xl px-3 py-2',
          adCell: 'h-20 flex flex-col items-center justify-between rounded-xl py-2',
          dayText: 'text-2xl',
          tithiText: 'text-sm',
          secText: 'text-sm',
          headerText: 'text-xl',
          subText: 'text-sm',
          gap: 'gap-1.5',
          dayAlign: 'text-left',
        }
        : {
          wrap: 'relative rounded-xl border border-slate-200 bg-white p-4',
          weekdayText: 'text-[11px]',
          weekdayPy: 'py-1',
          bsCell: 'h-20 flex flex-col justify-between rounded-lg px-1.5 py-1.5',
          adCell: 'h-20 flex flex-col items-center justify-between rounded-lg py-1.5',
          dayText: 'text-xl',
          tithiText: 'text-[8px]',
          secText: 'text-[8px]',
          headerText: 'text-sm',
          subText: 'text-[11px]',
          gap: 'gap-px',
          dayAlign: 'text-center',
        }

    return (
      <div className={s.wrap}>
        {/* TOP RIGHT: BS/AD toggle + fullscreen button (hidden when already expanded) */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {!expanded && (
            <button
              onClick={() => setIsFullscreen(v => !v)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              title={full ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {full ? <X className="h-5 w-5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          )}

          <div className={`flex rounded-md border border-slate-200 p-0.5 bg-white ${full || expanded ? 'w-20' : 'w-[70px]'}`}>
            <button
              onClick={() => setIsBs(true)}
              className={`flex-1 rounded px-1 py-[2px] ${full || expanded ? 'text-xs' : 'text-[10px]'} ${isBs ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              BS
            </button>
            <button
              onClick={() => setIsBs(false)}
              className={`flex-1 rounded px-1 py-[2px] ${full || expanded ? 'text-xs' : 'text-[10px]'} ${!isBs ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              AD
            </button>
          </div>
        </div>

        {/* HEADER */}
        <div className={`flex items-center justify-between ${full ? 'mb-4 mt-2' : 'mb-3 mt-4'}`}>
          <button
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <ChevronLeft className={full ? 'h-5 w-5' : 'h-4 w-4'} />
          </button>

          <div className="text-center">
            <p className={`font-semibold text-slate-900 ${s.headerText}`}>{monthLabel}</p>
            <p className={`text-slate-400 ${s.subText}`}>{subLabel}</p>
          </div>

          <button
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <ChevronRight className={full ? 'h-5 w-5' : 'h-4 w-4'} />
          </button>
        </div>

        {/* GRID */}
        <div className={`grid grid-cols-7 ${s.gap}`}>
          {/* Weekday headers */}
          {weekdays.map(d => (
            <div key={d} className={`text-center text-slate-400 ${s.weekdayText} ${s.weekdayPy}`}>
              {d}
            </div>
          ))}

          {/* Empty cells before month start */}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={i} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const active = isToday(day)

            let primary: string | number
            let secondary: string | number
            let adDate: Date

            if (isBs) {
              adDate = bsToAD(year, month, day)
              primary = isNp ? toNepaliDigits(day) : day
              secondary = adDate.getDate()
            } else {
              adDate = new Date(year, month - 1, day)
              const bs = adToBS(adDate)
              primary = day
              secondary = isNp ? toNepaliDigits(bs.day) : bs.day
            }

            const tithi = isBs ? getTithi(adDate) : 0
            const tithiName = isBs ? TITHI_NP[tithi - 1] : ''

            const bs = isBs
              ? { year, month, day }
              : adToBS(adDate)
            const adStr = `${adDate.getFullYear()}-${String(adDate.getMonth() + 1).padStart(2, '0')}-${String(adDate.getDate()).padStart(2, '0')}`

            const holidayKey = `${bs.year}-${bs.month}-${bs.day}`
            // Payroll-context holidays (AD-keyed, exclusions applied) win over
            // the internally-fetched BS-keyed map.
            const holidayName = holidayOverride
              ? holidayOverride.get(adStr)
              : holidayMap.get(holidayKey)
            const isOffDay = offDays.has(adDate.getDay())
            const isRed = isOffDay || !!holidayName

            const leaveNames = effectiveLeaveMap.get(adStr)
            const isLeave = !!leaveNames && !isRed  // blue only if not already red

            const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const adDateNorm = new Date(adDate.getFullYear(), adDate.getMonth(), adDate.getDate())
            // Pre-employment days are never absences (mirrors payroll's joinedAt rule)
            const isPreJoin = !!joinedAfter && adStr < joinedAfter
            const isRejectedLeave = !!rejectedLeaveDates && rejectedLeaveDates.has(adStr)
            const isAbsent = !!presentDays && !presentDays.has(adStr) && !isRed && !isLeave && !isPreJoin && adDateNorm <= todayNorm
            // lateDays requires presentDays to be set; amber = late, emerald = on-time present
            const isLate = !!lateDays && lateDays.has(adStr)
            const isOntimePresent = !!presentDays && !!lateDays && presentDays.has(adStr) && !isLate
            // Worked on an off-day/holiday — overtime, not present. Wins over the
            // red off-day styling so it's visually distinct from both present and off.
            const isOffDayWork = !!offDayWorkDates && offDayWorkDates.has(adStr)

            const hoverTitle = isOffDayWork
              ? (isNp ? 'बिदाको दिन काम (ओभरटाइम)' : 'Off-day / holiday work (overtime)')
              : isPreJoin
                ? (isNp ? 'नियुक्ति अघि' : 'Before joining')
                : isRejectedLeave && isAbsent
                  ? (isNp ? 'बिदा अस्वीकृत — अनुपस्थित' : 'Leave rejected — counted absent')
                  : holidayName ?? (isOffDay ? (isNp ? 'साप्ताहिक बिदा' : 'Weekly off') : undefined)

            const handleLeaveClick = leaveNames
              ? () => setLeavePopup({ entries: leaveNames })
              : undefined

            const cellBg = active
              ? 'bg-slate-900'
              : isOffDayWork ? 'bg-purple-50 hover:bg-purple-100'
                  : isPreJoin ? 'bg-slate-50/50'
                    : isLate ? 'bg-amber-50 hover:bg-amber-100'
                      : isOntimePresent ? 'bg-emerald-50 hover:bg-emerald-100'
                        : isAbsent ? 'bg-rose-50 hover:bg-rose-100'
                          : 'hover:bg-slate-50'

            const dayColor = active ? 'text-white'
              : isOffDayWork ? 'text-purple-700'
                  : isPreJoin ? 'text-slate-300'
                    : isRed ? 'text-rose-600'
                      : isLeave ? 'text-blue-600'
                        : isLate ? 'text-amber-700'
                          : isOntimePresent ? 'text-emerald-700'
                            : isAbsent ? 'text-rose-400'
                              : 'text-slate-800'

            const subColor = active ? 'text-slate-300'
              : isOffDayWork ? 'text-purple-400'
                  : isPreJoin ? 'text-slate-200'
                    : isLate ? 'text-amber-400'
                      : isOntimePresent ? 'text-emerald-400'
                        : isAbsent ? 'text-rose-300'
                          : 'text-slate-400'

            return isBs ? (
              <div
                key={day}
                title={hoverTitle}
                onClick={handleLeaveClick}
                className={`${s.bsCell} ${cellBg} ${leaveNames ? 'cursor-pointer' : ''}`}
              >
                {/* secondary date (AD) — top-right corner */}
                <div className="flex justify-end">
                  <span className={`shrink-0 leading-none ${subColor} ${s.secText}`}>
                    {secondary}
                  </span>
                </div>
                {/* primary day number — center */}
                <span className={`block font-semibold leading-none ${s.dayText} ${s.dayAlign} ${dayColor}`}>
                  {primary}
                </span>
                {/* tithi — bottom-left */}
                <span className={`truncate leading-none ${s.tithiText} ${active ? 'text-slate-300' : isRed ? 'text-rose-500' : isLeave ? 'text-blue-400' : subColor}`}>
                  {tithiName}
                </span>
              </div>
            ) : (
              <div
                key={day}
                title={hoverTitle}
                onClick={handleLeaveClick}
                className={`${s.adCell} ${active ? 'bg-slate-900' : cellBg} ${leaveNames ? 'cursor-pointer' : ''}`}
              >
                {/* secondary date (BS) — top */}
                <span className={`leading-none ${subColor} ${s.secText}`}>{secondary}</span>
                {/* primary day number — bottom */}
                <span className={`font-medium leading-none ${s.dayText} ${s.dayAlign} ${dayColor}`}>{primary}</span>
              </div>
            )
          })}
        </div>

        {/* Legend — shown only when attendance mode is active (presentDays provided) */}
        {presentDays && (
          <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 ${full ? 'text-xs' : 'text-[10px]'}`}>
            {lateDays && (
              <>
                <LegendDot bg="bg-emerald-100" text="text-emerald-700" label={isNp ? 'समयमा' : 'On time'} />
                <LegendDot bg="bg-amber-100" text="text-amber-700" label={isNp ? 'ढिलो' : 'Late'} />
              </>
            )}
            <LegendDot bg="bg-rose-100" text="text-rose-500" label={isNp ? 'अनुपस्थित' : 'Absent'} />
            <LegendDot bg="bg-rose-200" text="text-rose-700" label={isNp ? 'बन्द/बिदा' : 'Off / Holiday'} />
            {offDayWorkDates && offDayWorkDates.size > 0 && (
              <LegendDot bg="bg-purple-100" text="text-purple-700" label={isNp ? 'बिदाको दिन काम' : 'Off-day work'} />
            )}
            {!noLeaves && <LegendDot bg="bg-blue-100" text="text-blue-700" label={isNp ? 'बिदा लिएको' : 'On leave'} />}
          </div>
        )}
      </div>
    )
  }
  // ── Holiday side panel (visible-month holidays by name) ──────────────────
  const panelMonthLabel = isBs
    ? `${(isNp ? BS_MONTHS_NP : BS_MONTHS_EN)[viewBS.month - 1]} ${isNp ? toNepaliDigits(viewBS.year) : viewBS.year}`
    : viewDate.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', { month: 'long', year: 'numeric' })

  const monthHolidays = (
    isBs
      ? holidayItems
          .filter((h) => h.bsYear === viewBS.year && h.bsMonth === viewBS.month)
          .sort((a, b) => a.bsDay - b.bsDay)
          .map((h) => ({
            key: `${h.bsYear}-${h.bsMonth}-${h.bsDay}-${h.name}`,
            day: isNp ? toNepaliDigits(h.bsDay) : String(h.bsDay),
            name: h.name,
            isOrg: h.isOrg,
          }))
      : holidayItems
          .filter(
            (h) => h.ad.getFullYear() === viewDate.getFullYear() && h.ad.getMonth() === viewDate.getMonth(),
          )
          .sort((a, b) => a.ad.getDate() - b.ad.getDate())
          .map((h) => ({
            key: `${h.ad.toISOString()}-${h.name}`,
            day: String(h.ad.getDate()),
            name: h.name,
            isOrg: h.isOrg,
          }))
  )

  const holidayPanel = (
    <aside className="shrink-0 lg:w-72">
      <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="rounded-lg bg-rose-50 p-2">
            <CalendarDays className="h-4 w-4 text-rose-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">
              {isNp ? 'बिदाहरू' : 'Holidays'}
            </h3>
            <p className="truncate text-[11px] text-slate-400">{panelMonthLabel}</p>
          </div>
        </div>
        {monthHolidays.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            {isNp ? 'यस महिना कुनै बिदा छैन' : 'No holidays this month'}
          </p>
        ) : (
          <ul className="-mr-1 space-y-1 overflow-y-auto pr-1">
            {monthHolidays.map((h) => (
              <li
                key={h.key}
                className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose-50 text-[11px] font-semibold text-rose-600">
                  {h.day}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-800">{h.name}</p>
                  <span
                    className={`mt-0.5 inline-block rounded px-1.5 py-px text-[9px] font-medium uppercase tracking-wide ${
                      h.isOrg ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {h.isOrg ? (isNp ? 'संस्था' : 'Org') : isNp ? 'राष्ट्रिय' : 'National'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )

  const calendarBody =
    showHolidayList && expanded ? (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="min-w-0 lg:flex-1">{renderCalendar(false)}</div>
        {holidayPanel}
      </div>
    ) : (
      renderCalendar(false)
    )
  // ────────────────────────────────────────────────────────────────────────

  return (
    <>
      {calendarBody}

      {isFullscreen &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            onKeyDown={e => e.key === 'Escape' && setIsFullscreen(false)}
            tabIndex={-1}
          >
            {renderCalendar(true)}
          </div>,
          document.body
        )}

      {/* Leave popup */}
      {leavePopup && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30"
          onClick={() => setLeavePopup(null)}
        >
          <div
            className="w-72 rounded-xl bg-white p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">
                {isNp ? 'बिदामा कर्मचारीहरू' : 'Employees on leave'}
              </p>
              <button
                onClick={() => setLeavePopup(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {leavePopup.entries.map((entry, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    {entry.name}
                  </div>
                  {entry.reason && (
                    <p
                      className="ml-4 text-xs text-slate-500 truncate cursor-default"
                      title={entry.reason}
                    >
                      {entry.reason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function LegendDot({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${bg}`} />
      <span className={`${text} font-medium`}>{label}</span>
    </div>
  )
}
