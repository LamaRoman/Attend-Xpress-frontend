'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { subscriptionStatus, type SubLike, type SubStatusSummary } from '@/lib/subscription-status'

interface Organization {
  id: string
  name: string
  slug?: string
  calendarMode: 'NEPALI' | 'ENGLISH'
  language: 'NEPALI' | 'ENGLISH'
  // QR + field-tracking availability moved to PricingPlan 2026-06 (see PlanFeatures).
  ssfEnabled: boolean
  citEnabled: boolean
  tdsEnabled: boolean
  sandwichLeaveEnabled: boolean
}

interface PlanFeatures {
  isActive: boolean
  tier: string
  featureLeave: boolean
  featureFullPayroll: boolean
  featurePayrollWorkflow: boolean
  featureReports: boolean
  featureManualCorrection: boolean
  featureNotifications: boolean
  featureOnboarding: boolean
  featureAuditLog: boolean
  featureFileDownload: boolean
  featureDownloadReports: boolean
  featureDownloadPayslips: boolean
  featureDownloadAuditLog: boolean
  featureDownloadLeaveRecords: boolean
  featureRoster: boolean
  featureHolidays: boolean
  featureMultiBranch: boolean
  featureFieldTracking: boolean
  featureRouteReplay: boolean
  featureDocumentUpload: boolean
  featureStaticQR: boolean
  featureRotatingQR: boolean
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  employeeId: string | null
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'BRANCH_ADMIN' | 'ORG_ACCOUNTANT' | 'EMPLOYEE'
  isActive: boolean
  mustChangePassword?: boolean
  organizationId: string | null
  isFieldStaff?: boolean
  /** OrgMembership ID — null for SUPER_ADMIN */
  membershipId: string | null
  /** Phase 6 — assigned branch. Always set for BRANCH_ADMIN, optional otherwise. */
  branchId: string | null
  organization?: Organization
  planFeatures?: PlanFeatures | null
  hasInactiveEmployees?: boolean
}

interface Features {
  payroll: boolean
  leave: boolean
  reports: boolean
  staticQR: boolean
  rotatingQR: boolean
  manualCorrection: boolean
  notifications: boolean
  payrollWorkflow: boolean
  fileDownload: boolean
  downloadReports: boolean
  downloadPayslips: boolean
  downloadAuditLog: boolean
  downloadLeaveRecords: boolean
  auditLog: boolean
  onboarding: boolean
  // Scheduling-feature availability — plan-controlled. roster gates the roster
  // management UI; holidays gates the holiday management pages. Both default to
  // false when there's no plan (mirrors the other plan-feature flags above).
  roster: boolean
  holidays: boolean
  // Multi-branch and field tracking are plan features. fieldTracking IS live
  // tracking now (the per-org switch was folded into the plan 2026-06).
  multiBranch: boolean
  fieldTracking: boolean
  documentUpload: boolean
  // Statutory deduction availability — super-admin controlled, per org.
  // These stay org-level (tax/legal config), unlike the QR/tracking flags
  // which moved to the plan. Short names differ from the per-employee
  // *Enabled flags so the two layers stay unambiguous at call sites.
  ssf: boolean
  cit: boolean
  tds: boolean
  // Field-tracking plan features (moved from per-org switches 2026-06).
  // liveTracking is an alias of fieldTracking; routeReplay is its finer gate.
  liveTracking: boolean
  routeReplay: boolean
  // Saptahanta Anupasthiti Katti (Weekend Sandwich Absence Deduction) —
  // super-admin controlled, per org. When on, an absent working day
  // adjacent to a weekend adds an extra +1 day LOP to the payslip.
  sandwichLeave: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  isBranchAdmin: boolean
  isAnyAdmin: boolean
  isAccountant: boolean
  isSuperAdmin: boolean
  branchId: string | null
  calendarMode: 'NEPALI' | 'ENGLISH'
  language: 'NEPALI' | 'ENGLISH'
  features: Features
  hasInactiveEmployees: boolean
  /** Org subscription (admins only); null for other roles or when not yet loaded. */
  subscription: SubLike | null
  /** Derived status summary (label/copy/colors/days-left) for the current subscription. */
  subStatus: SubStatusSummary | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubLike | null>(null)
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/auth/me')
      if (res.data) {
        const data = res.data as { user: User }
        setUser(data.user)
        if (data.user.mustChangePassword) {
          router.push('/change-password')
        }
      } else {
        // Auth failed (401, expired session, etc.) — clear stale user
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Load the org subscription for admins (org + branch), so the billing banner
  // can surface trial/grace state on every admin page. Other roles never see
  // it, so we skip the fetch and keep it null.
  const isOrgOrBranchAdmin =
    user?.role === 'ORG_ADMIN' || user?.role === 'BRANCH_ADMIN'
  useEffect(() => {
    if (!isOrgOrBranchAdmin) {
      setSubscription(null)
      return
    }
    let cancelled = false
    api
      .get('/api/v1/org-settings/subscription')
      .then((res) => {
        if (!cancelled) setSubscription((res.data as SubLike) ?? null)
      })
      .catch(() => {
        if (!cancelled) setSubscription(null)
      })
    return () => {
      cancelled = true
    }
  }, [isOrgOrBranchAdmin])

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/v1/auth/login', { email, password })

    if (res.error) {
      throw new Error(res.error.message || 'Login failed')
    }

    const data = res.data as { user: User }
    setUser(data.user)

    // Fetch full profile (includes organization + plan features)
    const meRes = await api.get('/api/v1/auth/me')
    if (meRes.data) {
      const meData = meRes.data as { user: User }
      setUser(meData.user)
    }

    // Force password change if needed
    const finalUser = (meRes.data as { user: User })?.user ?? data.user
    if (finalUser.mustChangePassword) {
      router.push('/change-password')
      return
    }

    // Route based on role
    if (data.user.role === 'SUPER_ADMIN') {
      router.push('/super-admin')
    } else if (data.user.role === 'ORG_ADMIN' || data.user.role === 'BRANCH_ADMIN') {
      router.push('/admin')
    } else if (data.user.role === 'ORG_ACCOUNTANT') {
      router.push('/accountant')
    } else {
      router.push('/employee')
    }
  }

