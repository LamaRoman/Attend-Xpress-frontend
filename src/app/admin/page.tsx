'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import MiniCalendar from '@/components/MiniCalendar'
import DateConverter from '@/components/DateConverter'
import { adToBS, BS_MONTHS_NP, toNepaliDigits } from '@/components/BSDatePicker'
import {
  ArrowRight,
  X,
  Search,
  XCircle,
  AlertTriangle,
  Cake,
  CalendarDays,
  ArrowLeftRight,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'

/**
 * A slim, clickable header bar that reveals its children when expanded.
 * Collapsed by default — used to tuck the calendar / date converter away so
 * the dashboard stays compact. Defined at module scope to avoid re-creation.
 */
function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string
  subtitle?: string
  icon: LucideIcon
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-left transition-colors hover:border-slate-300"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

interface PresentRecord {
  employee: { id: string; firstName: string; lastName: string; employeeId: string }
  checkInTime: string
  checkOutTime: string | null
  status: string
}

interface AbsentEmployee {
  id: string
  firstName: string
  lastName: string
  employeeId: string
  email: string
  membershipId: string
}

interface DailyReport {
  summary: {
    totalEmployees: number
    totalPresent: number
    totalAbsent: number
    attendanceRate: number
    totalHoursWorked: number
    lateArrivals?: number
  }
  present: PresentRecord[]
  absent: AbsentEmployee[]
}

interface BirthdayEmployee {
  id: string
  firstName: string
  lastName: string
  employeeId: string | null
  dateOfBirth: string
  daysUntil: number
  isToday: boolean
}

export default function AdminDashboard() {
  const { user, isLoading, language, calendarMode } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'
  const isBs = calendarMode === 'NEPALI'

  const [stats, setStats] = useState({
    totalEmployees: 0,
    todayPresent: 0,
    todayAbsent: 0,
    avgAttendance: 0,
    lateArrivals: 0,
  })
  const [presentList, setPresentList] = useState<PresentRecord[]>([])
  const [absentList, setAbsentList] = useState<AbsentEmployee[]>([])
  const [slideOver, setSlideOver] = useState<'present' | 'absent' | null>(null)
  const [search, setSearch] = useState('')
  const [birthdays, setBirthdays] = useState<BirthdayEmployee[]>([])
  const [showBirthdayToast, setShowBirthdayToast] = useState(true)
  useEffect(() => {
    if (user) {
      loadStats()
      loadBirthdays()
    }
  }, [user])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSlideOver(null)
    }
    if (slideOver) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [slideOver])

  const loadStats = async () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const res = await api.get('/api/v1/reports/daily?date=' + today)
    if (res.data) {
      const data = res.data as DailyReport
      setStats({
        totalEmployees: data.summary.totalEmployees,
        todayPresent: data.summary.totalPresent,
        todayAbsent: data.summary.totalAbsent,
        avgAttendance: data.summary.attendanceRate,
        lateArrivals: data.summary.lateArrivals ?? 0,
      })
      setPresentList(data.present || [])
      setAbsentList(data.absent || [])
    }
  }

  const loadBirthdays = async () => {
    const res = await api.get('/api/v1/users/upcoming-birthdays?days=30')
    if (res.data && Array.isArray(res.data)) setBirthdays(res.data as BirthdayEmployee[])
  }

  const openSlideOver = (type: 'present' | 'absent') => {
    setSearch('')
    setSlideOver(type)
  }

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

  const formatBirthday = (dob: string) => {
    const d = new Date(dob)
    return d.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', { month: 'long', day: 'numeric' })
  }

  const filteredPresent = presentList.filter((r) =>
    `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase().includes(search.toLowerCase()),
  )
  const filteredAbsent = absentList.filter((emp) =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }

  if (!user) return null

  const presentPct =
    stats.totalEmployees > 0
      ? Math.min(100, Math.round((stats.todayPresent / stats.totalEmployees) * 100))
      : 0

  const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9']

  const secondaryCards: {
    title: string
    value: number
    icon: LucideIcon
    accent: string
    iconBg: { background: string }
    onClick?: () => void
  }[] = [
    {
      title: isNp ? 'आज अनुपस्थित' : 'Absent today',
      value: stats.todayAbsent,
      icon: XCircle,
      accent: '#fb7185',
      iconBg: { background: 'rgba(251,113,133,0.15)' },
      onClick: () => openSlideOver('absent'),
    },
    {
      title: isNp ? 'ढिलो आगमन' : 'Late arrivals',
      value: stats.lateArrivals,
      icon: AlertTriangle,
      accent: '#fbbf24',
      iconBg: { background: 'rgba(251,191,36,0.15)' },
      onClick: () => router.push('/admin/attendance/late-arrivals'),
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Hero — dark, on-brand canvas mirroring the auth pages */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 sm:p-6">
          <div
            aria-hidden
            className="dz-blob pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl"
            style={{ animation: 'dz-driftA 18s ease-in-out infinite' }}
          />
          <div
            aria-hidden
            className="dz-blob pointer-events-none absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl"
            style={{ animation: 'dz-driftB 22s ease-in-out infinite' }}
          />
          <div
            aria-hidden
            className="dz-blob pointer-events-none absolute right-1/4 top-1/3 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl"
            style={{ animation: 'dz-driftA 26s ease-in-out infinite' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(ellipse 80% 80% at 50% 30%, #000 40%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 80% 80% at 50% 30%, #000 40%, transparent 100%)',
            }}
          />

          <div className="relative z-10">
            {/* Greeting */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {isNp ? 'नमस्ते,' : 'Hello,'} {user?.firstName} 👋
                </h1>
                <p className="mt-1.5 text-sm text-slate-400">
                  {isNp ? 'आजको उपस्थिति सारांश' : "Here's your attendance summary for today"}
                </p>
              </div>
              <div className="hidden shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-right backdrop-blur-md sm:block">
                <div className="text-xs font-medium text-slate-400">
                  {/* Manual Nepali weekday — the ne-NP locale falls back to English
                      weekday names in most runtimes, so map it explicitly. */}
                  {['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'][
                    new Date().getDay()
                  ]}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  {(() => {
                    const bs = adToBS(new Date())
                    return `${BS_MONTHS_NP[bs.month - 1]} ${toNepaliDigits(bs.day)}, ${toNepaliDigits(bs.year)}`
                  })()}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Featured — present today */}
              <button
                onClick={() => openSlideOver('present')}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-left shadow-2xl backdrop-blur-md transition-all hover:border-white/20 lg:col-span-2"
              >
                <ArrowRight className="absolute right-5 top-5 h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" />
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-400"
                    style={{ animation: 'dz-pulse 2.4s ease-in-out infinite' }}
                  />
                  <span className="text-xs font-medium text-slate-300">
                    {isNp ? 'आज उपस्थित' : 'Present today'}
                  </span>
                  <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                    {isNp ? 'प्रत्यक्ष' : 'Live'}
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight text-white">
                    {stats.todayPresent}
                  </span>
                  <span className="mb-1 text-base text-slate-500">/ {stats.totalEmployees}</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${presentPct}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center">
                  {presentList.slice(0, 5).map((r, i) => (
                    <div
                      key={r.employee.id}
                      className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 text-[10px] font-semibold text-white first:ml-0"
                      style={{ background: avatarColors[i % avatarColors.length] }}
                    >
                      {r.employee.firstName[0]}
                      {r.employee.lastName[0]}
                    </div>
                  ))}
                  {presentList.length > 5 && (
                    <span className="ml-2 text-xs text-slate-400">+{presentList.length - 5}</span>
                  )}
                  {presentList.length === 0 && (
                    <span className="text-xs text-slate-500">
                      {isNp ? 'अहिलेसम्म कोही उपस्थित छैन' : 'No one checked in yet'}
                    </span>
                  )}
                </div>
              </button>

              {/* Secondary stats */}
              <div className="flex flex-col gap-4 lg:col-span-1">
                {secondaryCards.map((card) => (
                  <div
                    key={card.title}
                    onClick={card.onClick}
                    className={`group relative flex flex-1 items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-all ${
                      card.onClick ? 'cursor-pointer hover:border-white/20' : ''
                    }`}
                  >
                    <div className="flex w-full items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={card.iconBg}
                      >
                        <card.icon className="h-4 w-4" style={{ color: card.accent }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-2xl font-bold leading-none text-white">
                          {card.value}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-400">
                          {card.title}
                        </div>
                      </div>
                      {card.onClick && (
                        <ArrowRight className="ml-auto h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scoped keyframes — self-contained, motion-safe */}
          <style>{`
            @keyframes dz-driftA { 0%,100% { transform: translate(0,0) } 50% { transform: translate(30px,-20px) } }
            @keyframes dz-driftB { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-26px,22px) } }
            @keyframes dz-pulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: 0.4; transform: scale(0.82) } }
            @media (prefers-reduced-motion: reduce) {
              .dz-blob, [style*="dz-pulse"] { animation: none !important; }
            }
          `}</style>
        </div>

        {/* Birthday Toast — today's birthdays only */}
        {showBirthdayToast && birthdays.filter((b) => b.isToday).length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-4">
            <span className="text-2xl">🎂</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-900">
                {isNp ? 'आज जन्मदिन!' : 'Birthday today!'}
              </p>
              <p className="mt-0.5 text-xs text-purple-700">
                {birthdays
                  .filter((b) => b.isToday)
                  .map((b) => `${b.firstName} ${b.lastName}`)
                  .join(', ')}
              </p>
            </div>
            <button
              onClick={() => setShowBirthdayToast(false)}
              className="rounded-lg p-1.5 transition-colors hover:bg-purple-100"
            >
              <X className="h-4 w-4 text-purple-500" />
            </button>
          </div>
        )}

        {/* Date tools — collapsible, tucked away by default to keep things compact */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <CollapsibleSection
              title={isNp ? 'पात्रो' : 'Calendar'}
              subtitle={isNp ? 'नेपाली पात्रो' : 'Nepali (BS) calendar'}
              icon={CalendarDays}
            >
              <MiniCalendar isBs={isBs} isNp={isNp} expanded showHolidayList />
            </CollapsibleSection>
          </div>
          <div className="lg:col-span-1">
            <CollapsibleSection
              title={isNp ? 'मिति रूपान्तरण' : 'Date converter'}
              subtitle="BS ↔ AD"
              icon={ArrowLeftRight}
            >
              <DateConverter isNp={isNp} />
            </CollapsibleSection>
          </div>
        </div>

        {/* Upcoming Birthdays — only shown when there are birthdays in the next 30 days */}
        {birthdays.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
                  <div className="rounded-lg p-2" style={{ background: '#fdf4ff' }}>
                    <Cake className="h-4 w-4" style={{ color: '#a855f7' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {isNp ? 'आगामी जन्मदिनहरू' : 'Upcoming birthdays'}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isNp ? 'अर्को ३० दिनमा' : 'Next 30 days'} · {birthdays.length}{' '}
                      {isNp ? 'कर्मचारी' : birthdays.length === 1 ? 'employee' : 'employees'}
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {birthdays.map((emp) => (
                    <div
                      key={emp.id}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                        emp.isToday ? 'bg-purple-50/40' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-medium"
                        style={
                          emp.isToday
                            ? { background: '#f3e8ff', color: '#9333ea' }
                            : { background: '#f1f5f9', color: '#475569' }
                        }
                      >
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {emp.firstName} {emp.lastName}
                          </span>
                          {emp.isToday && (
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ background: '#f3e8ff', color: '#9333ea' }}
                            >
                              {isNp ? 'आज! 🎂' : 'Today! 🎂'}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {formatBirthday(emp.dateOfBirth)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {emp.isToday ? (
                          <span className="text-base">🎉</span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            {isNp
                              ? `${emp.daysUntil} दिनमा`
                              : `in ${emp.daysUntil} day${emp.daysUntil === 1 ? '' : 's'}`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

      </div>

      {/* Slide-over */}
      {slideOver && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSlideOver(null)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-xl sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {slideOver === 'present'
                    ? isNp
                      ? 'आज उपस्थित'
                      : 'Present today'
                    : isNp
                      ? 'आज क्लक इन नगरेका'
                      : 'Not yet clocked in today'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {slideOver === 'present'
                    ? `${presentList.length} ${isNp ? 'कर्मचारी' : 'employees'}`
                    : `${absentList.length} ${isNp ? 'कर्मचारी' : 'employees'}`}
                </p>
              </div>
              <button
                onClick={() => setSlideOver(null)}
                className="rounded-md p-1.5 transition-colors hover:bg-slate-100"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>
            <div className="border-b border-slate-100 px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isNp ? 'नाम खोज्नुहोस्...' : 'Search by name...'}
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {slideOver === 'present' ? (
                filteredPresent.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">
                    {isNp ? 'कोही भेटिएन' : 'No results found'}
                  </div>
                ) : (
                  filteredPresent.map((record) => (
                    <div
                      key={record.employee.id}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50">
                        <span className="text-xs font-medium text-emerald-700">
                          {record.employee.firstName[0]}
                          {record.employee.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {record.employee.firstName} {record.employee.lastName}
                        </div>
                        <div className="text-xs text-slate-400">{record.employee.employeeId}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-medium text-emerald-600">
                          {formatTime(record.checkInTime)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {record.checkOutTime
                            ? formatTime(record.checkOutTime)
                            : isNp
                              ? 'सक्रिय'
                              : 'Active'}
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : filteredAbsent.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  {isNp ? 'कोही भेटिएन' : 'No results found'}
                </div>
              ) : (
                filteredAbsent.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-50">
                      <span className="text-xs font-medium text-rose-500">
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{emp.employeeId}</div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {isNp ? 'क्लक इन छैन' : 'Not clocked in'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
