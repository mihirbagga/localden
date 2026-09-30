import { useState } from 'react'
import { Copy, Wallet } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { PAYOUT_MIN, entryLabel, rupee } from '../lib/wallet'
import { REFEREE_REWARD, REFERRER_REWARD, referralLink } from '../lib/referrals'
import { formatDate } from './admin/adminHelpers'

export default function DashboardWallet({ wallet, entries, referrals, code, loading, onRefresh }) {
  const { showToast } = useToast()
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

  const welcomeBonusTotal = (entries || [])
    .filter((e) => e.kind === 'welcome_bonus' && e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0)

  const totalSpent = Math.abs(
    (entries || []).filter((e) => e.kind === 'spend' && e.amount < 0).reduce((sum, e) => sum + e.amount, 0)
  )

  const promoCreditRemaining = Math.max(0, welcomeBonusTotal - totalSpent)
  const withdrawableAmount = Math.max(0, (wallet?.available || 0) - promoCreditRemaining)

  const payout = async () => {
    if (withdrawableAmount < PAYOUT_MIN) {
      showToast(
        `Minimum withdrawable payout is ${rupee(PAYOUT_MIN)}. Welcome Den Cash (${rupee(promoCreditRemaining)}) can only be spent on gear rentals.`,
        'error'
      )
      return
    }
    setBusy(true)
    const { error } = await supabase.rpc('request_wallet_payout', { p_amount: withdrawableAmount })
    setBusy(false)
    if (error) {
      showToast(error.message || 'Payout failed. Run the wallet SQL.', 'error')
      return
    }
    showToast('Payout requested. Admin will send it to your bank.', 'success')
    onRefresh?.()
  }

  return (
    <div className="dash-wallet">
      <div className="dash-wallet__stats">
        <div className="dash-wallet__stat">
          <span>Total Balance</span>
          <strong>{loading ? '…' : rupee(wallet.available)}</strong>
        </div>
        {promoCreditRemaining > 0 && (
          <div className="dash-wallet__stat">
            <span>Promo Den Cash (Rental Only)</span>
            <strong style={{ color: '#ff2e6d' }}>{loading ? '…' : rupee(promoCreditRemaining)}</strong>
          </div>
        )}
        <div className="dash-wallet__stat">
          <span>Withdrawable (Bank Payout)</span>
          <strong style={{ color: '#00ff94' }}>{loading ? '…' : rupee(withdrawableAmount)}</strong>
        </div>
        <div className="dash-wallet__stat">
          <span>Payout pending</span>
          <strong>{loading ? '…' : rupee(wallet.pending)}</strong>
        </div>
      </div>
      <p className="dash-wallet__hint">
        Earnings land after a completed return. Welcome Den Cash ({rupee(200)}) can be spent on any gear rental. Only earnings and referral rewards can be withdrawn to bank (min. ₹{PAYOUT_MIN}).
      </p>
      <button
        type="button"
        className="btn-primary"
        disabled={busy || withdrawableAmount < PAYOUT_MIN}
        onClick={payout}
        aria-label="Request wallet payout"
      >
        <Wallet size={14} /> Request payout {withdrawableAmount >= PAYOUT_MIN ? rupee(withdrawableAmount) : ''}
      </button>

      <section className="dash-wallet__block">
        <h3>Your referral</h3>
        <p>Share the code. Friend signs up. After their first paid booking you get ₹{REFERRER_REWARD}, they get ₹{REFEREE_REWARD}.</p>
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
