import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy, Wallet, Smartphone, Building2, X, Shield, CheckCircle2,
  Info, BarChart3, Gift, Share2, Receipt, TrendingUp, Users, ArrowUpRight, ArrowDownLeft,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { PAYOUT_MIN, entryLabel, rupee } from '../lib/wallet'
import { REFEREE_REWARD, REFERRER_REWARD, referralLink } from '../lib/referrals'
import { submitUserPayoutRequest } from '../lib/payoutService'
import { formatDate } from './admin/adminHelpers'

const RANGES = [7, 30, 90]
const REFERRAL_MILESTONE = 5

const TX_TYPES = {
  earning: { label: 'Earning', icon: TrendingUp, tone: 'is-ok' },
  referral: { label: 'Referral', icon: Gift, tone: 'is-cyan' },
  bonus: { label: 'Bonus', icon: Gift, tone: 'is-magenta' },
  spend: { label: 'Spent', icon: ArrowUpRight, tone: 'is-gold' },
  payout: { label: 'Payout', icon: ArrowDownLeft, tone: 'is-gold' },
  other: { label: 'Other', icon: Receipt, tone: '' },
}

const TX_STATUS = {
  completed: { label: 'Completed', tone: 'is-ok' },
  pending: { label: 'Pending', tone: 'is-gold' },
  rejected: { label: 'Rejected', tone: 'is-danger' },
}

function entryType(kind = '') {
  if (kind === 'listing_earning') return 'earning'
  if (kind.startsWith('referral')) return 'referral'
  if (kind.includes('bonus')) return 'bonus'
  if (kind === 'spend') return 'spend'
  if (kind.startsWith('payout')) return 'payout'
  return 'other'
}

function bookingEarn(booking) {
  const fee = Number(booking.platform_fee || 0)
  if (booking.subtotal != null) return Math.max(0, Number(booking.subtotal) - fee)
  return Math.max(0, Number(booking.total_amount || 0) - Number(booking.deposit || 0) - fee)
}

function dayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shortDay(date) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

// Round the axis max up to a 1/2/5 × 10^n step so ticks land on clean values
function niceMax(value) {
  if (value <= 0) return 100
  const pow = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= value) * pow
  return step
}

// Monotone cubic path (Fritsch–Carlson) — smooth without dipping below zero
function smoothPath(pts) {
  if (pts.length < 2) return ''
  const n = pts.length
  const dx = []
  const slope = []
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(pts[i + 1].x - pts[i].x)
    slope.push((pts[i + 1].y - pts[i].y) / dx[i])
  }
  const tan = [slope[0]]
  for (let i = 1; i < n - 1; i += 1) tan.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2)
  tan.push(slope[n - 2])
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3
    d += ` C${pts[i].x + h},${pts[i].y + tan[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - tan[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`
  }
  return d
}

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const obs = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    obs.observe(node)
    return () => obs.disconnect()
  }, [])
  return [ref, width]
}

