import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * Crawl rules. Allow the public marketing/auth pages; keep crawlers out of the
 * login-walled application surfaces (they hold no indexable content and would
 * only dilute the site's relevance). The AI-engine crawlers are listed
 * explicitly so they're unambiguously welcomed on the public pages.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/admin',
    '/super-admin',
    '/accountant',
    '/employee',
    '/payroll',
    '/users',
    '/settings',
    '/leaves',
    '/holidays',
    '/my-info',
    '/scan',
    '/change-password',
    '/reset-password',
    '/verify-email',
    '/api/',
  ]
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      // Explicitly welcome the major AI/search crawlers on public pages.
      { userAgent: 'GPTBot', allow: '/', disallow },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow },
      { userAgent: 'ChatGPT-User', allow: '/', disallow },
      { userAgent: 'ClaudeBot', allow: '/', disallow },
      { userAgent: 'Claude-Web', allow: '/', disallow },
      { userAgent: 'PerplexityBot', allow: '/', disallow },
      { userAgent: 'Google-Extended', allow: '/', disallow },
      { userAgent: 'Applebot-Extended', allow: '/', disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
