'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import {
  BarChart3,
  Clock,
  FileText,
  CalendarDays,
  CreditCard,
  LogOut,
  Menu,
  X,
  Lock,
} from 'lucide-react'
import { useState } from 'react'
import NotificationBell from './NotificationBell'
import PoweredBy from './PoweredBy'
import { FeatureLockScreen } from './FeatureLock'
import { t, Language } from '@/lib/i18n'

interface NavItem {
  path: string
  labelKey: string
  icon: React.ElementType
  // Short feature name (matches auth-context features.*). When the org's plan
  // doesn't include it, the item renders locked instead of being hidden.
  featureKey?: 'leave' | 'payroll' | 'reports'
}

const NAV_ITEMS: NavItem[] = [
  { path: '/accountant', labelKey: 'nav.dashboard', icon: BarChart3 },
  { path: '/accountant/attendance', labelKey: 'nav.attendance', icon: Clock },
  { path: '/leaves', labelKey: 'nav.leaves', icon: CalendarDays, featureKey: 'leave' },
  { path: '/payroll', labelKey: 'nav.payroll', icon: CreditCard, featureKey: 'payroll' },
  { path: '/accountant/reports', labelKey: 'nav.reports', icon: FileText, featureKey: 'reports' },
]

function NavButton({
  item,
  active,
  lang,
  mobile = false,
  locked = false,
  onClick,
}: {
  item: NavItem
  active: boolean
  lang: Language
  mobile?: boolean
  locked?: boolean
  onClick: () => void
}) {
  const isNp = lang === 'NEPALI'
  if (locked) {
    return (
      <button
        onClick={onClick}
        title={isNp ? 'अपग्रेड आवश्यक' : 'Upgrade to unlock'}
        className={`flex w-full items-center gap-2.5 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 font-medium text-slate-400 transition-colors hover:border-amber-200 hover:bg-amber-50/60 hover:text-amber-700 ${mobile ? 'py-2.5 text-sm' : 'py-2 text-[13px]'}`}
      >
        <item.icon className="h-4 w-4 shrink-0 opacity-70" />
        <span className="flex-1 text-left">{t(item.labelKey, lang)}</span>
        <Lock className="h-3 w-3 shrink-0" />
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 font-medium transition-colors ${mobile ? 'py-2.5 text-sm' : 'py-2 text-[13px]'} ${
        active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      } `}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {t(item.labelKey, lang)}
    </button>
  )
}

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, language, features } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const lang = language as Language

  const isActive = (path: string) => {
    if (path === '/accountant') return pathname === '/accountant'
    if (path === '/payroll') return pathname.startsWith('/payroll')
    return pathname.startsWith(path)
  }

  // Plan-gated item the org's plan doesn't include. SUPER_ADMIN bypasses gates.
  const isLockedItem = (item: NavItem) =>
    !!item.featureKey && user?.role !== 'SUPER_ADMIN' && features[item.featureKey] === false

  const lockedRoute = NAV_ITEMS.find((item) => isActive(item.path) && isLockedItem(item))

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white md:flex md:w-60 lg:w-64">
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-100 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            {t('common.appName', lang)}
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.path}
              item={item}
              active={isActive(item.path)}
              lang={lang}
              locked={isLockedItem(item)}
              onClick={() => router.push(item.path)}
            />
          ))}
        </nav>

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
              <p className="truncate text-xs text-slate-400">
                {lang === 'NEPALI' ? 'लेखापाल' : 'Accountant'}
              </p>
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

      {/* Mobile header */}
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
          <span className="text-sm font-semibold text-slate-900">{t('common.appName', lang)}</span>
        </div>
        <div className="flex items-center gap-1">
          {features.notifications && <NotificationBell />}
          <button onClick={logout} className="rounded-md p-1.5 text-slate-400 hover:text-red-500">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute bottom-0 left-0 top-14 flex w-64 flex-col border-r border-slate-200 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {NAV_ITEMS.map((item) => (
                <NavButton
                  key={item.path}
                  item={item}
                  active={isActive(item.path)}
                  lang={lang}
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

      {/* Main content */}
      <main className="flex-1 pt-14 md:ml-60 md:pt-0 lg:ml-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {lockedRoute ? (
            <FeatureLockScreen
              featureKey={lockedRoute.featureKey as string}
              isNp={lang === 'NEPALI'}
            />
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
