'use client'
import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import { adToBS, BS_MONTHS_NP, BS_MONTHS_EN, toNepaliDigits } from '@/components/BSDatePicker'
import DateRangePicker from '@/components/DateRangePicker'
import { Clock, RefreshCw, X, AlertCircle, CheckCircle, Save, UserPlus, Lock, ChevronDown, ChevronRight as ChevronRightIcon, ChevronLeft, Search } from 'lucide-react'

interface AttendanceRecord {
  id: string
  checkInTime: string
  checkOutTime: string | null
  duration: number | null
  status: string
  isActive: boolean
  isManualEntry?: boolean
  modifiedBy?: string | null
  modificationNote?: string | null
  originalCheckIn?: string | null
  originalCheckOut?: string | null
  user: { id?: string; firstName: string; lastName: string; employeeId: string }
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
  employeeId: string
}

const STATUS_COLORS: Record<string, string> = {
  CHECKED_IN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CHECKED_OUT: 'bg-sky-100 text-sky-700 border-sky-200',
  AUTO_CLOSED: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default function AdminAttendancePage() {
  const { user, isLoading, language, features, calendarMode } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'
  const isBs = calendarMode === 'NEPALI'

  // Role flags
  const isAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'BRANCH_ADMIN'
  const isAccountant = user?.role === 'ORG_ACCOUNTANT'

  // ORG_ADMIN with manualCorrection feature: full edit + mark present
  const canManualCorrect = isAdmin && features?.manualCorrection
  // Accountant can edit checkOutTime on AUTO_CLOSED records only (no feature flag needed)
  const canEditAutoClose = isAccountant

  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [pagination, setPagination] = useState({ total: 0, hasMore: false })
  const [currentPage, setCurrentPage] = useState(1)
  const currentPageRef = useRef(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filterSearch, setFilterSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null)
  const [editForm, setEditForm] = useState({ checkInTime: '', checkOutTime: '', note: '' })
  const [editSaving, setEditSaving] = useState(false)

  const [showMarkPresent, setShowMarkPresent] = useState(false)
  const [employees, setEmployees] = useState<UserOption[]>([])
  const [markForm, setMarkForm] = useState({
    userId: '',
    date: '',
    checkInTime: '',
    checkOutTime: '',
    note: '',
  })
  const [markSaving, setMarkSaving] = useState(false)

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

  const loadRecords = useCallback(async (page: number) => {
    currentPageRef.current = page
    setCurrentPage(page)
    setLoading(true)
    const offset = (page - 1) * pageSize
    let url = `/api/v1/attendance?startDate=${dateFrom}&endDate=${dateTo}&limit=${pageSize}&offset=${offset}`
    if (sortCol)     url += `&sortBy=${sortCol}&sortOrder=${sortDir}`
    if (filterStatus) url += `&status=${filterStatus}`
    const res = await api.get(url)
    if (res.data) {
      const d = res.data as { records: AttendanceRecord[]; pagination: { total: number; hasMore: boolean } }
      setRecords(d.records)
      setPagination({ total: d.pagination.total, hasMore: d.pagination.hasMore })
      setLastRefreshed(new Date())
    }
    setLoading(false)
  }, [dateFrom, dateTo, pageSize, sortCol, sortDir, filterStatus])

  const loadEmployees = useCallback(async () => {
    const res = await api.get('/api/v1/users')
    if (res.data && Array.isArray(res.data)) {
      setEmployees((res.data as any[]).filter((u) => u.role === 'EMPLOYEE' && u.isActive))
    }
  }, [])

  useEffect(() => {
    if (
      user?.role === 'ORG_ADMIN' ||
      user?.role === 'BRANCH_ADMIN' ||
      user?.role === 'ORG_ACCOUNTANT'
    ) {
      loadRecords(1)
      if (isAdmin) loadEmployees()
    }
  }, [user, loadRecords, loadEmployees, isAdmin])

  // Auto-refresh every 30 seconds — only in single-date mode
  useEffect(() => {
    if (
      !user ||
      (user.role !== 'ORG_ADMIN' && user.role !== 'BRANCH_ADMIN' && user.role !== 'ORG_ACCOUNTANT')
    )
      return
    const interval = setInterval(() => loadRecords(currentPageRef.current), 30000)
    return () => clearInterval(interval)
  }, [user, loadRecords])

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return isNp ? `${h} घण्टा ${m} मि` : `${h}h ${m}m`
  }

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isBs) {
      const bs = adToBS(d)
      return isNp
        ? `${BS_MONTHS_NP[bs.month - 1]} ${toNepaliDigits(bs.day)}`
        : `${BS_MONTHS_EN[bs.month - 1]} ${bs.day}`
    }
    return d.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', { month: 'short', day: 'numeric' })
  }

  const toLocalDatetimeStr = (dateStr: string) => {
    const d = new Date(dateStr)
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
  }

  // Determine if a record is editable by the current user
  const canEditRecord = (record: AttendanceRecord): boolean => {
    if (canManualCorrect) return true
    if (canEditAutoClose && record.status === 'AUTO_CLOSED') return true
    return false
  }

  // ── Consolidate same-day clock-ins (Feature: multiple sessions per day) ──
  // Group attendance records by (user + date) so multi-clock-in days show as
  // one summary row by default, with a chevron to expand into the individual
  // sessions.  Within each group, sessions are sorted ascending by check-in
  // so "first check-in" and "last check-out" map directly to the day's start
  // and end.
  interface SessionGroup {
    key: string
    user: AttendanceRecord['user']
    date: string  // ISO date (YYYY-MM-DD)
    firstCheckIn: string
    lastCheckOut: string | null
    totalDuration: number
    hasOpen: boolean
    statuses: Set<string>
    sessions: AttendanceRecord[]
  }
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const groupedRecords: SessionGroup[] = (() => {
    const map = new Map<string, AttendanceRecord[]>()
    for (const r of records) {
      const date = r.checkInTime.split('T')[0]
      const uid = r.user.id ?? `${r.user.firstName}-${r.user.lastName}-${r.user.employeeId}`
      const key = `${uid}|${date}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries()).map(([key, sessions]) => {
      // Sort sessions ascending by check-in so summary fields reflect the
      // day's actual first/last clock-in/-out.
      const sorted = [...sessions].sort(
        (a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime()
      )
      const totalDuration = sorted.reduce((s, r) => s + (r.duration ?? 0), 0)
      const hasOpen = sorted.some((r) => !r.checkOutTime)
      const lastCheckOut = hasOpen
        ? null
        : sorted.reduce<string | null>((latest, r) => {
            if (!r.checkOutTime) return latest
            if (!latest) return r.checkOutTime
            return new Date(r.checkOutTime).getTime() > new Date(latest).getTime()
              ? r.checkOutTime
              : latest
          }, null)
      return {
        key,
        user: sorted[0].user,
        date: sorted[0].checkInTime.split('T')[0],
        firstCheckIn: sorted[0].checkInTime,
        lastCheckOut,
        totalDuration,
        hasOpen,
        statuses: new Set(sorted.map((r) => r.status)),
        sessions: sorted,
      }
    })
  })()

  const getSummaryStatus = (g: SessionGroup) =>
    g.hasOpen
      ? 'CHECKED_IN'
      : g.statuses.has('AUTO_CLOSED')
        ? 'AUTO_CLOSED'
        : 'CHECKED_OUT'

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // Sorting and status filtering are server-side; only name search stays client-side
  const filteredGroups = filterSearch
    ? groupedRecords.filter((g) => {
        const q = filterSearch.toLowerCase()
        const fullName = `${g.user.firstName} ${g.user.lastName}`.toLowerCase()
        return fullName.includes(q) || g.user.employeeId.toLowerCase().includes(q)
      })
    : groupedRecords

  const openEdit = (record: AttendanceRecord) => {
    setEditRecord(record)
    setEditForm({
      checkInTime: toLocalDatetimeStr(record.checkInTime),
      checkOutTime: record.checkOutTime ? toLocalDatetimeStr(record.checkOutTime) : '',
      note: '',
    })
    setError('')
  }

  const submitEdit = async () => {
    if (!editRecord) return
    if (!editForm.note || editForm.note.length < 3) {
      setError(isNp ? 'कारण आवश्यक छ (कम्तिमा ३ अक्षर)' : 'Reason is required (min 3 characters)')
      return
    }
    setEditSaving(true)
    const body: any = { note: editForm.note }
    // Accountants can only send checkOutTime — checkInTime is hidden for them
    if (isAdmin && editForm.checkInTime) {
      body.checkInTime = new Date(editForm.checkInTime).toISOString()
    }
    if (editForm.checkOutTime) {
      body.checkOutTime = new Date(editForm.checkOutTime).toISOString()
    }
    const res = await api.put('/api/v1/attendance/' + editRecord.id + '/edit', body)
    setEditSaving(false)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(isNp ? 'रेकर्ड अपडेट भयो' : 'Record updated')
      setEditRecord(null)
      loadRecords(currentPageRef.current)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const openMarkPresent = () => {
    setMarkForm({
      userId: '',
      date: dateFrom,
      checkInTime: '10:00',
      checkOutTime: '18:00',
      note: '',
    })
    setShowMarkPresent(true)
    setError('')
  }

  const submitMarkPresent = async () => {
    if (!markForm.userId || !markForm.date || !markForm.checkInTime || !markForm.note) {
      setError(isNp ? 'सबै फिल्ड भर्नुहोस्' : 'All fields are required')
      return
    }
    if (markForm.note.length < 3) {
      setError(isNp ? 'कारण आवश्यक छ (कम्तिमा ३ अक्षर)' : 'Reason is required (min 3 characters)')
      return
    }
    setMarkSaving(true)
    const checkInTime = new Date(markForm.date + 'T' + markForm.checkInTime + ':00').toISOString()
    const checkOutTime = markForm.checkOutTime
      ? new Date(markForm.date + 'T' + markForm.checkOutTime + ':00').toISOString()
      : undefined
    const res = await api.post('/api/v1/attendance/mark-present', {
      userId: markForm.userId,
      date: markForm.date,
      checkInTime,
      checkOutTime,
      note: markForm.note,
    })
    setMarkSaving(false)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(isNp ? 'उपस्थित चिन्ह लगाइयो' : 'Marked as present')
      setShowMarkPresent(false)
      loadRecords(currentPageRef.current)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }
  if (!user) return null

  const showActionsColumn = canManualCorrect || canEditAutoClose

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {isNp ? 'उपस्थिति रेकर्ड' : 'Attendance records'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {isNp ? 'वास्तविक समयको उपस्थिति ट्र्याकिङ' : 'Real-time attendance tracking'}
                {isAccountant && (
                  <span className="ml-2 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                    {isNp ? 'लेखापाल दृश्य' : 'Accountant view'}
                  </span>
                )}
              </p>
            </div>
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
              isBs={isBs}
              isNp={isNp}
            />
          </div>
          <div className="flex items-center gap-2">
            {lastRefreshed && (
              <span className="text-xs text-slate-400">
                {isNp ? 'अपडेट:' : 'Updated'}{' '}
                {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => loadRecords(currentPageRef.current)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {isNp ? 'रिफ्रेश' : 'Refresh'}
            </button>
            {canManualCorrect && (
              <button
                onClick={openMarkPresent}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                <UserPlus className="h-4 w-4" />
                {isNp ? 'उपस्थित चिन्ह लगाउनुहोस्' : 'Mark present'}
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <span className="text-sm font-medium text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')} className="ml-4 text-rose-400 hover:text-rose-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* Accountant notice */}
        {isAccountant && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700">
              {isNp
                ? 'लेखापालले AUTO_CLOSED रेकर्डहरूको check-out समय मात्र सम्पादन गर्न सक्छन्। अन्य रेकर्डहरू संगठन प्रशासकद्वारा मात्र सम्पादन गर्न सकिन्छ।'
                : 'Accountants can only edit the check-out time of AUTO_CLOSED records. Other records can only be edited by the organization admin.'}
            </p>
          </div>
        )}

        {/* Filter bar — always visible, independent of date mode */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder={isNp ? 'नाम वा ID खोज्नुहोस्...' : 'Search by name or ID...'}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            {filterSearch && (
              <button
                onClick={() => setFilterSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400">{isNp ? 'स्थिति:' : 'Status:'}</span>
            {([
              { key: '',            label: isNp ? 'सबै'        : 'All',          active: 'bg-slate-900 text-white border-slate-900' },
              { key: 'CHECKED_IN',  label: isNp ? 'भित्र छ'    : 'Checked In',   active: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
              { key: 'CHECKED_OUT', label: isNp ? 'बाहिर गयो'  : 'Checked Out',  active: 'bg-sky-50 text-sky-700 border-sky-300' },
              { key: 'AUTO_CLOSED', label: isNp ? 'स्वतः बन्द' : 'Auto Closed',  active: 'bg-amber-50 text-amber-700 border-amber-300' },
            ] as { key: string; label: string; active: string }[]).map(({ key, label, active }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterStatus === key ? active : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {(filterSearch || filterStatus) && (
            <button
              onClick={() => { setFilterSearch(''); setFilterStatus('') }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
              {isNp ? 'फिल्टर हटाउनुहोस्' : 'Clear filters'}
            </button>
          )}
        </div>

        {/* Records table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Clock className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">
                {isNp ? 'यस मिति दायरामा कुनै रेकर्ड छैन' : 'No records for this date range'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {([
                      { label: isNp ? 'कर्मचारी' : 'Employee', key: 'employee', align: 'text-left' },
                      { label: isNp ? 'मिति' : 'Date',          key: 'date',     align: 'text-left' },
                      { label: isNp ? 'आगमन' : 'Check In',      key: 'checkin',  align: 'text-left' },
                      { label: isNp ? 'प्रस्थान' : 'Check Out', key: 'checkout', align: 'text-left' },
                      { label: isNp ? 'अवधि' : 'Duration',      key: 'duration', align: 'text-left' },
                      { label: isNp ? 'स्थिति' : 'Status',      key: 'status',   align: 'text-left' },
                      ...(showActionsColumn ? [{ label: isNp ? 'कार्य' : 'Actions', key: null, align: 'text-center' }] : []),
                    ] as { label: string; key: string | null; align: string }[]).map((col) => (
                      <th
                        key={col.label}
                        onClick={col.key ? () => handleSort(col.key!) : undefined}
                        className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 ${col.align} ${col.key ? 'cursor-pointer select-none hover:text-slate-600' : ''}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.key && (
                            sortCol === col.key ? (
                              <span className="text-slate-700">{sortDir === 'asc' ? '↑' : '↓'}</span>
                            ) : (
                              <span className="opacity-30">↕</span>
                            )
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={showActionsColumn ? 7 : 6} className="py-12 text-center text-sm text-slate-400">
                        {isNp ? 'फिल्टरसँग मिल्ने कुनै रेकर्ड छैन' : 'No records match the current filters'}
                      </td>
                    </tr>
                  ) : filteredGroups.map((g) => {
                    const isExpanded = expandedGroups.has(g.key)
                    const multi = g.sessions.length > 1
                    const summaryStatus = getSummaryStatus(g)
                    const firstSession = g.sessions[0]
                    const summaryRow = (
                      <tr
                        key={g.key + ':summary'}
                        className={
                          'transition-colors hover:bg-slate-50/50' +
                          (multi ? ' cursor-pointer' : '')
                        }
                        onClick={multi ? () => toggleGroup(g.key) : undefined}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            {multi ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleGroup(g.key)
                                }}
                                className="mt-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title={isExpanded ? 'Collapse sessions' : 'Show all sessions'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="inline-block w-5" />
                            )}
                            <div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  g.user.id && router.push(`/admin/attendance/${g.user.id}`)
                                }}
                                className="group text-left"
                                disabled={!g.user.id}
                              >
                                <div className="font-medium text-slate-900 group-hover:text-slate-600 group-hover:underline">
                                  {g.user.firstName} {g.user.lastName}
                                </div>
                              </button>
                              <div className="text-xs text-slate-400">{g.user.employeeId}</div>
                              {multi && (
                                <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                  {g.sessions.length}{' '}
                                  {isNp ? 'क्लक-इन' : 'sessions'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDateDisplay(g.firstCheckIn)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">
                            {formatTime(g.firstCheckIn)}
                          </span>
                          {multi && (
                            <div className="text-[10px] text-slate-400">
                              {isNp ? 'पहिलो' : 'first'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {g.lastCheckOut ? (
                            <>
                              <span className="font-medium text-slate-900">
                                {formatTime(g.lastCheckOut)}
                              </span>
                              {multi && (
                                <div className="text-[10px] text-slate-400">
                                  {isNp ? 'अन्तिम' : 'last'}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {g.totalDuration > 0 ? formatDuration(g.totalDuration) : '—'}
                          {multi && (
                            <div className="text-[10px] text-slate-400">
                              {isNp ? 'जम्मा' : 'total'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[summaryStatus] || 'border-slate-200 bg-slate-100 text-slate-600'}`}
                          >
                            {summaryStatus === 'AUTO_CLOSED'
                              ? isNp
                                ? 'स्वतः बन्द'
                                : 'AUTO CLOSED'
                              : summaryStatus === 'CHECKED_IN'
                                ? isNp
                                  ? 'भित्र छ'
                                  : 'CHECKED IN'
                                : summaryStatus === 'CHECKED_OUT'
                                  ? isNp
                                    ? 'बाहिर गयो'
                                    : 'CHECKED OUT'
                                  : summaryStatus}
                          </span>
                        </td>
                        {showActionsColumn && (
                          <td className="px-4 py-3 text-center">
                            {!multi && canEditRecord(firstSession) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEdit(firstSession)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                                title={
                                  isAccountant
                                    ? isNp
                                      ? 'check-out समय सम्पादन'
                                      : 'Edit check-out time'
                                    : isNp
                                      ? 'सम्पादन'
                                      : 'Edit'
                                }
                              >
                                <Save className="h-3.5 w-3.5" />
                                {isNp ? 'सम्पादन' : 'Edit'}
                              </button>
                            ) : multi ? (
                              <span className="text-xs text-slate-300">
                                {isNp ? 'विस्तार गर्नुहोस्' : 'Expand to edit'}
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-xs text-slate-300"
                                title={isNp ? 'सम्पादन अनुमति छैन' : 'No edit permission'}
                              >
                                <Lock className="h-3 w-3" />
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    )

                    if (!isExpanded) return summaryRow

                    // Expanded — render individual session rows beneath the
                    // summary, visually inset and dimmed so they read as
                    // children of the consolidated row.
                    const sessionRows = g.sessions.map((r) => {
                      const editAllowed = canEditRecord(r)
                      return (
                        <tr
                          key={r.id}
                          className="bg-slate-50/30 transition-colors hover:bg-slate-50"
                        >
                          <td className="px-4 py-2 pl-12">
                            <span className="text-xs text-slate-500">
                              {isNp ? 'क्लक-इन सत्र' : 'Session'}
                            </span>
                            {r.isManualEntry && (
                              <span className="ml-2 text-[10px] font-medium text-violet-600">
                                {isNp ? 'म्यानुअल' : 'Manual'}
                              </span>
                            )}
                            {r.modificationNote && (
                              <div
                                className="mt-0.5 max-w-[180px] truncate text-[10px] italic text-slate-400"
                                title={r.modificationNote}
                              >
                                ✎ {r.modificationNote}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-400">
                            {formatDateDisplay(r.checkInTime)}
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-sm text-slate-700">
                              {formatTime(r.checkInTime)}
                            </span>
                            {r.originalCheckIn && (
                              <div className="text-[10px] text-slate-400 line-through">
                                {formatTime(r.originalCheckIn)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {r.checkOutTime ? (
                              <>
                                <span className="text-sm text-slate-700">
                                  {formatTime(r.checkOutTime)}
                                </span>
                                {r.originalCheckOut && (
                                  <div className="text-[10px] text-slate-400 line-through">
                                    {formatTime(r.originalCheckOut)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-500">
                            {r.duration != null ? formatDuration(r.duration) : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[r.status] || 'border-slate-200 bg-slate-100 text-slate-600'}`}
                            >
                              {r.status === 'AUTO_CLOSED'
                                ? isNp
                                  ? 'स्वतः बन्द'
                                  : 'AUTO CLOSED'
                                : r.status === 'CHECKED_IN'
                                  ? isNp
                                    ? 'भित्र छ'
                                    : 'CHECKED IN'
                                  : r.status === 'CHECKED_OUT'
                                    ? isNp
                                      ? 'बाहिर गयो'
                                      : 'CHECKED OUT'
                                    : r.status}
                            </span>
                          </td>
                          {showActionsColumn && (
                            <td className="px-4 py-2 text-center">
                              {editAllowed ? (
                                <button
                                  onClick={() => openEdit(r)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                                >
                                  <Save className="h-3 w-3" />
                                  {isNp ? 'सम्पादन' : 'Edit'}
                                </button>
                              ) : (
                                <Lock className="mx-auto h-3 w-3 text-slate-300" />
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })

                    return (
                      <Fragment key={g.key}>
                        {summaryRow}
                        {sessionRows}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table footer — page-size selector + pagination */}
          {!loading && pagination.total > 0 && (() => {
            const totalPages = Math.ceil(pagination.total / pageSize)
            const pages: (number | '...')[] = []
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) pages.push(i)
            } else {
              pages.push(1)
              if (currentPage > 3) pages.push('...')
              for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) pages.push(p)
              if (currentPage < totalPages - 2) pages.push('...')
              pages.push(totalPages)
            }
            const from = (currentPage - 1) * pageSize + 1
            const to = Math.min(currentPage * pageSize, pagination.total)
            return (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-4 py-3">
                {/* Left: record range + page-size picker */}
                <div className="flex items-center gap-3">
                  <p className="text-sm text-slate-500">
                    {isNp
                      ? `जम्मा ${pagination.total} मध्ये ${from}–${to}`
                      : `${from}–${to} of ${pagination.total} records`}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">{isNp ? 'देखाउनुहोस्:' : 'Show:'}</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="rounded-md border border-slate-200 py-1 pl-2 pr-6 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      {[10, 20, 50, 100].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right: page navigation — only when more than one page */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => loadRecords(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {isNp ? 'अघिल्लो' : 'Prev'}
                    </button>
                    {pages.map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-sm text-slate-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => loadRecords(p as number)}
                          className={`min-w-[34px] rounded-lg border px-2 py-1.5 text-sm transition-colors ${p === currentPage ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => loadRecords(currentPage + 1)}
                      disabled={!pagination.hasMore}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    >
                      {isNp ? 'अर्को' : 'Next'}
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {isNp ? 'रेकर्ड सम्पादन' : 'Edit attendance record'}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {editRecord.user.firstName} {editRecord.user.lastName}
                  {editRecord.status === 'AUTO_CLOSED' && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                      AUTO_CLOSED
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setEditRecord(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Accountant restriction notice */}
            {isAccountant && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-700">
                  {isNp
                    ? 'लेखापालले check-out समय मात्र परिवर्तन गर्न सक्छन्।'
                    : 'Accountants can only change the check-out time.'}
                </p>
              </div>
            )}

            {/* Check-in field — admin only */}
            {isAdmin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  {isNp ? 'आगमन समय' : 'Check-in time'}
                </label>
                <input
                  type="datetime-local"
                  value={editForm.checkInTime}
                  onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            )}

            {/* Check-out field — both admin and accountant */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {isNp ? 'प्रस्थान समय' : 'Check-out time'}
                {isAccountant && (
                  <span className="ml-1 text-xs text-slate-400">
                    {isNp ? '(सम्पादनयोग्य)' : '(editable)'}
                  </span>
                )}
              </label>
              <input
                type="datetime-local"
                value={editForm.checkOutTime}
                onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              {editRecord.status === 'AUTO_CLOSED' && (
                <p className="text-xs text-amber-600">
                  {isNp
                    ? 'यो रेकर्ड स्वतः बन्द भएको थियो। वास्तविक प्रस्थान समय प्रविष्ट गर्नुहोस्।'
                    : 'This record was auto-closed. Enter the actual time the employee left.'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {isNp ? 'कारण (आवश्यक)' : 'Reason (required)'}
              </label>
              <input
                type="text"
                placeholder={isNp ? 'परिवर्तनको कारण लेख्नुहोस्' : 'Reason for this change'}
                value={editForm.note}
                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs text-rose-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setEditRecord(null)
                  setError('')
                }}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                onClick={submitEdit}
                disabled={editSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {editSaving ? (isNp ? 'सेभ...' : 'Saving...') : isNp ? 'सेभ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MARK PRESENT MODAL (admin only) ===== */}
      {showMarkPresent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {isNp ? 'उपस्थित चिन्ह लगाउनुहोस्' : 'Mark employee as present'}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {isNp
                    ? 'अनुपस्थित कर्मचारीको रेकर्ड थप्नुहोस्'
                    : 'Add attendance record for absent employee'}
                </p>
              </div>
              <button
                onClick={() => setShowMarkPresent(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {isNp ? 'कर्मचारी' : 'Employee'}
              </label>
              <select
                value={markForm.userId}
                onChange={(e) => setMarkForm({ ...markForm, userId: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">{isNp ? 'कर्मचारी छान्नुहोस्' : 'Select employee'}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} {e.employeeId ? `(${e.employeeId})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{isNp ? 'मिति' : 'Date'}</label>
              <input
                type="date"
                value={markForm.date}
                onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  {isNp ? 'आगमन समय' : 'Check-in'}
                </label>
                <input
                  type="time"
                  value={markForm.checkInTime}
                  onChange={(e) => setMarkForm({ ...markForm, checkInTime: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  {isNp ? 'प्रस्थान समय' : 'Check-out'}
                  <span className="ml-1 text-xs text-slate-400">
                    {isNp ? '(ऐच्छिक)' : '(optional)'}
                  </span>
                </label>
                <input
                  type="time"
                  value={markForm.checkOutTime}
                  onChange={(e) => setMarkForm({ ...markForm, checkOutTime: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {isNp ? 'कारण (आवश्यक)' : 'Reason (required)'}
              </label>
              <input
                type="text"
                placeholder={
                  isNp
                    ? 'किन उपस्थित चिन्ह लगाउँदै हुनुहुन्छ?'
                    : 'Why are you marking this employee present?'
                }
                value={markForm.note}
                onChange={(e) => setMarkForm({ ...markForm, note: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs text-rose-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowMarkPresent(false)
                  setError('')
                }}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                onClick={submitMarkPresent}
                disabled={markSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {markSaving ? (isNp ? 'सेभ...' : 'Saving...') : isNp ? 'सेभ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
