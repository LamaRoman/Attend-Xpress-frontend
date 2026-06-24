'use client'
import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  adToBS,
  bsToAD,
  getDaysInBSMonth,
  toNepaliDigits,
  BS_MONTHS_NP,
  BS_MONTHS_EN,
} from './BSDatePicker'

const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const DAYS_NP = ['आ', 'सो', 'मं', 'बु', 'बि', 'शु', 'श']

function localDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  isBs?: boolean
  isNp?: boolean
}

export default function DateRangePicker({
  from,
  to,
  onChange,
  isBs = false,
  isNp = false,
}: DateRangePickerProps) {
  const today = new Date()
  const todayStr = localDateStr(today)
  const todayBs = adToBS(today)

  const getInitView = (dateStr: string) => {
    if (dateStr) {
      if (isBs) {
        const [y, m, d] = dateStr.split('-').map(Number)
        const bs = adToBS(new Date(y, m - 1, d))
        return { year: bs.year, month: bs.month }
      }
      const [y, m] = dateStr.split('-').map(Number)
      return { year: y, month: m }
    }
    return isBs
      ? { year: todayBs.year, month: todayBs.month }
      : { year: today.getFullYear(), month: today.getMonth() + 1 }
  }

  const [viewYear, setViewYear] = useState(() => getInitView(from || todayStr).year)
  const [viewMonth, setViewMonth] = useState(() => getInitView(from || todayStr).month)
  const [isOpen, setIsOpen] = useState(false)
  const [hover, setHover] = useState<string | null>(null)
  const [phase, setPhase] = useState<'from' | 'to'>('from')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
        setHover(null)
        setPhase('from')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Calendar math
  const daysInMonth = isBs
    ? getDaysInBSMonth(viewYear, viewMonth)
    : new Date(viewYear, viewMonth, 0).getDate()

  const firstWeekday = isBs
    ? bsToAD(viewYear, viewMonth, 1).getDay()
    : new Date(viewYear, viewMonth - 1, 1).getDay()

  const dayToDateStr = (day: number): string => {
    if (isBs) return localDateStr(bsToAD(viewYear, viewMonth, day))
    return localDateStr(new Date(viewYear, viewMonth - 1, day))
  }

  // Effective end: hover preview while selecting end
  const effTo = phase === 'to' && hover ? hover : to

  // Normalise so rangeFrom is always ≤ rangeTo
  const rangeFrom = from && effTo ? (from <= effTo ? from : effTo) : from
  const rangeTo   = from && effTo ? (from <= effTo ? effTo : from) : effTo
  const single    = !!rangeFrom && rangeFrom === rangeTo

  const isStart = (d: string) => !!rangeFrom && d === rangeFrom
  const isEnd   = (d: string) => !!rangeTo   && d === rangeTo
  const inRange = (d: string) => !!rangeFrom && !!rangeTo && d > rangeFrom && d < rangeTo

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Day click: two-phase selection
  const handleDayClick = (dStr: string) => {
    if (phase === 'from') {
      onChange(dStr, dStr)
      setPhase('to')
    } else {
      const [f, t] = dStr >= from ? [from, dStr] : [dStr, from]
      onChange(f, t)
      setIsOpen(false)
      setHover(null)
      setPhase('from')
    }
  }

  // Display helpers
  const fmtDate = (adStr: string): string => {
    if (!adStr) return '—'
    const [y, m, d] = adStr.split('-').map(Number)
    if (isBs) {
      const bs = adToBS(new Date(y, m - 1, d))
      const mon = isNp ? BS_MONTHS_NP[bs.month - 1] : BS_MONTHS_EN[bs.month - 1]
      const day = isNp ? toNepaliDigits(bs.day) : String(bs.day)
      const yr  = isNp ? toNepaliDigits(bs.year) : String(bs.year)
      return `${mon} ${day}, ${yr}`
    }
    return new Date(y, m - 1, d).toLocaleDateString(isNp ? 'ne-NP' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  const fmtShort = (adStr: string): string => {
    if (!adStr) return '—'
    const [y, m, d] = adStr.split('-').map(Number)
    if (isBs) {
      const bs = adToBS(new Date(y, m - 1, d))
      const mon = isNp ? BS_MONTHS_NP[bs.month - 1] : BS_MONTHS_EN[bs.month - 1]
      const day = isNp ? toNepaliDigits(bs.day) : String(bs.day)
      return `${mon} ${day}`
    }
    return new Date(y, m - 1, d).toLocaleDateString(isNp ? 'ne-NP' : 'en-US', {
      month: 'short', day: 'numeric',
    })
  }

  const dayCount =
    from && to && from <= to
      ? Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
      : 0

  const monthLabel = isBs
    ? `${isNp ? BS_MONTHS_NP[viewMonth - 1] : BS_MONTHS_EN[viewMonth - 1]} ${isNp ? toNepaliDigits(viewYear) : viewYear}`
    : new Date(viewYear, viewMonth - 1).toLocaleDateString(isNp ? 'ne-NP' : 'en-US', {
        month: 'long', year: 'numeric',
      })

  // Quick preset ranges
  const presets = (() => {
    const d = new Date()
    const todayAD = localDateStr(d)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const monthStart  = localDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
    const lMonthStart = localDateStr(new Date(d.getFullYear(), d.getMonth() - 1, 1))
    const lMonthEnd   = localDateStr(new Date(d.getFullYear(), d.getMonth(), 0))
    return [
      { label: isNp ? 'आज'        : 'Today',       from: todayAD,                  to: todayAD     },
      { label: isNp ? 'यो हप्ता'  : 'This week',   from: localDateStr(weekStart),   to: todayAD     },
      { label: isNp ? 'यो महिना'  : 'This month',  from: monthStart,               to: todayAD     },
      { label: isNp ? 'गत महिना'  : 'Last month',  from: lMonthStart,              to: lMonthEnd   },
    ]
  })()

  const weekDays = isNp ? DAYS_NP : DAYS_EN

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger ── */}
      <button
        onClick={() => { setIsOpen(v => !v); if (!isOpen) setPhase('from') }}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="font-medium text-slate-700">{fmtShort(from)}</span>
        <span className="text-slate-300">–</span>
        <span className="font-medium text-slate-700">{fmtShort(to)}</span>
      </button>

      {/* ── Dropdown calendar ── */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[308px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">

          {/* Phase hint */}
          <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {phase === 'from'
              ? isNp ? 'सुरु मिति छान्नुहोस्' : 'Select start date'
              : isNp ? 'अन्त्य मिति छान्नुहोस्' : 'Select end date'}
          </p>

          {/* Month navigation */}
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800">{monthLabel}</span>
            <button
              onClick={nextMonth}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="mb-1 grid grid-cols-7">
            {weekDays.map(d => (
              <div key={d} className="py-0.5 text-center text-[11px] font-medium text-slate-400">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstWeekday }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dStr  = dayToDateStr(day)
              const s     = isStart(dStr)
              const e     = isEnd(dStr)
              const r     = inRange(dStr)
              const isT   = dStr === todayStr
              // Half-strip logic: the strip runs between the centres of start and end
              const showLeft  = r || (e && !single)
              const showRight = r || (s && !single)

              return (
                <div key={day} className="relative flex h-9 items-center justify-center">
                  {showLeft  && <div className="absolute left-0 top-1/2 h-8 w-1/2 -translate-y-1/2 bg-slate-100" />}
                  {showRight && <div className="absolute right-0 top-1/2 h-8 w-1/2 -translate-y-1/2 bg-slate-100" />}
                  <button
                    onClick={() => handleDayClick(dStr)}
                    onMouseEnter={() => phase === 'to' && setHover(dStr)}
                    onMouseLeave={() => phase === 'to' && setHover(null)}
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                      s || e
                        ? 'bg-slate-900 font-semibold text-white shadow-sm'
                        : r
                          ? 'text-slate-800 hover:bg-slate-200'
                          : isT
                            ? 'font-semibold text-slate-900 ring-1 ring-slate-400 hover:bg-slate-100'
                            : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isBs ? (isNp ? toNepaliDigits(day) : day) : day}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Selected range summary */}
          {from && to && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">
                {fmtShort(from)}
                {from !== to && <> – {fmtShort(to)}</>}
              </span>
              {dayCount > 0 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {isNp
                    ? toNepaliDigits(dayCount) + ' दिन'
                    : `${dayCount} ${dayCount === 1 ? 'day' : 'days'}`}
                </span>
              )}
            </div>
          )}

          {/* Quick presets */}
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
            {presets.map(p => {
              const active = from === p.from && to === p.to
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    onChange(p.from, p.to)
                    setIsOpen(false)
                    setPhase('from')
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Reset while picking end */}
          {phase === 'to' && (
            <button
              onClick={() => { setPhase('from'); setHover(null) }}
              className="mt-2 w-full rounded-lg py-1.5 text-center text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
            >
              {isNp ? '↩ फेरि सुरु गर्नुहोस्' : '↩ Start over'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
