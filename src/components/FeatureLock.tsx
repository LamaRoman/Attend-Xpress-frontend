'use client'

// Reusable "locked → upgrade" UI for plan-gated features. Three presentations,
// one shared metadata source (lib/feature-meta):
//
//   <FeatureLockScreen />  full-page state for a locked destination (a whole
//                          page/tab the org's plan doesn't include)
//   <UpgradeStrip />       calm inline banner for an action/section gate
//                          (replaces alarming red "not available" errors)
//   <LockedButton />       a disabled-looking action that routes to upgrade
//
// All three deep-link the Upgrade CTA to the billing/plan page.

import { useRouter } from 'next/navigation'
import { Lock, ArrowUpRight } from 'lucide-react'
import { featureMeta, UPGRADE_HREF } from '@/lib/feature-meta'

function labelOf(key: string, isNp: boolean) {
  const m = featureMeta(key)
  return m ? (isNp ? m.labelNp : m.labelEn) : key
}
function blurbOf(key: string, isNp: boolean) {
  const m = featureMeta(key)
  return m ? (isNp ? m.blurbNp : m.blurbEn) : ''
}

// ── Full-page lock screen ──────────────────────────────────────────────
export function FeatureLockScreen({
  featureKey,
  isNp = false,
}: {
  featureKey: string
  isNp?: boolean
}) {
  const router = useRouter()
  const meta = featureMeta(featureKey)
  const Icon = meta?.icon ?? Lock

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <Icon className="h-6 w-6 text-amber-600" />
        </div>
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
          <Lock className="h-3 w-3" />
          {isNp ? 'अपग्रेड आवश्यक' : 'Upgrade required'}
        </div>
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
          {labelOf(featureKey, isNp)}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          {blurbOf(featureKey, isNp)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {isNp
            ? 'यो सुविधा तपाईंको हालको प्लानमा छैन।'
            : 'This feature isn’t included in your current plan.'}
        </p>
        <button
          onClick={() => router.push(UPGRADE_HREF)}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          {isNp ? 'अपग्रेड विकल्पहरू हेर्नुहोस्' : 'See upgrade options'}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Inline upgrade strip ───────────────────────────────────────────────
export function UpgradeStrip({
  featureKey,
  isNp = false,
  className = '',
}: {
  featureKey: string
  isNp?: boolean
  className?: string
}) {
  const router = useRouter()
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <Lock className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="text-xs font-medium text-amber-800">
          {labelOf(featureKey, isNp)}{' '}
          <span className="font-normal text-amber-700">
            {isNp
              ? '— तपाईंको हालको प्लानमा उपलब्ध छैन।'
              : '— not included in your current plan.'}
          </span>
        </span>
      </div>
      <button
        onClick={() => router.push(UPGRADE_HREF)}
        className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
      >
        {isNp ? 'अपग्रेड' : 'Upgrade'}
      </button>
    </div>
  )
}

// ── Locked action button ───────────────────────────────────────────────
export function LockedButton({
  featureKey,
  isNp = false,
  label,
  className = '',
}: {
  featureKey: string
  isNp?: boolean
  /** Optional override for the button text; defaults to the feature label. */
  label?: string
  className?: string
}) {
  const router = useRouter()
  const text = label ?? labelOf(featureKey, isNp)
  return (
    <button
      onClick={() => router.push(UPGRADE_HREF)}
      title={
        isNp
          ? 'तपाईंको हालको प्लानमा उपलब्ध छैन — अपग्रेड गर्नुहोस्'
          : 'Not included in your current plan — upgrade to unlock'
      }
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 ${className}`}
    >
      <Lock className="h-3.5 w-3.5" />
      {text}
    </button>
  )
}
