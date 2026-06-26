import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { SITE_NAME, SITE_URL, COMPANY_NAME } from '@/lib/site'
import { ARTICLES, formatDate } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog — Attendance, Payroll & HR for Nepal',
  description:
    'Practical guides on attendance, field-staff tracking, payroll and HR for businesses in Nepal — from the team behind Attend Xpress.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: `Blog · ${SITE_NAME}`,
    description:
      'Practical guides on attendance, field-staff tracking, payroll and HR for businesses in Nepal.',
    url: `${SITE_URL}/blog`,
    type: 'website',
  },
}

// Blog as a structured collection so search engines understand the index page
// lists the individual articles.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: `${SITE_NAME} Blog`,
  url: `${SITE_URL}/blog`,
  publisher: { '@type': 'Organization', name: COMPANY_NAME, url: SITE_URL },
  blogPost: ARTICLES.map((a) => ({
    '@type': 'BlogPosting',
    headline: a.title,
    description: a.description,
    datePublished: a.date,
    url: `${SITE_URL}/blog/${a.slug}`,
  })),
}

export default function BlogIndex() {
  const sorted = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label={SITE_NAME}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              AX
            </span>
            <span className="text-lg font-bold tracking-tight">{SITE_NAME}</span>
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Get started
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          {SITE_NAME} Blog
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Attendance, payroll &amp; HR — written for Nepal
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Practical, no-fluff guides on running attendance, field staff and payroll for a
          business in Nepal. Written by the team building {SITE_NAME}.
        </p>

        <div className="mt-12 grid gap-6">
          {sorted.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group rounded-2xl border border-slate-200 p-6 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
                  {a.category}
                </span>
                <span>{formatDate(a.date)}</span>
                <span>·</span>
                <span>{a.readMinutes} min read</span>
              </div>
              <h2 className="mt-4 text-xl font-bold tracking-tight group-hover:text-indigo-700 sm:text-2xl">
                {a.title}
              </h2>
              <p className="mt-2 text-slate-600">{a.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600">
                Read article
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-16 border-t border-slate-200 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {SITE_NAME}
          </Link>
        </div>
      </div>
    </main>
  )
}
