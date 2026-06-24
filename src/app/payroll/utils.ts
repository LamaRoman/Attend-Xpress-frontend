import { PaySettings } from './types'
import NepaliDate from 'nepali-date-converter'

export const BS_MONTHS_NP = [
  'बैशाख',
  'जेठ',
  'असार',
  'श्रावण',
  'भाद्र',
  'आश्विन',
  'कार्तिक',
  'मंसिर',
  'पौष',
  'माघ',
  'फाल्गुन',
  'चैत्र',
]

export const BS_MONTHS_EN = [
  'Baisakh',
  'Jestha',
  'Ashar',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
]

export const defaultSettings: PaySettings = {
  basicSalary: 0,
  overtimeRatePerHour: 0,
  ssfEnabled: true,
  employeeSsfRate: 11,
  employerSsfRate: 20,
  tdsEnabled: true,
  citEnabled: false,
  citAmount: 0,
  isMarried: false,
  advanceDeduction: 0,
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
}

/** Shape returned by GET /api/v1/payroll/tds-slabs — already validated
 *  and merged with defaults server-side, identical to what payroll
 *  generation uses. */
export interface TDSConfig {
  fiscalYear?: string
  firstSlabRate: number
  unmarriedFirstSlab: number
  marriedFirstSlab: number
  slabs: { limit: number; rate: number; label?: string }[]
}

/** Retirement-deduction ceiling — mirrors backend RETIREMENT_DEDUCTION_ANNUAL_CAP.
 *  See PAYROLL-CA-NOTES-2026-06.md Ruling 3. */
export const RETIREMENT_DEDUCTION_ANNUAL_CAP = 500_000

/**
 * TDS estimation — Nepal progressive slabs.
 *
 * Taxable income = annual assessable (gross + employer retirement
 * contributions) − deductible retirement contributions, where the
 * deduction is capped at min(Rs. 500,000, ⅓ of assessable) — mirrors
 * backend computeAnnualTaxableIncome (PAYROLL-CA-NOTES-2026-06.md
 * Ruling 3). Identical to plain gross − employee contributions whenever
 * the cap doesn't bind.
 *
 * Slab limits/rates come from `tdsConfig` (fetched from
 * /api/v1/payroll/tds-slabs — the same merged config the backend uses
 * for generation). The hardcoded FY 2081/82 constants below are a
 * last-resort fallback for when the fetch failed:
 *   Single:  Rs. 5,00,000 @ 1%  |  Married: Rs. 6,00,000 @ 1%
 *     → WAIVED (0%) for SSF contributors per Section 21(4) of Financial Act
 *   Next Rs. 2,00,000 @ 10% | Next Rs. 3,00,000 @ 20%
 *   Next Rs. 10,00,000 @ 30% | Next Rs. 30,00,000 @ 36% | Remainder @ 39%
 *
 * Returns the monthly TDS instalment (annual tax / 12).
 * This is a client-side estimate only; the backend is authoritative for
 * actual payroll records.
 */
export function calculateTDS(
  annualGross: number,
  isMarried: boolean,
  monthlySsf: number,
  monthlyCit: number,
  ssfEnabled: boolean = false,
  tdsConfig?: TDSConfig | null,
  monthlyEmployerSsf: number = 0,
): number {
  const annualAssessable = annualGross + monthlyEmployerSsf * 12
  const annualContributions = (monthlySsf + monthlyEmployerSsf + monthlyCit) * 12
  const annualDeductible = Math.min(
    annualContributions,
    RETIREMENT_DEDUCTION_ANNUAL_CAP,
    annualAssessable / 3,
  )
  const taxableIncome = annualAssessable - annualDeductible
  if (taxableIncome <= 0) return 0

  const firstSlabLimit = isMarried
    ? (tdsConfig?.marriedFirstSlab ?? 600_000)
    : (tdsConfig?.unmarriedFirstSlab ?? 500_000)

  // SSF contributors are exempt from 1% Social Security Tax
  // per Section 21(4) of Nepal's Financial Act (ssf.gov.np)
  const firstSlabRate = ssfEnabled ? 0 : (tdsConfig?.firstSlabRate ?? 1) / 100

  const restSlabs = tdsConfig?.slabs?.map((s) => ({
    limit: s.limit === 0 ? Infinity : s.limit,
    rate: s.rate / 100,
  })) ?? [
    { limit: 200_000, rate: 0.1 },
    { limit: 300_000, rate: 0.2 },
    { limit: 1_000_000, rate: 0.3 },
    { limit: 3_000_000, rate: 0.36 },
    { limit: Infinity, rate: 0.39 },
  ]

  const slabs = [{ limit: firstSlabLimit, rate: firstSlabRate }, ...restSlabs]

  let tax = 0
  let remaining = taxableIncome

  for (const slab of slabs) {
    if (remaining <= 0) break
    const taxable = Math.min(remaining, slab.limit)
    tax += taxable * slab.rate
    remaining -= taxable
  }

  return Math.round(tax / 12) // Monthly instalment, whole rupees (matches backend)
}

