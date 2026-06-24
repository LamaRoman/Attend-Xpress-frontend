'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import { CheckCircle, Crown, Zap, MessageCircle, Mail, Minus, Users, Receipt, Clock, CalendarClock } from 'lucide-react'
import { subscriptionStatus, type SubLike } from '@/lib/subscription-status'
import { adToBS, BS_MONTHS_EN } from '@/components/BSDatePicker'

interface Subscription extends SubLike {
  plan?: { tier: string; displayName: string } | null
}

interface BillingItem {
  id: string
  event: string
  label: string
  fromPlan: string | null
  toPlan: string | null
  amount: string | null
  createdAt: string
}

interface Plan {
  id: string
  tier: string
  displayName: string
  pricePerEmployee: number
  defaultSetupFee: number | null
  annualDiscountPercent: number
  maxEmployees: number | null
  [key: string]: any
}

// Plan-gated features, keyed to PricingPlan.featureX. Each plan card shows
// which of these it includes (green check) vs. excludes (muted dash), derived
// from the live flags — so this view stays correct as the super admin retunes
// plans. Authoritative gating still lives on the backend; this is display only.
const PLAN_FEATURES: { key: string; label: string }[] = [
  { key: 'featureStaticQR', label: 'Static QR' },
  { key: 'featureRotatingQR', label: 'Rotating QR' },
  { key: 'featureRoster', label: 'Roster Scheduling' },
  { key: 'featureManualCorrection', label: 'Manual Correction' },
  { key: 'featureAuditLog', label: 'Audit Log' },
  { key: 'featureLeave', label: 'Leave Management' },
  { key: 'featureHolidays', label: 'Holiday Management' },
  { key: 'featureMultiBranch', label: 'Multi-Branch' },
  { key: 'featureFieldTracking', label: 'Field Staff Tracking (Live)' },
  { key: 'featureRouteReplay', label: 'Route Replay' },
  { key: 'featureFullPayroll', label: 'Basic Payroll' },
  { key: 'featurePayrollWorkflow', label: 'Payroll Workflow' },
  { key: 'featureReports', label: 'Reports' },
  { key: 'featureNotifications', label: 'Notifications' },
  { key: 'featureOnboarding', label: 'Onboarding' },
  { key: 'featureFileDownload', label: 'CSV & PDF Downloads' },
  { key: 'featureDocumentUpload', label: 'Document Upload' },
]

// Core capabilities every plan includes (not plan-gated).
const ALWAYS_INCLUDED = ['QR & Mobile Attendance', 'BS Calendar', 'Geofencing']

