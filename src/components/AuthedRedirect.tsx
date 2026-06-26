'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

/**
 * Routes an already-signed-in visitor from the public marketing page straight
 * to their role dashboard — preserving the old `/` behaviour — without ever
 * hiding the landing content from crawlers.
 *
 * Crawlers and logged-out visitors have no session, so this renders nothing and
 * the server-rendered marketing page stays put. Only authenticated users get
 * redirected, and only on the client after hydration.
 */
export default function AuthedRedirect() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !user) return
    if (user.role === 'SUPER_ADMIN') router.replace('/super-admin')
    else if (user.role === 'ORG_ADMIN' || user.role === 'BRANCH_ADMIN')
      router.replace('/admin')
    else if (user.role === 'ORG_ACCOUNTANT') router.replace('/accountant')
    else router.replace('/employee')
  }, [user, isLoading, router])

  return null
}
