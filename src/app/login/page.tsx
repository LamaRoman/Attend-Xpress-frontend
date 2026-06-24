'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Mail, Lock, LogIn, Globe, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react'

import AuthBranding from '@/components/AuthBranding'

function LoginPageInner() {
  const searchParams = useSearchParams()
  const justVerified = searchParams.get('verified') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [lang, setLang] = useState<'NEPALI' | 'ENGLISH'>('ENGLISH')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const { login } = useAuth()
  const isNp = lang === 'NEPALI'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : isNp ? 'लग इन असफल भयो' : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) {
      setForgotMsg(isNp ? 'कृपया इमेल हाल्नुहोस्' : 'Please enter your email')
      return
    }
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ email: forgotEmail.trim() }),
        },
      )
      const data = await res.json()
      setForgotMsg(
        isNp
          ? 'यदि त्यो इमेल अवस्थित छ भने, रिसेट लिंक पठाइएको छ।'
          : data.data?.message || 'If that email exists, a reset link has been sent.',
      )
    } catch {
      setForgotMsg(isNp ? 'सर्भरसँग जडान हुन सकेन' : 'Could not connect to server')
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
      {/* Left panel — branding */}
      <AuthBranding
        isNp={isNp}
        title={
          isNp
            ? 'आफ्नो टिमको उपस्थिति सजिलै व्यवस्थापन गर्नुहोस्'
            : "Manage your team's attendance effortlessly"
        }
        subtitle={
          isNp
            ? 'QR स्क्यान, बिदा व्यवस्थापन, तलब प्रशोधन — सबै एकै ठाउँमा।'
            : 'QR scanning, leave management, payroll processing — all in one place.'
        }
      />

      {/* Right panel — form */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-950">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 h-[28rem] w-[28rem] rounded-full bg-emerald-500/20 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, #000 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, #000 40%, transparent 100%)',
          }}
        />
        {/* Language toggle */}
        <div className="relative z-10 flex items-center justify-between p-6 lg:px-12">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <span className="text-xs font-bold text-slate-950">AX</span>
            </div>
            <span className="text-sm font-semibold text-white">Attend Xpress</span>
          </div>
          <button
            onClick={() => setLang(isNp ? 'ENGLISH' : 'NEPALI')}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/70 transition-colors hover:border-white/40 hover:text-white"
          >
            <Globe className="h-3.5 w-3.5" />
            {isNp ? 'English' : 'नेपाली'}
          </button>
        </div>

        {/* Form centered */}
        <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto px-4 pt-8 pb-32 lg:px-8">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-10 shadow-sm">
            {/* Forgot Password View */}
            {showForgot ? (
              <>
                <button
                  onClick={() => {
                    setShowForgot(false)
                    setForgotMsg('')
                    setForgotEmail('')
                  }}
                  className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {isNp ? 'लगइनमा फर्कनुहोस्' : 'Back to sign in'}
                </button>
                <h1 className="mb-1 text-3xl font-bold text-slate-900">
                  {isNp ? 'पासवर्ड रिसेट' : 'Reset password'}
                </h1>
                <p className="mb-10 text-sm text-slate-500">
                  {isNp
                    ? 'आफ्नो इमेल हाल्नुहोस् र हामी तपाईंलाई सहयोग गर्नेछौं।'
                    : "Enter your email and we'll help you recover access."}
                </p>

                {forgotMsg && (
                  <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                    <span className="text-sm text-blue-700">{forgotMsg}</span>
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {isNp ? 'इमेल' : 'Email'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder={isNp ? 'तपाईंको इमेल' : 'name@company.com'}
                        className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleForgotSubmit}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                  >
                    {isNp ? 'पठाउनुहोस्' : 'Submit'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Login View */}
                <h1 className="mb-1 text-3xl font-bold text-slate-900">
                  {isNp ? 'लग इन गर्नुहोस्' : 'Sign in'}
                </h1>
                <p className="mb-10 text-sm text-slate-500">
                  {isNp
                    ? 'आफ्नो खातामा जानको लागि इमेल र पासवर्ड हाल्नुहोस्'
                    : 'Enter your credentials to access your account'}
                </p>

                {justVerified && !error && (
                  <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span className="text-sm text-emerald-700">
                      {isNp
                        ? 'इमेल प्रमाणित भयो! अब तपाईं लग इन गर्न सक्नुहुन्छ।'
                        : 'Email verified! You can now sign in.'}
                    </span>
                  </div>
                )}

                {error && (
                  <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-red-100 bg-red-50 p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {isNp ? 'इमेल' : 'Email'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={isNp ? 'तपाईंको इमेल' : 'name@company.com'}
                        className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700">
                        {isNp ? 'पासवर्ड' : 'Password'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs text-slate-500 transition-colors hover:text-slate-900"
                      >
                        {isNp ? 'पासवर्ड बिर्सनुभयो?' : 'Forgot password?'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {isNp ? 'लग इन हुँदैछ...' : 'Signing in...'}
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        {isNp ? 'लग इन गर्नुहोस्' : 'Sign in'}
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-slate-500">
                  {isNp ? 'खाता छैन?' : "Don't have an account?"}{' '}
                  <Link href="/signup" className="font-medium text-slate-900 hover:underline">
                    {isNp ? 'साइन अप गर्नुहोस्' : 'Sign up'}
                  </Link>
                </p>

              </>
            )}
          </div>
        </div>

      </div>
      </div>
      <footer className="border-t border-white/10 bg-slate-950 py-3 text-center">
        <p className="text-xs text-slate-400">
          Powered by{' '}
          <a href="https://zentaralabs.com" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-300 transition-colors hover:text-white">
            Zentara Labs Pvt Ltd
          </a>
        </p>
        <div className="mt-1 flex items-center justify-center gap-3">
          <a href="https://wa.me/9779761154213" target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-500 transition-colors hover:text-emerald-400">WhatsApp: 9761154213</a>
          <span className="text-slate-600">·</span>
          <a href="mailto:support@zentaralabs.com" className="text-[11px] text-slate-500 transition-colors hover:text-slate-300">support@zentaralabs.com</a>
        </div>
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
