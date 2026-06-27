import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/contexts/auth-context'
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  COMPANY_NAME,
} from '@/lib/site'
import './globals.css'

const HOME_TITLE =
  'Attend Xpress — Attendance, Field Tracking & Payroll Software for Nepal'

export const metadata: Metadata = {
  // Resolves all relative URLs (OG image, canonicals) against the real domain.
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: COMPANY_NAME, url: SITE_URL }],
  creator: COMPANY_NAME,
  publisher: COMPANY_NAME,
  category: 'business',
  manifest: '/manifest.json',
  alternates: { canonical: '/' },
  formatDetection: { telephone: false, address: false, email: false },
  verification: { google: 'Po55SOPbcSJe1IshWGzcV4dKS_swpJ3z5Jz-5MnZXEw' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME,
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
    // opengraph-image.tsx is detected automatically and added here by Next.
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
