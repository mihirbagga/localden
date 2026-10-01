import { useEffect, useState } from 'react'
import { Save, Ticket } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { useSignupCouponSetting } from '../../hooks/useSignupCouponSetting'
import { AdminBadge } from './AdminShared'
import { explainAdminError } from './adminHelpers'

export default function AdminSignupCoupon() {
  const { showToast } = useToast()
  const { setting, setSetting, loading } = useSignupCouponSetting()
  const [enabled, setEnabled] = useState(true)
  const [percent, setPercent] = useState('50')
  const [maxDiscount, setMaxDiscount] = useState('500')
  const [minSubtotal, setMinSubtotal] = useState('0')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEnabled(setting.enabled)
    setPercent(String(setting.discount_percent ?? 50))
    setMaxDiscount(String(setting.max_discount ?? 500))
    setMinSubtotal(String(setting.min_subtotal ?? 0))
  }, [setting])

  const saveSetting = async () => {
    const pVal = Number(percent)
    const mVal = Number(maxDiscount)
    const sVal = Number(minSubtotal)

    if (!Number.isFinite(pVal) || pVal < 0 || pVal > 100) {
      showToast('Discount percent must be between 0 and 100.', 'error')
      return
    }
    if (!Number.isFinite(mVal) || mVal < 0) {
      showToast('Max discount cap must be 0 or positive.', 'error')
      return
    }
    if (!Number.isFinite(sVal) || sVal < 0) {
      showToast('Min rental subtotal must be 0 or positive.', 'error')
      return
    }

    setSaving(true)
    const next = {
      enabled,
      discount_percent: pVal,
      max_discount: mVal,
      min_subtotal: sVal,
    }

    const { error } = await supabase.from('site_settings').upsert({
      id: 'signup_coupon',
      value: next,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setSaving(false)
      showToast(explainAdminError(error), 'error')
      return
    }

    // Also update existing UNUSED welcome coupons so changes take effect immediately
    let updatedCount = 0
    try {
      const { data: unusedCoupons } = await supabase
        .from('coupons')
        .select('id, code, discount_value, used_count')
        .ilike('code', 'WELCOME%')
        .eq('used_count', 0)

      if (unusedCoupons && unusedCoupons.length > 0) {
        for (const c of unusedCoupons) {
          const newCode = c.code.replace(/\d+$/, String(pVal))
          const { error: updErr } = await supabase
            .from('coupons')
            .update({
              discount_value: pVal,
              code: newCode,
              description: `Welcome signup bonus (${pVal}% off)`,
              max_discount: mVal > 0 ? mVal : null,
              min_subtotal: sVal > 0 ? sVal : 0,
              is_active: enabled,
            })
            .eq('id', c.id)

          if (!updErr) updatedCount++
        }
      }
    } catch (batchErr) {
      console.warn('Batch update unused welcome coupons failed:', batchErr)
    }

    setSaving(false)
    setSetting(next)
    showToast(
      updatedCount > 0
        ? `Settings saved! Updated ${updatedCount} unused welcome coupon(s) to ${pVal}%.`
        : 'Welcome signup coupon settings saved',
      'success'
    )
  }

  if (loading) return null

  return (
    <div className="admin-card admin-pay-card">
      <div className="admin-pay-head">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-pink-400" />
          <div>
            <div className="admin-pay-title">Welcome Signup Coupon</div>
            <div className="admin-pay-type">Auto-issued to new users upon registration</div>
          </div>
        </div>
        {enabled ? (
          <AdminBadge kind="live">{percent}% Welcome Coupon ON</AdminBadge>
        ) : (
          <AdminBadge kind="hidden">Welcome Coupons OFF</AdminBadge>
        )}
      </div>

      <div className="admin-form-grid">
        <div>
          <label className="field-label" htmlFor="signup-coupon-percent">
            Discount Percent (%)
          </label>
          <input
            id="signup-coupon-percent"
            className="input-dark"
            type="number"
            min="0"
            max="100"
            step="1"
            value={percent}
            disabled={!enabled}
            onChange={(e) => setPercent(e.target.value)}
            aria-label="Welcome coupon discount percentage"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="signup-coupon-max">
            Max Discount Cap (₹)
          </label>
          <input
            id="signup-coupon-max"
            className="input-dark"
            type="number"
            min="0"
            step="50"
            value={maxDiscount}
            disabled={!enabled}
            onChange={(e) => setMaxDiscount(e.target.value)}
            placeholder="500"
            aria-label="Maximum discount cap in rupees"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="signup-coupon-min">
            Min Rental Subtotal (₹)
          </label>
          <input
            id="signup-coupon-min"
            className="input-dark"
            type="number"
            min="0"
            step="50"
            value={minSubtotal}
            disabled={!enabled}
            onChange={(e) => setMinSubtotal(e.target.value)}
            placeholder="0"
            aria-label="Minimum subtotal required to apply welcome coupon"
          />
        </div>

        <label className="admin-check flex items-center gap-2 cursor-pointer mt-2" htmlFor="signup-coupon-on">
          <input
            id="signup-coupon-on"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            aria-label="Enable welcome signup coupons"
          />
          Automatically issue welcome coupon on new user registration
        </label>
      </div>

      <p className="admin-muted admin-fee-preview text-xs mt-3 text-white/60">
        {enabled ? (
          <>
            🎁 New users receive a <strong>{percent}% OFF</strong> welcome coupon (Code: <code>WELCOME&lt;NAME&gt;{percent}</code>)
            {Number(maxDiscount) > 0 ? ` capped at ₹${maxDiscount}` : ''}
            {Number(minSubtotal) > 0 ? ` on min rental of ₹${minSubtotal}` : ''}.
          </>
        ) : (
          '🚫 Welcome coupons are currently disabled for new signups.'
        )}
      </p>

      <div className="admin-form-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={saveSetting}
          aria-label="Save signup coupon settings"
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save Coupon Setting'}
        </button>
      </div>
    </div>
  )
}
