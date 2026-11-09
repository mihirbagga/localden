import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { usePlatformFee } from '../../hooks/usePlatformFee'
import { computePlatformFee, platformFeeCopy } from '../../lib/platformFee'
import { AdminBadge } from './AdminShared'
import { explainAdminError } from './adminHelpers'

const SAMPLE_SUBTOTAL = 1000

export default function AdminPlatformFee() {
  const { showToast } = useToast()
  const { fee, setFee, loading } = usePlatformFee()
  const [enabled, setEnabled] = useState(true)
  const [feeType, setFeeType] = useState('percent')
  const [feeValue, setFeeValue] = useState('20')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEnabled(fee.enabled)
    setFeeType(fee.fee_type)
    setFeeValue(String(fee.fee_value ?? 20))
  }, [fee])

  const draftFee = {
    enabled,
    fee_type: feeType,
    fee_value: Number(feeValue) || 0,
  }
  const sampleFee = computePlatformFee(SAMPLE_SUBTOTAL, draftFee, false)
  const sampleHubFee = computePlatformFee(SAMPLE_SUBTOTAL, draftFee, true)

  const saveFee = async () => {
    const value = Number(feeValue)
    if (!Number.isFinite(value) || value < 0) {
      showToast('Fee value must be 0 or more.', 'error')
      return
    }
    if (feeType === 'percent' && value > 100) {
      showToast('Percent fee cannot exceed 100.', 'error')
      return
    }
    setSaving(true)
    const next = {
      enabled,
      fee_type: feeType,
      fee_value: value,
    }
    const { error } = await supabase.from('site_settings').upsert({
      id: 'platform_fee',
      value: next,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    setFee(next)
    showToast('Platform fee saved', 'success')
  }

  if (loading) return null

  return (
    <div className="admin-card admin-pay-card">
      <div className="admin-pay-head">
        <div>
          <div className="admin-pay-title">Platform fee</div>
          <div className="admin-pay-type">Added on discounted rental, before deposit</div>
        </div>
        {enabled
          ? <AdminBadge kind="live">On</AdminBadge>
          : <AdminBadge kind="hidden">Off</AdminBadge>}
      </div>

      <div className="admin-form-grid">
        <div>
          <label className="field-label" htmlFor="fee-type">Fee type</label>
          <select
            id="fee-type"
            className="select-dark"
            value={feeType}
            disabled={!enabled}
            onChange={(e) => setFeeType(e.target.value)}
            aria-label="Platform fee type"
          >
            <option value="percent">Percent of rental</option>
            <option value="flat">Flat amount ₹</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="fee-value">
            {feeType === 'flat' ? 'Amount ₹' : 'Percent'}
          </label>
          <input
            id="fee-value"
            className="input-dark"
            type="number"
            min="0"
            max={feeType === 'percent' ? 100 : undefined}
            step="1"
            value={feeValue}
            disabled={!enabled}
            onChange={(e) => setFeeValue(e.target.value)}
            aria-label="Platform fee value"
          />
        </div>
        <label className="admin-check" htmlFor="fee-on">
          <input
            id="fee-on"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            aria-label="Enable platform fee"
          />
          Add platform fee at checkout
        </label>
      </div>

      <p className="admin-muted admin-fee-preview">
        {platformFeeCopy(draftFee)}
        {enabled && draftFee.fee_value > 0
          ? ` Example: ₹${SAMPLE_SUBTOTAL} rental → fee ₹${sampleFee}.`
          : ''}
      </p>

      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90 space-y-1.5 my-3">
        <div className="font-bold flex items-center gap-1.5 text-amber-300">
          <span>🏬 LocalDen Hub Storage &amp; Fulfillment Surcharge (+5%)</span>
        </div>
        <p className="text-[11px] text-white/70">
          Listings stored at LocalDen Hubs automatically incur an extra 5% platform take because we manage warehouse storage, climate control, hardware testing, and dispatch.
        </p>
        <p className="text-[11px] font-mono text-amber-300">
          Example: ₹{SAMPLE_SUBTOTAL} rental → Direct Host keeps ₹{SAMPLE_SUBTOTAL - sampleFee} · Hub Host keeps ₹{SAMPLE_SUBTOTAL - sampleHubFee} (Platform keeps ₹{sampleHubFee})
        </p>
      </div>

      <div className="admin-form-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={saveFee}
          aria-label="Save platform fee"
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save fee'}
        </button>
      </div>
    </div>
  )
}
