'use client'

import { QrCode, Check, TrendingUp } from 'lucide-react'

interface AuthBrandingProps {
  isNp?: boolean
  title: string
  subtitle: string
}

/**
 * Left-hand brand panel for the auth pages (login / signup).
 * A dark, on-brand showcase: drifting gradient blobs + a dot grid, with
 * floating frosted-glass cards that mock the real product (attendance,
 * QR check-in, payroll). Fully self-contained — no images, no network.
 * Hidden below lg; respects prefers-reduced-motion.
 */
export default function AuthBranding({ isNp = false, title, subtitle }: AuthBrandingProps) {
  return (
    <div className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:w-1/2 lg:flex-col">
      {/* Drifting colour blobs */}
      <div
        aria-hidden
        className="ab-blob pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl"
        style={{ animation: 'ab-driftA 18s ease-in-out infinite' }}
      />
      <div
        aria-hidden
        className="ab-blob pointer-events-none absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-emerald-500/20 blur-3xl"
        style={{ animation: 'ab-driftB 22s ease-in-out infinite' }}
      />
      <div
        aria-hidden
        className="ab-blob pointer-events-none absolute right-10 top-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl"
        style={{ animation: 'ab-driftA 26s ease-in-out infinite' }}
      />

      {/* Dot grid, faded toward the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, #000 40%, transparent 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md">
            <span className="text-sm font-bold text-slate-950">AX</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Attend Xpress</span>
        </div>

        {/* Headline + product showcase */}
        <div>
          <h2 className="mb-3 max-w-md text-4xl font-bold leading-tight text-white">{title}</h2>
          <p className="mb-10 max-w-md text-lg leading-relaxed text-slate-400">{subtitle}</p>

          {/* Floating cards */}
          <div className="relative h-80 w-full max-w-lg">
            {/* Attendance summary card */}
            <div
              className="absolute left-0 top-0 w-80 rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-md"
              style={{ animation: 'ab-floatA 7s ease-in-out infinite' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-400"
                    style={{ animation: 'ab-pulse 2.4s ease-in-out infinite' }}
                  />
                  <span className="text-xs font-medium text-slate-300">
                    {isNp ? 'आज उपस्थित' : 'Present today'}
                  </span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                  {isNp ? 'प्रत्यक्ष' : 'Live'}
                </span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-4xl font-bold text-white">24</span>
                <span className="mb-1 text-base text-slate-400">/ 26</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: '92%' }} />
              </div>
              {/* Avatar stack */}
              <div className="mt-4 flex items-center">
                {['#6366f1', '#10b981', '#f59e0b', '#ec4899'].map((c, i) => (
                  <div
                    key={i}
                    className="-ml-2 h-8 w-8 rounded-full border-2 border-slate-900 first:ml-0"
                    style={{ background: c }}
                  />
                ))}
                <span className="ml-2 text-xs text-slate-400">+18</span>
              </div>
            </div>

            {/* QR check-in chip */}
            <div
              className="absolute right-0 top-28 w-72 rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-md"
              style={{ animation: 'ab-floatB 8s ease-in-out infinite' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white">
                  <QrCode className="h-7 w-7 text-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-white">Ramesh K.</p>
                  <p className="text-sm text-slate-400">
                    {isNp ? 'हाजिर भयो · ९:०२' : 'Checked in · 9:02 AM'}
                  </p>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/20">
                  <Check className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Payroll mini card */}
            <div
              className="absolute bottom-0 left-8 w-72 rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-md"
              style={{ animation: 'ab-floatA 9s ease-in-out infinite' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">
                    {isNp ? 'यस महिनाको तलब' : 'Payroll · this month'}
                  </p>
                  <p className="mt-0.5 text-xl font-bold text-white">Rs. 4,80,000</p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Local keyframes — scoped, self-contained, motion-safe */}
      <style>{`
        @keyframes ab-floatA { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes ab-floatB { 0%,100% { transform: translateY(0) } 50% { transform: translateY(9px) } }
        @keyframes ab-driftA { 0%,100% { transform: translate(0,0) } 50% { transform: translate(34px,-22px) } }
        @keyframes ab-driftB { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-28px,24px) } }
        @keyframes ab-pulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: 0.4; transform: scale(0.82) } }
        @media (prefers-reduced-motion: reduce) {
          .ab-blob, [style*="ab-float"], [style*="ab-pulse"] { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
