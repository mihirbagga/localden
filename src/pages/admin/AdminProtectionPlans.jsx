import { useEffect, useState } from 'react'
import { Save, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { useProtectionPlans } from '../../hooks/useProtectionPlans'
import { AdminBadge } from './AdminShared'
import { explainAdminError } from './adminHelpers'

export default function AdminProtectionPlans() {
  const { showToast } = useToast()
  const { plans, setPlans, loading } = useProtectionPlans()

  const [enabled, setEnabled] = useState(true)
  const [basicFee, setBasicFee] = useState('99')
  const [basicCoverage, setBasicCoverage] = useState('5000')
  const [fullFee, setFullFee] = useState('249')
  const [fullCoverage, setFullCoverage] = useState('50000')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEnabled(plans.enabled)
    setBasicFee(String(plans.basic_fee_per_day))
    setBasicCoverage(String(plans.basic_coverage))
    setFullFee(String(plans.full_fee_per_day))
    setFullCoverage(String(plans.full_coverage))
  }, [plans])

  const saveProtectionSettings = async () => {
    setSaving(true)
    const next = {
      enabled,
      basic_fee_per_day: Math.max(0, Number(basicFee) || 0),
      basic_coverage: Math.max(0, Number(basicCoverage) || 0),
      full_fee_per_day: Math.max(0, Number(fullFee) || 0),
      full_coverage: Math.max(0, Number(fullCoverage) || 0),
    }

    const { error } = await supabase.from('site_settings').upsert({
      id: 'protection_plans',
      value: next,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    setPlans(next)
    showToast('Damage protection plans configuration saved!', 'success')
  }

  if (loading) return null

  return (
    <div className="admin-card admin-pay-card my-4 border border-purple-500/20">
      <div className="admin-pay-head">
        <div>
          <div className="admin-pay-title flex items-center gap-2">
            <Shield className="text-purple-400" size={18} />
            Damage Protection Waiver & Insurance Plans
          </div>
          <div className="admin-pay-type">Optional protection add-ons presented to renters at checkout</div>
        </div>
        {enabled
          ? <AdminBadge kind="live">Protection Enabled</AdminBadge>
          : <AdminBadge kind="hidden">Protection Disabled</AdminBadge>}
      </div>

      <div className="admin-form-grid">
        <div className="admin-form-wide mb-2">
          <label className="admin-check" htmlFor="protection-on">
            <input
              id="protection-on"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              aria-label="Enable Protection Plans at checkout"
            />
            Show Protection Plan options to renters at checkout
          </label>
        </div>

        {/* Basic Shield */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">🛡️ Basic Shield Plan</h4>
          <div>
            <label className="field-label">Daily Fee (₹/day)</label>
            <input
              className="input-dark"
              type="number"
              value={basicFee}
              disabled={!enabled}
              onChange={(e) => setBasicFee(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Max Cosmetic Coverage (₹)</label>
            <input
              className="input-dark"
              type="number"
              value={basicCoverage}
              disabled={!enabled}
              onChange={(e) => setBasicCoverage(e.target.value)}
            />
          </div>
        </div>

        {/* Full Waiver */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">🌟 Full Zero-Deductible Plan</h4>
          <div>
            <label className="field-label">Daily Fee (₹/day)</label>
            <input
              className="input-dark"
              type="number"
              value={fullFee}
              disabled={!enabled}
              onChange={(e) => setFullFee(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Max Hardware Coverage (₹)</label>
            <input
              className="input-dark"
              type="number"
              value={fullCoverage}
              disabled={!enabled}
              onChange={(e) => setFullCoverage(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="admin-form-actions mt-4">
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={saveProtectionSettings}
        >
          <Save size={14} />
          {saving ? 'Saving Settings…' : 'Save Protection Settings'}
        </button>
      </div>
    </div>
  )
}
