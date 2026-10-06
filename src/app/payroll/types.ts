export interface PaySettings {
  basicSalary: number
  overtimeRatePerHour: number
  ssfEnabled: boolean
  employeeSsfRate: number
  employerSsfRate: number
  tdsEnabled: boolean
  citEnabled: boolean
  citAmount: number
  isMarried: boolean
  advanceDeduction: number
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
}

export type AllowanceType = 'RECURRING' | 'ONE_TIME' | 'PRO_RATA'

/** A dynamic per-employee allowance row. See PAYROLL-ALLOWANCES-NOTES.md. */
export interface Allowance {
  id: string
  label: string
  amount: number
  type: AllowanceType
  effectiveFrom: string // "YYYY-MM-DD"
  effectiveTo: string | null
}

/** Itemized allowance line stored on a generated payslip. */
export interface AllowanceLine {
  label: string
  amount: number
  type: AllowanceType
}
export interface PayrollRecord {
  id: string
  userId: string
  bsYear: number
  bsMonth: number
  workingDaysInMonth: number
  holidaysInMonth: number
  daysPresent: number
  daysAbsent: number
  overtimeHours: number
  /** Off-day/holiday work — days clocked in on a non-working day or holiday
   *  (excluded from Present; the hours are already inside overtimeHours). */
  offDayWorkDays?: number
  offDayWorkHours?: number
  basicSalary: number
  /** Recurring + pro-rata allowance total included in gross (new system). */
  allowancesTotal?: number
  /** Itemized allowance snapshot for this payslip (new system). */
  allowancesBreakdown?: AllowanceLine[]
  // Legacy fixed-allowance columns — still returned (0 for new records).
  dearnessAllowance: number
  transportAllowance: number
  medicalAllowance: number
  otherAllowances: number
  overtimePay: number
  grossSalary: number
  absenceDeduction: number
  employeeSsf: number
  employerSsf: number
  employeePf: number
  employerPf: number
  citDeduction: number
  advanceDeduction: number
  dashainBonus: number
  oneTimePayment?: number
  oneTimePaymentLabel?: string | null
  isMarried: boolean
  tds: number
  otherDeductions: number
  totalDeductions: number
  netSalary: number
  status: string
  regeneratedFromPaid?: boolean
  regeneratedAt?: string | null
  regeneratedBy?: string | null
  previousNetSalary?: number | null
  overrideReason?: string | null
  monthNameEn: string
  monthNameNp: string
  user?: { firstName: string; lastName: string; employeeId: string }
}
export type Tab = 'settings' | 'generate' | 'records' | 'annual' | 'multimonth'
export interface LiveCalculation {
  gross: number
  employeeSsf: number
  citDeduction: number
  tds: number
  totalDeductions: number
  net: number
  employerSsf: number
}
export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PROCESSED: 'bg-blue-50 text-blue-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-slate-100 text-slate-900',
}
