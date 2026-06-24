'use client'

import { X, Eye, Download } from 'lucide-react'
import { PayrollRecord } from '../types'
import { BS_MONTHS_NP, BS_MONTHS_EN, fmt, API_BASE, getDaysInBSMonth } from '../utils'
import { Language } from '@/lib/i18n'

interface Props {
  record: PayrollRecord
  language: Language
  onClose: () => void
  onError: (msg: string) => void
}

export default function PayslipModal({ record, language, onClose, onError }: Props) {
  const isNp = language === 'NEPALI'
  const monthLabel = isNp ? BS_MONTHS_NP[record.bsMonth - 1] : BS_MONTHS_EN[record.bsMonth - 1]

  const pdfUrl = `/payroll/payslip/${record.id}`

  const handleDownload = async () => {
    const res = await fetch(pdfUrl, {
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    if (!res.ok) {
      onError('Download failed')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payslip-${record.user?.employeeId || ''}-${record.bsYear}-${record.bsMonth}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Earnings breakdown. New records carry a dynamic allowancesBreakdown
  // (recurring + pro-rata + one-time, each its own line); legacy records fall
  // back to the old fixed columns + dashain + one-time. See PAYROLL-ALLOWANCES-NOTES.md.
  const breakdown = record.allowancesBreakdown ?? []
  const hasBreakdown = breakdown.length > 0
  const earningsRows: [string, number][] = [
    [isNp ? 'आधारभूत तलब' : 'Basic salary', record.basicSalary],
    ...(hasBreakdown
      ? breakdown.map((b) => [b.label, b.amount] as [string, number])
      : ([
          [isNp ? 'महँगी भत्ता' : 'Dearness allowance', record.dearnessAllowance],
          [isNp ? 'यातायात भत्ता' : 'Transport allowance', record.transportAllowance],
          [isNp ? 'चिकित्सा भत्ता' : 'Medical allowance', record.medicalAllowance],
          [isNp ? 'अन्य भत्ता' : 'Other allowances', record.otherAllowances],
        ] as [string, number][])),
    [isNp ? `ओभरटाइम (${record.overtimeHours} घण्टा)` : `Overtime pay (${record.overtimeHours} hrs)`, record.overtimePay],
    ...(!hasBreakdown && record.dashainBonus > 0
      ? [[isNp ? 'दशैं बोनस' : 'Dashain bonus', record.dashainBonus] as [string, number]]
      : []),
    ...(!hasBreakdown && (record.oneTimePayment ?? 0) > 0
      ? [
          [
            record.oneTimePaymentLabel ||
              (isNp ? 'एक-पटक भुक्तानी' : 'One-time payment'),
            record.oneTimePayment as number,
          ] as [string, number],
        ]
      : []),
  ]

  // Absence deduction shown in earnings as a negative (already baked into grossSalary)
  // This makes the earnings section self-consistent:
  // Basic + Allowances + Overtime + Dashain - AbsenceDeduction = Gross
  //
  // When Saptahanta Anupasthiti Katti contributed, we surface that in the
  // label so the employee can see the breakdown directly on the payslip
  // without needing to ask the admin "why was I docked 2 days for 1 absence?"
  const sandwichDays = ((record as any).sandwichPenaltyDays as number) || 0
  const absenceRow: [string, number] | null =
    record.absenceDeduction > 0
      ? [
        sandwichDays > 0
          ? isNp
            ? `अनुपस्थिति कटौती (सप्ताहान्त कट्टी सहित — ${sandwichDays} दिन)`
            : `Absence deduction (incl. Saptahanta Anupasthiti Katti — ${sandwichDays} days)`
          : isNp
            ? 'अनुपस्थिति कटौती'
            : 'Absence deduction',
        record.absenceDeduction,
      ]
      : null

  // Deductions — absenceDeduction NOT included because it is already in grossSalary
  const deductionRows: [string, number][] = [
    [`SSF (${isNp ? 'कर्मचारी' : 'Employee'})`, record.employeeSsf],
    [`PF (${isNp ? 'कर्मचारी' : 'Employee'})`, record.employeePf],
    ['CIT', record.citDeduction],
    ['TDS', record.tds],
    [isNp ? 'पेशगी कटौती' : 'Advance deduction', record.advanceDeduction],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isNp ? 'पे-स्लिप' : 'Payslip'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {record.user?.firstName} {record.user?.lastName} — {monthLabel} {record.bsYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            >
              <Eye className="h-3.5 w-3.5" />
              {isNp ? 'पूर्वावलोकन' : 'Preview'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              <Download className="h-3.5 w-3.5" />
              {isNp ? 'डाउनलोड' : 'Download'}
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {/* Attendance */}
          <Section label={isNp ? 'उपस्थिति' : 'Attendance'}>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
              <StatBox
                label={isNp ? 'जम्मा दिन' : 'Total Days'}
                value={getDaysInBSMonth(record.bsYear, record.bsMonth)}
                className="bg-emerald-50"
                valueClass="text-emerald-700"
              />
              <StatBox label={isNp ? 'कार्य दिन' : 'Working days'} value={record.workingDaysInMonth} />
              <StatBox
                label={isNp ? 'उपस्थित' : 'Present'}
                value={(record.daysPresent)}
                className="bg-emerald-50"
                valueClass="text-emerald-700"
              />
              <StatBox
                label={isNp ? 'अनुपस्थित' : 'Absent'}
                value={record.daysAbsent}
                className="bg-rose-50"
                valueClass="text-rose-700"
              />
              {(record as any).paidLeaveDays > 0 && (
                <StatBox
                  label={isNp ? 'सशुल्क बिदा' : 'Paid leave'}
                  value={(record as any).paidLeaveDays}
                  className="bg-blue-50"
                  valueClass="text-blue-700"
                />
              )}
              {(record as any).unpaidLeaveDays > 0 && (
                <StatBox
                  label={isNp ? 'बिना तलब बिदा' : 'Unpaid leave'}
                  value={(record as any).unpaidLeaveDays}
                  className="bg-amber-50"
                  valueClass="text-amber-700"
                />
              )}
              {/* Off-day / holiday work — clock-ins on a non-working day or
                  holiday. Excluded from Present; paid as overtime. */}
              {((record as any).offDayWorkDays ?? 0) > 0 && (
                <StatBox
                  label={isNp ? 'बिदाको दिन काम' : 'Off-day work'}
                  value={`${(record as any).offDayWorkDays} · ${(record as any).offDayWorkHours ?? 0}h`}
                  className="bg-purple-50"
                  valueClass="text-purple-700"
                />
              )}
              {/* Saptahanta Anupasthiti Katti — show only when penalty
                  was actually applied. Field is missing or 0 for orgs
                  without the feature, in which case the stat hides. */}
              {(record as any).sandwichPenaltyDays > 0 && (
                <StatBox
                  label={isNp ? 'सप्ताहान्त कट्टी' : 'Sandwich Days'}
                  value={(record as any).sandwichPenaltyDays}
                  className="bg-orange-50"
                  valueClass="text-orange-700"
                />
              )}
            </div>
          </Section>

          {/* Earnings */}
          <Section label={isNp ? 'आमदानी' : 'Earnings'}>
            <div className="space-y-1 text-xs">
              {earningsRows
                .filter(([, v]) => v > 0)
                .map(([label, val]) => (
                  <LineItem key={label} label={label} value={`Rs. ${fmt(val)}`} />
                ))}
              {/* Absence deduction shown as negative in earnings — explains why gross < basic */}
              {absenceRow && (
                <LineItem
                  label={absenceRow[0]}
                  value={`- Rs. ${fmt(absenceRow[1])}`}
                  valueClass="text-rose-600"
                />
              )}
              <LineItem
                label={isNp ? 'कुल आमदानी' : 'Gross salary'}
                value={`Rs. ${fmt(record.grossSalary + (record.dashainBonus || 0) + (record.oneTimePayment || 0))}`}
                bold
                separator
              />
            </div>
          </Section>

          {/* Deductions */}
          <Section label={isNp ? 'कटौती' : 'Deductions'}>
            <div className="space-y-1 text-xs">
              {deductionRows
                .filter(([, v]) => v > 0)
                .map(([label, val]) => (
                  <LineItem
                    key={label}
                    label={label}
                    value={`Rs. ${fmt(val)}`}
                    valueClass="text-rose-600"
                  />
                ))}
              <LineItem
                label={isNp ? 'जम्मा कटौती' : 'Total deductions'}
                value={`Rs. ${fmt(record.totalDeductions)}`}
                bold
                separator
                valueClass="text-rose-700"
              />
            </div>
          </Section>

          {/* Employer contribution */}
          {(record.employerSsf > 0 || record.employerPf > 0) && (
            <Section label={isNp ? 'नियोक्ता योगदान' : 'Employer contribution'}>
              <div className="space-y-1 text-xs">
                {record.employerSsf > 0 && (
                  <LineItem
                    label={`SSF (${isNp ? 'नियोक्ता' : 'Employer'})`}
                    value={`Rs. ${fmt(record.employerSsf)}`}
                    valueClass="text-blue-600"
                  />
                )}
                {record.employerPf > 0 && (
                  <LineItem
                    label={`PF (${isNp ? 'नियोक्ता' : 'Employer'})`}
                    value={`Rs. ${fmt(record.employerPf)}`}
                    valueClass="text-blue-600"
                  />
                )}
              </div>
            </Section>
          )}

          {/* Net salary */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">
                {isNp ? 'खुद तलब' : 'Net salary'}
              </span>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Rs. {fmt(record.netSalary)}
              </span>
            </div>
            {record.isMarried && (
              <p className="mt-1 text-[10px] text-slate-500">
                {isNp ? '* विवाहित कर स्ल्याब लागू' : '* Married tax slab applied'}
              </p>
            )}
          </div>

          {/* Full calculation breakdown */}
          <Section label={isNp ? 'पूर्ण विवरण' : 'Full breakdown'}>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-xs">
              {/* Earnings block */}
              <div className="border-b border-slate-200 bg-slate-100 px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                  {isNp ? 'आमदानी' : 'Earnings'}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {earningsRows
                  .filter(([, v]) => v > 0)
                  .map(([label, val]) => (
                    <BreakdownRow key={label} label={label} value={`Rs. ${fmt(val)}`} />
                  ))}
                {absenceRow && (
                  <BreakdownRow
                    label={absenceRow[0]}
                    value={`- Rs. ${fmt(absenceRow[1])}`}
                    valueClass="text-rose-600"
                  />
                )}
                <BreakdownRow
                  label={isNp ? 'कुल आमदानी' : 'Gross salary'}
                  value={`Rs. ${fmt(record.grossSalary + (record.dashainBonus || 0) + (record.oneTimePayment || 0))}`}
                  bold
                />
              </div>

              {/* Deductions block */}
              <div className="border-y border-slate-200 bg-slate-100 px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                  {isNp ? 'कटौती' : 'Deductions'}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {deductionRows
                  .filter(([, v]) => v > 0)
                  .map(([label, val]) => (
                    <BreakdownRow
                      key={label}
                      label={label}
                      value={`Rs. ${fmt(val)}`}
                      valueClass="text-rose-600"
                    />
                  ))}
                <BreakdownRow
                  label={isNp ? 'जम्मा कटौती' : 'Total deductions'}
                  value={`Rs. ${fmt(record.totalDeductions)}`}
                  bold
                  valueClass="text-rose-700"
                />
              </div>

              {/* Employer contribution block */}
              {(record.employerSsf > 0 || record.employerPf > 0) && (
                <>
                  <div className="border-y border-slate-200 bg-slate-100 px-4 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                      {isNp ? 'नियोक्ता योगदान' : 'Employer contribution'}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {record.employerSsf > 0 && (
                      <BreakdownRow
                        label={`SSF (${isNp ? 'नियोक्ता' : 'Employer'})`}
                        value={`Rs. ${fmt(record.employerSsf)}`}
                        valueClass="text-blue-600"
                      />
                    )}
                    {record.employerPf > 0 && (
                      <BreakdownRow
                        label={`PF (${isNp ? 'नियोक्ता' : 'Employer'})`}
                        value={`Rs. ${fmt(record.employerPf)}`}
                        valueClass="text-blue-600"
                      />
                    )}
                  </div>
                </>
              )}

              {/* Net salary block */}
              <div className="flex items-center justify-between border-t border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="text-sm font-bold text-emerald-900">
                  {isNp ? 'खुद तलब' : 'Net salary'}
                </span>
                <span className="text-sm font-bold text-emerald-700">
                  Rs. {fmt(record.netSalary)}
                </span>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </h4>
      {children}
    </div>
  )
}

function StatBox({
  label,
  value,
  className = 'bg-slate-50',
  valueClass = 'text-slate-900',
}: {
  label: string
  value: number | string
  className?: string
  valueClass?: string
}) {
  return (
    <div className={`${className} rounded-lg p-2 text-center`}>
      <div className={`text-sm font-semibold ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  )
}

function LineItem({
  label,
  value,
  bold,
  separator,
  valueClass = 'text-slate-900',
}: {
  label: string
  value: string
  bold?: boolean
  separator?: boolean
  valueClass?: string
}) {
  return (
    <div
      className={`flex justify-between py-0.5 ${separator ? 'mt-1 border-t border-slate-200 pt-1.5' : ''}`}
    >
      <span className={bold ? 'font-semibold text-slate-900' : 'text-slate-600'}>{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  bold,
  valueClass = 'text-slate-700',
}: {
  label: string
  value: string
  bold?: boolean
  valueClass?: string
}) {
  return (
    <div className={`flex justify-between px-4 py-2 ${bold ? 'bg-slate-50' : ''}`}>
      <span className={bold ? 'font-semibold text-slate-900' : 'text-slate-600'}>{label}</span>
      <span className={`font-medium ${bold ? 'text-slate-900' : valueClass}`}>{value}</span>
    </div>
  )
}
