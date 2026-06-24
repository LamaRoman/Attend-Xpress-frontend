'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { ArrowLeft, Receipt, RefreshCw } from 'lucide-react'

interface BillingLogRow {
  id: string
  event: string
  fromPlan: string | null
  toPlan: string | null
  fromStatus: string | null
  toStatus: string | null
  amount: string | null
  employeeCount: number | null
  note: string | null
  performedBy: string | null
  createdAt: string
}

// Super admins see the full, unfiltered audit trail — every event code, the
// raw note, the actor. (Org admins get the curated statement on /admin/billing.)
const EVENT_STYLE: Record<string, string> = {
  PAYMENT: 'bg-emerald-50 text-emerald-700',
  PLAN_ASSIGNED: 'bg-blue-50 text-blue-700',
  PLAN_CHANGED: 'bg-blue-50 text-blue-700',
  REACTIVATED: 'bg-emerald-50 text-emerald-700',
  TRIAL_EXTENDED: 'bg-violet-50 text-violet-700',
  SETUP_FEE_WAIVED: 'bg-violet-50 text-violet-700',
  PRICE_OVERRIDDEN: 'bg-amber-50 text-amber-700',
  CUSTOM_PRICE_EXPIRED: 'bg-amber-50 text-amber-700',
  PAST_DUE: 'bg-amber-50 text-amber-700',
  GRACE_PERIOD_STARTED: 'bg-amber-50 text-amber-700',
  SUSPENDED: 'bg-rose-50 text-rose-700',
  SUSPENDED_GRACE_EXPIRED: 'bg-rose-50 text-rose-700',
  EXPIRED_MANUAL: 'bg-rose-50 text-rose-700',
  EXPIRED_ABANDONED: 'bg-rose-50 text-rose-700',
}

export default function BillingLogPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const orgId = String(params.organizationId)

  const [rows, setRows] = useState<BillingLogRow[]>([])
  const [orgName, setOrgName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [logRes, orgRes] = await Promise.all([
      api.get(`/api/v1/super-admin/subscriptions/${orgId}/billing-log`),
      api.get(`/api/v1/super-admin/organizations/${orgId}`),
    ])
    if (logRes.data) setRows(logRes.data as BillingLogRow[])
    const od = orgRes.data as Record<string, unknown> | undefined
    const org = (od?.organization ?? od) as { name?: string } | undefined
    if (org?.name) setOrgName(org.name)
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
      </div>
    )
  }
  if (!user) return null

  const fmtAmount = (a: string | null) =>
    a == null ? '—' : `Rs. ${Number(a).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/super-admin/subscriptions')}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Subscriptions
              </button>
              <span className="text-slate-300">|</span>
              <Receipt className="h-4 w-4 text-slate-900" />
              <span className="text-sm font-semibold text-slate-900">Billing history</span>
              {orgName && <span className="text-xs text-slate-500">· {orgName}</span>}
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            <div className="col-span-3">Date</div>
            <div className="col-span-2">Event</div>
            <div className="col-span-3">Detail</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2">By</div>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.map((r) => {
              const planChange =
                r.fromPlan || r.toPlan
                  ? `${r.fromPlan ?? '—'} → ${r.toPlan ?? '—'}`
                  : null
              const statusChange =
                r.fromStatus || r.toStatus
                  ? `${r.fromStatus ?? '—'} → ${r.toStatus ?? '—'}`
                  : null
              return (
                <div key={r.id} className="grid grid-cols-12 gap-4 px-5 py-3.5">
                  <div className="col-span-3">
                    <p className="text-sm text-slate-900">
                      {new Date(r.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${EVENT_STYLE[r.event] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {r.event}
                    </span>
                  </div>
                  <div className="col-span-3 min-w-0">
                    {planChange && <p className="truncate text-xs text-slate-600">{planChange}</p>}
                    {statusChange && (
                      <p className="truncate text-xs text-slate-500">{statusChange}</p>
                    )}
                    {r.note && <p className="truncate text-xs text-slate-400" title={r.note}>{r.note}</p>}
                    {r.employeeCount != null && (
                      <p className="text-[11px] text-slate-400">{r.employeeCount} employees</p>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-slate-900">
                    {fmtAmount(r.amount)}
                  </div>
                  <div className="col-span-2 min-w-0">
                    <p className="truncate text-xs text-slate-500" title={r.performedBy ?? 'System'}>
                      {r.performedBy ? r.performedBy : 'System'}
                    </p>
                  </div>
                </div>
              )
            })}

            {!loading && rows.length === 0 && (
              <div className="px-5 py-16 text-center">
                <Receipt className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-900">No billing events yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Plan changes, payments and status transitions will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
