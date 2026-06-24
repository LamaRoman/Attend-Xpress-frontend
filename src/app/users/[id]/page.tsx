'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import DocumentManager from '@/components/DocumentManager'
import { UpgradeStrip } from '@/components/FeatureLock'
import { adToBS, BS_MONTHS_NP, BS_MONTHS_EN, toNepaliDigits } from '@/components/BSDatePicker'
import { Allowance } from '@/app/payroll/types'
import { activeRecurringAllowanceTotal } from '@/app/payroll/utils'
import {
  ArrowLeft, Mail, Phone, Hash, Clock, Calendar, CheckCircle2, XCircle,
  Briefcase, FileText, User, AlertCircle, Cake, Banknote, CreditCard,
  Pencil, Save, X, DollarSign,
} from 'lucide-react'

// ── Interfaces ──────────────────────────────────────────────────────────────

interface UserData {
  id: string; email: string; firstName: string; lastName: string
  employeeId: string; phone?: string | null; role: string; isActive: boolean
  createdAt: string; shiftStartTime?: string | null; shiftEndTime?: string | null
  dateOfBirth?: string | null
}

interface BankDetails {
  bankName: string; bankAccountName: string; bankAccountNumber: string
}

interface SalaryDetails {
  basicSalary: number; overtimeRatePerHour: number
  ssfEnabled: boolean; employeeSsfRate: number; employerSsfRate: number
  citEnabled: boolean; citAmount: number; tdsEnabled: boolean
  isMarried: boolean; advanceDeduction: number
  allowances: Allowance[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, { en: string; np: string; color: string }> = {
  ORG_ADMIN:   { en: 'Admin',       np: 'प्रशासक',       color: 'bg-blue-50 text-blue-700'  },
  EMPLOYEE:    { en: 'Employee',    np: 'कर्मचारी',      color: 'bg-slate-100 text-slate-700'},
  SUPER_ADMIN: { en: 'Super Admin', np: 'सुपर प्रशासक',  color: 'bg-rose-50 text-rose-700'  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, isBs: boolean, isNp: boolean): string {
  const d = new Date(dateStr)
  if (isBs) {
    const bs = adToBS(d)
    const m = isNp ? BS_MONTHS_NP : BS_MONTHS_EN
    return isNp ? `${m[bs.month-1]} ${toNepaliDigits(bs.day)}, ${toNepaliDigits(bs.year)}`
                : `${m[bs.month-1]} ${bs.day}, ${bs.year}`
  }
  return d.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDOB(dateStr: string, isBs: boolean, isNp: boolean): string {
  const [y, mo, day] = dateStr.split('T')[0].split('-').map(Number)
  return formatDate(new Date(y, mo - 1, day).toISOString(), isBs, isNp)
}

function fmt(n: number) {
  return 'Rs. ' + n.toLocaleString('en-NP', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// ── Component ────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const router  = useRouter()
  const params  = useParams()
  const userId  = params.id as string
  const { user: currentUser, isLoading: authLoading, language, calendarMode, features } = useAuth()
  const isNp = language === 'NEPALI'
  const isBs = calendarMode === 'NEPALI'

  const [userData,      setUserData]      = useState<UserData | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'bank' | 'salary' | 'documents'>('profile')

  // Pay-settings (bank + salary share one fetch)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [bankDetails,  setBankDetails]  = useState<BankDetails>({ bankName: '', bankAccountName: '', bankAccountNumber: '' })
  const [bankForm,     setBankForm]     = useState<BankDetails>({ bankName: '', bankAccountName: '', bankAccountNumber: '' })
  const [editingBank,  setEditingBank]  = useState(false)
  const [savingBank,   setSavingBank]   = useState(false)
  const [bankError,    setBankError]    = useState('')
  const [bankSuccess,  setBankSuccess]  = useState('')
  const [salaryDetails, setSalaryDetails] = useState<SalaryDetails | null>(null)

  // ── Data loaders ─────────────────────────────────────────────────────────

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/v1/users')
      if (res.error) throw new Error(res.error.message)
      const found = (res.data as UserData[])?.find((u) => u.id === userId)
      if (!found) throw new Error('User not found')
      setUserData(found)
    } catch (err: any) {
      setError(err.message || 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchPaySettings = useCallback(async () => {
    setLoadingSettings(true)
    const res = await api.get('/api/v1/payroll/settings')
    if (res.data) {
      const employees = Array.isArray(res.data) ? res.data : (res.data as any).employees || []
      const emp = employees.find((e: any) => e.id === userId)
      const ps = emp?.paySettings
      if (ps) {
        const b: BankDetails = {
          bankName: ps.bankName || '',
          bankAccountName: ps.bankAccountName || '',
          bankAccountNumber: ps.bankAccountNumber || '',
        }
        setBankDetails(b)
        setBankForm(b)
        setSalaryDetails({
          basicSalary:         ps.basicSalary        ?? 0,
          overtimeRatePerHour: ps.overtimeRatePerHour ?? 0,
          ssfEnabled:          ps.ssfEnabled  ?? false,
          employeeSsfRate:     ps.employeeSsfRate ?? 11,
          employerSsfRate:     ps.employerSsfRate ?? 20,
          citEnabled:          ps.citEnabled  ?? false,
          citAmount:           ps.citAmount   ?? 0,
          tdsEnabled:          ps.tdsEnabled  ?? false,
          isMarried:           ps.isMarried   ?? false,
          advanceDeduction:    ps.advanceDeduction ?? 0,
          allowances:          (emp.allowances ?? []) as Allowance[],
        })
      }
    }
    setLoadingSettings(false)
  }, [userId])

  useEffect(() => {
    if (!authLoading && currentUser) {
      if (
        currentUser.role !== 'ORG_ADMIN' &&
        currentUser.role !== 'BRANCH_ADMIN' &&
        currentUser.role !== 'SUPER_ADMIN'
      ) { router.push('/'); return }
      fetchUser()
    }
  }, [authLoading, currentUser, fetchUser, router])

  useEffect(() => {
    if (activeTab === 'bank' || activeTab === 'salary') fetchPaySettings()
  }, [activeTab])

  const saveBank = async () => {
    setSavingBank(true); setBankError('')
    const res = await api.put(`/api/v1/payroll/bank/${userId}`, bankForm)
    setSavingBank(false)
    if (res.error) {
      setBankError(res.error.message)
    } else {
      setBankDetails({ ...bankForm })
      setEditingBank(false)
      setBankSuccess(isNp ? 'बैंक विवरण सुरक्षित गरियो' : 'Bank details saved')
      setTimeout(() => setBankSuccess(''), 3000)
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }

  if (error || !userData) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-4xl px-6 py-10">
          <button onClick={() => router.push('/users')}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" />
            {isNp ? 'प्रयोगकर्ताहरू' : 'Back to Users'}
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="h-5 w-5 text-rose-500" />
            <p className="text-sm text-rose-700">{error || 'User not found'}</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const roleInfo = ROLE_LABELS[userData.role] || ROLE_LABELS.EMPLOYEE
  const initials = `${userData.firstName?.[0] || ''}${userData.lastName?.[0] || ''}`.toUpperCase()
  const hasBankInfo = !!(bankDetails.bankName || bankDetails.bankAccountNumber)

  const tabs = [
    { key: 'profile'   as const, label: isNp ? 'प्रोफाइल'    : 'Profile',       icon: User       },
    { key: 'salary'    as const, label: isNp ? 'तलब विवरण'   : 'Salary',        icon: DollarSign },
    { key: 'bank'      as const, label: isNp ? 'बैंक विवरण'  : 'Bank details',  icon: Banknote   },
    { key: 'documents' as const, label: isNp ? 'कागजातहरू'   : 'Documents',     icon: FileText   },
  ]

  // ── Salary calculations ───────────────────────────────────────────────────

  const s = salaryDetails
  const gross = s ? s.basicSalary + activeRecurringAllowanceTotal(s.allowances) : 0
  const empSsf  = s?.ssfEnabled ? (s.basicSalary * s.employeeSsfRate) / 100 : 0
  const cit     = s?.citEnabled ? (s.citAmount ?? 0) : 0
  const advance = s?.advanceDeduction ?? 0
  const totalDed = empSsf + cit + advance
  const netEst   = gross - totalDed

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">

        {/* Back */}
        <button onClick={() => router.push('/users')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          {isNp ? 'प्रयोगकर्ताहरू' : 'Back to Users'}
        </button>

        {/* Header card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-900">
              <span className="text-lg font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-slate-900">
                {userData.firstName} {userData.lastName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {userData.employeeId && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    <Hash className="h-3 w-3" />{userData.employeeId}
                  </span>
                )}
                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${roleInfo.color}`}>
                  {isNp ? roleInfo.np : roleInfo.en}
                </span>
                {userData.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />{isNp ? 'सक्रिय' : 'Active'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                    <XCircle className="h-3 w-3" />{isNp ? 'निष्क्रिय' : 'Inactive'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`-mb-[1px] inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Profile ── */}
        {activeTab === 'profile' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InfoItem icon={<Mail className="h-4 w-4" />}      label={isNp ? 'इमेल' : 'Email'}        value={userData.email} />
              <InfoItem icon={<Phone className="h-4 w-4" />}     label={isNp ? 'फोन' : 'Phone'}         value={userData.phone || (isNp ? 'उपलब्ध छैन' : 'Not provided')} />
              <InfoItem icon={<Hash className="h-4 w-4" />}      label={isNp ? 'कर्मचारी आईडी' : 'Employee ID'} value={userData.employeeId || '—'} />
              <InfoItem icon={<Briefcase className="h-4 w-4" />} label={isNp ? 'भूमिका' : 'Role'}       value={isNp ? roleInfo.np : roleInfo.en} />
              <InfoItem icon={<Cake className="h-4 w-4" />}      label={isNp ? 'जन्म मिति' : 'Date of birth'}
                value={userData.dateOfBirth ? formatDOB(userData.dateOfBirth, isBs, isNp) : isNp ? 'उपलब्ध छैन' : 'Not provided'} />
              <InfoItem icon={<Clock className="h-4 w-4" />}     label={isNp ? 'शिफ्ट समय' : 'Shift time'}
                value={userData.shiftStartTime && userData.shiftEndTime
                  ? `${userData.shiftStartTime} – ${userData.shiftEndTime}`
                  : isNp ? 'संगठन पूर्वनिर्धारित' : 'Org default'} />
              <InfoItem icon={<Calendar className="h-4 w-4" />}  label={isNp ? 'सिर्जना मिति' : 'Joined'} value={formatDate(userData.createdAt, isBs, isNp)} />
            </div>
          </div>
        )}

        {/* ── Salary ── */}
        {activeTab === 'salary' && (
          <div className="space-y-4">
            {loadingSettings ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
              </div>
            ) : !salaryDetails || salaryDetails.basicSalary === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-14 text-center">
                <DollarSign className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  {isNp ? 'तलब सेटिङ छैन' : 'No salary settings configured'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {isNp ? 'Payroll पृष्ठमा गई तलब सेटिङ गर्नुहोस्' : 'Configure salary in the Payroll page'}
                </p>
              </div>
            ) : (
              <>
                {/* Summary bar */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: isNp ? 'कुल आम्दानी' : 'Gross salary', value: fmt(gross),    cls: 'bg-slate-900 text-white' },
                    { label: isNp ? 'कुल कटौती'   : 'Deductions',   value: fmt(totalDed), cls: 'bg-rose-50 text-rose-700 border border-rose-100' },
                    { label: isNp ? 'खुद तलब'     : 'Net estimate', value: fmt(netEst),   cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className={`rounded-xl p-4 text-center ${cls}`}>
                      <p className="text-[11px] font-medium opacity-70">{label}</p>
                      <p className="mt-1 text-base font-bold">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Earnings breakdown */}
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {isNp ? 'आमदानी' : 'Earnings'}
                  </h3>
                  <div className="divide-y divide-slate-50">
                    <SalaryRow label={isNp ? 'आधारभूत तलब' : 'Basic salary'} value={fmt(s!.basicSalary)} />
                    {s!.allowances.map((a) => (
                      <SalaryRow
                        key={a.id}
                        label={
                          a.type === 'ONE_TIME'
                            ? `${a.label} (${isNp ? 'एक पटक' : 'one-time'})`
                            : a.label
                        }
                        value={fmt(a.amount)}
                        dim={a.type === 'ONE_TIME'}
                      />
                    ))}
                    <SalaryRow label={isNp ? 'कुल आमदानी' : 'Gross total'} value={fmt(gross)} bold />
                  </div>
                  {s!.overtimeRatePerHour > 0 && (
                    <p className="mt-2 text-xs text-slate-400">
                      {isNp ? 'ओभरटाइम दर:' : 'Overtime rate:'} {fmt(s!.overtimeRatePerHour)}/hr
                    </p>
                  )}
                </div>

                {/* Deductions breakdown */}
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {isNp ? 'कटौती' : 'Deductions'}
                  </h3>
                  {empSsf === 0 && cit === 0 && advance === 0 && !s!.tdsEnabled ? (
                    <p className="text-xs text-slate-400">{isNp ? 'कुनै कटौती छैन' : 'No deductions configured'}</p>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {s!.ssfEnabled && <SalaryRow label={`SSF (${isNp ? 'कर्मचारी' : 'Employee'} ${s!.employeeSsfRate}%)`} value={fmt(empSsf)} />}
                      {s!.ssfEnabled && <SalaryRow label={`SSF (${isNp ? 'रोजगारदाता' : 'Employer'} ${s!.employerSsfRate}%)`} value={fmt((s!.basicSalary * s!.employerSsfRate) / 100)} dim />}
                      {s!.citEnabled && cit > 0 && <SalaryRow label="CIT" value={fmt(cit)} />}
                      {s!.tdsEnabled && <SalaryRow label="TDS" value={isNp ? 'आयमा आधारित' : 'Income-based'} />}
                      {advance > 0   && <SalaryRow label={isNp ? 'पेशगी कटौती' : 'Advance deduction'} value={fmt(advance)} />}
                    </div>
                  )}
                </div>

                {/* Other info */}
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {isNp ? 'अन्य' : 'Other'}
                  </h3>
                  <div className="divide-y divide-slate-50">
                    <SalaryRow label={isNp ? 'वैवाहिक स्थिति' : 'Marital status'} value={s!.isMarried ? (isNp ? 'विवाहित' : 'Married') : (isNp ? 'अविवाहित' : 'Unmarried')} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Bank details ── */}
        {activeTab === 'bank' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                  <CreditCard className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{isNp ? 'बैंक विवरण' : 'Bank details'}</h2>
                  <p className="text-xs text-slate-500">{isNp ? 'तलब जम्मा गर्ने खाता' : 'Salary disbursement account'}</p>
                </div>
              </div>
              {!editingBank && (
                <button
                  onClick={() => { setBankForm({ ...bankDetails }); setEditingBank(true); setBankError('') }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <Pencil className="h-3.5 w-3.5" />{isNp ? 'सम्पादन' : 'Edit'}
                </button>
              )}
            </div>

            {bankSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">{bankSuccess}</span>
              </div>
            )}

            {loadingSettings ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
              </div>
            ) : editingBank ? (
              <div className="space-y-4">
                {[
                  { key: 'bankName',          label: isNp ? 'बैंकको नाम'        : 'Bank name',           ph: 'e.g. Nepal Investment Bank' },
                  { key: 'bankAccountName',   label: isNp ? 'खाताधारकको नाम'   : 'Account holder name', ph: 'Full name on account' },
                  { key: 'bankAccountNumber', label: isNp ? 'खाता नम्बर'       : 'Account number',      ph: 'Account number' },
                ].map(({ key, label, ph }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">{label}</label>
                    <input
                      type="text"
                      value={(bankForm as any)[key]}
                      onChange={(e) => setBankForm({ ...bankForm, [key]: e.target.value })}
                      placeholder={ph}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                ))}
                {bankError && (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span className="text-xs text-rose-700">{bankError}</span>
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setEditingBank(false); setBankError('') }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    <X className="h-3.5 w-3.5" />{isNp ? 'रद्द' : 'Cancel'}
                  </button>
                  <button onClick={saveBank} disabled={savingBank}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                    <Save className="h-3.5 w-3.5" />
                    {savingBank ? (isNp ? 'सेभ...' : 'Saving...') : isNp ? 'सेभ' : 'Save'}
                  </button>
                </div>
              </div>
            ) : hasBankInfo ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <BankInfoItem label={isNp ? 'बैंकको नाम' : 'Bank'}             value={bankDetails.bankName        || '—'} />
                <BankInfoItem label={isNp ? 'खाताधारक'  : 'Account holder'}   value={bankDetails.bankAccountName  || '—'} />
                <BankInfoItem label={isNp ? 'खाता नम्बर' : 'Account number'}  value={bankDetails.bankAccountNumber || '—'} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
                <CreditCard className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">{isNp ? 'बैंक विवरण थपिएको छैन' : 'No bank details added yet'}</p>
                <p className="mt-1 text-xs text-slate-400">{isNp ? 'तलब जम्मा गर्न बैंक खाता थप्नुहोस्' : 'Add a bank account for salary disbursement'}</p>
                <button onClick={() => { setBankForm({ bankName: '', bankAccountName: '', bankAccountNumber: '' }); setEditingBank(true) }}
                  className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                  {isNp ? 'बैंक विवरण थप्नुहोस्' : 'Add bank details'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Documents — plan-gated ── */}
        {activeTab === 'documents' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            {features.documentUpload ? (
              <DocumentManager userId={userId} language={language} />
            ) : (
              <UpgradeStrip featureKey="documentUpload" isNp={language === 'NEPALI'} />
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ── Small reusable components ────────────────────────────────────────────────

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50/70 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400">{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function BankInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function SalaryRow({ label, value, bold, dim }: { label: string; value: string; bold?: boolean; dim?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${dim ? 'opacity-50' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-slate-900' : dim ? 'text-slate-400' : 'text-slate-700'}`}>{value}</span>
    </div>
  )
}
