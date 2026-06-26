import type { ComponentType } from 'react'
import QrVsBiometric from './qr-vs-biometric-attendance-nepal'
import TrackFieldStaff from './track-field-staff-location-nepal'
import BikramSambatPayroll from './bikram-sambat-payroll-nepal'
import MultiBranch from './multi-branch-attendance-management'
import ChooseSoftware from './choose-attendance-software-nepal'
import LeaveManagement from './leave-management-nepal-labor-act'

// Maps an article slug to its body component. Kept separate from blog.ts (the
// metadata list) so the metadata stays usable in places — sitemap, the index
// page — that don't need to pull in every article's JSX.
export const ARTICLE_CONTENT: Record<string, ComponentType> = {
  'qr-vs-biometric-attendance-nepal': QrVsBiometric,
  'track-field-staff-location-nepal': TrackFieldStaff,
  'bikram-sambat-payroll-nepal': BikramSambatPayroll,
  'multi-branch-attendance-management': MultiBranch,
  'choose-attendance-software-nepal': ChooseSoftware,
  'leave-management-nepal-labor-act': LeaveManagement,
}
