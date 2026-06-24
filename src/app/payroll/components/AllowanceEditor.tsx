'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Check, X, Coins } from 'lucide-react'
import { api } from '@/lib/api'
import { Allowance, AllowanceType } from '../types'
import { fmt } from '../utils'

interface Props {
  userId: string
  isNp: boolean
  canEdit: boolean
  /** Called after any successful add/edit/delete so the parent can refresh
   *  its live-preview estimate. Receives the new full allowance list. */
  onChanged?: (allowances: Allowance[]) => void
}

interface Draft {
  label: string
  amount: string
  type: AllowanceType
  effectiveFrom: string
  effectiveTo: string
}

const TYPE_LABELS: Record<AllowanceType, { en: string; np: string; cls: string }> = {
  RECURRING: { en: 'Recurring', np: 'आवर्ती', cls: 'bg-blue-50 text-blue-700' },
  PRO_RATA: { en: 'Pro-rata', np: 'समानुपातिक', cls: 'bg-violet-50 text-violet-700' },
  ONE_TIME: { en: 'One-time', np: 'एक पटक', cls: 'bg-amber-50 text-amber-700' },
}

const today = () => new Date().toISOString().slice(0, 10)
const emptyDraft = (): Draft => ({
  label: '',
  amount: '',
  type: 'RECURRING',
  effectiveFrom: today(),
  effectiveTo: '',
})

