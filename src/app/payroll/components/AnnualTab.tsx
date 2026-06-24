'use client'

import { Clock, FileText, Download } from 'lucide-react'
import { fmt, API_BASE } from '../utils'
import { t, Language } from '@/lib/i18n'

interface Props {
  language: Language
  annualYear: number
  annualData: any
  loadingAnnual: boolean
  features: { ssf: boolean; tds: boolean }
  onSetYear: (y: number) => void
  onLoad: () => void
}

const YEARS = [2080, 2081, 2082, 2083]

export default function AnnualTab({
  language,
  annualYear,
  annualData,
  loadingAnnual,
  features,
  onSetYear,
  onLoad,
}: Props) {
  const lang = language

  // Column visibility: show if the feature is currently enabled OR if any
  // employee in this annual report has non-zero historical totals (so when
  // an org disables SSF/PF/TDS later, prior-year data remains visible —
  // hiding it would obscure real money that was deducted).
  const employees = (annualData?.employees ?? []) as Array<{ totals: { employeeSsf: number; employeePf: number; tds: number } }>
  const showSsf = features.ssf || employees.some((e) => e.totals.employeeSsf > 0)
  // PF feature removed (Ruling 2) — column appears only for historical data
  const showPf  = employees.some((e) => e.totals.employeePf > 0)
  const showTds = features.tds || employees.some((e) => e.totals.tds > 0)

  const handleCsvExport = async () => {
    const res = await fetch(`${API_BASE}/api/v1/payroll/annual-report/csv?bsYear=${annualYear}`, {
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `annual-tax-${annualYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Filter card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="mb-1 text-sm font-semibold text-slate-900">
              {t('payroll.annualTax', lang)}
            </h2>
            <p className="text-xs text-slate-500">{t('payroll.annualReportDesc', lang)}</p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Year selector */}
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('date.year', lang)}</label>
              <select
                value={annualYear}
                onChange={(e) => onSetYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* View button */}
            <button
              onClick={onLoad}
              disabled={loadingAnnual}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {loadingAnnual ? t('common.loading', lang) : t('payroll.viewReport', lang)}
            </button>

            {/* CSV export */}
            {annualData && (
              <button
                onClick={handleCsvExport}
                className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
              >
                <Download className="h-3 w-3" />
                {t('payroll.csvDownload', lang)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loadingAnnual && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Clock className="mx-auto mb-3 h-6 w-6 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">{t('common.loading', lang)}</p>
        </div>
      )}

      {/* No data */}
      {!loadingAnnual && annualData && annualData.employees?.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto mb-4 h-8 w-8 text-slate-400" />
          <h3 className="mb-1 text-sm font-semibold text-slate-900">{t('common.noData', lang)}</h3>
          <p className="text-xs text-slate-500">{t('payroll.noYearData', lang)}</p>
        </div>
      )}

      {/* Data table */}
      {!loadingAnnual && annualData?.employees?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {t('payroll.annualReport', lang)} — {annualYear}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('payroll.employee', lang)}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('payroll.annualBasic', lang)}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('payroll.annualGross', lang)}
                  </th>
                  {showSsf && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                      SSF
                    </th>
                  )}
                  {showPf && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                      PF
                    </th>
                  )}
                  {showTds && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                      TDS
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('payroll.deductions', lang)}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('payroll.annualNet', lang)}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {annualData.employees.map((emp: any) => (
                  <tr key={emp.membershipId} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {emp.employee.firstName} {emp.employee.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{emp.employee.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {fmt(emp.totals.basicSalary)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {fmt(emp.totals.grossSalary)}
                    </td>
                    {showSsf && (
                      <td className="px-4 py-3 text-right text-sm text-rose-600">
                        {fmt(emp.totals.employeeSsf)}
                      </td>
                    )}
                    {showPf && (
                      <td className="px-4 py-3 text-right text-sm text-rose-600">
                        {fmt(emp.totals.employeePf)}
                      </td>
                    )}
                    {showTds && (
                      <td className="px-4 py-3 text-right text-sm text-rose-600">
                        {fmt(emp.totals.tds)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-sm text-rose-600">
                      {fmt(emp.totals.totalDeductions)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                      {fmt(emp.totals.netSalary)}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                  <td className="px-4 py-3 text-sm text-slate-900">{t('payroll.total', lang)}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {fmt(
                      annualData.employees.reduce(
                        (s: number, e: any) => s + e.totals.basicSalary,
                        0,
                      ),
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {fmt(
                      annualData.employees.reduce(
                        (s: number, e: any) => s + e.totals.grossSalary,
                        0,
                      ),
                    )}
                  </td>
                  {showSsf && (
                    <td className="px-4 py-3 text-right text-sm text-rose-700">
                      {fmt(
                        annualData.employees.reduce(
                          (s: number, e: any) => s + e.totals.employeeSsf,
                          0,
                        ),
                      )}
                    </td>
                  )}
                  {showPf && (
                    <td className="px-4 py-3 text-right text-sm text-rose-700">
                      {fmt(
                        annualData.employees.reduce(
                          (s: number, e: any) => s + e.totals.employeePf,
                          0,
                        ),
                      )}
                    </td>
                  )}
                  {showTds && (
                    <td className="px-4 py-3 text-right text-sm text-rose-700">
                      {fmt(annualData.employees.reduce((s: number, e: any) => s + e.totals.tds, 0))}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-sm text-rose-700">
                    {fmt(
                      annualData.employees.reduce(
                        (s: number, e: any) => s + e.totals.totalDeductions,
                        0,
                      ),
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                    {fmt(
                      annualData.employees.reduce((s: number, e: any) => s + e.totals.netSalary, 0),
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
