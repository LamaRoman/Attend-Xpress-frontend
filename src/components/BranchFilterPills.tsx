'use client'

import { Building2, Archive, ChevronDown, ChevronUp } from 'lucide-react'

export type BranchPill = {
  id: string
  name: string
  isMain?: boolean
}

type BranchFilterPillsProps = {
  /** Active branches (always shown) */
  branches: BranchPill[]
  /** Currently selected branch id, or 'ALL' for no filter */
  selectedBranchId: 'ALL' | string
  /** Called when the user picks a branch or 'ALL' */
  onChange: (branchId: 'ALL' | string) => void
  /**
   * If provided, the "Show archived" toggle is rendered. ORG_ADMIN only —
   * BRANCH_ADMIN never sees the pills at all (parent gates on isMultiBranch
   * && !isBranchAdmin), and ORG_ACCOUNTANT can voluntarily narrow but does
   * not get archived access (backend restricts includeDeleted to ORG_ADMIN).
   */
  showArchivedToggle?: boolean
  /** Whether the archived section is currently expanded */
  archivedExpanded?: boolean
  /** Toggle callback for the archived section */
  onToggleArchived?: (expanded: boolean) => void
  /**
   * Archived branches list. Parent fetches with ?includeDeleted=true when
   * archivedExpanded becomes true and passes the soft-deleted entries here.
   */
  archivedBranches?: BranchPill[]
  /** Nepali label mode */
  isNp?: boolean
  /** Additional class names for the outer wrapper */
  className?: string
}

/**
 * Single-select branch filter pills. Used by Reports / Payroll / Roster /
 * Leaves for ORG_ADMIN / ORG_ACCOUNTANT to voluntarily narrow data to one
 * branch. BRANCH_ADMIN never sees this — the parent page gates rendering
 * on `branches.length > 1 && !isBranchAdmin`.
 *
 * Selection is controlled by the parent so each page can wire the value
 * into its own data-fetch effect and decide whether to persist or reset
 * across remounts.
 */
export function BranchFilterPills({
  branches,
  selectedBranchId,
  onChange,
  showArchivedToggle = false,
  archivedExpanded = false,
  onToggleArchived,
  archivedBranches = [],
  isNp = false,
  className = '',
}: BranchFilterPillsProps) {
  const labelAll = isNp ? 'सबै' : 'All'
  const labelMain = isNp ? 'मुख्य' : 'Main'
  const labelArchived = isNp ? 'पुरालेखित' : 'Archived'
  const labelShowArchived = isNp ? 'पुरालेखित देखाउनुहोस्' : 'Show archived'

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 ${className}`}
    >
      <button
        onClick={() => onChange('ALL')}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          selectedBranchId === 'ALL'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {labelAll}
      </button>

      {branches.map((b) => {
        const active = selectedBranchId === b.id
        return (
          <button
            key={b.id}
            onClick={() => onChange(b.id)}
            title={b.isMain ? (isNp ? 'मुख्य शाखा' : 'Main branch') : undefined}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-3 w-3" />
            {b.name}
            {b.isMain ? (
              <span
                className={`text-[10px] ${active ? 'text-white/70' : 'text-slate-400'}`}
              >
                ({labelMain})
              </span>
            ) : null}
          </button>
        )
      })}

      {showArchivedToggle && onToggleArchived && (
        <>
          <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden />
          <button
            onClick={() => onToggleArchived(!archivedExpanded)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <Archive className="h-3 w-3" />
            {labelShowArchived}
            {archivedExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {archivedExpanded &&
            archivedBranches.map((b) => {
              const active = selectedBranchId === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => onChange(b.id)}
                  title={isNp ? 'पुरालेखित शाखा' : 'Archived branch'}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 italic hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  <Archive className="h-3 w-3" />
                  {b.name}
                  <span
                    className={`text-[10px] ${active ? 'text-white/70' : 'text-slate-300'}`}
                  >
                    ({labelArchived})
                  </span>
                </button>
              )
            })}
        </>
      )}
    </div>
  )
}
