'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mail, Lock, Building2, Globe, AlertCircle, Eye, EyeOff,
  ArrowRight, CheckCircle, MailCheck,
} from 'lucide-react'

import AuthBranding from '@/components/AuthBranding'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

export default function SignupPage() {
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [lang, setLang] = useState<'NEPALI' | 'ENGLISH'>('ENGLISH')
  const isNp = lang === 'NEPALI'

  // Password rule hints (mirror backend signupSchema)
  const pwRules = [
    { ok: password.length >= 8, en: 'At least 8 characters', np: 'कम्तीमा ८ अक्षर' },
    { ok: /[A-Z]/.test(password), en: 'One uppercase letter', np: 'एक ठूलो अक्षर' },
    { ok: /[a-z]/.test(password), en: 'One lowercase letter', np: 'एक सानो अक्षर' },
    { ok: /[0-9]/.test(password), en: 'One number', np: 'एक अंक' },
    { ok: /[!@#$%^&*(),.?":{}|<>]/.test(password), en: 'One special character', np: 'एक विशेष चिन्ह' },
  ]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError(isNp ? 'पासवर्डहरू मेल खाँदैनन्' : 'Passwords do not match')
      return
    }
    if (!pwRules.every((r) => r.ok)) {
      setError(isNp ? 'पासवर्डले सबै आवश्यकता पूरा गर्नुपर्छ' : 'Password must meet all requirements')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ orgName, email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        // Specific, friendly copy per backend code.
        const code = data?.error?.code
        if (code === 'EMAIL_EXISTS') {
          setError(
            isNp
              ? 'यो इमेलमा पहिले नै खाता छ। कृपया लग इन गर्नुहोस्।'
              : 'An account with this email already exists. Try logging in instead.',
          )
        } else if (code === 'VERIFICATION_PENDING') {
          // Treat as the success/check-inbox state — link is already out.
          setSentTo(email)
        } else {
          setError(data?.error?.message || (isNp ? 'साइन अप असफल भयो' : 'Sign up failed'))
        }
        return
      }

      setSentTo(data?.data?.email || email)
    } catch {
      setError(isNp ? 'सर्भरसँग जडान हुन सकेन' : 'Could not connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
      {/* Left panel — branding */}
      <AuthBranding
        isNp={isNp}
        title={isNp ? 'मिनेटमै सुरु गर्नुहोस् — निःशुल्क।' : 'Get started in minutes — free.'}
        subtitle={
          isNp
            ? 'आफ्नो कम्पनी दर्ता गर्नुहोस्, कर्मचारी थप्नुहोस्, र आजै उपस्थिति ट्र्याक गर्नुहोस्।'
            : 'Register your company, add your team, and start tracking attendance today.'
        }
      />

      {/* Right panel */}
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
        {/* Top bar */}
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

        <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto px-4 pt-8 pb-32 lg:px-8">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-10 shadow-sm">
            {sentTo ? (
              /* ─── Check-your-inbox state ─── */
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <MailCheck className="h-7 w-7 text-emerald-600" />
                </div>
                <h1 className="mb-2 text-3xl font-bold text-slate-900">
                  {isNp ? 'आफ्नो इमेल जाँच्नुहोस्' : 'Check your inbox'}
                </h1>
                <p className="mb-1 text-sm text-slate-500">
                  {isNp ? 'हामीले एउटा प्रमाणीकरण लिंक पठायौं:' : "We've sent a verification link to"}
                </p>
                <p className="mb-6 text-sm font-semibold text-slate-900">{sentTo}</p>
                <p className="mb-8 text-xs leading-relaxed text-slate-400">
                  {isNp
                    ? 'खाता सक्रिय गर्न इमेलको लिंकमा क्लिक गर्नुहोस्। लिंक २४ घण्टामा समाप्त हुन्छ। इमेल देखिएन? स्प्याम फोल्डर जाँच्नुहोस्।'
                    : 'Click the link in the email to activate your account. The link expires in 24 hours. Don’t see it? Check your spam folder.'}
                </p>
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  {isNp ? 'लगइनमा जानुहोस्' : 'Go to sign in'}
                </Link>
                <button
                  onClick={() => { setSentTo(''); setPassword(''); setConfirm('') }}
                  className="mt-3 text-xs text-slate-400 transition-colors hover:text-slate-700"
                >
                  {isNp ? 'फरक इमेल प्रयोग गर्नुहोस्' : 'Use a different email'}
                </button>
              </div>
            ) : (
              /* ─── Signup form ─── */
              <>
                <h1 className="mb-1 text-3xl font-bold text-slate-900">
                  {isNp ? 'खाता खोल्नुहोस्' : 'Create your account'}
                </h1>
                <p className="mb-10 text-sm text-slate-500">
                  {isNp ? 'आफ्नो कम्पनी दर्ता गरेर सुरु गर्नुहोस्' : 'Register your company to get started'}
                </p>

                {error && (
                  <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-red-100 bg-red-50 p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                <form onSubmit={submit} className="space-y-5">
                  <Field label={isNp ? 'कम्पनीको नाम' : 'Company name'} icon={Building2}>
                    <input
                      type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                      placeholder={isNp ? 'तपाईंको कम्पनी' : 'Acme Pvt. Ltd.'}
                      className={inputCls} required minLength={2}
                    />
                  </Field>

                  <Field label={isNp ? 'इमेल' : 'Email'} icon={Mail}>
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com" className={inputCls} required
                    />
                  </Field>

                  <Field label={isNp ? 'पासवर्ड' : 'Password'} icon={Lock}>
                    <input
                      type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </Field>

                  {password && (
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {pwRules.map((r) => (
                        <li key={r.en} className={`flex items-center gap-1.5 text-[11px] ${r.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <CheckCircle className={`h-3 w-3 ${r.ok ? 'text-emerald-500' : 'text-slate-300'}`} />
                          {isNp ? r.np : r.en}
                        </li>
                      ))}
                    </ul>
                  )}

                  <Field label={isNp ? 'पासवर्ड पुष्टि गर्नुहोस्' : 'Confirm password'} icon={Lock}>
                    <input
                      type={showPassword ? 'text' : 'password'} value={confirm}
                      onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
                      className={inputCls} required
                    />
                  </Field>

                  <button
                    type="submit" disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {isNp ? 'सिर्जना हुँदैछ...' : 'Creating account...'}
                      </>
                    ) : (
                      <>
                        {isNp ? 'खाता खोल्नुहोस्' : 'Create account'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-slate-500">
                  {isNp ? 'पहिले नै खाता छ?' : 'Already have an account?'}{' '}
                  <Link href="/login" className="font-medium text-slate-900 hover:underline">
                    {isNp ? 'लग इन गर्नुहोस्' : 'Sign in'}
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

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900'

function Field({
  label, icon: Icon, children,
}: {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        {children}
      </div>
    </div>
  )
}
