export interface ArticleMeta {
  slug: string
  title: string
  description: string
  date: string
  readMinutes: number
  category: string
}

export const ARTICLES: ArticleMeta[] = [
  {
    slug: 'qr-vs-biometric-attendance-nepal',
    title: 'QR Code vs Biometric Attendance — Which Is Better for Nepali Businesses?',
    description:
      'Fingerprint machines are everywhere in Nepal, but they may not be the right choice for your business. An honest comparison of biometric vs QR code attendance.',
    date: '2026-06-10',
    readMinutes: 7,
    category: 'Attendance',
  },
  {
    slug: 'track-field-staff-location-nepal',
    title: 'How to Track Field Staff Location in Nepal',
    description:
      'If your business has staff working outside the office — sales reps, delivery drivers, field officers — GPS tracking is probably overdue. Here is how it actually works.',
    date: '2026-06-13',
    readMinutes: 6,
    category: 'Field Tracking',
  },
  {
    slug: 'bikram-sambat-payroll-nepal',
    title: 'Bikram Sambat Payroll: Why Your Software Needs to Speak Nepali Time',
    description:
      'Most HR software was built elsewhere and thinks in AD. Your fiscal year, holidays, and salary cycles are in BS. Here is why that gap costs you every month.',
    date: '2026-06-16',
    readMinutes: 6,
    category: 'Payroll',
  },
  {
    slug: 'multi-branch-attendance-management',
    title: 'Managing Attendance Across Multiple Branches — What Actually Works',
    description:
      'Excel consolidation from five branches, late every month, full of conversion errors. There is a better way. Here is what multi-branch attendance actually needs.',
    date: '2026-06-19',
    readMinutes: 6,
    category: 'HR Operations',
  },
  {
    slug: 'choose-attendance-software-nepal',
    title: 'How to Choose Attendance Software in Nepal — A Buyer\'s Guide',
    description:
      'All attendance software looks similar in a sales demo. Here is what to actually evaluate before you commit — and the red flags that should make you walk away.',
    date: '2026-06-22',
    readMinutes: 8,
    category: 'Buying Guide',
  },
  {
    slug: 'leave-management-nepal-labor-act',
    title: 'Leave Management in Nepal and the Labor Act 2074',
    description:
      'Annual leave, sick leave, home leave, maternity and paternity — what the Labor Act actually requires, and how software keeps you compliant without the manual tracking.',
    date: '2026-06-25',
    readMinutes: 7,
    category: 'Compliance',
  },
]

export function getArticle(slug: string): ArticleMeta | undefined {
  return ARTICLES.find((a) => a.slug === slug)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
