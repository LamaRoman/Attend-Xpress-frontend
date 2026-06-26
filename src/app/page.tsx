import type { Metadata } from 'next'
import Link from 'next/link'
import {
  QrCode,
  Navigation,
  Route,
  CreditCard,
  CalendarDays,
  Building2,
  Table2,
  Calendar,
  FileText,
  Bell,
  Upload,
  ShieldCheck,
  Check,
  ArrowRight,
  MapPin,
  Smartphone,
  Globe,
  type LucideIcon,
} from 'lucide-react'
import AuthedRedirect from '@/components/AuthedRedirect'
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  COMPANY_NAME,
  FEATURES,
  FAQS,
} from '@/lib/site'

// The homepage is the one page we most want indexed, so give it an absolute
// title and its own canonical. Everything else inherits from the root layout.
export const metadata: Metadata = {
  title: {
    absolute:
      'Attend Xpress — Attendance, Field Tracking & Payroll Software for Nepal',
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
}

const ICONS: Record<string, LucideIcon> = {
  QrCode,
  Navigation,
  Route,
  CreditCard,
  CalendarDays,
  Building2,
  Table2,
  Calendar,
  FileText,
  Bell,
  Upload,
  ShieldCheck,
}

// Structured data: tells Google and AI engines exactly what this is, who makes
// it, what it does, and answers common questions (FAQ rich results). CSP allows
// inline scripts, so this renders server-side in the initial HTML.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: COMPANY_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.svg`,
      brand: { '@type': 'Brand', name: SITE_NAME },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: ['en', 'ne'],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      featureList: FEATURES.map((f) => f.title),
      publisher: { '@id': `${SITE_URL}/#organization` },
      audience: {
        '@type': 'BusinessAudience',
        audienceType: 'Businesses in Nepal',
        geographicArea: { '@type': 'Country', name: 'Nepal' },
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
}

export default function Home() {
  return (
    <>
      <AuthedRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-white text-slate-900">
        <SiteHeader />
        <main>
          <Hero />
          <FeatureGrid />
          <BuiltForNepal />
          <HowItWorks />
          <WhoItsFor />
          <Faq />
          <CtaBand />
        </main>
        <SiteFooter />
      </div>
    </>
  )
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={SITE_NAME}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
            AX
          </span>
          <span className="text-lg font-bold tracking-tight">{SITE_NAME}</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="hover:text-slate-900">Features</a>
          <a href="#how-it-works" className="hover:text-slate-900">How it works</a>
          <a href="#faq" className="hover:text-slate-900">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-emerald-500/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            Made in Nepal · English &amp; नेपाली
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            {SITE_TAGLINE}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            {SITE_NAME} replaces paper registers and costly biometric machines with
            QR-code clock-ins, live GPS tracking for field teams, and payroll on the
            Bikram Sambat calendar — for every branch, from one dashboard.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            QR attendance · Live field tracking · Leave · Payroll · Multi-branch
          </p>
        </div>
      </div>
    </section>
  )
}

function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to run attendance &amp; payroll
        </h2>
        <p className="mt-4 text-lg text-slate-600">
          One platform for clock-ins, field teams, leave, schedules and pay —
          purpose-built for how businesses in Nepal actually work.
        </p>
      </div>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = ICONS[f.icon] ?? Check
          return (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.blurb}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BuiltForNepal() {
  const points = [
    {
      icon: Calendar,
      title: 'Bikram Sambat, end to end',
      body: 'Attendance, holidays, leave and payroll cycles all run on the Nepali calendar — not bolted on as an afterthought.',
    },
    {
      icon: Globe,
      title: 'English & नेपाली',
      body: 'Your whole team can use the app in the language they are comfortable with, on web and mobile.',
    },
    {
      icon: Smartphone,
      title: 'No hardware to buy',
      body: 'Skip expensive fingerprint machines. A phone and a printed QR code are all a branch needs to get started.',
    },
  ]
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for Nepal
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Most attendance tools are adapted from abroad. {SITE_NAME} was designed
            for Nepali businesses from the first line of code.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {points.map((p) => (
            <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      n: '1',
      title: 'Set up your organization',
      body: 'Add branches, geofences, staff and working schedules. Invite admins and accountants with the right access.',
    },
    {
      n: '2',
      title: 'Staff clock in by QR',
      body: 'Employees scan a workplace QR code to clock in and out. Field staff are tracked live on a map while on shift.',
    },
    {
      n: '3',
      title: 'Run payroll & reports',
      body: 'Approve attendance, process payroll with sign-off, and export the reports you need — all in BS dates.',
    },
  ]
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
        <p className="mt-4 text-lg text-slate-600">
          From setup to payday in three steps.
        </p>
      </div>
      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">
              {s.n}
            </div>
            <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-slate-600">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function WhoItsFor() {
  const cards = [
    {
      icon: Navigation,
      title: 'Field & mobile teams',
      body: 'Sales, delivery, service technicians and security staff who work away from a desk. Track location live and replay routes.',
    },
    {
      icon: Building2,
      title: 'Multi-branch businesses',
      body: 'Retail chains, franchises and companies with several locations — each branch with its own geofence and admins.',
    },
    {
      icon: Table2,
      title: 'Offices & shift workers',
      body: 'Office teams and shift-based workplaces that need accurate attendance, leave tracking and clean payroll.',
    },
  ]
  return (
    <section className="bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Who it&apos;s for
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            If your people clock in somewhere, {SITE_NAME} fits.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
      </div>
      <div className="mt-12 divide-y divide-slate-200">
        {FAQS.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-left text-lg font-semibold">
              {f.q}
              <span className="ml-4 text-slate-400 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 px-8 py-16 text-center shadow-xl">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to ditch the paper register?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-indigo-100">
          Start tracking attendance, field staff and payroll with {SITE_NAME} today.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
            AX
          </span>
          <span className="text-sm text-slate-600">
            {SITE_NAME} — a product of {COMPANY_NAME}
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900">Features</a>
          <Link href="/login" className="hover:text-slate-900">Log in</Link>
          <Link href="/signup" className="hover:text-slate-900">Sign up</Link>
        </nav>
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
      </div>
    </footer>
  )
}
