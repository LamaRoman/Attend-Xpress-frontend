'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import {
  BarChart3,
  QrCode,
  Clock,
  FileText,
  Users,
  CalendarDays,
  CreditCard,
  Settings,
  LogOut,
  Calendar,
  Menu,
  X,
  Banknote,
  Receipt,
  Table2,
  Navigation,
  Building2,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { useState } from 'react'
import NotificationBell from './NotificationBell'
import PoweredBy from './PoweredBy'
import { FeatureLockScreen } from './FeatureLock'
import BillingBanner from './BillingBanner'

interface NavItem {
  path: string
  labelNp: string
  labelEn: string
  icon: React.ElementType
  featureKey?: string
  // When true, item only appears for ORG_ADMIN — not SUPER_ADMIN or EMPLOYEE
  orgAdminOnly?: boolean
  // Phase 6 — when true, item is hidden from BRANCH_ADMIN.
  // Use for org-level pages (settings, billing, pay, holidays) that branch
  // admins should not see in their nav.
  hideForBranchAdmin?: boolean
  // Phase 9 — when true, item only appears for BRANCH_ADMIN.
  // Used for branch-scoped pages that don't make sense at the org level
  // (e.g. "My Branch" — ORG_ADMIN uses /admin/branches instead).
  branchAdminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { path: '/admin', labelNp: 'ड्यासबोर्ड', labelEn: 'Dashboard', icon: BarChart3 },
  {
    path: '/admin/qr',
    labelNp: 'QR कोड',
    labelEn: 'QR Code',
    icon: QrCode,
    featureKey: 'staticQR',
  },
  { path: '/admin/attendance', labelNp: 'उपस्थिति', labelEn: 'Attendance', icon: Clock },
  {
    path: '/admin/roster',
    labelNp: 'रोस्टर',
    labelEn: 'Roster',
    icon: Table2,
    orgAdminOnly: true,
    featureKey: 'roster',
  },
  // Phase 9 — ORG_ADMIN: list & edit geofence for branches in their org.
  // Hidden from BRANCH_ADMIN (they get the /admin/my-branch read-only view).
  {
    path: '/admin/branches',
    labelNp: 'शाखाहरू',
    labelEn: 'Branches',
    icon: Building2,
    orgAdminOnly: true,
    hideForBranchAdmin: true,
    featureKey: 'multiBranch',
  },
  // Phase 9 — BRANCH_ADMIN-only read-only view of their own branch's geofence.
  {
    path: '/admin/my-branch',
    labelNp: 'मेरो शाखा',
    labelEn: 'My Branch',
    icon: Building2,
    branchAdminOnly: true,
  },
  {
    path: '/admin/field-tracking',
    labelNp: 'फिल्ड ट्र्याकिङ',
    labelEn: 'Field Tracking',
    icon: Navigation,
    orgAdminOnly: true,
    featureKey: 'liveTracking',
  },
  {
    path: '/admin/reports',
    labelNp: 'प्रतिवेदन',
    labelEn: 'Reports',
    icon: FileText,
    featureKey: 'reports',
  },
  { path: '/users', labelNp: 'प्रयोगकर्ता', labelEn: 'Users', icon: Users },
  { path: '/leaves', labelNp: 'बिदा', labelEn: 'Leaves', icon: CalendarDays, featureKey: 'leave' },
  { path: '/payroll', labelNp: 'तलब', labelEn: 'Payroll', icon: CreditCard, featureKey: 'payroll' },
  {
    path: '/holidays',
    labelNp: 'बिदाहरू',
    labelEn: 'Holidays',
    icon: Calendar,
    featureKey: 'holidaySync',
    hideForBranchAdmin: true,
  },
  {
    path: '/admin/billing',
    labelNp: 'योजना',
    labelEn: 'Plan',
    icon: Receipt,
    orgAdminOnly: true,
    hideForBranchAdmin: true,
  },
  {
    path: '/settings',
    labelNp: 'सेटिङ्स',
    labelEn: 'Settings',
    icon: Settings,
    hideForBranchAdmin: true,
  },
  // Pay: only ORG_ADMIN should see this — SUPER_ADMIN manages billing differently
  {
    path: '/admin/pay',
    labelNp: 'भुक्तानी',
    labelEn: 'Pay',
    icon: Banknote,
    orgAdminOnly: true,
    hideForBranchAdmin: true,
  },
]