export default function AllowanceEditor({ userId, isNp, canEdit, onChanged }: Props) {
  const [allowances, setAllowances] = useState<Allowance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft())
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const res = await api.get(`/api/v1/payroll/settings/${userId}/allowances`)
    setLoading(false)
    if (res.data) {
      const list = res.data as Allowance[]
      setAllowances(list)
      onChanged?.(list)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    load()
    setAdding(false)
    setEditingId(null)
  }, [load])

  const validate = (d: Draft): string | null => {
    if (!d.label.trim()) return isNp ? 'शीर्षक आवश्यक छ' : 'Label is required'
    if (!d.amount || Number(d.amount) <= 0)
      return isNp ? 'रकम ० भन्दा बढी हुनुपर्छ' : 'Amount must be greater than zero'
    if (!d.effectiveFrom) return isNp ? 'सुरु मिति आवश्यक छ' : 'Start date is required'
    if (d.effectiveTo && d.effectiveTo < d.effectiveFrom)
      return isNp ? 'अन्त्य मिति सुरु अघि हुन सक्दैन' : 'End date cannot be before start'
    return null
  }

  const payload = (d: Draft) => ({
    label: d.label.trim(),
    amount: Number(d.amount),
    type: d.type,
    effectiveFrom: d.effectiveFrom,
    effectiveTo: d.effectiveTo || null,
  })

  const create = async () => {
    const err = validate(draft)
    if (err) return setError(err)
    setBusy(true)
    setError('')
    const res = await api.post(`/api/v1/payroll/settings/${userId}/allowances`, payload(draft))
    setBusy(false)
    if (res.error) return setError(res.error.message || 'Failed to add allowance')
    setDraft(emptyDraft())
    setAdding(false)
    load()
  }

  const startEdit = (a: Allowance) => {
    setEditingId(a.id)
    setEditDraft({
      label: a.label,
      amount: String(a.amount),
      type: a.type,
      effectiveFrom: a.effectiveFrom,
      effectiveTo: a.effectiveTo ?? '',
    })
    setError('')
  }

  const saveEdit = async () => {
    const err = validate(editDraft)
    if (err) return setError(err)
    setBusy(true)
    setError('')
    const res = await api.put(`/api/v1/payroll/allowances/${editingId}`, payload(editDraft))
    setBusy(false)
    if (res.error) return setError(res.error.message || 'Failed to update allowance')
    setEditingId(null)
    load()
  }

  const remove = async (id: string) => {
    if (!confirm(isNp ? 'यो भत्ता हटाउने?' : 'Remove this allowance?')) return
    setBusy(true)
    const res = await api.delete(`/api/v1/payroll/allowances/${id}`)
    setBusy(false)
    if (res.error) return setError(res.error.message || 'Failed to delete allowance')
    load()
  }

  const inputCls =
    'w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200'

  const draftRow = (d: Draft, set: (d: Draft) => void) => (
    <div className="grid grid-cols-12 items-center gap-2">
      <input
        className={`${inputCls} col-span-3`}
        placeholder={isNp ? 'शीर्षक' : 'Label'}
        value={d.label}
        onChange={(e) => set({ ...d, label: e.target.value })}
      />
      <div className="relative col-span-2">
        <input
          type="number"
          min="0"
          step="0.01"
          className={`${inputCls} pr-7`}
          placeholder="0"
          value={d.amount}
          onChange={(e) => set({ ...d, amount: e.target.value })}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rs.</span>
      </div>
      <select
        className={`${inputCls} col-span-2`}
        value={d.type}
        onChange={(e) => set({ ...d, type: e.target.value as AllowanceType })}
      >
        <option value="RECURRING">{isNp ? TYPE_LABELS.RECURRING.np : TYPE_LABELS.RECURRING.en}</option>
        <option value="PRO_RATA">{isNp ? TYPE_LABELS.PRO_RATA.np : TYPE_LABELS.PRO_RATA.en}</option>
        <option value="ONE_TIME">{isNp ? TYPE_LABELS.ONE_TIME.np : TYPE_LABELS.ONE_TIME.en}</option>
      </select>
      <input
        type="date"
        className={`${inputCls} col-span-2`}
        value={d.effectiveFrom}
        onChange={(e) => set({ ...d, effectiveFrom: e.target.value })}
      />
      <input
        type="date"
        className={`${inputCls} col-span-2`}
        value={d.effectiveTo}
        disabled={d.type === 'ONE_TIME'}
        placeholder={isNp ? 'जारी' : 'Ongoing'}
        onChange={(e) => set({ ...d, effectiveTo: e.target.value })}
      />
      <div className="col-span-1" />
    </div>
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Coins className="h-4 w-4 text-slate-600" />
          {isNp ? 'भत्ताहरू' : 'Allowances'}
        </h3>
        {canEdit && !adding && (
          <button
            onClick={() => {
              setDraft(emptyDraft())
              setAdding(true)
              setError('')
            }}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            {isNp ? 'थप्नुहोस्' : 'Add allowance'}
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-slate-400">
        {isNp
          ? 'आवर्ती मासिक हुन्छ, एक पटक त्यही महिना मात्र, समानुपातिक आंशिक महिनामा दिन अनुसार घटाइन्छ।'
          : 'Recurring pays every month; one-time pays once in its month; pro-rata scales by active days in partial months.'}
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
      )}

      {/* Column headers */}
      {(allowances.length > 0 || adding) && (
        <div className="mb-1.5 grid grid-cols-12 gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          <div className="col-span-3">{isNp ? 'शीर्षक' : 'Label'}</div>
          <div className="col-span-2">{isNp ? 'रकम' : 'Amount'}</div>
          <div className="col-span-2">{isNp ? 'प्रकार' : 'Type'}</div>
          <div className="col-span-2">{isNp ? 'देखि' : 'From'}</div>
          <div className="col-span-2">{isNp ? 'सम्म' : 'To'}</div>
          <div className="col-span-1" />
        </div>
      )}

      <div className="space-y-2">
        {allowances.map((a) =>
          editingId === a.id ? (
            <div key={a.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              {draftRow(editDraft, setEditDraft)}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={saveEdit}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {isNp ? 'सुरक्षित' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <div
              key={a.id}
              className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-100 px-1 py-2 text-sm hover:bg-slate-50/60"
            >
              <div className="col-span-3 truncate font-medium text-slate-900">{a.label}</div>
              <div className="col-span-2 text-slate-700">Rs. {fmt(a.amount)}</div>
              <div className="col-span-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_LABELS[a.type].cls}`}
                >
                  {isNp ? TYPE_LABELS[a.type].np : TYPE_LABELS[a.type].en}
                </span>
              </div>
              <div className="col-span-2 text-xs text-slate-500">{a.effectiveFrom}</div>
              <div className="col-span-2 text-xs text-slate-500">
                {a.type === 'ONE_TIME' ? '—' : a.effectiveTo || (isNp ? 'जारी' : 'Ongoing')}
              </div>
              <div className="col-span-1 flex justify-end gap-1">
                {canEdit && (
                  <>
                    <button
                      onClick={() => startEdit(a)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title={isNp ? 'सम्पादन' : 'Edit'}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title={isNp ? 'हटाउनुहोस्' : 'Delete'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ),
        )}

        {adding && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            {draftRow(draft, setDraft)}
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={create}
                disabled={busy}
                className="flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {isNp ? 'थप्नुहोस्' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setAdding(false)
                  setError('')
                }}
                className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                <X className="h-3.5 w-3.5" />
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {!loading && allowances.length === 0 && !adding && (
          <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
            {isNp ? 'कुनै भत्ता छैन' : 'No allowances configured'}
          </div>
        )}
      </div>
    </div>
  )
}
