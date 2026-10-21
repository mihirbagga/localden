import { useEffect, useMemo, useState } from 'react'
import {
  Pencil, Plus, Power, Trash2, Zap, Sparkles, Tag,
  Calendar, Gift, Save, Check, Clock, Percent, ArrowRight
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { formatCouponValue, normalizeCouponCode } from '../../lib/coupons'
import { useDiscountCampaigns, CAMPAIGN_PRESETS, DEFAULT_CAMPAIGN_SETTINGS } from '../../lib/discountCampaignService'
import AdminSignupCoupon from './AdminSignupCoupon'
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
  const { settings, save: saveCampaigns, loading: loadingCampaigns } = useDiscountCampaigns()

  // Sub-tabs: 'campaigns' | 'duration' | 'signup' | 'coupons'
  const [subTab, setSubTab] = useState('campaigns')

  // Flash Sale Campaign State
  const [campEnabled, setCampEnabled] = useState(true)
  const [campTitle, setCampTitle] = useState('Weekend Flash Sale ⚡')
  const [campBadge, setCampBadge] = useState('FLASH SALE')
  const [campCode, setCampCode] = useState('FLASH15')
  const [campPercent, setCampPercent] = useState('15')
  const [campMinSubtotal, setCampMinSubtotal] = useState('500')
  const [campMaxDiscount, setCampMaxDiscount] = useState('1000')
  const [campDesc, setCampDesc] = useState('Get 15% OFF on all gaming & music gear with code FLASH15!')
  const [savingCamp, setSavingCamp] = useState(false)

  // Duration Discounts State
  const [durEnabled, setDurEnabled] = useState(true)
  const [durTiers, setDurTiers] = useState(DEFAULT_CAMPAIGN_SETTINGS.duration_discounts.tiers)
  const [savingDur, setSavingDur] = useState(false)

  // Sync settings when loaded
  const [synced, setSynced] = useState(false)
  useEffect(() => {
    if (!loadingCampaigns && settings && !synced) {
      const c = settings.active_campaign || {}
      setCampEnabled(c.enabled !== false)
      setCampTitle(c.title || 'Weekend Flash Sale ⚡')
      setCampBadge(c.badge || 'FLASH SALE')
      setCampCode(c.code || 'FLASH15')
      setCampPercent(String(c.discount_percent ?? 15))
      setCampMinSubtotal(String(c.min_subtotal ?? 500))
      setCampMaxDiscount(String(c.max_discount ?? 1000))
      setCampDesc(c.description || 'Get 15% OFF on all gaming & music gear with code FLASH15!')

      const d = settings.duration_discounts || {}
      setDurEnabled(d.enabled !== false)
      if (Array.isArray(d.tiers) && d.tiers.length > 0) {
        setDurTiers(d.tiers.map((t) => ({
          days: String(t.days ?? 3),
          discount_percent: String(t.discount_percent ?? 0),
          label: String(t.label || `${t.days}+ Days`),
        })))
      }
      setSynced(true)
    }
  }, [loadingCampaigns, settings, synced])

  // Coupon codes table state
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
    setSubTab('coupons')
  }

  const applyPreset = (preset) => {
    setCampTitle(preset.title)
    setCampBadge(preset.badge)
    setCampCode(preset.code)
    setCampPercent(String(preset.discount_percent))
    setCampMinSubtotal(String(preset.min_subtotal))
    setCampMaxDiscount(String(preset.max_discount))
    setCampDesc(preset.description)
    showToast(`Loaded "${preset.title}" preset!`, 'info')
  }

  const handleSaveCampaign = async (e) => {
    e?.preventDefault()
    const pVal = Number(campPercent)
    if (!Number.isFinite(pVal) || pVal < 1 || pVal > 100) {
      showToast('Discount percent must be between 1% and 100%.', 'error')
      return
    }
    if (!campCode.trim()) {
      showToast('Promo code is required.', 'error')
      return
    }

    setSavingCamp(true)
    try {
      const nextSettings = {
        ...settings,
        active_campaign: {
          enabled: campEnabled,
          title: campTitle.trim(),
          badge: campBadge.trim().toUpperCase(),
          code: campCode.trim().toUpperCase(),
          discount_percent: pVal,
          min_subtotal: Number(campMinSubtotal) || 0,
          max_discount: Number(campMaxDiscount) || null,
          description: campDesc.trim(),
          updated_at: new Date().toISOString(),
        },
      }
      await saveCampaigns(nextSettings)
      showToast(
        campEnabled
          ? `Campaign "${campTitle}" is now LIVE! Broadcasted across homepage & notification bar.`
          : 'Campaign broadcast turned OFF.',
        'success'
      )
    } catch (err) {
      showToast(err.message || 'Failed to save campaign', 'error')
    } finally {
      setSavingCamp(false)
    }
  }

  const handleSaveDurationTiers = async (e) => {
    e?.preventDefault()
    const cleaned = durTiers
      .map((t) => {
        const d = Math.max(1, parseInt(t.days, 10) || 1)
        const pct = Math.max(0, Math.min(100, Number(t.discount_percent) || 0))
        const lbl = String(t.label || '').trim() || `${d}+ Days`
        return { days: d, discount_percent: pct, label: lbl }
      })
      .sort((a, b) => a.days - b.days)

    if (cleaned.length === 0) {
      showToast('Add at least one multi-day discount tier.', 'error')
      return
    }

    setSavingDur(true)
    try {
      const nextSettings = {
        ...settings,
        duration_discounts: {
          enabled: durEnabled,
          tiers: cleaned,
          updated_at: new Date().toISOString(),
        },
      }
      await saveCampaigns(nextSettings)
      setDurTiers(cleaned.map((t) => ({
        days: String(t.days),
        discount_percent: String(t.discount_percent),
        label: t.label,
      })))
      showToast('Multi-day duration discounts saved & applied live!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to save duration discounts', 'error')
    } finally {
      setSavingDur(false)
    }
  }

  const updateTierField = (index, field, value) => {
    setDurTiers((prev) => prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)))
  }

  const addDurationTier = () => {
    const maxDays = durTiers.reduce((m, t) => Math.max(m, Number(t.days) || 0), 0)
    const nextDays = maxDays >= 30 ? maxDays + 15 : maxDays >= 14 ? 30 : maxDays >= 7 ? 14 : maxDays >= 3 ? 7 : 3
    const nextPct = Math.min(50, (durTiers.reduce((m, t) => Math.max(m, Number(t.discount_percent) || 0), 0) || 5) + 5)
    setDurTiers((prev) => [
      ...prev,
      { days: String(nextDays), discount_percent: String(nextPct), label: `${nextDays}+ Days` },
    ])
  }

  const removeDurationTier = (index) => {
    if (durTiers.length <= 1) {
      showToast('At least one tier is required. Toggle "Disabled" to turn off multi-day discounts.', 'info')
      return
    }
    setDurTiers((prev) => prev.filter((_, i) => i !== index))
  }

  const applyDurationPreset = (tiersPreset, label) => {
    setDurEnabled(true)
    setDurTiers(tiersPreset.map((t) => ({
      days: String(t.days),
      discount_percent: String(t.discount_percent),
      label: t.label,
    })))
    showToast(`Loaded "${label}" multi-day tiers — click Save to publish!`, 'info')
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
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            subTab === 'campaigns'
              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
              : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
          }`}
        >
          <Zap size={14} className="text-pink-400" />
          <span>Flash Sales &amp; Campaigns</span>
          {campEnabled && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('duration')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            subTab === 'duration'
              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
              : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
          }`}
        >
          <Calendar size={14} className="text-cyan-400" />
          <span>Multi-Day Duration Discounts</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('signup')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            subTab === 'signup'
              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
              : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
          }`}
        >
          <Gift size={14} className="text-amber-400" />
          <span>Welcome Signup Bonus</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('coupons')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            subTab === 'coupons'
              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
              : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
          }`}
        >
          <Tag size={14} className="text-purple-400" />
          <span>Promo Codes ({coupons.length})</span>
        </button>
      </div>

      {/* ── SUB-TAB 1: Flash Sales & Active Campaigns ── */}
      {subTab === 'campaigns' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Presets */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                <Sparkles size={13} className="text-pink-400" /> 1-Click Campaign Presets
              </span>
              <span className="text-[11px] text-white/40">Load ready-to-run marketing promos</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {CAMPAIGN_PRESETS.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="p-3 rounded-xl bg-black/40 hover:bg-pink-500/10 border border-white/10 hover:border-pink-500/30 text-left transition-all group"
                >
                  <div className="font-semibold text-xs text-white group-hover:text-pink-300">{p.title}</div>
                  <div className="text-[11px] text-white/50 mt-1 font-mono">{p.code} · {p.discount_percent}% OFF</div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Campaign Card */}
          <form onSubmit={handleSaveCampaign} className="admin-card">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-pink-400" />
                <div>
                  <h3 className="font-bungee text-base text-white">Sitewide Discount Campaign</h3>
                  <p className="text-xs text-white/50">Broadcasted across the top announcement bar, homepage deals, and cart.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {campEnabled ? (
                  <AdminBadge kind="live">Active Campaign LIVE</AdminBadge>
                ) : (
                  <AdminBadge kind="hidden">Campaign OFF</AdminBadge>
                )}
              </div>
            </div>

            <div className="admin-form-grid">
              <div>
                <label className="field-label">Campaign Title</label>
                <input
                  type="text"
                  className="input-dark"
                  value={campTitle}
                  onChange={(e) => setCampTitle(e.target.value)}
                  placeholder="Weekend Flash Sale ⚡"
                  required
                />
              </div>

              <div>
                <label className="field-label">Badge Label (Short)</label>
                <input
                  type="text"
                  className="input-dark"
                  value={campBadge}
                  onChange={(e) => setCampBadge(e.target.value)}
                  placeholder="FLASH DEAL"
                  required
                />
              </div>

              <div>
                <label className="field-label">Promo Code</label>
                <input
                  type="text"
                  className="input-dark font-mono font-bold text-pink-400"
                  value={campCode}
                  onChange={(e) => setCampCode(e.target.value.toUpperCase())}
                  placeholder="FLASH15"
                  required
                />
              </div>

              <div>
                <label className="field-label">Discount Percent (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="input-dark"
                  value={campPercent}
                  onChange={(e) => setCampPercent(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Min Rental Subtotal (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input-dark"
                  value={campMinSubtotal}
                  onChange={(e) => setCampMinSubtotal(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="field-label">Max Discount Cap (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input-dark"
                  value={campMaxDiscount}
                  onChange={(e) => setCampMaxDiscount(e.target.value)}
                  placeholder="Optional cap"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="field-label">Announcement Banner Description</label>
                <input
                  type="text"
                  className="input-dark"
                  value={campDesc}
                  onChange={(e) => setCampDesc(e.target.value)}
                  placeholder="Get 15% OFF on all gaming & music gear with code FLASH15!"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="admin-check flex items-center gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={campEnabled}
                    onChange={(e) => setCampEnabled(e.target.checked)}
                  />
                  <span>Run and broadcast this discount campaign sitewide (Notification Bar &amp; Homepage Deals)</span>
                </label>
              </div>
            </div>

            {/* Live Banner Preview */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 mt-5 space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold block">Live Storefront Banner Preview</span>
              <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border border-pink-500/30 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-mono text-[10px] font-bold">
                    {campBadge || 'DEAL'}
                  </span>
                  <span className="text-xs text-white font-semibold">{campTitle} — </span>
                  <span className="text-xs text-white/70">{campDesc}</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-xs font-mono text-white flex items-center gap-1.5">
                  <Tag size={12} className="text-amber-400" />
                  <strong>{campCode}</strong>
                  <span className="text-pink-300 text-[10px]">({campPercent}% OFF)</span>
                </div>
              </div>
            </div>

            <div className="admin-form-actions mt-5">
              <button type="submit" className="btn-primary" disabled={savingCamp}>
                <Save size={14} />
                {savingCamp ? 'Saving & Publishing…' : 'Save & Publish Campaign'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SUB-TAB 2: Multi-Day Duration Discounts ── */}
      {subTab === 'duration' && (
        <form onSubmit={handleSaveDurationTiers} className="admin-card animate-fade-in space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="font-bungee text-base text-white">Multi-Day Rental Discounts</h3>
                <p className="text-xs text-white/50">Edit tier names, minimum rental days, and automatic discount percentages.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addDurationTier}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus size={13} /> Add Tier
              </button>
              <label className="admin-check flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={durEnabled}
                  onChange={(e) => setDurEnabled(e.target.checked)}
                />
                <span className="text-xs font-semibold">{durEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
          </div>

          {/* 1-Click Multi-Day Presets */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-white/45 font-semibold text-[11px] uppercase tracking-wider mr-1">Quick Presets:</span>
            <button
              type="button"
              onClick={() => applyDurationPreset(DEFAULT_CAMPAIGN_SETTINGS.duration_discounts.tiers, 'Standard (5/10/20/30%)')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-white/75 hover:text-cyan-200 transition-all"
            >
              ⚡ Standard (5% · 10% · 20% · 30%)
            </button>
            <button
              type="button"
              onClick={() => applyDurationPreset([
                { days: 2, discount_percent: 5, label: 'Weekend (2+ Days)' },
                { days: 4, discount_percent: 12, label: '4+ Days Marathon' },
                { days: 7, discount_percent: 20, label: 'Full Week (7+ Days)' },
                { days: 30, discount_percent: 35, label: 'Monthly Pass (30+ Days)' },
              ], 'Weekend & Marathon')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-white/75 hover:text-cyan-200 transition-all"
            >
              🎮 Weekend &amp; Marathon (5% · 12% · 20% · 35%)
            </button>
            <button
              type="button"
              onClick={() => applyDurationPreset([
                { days: 3, discount_percent: 10, label: '3+ Days Jam' },
                { days: 7, discount_percent: 20, label: 'Full Week (7+ Days)' },
                { days: 14, discount_percent: 30, label: 'Fortnight Pro (14+ Days)' },
                { days: 30, discount_percent: 40, label: 'Monthly Studio (30+ Days)' },
              ], 'High Boost (10/20/30/40%)')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-white/75 hover:text-cyan-200 transition-all"
            >
              🚀 High Boost (10% · 20% · 30% · 40%)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {durTiers.map((tier, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 relative">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300">
                    TIER {idx + 1}
                  </span>
                  {durTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDurationTier(idx)}
                      className="text-white/40 hover:text-red-400 transition-colors p-1"
                      title="Remove tier"
                      aria-label={`Remove tier ${idx + 1}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div>
                  <label className="field-label text-[11px]">Tier Label</label>
                  <input
                    type="text"
                    className="input-dark text-xs font-semibold text-white"
                    value={tier.label ?? ''}
                    placeholder="e.g. 3+ Days Jam"
                    onChange={(e) => updateTierField(idx, 'label', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label text-[11px]">Min Days</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className="input-dark font-bold text-white"
                      value={tier.days ?? ''}
                      onChange={(e) => updateTierField(idx, 'days', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label text-[11px]">Discount (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input-dark font-bold text-cyan-400 pr-6"
                        value={tier.discount_percent ?? ''}
                        onChange={(e) => updateTierField(idx, 'discount_percent', e.target.value)}
                        required
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40">%</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-emerald-400/90 font-mono pt-1 border-t border-white/10">
                  {Number(tier.days) || 1}+ days → <strong>{Number(tier.discount_percent) || 0}% OFF</strong>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-white/60">
            💡 Active Multi-Day Schedule:{' '}
            {durTiers.map((t, i) => (
              <span key={i}>
                <strong>{t.days || 1}+ days = {t.discount_percent || 0}% OFF</strong>
                {i < durTiers.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>

          <div className="admin-form-actions">
            <button type="submit" className="btn-primary" disabled={savingDur}>
              <Save size={14} />
              {savingDur ? 'Saving…' : 'Save Duration Discounts'}
            </button>
          </div>
        </form>
      )}

      {/* ── SUB-TAB 3: Welcome Signup Bonus ── */}
      {subTab === 'signup' && (
        <div className="animate-fade-in">
          <AdminSignupCoupon />
        </div>
      )}

      {/* ── SUB-TAB 4: Custom Promo Codes & Coupons ── */}
      {subTab === 'coupons' && (
        <div className="space-y-6 animate-fade-in">
          {/* Coupon Form */}
          <form className="admin-card admin-coupon-form" onSubmit={handleSave}>
            <h3 className="admin-card__title">
              {editingId ? 'EDIT PROMO CODE' : 'CREATE NEW PROMO CODE'}
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
                  <option value="percent">Percent (%)</option>
                  <option value="flat">Flat (₹)</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="coupon-value">
                  {form.discount_type === 'percent' ? 'Percent (%)' : 'Amount (₹)'}
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
                  placeholder="0"
                  aria-label="Minimum subtotal"
                />
              </div>
              {form.discount_type === 'percent' ? (
                <div>
                  <label className="field-label" htmlFor="coupon-max">Max cap ₹</label>
                  <input
                    id="coupon-max"
                    className="input-dark"
                    type="number"
                    min="0"
                    value={form.max_discount}
                    onChange={setField('max_discount')}
                    placeholder="None"
                    aria-label="Max discount cap"
                  />
                </div>
              ) : null}
              <div>
                <label className="field-label" htmlFor="coupon-limit">Max total uses</label>
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
                <label className="field-label" htmlFor="coupon-start">Starts on</label>
                <input
                  id="coupon-start"
                  className="input-dark"
                  type="date"
                  value={form.starts_at}
                  onChange={setField('starts_at')}
                  aria-label="Start date"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="coupon-end">Expires on</label>
                <input
                  id="coupon-end"
                  className="input-dark"
                  type="date"
                  value={form.ends_at}
                  onChange={setField('ends_at')}
                  aria-label="End date"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="coupon-desc">Description</label>
                <input
                  id="coupon-desc"
                  className="input-dark"
                  value={form.description}
                  onChange={setField('description')}
                  placeholder="e.g. 10% off for first 100 gamers"
                  aria-label="Description"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="admin-check flex items-center gap-2 cursor-pointer" htmlFor="coupon-active">
                  <input
                    id="coupon-active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={setField('is_active')}
                    aria-label="Is coupon active"
                  />
                  <span>Active right now (renters can apply this code at checkout)</span>
                </label>
              </div>
            </div>
            <div className="admin-form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                <Plus size={14} />
                {saving ? 'Saving…' : editingId ? 'Update Promo Code' : 'Create Promo Code'}
              </button>
              {editingId ? (
                <button type="button" className="btn-outline" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          {/* Search & List */}
          <div className="admin-toolbar">
            <AdminSearch
              value={query}
              onChange={setQuery}
              placeholder="Search coupon code…"
              ariaLabel="Search coupons"
            />
            <p className="admin-muted">{filtered.length} promo code{filtered.length === 1 ? '' : 's'}</p>
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
                        <span className="admin-cell-title font-mono font-bold text-pink-400">{coupon.code}</span>
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
