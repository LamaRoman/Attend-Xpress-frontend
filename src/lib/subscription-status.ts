// Shared subscription-status logic for the org-admin billing page and the
// super-admin subscriptions list, so both show the same "what plan / what
// status / how many days left" summary consistently.

export interface SubLike {
  status: string
  billingCycle?: string | null
  trialEndsAt?: string | null
  graceEndsAt?: string | null
  currentPeriodEnd?: string | null
  nextBillingDate?: string | null
  paidAt?: string | null
}

export interface SubStatusSummary {
  /** Human label for the status badge, e.g. "Trial", "Grace period". */
  label: string
  /** Tailwind classes for the status badge. */
  badgeClass: string
  /** Whole days until the relevant deadline (trial/grace/renewal), or null. */
  daysLeft: number | null
  /** One-line countdown, e.g. "12 days left in trial". null when N/A. */
  primaryLine: string | null
  /** ISO date the countdown refers to, for an optional "· on <date>" suffix. */
  endDate: string | null
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

function plural(n: number) {
  return n === 1 ? 'day' : 'days'
}

export function subscriptionStatus(sub: SubLike | null | undefined): SubStatusSummary {
  if (!sub) {
    return { label: 'No subscription', badgeClass: 'bg-slate-100 text-slate-600', daysLeft: null, primaryLine: null, endDate: null }
  }

  switch (sub.status) {
    case 'TRIALING': {
      const d = daysUntil(sub.trialEndsAt)
      return {
        label: 'Trial',
        badgeClass: 'bg-blue-50 text-blue-700',
        daysLeft: d,
        primaryLine: d == null ? null : d === 0 ? 'Trial ends today' : `${d} ${plural(d)} left in trial`,
        endDate: sub.trialEndsAt ?? null,
      }
    }
    case 'GRACE_PERIOD': {
      const d = daysUntil(sub.graceEndsAt)
      return {
        label: 'Grace period',
        badgeClass: 'bg-amber-50 text-amber-700',
        daysLeft: d,
        primaryLine: d == null ? null : d === 0 ? 'Grace period ends today' : `Grace period ends in ${d} ${plural(d)}`,
        endDate: sub.graceEndsAt ?? null,
      }
    }
    case 'PAST_DUE': {
      const d = daysUntil(sub.graceEndsAt)
      return {
        label: 'Past due',
        badgeClass: 'bg-amber-50 text-amber-700',
        daysLeft: d,
        primaryLine: 'Payment past due',
        endDate: sub.graceEndsAt ?? null,
      }
    }
    case 'ACTIVE': {
      const end = sub.nextBillingDate ?? sub.currentPeriodEnd ?? null
      const d = daysUntil(end)
      return {
        label: 'Active',
        badgeClass: 'bg-emerald-50 text-emerald-700',
        daysLeft: d,
        primaryLine: d == null ? null : d === 0 ? 'Renews today' : `Renews in ${d} ${plural(d)}`,
        endDate: end,
      }
    }
    case 'SUSPENDED':
      return { label: 'Suspended', badgeClass: 'bg-rose-50 text-rose-700', daysLeft: null, primaryLine: 'Subscription suspended', endDate: null }
    case 'CANCELLED':
      return { label: 'Cancelled', badgeClass: 'bg-slate-100 text-slate-600', daysLeft: null, primaryLine: 'Subscription cancelled', endDate: null }
    case 'EXPIRED':
      return { label: 'Expired', badgeClass: 'bg-rose-50 text-rose-700', daysLeft: null, primaryLine: 'Subscription expired', endDate: null }
    default:
      return { label: sub.status, badgeClass: 'bg-slate-100 text-slate-600', daysLeft: null, primaryLine: null, endDate: null }
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