function EarningsChart({ earnings }) {
  const [range, setRange] = useState(30)
  const [hover, setHover] = useState(null)
  const [wrapRef, width] = useWidth()

  const series = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = Array.from({ length: range }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (range - 1 - i))
      return { date: d, key: dayKey(d), day: 0 }
    })
    const index = Object.fromEntries(days.map((d, i) => [d.key, i]))
    earnings.forEach((row) => {
      const i = index[dayKey(row.created_at || row.start_date)]
      if (i !== undefined) days[i].day += bookingEarn(row)
    })
    // Plot the running total: sparse rental days read as a trend instead of spikes
    let running = 0
    return days.map((d) => {
      running += d.day
      return { ...d, value: running }
    })
  }, [earnings, range])

  const total = series.length ? series[series.length - 1].value : 0
  const height = 210
  const pad = { top: 14, right: 12, bottom: 26, left: 48 }
  const plotW = Math.max(0, width - pad.left - pad.right)
  const plotH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(...series.map((d) => d.value)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t))
  const x = (i) => pad.left + (series.length === 1 ? plotW / 2 : (i / (series.length - 1)) * plotW)
  const y = (v) => pad.top + plotH - (v / max) * plotH
  const pts = series.map((d, i) => ({ x: x(i), y: y(d.value) }))
  const line = smoothPath(pts)
  const area = line ? `${line} L${pts[pts.length - 1].x},${y(0)} L${pts[0].x},${y(0)} Z` : ''
  const labelEvery = Math.ceil(series.length / Math.max(2, Math.floor(plotW / 70)))

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left - pad.left) / (plotW || 1)
    setHover(Math.min(series.length - 1, Math.max(0, Math.round(rel * (series.length - 1)))))
  }

  const hv = hover !== null ? series[hover] : null

  return (
    <section className="dash-card dash-chart">
      <div className="dash-card__head">
        <h3><BarChart3 size={15} /> Earnings trend</h3>
        <div className="dash-seg" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r} type="button" className={range === r ? 'is-on' : ''} onClick={() => { setRange(r); setHover(null) }} aria-pressed={range === r}>
              {r}d
            </button>
          ))}
        </div>
      </div>
      <p className="dash-chart__total">
        <strong>{rupee(total)}</strong> earned in the last {range} days
      </p>

      <div className="dash-chart__plot" ref={wrapRef}>
        {width > 0 ? (
          <svg width={width} height={height} role="img" aria-label={`Cumulative rental earnings, last ${range} days, total ${rupee(total)}`}>
            <defs>
              <linearGradient id="dashEarnFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--magenta)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--magenta)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="dash-chart__grid" />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="dash-chart__axis">{rupee(t)}</text>
              </g>
            ))}
            {series.map((d, i) => (i % labelEvery === 0 || i === series.length - 1) && (i === series.length - 1 || series.length - 1 - i >= labelEvery / 2) ? (
              <text key={d.key} x={x(i)} y={height - 6} textAnchor={i === series.length - 1 ? 'end' : 'middle'} className="dash-chart__axis">{shortDay(d.date)}</text>
            ) : null)}

            <path d={area} fill="url(#dashEarnFill)" />
            <path d={line} fill="none" stroke="var(--magenta)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {hv ? (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={y(0)} className="dash-chart__cross" />
                <circle cx={x(hover)} cy={y(hv.value)} r="5" fill="var(--magenta)" stroke="var(--bg-800)" strokeWidth="2" />
              </g>
            ) : null}

            <rect
              x={pad.left}
              y={pad.top}
              width={plotW}
              height={plotH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        ) : null}

        {hv ? (
          <div
            className="dash-chart__tip"
            style={{ left: Math.min(Math.max(x(hover), 60), width - 60), top: Math.max(y(hv.value) - 12, 0) }}
            role="status"
          >
            <span>{shortDay(hv.date)}{hv.day > 0 ? ` · +${rupee(hv.day)}` : ''}</span>
            <strong>{rupee(hv.value)} total</strong>
          </div>
        ) : null}

        {total === 0 ? <p className="dash-chart__empty">No paid rentals in this period yet.</p> : null}
      </div>

      <table className="sr-only">
        <caption>Daily earnings, last {range} days</caption>
        <thead><tr><th>Date</th><th>Earned</th></tr></thead>
        <tbody>
          {series.filter((d) => d.day > 0).map((d) => (
            <tr key={d.key}><td>{shortDay(d.date)}</td><td>{rupee(d.day)}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default function DashboardWallet({ wallet, entries, referrals, code, loading, onRefresh, earnings = [] }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [payoutMethod, setPayoutMethod] = useState('upi') // 'upi' or 'bank'
  const [payoutAmount, setPayoutAmount] = useState('')
  const [upiId, setUpiId] = useState('')
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    accountHolderName: '',
  })
  const [busy, setBusy] = useState(false)
  const [payouts, setPayouts] = useState(null) // null = table unavailable, fall back to ledger rows
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const link = code ? referralLink(code) : ''

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    supabase
      .from('payout_requests')
      .select('id, amount, payout_method, status, transaction_ref, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => { if (!cancelled) setPayouts(error ? null : (data || [])) })
    return () => { cancelled = true }
  }, [user, entries])

  const copy = async (value, ok) => {
    try {
      await navigator.clipboard.writeText(value)
      showToast(ok, 'success')
    } catch {
      showToast('Copy failed', 'error')
    }
  }

  const share = async () => {
    const text = `Rent gaming & music gear on LocalDen. Use my code ${code} and get ₹${REFEREE_REWARD} rental credit.`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'LocalDen', text, url: link })
        return
      } catch {
        /* user dismissed the share sheet — fall through to copy */
      }
    }
    copy(link, 'Invite link copied')
  }

  // Withdrawable amount is the user's full available wallet balance
  const withdrawableAmount = wallet?.available || 0
  const canPayout = withdrawableAmount >= PAYOUT_MIN

  const credited = referrals.filter((row) => row.status === 'credited').length
  const milestone = Math.max(REFERRAL_MILESTONE, Math.ceil((credited + 1) / REFERRAL_MILESTONE) * REFERRAL_MILESTONE)

  // Ledger rows + payout requests (with their real status) in one history
  const transactions = useMemo(() => {
    const ledger = (entries || [])
      .filter((row) => payouts === null || !String(row.kind || '').startsWith('payout'))
      .map((row) => ({
        id: `e-${row.id}`,
        at: row.created_at,
        label: entryLabel(row),
        type: entryType(row.kind),
        status: 'completed',
        amount: row.amount,
      }))
    const payoutRows = (payouts || []).map((row) => ({
      id: `p-${row.id}`,
      at: row.created_at,
      label: `Payout to ${row.payout_method === 'bank' ? 'bank account' : 'UPI'}${row.transaction_ref ? ` · ${row.transaction_ref}` : ''}`,
      type: 'payout',
      status: row.status || 'pending',
      amount: -Math.abs(Number(row.amount || 0)),
    }))
    return [...ledger, ...payoutRows].sort((a, b) => String(b.at).localeCompare(String(a.at)))
  }, [entries, payouts])

  const shownTx = transactions
    .filter((row) => typeFilter === 'all' || row.type === typeFilter)
    .filter((row) => statusFilter === 'all' || row.status === statusFilter)

  const handleOpenPayout = () => {
    if (withdrawableAmount < PAYOUT_MIN) {
      showToast(
        `Minimum payout is ${rupee(PAYOUT_MIN)}. Your available balance is ${rupee(withdrawableAmount)}.`,
        'error'
      )
      return
    }
    setPayoutAmount(String(withdrawableAmount))
    setModalOpen(true)
  }

  const handleSubmitPayout = async (e) => {
    e?.preventDefault()
    const amt = parseInt(payoutAmount, 10)

    if (isNaN(amt) || amt < PAYOUT_MIN) {
      showToast(`Minimum withdrawal amount is ${rupee(PAYOUT_MIN)}.`, 'error')
      return
    }
    if (amt > withdrawableAmount) {
      showToast(`Cannot withdraw more than your available wallet balance (${rupee(withdrawableAmount)}).`, 'error')
      return
    }

    if (payoutMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        showToast('Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm).', 'error')
        return
      }
    } else {
      if (!bankDetails.accountNumber.trim() || !bankDetails.ifsc.trim() || !bankDetails.accountHolderName.trim()) {
        showToast('Please fill all bank account details.', 'error')
        return
      }
      if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
        showToast('Bank account numbers do not match.', 'error')
        return
      }
    }

    setBusy(true)
    try {
      await submitUserPayoutRequest({
        userId: user.id,
        amount: amt,
        payoutMethod,
        upiId: upiId.trim(),
        bankDetails: payoutMethod === 'bank' ? {
          accountNumber: bankDetails.accountNumber.trim(),
          ifsc: bankDetails.ifsc.trim().toUpperCase(),
          accountHolderName: bankDetails.accountHolderName.trim(),
        } : null,
      })

      showToast(`Payout request for ${rupee(amt)} submitted to admin!`, 'success')
      setModalOpen(false)
      onRefresh?.()
    } catch (err) {
      showToast(err.message || 'Payout request failed. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dash-wallet">
      {/* Payout status banner */}
      <div className={`dash-banner ${canPayout ? 'is-ok' : 'is-cyan'}`}>
        <span className="dash-banner__icon">{canPayout ? <CheckCircle2 size={18} /> : <Info size={18} />}</span>
        <div className="dash-banner__body">
          <strong>{loading ? 'Loading wallet…' : canPayout ? `${rupee(withdrawableAmount)} ready to withdraw` : 'Payout not available yet'}</strong>
          <span>
            {canPayout
              ? 'Withdraw to your UPI ID or bank account, or spend it on any rental at checkout.'
              : `Minimum payout is ${rupee(PAYOUT_MIN)}. Your current balance is ${rupee(withdrawableAmount)} — you can still spend it on rentals.`}
          </span>
        </div>
        <button
          type="button"
          className={`dash-btn ${canPayout ? 'is-primary' : ''}`}
          disabled={busy || !canPayout}
          onClick={handleOpenPayout}
          aria-label="Request wallet payout"
        >
          <Wallet size={15} /> Request payout
        </button>
      </div>

      <div className="dash-wallet__grid">
        <EarningsChart earnings={earnings} />

        <section className="dash-card dash-ref">
          <div className="dash-card__head is-cyan"><h3><Gift size={15} /> Referral rewards</h3></div>
          <span className="dash-ref__label">Your referral code</span>
          <div className="dash-ref__code">
            <code>{code || '…'}</code>
            <button type="button" className="dash-btn is-sm" onClick={() => copy(code, 'Code copied')} disabled={!code} aria-label="Copy referral code">
              <Copy size={14} />
            </button>
            <button type="button" className="dash-btn is-sm" onClick={share} disabled={!code} aria-label="Share invite link">
              <Share2 size={14} /> Share
            </button>
          </div>
          <p className="dash-ref__copy">
            Invite friends: you get {rupee(REFERRER_REWARD)} and they get {rupee(REFEREE_REWARD)} in rental credit after their first paid booking.
          </p>
          <div className="dash-ref__progress">
            <span><strong>{credited}</strong> / {milestone} referrals completed</span>
            <div className="dash-meter" role="progressbar" aria-valuemin={0} aria-valuemax={milestone} aria-valuenow={credited}>
              <span style={{ width: `${(credited / milestone) * 100}%` }} />
            </div>
          </div>
          {referrals.length > 0 ? (
            <ul className="dash-ref__list">
              {referrals.slice(0, 4).map((row) => (
                <li key={row.id}>
                  <Users size={13} />
                  <span>{row.referee?.full_name || 'Friend'}</span>
                  <span className={`dash-tag ${row.status === 'credited' ? 'is-ok' : 'is-gold'}`}>
                    {row.status === 'credited' ? `+${rupee(REFERRER_REWARD)}` : 'Waiting'}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      {/* Transaction history */}
      <section className="dash-card">
        <div className="dash-card__head">
          <h3><Receipt size={15} /> Transaction history</h3>
          <div className="dash-card__tools">
            <select className="dash-select is-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
              <option value="all">All types</option>
              {Object.entries(TX_TYPES).map(([id, t]) => <option key={id} value={id}>{t.label}</option>)}
            </select>
            <select className="dash-select is-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="all">All status</option>
              {Object.entries(TX_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="dash-rows"><div className="dash-skel" /><div className="dash-skel" /></div>
        ) : shownTx.length === 0 ? (
          <p className="dash-wallet__hint">
            {transactions.length === 0 ? 'No wallet movement yet. Earnings, referral rewards and payouts will show up here.' : 'No transactions match these filters.'}
          </p>
        ) : (
          <div className="dash-table__wrap">
            <table className="dash-table">
              <thead>
                <tr><th>Date</th><th>Description</th><th>Type</th><th>Status</th><th className="is-num">Amount</th></tr>
              </thead>
              <tbody>
                {shownTx.map((row) => {
                  const type = TX_TYPES[row.type]
                  const TypeIcon = type.icon
                  const status = TX_STATUS[row.status] || { label: row.status, tone: '' }
                  return (
                    <tr key={row.id}>
                      <td className="is-date">{formatDate(row.at)}</td>
                      <td>{row.label}</td>
                      <td><span className={`dash-tx-type ${type.tone}`}><TypeIcon size={14} /> {type.label}</span></td>
                      <td><span className={`dash-tag ${status.tone}`}>{status.label}</span></td>
                      <td className={`is-num ${row.amount < 0 ? 'is-out' : 'is-in'}`}>
                        {row.amount < 0 ? `−${rupee(Math.abs(row.amount))}` : `+${rupee(row.amount)}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {payouts !== null && payouts.length === 0 ? (
        <div className="dash-banner is-quiet">
          <span className="dash-banner__icon"><Shield size={18} /></span>
          <div className="dash-banner__body">
            <strong>No payout requests yet</strong>
            <span>Once your balance reaches {rupee(PAYOUT_MIN)} you can withdraw it to UPI or a bank account. Requests are reviewed by our team before transfer.</span>
          </div>
          <Link to="/contact" className="dash-btn">Ask about payouts</Link>
        </div>
      ) : null}

      {/* Payout Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-950 border border-cyan-500/40 p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Wallet size={20} className="text-cyan-400" />
                <h3 className="font-bungee text-base text-white">Request Payout</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/40 hover:text-white"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Breakdown Notice */}
            <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-white/60">Available Wallet Balance:</span>
                <span className="text-white font-mono">{rupee(wallet.available)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10 font-bold">
                <span className="text-emerald-300">Max Withdrawable:</span>
                <span className="text-emerald-400 font-mono text-sm">{rupee(withdrawableAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayout} className="space-y-4">
              <div>
                <label className="field-label text-xs">Amount to Withdraw (₹)</label>
                <input
                  type="number"
                  min={PAYOUT_MIN}
                  max={withdrawableAmount}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="input-dark text-sm w-full font-bold text-emerald-400"
                  required
                />
                <span className="text-[11px] text-white/40 mt-0.5 block">Min. ₹{PAYOUT_MIN}</span>
              </div>

              {/* Payout Method Toggle */}
              <div>
                <label className="field-label text-xs">Payout Destination</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('upi')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      payoutMethod === 'upi'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <Smartphone size={14} />
                    <span>UPI ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutMethod('bank')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      payoutMethod === 'bank'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <Building2 size={14} />
                    <span>Bank Transfer</span>
                  </button>
                </div>
              </div>

              {payoutMethod === 'upi' ? (
                <div>
                  <label className="field-label text-xs">Your UPI ID (VPA)</label>
                  <input
                    type="text"
                    placeholder="e.g. mobile@paytm, name@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="input-dark text-xs w-full font-mono"
                    required
                  />
                  <span className="text-[11px] text-white/40 mt-1 block">
                    Admin transfers directly to this UPI ID.
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <label className="field-label text-xs">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="Full Name as per Bank Passbook"
                      value={bankDetails.accountHolderName}
                      onChange={(e) => setBankDetails((p) => ({ ...p, accountHolderName: e.target.value }))}
                      className="input-dark text-xs w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label text-xs">Bank Account Number</label>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails((p) => ({ ...p, accountNumber: e.target.value }))}
                      className="input-dark text-xs w-full font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label text-xs">Confirm Account Number</label>
                    <input
                      type="text"
                      placeholder="Re-enter Account Number"
                      value={bankDetails.confirmAccountNumber}
                      onChange={(e) => setBankDetails((p) => ({ ...p, confirmAccountNumber: e.target.value }))}
                      className="input-dark text-xs w-full font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label text-xs">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={bankDetails.ifsc}
                      onChange={(e) => setBankDetails((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                      className="input-dark text-xs w-full font-mono uppercase"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {busy ? 'Submitting…' : `Request ${rupee(payoutAmount || withdrawableAmount)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
