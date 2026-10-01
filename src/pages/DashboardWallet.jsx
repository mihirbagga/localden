import { useState } from 'react'
import { Copy, Wallet, Smartphone, Building2, AlertCircle, X, Shield, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { PAYOUT_MIN, entryLabel, rupee } from '../lib/wallet'
import { REFEREE_REWARD, REFERRER_REWARD, referralLink } from '../lib/referrals'
import { submitUserPayoutRequest } from '../lib/payoutService'
import { formatDate } from './admin/adminHelpers'

export default function DashboardWallet({ wallet, entries, referrals, code, loading, onRefresh }) {
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
  const link = code ? referralLink(code) : ''

  const copy = async (value, ok) => {
    try {
      await navigator.clipboard.writeText(value)
      showToast(ok, 'success')
    } catch {
      showToast('Copy failed', 'error')
    }
  }

  // 1. Calculate all referral rewards (referrer & referee)
  const referralRewardsTotal = (entries || [])
    .filter((e) => (
      e.kind === 'referral_referrer' ||
      e.kind === 'referral_referee' ||
      (typeof e.kind === 'string' && e.kind.startsWith('referral'))
    ) && e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0)

  // 2. Calculate welcome bonuses
  const welcomeBonusTotal = (entries || [])
    .filter((e) => (
      e.kind === 'welcome_bonus' ||
      (typeof e.kind === 'string' && e.kind.includes('bonus'))
    ) && e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0)

  // Total promo & referral credits that CANNOT be taken out as payout
  const totalLockedCreditsEarned = referralRewardsTotal + welcomeBonusTotal

  // Total spent on rentals from wallet (uses promo credits first)
  const totalSpentOnRentals = Math.abs(
    (entries || [])
      .filter((e) => e.kind === 'spend' && e.amount < 0)
      .reduce((sum, e) => sum + e.amount, 0)
  )

  // Remaining locked promo / referral credit
  const lockedCreditsRemaining = Math.max(0, totalLockedCreditsEarned - totalSpentOnRentals)

  // Withdrawable amount: strictly listing earnings (and deposit returns), excluding referral/promo money
  const withdrawableAmount = Math.max(0, (wallet?.available || 0) - lockedCreditsRemaining)

  const handleOpenPayout = () => {
    if (withdrawableAmount < PAYOUT_MIN) {
      showToast(
        `Minimum withdrawable payout is ${rupee(PAYOUT_MIN)}. Referral & welcome bonuses (${rupee(lockedCreditsRemaining)}) can only be spent on gear rentals.`,
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
      showToast(`Cannot withdraw more than your available rental earnings (${rupee(withdrawableAmount)}).`, 'error')
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
      {/* Wallet Metric Cards */}
      <div className="dash-wallet__stats">
        <div className="dash-wallet__stat">
          <span>Total Balance</span>
          <strong>{loading ? '…' : rupee(wallet.available)}</strong>
        </div>

        <div className="dash-wallet__stat">
          <span>Withdrawable (Earnings)</span>
          <strong style={{ color: '#00ff94' }}>{loading ? '…' : rupee(withdrawableAmount)}</strong>
        </div>

        {lockedCreditsRemaining > 0 && (
          <div className="dash-wallet__stat">
            <span>Referral & Promo Credit</span>
            <strong style={{ color: '#ff2e6d' }}>{loading ? '…' : rupee(lockedCreditsRemaining)}</strong>
          </div>
        )}

        <div className="dash-wallet__stat">
          <span>Payout Pending</span>
          <strong>{loading ? '…' : rupee(wallet.pending)}</strong>
        </div>
      </div>

      {/* Explanatory Policy Notice */}
      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs space-y-1.5 font-display text-white/60">
        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
          <Shield size={14} />
          <span>Withdrawable Earnings vs. Promotional Balance:</span>
        </div>
        <p>
          • <strong>Listing Earnings:</strong> Credited after completed rentals and can be withdrawn directly to your UPI / Bank account (min. ₹{PAYOUT_MIN}).
        </p>
        <p>
          • <strong>Referral Rewards & Welcome Bonuses ({rupee(lockedCreditsRemaining)}):</strong> Cannot be taken out as cash payouts. These credits are locked for renting any gaming or music gear on LocalDen.
        </p>
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={busy || withdrawableAmount < PAYOUT_MIN}
        onClick={handleOpenPayout}
        aria-label="Request wallet payout"
      >
        <Wallet size={14} /> Request Payout {withdrawableAmount >= PAYOUT_MIN ? rupee(withdrawableAmount) : ''}
      </button>

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
                <span className="text-white/60">Total Balance:</span>
                <span className="text-white font-mono">{rupee(wallet.available)}</span>
              </div>
              {lockedCreditsRemaining > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>Referral & Promo Credits (Non-withdrawable):</span>
                  <span className="font-mono">−{rupee(lockedCreditsRemaining)}</span>
                </div>
              )}
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

      {/* Referral Section */}
      <section className="dash-wallet__block">
        <h3>Your Referral Code</h3>
        <p>Share the code. Friend signs up. After their first paid booking you get ₹{REFERRER_REWARD}, they get ₹{REFEREE_REWARD} in rental credit.</p>
        <div className="dash-wallet__code">
          <code>{code || '…'}</code>
          <button type="button" className="btn-outline" onClick={() => copy(code, 'Code copied')} disabled={!code} aria-label="Copy referral code">
            <Copy size={14} /> Code
          </button>
          <button type="button" className="btn-outline" onClick={() => copy(link, 'Link copied')} disabled={!code} aria-label="Copy referral link">
            <Copy size={14} /> Link
          </button>
        </div>
        {referrals.length === 0 ? (
          <p className="dash-wallet__hint">No referrals yet.</p>
        ) : (
          <ul className="dash-wallet__refs">
            {referrals.map((row) => (
              <li key={row.id}>
                <strong>{row.referee?.full_name || 'Friend'}</strong>
                <span>{row.status === 'credited' ? `Credited ₹${REFERRER_REWARD}` : 'Waiting for their first paid booking'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Wallet Movement Ledger */}
      <section className="dash-wallet__block">
        <h3>Ledger</h3>
        {entries.length === 0 ? (
          <p className="dash-wallet__hint">No wallet movement yet.</p>
        ) : (
          <ul className="dash-wallet__ledger">
            {entries.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{entryLabel(row)}</strong>
                  <span>{formatDate(row.created_at)}</span>
                </div>
                <b className={row.amount < 0 ? 'is-out' : 'is-in'}>
                  {row.amount < 0 ? `−${rupee(Math.abs(row.amount))}` : `+${rupee(row.amount)}`}
                </b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
