'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import PoweredBy from '@/components/PoweredBy'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

type State = 'verifying' | 'success' | 'error'

function VerifyEmailInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<State>('verifying')
  const [message, setMessage] = useState('')
  const ran = useRef(false) // guard React StrictMode double-invoke

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!token) {
      setState('error')
      setMessage('This verification link is missing its token.')
      return
    }

    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        if (res.ok) {
          setState('success')
          setMessage(data?.data?.message || 'Email verified. You can now sign in.')
        } else {
          setState('error')
          setMessage(data?.error?.message || 'This verification link is invalid or has expired.')
        }
      } catch {
        setState('error')
        setMessage('Could not connect to the server. Please try again.')
      }
    })()
  }, [token])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex items-center gap-2 p-6 lg:px-12">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950">
          <span className="text-xs font-bold text-white">AX</span>
        </div>
        <span className="text-sm font-semibold text-slate-900">Attend Xpress</span>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          {state === 'verifying' && (
            <>
              <Loader2 className="mx-auto mb-5 h-10 w-10 animate-spin text-slate-300" />
              <h1 className="text-xl font-semibold text-slate-900">Verifying your email…</h1>
              <p className="mt-1 text-sm text-slate-500">Just a moment.</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-slate-900">Email verified</h1>
              <p className="mb-8 text-sm text-slate-500">{message}</p>
              <Link
                href="/login?verified=1"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                Sign in
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-7 w-7 text-red-500" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-slate-900">Verification failed</h1>
              <p className="mb-8 text-sm text-slate-500">{message}</p>
              <Link
                href="/signup"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                Back to sign up
              </Link>
            </>
          )}
        </div>
      </div>

      <PoweredBy />
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  )
}
