'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import AccountantLayout from '@/components/AccountantLayout'
import { BranchFilterPills, type BranchPill } from '@/components/BranchFilterPills'
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  X,
  Settings,
  FileText,
  Play,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Lock,
} from 'lucide-react'
import { adToBS } from '@/components/BSDatePicker'
import { FeatureLockScreen } from '@/components/FeatureLock'

import { PaySettings, PayrollRecord, Tab, Allowance } from './types'
import {
  defaultSettings,
  calculateTDS,
  paySettingsFromApi,
  activeRecurringAllowanceTotal,
} from './utils'
import SettingsTab from './components/SettingsTab'
import GenerateTab from './components/GenerateTab'
import RecordsTab from './components/RecordsTab'
import AnnualTab from './components/AnnualTab'
import MultiMonthTab from './components/MultiMonthTab'
import PayslipModal from './components/PayslipModal'

export default function PayrollPage() {
  const { user, isLoading, language, features } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'

  // ── Derived from auth context — works for all roles ──
  const featurePayrollWorkflow = features.payrollWorkflow
  const isAccountant = user?.role === 'ORG_ACCOUNTANT'

  // ── UI state ──
  const [tab, setTab] = useState<Tab>('settings')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // ── Settings tab ──
  const [users, setUsers] = useState<any[]>([])
  const [allPaySettings, setAllPaySettings] = useState<Record<string, any>>({})
  const [selectedUser, setSelectedUser] = useState('')
  const [form, setForm] = useState<PaySettings>({ ...defaultSettings })
  const [originalForm, setOriginalForm] = useState<PaySettings>({ ...defaultSettings })
  // Active recurring/pro-rata allowance total for the selected employee — feeds
  // the live gross preview. Updated when the employee changes or allowances are edited.
  const [allowanceTotal, setAllowanceTotal] = useState(0)
  const [saving, setSaving] = useState(false)
  const [tdsSlabs, setTdsSlabs] = useState<any>(null)
  const [showTdsInfo, setShowTdsInfo] = useState(false)
  const [showCopyDropdown, setShowCopyDropdown] = useState(false)

  // ── Generate tab ──
  const todayBS = adToBS(new Date())
  const [genYear, setGenYear] = useState(todayBS.year)
  const [genMonth, setGenMonth] = useState(todayBS.month)
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<any>(null)

  // ── Records tab ──
  const [recYear, setRecYear] = useState(todayBS.year)
  const [recMonth, setRecMonth] = useState(todayBS.month)
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null)

  // ── Annual tab ──
  const [annualYear, setAnnualYear] = useState(todayBS.year)
  const [annualData, setAnnualData] = useState<any>(null)
  const [loadingAnnual, setLoadingAnnual] = useState(false)

  // ── Multi-month tab ──
  const [multiFromYear, setMultiFromYear] = useState(todayBS.year)
  const [multiFromMonth, setMultiFromMonth] = useState(1)
  const [multiToYear, setMultiToYear] = useState(todayBS.year)
  const [multiToMonth, setMultiToMonth] = useState(3)
  const [multiMonthData, setMultiMonthData] = useState<any>(null)
  const [loadingMultiMonth, setLoadingMultiMonth] = useState(false)
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)

  // Phase 8b — branch filter state. Applies to Settings / Records / Multi-month.
  // Annual report endpoint does not accept branchId yet (out of scope for 8b).
  const [branches, setBranches] = useState<BranchPill[]>([])
  const [archivedBranches, setArchivedBranches] = useState<BranchPill[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<'ALL' | string>('ALL')
  const [archivedExpanded, setArchivedExpanded] = useState(false)
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN'
  const isOrgAdmin = user?.role === 'ORG_ADMIN'
  const isMultiBranch = branches.length > 1

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(originalForm),
    [form, originalForm],
  )

  const liveCalculation = useMemo(() => {
    // Recurring + pro-rata allowances active today add to the recurring base
    // (one-time is excluded from the ×12 estimate). See PAYROLL-ALLOWANCES-NOTES.md.
    const gross = form.basicSalary + allowanceTotal
    // SSF/PF are calculated on basic salary only, matching the backend's
    // effectiveBasic logic. Live preview assumes full attendance, so basic
    // alone is the right base here.
    //
    // Each deduction is gated by BOTH the super-admin-controlled org
    // availability (features.*) AND the per-employee enabled flag (form.*Enabled)
    // — matching the backend's effective-flag logic exactly.
    const effSsf = features.ssf && form.ssfEnabled
    const effCit = features.cit && form.citEnabled
    const effTds = features.tds && form.tdsEnabled

    const employeeSsf = effSsf ? (form.basicSalary * form.employeeSsfRate) / 100 : 0
    const employerSsf = effSsf ? (form.basicSalary * form.employerSsfRate) / 100 : 0
    const citDeduction = effCit ? form.citAmount : 0
    const tds = effTds
      ? calculateTDS(
          gross * 12,
          form.isMarried,
          employeeSsf,
          citDeduction,
          effSsf,
          tdsSlabs,
          employerSsf,
        )
      : 0
    const totalDeductions = employeeSsf + citDeduction + tds + form.advanceDeduction
    return {
      gross,
      employeeSsf,
      citDeduction,
      tds,
      totalDeductions,
      net: gross - totalDeductions,
      employerSsf,
    }
  }, [form, allowanceTotal, features.ssf, features.cit, features.tds, tdsSlabs])

  // ── Auth guard ──
  useEffect(() => {
    if (
      !isLoading &&
      (!user ||
        (user.role !== 'ORG_ADMIN' &&
          user.role !== 'BRANCH_ADMIN' &&
          user.role !== 'ORG_ACCOUNTANT'))
    ) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // ── Load data on tab change ──
  useEffect(() => {
    if (
      !user ||
      (user.role !== 'ORG_ADMIN' && user.role !== 'BRANCH_ADMIN' && user.role !== 'ORG_ACCOUNTANT')
    )
      return
    if (tab === 'settings') {
      loadSettings()
      if (!tdsSlabs) {
        api.get('/api/v1/payroll/tds-slabs').then((res) => {
          if (res.data) setTdsSlabs(res.data)
        })
      }
    }
    if (tab === 'records') loadRecords()
  }, [user, tab, recYear, recMonth, selectedBranchId])

  // Phase 8b — load branches for the pill filter (and archived when toggled).
  useEffect(() => {
    if (isBranchAdmin) return
    const url = '/api/v1/branches' + (archivedExpanded && isOrgAdmin ? '?includeDeleted=true' : '')
    api.get(url).then((res) => {
      if (!res.data) return
      const all = res.data as { id: string; name: string; isMain?: boolean; deletedAt?: string | null }[]
      const active: BranchPill[] = []
      const archived: BranchPill[] = []
      for (const b of all) {
        const pill: BranchPill = { id: b.id, name: b.name, isMain: b.isMain }
        if (b.deletedAt) archived.push(pill)
        else active.push(pill)
      }
      setBranches(active)
      if (archivedExpanded) setArchivedBranches(archived)
    })
  }, [isBranchAdmin, isOrgAdmin, archivedExpanded])

  // Phase 10 — clear stale data on the manual-load tabs when the branch
  // filter changes, so a user toggling the branch pill doesn't see data
  // that no longer matches the selected scope. Records is auto-loaded so
  // it doesn't need this; only Annual and Multi-month load via a button.
  useEffect(() => {
    setAnnualData(null)
    setMultiMonthData(null)
  }, [selectedBranchId])

  // ── Warn before unload ──
  useEffect(() => {
    const handle = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handle)
    return () => window.removeEventListener('beforeunload', handle)
  }, [hasUnsavedChanges])

  // ── Ctrl+S shortcut ──
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (selectedUser && hasUnsavedChanges) saveSettings()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [selectedUser, hasUnsavedChanges, form])

  // ── API helpers ──

  const loadSettings = useCallback(async () => {
    const branchQ = selectedBranchId !== 'ALL' ? '?branchId=' + selectedBranchId : ''
    const res = await api.get('/api/v1/payroll/settings' + branchQ)
    if (res.data) {
      const d = res.data as any
      const employees: any[] = Array.isArray(d) ? d : d.employees || []
      setUsers(employees)
      const map: Record<string, any> = {}
      employees.forEach((emp) => {
        if (emp.paySettings) map[emp.id] = emp.paySettings
      })
      setAllPaySettings(map)
      setLastRefreshed(new Date())
    }
  }, [selectedBranchId])

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true)
    const branchQ = selectedBranchId !== 'ALL' ? '&branchId=' + selectedBranchId : ''
    const res = await api.get(`/api/v1/payroll/records?bsYear=${recYear}&bsMonth=${recMonth}${branchQ}`)
    if (res.data) {
      setRecords((res.data as any).records || [])
      setLastRefreshed(new Date())
    }
    setLoadingRecords(false)
  }, [recYear, recMonth, selectedBranchId])

  const loadAnnualData = async () => {
    setLoadingAnnual(true)
    const branchQ = selectedBranchId !== 'ALL' ? '&branchId=' + selectedBranchId : ''
    const res = await api.get(`/api/v1/payroll/annual-report?bsYear=${annualYear}${branchQ}`)
    if (res.data) setAnnualData(res.data)
    setLoadingAnnual(false)
    setLastRefreshed(new Date())
  }

  const loadMultiMonthData = async () => {
    setLoadingMultiMonth(true)
    const branchQ = selectedBranchId !== 'ALL' ? '&branchId=' + selectedBranchId : ''
    const res = await api.get(
      `/api/v1/payroll/multi-month?fromBsYear=${multiFromYear}&fromBsMonth=${multiFromMonth}&toBsYear=${multiToYear}&toBsMonth=${multiToMonth}${branchQ}`,
    )
    // Plan-gate errors are surfaced by the locked-tab upgrade panel, not a red
    // toast, so don't double-report them here.
    if (res.error && res.error.code !== 'FEATURE_NOT_AVAILABLE') setError(res.error.message)
    else if (res.data) setMultiMonthData(res.data)
    setLoadingMultiMonth(false)
  }

  const saveSettings = async () => {
    if (!selectedUser) {
      setError(isNp ? 'कर्मचारी छान्नुहोस्' : 'Select an employee')
      return
    }
    const pct =
      originalForm.basicSalary > 0 && form.basicSalary > 0
        ? Math.abs(((form.basicSalary - originalForm.basicSalary) / originalForm.basicSalary) * 100)
        : 0
    if (pct > 50) {
      const msg = isNp
        ? `आधारभूत तलबमा ${pct.toFixed(0)}% परिवर्तन। जारी राख्नुहुन्छ?`
        : `Basic salary changed by ${pct.toFixed(0)}%. Continue?`
      if (!confirm(msg)) return
    }
    setSaving(true)
    setError('')
    const res = await api.put(`/api/v1/payroll/settings/${selectedUser}`, form)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(isNp ? 'तलब सेटिङ सुरक्षित गरियो' : 'Pay settings saved')
      setOriginalForm({ ...form })
      loadSettings()
      setTimeout(() => setSuccess(''), 3000)
    }
    setSaving(false)
  }

  const generatePayroll = async (
    overtimeOverrides: Record<string, number> = {},
    reason?: string,
    sandwichPenaltyOverrides: Record<string, number> = {},
  ) => {
    setGenerating(true)
    setError('')
    const res = await api.post('/api/v1/payroll/generate', {
      bsYear: genYear,
      bsMonth: genMonth,
      overtimeOverrides: Object.keys(overtimeOverrides).length > 0 ? overtimeOverrides : undefined,
      sandwichPenaltyOverrides:
        Object.keys(sandwichPenaltyOverrides).length > 0 ? sandwichPenaltyOverrides : undefined,
      ...(reason ? { reason } : {}),
    })
    if (res.error) {
      setError(res.error.message)
    } else {
      setGenResult(res.data)
      setSuccess(isNp ? 'तलब गणना सफल' : 'Payroll generated successfully')
      setTimeout(() => setSuccess(''), 3000)
      setLastRefreshed(new Date())
      // Sync records tab to generated month so switching tabs shows correct data
      setRecYear(genYear)
      setRecMonth(genMonth)
    }
    setGenerating(false)
  }

  const bulkUpdateStatus = async (status: string) => {
    const res = await api.put('/api/v1/payroll/records/bulk-status', {
      bsYear: recYear,
      bsMonth: recMonth,
      status,
    })
    if (res.error) {
      setError(res.error.message)
      return
    }
    loadRecords()
    setSuccess(isNp ? 'स्थिति अपडेट गरियो' : 'Status updated')
    setTimeout(() => setSuccess(''), 3000)
  }

  const selectUser = (userId: string) => {
    if (hasUnsavedChanges) {
      if (
        !confirm(
          isNp
            ? 'असुरक्षित परिवर्तनहरू छन्। जारी राख्नुहुन्छ?'
            : 'You have unsaved changes. Continue?',
        )
      )
        return
    }
    setSelectedUser(userId)
    const existing = allPaySettings[userId]
    const newForm = existing ? paySettingsFromApi(existing) : { ...defaultSettings }
    setForm(newForm)
    setOriginalForm(newForm)
    // Seed the live-preview allowance total from cached settings; the editor
    // reports the authoritative list via onAllowancesChanged once it loads.
    setAllowanceTotal(activeRecurringAllowanceTotal(existing?.allowances ?? []))
  }

  const copyFromEmployee = (sourceId: string) => {
    const src = allPaySettings[sourceId]
    if (!src) return
    setForm(paySettingsFromApi(src))
    setShowCopyDropdown(false)
    setSuccess(isNp ? 'सेटिङहरू प्रतिलिपि गरियो' : 'Settings copied')
    setTimeout(() => setSuccess(''), 2000)
  }

  const handleTabChange = (newTab: Tab) => {
    if (hasUnsavedChanges && tab === 'settings') {
      if (
        !confirm(
          isNp
            ? 'असुरक्षित परिवर्तनहरू छन्। जारी राख्नुहुन्छ?'
            : 'You have unsaved changes. Continue?',
        )
      )
        return
    }
    setTab(newTab)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }
  if (!user) return null

  // Annual report and Multi-Month both call workflow-gated endpoints
  // (/annual-report, /multi-month), so they're locked when the plan lacks the
  // approval-workflow feature. Locked tabs stay visible and clickable — they
  // show an upgrade panel instead of firing a 403.
  const workflowLocked = !featurePayrollWorkflow && user.role !== 'SUPER_ADMIN'
  const tabDefs: { key: Tab; label: string; icon: React.ElementType; locked?: boolean }[] = [
    { key: 'settings', label: isNp ? 'तलब सेटिङ' : 'Pay settings', icon: Settings },
    { key: 'generate', label: isNp ? 'तलब गणना' : 'Generate payroll', icon: Play },
    { key: 'records', label: isNp ? 'तलब रेकर्ड' : 'Payroll records', icon: FileText },
    {
      key: 'annual',
      label: isNp ? 'वार्षिक विवरण' : 'Annual report',
      icon: CreditCard,
      locked: workflowLocked,
    },
    {
      key: 'multimonth',
      label: isNp ? 'बहु-महिना दृश्य' : 'Multi-Month',
      icon: BarChart3,
      locked: workflowLocked,
    },
  ]
  const isBusy = saving || generating || loadingRecords
  const Layout = isAccountant ? AccountantLayout : AdminLayout

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {isNp ? 'पेरोल व्यवस्थापन' : 'Payroll management'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isNp ? 'कर्मचारी तलब र कटौती व्यवस्थापन' : 'Manage employee salaries and deductions'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-slate-400">
                {isNp ? 'पछिल्लो अपडेट:' : 'Updated'}{' '}
                {lastRefreshed.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
            <button
              onClick={() => {
                if (tab === 'settings') loadSettings()
                if (tab === 'records') loadRecords()
              }}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
              {isNp ? 'रिफ्रेश' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Unsaved changes banner */}
        {hasUnsavedChanges && tab === 'settings' && (
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3.5">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-700">
                {isNp ? 'असुरक्षित परिवर्तनहरू छन्' : 'You have unsaved changes'}
              </span>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {isNp ? 'सुरक्षित गर्नुहोस्' : 'Save now'}
            </button>
          </div>
        )}

        {/* Error / success toasts */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3.5">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-medium text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200 pb-1">
          {tabDefs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              title={t.locked ? (isNp ? 'अपग्रेड आवश्यक' : 'Upgrade to unlock') : undefined}
              className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                t.locked
                  ? tab === t.key
                    ? 'text-amber-700'
                    : 'text-slate-400 hover:text-amber-700'
                  : tab === t.key
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.locked && <Lock className="h-3 w-3" />}
              {t.key === 'settings' && hasUnsavedChanges && (
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              )}
              {tab === t.key && (
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${t.locked ? 'bg-amber-500' : 'bg-slate-900'}`}
                />
              )}
            </button>
          ))}
        </div>

        {/* Phase 8b — branch filter. Active on all tabs as of Phase 10
            (Annual report endpoint was wired for branchId then). */}
        {isMultiBranch && !isBranchAdmin && (
          <BranchFilterPills
            branches={branches}
            selectedBranchId={selectedBranchId}
            onChange={setSelectedBranchId}
            showArchivedToggle={isOrgAdmin}
            archivedExpanded={archivedExpanded}
            onToggleArchived={setArchivedExpanded}
            archivedBranches={archivedBranches}
            isNp={isNp}
          />
        )}

        {/* Tab panels */}
        {tab === 'settings' && (
          <SettingsTab
            isNp={isNp}
            users={users}
            allPaySettings={allPaySettings}
            selectedUser={selectedUser}
            form={form}
            hasUnsavedChanges={hasUnsavedChanges}
            liveCalculation={liveCalculation}
            tdsSlabs={tdsSlabs}
            showTdsInfo={showTdsInfo}
            showCopyDropdown={showCopyDropdown}
            saving={saving}
            orgStatutory={{
              ssf: features.ssf,
              cit: features.cit,
              tds: features.tds,
            }}
            canEdit={!isAccountant}
            onSelectUser={selectUser}
            onFormChange={setForm}
            onSave={saveSettings}
            onCancel={() => setForm({ ...originalForm })}
            onCopyFrom={copyFromEmployee}
            onSetShowTdsInfo={setShowTdsInfo}
            onSetShowCopyDropdown={setShowCopyDropdown}
            onAllowancesChanged={(list: Allowance[]) =>
              setAllowanceTotal(activeRecurringAllowanceTotal(list))
            }
          />
        )}

        {tab === 'generate' && (
          <GenerateTab
            isNp={isNp}
            userRole={user?.role}
            genYear={genYear}
            genMonth={genMonth}
            generating={generating}
            genResult={genResult}
            sandwichLeaveEnabled={features.sandwichLeave}
            onSetYear={setGenYear}
            onSetMonth={setGenMonth}
            onGenerate={generatePayroll}
          />
        )}

        {tab === 'records' && (
          <RecordsTab
            language={language as any}
            userRole={user?.role}
            featurePayrollWorkflow={featurePayrollWorkflow}
            features={{ ssf: features.ssf, tds: features.tds }}
            recYear={recYear}
            recMonth={recMonth}
            records={records}
            loadingRecords={loadingRecords}
            onSetYear={(y) => {
              setRecYear(y)
            }}
            onSetMonth={(m) => {
              setRecMonth(m)
            }}
            onBulkStatus={bulkUpdateStatus}
            onViewPayslip={setSelectedPayslip}
          />
        )}

        {tab === 'annual' &&
          (workflowLocked ? (
            <FeatureLockScreen featureKey="payrollWorkflow" isNp={isNp} />
          ) : (
            <AnnualTab
              language={language as any}
              annualYear={annualYear}
              annualData={annualData}
              loadingAnnual={loadingAnnual}
              features={{ ssf: features.ssf, tds: features.tds }}
              onSetYear={setAnnualYear}
              onLoad={loadAnnualData}
            />
          ))}

        {tab === 'multimonth' &&
          (workflowLocked ? (
            <FeatureLockScreen featureKey="payrollWorkflow" isNp={isNp} />
          ) : (
            <MultiMonthTab
              language={language as any}
              multiFromYear={multiFromYear}
              multiFromMonth={multiFromMonth}
              multiToYear={multiToYear}
              multiToMonth={multiToMonth}
              multiMonthData={multiMonthData}
              loadingMultiMonth={loadingMultiMonth}
              expandedEmployee={expandedEmployee}
              onSetFromYear={setMultiFromYear}
              onSetFromMonth={setMultiFromMonth}
              onSetToYear={setMultiToYear}
              onSetToMonth={setMultiToMonth}
              onLoad={loadMultiMonthData}
              onToggleExpand={(id) => setExpandedEmployee((prev) => (prev === id ? null : id))}
            />
          ))}
      </div>

      {/* Payslip modal */}
      {selectedPayslip && (
        <PayslipModal
          record={selectedPayslip}
          language={language as any}
          onClose={() => setSelectedPayslip(null)}
          onError={setError}
        />
      )}
    </Layout>
  )
}
