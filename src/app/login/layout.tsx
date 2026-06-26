import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in',
  description:
    'Log in to Attend Xpress to manage staff attendance, field-staff tracking, leave and payroll.',
  alternates: { canonical: '/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
