'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock, X } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { toNepaliDigits } from '@/components/BSDatePicker'

/**
 * Slim billing-state strip shown above every admin page (mounted in
 * AdminLayout). It only appears for the two states that need the admin's
 * attention:
 *   - TRIALING     — but only in the final stretch (≤ TRIAL_WARNING_DAYS left).
 *   - GRACE_PERIOD — the whole time (grace is already short/urgent).
 * All other states (active, suspended, expired, no subscription) render nothing
 * here — active needs no nudge, and hard-stopped states are gated by FeatureLock.
 *
 * The subscription + derived status come from useAuth(), which fetches them once
 * for admins. Dismissal is per-day: closing it hides the banner until the next
 * calendar day or until the billing state changes, so it never becomes wallpaper.
 */

const TRIAL_WARNING_DAYS = 5

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export default function BillingBanner() {
  const { subscription, subStatus, language } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'

  const status = subscription?.status ?? null
  const daysLeft = subStatus?.daysLeft ?? null

  const shouldShow =
    status === 'GRACE_PERIOD' ||
    (status === 'TRIALING' && daysLeft != null && daysLeft <= TRIAL_WARNING_DAYS)

  // Per-day dismissal, keyed by state + date so it re-surfaces the next day or
  // when the state changes (e.g. trial → grace).
  const dismissKey = shouldShow && status ? `billing-banner-dismissed:${status}:${todayKey()}` : null
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!dismissKey) return
    try {
      setDismissed(localStorage.getItem(dismissKey) === '1')
    } catch {
      setDismissed(false)
    }
  }, [dismissKey])

  if (!shouldShow || dismissed) return null

  const isTrial = status === 'TRIALING'
  const d = daysLeft ?? 0
  const dLabel = isNp ? toNepaliDigits(d) : String(d)

  const message = isTrial
    ? d === 0
      ? isNp
        ? 'तपाईंको परीक्षण अवधि आज सकिन्छ। पूर्ण पहुँच कायम राख्न अपग्रेड गर्नुहोस्।'
        : 'Your trial ends today. Upgrade to keep full access.'
      : isNp
        ? `तपाईंको परीक्षण अवधि ${dLabel} दिनमा सकिन्छ। पूर्ण पहुँच कायम राख्न अपग्रेड गर्नुहोस्।`
        : `${dLabel} ${d === 1 ? 'day' : 'days'} left in your trial. Upgrade to keep full access.`
    : d === 0
      ? isNp
        ? 'तपाईंको ग्रेस अवधि आज सकिन्छ। सेवा जारी राख्न भुक्तानी गर्नुहोस्।'
        : 'Your grace period ends today. Make a payment to keep your service active.'
      : isNp
        ? `तपाईंको ग्रेस अवधि ${dLabel} दिनमा सकिन्छ। सेवा जारी राख्न भुक्तानी गर्नुहोस्।`
        : `Your grace period ends in ${dLabel} ${d === 1 ? 'day' : 'days'}. Make a payment to keep your service active.`

  const ctaLabel = isNp ? 'बिलिङ व्यवस्थापन' : 'Manage billing'

  // Blue for trial (informational), amber for grace (warning).
  const tone = isTrial
    ? {
        wrap: 'border-blue-200 bg-blue-50',
        icon: 'text-blue-600',
        text: 'text-blue-800',
        btn: 'bg-blue-600 hover:bg-blue-700',
        close: 'text-blue-500 hover:bg-blue-100',
      }
    : {
        wrap: 'border-amber-200 bg-amber-50',
        icon: 'text-amber-600',
        text: 'text-amber-800',
        btn: 'bg-amber-600 hover:bg-amber-700',
        close: 'text-amber-500 hover:bg-amber-100',
      }

  const Icon = isTrial ? Clock : AlertTriangle

  function handleDismiss() {
    if (dismissKey) {
      try {
        localStorage.setItem(dismissKey, '1')
      } catch {
        /* ignore storage failures — banner just won't persist dismissal */
      }
    }
    setDismissed(true)
  }

  return (
    <div className={`border-b ${tone.wrap} px-4 py-3 sm:px-6 lg:px-8`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <Icon className={`h-4 w-4 shrink-0 ${tone.icon}`} />
        <p className={`flex-1 text-xs font-medium ${tone.text}`}>{message}</p>
        <button
          onClick={() => router.push('/admin/billing')}
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${tone.btn}`}
        >
          {ctaLabel}
        </button>
        <button
          onClick={handleDismiss}
          aria-label={isNp ? 'बन्द गर्नुहोस्' : 'Dismiss'}
          className={`shrink-0 rounded-md p-1 transition-colors ${tone.close}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
