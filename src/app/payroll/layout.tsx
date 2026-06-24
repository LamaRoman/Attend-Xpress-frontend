import RoleGuard from '@/components/RoleGuard'

export default function PayrollRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ORG_ADMIN', 'BRANCH_ADMIN', 'ORG_ACCOUNTANT']}>{children}</RoleGuard>
  )
}
