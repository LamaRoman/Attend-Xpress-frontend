'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Building2,
  MapPin,
  Users,
  X,
  Star,
  Search,
  Power,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Branch {
  id: string
  organizationId: string
  name: string
  address: string | null
  isMain: boolean
  officeLat: number | null
  officeLng: number | null
  geofenceRadius: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  organization: { id: string; name: string; slug: string }
  _count: { memberships: number }
}

interface Organization {
  id: string
  name: string
}

interface CreateForm {
  organizationId: string
  name: string
  address: string
  officeLat: string
  officeLng: string
  geofenceRadius: string
}

interface EditState {
  id: string
  name: string
  address: string
  officeLat: string
  officeLng: string
  geofenceRadius: string
  isActive: boolean
  // read-only for display + UI gating
  isMain: boolean
  organizationName: string
}

const EMPTY_CREATE_FORM: CreateForm = {
  organizationId: '',
  name: '',
  address: '',
  officeLat: '',
  officeLng: '',
  geofenceRadius: '',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Convert input string to number, empty string, or null based on context. */
function toOptionalNumber(s: string): number | undefined {
  const trimmed = s.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

/**
 * For PUT updates: empty string means "clear this field" (explicit null),
 * which causes geofence to fall back to the org-level value.
 */
function toNullableNumber(s: string): number | null {
  const trimmed = s.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function formatCoords(lat: number | null, lng: number | null, radius: number | null) {
  if (lat == null || lng == null) {
    return { primary: 'Inherits from org', secondary: null as string | null }
  }
  return {
    primary: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    secondary: radius != null ? `${radius}m radius` : 'org default radius',
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function BranchesPage() {
  const { user, isLoading, isSuperAdmin } = useAuth()
  const router = useRouter()

  const [branches, setBranches] = useState<Branch[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [filterOrgId, setFilterOrgId] = useState<string>('ALL')

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM)
  const [creating, setCreating] = useState(false)

  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  // ─── Data loading ────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [branchRes, orgRes] = await Promise.all([
      api.get('/api/v1/super-admin/branches?includeInactive=true'),
      api.get('/api/v1/super-admin/organizations'),
    ])

    if (branchRes.error) {
      setError(branchRes.error.message)
    } else if (branchRes.data) {
      setBranches((branchRes.data as Branch[]) || [])
    }

    if (orgRes.data) {
      const d = orgRes.data as Record<string, unknown>
      setOrganizations((d.organizations || []) as Organization[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (user && isSuperAdmin) loadAll()
  }, [user, isSuperAdmin, loadAll])

  // ─── CRUD handlers ───────────────────────────────────────────────────────

  const openCreate = () => {
    setCreateForm({
      ...EMPTY_CREATE_FORM,
      // pre-select the currently filtered org for convenience
      organizationId: filterOrgId !== 'ALL' ? filterOrgId : '',
    })
    setError('')
    setShowCreate(true)
  }

  const handleCreate = async () => {
    if (!createForm.organizationId) {
      setError('Please choose an organization')
      return
    }
    if (!createForm.name.trim()) {
      setError('Branch name is required')
      return
    }

    setCreating(true)
    setError('')

    const body: Record<string, unknown> = {
      organizationId: createForm.organizationId,
      name: createForm.name.trim(),
    }
    if (createForm.address.trim()) body.address = createForm.address.trim()
    const lat = toOptionalNumber(createForm.officeLat)
    const lng = toOptionalNumber(createForm.officeLng)
    const radius = toOptionalNumber(createForm.geofenceRadius)
    if (lat !== undefined) body.officeLat = lat
    if (lng !== undefined) body.officeLng = lng
    if (radius !== undefined) body.geofenceRadius = radius

    const res = await api.post('/api/v1/super-admin/branches', body)
    if (res.error) {
      setError(res.error.message)
    } else {
      showSuccess('Branch created')
      setShowCreate(false)
      setCreateForm(EMPTY_CREATE_FORM)
      loadAll()
    }
    setCreating(false)
  }

  const openEdit = (b: Branch) => {
    setEdit({
      id: b.id,
      name: b.name,
      address: b.address ?? '',
      officeLat: b.officeLat != null ? String(b.officeLat) : '',
      officeLng: b.officeLng != null ? String(b.officeLng) : '',
      geofenceRadius: b.geofenceRadius != null ? String(b.geofenceRadius) : '',
      isActive: b.isActive,
      isMain: b.isMain,
      organizationName: b.organization.name,
    })
    setError('')
  }

  const handleUpdate = async () => {
    if (!edit) return
    if (!edit.name.trim()) {
      setError('Branch name is required')
      return
    }

    setSaving(true)
    setError('')

    // Send the geofence fields as nullable — empty means "inherit from org".
    const body = {
      name: edit.name.trim(),
      address: edit.address.trim() === '' ? null : edit.address.trim(),
      officeLat: toNullableNumber(edit.officeLat),
      officeLng: toNullableNumber(edit.officeLng),
      geofenceRadius: toNullableNumber(edit.geofenceRadius),
      isActive: edit.isActive,
    }

    const res = await api.put(`/api/v1/super-admin/branches/${edit.id}`, body)
    if (res.error) {
      setError(res.error.message)
    } else {
      showSuccess('Branch updated')
      setEdit(null)
      loadAll()
    }
    setSaving(false)
  }

  const handleDelete = async (b: Branch) => {
    // The backend enforces both of these too; we mirror them client-side for
    // a faster, friendlier UX.
    if (b.isMain) {
      setError('The main branch cannot be deleted.')
      return
    }
    if (b._count.memberships > 0) {
      setError(
        `Cannot delete "${b.name}" — ${b._count.memberships} active employee(s) are still assigned. Reassign them first.`,
      )
      return
    }
    if (
      !confirm(
        `Delete branch "${b.name}"? This is a soft delete — the record stays in the database with deletedAt set.`,
      )
    ) {
      return
    }

    setDeletingId(b.id)
    setError('')

    const res = await api.delete(`/api/v1/super-admin/branches/${b.id}`)
    if (res.error) {
      setError(res.error.message)
    } else {
      showSuccess(`Branch "${b.name}" deleted`)
      loadAll()
    }
    setDeletingId(null)
  }

  // ─── Derived ─────────────────────────────────────────────────────────────

  const filteredBranches = useMemo(() => {
    const q = search.trim().toLowerCase()
    return branches.filter((b) => {
      if (filterOrgId !== 'ALL' && b.organizationId !== filterOrgId) return false
      if (!q) return true
      return (
        b.name.toLowerCase().includes(q) ||
        b.organization.name.toLowerCase().includes(q) ||
        (b.address ?? '').toLowerCase().includes(q)
      )
    })
  }, [branches, search, filterOrgId])

  // ─── Render ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }

  if (!user || !isSuperAdmin) return null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/super-admin')}
                className="rounded-md p-1.5 transition-colors hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-slate-900">Branches</h1>
                <p className="text-xs text-slate-400">
                  Physical office locations across all organizations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAll}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={'h-3.5 w-3.5 ' + (loading ? 'animate-spin' : '')} />
                Reload
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Create branch
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Alerts ──────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span className="text-xs leading-relaxed text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-emerald-700">{success}</span>
          </div>
        )}

        {/* ── Info banner ─────────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs leading-relaxed text-slate-500">
            Each organization has one or more <strong>branches</strong> with its own geofence. Every
            org has exactly one <strong>main branch</strong> (★) that cannot be deleted. New
            employees default to the main branch when no branch is specified. Leaving the geofence
            fields empty makes a branch <em>inherit</em> the org-level geofence.
          </p>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by branch, organization, or address…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <select
            value={filterOrgId}
            onChange={(e) => setFilterOrgId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-64"
          >
            <option value="ALL">All organizations</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Geofence</th>
                  <th className="px-4 py-3 text-right font-medium">Members</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && branches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading branches…
                    </td>
                  </tr>
                ) : filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <Building2 className="mx-auto mb-2 h-5 w-5" />
                      {branches.length === 0 ? 'No branches yet' : 'No branches match your filters'}
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((b) => {
                    const coords = formatCoords(b.officeLat, b.officeLng, b.geofenceRadius)
                    const deleteDisabled =
                      b.isMain || b._count.memberships > 0 || deletingId === b.id
                    let deleteTitle = 'Delete branch'
                    if (b.isMain) deleteTitle = 'Cannot delete the main branch'
                    else if (b._count.memberships > 0)
                      deleteTitle = `Cannot delete — ${b._count.memberships} active employee(s) assigned`
                    return (
                      <tr key={b.id} className={b.isActive ? '' : 'opacity-60'}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {b.isMain && (
                              <Star
                                className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400"
                                aria-label="Main branch"
                              />
                            )}
                            <span className="font-medium text-slate-900">{b.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{b.organization.name}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {b.address ? (
                            <span className="line-clamp-1 max-w-xs">{b.address}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                            <div className="leading-tight">
                              <div
                                className={
                                  coords.secondary ? 'text-slate-700' : 'italic text-slate-400'
                                }
                              >
                                {coords.primary}
                              </div>
                              {coords.secondary && (
                                <div className="text-[10px] text-slate-400">{coords.secondary}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            <Users className="h-2.5 w-2.5" />
                            {b._count.memberships}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {b.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              <Power className="h-2.5 w-2.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(b)}
                              title="Edit branch"
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(b)}
                              disabled={deleteDisabled}
                              title={deleteTitle}
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            >
                              {deletingId === b.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Create modal ────────────────────────────────────────────────── */}
      {showCreate && (
        <Modal
          title="Create branch"
          subtitle="Add a new office location for an organization"
          onClose={() => setShowCreate(false)}
        >
          <div className="space-y-4">
            <Field label="Organization" required>
              <select
                value={createForm.organizationId}
                onChange={(e) => setCreateForm({ ...createForm, organizationId: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Choose an organization…</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Branch name" required>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Pokhara Office"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </Field>

            <Field label="Address">
              <input
                type="text"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                placeholder="e.g. Lakeside-6, Pokhara"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </Field>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                Leave all three geofence fields empty to <em>inherit</em> the organization&apos;s
                geofence. Set them to override at the branch level.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Office latitude">
                  <input
                    type="number"
                    step="any"
                    value={createForm.officeLat}
                    onChange={(e) => setCreateForm({ ...createForm, officeLat: e.target.value })}
                    placeholder="27.71172"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </Field>
                <Field label="Office longitude">
                  <input
                    type="number"
                    step="any"
                    value={createForm.officeLng}
                    onChange={(e) => setCreateForm({ ...createForm, officeLng: e.target.value })}
                    placeholder="85.32390"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Geofence radius (meters)">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={createForm.geofenceRadius}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, geofenceRadius: e.target.value })
                    }
                    placeholder="100"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </Field>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creating ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Creating…
                  </span>
                ) : (
                  'Create branch'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit modal ──────────────────────────────────────────────────── */}
      {edit && (
        <Modal
          title={
            <span className="inline-flex items-center gap-2">
              {edit.isMain && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
              Edit branch
            </span>
          }
          subtitle={edit.organizationName}
          onClose={() => setEdit(null)}
        >
          <div className="space-y-4">
            <Field label="Branch name" required>
              <input
                type="text"
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </Field>

            <Field label="Address">
              <input
                type="text"
                value={edit.address}
                onChange={(e) => setEdit({ ...edit, address: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </Field>

            <div className="rounded-lg bg-slate-50 p-3">
              {edit.isMain ? (
                <p className="text-[11px] leading-relaxed text-slate-500">
                  This is the main branch — its geofence always inherits the
                  organization-level geofence and is managed in Organization
                  Settings. It cannot be set per-branch.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                    Clear any field to <em>inherit</em> from the organization&apos;s geofence.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Office latitude">
                      <input
                        type="number"
                        step="any"
                        value={edit.officeLat}
                        onChange={(e) => setEdit({ ...edit, officeLat: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </Field>
                    <Field label="Office longitude">
                      <input
                        type="number"
                        step="any"
                        value={edit.officeLng}
                        onChange={(e) => setEdit({ ...edit, officeLng: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Geofence radius (meters)">
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={edit.geofenceRadius}
                        onChange={(e) => setEdit({ ...edit, geofenceRadius: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </Field>
                  </div>
                </>
              )}
            </div>

            <label
              className={`flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 ${
                edit.isMain ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              }`}
              title={edit.isMain ? 'The main branch cannot be deactivated' : undefined}
            >
              <div>
                <div className="text-sm font-medium text-slate-700">Branch is active</div>
                <div className="text-[11px] text-slate-400">
                  {edit.isMain
                    ? 'The main branch must stay active'
                    : 'Inactive branches cannot accept new employees'}
                </div>
              </div>
              <div
                onClick={() => {
                  if (!edit.isMain) setEdit({ ...edit, isActive: !edit.isActive })
                }}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  edit.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-1 h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    edit.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
            </label>

            <div className="flex gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={() => setEdit(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Small presentational helpers (kept local to this page) ────────────────

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{title}</h2>
              {subtitle && <p className="text-[11px] text-white/60">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}