// Defined outside AdminLayout to avoid TypeScript JSX parsing errors
// that occur when components are defined inside another component's body.
function NavButton({
  item,
  active,
  isNp,
  mobile = false,
  locked = false,
  onClick,
}: {
  item: NavItem
  active: boolean
  isNp: boolean
  mobile?: boolean
  locked?: boolean
  onClick: () => void
}) {
  const isPayItem = item.path === '/admin/pay'
  // Locked (plan-gated) items stay clickable — clicking lands on the page's
  // upgrade screen. They render in a muted "glassy" style with a lock so it's
  // obvious they need an upgrade, rather than being hidden from the nav.
  if (locked) {
    return (
      <button
        onClick={onClick}
        title={isNp ? 'अपग्रेड आवश्यक' : 'Upgrade to unlock'}
        className={`flex w-full items-center gap-2.5 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 font-medium text-slate-400 transition-colors hover:border-amber-200 hover:bg-amber-50/60 hover:text-amber-700 ${mobile ? 'py-2.5 text-sm' : 'py-2 text-[13px]'}`}
      >
        <item.icon className="h-4 w-4 shrink-0 opacity-70" />
        <span className="flex-1 text-left">{isNp ? item.labelNp : item.labelEn}</span>
        <Lock className="h-3 w-3 shrink-0" />
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 font-medium transition-colors ${mobile ? 'py-2.5 text-sm' : 'py-2 text-[13px]'} ${
        active
          ? 'bg-slate-900 text-white'
          : isPayItem
            ? 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      } `}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {isNp ? item.labelNp : item.labelEn}
    </button>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, language, features, hasInactiveEmployees } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isNp = language === 'NEPALI'

  const featureMap: Record<string, boolean> = {
    // Core attendance — available on every plan (incl. FREE).
    staticQR: true,
    // Plan-gated nav items. These read the org's effective plan features from
    // the auth context, so a FREE-plan org (which has these off) hides the
    // corresponding nav items; OPERATIONS keeps them. Previously hardcoded to
    // true when only the all-features OPERATIONS plan existed.
    reports: features.reports,
    leave: features.leave,
    payroll: features.payroll,
    holidaySync: features.holidays,
    roster: features.roster,
    // Multi-branch is purely plan-gated.
    multiBranch: features.multiBranch,
    // Field tracking (live tracking) is purely plan-gated now — the per-org
    // switch was folded into featureFieldTracking 2026-06.
    liveTracking: features.fieldTracking,
  }

  // user.role may be 'SUPER_ADMIN' | 'ORG_ADMIN' | 'BRANCH_ADMIN' | 'EMPLOYEE'
  const isOrgAdmin = user?.role === 'ORG_ADMIN'
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN'

  // A plan-gated item the org's plan doesn't include. SUPER_ADMIN bypasses all
  // gates (mirrors the backend feature guard), so nothing is locked for them.
  const isLockedItem = (item: NavItem) =>
    !!item.featureKey &&
    user?.role !== 'SUPER_ADMIN' &&
    featureMap[item.featureKey] === false

  // Role-based visibility is a hard filter; plan gating no longer hides items —
  // gated items stay visible and render in a locked/upgrade style instead.
  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.orgAdminOnly && !isOrgAdmin && !isBranchAdmin) return false
    if (item.hideForBranchAdmin && isBranchAdmin) return false
    if (item.branchAdminOnly && !isBranchAdmin) return false
    return true
  })

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin'
    return pathname.startsWith(path)
  }

  // If the current route is a locked destination, show the upgrade screen in
  // place of the page so a gated feature reads as "upgrade to unlock" rather
  // than rendering a broken/empty page or a red API error.
  const lockedRoute = visibleNav.find((item) => isActive(item.path) && isLockedItem(item))

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white md:flex md:w-60 lg:w-64">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-100 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Attend Xpress
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => (
            <NavButton
              key={item.path}
              item={item}
              active={isActive(item.path)}
              isNp={isNp}
              locked={isLockedItem(item)}
              onClick={() => router.push(item.path)}
            />
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-slate-400">{isNp ? 'प्रशासक' : 'Admin'}</p>
            </div>
            {features.notifications && <NotificationBell />}
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <PoweredBy />
      </aside>

      {/* ── Mobile header ───────────────────────────────────────────── */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 hover:bg-slate-100"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5 text-slate-600" />
            ) : (
              <Menu className="h-5 w-5 text-slate-600" />
            )}
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">Attend Xpress</span>
        </div>
        <div className="flex items-center gap-1">
          {features.notifications && <NotificationBell />}
          <button onClick={logout} className="rounded-md p-1.5 text-slate-400 hover:text-red-500">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Mobile sidebar overlay ──────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute bottom-0 left-0 top-14 flex w-64 flex-col border-r border-slate-200 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {visibleNav.map((item) => (
                <NavButton
                  key={item.path}
                  item={item}
                  active={isActive(item.path)}
                  isNp={isNp}
                  mobile
                  locked={isLockedItem(item)}
                  onClick={() => {
                    router.push(item.path)
                    setSidebarOpen(false)
                  }}
                />
              ))}
            </div>
            <PoweredBy />
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="flex-1 pt-14 md:ml-60 md:pt-0 lg:ml-64">
        <BillingBanner />
        {hasInactiveEmployees && isOrgAdmin && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <p className="flex-1 text-xs font-medium text-amber-800">
                {isNp
                  ? 'कर्मचारी(हरू) ले १४+ दिनदेखि उपस्थिति जनाएका छैनन्। कृपया निष्क्रिय कर्मचारीहरू हटाउनुहोस् वा तिनीहरूलाई उपस्थित हुन भन्नुहोस्।'
                  : 'Employee(s) have not clocked in for 14+ days. Remove inactive employees or have them clock in to restore full access.'}
              </p>
              <button
                onClick={() => router.push('/admin/inactive-employees')}
                className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
              >
                {isNp ? 'व्यवस्थापन' : 'Manage'}
              </button>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {lockedRoute ? (
            <FeatureLockScreen featureKey={lockedRoute.featureKey as string} isNp={isNp} />
          ) : (
            children
          )}
          <div className="mt-8 md:hidden">
            <PoweredBy />
          </div>
        </div>
      </main>
    </div>
  )
}