  const logout = async () => {
    await api.post('/api/v1/auth/logout').catch(() => {})
    setUser(null)
    router.push('/login')
  }

  // Phase 6 — BRANCH_ADMIN is treated as admin for nav/access purposes, but
  // the backend scopes their data to a single branch. isAdmin remains
  // org-level-only (controls access to org-wide pages); isAnyAdmin is the
  // looser flag for pages that both org and branch admins can use.
  const isAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN'
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN'
  const isAnyAdmin = isAdmin || isBranchAdmin
  const isAccountant = user?.role === 'ORG_ACCOUNTANT'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const branchId = user?.branchId ?? null
  const calendarMode = user?.organization?.calendarMode || 'NEPALI'
  const language = user?.organization?.language || 'NEPALI'

  const features: Features = {
    payroll: user?.planFeatures?.featureFullPayroll ?? false,
    leave: user?.planFeatures?.featureLeave ?? false,
    reports: user?.planFeatures?.featureReports ?? false,
    staticQR: user?.planFeatures?.featureStaticQR ?? false,
    rotatingQR: user?.planFeatures?.featureRotatingQR ?? false,
    manualCorrection: user?.planFeatures?.featureManualCorrection ?? false,
    notifications: user?.planFeatures?.featureNotifications ?? false,
    payrollWorkflow: user?.planFeatures?.featurePayrollWorkflow ?? false,
    fileDownload: user?.planFeatures?.featureFileDownload ?? false,
    downloadReports: user?.planFeatures?.featureDownloadReports ?? false,
    downloadPayslips: user?.planFeatures?.featureDownloadPayslips ?? false,
    downloadAuditLog: user?.planFeatures?.featureDownloadAuditLog ?? false,
    downloadLeaveRecords: user?.planFeatures?.featureDownloadLeaveRecords ?? false,
    auditLog: user?.planFeatures?.featureAuditLog ?? false,
    onboarding: user?.planFeatures?.featureOnboarding ?? false,
    roster: user?.planFeatures?.featureRoster ?? false,
    holidays: user?.planFeatures?.featureHolidays ?? false,
    multiBranch: user?.planFeatures?.featureMultiBranch ?? false,
    fieldTracking: user?.planFeatures?.featureFieldTracking ?? false,
    documentUpload: user?.planFeatures?.featureDocumentUpload ?? false,
    ssf: user?.organization?.ssfEnabled ?? false,
    cit: user?.organization?.citEnabled ?? false,
    tds: user?.organization?.tdsEnabled ?? false,
    // Live tracking folded into the plan's featureFieldTracking 2026-06; kept as
    // an alias so existing consumers (field-tracking page, AdminLayout) work.
    liveTracking: user?.planFeatures?.featureFieldTracking ?? false,
    routeReplay: user?.planFeatures?.featureRouteReplay ?? false,
    sandwichLeave: user?.organization?.sandwichLeaveEnabled ?? false,
  }

  const hasInactiveEmployees = user?.hasInactiveEmployees ?? false

  const subStatus = subscription ? subscriptionStatus(subscription) : null

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser: checkAuth,
        isAdmin,
        isBranchAdmin,
        isAnyAdmin,
        isAccountant,
        isSuperAdmin,
        branchId,
        calendarMode,
        language,
        features,
        hasInactiveEmployees,
        subscription,
        subStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
