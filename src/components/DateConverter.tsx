'use client'
import { useState, useCallback } from 'react'
import { ArrowDown, ArrowLeftRight } from 'lucide-react'
import {
  adToBS, bsToAD, getDaysInBSMonth,
  BS_MONTHS_NP, BS_MONTHS_EN, toNepaliDigits,
} from '@/components/BSDatePicker'

interface DateConverterProps {
  isNp?: boolean
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DateConverter({ isNp = true }: DateConverterProps) {
  const today   = new Date()
  const todayBS = adToBS(today)

  const [direction, setDirection] = useState<'bs2ad' | 'ad2bs'>('bs2ad')
  const [bsYear,  setBsYear]  = useState(todayBS.year)
  const [bsMonth, setBsMonth] = useState(todayBS.month)
  const [bsDay,   setBsDay]   = useState(todayBS.day)
  const [adInput, setAdInput] = useState(localDateStr(today))

  const daysInBsMonth = getDaysInBSMonth(bsYear, bsMonth)

  const handleBsYear  = (y: number) => { setBsYear(y);  const max = getDaysInBSMonth(y, bsMonth); if (bsDay > max) setBsDay(max) }
  const handleBsMonth = (m: number) => { setBsMonth(m); const max = getDaysInBSMonth(bsYear, m);  if (bsDay > max) setBsDay(max) }

  const result = useCallback((): { main: string; sub: string; extra?: string } => {
    try {
      if (direction === 'bs2ad') {
        const d = bsToAD(bsYear, bsMonth, bsDay)
        const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
        const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        return { main: dateStr, sub: isNp ? 'ई.सं. (ग्रेगोरियन)' : 'Gregorian (AD)', extra: weekday }
      } else {
        const [y, m, d] = adInput.split('-').map(Number)
        if (!y || !m || !d) return { main: '—', sub: '' }
        const bs  = adToBS(new Date(y, m - 1, d))
        const mon = isNp ? BS_MONTHS_NP[bs.month - 1] : BS_MONTHS_EN[bs.month - 1]
        const day = isNp ? toNepaliDigits(bs.day)  : String(bs.day)
        const yr  = isNp ? toNepaliDigits(bs.year) : String(bs.year)
        return {
          main: `${mon} ${day}, ${yr}`,
          sub:  isNp ? 'बिक्रम सम्बत (बि.सं.)' : 'Bikram Sambat (BS)',
        }
      }
    } catch {
      return { main: '—', sub: '' }
    }
  }, [direction, bsYear, bsMonth, bsDay, adInput, isNp])

  const MONTHS   = isNp ? BS_MONTHS_NP : BS_MONTHS_EN
  const BS_YEARS = Array.from({ length: 91 }, (_, i) => 2000 + i)
  const sel = 'rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200'
  const res = result()

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-slate-100 p-2">
            <ArrowLeftRight className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {isNp ? 'मिति रूपान्तरण' : 'Date converter'}
            </h3>
            <p className="text-[11px] text-slate-400">BS ↔ AD</p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-medium">
          <button
            onClick={() => setDirection('bs2ad')}
            className={`rounded px-3 py-1.5 transition-colors ${direction === 'bs2ad' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            BS→AD
          </button>
          <button
            onClick={() => setDirection('ad2bs')}
            className={`rounded px-3 py-1.5 transition-colors ${direction === 'ad2bs' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            AD→BS
          </button>
        </div>
      </div>

      {/* Input controls */}
      {direction === 'bs2ad' ? (
        <div className="flex gap-2">
          <select value={bsYear}  onChange={e => handleBsYear(Number(e.target.value))}  className={`${sel} flex-1 min-w-0`}>
            {BS_YEARS.map(y => <option key={y} value={y}>{isNp ? toNepaliDigits(y) : y}</option>)}
          </select>
          <select value={bsMonth} onChange={e => handleBsMonth(Number(e.target.value))} className={`${sel} flex-1 min-w-0`}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={bsDay}   onChange={e => setBsDay(Number(e.target.value))}        className={`${sel} w-16`}>
            {Array.from({ length: daysInBsMonth }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{isNp ? toNepaliDigits(d) : d}</option>
            ))}
          </select>
        </div>
      ) : (
        <input
          type="date"
          value={adInput}
          onChange={e => setAdInput(e.target.value)}
          className={`${sel} w-full`}
        />
      )}

      {/* Arrow */}
      <div className="my-2.5 flex items-center justify-center">
        <ArrowDown className="h-4 w-4 text-slate-300" />
      </div>

      {/* Result card */}
      <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 px-4 py-3 text-center">
        {res.extra && (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-slate-400">
            {res.extra}
          </p>
        )}
        <p className="text-lg font-bold leading-snug text-white">{res.main}</p>
        <p className="mt-1.5 text-[11px] text-slate-400">{res.sub}</p>
      </div>
    </div>
  )
}
