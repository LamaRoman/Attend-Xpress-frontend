'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import { BranchFilterPills, type BranchPill } from '@/components/BranchFilterPills'
import BSDatePicker, { adToBS, BS_MONTHS_EN, BS_MONTHS_NP } from '@/components/BSDatePicker'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Building2,
  User,
  RefreshCw,
  Table2,
  Copy,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type CycleType = 'FIXED' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'

interface DayEntry {
  start: string
  end: string
}

interface RosterSchedule {
  id: string
  membershipId: string | null
  cycleType: CycleType
  daySchedules: Record<string, DayEntry>
  effectiveFrom: string
  effectiveTo: string | null
  label: string | null
  createdAt: string
  deletedAt: string | null
  membership: {
    id: string
    employeeId: string | null
    user: { firstName: string; lastName: string }
  } | null
}

interface MemberOption {
  membershipId: string
  employeeId: string | null
  firstName: string
  lastName: string
}

interface FormState {
  membershipId: string
  cycleType: CycleType
  daySchedules: Record<string, DayEntry> // key = '0'–'6'
  effectiveFrom: string
  effectiveTo: string
  label: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS_NP = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि']

const CYCLE_LABELS_EN: Record<CycleType, string> = {
  FIXED: 'Fixed (one-time)',
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly (2 weeks)',
  MONTHLY: 'Monthly',
}
const CYCLE_LABELS_NP: Record<CycleType, string> = {
  FIXED: 'निश्चित (एकपटक)',
  WEEKLY: 'साप्ताहिक',
  FORTNIGHTLY: 'पाक्षिक (२ हप्ता)',
  MONTHLY: 'मासिक',
}

const DEFAULT_DAY_ENTRY: DayEntry = { start: '10:00', end: '18:00' }

const EMPTY_FORM: FormState = {
  membershipId: '',
  cycleType: 'WEEKLY',
  daySchedules: {
    '1': { start: '10:00', end: '18:00' },
    '2': { start: '10:00', end: '18:00' },
    '3': { start: '10:00', end: '18:00' },
    '4': { start: '10:00', end: '18:00' },
    '5': { start: '10:00', end: '18:00' },
  },
  effectiveFrom: new Date().toISOString().split('T')[0],
  effectiveTo: '',
  label: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, isBs: boolean, isNp: boolean): string {
  if (!dateStr) return '—'
  if (isBs) {
    const d = new Date(dateStr)
    const bs = adToBS(d)
    const months = isNp ? BS_MONTHS_NP : BS_MONTHS_EN
    return `${bs.day} ${months[bs.month - 1]} ${bs.year}`
  }
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function workingDaysLabel(daySchedules: Record<string, DayEntry>, isNp: boolean): string {
  const labels = isNp ? DAY_LABELS_NP : DAY_LABELS_EN
  return Object.keys(daySchedules)
    .map(Number)
    .sort((a, b) => a - b)
    .map((d) => labels[d])
    .join(', ')
}

function shiftSummary(daySchedules: Record<string, DayEntry>): string {
  const entries = Object.values(daySchedules)
  if (entries.length === 0) return '—'
  const first = entries[0]
  const allSame = entries.every((e) => e.start === first.start && e.end === first.end)
  if (allSame) return `${first.start} – ${first.end}`
  return 'Mixed'
}

function isMixed(daySchedules: Record<string, DayEntry>): boolean {
  const entries = Object.values(daySchedules)
  if (entries.length <= 1) return false
  const first = entries[0]
  return !entries.every((e) => e.start === first.start && e.end === first.end)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScopeTag({ schedule, isNp }: { schedule: RosterSchedule; isNp: boolean }) {
  if (!schedule.membership) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        <Building2 className="h-3 w-3" />
        {isNp ? 'संगठन-व्यापी' : 'Org-wide'}
      </span>
    )
  }
  const m = schedule.membership
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
      <User className="h-3 w-3" />
      {m.user.firstName} {m.user.lastName}
      {m.employeeId ? ` (${m.employeeId})` : ''}
    </span>
  )
}

function CycleTag({ cycleType, isNp }: { cycleType: CycleType; isNp: boolean }) {
  return (
    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {isNp ? CYCLE_LABELS_NP[cycleType] : CYCLE_LABELS_EN[cycleType]}
    </span>
  )
}

