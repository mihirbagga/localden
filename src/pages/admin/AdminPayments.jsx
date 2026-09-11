import { useState } from 'react'
import { ImagePlus, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { METHOD_LABEL, methodConfig } from '../../lib/payments'
import { AdminBadge } from './AdminShared'
import { explainAdminError } from './adminHelpers'
import AdminPlatformFee from './AdminPlatformFee'
import '../paymentMethods.css'

function nextConfig(method, patch) {
  return { ...methodConfig(method), ...patch }
}

export default function AdminPayments({ methods, patchMethod }) {
  const { showToast } = useToast()
  const [drafts, setDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [uploadingId, setUploadingId] = useState(null)

  const getDraft = (method) => {
    const base = methodConfig(method)
    return drafts[method.id] || {
      name: method.name || '',
      is_enabled: method.is_enabled,
      sort_order: String(method.sort_order ?? 0),
      key_id: base.key_id || '',
      qr_image_url: base.qr_image_url || '',
      upi_id: base.upi_id || '',
      account_name: base.account_name || '',
      account_number: base.account_number || '',
      ifsc: base.ifsc || '',
      bank_name: base.bank_name || '',
      instructions: base.instructions || '',
    }
  }

  const setDraftField = (method, key, value) => {
    const current = getDraft(method)
    setDrafts((prev) => ({
      ...prev,
      [method.id]: { ...current, [key]: value },
    }))
  }

  const saveMethod = async (method) => {
    const draft = getDraft(method)
    const config = nextConfig(method, {
      key_id: draft.key_id.trim(),
      qr_image_url: draft.qr_image_url.trim(),
      upi_id: draft.upi_id.trim(),
      account_name: draft.account_name.trim(),
      account_number: draft.account_number.trim(),
      ifsc: draft.ifsc.trim(),
      bank_name: draft.bank_name.trim(),
      instructions: draft.instructions.trim(),
    })
    setSavingId(method.id)
    const { data, error } = await supabase
      .from('payment_methods')
      .update({
        name: draft.name.trim() || method.name,
        is_enabled: Boolean(draft.is_enabled),
        sort_order: parseInt(draft.sort_order, 10) || 0,
        config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', method.id)
      .select()
      .single()
    setSavingId(null)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    patchMethod(method.id, data)
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[method.id]
      return next
    })
    showToast(`${data.name} saved`, 'success')
  }

  const uploadQr = async (method, file) => {
    if (!file) return
    setUploadingId(method.id)
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `payments/qr-${method.id}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('listing-photos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) {
      setUploadingId(null)
      showToast(upErr.message, 'error')
      return
    }
    const { data } = supabase.storage.from('listing-photos').getPublicUrl(path)
    setDraftField(method, 'qr_image_url', data.publicUrl)
    setUploadingId(null)
    showToast('QR uploaded. Save to publish.', 'success')
  }

  if (!methods.length) {
    return (
      <div className="admin-empty">
        <div className="admin-empty__emoji">💳</div>
        <div className="admin-empty__title">Payment table missing</div>
        <p className="admin-muted">Run supabase/payments_migration.sql in Supabase SQL Editor.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="admin-muted admin-pay-intro">
        Enable methods renters see at checkout. Razorpay needs a Key ID. QR needs an uploaded image.
      </p>
      <AdminPlatformFee />
      {methods.map((method) => {
        const draft = getDraft(method)
        const type = method.method_type
        return (
          <div key={method.id} className="admin-card admin-pay-card">
            <div className="admin-pay-head">
              <div>
                <div className="admin-pay-title">{METHOD_LABEL[type] || method.name}</div>
                <div className="admin-pay-type">{type}</div>
              </div>
              {draft.is_enabled
                ? <AdminBadge kind="live">Enabled</AdminBadge>
                : <AdminBadge kind="hidden">Disabled</AdminBadge>}
            </div>

            <div className="admin-form-grid">
              <div>
                <label className="field-label" htmlFor={`pay-name-${method.id}`}>Display name</label>
                <input
                  id={`pay-name-${method.id}`}
                  className="input-dark"
                  value={draft.name}
                  onChange={(e) => setDraftField(method, 'name', e.target.value)}
                  aria-label={`${method.name} display name`}
                />
              </div>
              <div>
                <label className="field-label" htmlFor={`pay-sort-${method.id}`}>Sort order</label>
                <input
                  id={`pay-sort-${method.id}`}
                  className="input-dark"
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) => setDraftField(method, 'sort_order', e.target.value)}
                  aria-label={`${method.name} sort order`}
                />
              </div>

              {type === 'razorpay' ? (
                <div className="admin-form-wide">
                  <label className="field-label" htmlFor="pay-rzp-key">Razorpay Key ID</label>
                  <input
                    id="pay-rzp-key"
                    className="input-dark"
                    value={draft.key_id}
                    onChange={(e) => setDraftField(method, 'key_id', e.target.value)}
                    placeholder="rzp_live_xxxxx or rzp_test_xxxxx"
                    aria-label="Razorpay key id"
                  />
                </div>
              ) : null}

              {(type === 'qr' || type === 'upi') ? (
                <div className="admin-form-wide">
                  <label className="field-label" htmlFor={`pay-upi-${method.id}`}>UPI ID</label>
                  <input
                    id={`pay-upi-${method.id}`}
                    className="input-dark"
                    value={draft.upi_id}
                    onChange={(e) => setDraftField(method, 'upi_id', e.target.value)}
                    placeholder="name@okaxis"
                    aria-label="UPI ID"
                  />
                </div>
              ) : null}

              {type === 'qr' ? (
                <div className="admin-form-wide">
                  <label className="field-label admin-file-label" htmlFor={`pay-qr-${method.id}`}>
                    <ImagePlus size={14} />
                    {uploadingId === method.id ? 'Uploading…' : 'Upload QR image'}
                  </label>
                  <input
                    id={`pay-qr-${method.id}`}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => uploadQr(method, e.target.files?.[0])}
                    aria-label="Upload QR code image"
                  />
                  {draft.qr_image_url ? (
                    <img src={draft.qr_image_url} alt="Payment QR preview" className="admin-qr-preview" />
                  ) : null}
                </div>
              ) : null}

              {type === 'bank' ? (
                <>
                  <div>
                    <label className="field-label" htmlFor="pay-acc-name">Account name</label>
                    <input id="pay-acc-name" className="input-dark" value={draft.account_name}
                      onChange={(e) => setDraftField(method, 'account_name', e.target.value)}
                      aria-label="Bank account name" />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="pay-acc-no">Account number</label>
                    <input id="pay-acc-no" className="input-dark" value={draft.account_number}
                      onChange={(e) => setDraftField(method, 'account_number', e.target.value)}
                      aria-label="Bank account number" />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="pay-ifsc">IFSC</label>
                    <input id="pay-ifsc" className="input-dark" value={draft.ifsc}
                      onChange={(e) => setDraftField(method, 'ifsc', e.target.value)}
                      aria-label="IFSC code" />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="pay-bank">Bank name</label>
                    <input id="pay-bank" className="input-dark" value={draft.bank_name}
                      onChange={(e) => setDraftField(method, 'bank_name', e.target.value)}
                      aria-label="Bank name" />
                  </div>
                </>
              ) : null}

              <div className="admin-form-wide">
                <label className="field-label" htmlFor={`pay-note-${method.id}`}>Checkout note</label>
                <input
                  id={`pay-note-${method.id}`}
                  className="input-dark"
                  value={draft.instructions}
                  onChange={(e) => setDraftField(method, 'instructions', e.target.value)}
                  aria-label={`${method.name} checkout instructions`}
                />
              </div>

              <label className="admin-check" htmlFor={`pay-on-${method.id}`}>
                <input
                  id={`pay-on-${method.id}`}
                  type="checkbox"
                  checked={draft.is_enabled}
                  onChange={(e) => setDraftField(method, 'is_enabled', e.target.checked)}
                  aria-label={`Enable ${method.name}`}
                />
                Enable at checkout
              </label>
            </div>

            <div className="admin-form-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={savingId === method.id}
                onClick={() => saveMethod(method)}
                aria-label={`Save ${method.name}`}
              >
                <Save size={14} />
                {savingId === method.id ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