/** Format a number as currency with two decimal places. */
export function fmt(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Build a PaySettings object from a raw API record (fills missing fields with defaults).
 *  All numeric fields are wrapped in Number() to guard against Prisma Decimal objects
 *  which cause string concatenation bugs when used in arithmetic.
 */
export function paySettingsFromApi(existing: any): PaySettings {
  return {
    basicSalary: Number(existing.basicSalary) || 0,
    overtimeRatePerHour: Number(existing.overtimeRatePerHour) || 0,
    ssfEnabled: existing.ssfEnabled ?? true,
    employeeSsfRate: Number(existing.employeeSsfRate) || 11,
    employerSsfRate: Number(existing.employerSsfRate) || 20,
    tdsEnabled: existing.tdsEnabled ?? true,
    citEnabled: existing.citEnabled ?? false,
    citAmount: Number(existing.citAmount) || 0,
    isMarried: existing.isMarried ?? false,
    advanceDeduction: Number(existing.advanceDeduction) || 0,
    bankName: existing.bankName || '',
    bankAccountName: existing.bankAccountName || '',
    bankAccountNumber: existing.bankAccountNumber || '',
  }
}

/** Sum of allowances active "today" that contribute to recurring gross
 *  (RECURRING + PRO_RATA, full amount). Used for the live-preview estimate;
 *  ONE_TIME is excluded since it isn't part of the ×12 recurring base. */
export function activeRecurringAllowanceTotal(
  allowances: { amount: number; type: string; effectiveFrom: string; effectiveTo: string | null }[],
): number {
  const today = new Date().toISOString().slice(0, 10)
  return allowances.reduce((sum, a) => {
    if (a.type === 'ONE_TIME') return sum
    const active = a.effectiveFrom <= today && (a.effectiveTo === null || a.effectiveTo >= today)
    return active ? sum + Number(a.amount || 0) : sum
  }, 0)
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

// ─── BS month length ──────────────────────────────────────────────────────────
// Copied from BSDatePicker so payroll displays can compute the number of days in
// a BS month without importing the date-picker component. Behavior is identical
// (nepali-date-converter, reliable ~2000–2090 BS).
function adToBS(date: Date): { year: number; month: number; day: number } {
  const nd = new NepaliDate(date)
  return { year: nd.getYear(), month: nd.getMonth() + 1, day: nd.getDate() }
}

function bsToAD(bsYear: number, bsMonth: number, bsDay: number): Date {
  const nd = new NepaliDate(bsYear, bsMonth - 1, bsDay)
  return nd.toJsDate()
}

/** Number of days in a given BS month (month is 1-indexed). */
export function getDaysInBSMonth(year: number, month1: number): number {
  const nextMonth = month1 === 12 ? 1 : month1 + 1
  const nextYear = month1 === 12 ? year + 1 : year
  const firstOfNextMonthAD = bsToAD(nextYear, nextMonth, 1)
  const lastDayAD = new Date(
    firstOfNextMonthAD.getFullYear(),
    firstOfNextMonthAD.getMonth(),
    firstOfNextMonthAD.getDate() - 1,
    12, 0, 0,
  )
  return adToBS(lastDayAD).day
}
