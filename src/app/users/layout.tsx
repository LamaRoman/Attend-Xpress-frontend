import RoleGuard from '@/components/RoleGuard'

export default function UsersRouteLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['ORG_ADMIN', 'BRANCH_ADMIN']}>{children}</RoleGuard>
}
