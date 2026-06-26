// Single source of truth for public-site SEO: canonical URL, brand strings,
// the marketing feature list, and FAQ. Consumed by the root metadata, the
// landing page, JSON-LD, sitemap.ts, robots.ts and /llms.txt so the product
// story stays consistent everywhere a crawler (Google, Bing) or an AI engine
// (ChatGPT, Claude, Perplexity) reads it.
//
// SITE_URL must be the apex domain you actually want to rank. Override with
// NEXT_PUBLIC_SITE_URL at build time if this Next app is served from a
// subdomain (e.g. app.zentaralabs.com) but the marketing site lives on the
// apex.

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zentaralabs.com'
).replace(/\/$/, '')

export const SITE_NAME = 'Attend Xpress'
export const COMPANY_NAME = 'Zentara Labs'

export const SITE_TAGLINE =
  'Attendance, field tracking & payroll software for Nepal'

export const SITE_DESCRIPTION =
  'Attend Xpress is an all-in-one attendance, HR and payroll platform built for Nepal. ' +
  'Staff clock in with QR codes, field teams are tracked live on a map, and payroll runs ' +
  'on the Bikram Sambat calendar — across every branch, in English or Nepali.'

// Concise keyword set — Next renders these as a meta keywords tag. Modern
// Google ignores it, but several niche and regional engines plus some AI
// crawlers still read it, and it costs nothing.
export const SITE_KEYWORDS = [
  'attendance management system Nepal',
  'QR attendance app',
  'employee attendance software',
  'payroll software Nepal',
  'HR software Nepal',
  'field staff tracking software',
  'GPS employee tracking',
  'route replay',
  'leave management system',
  'Bikram Sambat payroll',
  'multi-branch attendance',
  'biometric alternative clock in',
  'Attend Xpress',
  'Zentara Labs',
]

export interface Feature {
  title: string
  blurb: string
  /** lucide-react icon name, resolved on the page. */
  icon: string
}

// Drawn from the product's real capability set (src/lib/feature-meta.ts).
export const FEATURES: Feature[] = [
  {
    title: 'QR code attendance',
    blurb:
      'Staff clock in and out by scanning a workplace QR code. Rotating codes stop buddy-punching.',
    icon: 'QrCode',
  },
  {
    title: 'Live field staff tracking',
    blurb:
      'See the real-time location of field employees on a map while they are on the clock.',
    icon: 'Navigation',
  },
  {
    title: 'Route replay',
    blurb:
      'Replay the full route a field employee travelled during a shift, with detected stops.',
    icon: 'Route',
  },
  {
    title: 'Payroll & payslips',
    blurb:
      'Calculate salaries, allowances and deductions, then generate payslips — with an approval workflow.',
    icon: 'CreditCard',
  },
  {
    title: 'Leave management',
    blurb:
      'Staff request leave and managers approve it in one place, with balances tracked automatically.',
    icon: 'CalendarDays',
  },
  {
    title: 'Multi-branch & geofencing',
    blurb:
      'Run multiple branches, each with its own geofence, admins and working schedules.',
    icon: 'Building2',
  },
  {
    title: 'Roster & shift planning',
    blurb:
      'Plan shifts and assign working schedules so the right people are on at the right time.',
    icon: 'Table2',
  },
  {
    title: 'Bikram Sambat calendar',
    blurb:
      'Everything works in the Nepali calendar — holidays, payroll cycles and reports in BS dates.',
    icon: 'Calendar',
  },
  {
    title: 'Reports & exports',
    blurb:
      'Generate attendance and payroll reports and export the data whenever you need it.',
    icon: 'FileText',
  },
  {
    title: 'Notifications & alerts',
    blurb:
      'Real-time alerts for attendance, leave and payroll events keep everyone in the loop.',
    icon: 'Bell',
  },
  {
    title: 'Document management',
    blurb:
      'Attach contracts, IDs and other files directly to employee records.',
    icon: 'Upload',
  },
  {
    title: 'Audit log',
    blurb: 'A full, tamper-evident history of who changed what, and when.',
    icon: 'ShieldCheck',
  },
]

export interface Faq {
  q: string
  a: string
}

export const FAQS: Faq[] = [
  {
    q: 'What is Attend Xpress?',
    a: 'Attend Xpress is an all-in-one staff attendance, HR and payroll platform built for businesses in Nepal. Employees clock in with QR codes, field staff are tracked live, and payroll runs on the Bikram Sambat calendar.',
  },
  {
    q: 'How do employees clock in?',
    a: 'Employees scan a workplace QR code from the Attend Xpress mobile app to clock in and out. Rotating QR codes prevent buddy-punching, and geofencing keeps clock-ins tied to the right branch.',
  },
  {
    q: 'Can I track field or on-site staff?',
    a: 'Yes. While a field employee is on the clock, admins see their live location on a map, and can replay the full route they travelled during a shift, including where they stopped and for how long.',
  },
  {
    q: 'Does it support the Nepali (Bikram Sambat) calendar?',
    a: 'Yes. Attendance, holidays, leave and payroll all work in the Bikram Sambat calendar, and the app is available in both English and Nepali.',
  },
  {
    q: 'Does Attend Xpress handle payroll?',
    a: 'Yes. It calculates salaries, allowances and deductions, runs a Process → Approve → Mark-paid workflow, and generates payslips for your team.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Yes. There are mobile apps for staff (to clock in and view their info) and for admins (to monitor attendance and field staff locations), alongside the full web dashboard.',
  },
  {
    q: 'Can it run multiple branches or locations?',
    a: 'Yes. You can run multiple branches, each with its own geofence, admins, rosters and working schedules, all under one organization.',
  },
]
