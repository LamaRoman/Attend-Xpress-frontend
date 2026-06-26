import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { SITE_NAME, SITE_URL, COMPANY_NAME } from '@/lib/site'
import { ARTICLES, getArticle, formatDate } from '@/lib/blog'
import { ARTICLE_CONTENT } from '@/lib/articles'

// Pre-render every article at build time.
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}

  const url = `${SITE_URL}/blog/${article.slug}`
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      type: 'article',
      publishedTime: article.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
    },
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = getArticle(slug)
  const Body = ARTICLE_CONTENT[slug]
  if (!article || !Body) notFound()

  const url = `${SITE_URL}/blog/${article.slug}`

  // Article structured data + breadcrumbs help Google show rich results and
  // help AI engines attribute and cite the content.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.description,
        datePublished: article.date,
        dateModified: article.date,
        url,
        mainEntityOfPage: url,
        author: { '@type': 'Organization', name: COMPANY_NAME, url: SITE_URL },
        publisher: {
          '@type': 'Organization',
          name: COMPANY_NAME,
          url: SITE_URL,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.svg` },
        },
        articleSection: article.category,
        inLanguage: 'en',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: article.title, item: url },
        ],
      },
    ],
  }

  const related = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 2)

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
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

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          All articles
        </Link>

        <div className="mt-6 flex items-center gap-3 text-xs font-medium text-slate-500">
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
            {article.category}
          </span>
          <span>{formatDate(article.date)}</span>
          <span>·</span>
          <span>{article.readMinutes} min read</span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          {article.description}
        </p>

        <div className="mt-10">
          <Body />
        </div>

        {/* In-content CTA: every article funnels to signup. */}
        <div className="mt-14 rounded-2xl bg-slate-900 p-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            Built for Nepal, from day one
          </h2>
          <p className="mx-auto mt-3 max-w-md text-slate-300">
            {SITE_NAME} handles QR attendance, live field tracking and BS-calendar payroll —
            across every branch, in English or नेपाली.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {related.length > 0 && (
          <div className="mt-16 border-t border-slate-200 pt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Keep reading
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map((a) => (
                <Link
                  key={a.slug}
                  href={`/blog/${a.slug}`}
                  className="group rounded-xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <span className="text-xs font-semibold text-indigo-600">
                    {a.category}
                  </span>
                  <h3 className="mt-2 font-bold leading-snug group-hover:text-indigo-700">
                    {a.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  )
}