// Per-day shift time grid used in the create/edit modal
function DayScheduleGrid({
  value,
  onChange,
  isNp,
}: {
  value: Record<string, DayEntry>
  onChange: (v: Record<string, DayEntry>) => void
  isNp: boolean
}) {
  const dayLabels = isNp ? DAY_LABELS_NP : DAY_LABELS_EN

  function toggleDay(d: string) {
    const next = { ...value }
    if (next[d]) {
      delete next[d]
    } else {
      // Default to the most common time in the current schedule, or 10:00–18:00
      const existing = Object.values(value)
      const ref = existing.length > 0 ? existing[existing.length - 1] : DEFAULT_DAY_ENTRY
      next[d] = { start: ref.start, end: ref.end }
    }
    onChange(next)
  }

  function updateTime(d: string, field: 'start' | 'end', v: string) {
    onChange({ ...value, [d]: { ...value[d], [field]: v } })
  }

  function applyToAll(sourceDay: string) {
    const entry = value[sourceDay]
    if (!entry) return
    const next: Record<string, DayEntry> = {}
    Object.keys(value).forEach((d) => {
      next[d] = { ...entry }
    })
    onChange(next)
  }

  return (
    <div className="space-y-1.5">
      {['0', '1', '2', '3', '4', '5', '6'].map((d) => {
        const active = !!value[d]
        return (
          <div
            key={d}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
              active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'
            }`}
          >
            {/* Toggle */}
            <button
              type="button"
              onClick={() => toggleDay(d)}
              className={`h-4 w-4 shrink-0 rounded border transition-colors ${
                active ? 'border-slate-800 bg-slate-800' : 'border-slate-300 bg-white'
              }`}
            >
              {active && (
                <svg
                  viewBox="0 0 10 10"
                  className="h-full w-full text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polyline points="1.5,5 4,7.5 8.5,2.5" />
                </svg>
              )}
            </button>

            {/* Day label */}
            <span
              className={`w-8 text-xs font-medium ${active ? 'text-slate-700' : 'text-slate-400'}`}
            >
              {dayLabels[Number(d)]}
            </span>

            {/* Time inputs */}
            {active ? (
              <>
                <input
                  type="time"
                  value={value[d].start}
                  onChange={(e) => updateTime(d, 'start', e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <span className="shrink-0 text-xs text-slate-400">→</span>
                <input
                  type="time"
                  value={value[d].end}
                  onChange={(e) => updateTime(d, 'end', e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                {/* Copy to all */}
                <button
                  type="button"
                  onClick={() => applyToAll(d)}
                  title={isNp ? 'सबै दिनमा लागू गर्नुहोस्' : 'Apply to all days'}
                  className="shrink-0 rounded p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400">{isNp ? 'बिदा' : 'Off'}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Expanded mixed-shift display used in the table
function MixedShiftPopover({
  daySchedules,
  isNp,
}: {
  daySchedules: Record<string, DayEntry>
  isNp: boolean
}) {
  const [open, setOpen] = useState(false)
  const dayLabels = isNp ? DAY_LABELS_NP : DAY_LABELS_EN
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
      >
        {isNp ? 'मिश्रित ▾' : 'Mixed ▾'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {Object.keys(daySchedules)
              .map(Number)
              .sort((a, b) => a - b)
              .map((d) => (
                <div key={d} className="flex items-center justify-between gap-3 py-0.5 text-xs">
                  <span className="font-medium text-slate-600">{dayLabels[d]}</span>
                  <span className="tabular-nums text-slate-500">
                    {daySchedules[String(d)].start} – {daySchedules[String(d)].end}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RosterPage() {
  const { user, isLoading, language, calendarMode } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'
  const isBs = calendarMode === 'NEPALI'

  const [schedules, setSchedules] = useState<RosterSchedule[]>([])
  const [members, setMembers] = useState<MemberOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filterScope, setFilterScope] = useState<'all' | 'org' | 'employee'>('all')
  const [filterMemberId, setFilterMemberId] = useState('')

  // Phase 8b — branch filter (same pattern as Reports). BRANCH_ADMIN doesn't
  // see the pills; ORG_ADMIN sees them plus an optional "Show archived" toggle.
  const [branches, setBranches] = useState<BranchPill[]>([])
  const [archivedBranches, setArchivedBranches] = useState<BranchPill[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<'ALL' | string>('ALL')
  const [archivedExpanded, setArchivedExpanded] = useState(false)
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN'
  const isOrgAdmin = user?.role === 'ORG_ADMIN'
  const isMultiBranch = branches.length > 1

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<RosterSchedule | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'ORG_ADMIN' && user.role !== 'BRANCH_ADMIN'))) {
      router.replace('/admin')
    }
  }, [user, isLoading, router])

  // Phase 8b — load branches for the pill filter; re-fetch with includeDeleted
  // when ORG_ADMIN expands the archived toggle.
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

  const loadSchedules = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (filterScope !== 'all') params.set('scope', filterScope)
    if (filterMemberId) params.set('membershipId', filterMemberId)
    if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId)
    const { data, error: err } = await api.get(`/api/v1/roster?${params}`)
    setLoading(false)
    if (err) {
      setError(isNp ? 'तालिका लोड गर्न सकिएन' : 'Could not load roster schedules')
      return
    }
    setSchedules((data as RosterSchedule[]) ?? [])
  }, [filterScope, filterMemberId, selectedBranchId, isNp])

  const loadMembers = useCallback(async () => {
    const { data } = await api.get('/api/v1/users')
    if (Array.isArray(data)) {
      setMembers(
        (
          data as {
            membershipId: string
            employeeId: string | null
            firstName: string
            lastName: string
            role: string
          }[]
        )
          .filter((u) => u.role === 'EMPLOYEE')
          .map((u) => ({
            membershipId: u.membershipId,
            employeeId: u.employeeId,
            firstName: u.firstName,
            lastName: u.lastName,
          })),
      )
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'ORG_ADMIN' || user?.role === 'BRANCH_ADMIN') {
      loadSchedules()
      loadMembers()
    }
  }, [user, loadSchedules, loadMembers])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, effectiveFrom: new Date().toISOString().split('T')[0] })
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(s: RosterSchedule) {
    setEditingId(s.id)
    // Map API daySchedules (string keys) → form state
    const daySchedules: Record<string, DayEntry> = {}
    Object.entries(s.daySchedules ?? {}).forEach(([day, entry]) => {
      daySchedules[day] = { start: entry.start, end: entry.end }
    })
    setForm({
      membershipId: s.membershipId ?? '',
      cycleType: s.cycleType,
      daySchedules,
      effectiveFrom: s.effectiveFrom.split('T')[0],
      effectiveTo: s.effectiveTo ? s.effectiveTo.split('T')[0] : '',
      label: s.label ?? '',
    })
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setFormError('')
  }

  async function handleSave() {
    if (Object.keys(form.daySchedules).length === 0) {
      setFormError(isNp ? 'कम्तीमा एक कार्यदिन छान्नुहोस्' : 'Select at least one working day')
      return
    }

    // Validate each day: start !== end
    for (const [day, entry] of Object.entries(form.daySchedules) as [string, DayEntry][]) {
      if (entry.start === entry.end) {
        const labels = isNp ? DAY_LABELS_NP : DAY_LABELS_EN
        setFormError(
          isNp
            ? `${labels[Number(day)]}: सुरु र अन्त समय एउटै हुन सक्दैन`
            : `${DAY_LABELS_EN[Number(day)]}: start and end time cannot be the same`,
        )
        return
      }
    }

    if (!form.effectiveFrom) {
      setFormError(isNp ? 'सुरु मिति आवश्यक छ' : 'Effective from date is required')
      return
    }

    setSaving(true)
    setFormError('')

    const body = {
      membershipId: form.membershipId || null,
      cycleType: form.cycleType,
      daySchedules: form.daySchedules,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
      label: form.label || null,
    }

    const endpoint = editingId ? `/api/v1/roster/${editingId}` : '/api/v1/roster'
    const method = editingId ? api.put : api.post
    const { error: err } = await method(endpoint, body)

    setSaving(false)
    if (err) {
      setFormError(err.message)
      return
    }

    setSuccess(
      isNp
        ? editingId
          ? 'तालिका अपडेट भयो'
          : 'तालिका सिर्जना भयो'
        : editingId
          ? 'Schedule updated'
          : 'Schedule created',
    )
    closeModal()
    loadSchedules()
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error: err } = await api.delete(`/api/v1/roster/${deleteTarget.id}`)
    setDeleting(false)
    if (err) {
      setError(err.message)
      setDeleteTarget(null)
      return
    }
    setSuccess(isNp ? 'तालिका मेटाइयो' : 'Schedule deleted')
    setDeleteTarget(null)
    loadSchedules()
    setTimeout(() => setSuccess(''), 3000)
  }

  if (isLoading || !user) return null

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
              <Table2 className="h-5 w-5 text-slate-500" />
              {isNp ? 'रोस्टर तालिका' : 'Roster Schedules'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {isNp
                ? 'कार्यदिन र शिफ्ट समय व्यवस्थापन गर्नुहोस्'
                : 'Manage working day schedules and shift times for your organization'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSchedules}
              disabled={loading}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {isNp ? 'नयाँ तालिका' : 'New Schedule'}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Priority explainer */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <span className="font-medium text-slate-800">
            {isNp ? 'प्राथमिकता क्रम:' : 'Priority order:'}
          </span>{' '}
          {isNp
            ? 'कर्मचारी रोस्टर → संगठन रोस्टर → कर्मचारीको व्यक्तिगत शिफ्ट → संगठनको पूर्वनिर्धारित'
            : 'Employee roster → Org roster → Employee shift fields → Org defaults'}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'org', 'employee'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setFilterScope(s)
                setFilterMemberId('')
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterScope === s
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s === 'all'
                ? isNp
                  ? 'सबै'
                  : 'All'
                : s === 'org'
                  ? isNp
                    ? 'संगठन-व्यापी'
                    : 'Org-wide'
                  : isNp
                    ? 'प्रति-कर्मचारी'
                    : 'Per-employee'}
            </button>
          ))}
          {filterScope === 'employee' && (
            <select
              value={filterMemberId}
              onChange={(e) => setFilterMemberId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">{isNp ? 'सबै कर्मचारी' : 'All employees'}</option>
              {members.map((m) => (
                <option key={m.membershipId} value={m.membershipId}>
                  {m.firstName} {m.lastName}
                  {m.employeeId ? ` (${m.employeeId})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Phase 8b — branch filter (hidden on single-branch orgs and for BRANCH_ADMIN). */}
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

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {isNp ? 'लोड हुँदैछ...' : 'Loading...'}
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <Table2 className="h-8 w-8" />
              <p className="text-sm">{isNp ? 'कुनै तालिका भेटिएन' : 'No schedules found'}</p>
              <button
                onClick={openCreate}
                className="text-xs text-slate-500 underline hover:text-slate-700"
              >
                {isNp ? 'पहिलो तालिका थप्नुहोस्' : 'Add the first schedule'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{isNp ? 'दायरा' : 'Scope'}</th>
                    <th className="px-4 py-3">{isNp ? 'प्रकार' : 'Cycle'}</th>
                    <th className="px-4 py-3">{isNp ? 'कार्यदिन' : 'Working Days'}</th>
                    <th className="px-4 py-3">{isNp ? 'समय' : 'Shift'}</th>
                    <th className="px-4 py-3">{isNp ? 'सुरु' : 'From'}</th>
                    <th className="px-4 py-3">{isNp ? 'अन्त' : 'To'}</th>
                    <th className="px-4 py-3">{isNp ? 'लेबल' : 'Label'}</th>
                    <th className="px-4 py-3 text-right">{isNp ? 'कार्य' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <ScopeTag schedule={s} isNp={isNp} />
                      </td>
                      <td className="px-4 py-3">
                        <CycleTag cycleType={s.cycleType} isNp={isNp} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {workingDaysLabel(s.daySchedules ?? {}, isNp)}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-slate-700">
                        {isMixed(s.daySchedules ?? {}) ? (
                          <MixedShiftPopover daySchedules={s.daySchedules} isNp={isNp} />
                        ) : (
                          shiftSummary(s.daySchedules ?? {})
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {formatDate(s.effectiveFrom, isBs, isNp)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {s.effectiveTo ? (
                          formatDate(s.effectiveTo, isBs, isNp)
                        ) : (
                          <span className="text-slate-400">{isNp ? 'अनिश्चित' : 'Open-ended'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {s.label ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            title={isNp ? 'सम्पादन' : 'Edit'}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            title={isNp ? 'मेटाउनुहोस्' : 'Delete'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══ Create / Edit Modal ══════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {editingId
                  ? isNp
                    ? 'तालिका सम्पादन'
                    : 'Edit Schedule'
                  : isNp
                    ? 'नयाँ तालिका'
                    : 'New Schedule'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* Scope */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  {isNp ? 'दायरा' : 'Scope'}
                </label>
                <select
                  value={form.membershipId}
                  onChange={(e) => setForm((f) => ({ ...f, membershipId: e.target.value }))}
                  disabled={!!editingId}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{isNp ? 'संगठन-व्यापी' : 'Org-wide'}</option>
                  {members.map((m) => (
                    <option key={m.membershipId} value={m.membershipId}>
                      {m.firstName} {m.lastName}
                      {m.employeeId ? ` (${m.employeeId})` : ''}
                    </option>
                  ))}
                </select>
                {editingId && (
                  <p className="mt-1 text-xs text-slate-400">
                    {isNp
                      ? 'दायरा परिवर्तन गर्न सकिँदैन'
                      : 'Scope cannot be changed after creation'}
                  </p>
                )}
              </div>

              {/* Cycle type */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  {isNp ? 'चक्र प्रकार' : 'Cycle Type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['FIXED', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] as CycleType[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, cycleType: c }))}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        form.cycleType === c
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {isNp ? CYCLE_LABELS_NP[c] : CYCLE_LABELS_EN[c]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-day schedule grid */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  {isNp ? 'दैनिक कार्यतालिका' : 'Daily Schedule'}
                </label>
                <p className="mb-2 text-xs text-slate-400">
                  {isNp
                    ? 'दिन सक्रिय गर्न टिक गर्नुहोस् र प्रत्येक दिनको शिफ्ट समय सेट गर्नुहोस्। 📋 थिचेर सबै सक्रिय दिनमा लागू गर्न सकिन्छ।'
                    : "Tick a day to activate it and set its shift time. Press 📋 to apply that day's time to all active days."}
                </p>
                <DayScheduleGrid
                  value={form.daySchedules}
                  onChange={(v) => setForm((f) => ({ ...f, daySchedules: v }))}
                  isNp={isNp}
                />
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <BSDatePicker
                    label={isNp ? 'सुरु मिति' : 'Effective From'}
                    value={form.effectiveFrom}
                    onChange={(v) => setForm((f) => ({ ...f, effectiveFrom: v }))}
                  />
                </div>
                <div>
                  <BSDatePicker
                    label={isNp ? 'अन्त मिति (वैकल्पिक)' : 'Effective To (optional)'}
                    value={form.effectiveTo}
                    onChange={(v) => setForm((f) => ({ ...f, effectiveTo: v }))}
                    placeholder={isNp ? 'अनिश्चित' : 'Open-ended'}
                    min={form.effectiveFrom}
                  />
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  {isNp ? 'लेबल (वैकल्पिक)' : 'Label (optional)'}
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder={isNp ? 'जस्तै: दशैं शिफ्ट' : 'e.g. Dashain cover shift'}
                  maxLength={120}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              {/* Form error */}
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {saving
                  ? isNp
                    ? 'सुरक्षित...'
                    : 'Saving...'
                  : editingId
                    ? isNp
                      ? 'अपडेट गर्नुहोस्'
                      : 'Update'
                    : isNp
                      ? 'सिर्जना गर्नुहोस्'
                      : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Delete Confirm Modal ══════════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-slate-900">
              {isNp ? 'तालिका मेटाउने?' : 'Delete schedule?'}
            </h3>
            <p className="mb-5 text-sm text-slate-500">
              {isNp
                ? `यो तालिका "${deleteTarget.label ?? deleteTarget.id.slice(0, 8)}" स्थायी रूपमा मेटाइनेछ।`
                : `The schedule "${deleteTarget.label ?? deleteTarget.id.slice(0, 8)}" will be removed. This cannot be undone.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {isNp ? 'मेटाउनुहोस्' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
