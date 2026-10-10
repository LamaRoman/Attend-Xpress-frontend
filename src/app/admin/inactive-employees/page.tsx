'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import AdminLayout from '@/components/AdminLayout'
import { api } from '@/lib/api'
import {
  ArrowLeft,
  AlertTriangle,
  Trash2,
  Users,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react'

interface InactiveEmployee {
  membershipId: string
  userId: string
  firstName: string
  lastName: string
  employeeId: string | null
  lastClockIn: string | null
  daysSinceLastClockIn: number
}

export default function InactiveEmployeesPage() {
  const { user, isLoading: authLoading, refreshUser, language } = useAuth()
  const router = useRouter()
  const [employees, setEmployees] = useState<InactiveEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const isNp = language === 'NEPALI'

  const loadInactive = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/api/v1/org-settings/inactive-employees')
    if (res.data) {
      const d = res.data as { employees: InactiveEmployee[] }
      setEmployees(d.employees || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user) loadInactive()
  }, [user, loadInactive])

  const removeEmployee = async (emp: InactiveEmployee) => {
    const name = emp.firstName + ' ' + emp.lastName
    if (!confirm(
      isNp
        ? `"${name}" लाई संगठनबाट स्थायी रूपमा हटाउने? तलब रेकर्डहरू सुरक्षित रहनेछन् तर अन्य सबै डाटा मेटिनेछ।`
        : `Permanently remove "${name}" from organization? Payroll records will be preserved but all other data will be deleted.`
    )) return

    setRemoving(emp.userId)
    const res = await api.delete('/api/v1/users/' + emp.userId)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(isNp ? `${name} हटाइयो` : `${name} removed`)
      await loadInactive()
      await refreshUser()
      setTimeout(() => setSuccess(''), 3000)
    }
    setRemoving(null)
  }

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
        </div>
      </AdminLayout>
    )
  }

  if (!user) return null

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {isNp ? 'निष्क्रिय कर्मचारीहरू' : 'Inactive Employees'}
          </h1>
          <p className="text-xs text-slate-500">
            {isNp
              ? '१४+ दिनदेखि उपस्थित नभएका कर्मचारीहरू'
              : 'Employees who have not clocked in for 14+ days'}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span className="text-xs font-medium text-rose-700">{error}</span>
          </div>
          <button onClick={() => setError('')}><X className="h-3.5 w-3.5 text-rose-400" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">{success}</span>
        </div>
      )}

      {/* Warning banner */}
      {!loading && employees.length > 0 && (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {isNp ? 'कारबाही आवश्यक छ' : 'Action Required'}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              {isNp
                ? 'तलका कर्मचारीहरूले १४+ दिनदेखि उपस्थिति जनाएका छैनन्। यो समस्या समाधान नभएसम्म उपस्थिति व्यवस्थापन सुविधाहरू प्रतिबन्धित छन्। निष्क्रिय कर्मचारीहरू हटाउनुहोस् वा तिनीहरूलाई उपस्थिति जनाउन लगाउनुहोस्।'
                : 'The employees below have not clocked in for 14+ days. Attendance management features are restricted until this is resolved. Remove inactive employees or have them clock in.'}
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Employee list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-16 text-center">
          <CheckCircle className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-800">
            {isNp ? 'सबै कर्मचारीहरू सक्रिय छन्' : 'All employees are active'}
          </p>
          <p className="mt-1 text-xs text-emerald-600">
            {isNp ? 'कुनै निष्क्रिय कर्मचारी छैन' : 'No inactive employees found'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
            <div className="col-span-4 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {isNp ? 'कर्मचारी' : 'Employee'}
            </div>
            <div className="col-span-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {isNp ? 'कर्मचारी ID' : 'Employee ID'}
            </div>
            <div className="col-span-3 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {isNp ? 'अन्तिम उपस्थिति' : 'Last Clock-in'}
            </div>
            <div className="col-span-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {isNp ? 'दिन' : 'Days'}
            </div>
            <div className="col-span-2" />
          </div>

          <div className="divide-y divide-slate-100">
            {employees.map((emp) => (
              <div key={emp.membershipId} className="grid grid-cols-12 items-center gap-4 px-5 py-3.5">
                <div className="col-span-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{emp.firstName} {emp.lastName}</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-600">{emp.employeeId || '—'}</span>
                </div>
                <div className="col-span-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs text-slate-600">
                      {emp.lastClockIn
                        ? new Date(emp.lastClockIn).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })
                        : isNp ? 'कहिल्यै उपस्थित भएको छैन' : 'Never clocked in'}
                    </span>
                  </div>
                </div>
                <div className="col-span-1">
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                    {emp.daysSinceLastClockIn}d
                  </span>
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => removeEmployee(emp)}
                    disabled={removing === emp.userId}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
                  >
                    {removing === emp.userId ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {isNp ? 'हटाउनुहोस्' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info footer */}
      {employees.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-xs text-slate-500">
              {isNp
                ? 'कर्मचारी हटाउँदा तलब रेकर्डहरू सुरक्षित रहनेछन्। अन्य सबै डाटा (उपस्थिति, बिदा, सेटिङ्स) स्थायी रूपमा मेटिनेछ।'
                : 'Removing an employee preserves their payroll records. All other data (attendance, leaves, settings) will be permanently deleted.'}
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