export default function PlanPage() {
  const { user, isLoading, calendarMode } = useAuth()
  const isBs = calendarMode === 'NEPALI'
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentTier, setCurrentTier] = useState<string | null>(null)
  const [sub, setSub] = useState<Subscription | null>(null)
  const [billing, setBilling] = useState<BillingItem[]>([])
  const [loading, setLoading] = useState(true)

  function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isBs) {
      const bs = adToBS(d)
      return `${BS_MONTHS_EN[bs.month - 1]} ${bs.day}, ${bs.year}`
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [plansRes, subRes, billingRes] = await Promise.all([
        api.get('/api/v1/org-settings/plans'),
        api.get('/api/v1/org-settings/subscription'),
        api.get('/api/v1/org-settings/billing-history'),
      ])
      if (plansRes.data) setPlans(plansRes.data as Plan[])
      setSub((subRes.data as Subscription) ?? null)
      setCurrentTier((subRes.data as any)?.plan?.tier ?? null)
      if (billingRes.data) setBilling(billingRes.data as BillingItem[])
      setLoading(false)
    })()
  }, [user])

  if (isLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Plans</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your current plan and everything else available
          </p>
        </div>

        {/* Current subscription — plan, status, days left, renewal/paid. */}
        {sub &&
          (() => {
            const st = subscriptionStatus(sub)
            const isFree = currentTier === 'FREE'
            return (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Current subscription
                    </p>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <Crown className="h-5 w-5 text-emerald-600" />
                      <span className="text-lg font-semibold text-slate-900">
                        {sub.plan?.displayName ?? sub.plan?.tier ?? '—'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.badgeClass}`}
                      >
                        {st.label}
                      </span>
                    </div>
                  </div>
                  {st.primaryLine && !isFree && (
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-slate-900">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {st.primaryLine}
                      </div>
                      {st.endDate && (
                        <p className="mt-0.5 text-xs text-slate-400">on {fmtDate(st.endDate)}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-100 pt-4 text-xs">
                  {!isFree && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                      {sub.billingCycle === 'ANNUAL' ? 'Annual billing' : 'Monthly billing'}
                    </div>
                  )}
                  {!isFree && (sub.nextBillingDate || sub.currentPeriodEnd) && (
                    <div className="text-slate-500">
                      Next renewal:{' '}
                      <span className="font-medium text-slate-700">
                        {fmtDate(sub.nextBillingDate ?? sub.currentPeriodEnd)}
                      </span>
                    </div>
                  )}
                  <div className="text-slate-500">
                    Payment:{' '}
                    {sub.paidAt ? (
                      <span className="font-medium text-emerald-600">
                        Paid · {fmtDate(sub.paidAt)}
                      </span>
                    ) : (
                      <span className="font-medium text-amber-600">Not recorded</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.tier === currentTier
            const annualDiscount = Number(plan.annualDiscountPercent ?? 0)
            return (
              <div
                key={plan.tier}
                className={
                  'flex flex-col rounded-xl border bg-white p-6 ' +
                  (isCurrent
                    ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/10'
                    : 'border-slate-200')
                }
              >
                {isCurrent && (
                  <div className="mb-4">
                    <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-white">
                      CURRENT PLAN
                    </span>
                  </div>
                )}
                <div className="mb-1 flex items-center gap-2">
                  <Crown className={'h-5 w-5 ' + (isCurrent ? 'text-emerald-600' : 'text-slate-400')} />
                  <h2 className="text-lg font-semibold text-slate-900">{plan.displayName}</h2>
                </div>
                <div className="mb-1 mt-2">
                  {plan.pricePerEmployee > 0 ? (
                    <>
                      <span className="text-3xl font-bold text-slate-900">
                        Rs. {plan.pricePerEmployee}
                      </span>
                      <span className="ml-1 text-sm text-slate-500">/emp/month</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-slate-900">Free</span>
                  )}
                  {annualDiscount > 0 && (
                    <span className="ml-2 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-600">
                      {annualDiscount}% off annually
                    </span>
                  )}
                </div>
                <p className="mb-1 text-xs text-slate-500">
                  {plan.defaultSetupFee
                    ? `Rs. ${Number(plan.defaultSetupFee).toLocaleString()} one-time setup fee`
                    : 'No setup fee'}
                </p>
                <p className="mb-5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  {plan.maxEmployees == null
                    ? 'Unlimited employees'
                    : `Up to ${plan.maxEmployees} employees`}
                </p>

                <div className="flex-1 space-y-2.5">
                  {PLAN_FEATURES.map((f) => {
                    const on = !!plan[f.key]
                    return (
                      <div key={f.key} className="flex items-center gap-2.5">
                        {on ? (
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                        )}
                        <span className={'text-xs ' + (on ? 'text-slate-700' : 'text-slate-400')}>
                          {f.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Included in all plans
                  </p>
                  <div className="space-y-1.5">
                    {ALWAYS_INCLUDED.map((label) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span className="text-xs text-slate-500">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {isCurrent && annualDiscount > 0 && (
                  <div className="mt-5 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                    <p className="text-[11px] text-violet-700">
                      Pay annually — save {annualDiscount}%. Contact us to switch billing cycles.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Billing history — curated statement (payments & plan changes). The
            full audit trail (internal notes, actor, pricing events) stays
            super-admin only. */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Billing history</h2>
          </div>
          {billing.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">No billing activity yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Payments and plan changes will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="divide-y divide-slate-100">
                {billing.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{b.label}</p>
                      <p className="text-xs text-slate-400">{fmtDate(b.createdAt)}</p>
                    </div>
                    {b.amount != null && (
                      <span className="shrink-0 text-sm font-semibold text-slate-900">
                        Rs. {Number(b.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact / billing questions */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Need help?</h3>
          <p className="mb-3 text-xs text-slate-500">
            Contact us to change your plan, billing cycle, or for invoice questions.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/9779761154213"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" /> +977 9761154213
            </a>
            <a
              href="mailto:support@zentaralabs.com"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Mail className="h-3.5 w-3.5" /> support@zentaralabs.com
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
