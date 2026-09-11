import { useMemo, useState } from 'react'
import { Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { formatCouponValue, normalizeCouponCode } from '../../lib/coupons'
import { AdminAction, AdminBadge, AdminConfirm, AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { explainAdminError, formatDate } from './adminHelpers'

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: '10',
  min_subtotal: '',
  max_discount: '',
  usage_limit: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
}

function toDateInput(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function toOptionalInt(value) {
  if (value === '' || value == null) return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

function couponToForm(coupon) {
  return {
    code: coupon.code || '',
    description: coupon.description || '',
    discount_type: coupon.discount_type || 'percent',
    discount_value: String(coupon.discount_value ?? ''),
    min_subtotal: coupon.min_subtotal ? String(coupon.min_subtotal) : '',
    max_discount: coupon.max_discount ? String(coupon.max_discount) : '',
    usage_limit: coupon.usage_limit != null ? String(coupon.usage_limit) : '',
    starts_at: toDateInput(coupon.starts_at),
    ends_at: toDateInput(coupon.ends_at),
    is_active: coupon.is_active !== false,
  }
}

function formToPayload(form) {
  const discountValue = parseInt(form.discount_value, 10)
  return {
    code: normalizeCouponCode(form.code),
    description: form.description.trim() || null,
    discount_type: form.discount_type,
    discount_value: discountValue,
    min_subtotal: toOptionalInt(form.min_subtotal) || 0,
    max_discount: form.discount_type === 'percent' ? toOptionalInt(form.max_discount) : null,
    usage_limit: toOptionalInt(form.usage_limit),
    starts_at: form.starts_at ? new Date(`${form.starts_at}T00:00:00`).toISOString() : null,
    ends_at: form.ends_at ? new Date(`${form.ends_at}T23:59:59`).toISOString() : null,
    is_active: form.is_active,
    updated_at: new Date().toISOString(),
  }
}

export default function AdminCoupons({ coupons, setCoupons, patchCoupon, removeCoupon }) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => (
    coupons.filter((c) => matchesQuery([c.code, c.description, c.discount_type], query))
  ), [coupons, query])

  const setField = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const startEdit = (coupon) => {
    setEditingId(coupon.id)
    setForm(couponToForm(coupon))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const payload = formToPayload(form)
    if (!payload.code || payload.code.length < 3) {
      showToast('Code needs at least 3 characters.', 'error')
      return
    }
    if (!payload.discount_value || payload.discount_value < 1) {
      showToast('Discount value must be at least 1.', 'error')
      return
    }
    if (payload.discount_type === 'percent' && payload.discount_value > 100) {
      showToast('Percent discount cannot exceed 100.', 'error')
      return
    }
    setSaving(true)
    if (editingId) {
      const { data, error } = await supabase
        .from('coupons')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()
      setSaving(false)
      if (error) {
        showToast(explainAdminError(error), 'error')
        return
      }
      patchCoupon(editingId, data)
      showToast(`Coupon ${payload.code} updated`, 'success')
      resetForm()
      return
    }
    const { data, error } = await supabase
      .from('coupons')
      .insert(payload)
      .select()
      .single()
    setSaving(false)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    setCoupons((prev) => [data, ...prev])
    showToast(`Coupon ${payload.code} created`, 'success')
    resetForm()
  }

  const toggleActive = async (coupon) => {
    const next = !coupon.is_active
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', coupon.id)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    patchCoupon(coupon.id, { is_active: next })
    showToast(next ? `${coupon.code} enabled` : `${coupon.code} disabled`, 'success')
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    const { error } = await supabase.from('coupons').delete().eq('id', deleteTarget.id)
    setBusy(false)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    removeCoupon(deleteTarget.id)
    if (editingId === deleteTarget.id) resetForm()
    showToast('Coupon deleted', 'success')
    setDeleteTarget(null)
  }

  return (
    <div>
      <form className="admin-card admin-coupon-form" onSubmit={handleSave}>
        <h3 className="admin-card__title">
          {editingId ? 'EDIT COUPON' : 'NEW COUPON'}
        </h3>
        <div className="admin-form-grid">
          <div>
            <label className="field-label" htmlFor="coupon-code">Code</label>
            <input
              id="coupon-code"
              className="input-dark"
              value={form.code}
              onChange={setField('code')}
              placeholder="WELCOME10"
              aria-label="Coupon code"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="coupon-type">Type</label>
            <select
              id="coupon-type"
              className="select-dark"
              value={form.discount_type}
              onChange={setField('discount_type')}
              aria-label="Discount type"
            >
              <option value="percent">Percent</option>
              <option value="flat">Flat ₹</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="coupon-value">
              {form.discount_type === 'percent' ? 'Percent' : 'Amount ₹'}
            </label>
            <input
              id="coupon-value"
              className="input-dark"
              type="number"
              min="1"
              max={form.discount_type === 'percent' ? 100 : 999999}
              value={form.discount_value}
              onChange={setField('discount_value')}
              aria-label="Discount value"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="coupon-min">Min rental ₹</label>
            <input
              id="coupon-min"
              className="input-dark"
              type="number"
              min="0"
              value={form.min_subtotal}
              onChange={setField('min_subtotal')}
              aria-label="Minimum rental subtotal"
            />
          </div>
          {form.discount_type === 'percent' ? (
            <div>
              <label className="field-label" htmlFor="coupon-cap">Max discount ₹</label>
              <input
                id="coupon-cap"
                className="input-dark"
                type="number"
                min="0"
                value={form.max_discount}
                onChange={setField('max_discount')}
                aria-label="Maximum discount cap"
              />
            </div>
          ) : null}
          <div>
            <label className="field-label" htmlFor="coupon-limit">Usage limit</label>
            <input
              id="coupon-limit"
              className="input-dark"
              type="number"
              min="1"
              value={form.usage_limit}
              onChange={setField('usage_limit')}
              placeholder="Unlimited"
              aria-label="Usage limit"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="coupon-start">Starts</label>
            <input
              id="coupon-start"
              className="input-dark"
              type="date"
              value={form.starts_at}
              onChange={setField('starts_at')}
              aria-label="Coupon start date"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="coupon-end">Ends</label>
            <input
              id="coupon-end"
              className="input-dark"
              type="date"
              value={form.ends_at}
              onChange={setField('ends_at')}
              aria-label="Coupon end date"
            />
          </div>
          <div className="admin-form-wide">
            <label className="field-label" htmlFor="coupon-desc">Description</label>
            <input
              id="coupon-desc"
              className="input-dark"
              value={form.description}
              onChange={setField('description')}
              placeholder="Welcome offer"
              aria-label="Coupon description"
            />
          </div>
          <label className="admin-check" htmlFor="coupon-active">
            <input
              id="coupon-active"
              type="checkbox"
              checked={form.is_active}
              onChange={setField('is_active')}
              aria-label="Coupon is active"
            />
            Active
          </label>
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="btn-primary" disabled={saving} aria-label={editingId ? 'Update coupon' : 'Create coupon'}>
            <Plus size={14} />
            {saving ? 'Saving…' : editingId ? 'Update coupon' : 'Create coupon'}
          </button>
          {editingId ? (
            <button type="button" className="btn-outline" onClick={resetForm} aria-label="Cancel coupon edit">
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search coupon code…"
          ariaLabel="Search coupons"
        />
        <p className="admin-muted">{filtered.length} coupon{filtered.length === 1 ? '' : 's'}</p>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty emoji="🎟️" title="No coupons" body="Create a code above. Renters apply it at checkout." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Uses</th>
                <th>Window</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <span className="admin-cell-title">{coupon.code}</span>
                    <span className="admin-cell-sub">{coupon.description || '—'}</span>
                  </td>
                  <td>
                    {formatCouponValue(coupon)}
                    {coupon.min_subtotal > 0 ? (
                      <span className="admin-cell-sub">min ₹{coupon.min_subtotal}</span>
                    ) : null}
                  </td>
                  <td>
                    {coupon.used_count || 0}
                    {coupon.usage_limit != null ? ` / ${coupon.usage_limit}` : ' / ∞'}
                  </td>
                  <td>
                    {coupon.starts_at || coupon.ends_at
                      ? `${formatDate(coupon.starts_at)} → ${formatDate(coupon.ends_at)}`
                      : 'Always'}
                  </td>
                  <td>
                    {coupon.is_active
                      ? <AdminBadge kind="live">Active</AdminBadge>
                      : <AdminBadge kind="hidden">Off</AdminBadge>}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <AdminAction
                        tip="Edit coupon"
                        ariaLabel={`Edit ${coupon.code}`}
                        onClick={() => startEdit(coupon)}
                      >
                        <Pencil size={14} />
                      </AdminAction>
                      <AdminAction
                        tip={coupon.is_active ? 'Disable coupon' : 'Enable coupon'}
                        ariaLabel={coupon.is_active ? `Disable ${coupon.code}` : `Enable ${coupon.code}`}
                        on={coupon.is_active}
                        onClick={() => toggleActive(coupon)}
                      >
                        <Power size={14} />
                      </AdminAction>
                      <AdminAction
                        tip="Delete coupon"
                        ariaLabel={`Delete ${coupon.code}`}
                        danger
                        onClick={() => setDeleteTarget(coupon)}
                      >
                        <Trash2 size={14} />
                      </AdminAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget ? (
        <AdminConfirm
          title="Delete coupon?"
          body={`${deleteTarget.code} will stop working on new bookings.`}
          confirmLabel="Delete coupon"
          loading={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}
