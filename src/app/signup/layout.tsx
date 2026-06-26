import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign up',
  description:
    'Create your Attend Xpress account and start tracking attendance, field staff and payroll for your business in Nepal.',
  alternates: { canonical: '/signup' },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
