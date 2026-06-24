export interface LeaveRequest {
  id: string
  userId: string
  startDate: string
  endDate: string
  bsStartYear: number
  bsStartMonth: number
  bsStartDay: number
  bsEndYear: number
  bsEndMonth: number
  bsEndDay: number
  reason: string
  type: string
  status: string
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
  durationDays: number
  rejectionMessage?: string | null
  user?: {
    id: string
    firstName: string
    lastName: string
    employeeId: string
    email: string
  }
  approver?: {
    firstName: string
    lastName: string
  } | null
}

