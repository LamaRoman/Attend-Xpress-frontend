'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import AccountantLayout from '@/components/AccountantLayout'
import PoweredBy from '@/components/PoweredBy'
import { BranchFilterPills, type BranchPill } from '@/components/BranchFilterPills'
import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Plus,
  ArrowLeft,
  LogOut,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react'
import { toNepaliDigits } from '@/components/BSDatePicker'

import { LeaveRequest } from './types'
import LeaveList from './components/LeaveList'
import LeaveFilters from './components/LeaveFilters'
import RequestLeaveModal from './components/RequestLeaveModal'

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300">
    <div className="mb-4 flex items-start justify-between">
      <div className={`rounded-lg p-2.5 bg-${color.split('-')[1]}-50`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </div>
    <div>
      <div className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="text-xs font-medium text-slate-500">{title}</div>
      {subtitle && <div className="mt-1 text-[11px] text-slate-400">{subtitle}</div>}
    </div>
  </div>
)

export default function LeavePage() {
  const { user, isLoading, logout, isAnyAdmin, isAccountant, calendarMode, language } =
    useAuth()
  const router = useRouter()
  const isNepali = language === 'NEPALI'
  const isNepaliCalendar = calendarMode === 'NEPALI'
  const isStaff = isAnyAdmin || isAccountant

  // ── Core state ───────────────────────────────────────────────────────────────
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([])
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // ── Request leave modal ───────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'SICK',
  })

  // ── Rejection modal ───────────────────────────────────────────────────────────
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null)
  const [rejectMessage, setRejectMessage] = useState('')

  // ── Filters ───────────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>(
    'ALL',
  )
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filterBsYear, setFilterBsYear] = useState<string>('')
  const [filterBsMonth, setFilterBsMonth] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Phase 8b — branch filter state. Mirrors Reports / Roster wiring.
  const [branches, setBranches] = useState<BranchPill[]>([])
  const [archivedBranches, setArchivedBranches] = useState<BranchPill[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<'ALL' | string>('ALL')
  const [archivedExpanded, setArchivedExpanded] = useState(false)
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN'
  const isOrgAdmin = user?.role === 'ORG_ADMIN'
  const isMultiBranch = branches.length > 1

  // ── Debounce search ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Phase 8b — load branches for the pill filter (and archived when toggled).
  useEffect(() => {
    if (!isStaff || isBranchAdmin) return
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
  }, [isStaff, isBranchAdmin, isOrgAdmin, archivedExpanded])

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    !!searchDebounced ||
    !!filterBsYear ||
    !!filterBsMonth

  const clearAllFilters = () => {
    setStatusFilter('ALL')
    setTypeFilter('ALL')
    setSearchQuery('')
    setSearchDebounced('')
    setFilterBsYear('')
    setFilterBsMonth('')
  }

  // Default tab for staff
  useEffect(() => {
    if (!isLoading && user && isStaff) setActiveTab('all')
  }, [user, isLoading, isStaff])

  // ── Loaders ───────────────────────────────────────────────────────────────────
  const loadMyLeaves = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/api/v1/leaves/my?limit=50')
    if (res.data) {
      setMyLeaves((res.data as any).leaves)
      setLastRefreshed(new Date())
    }
    setLoading(false)
  }, [])

  const loadAllLeaves = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (typeFilter !== 'ALL') params.set('type', typeFilter)
    if (searchDebounced) params.set('search', searchDebounced)
    if (filterBsYear) params.set('bsYear', filterBsYear)
    if (filterBsMonth) params.set('bsMonth', filterBsMonth)
    if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId)

    const res = await api.get(`/api/v1/leaves?${params.toString()}`)
    if (res.data) {
      setLeaves((res.data as any).leaves)
      setLastRefreshed(new Date())
    }
    setLoading(false)
  }, [statusFilter, typeFilter, searchDebounced, filterBsYear, filterBsMonth, selectedBranchId])

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const checkRes = await api.get(
        isStaff ? '/api/v1/leaves?limit=1' : '/api/v1/leaves/my?limit=1',
      )
      if (
        checkRes.error?.code === 'FEATURE_NOT_AVAILABLE' ||
        checkRes.error?.code === 'NO_SUBSCRIPTION' ||
        checkRes.error?.code === 'SUBSCRIPTION_INACTIVE'
      )
        return
      if (isStaff) loadAllLeaves()
      else loadMyLeaves()
    })()
  }, [user, isStaff, loadAllLeaves, loadMyLeaves])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      setError(isNepali ? 'कृपया सबै फिल्ड भर्नुहोस्' : 'Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    const res = await api.post('/api/v1/leaves', formData)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(
        isNepali ? 'बिदा अनुरोध सफलतापूर्वक पेश गरियो' : 'Leave request submitted successfully',
      )
      setShowModal(false)
      setFormData({ startDate: '', endDate: '', reason: '', type: 'SICK' })
      if (isStaff) loadAllLeaves()
      else loadMyLeaves()
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoading(false)
  }

  const handleCancel = async (leaveId: string) => {
    if (
      !confirm(
        isNepali ? 'के तपाईं यो बिदा अनुरोध रद्द गर्न चाहनुहुन्छ?' : 'Cancel this leave request?',
      )
    )
      return
    const res = await api.delete(`/api/v1/leaves/${leaveId}`)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(isNepali ? 'बिदा अनुरोध रद्द गरियो' : 'Leave request cancelled')
      if (isStaff) loadAllLeaves()
      else loadMyLeaves()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const handleStatusUpdate = async (
    leaveId: string,
    status: 'APPROVED' | 'REJECTED',
    message?: string,
  ) => {
    const res = await api.put(`/api/v1/leaves/${leaveId}/status`, {
      status,
      ...(message ? { rejectionMessage: message } : {}),
    })
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(
        isNepali
          ? `बिदा ${status === 'APPROVED' ? 'स्वीकृत' : 'अस्वीकृत'} गरियो`
          : `Leave ${status.toLowerCase()} successfully`,
      )
      loadAllLeaves()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }
  if (!user) return null

  const sourceLeaves = activeTab === 'my' ? myLeaves : leaves
  const pendingCount = sourceLeaves.filter((l) => l.status === 'PENDING').length
  const approvedCount = sourceLeaves.filter((l) => l.status === 'APPROVED').length
  const rejectedCount = sourceLeaves.filter((l) => l.status === 'REJECTED').length
  const totalDaysUsed = myLeaves
    .filter((l) => l.status === 'APPROVED')
    .reduce((s, l) => s + l.durationDays, 0)
  const displayLeaves = activeTab === 'my' ? myLeaves : leaves

  // ── Page content ──────────────────────────────────────────────────────────────
  const pageContent = (
    <div className={isStaff ? '' : 'flex min-h-screen flex-col bg-white'}>
      {/* ── Employee header ── */}
      {!isStaff && (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/employee')}
                  className="rounded-lg p-2 transition-colors hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4 text-slate-600" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-900 p-2">
                    <CalendarDays className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-sm font-semibold text-slate-900">
                      {isNepali ? 'बिदा व्यवस्थापन' : 'Leave management'}
                    </h1>
                    <p className="text-xs text-slate-500">
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {lastRefreshed && (
                  <span className="text-xs text-slate-400">
                    {lastRefreshed.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                )}
                <button
                  onClick={loadMyLeaves}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  {isNepali ? 'रिफ्रेश' : 'Refresh'}
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isNepali ? 'बिदा माग्नुहोस्' : 'Request leave'}
                </button>
                <button
                  onClick={logout}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Admin/accountant page title ── */}
        {isStaff && (
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {isNepali ? 'बिदा व्यवस्थापन' : 'Leave management'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {isNepali ? 'कर्मचारीहरूका बिदा अनुरोधहरू' : 'Employee leave requests'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefreshed && (
                <span className="text-xs text-slate-400">
                  {lastRefreshed.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              )}
              <button
                onClick={() => loadAllLeaves()}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {isNepali ? 'रिफ्रेश' : 'Refresh'}
              </button>
            </div>
          </div>
        )}

        {/* ── Alerts ── */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3.5">
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
          <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            title={isNepali ? 'विचाराधीन' : 'Pending'}
            value={pendingCount}
            icon={Clock}
            color="text-amber-600"
          />
          <StatCard
            title={isNepali ? 'स्वीकृत' : 'Approved'}
            value={approvedCount}
            icon={CheckCircle}
            color="text-emerald-600"
          />
          <StatCard
            title={isNepali ? 'अस्वीकृत' : 'Rejected'}
            value={rejectedCount}
            icon={XCircle}
            color="text-rose-600"
          />
          {!isStaff && (
            <StatCard
              title={isNepali ? 'प्रयोग भएका दिन' : 'Days used'}
              value={isNepali ? toNepaliDigits(totalDaysUsed) : totalDaysUsed}
              icon={Calendar}
              color="text-slate-900"
              subtitle={isNepali ? 'स्वीकृत बिदाहरू' : 'Approved leaves'}
            />
          )}
        </div>

        {/* ── Admin/accountant tabs ── */}
        {isStaff && (
          <div className="mb-6 space-y-4">
            {/* Tab bar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {isNepali ? 'सबै अनुरोधहरू' : 'All requests'}
                  {leaves.filter((l) => l.status === 'PENDING').length > 0 && (
                    <span className="ml-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                      {leaves.filter((l) => l.status === 'PENDING').length}
                    </span>
                  )}
                </button>
              </div>

              {/* Filters toggle — all requests tab only */}
              {activeTab === 'all' && (
                <>
                  <LeaveFilters
                    isNepali={isNepali}
                    statusFilter={statusFilter}
                    typeFilter={typeFilter}
                    searchQuery={searchQuery}
                    filterBsYear={filterBsYear}
                    filterBsMonth={filterBsMonth}
                    hasActiveFilters={hasActiveFilters}
                    showFilters={showFilters}
                    onStatusChange={setStatusFilter as any}
                    onTypeChange={setTypeFilter}
                    onSearchChange={setSearchQuery}
                    onBsYearChange={setFilterBsYear}
                    onBsMonthChange={setFilterBsMonth}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    onClearAll={clearAllFilters}
                  />
                  {/* Phase 8b — branch filter (multi-branch orgs only, never for BRANCH_ADMIN). */}
                  {isMultiBranch && !isBranchAdmin && (
                    <BranchFilterPills
                      branches={branches}
                      selectedBranchId={selectedBranchId}
                      onChange={setSelectedBranchId}
                      showArchivedToggle={isOrgAdmin}
                      archivedExpanded={archivedExpanded}
                      onToggleArchived={setArchivedExpanded}
                      archivedBranches={archivedBranches}
                      isNp={isNepali}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Leave list ── */}
        <LeaveList
          leaves={displayLeaves}
          activeTab={activeTab}
          isAdmin={!!isAnyAdmin}
          isStaff={isStaff}
          isNepali={isNepali}
          isNepaliCalendar={isNepaliCalendar}
          hasActiveFilters={hasActiveFilters}
          onCancel={handleCancel}
          onApprove={(id) => handleStatusUpdate(id, 'APPROVED')}
          onStartReject={(id) => {
            setRejectingLeaveId(id)
            setRejectMessage('')
          }}
          onClearFilters={clearAllFilters}
          onRequestLeave={() => setShowModal(true)}
        />
      </div>

      {!isStaff && <PoweredBy />}

      {/* ── Rejection modal ── */}
      {rejectingLeaveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">
              {isNepali ? 'बिदा अस्वीकार गर्नुहोस्' : 'Reject Leave'}
            </h3>
            <textarea
              value={rejectMessage}
              onChange={(e) => setRejectMessage(e.target.value)}
              placeholder={isNepali ? 'कारण (वैकल्पिक)...' : 'Reason for rejection (optional)...'}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectingLeaveId(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {isNepali ? 'रद्द गर्नुहोस्' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  handleStatusUpdate(rejectingLeaveId, 'REJECTED', rejectMessage || undefined)
                  setRejectingLeaveId(null)
                }}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-xs font-medium text-white transition-colors hover:bg-rose-700"
              >
                {isNepali ? 'अस्वीकार गर्नुहोस्' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request leave modal ── */}
      {showModal && !isStaff && (
        <RequestLeaveModal
          isNepali={isNepali}
          isNepaliCalendar={isNepaliCalendar}
          formData={formData}
          loading={loading}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )

  if (isAnyAdmin) return <AdminLayout>{pageContent}</AdminLayout>
  if (isAccountant) return <AccountantLayout>{pageContent}</AccountantLayout>
  return pageContent
}
