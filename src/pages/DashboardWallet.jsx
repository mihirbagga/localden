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

  const payout = async () => {
    const amount = Number(wallet.available) || 0
    if (amount < PAYOUT_MIN) {
      showToast(`Minimum payout is ${rupee(PAYOUT_MIN)}`, 'error')
      return
    }
    setBusy(true)
    const { error } = await supabase.rpc('request_wallet_payout', { p_amount: amount })
    setBusy(false)
    if (error) {
      showToast(error.message || 'Payout failed. Run the wallet SQL.', 'error')
      return
    }
    showToast('Payout requested. Admin will send it.', 'success')
    onRefresh?.()
  }

  return (
    <div className="dash-wallet">
      <div className="dash-wallet__stats">
        <div className="dash-wallet__stat">
          <span>Available</span>
          <strong>{loading ? '…' : rupee(wallet.available)}</strong>
        </div>
        <div className="dash-wallet__stat">
          <span>Payout pending</span>
          <strong>{loading ? '…' : rupee(wallet.pending)}</strong>
        </div>
      </div>
      <p className="dash-wallet__hint">
        Earnings land after a completed return (rent minus platform fee). Deposit stays on the booking.
        Spend the balance at checkout, or request a payout from ₹{PAYOUT_MIN}.
      </p>
      <button
        type="button"
        className="btn-primary"
        disabled={busy || (wallet.available || 0) < PAYOUT_MIN}
        onClick={payout}
        aria-label="Request wallet payout"
      >
        <Wallet size={14} /> Request payout {wallet.available >= PAYOUT_MIN ? rupee(wallet.available) : ''}
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
