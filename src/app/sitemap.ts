import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { ARTICLES } from '@/lib/blog'

/**
 * Public sitemap. Only crawlable, indexable pages belong here — the app
 * surfaces (/admin, /employee, …) are login-walled and explicitly disallowed
 * in robots.ts, so they are deliberately omitted.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const articles: MetadataRoute.Sitemap = ARTICLES.map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...articles,
  ]
}
