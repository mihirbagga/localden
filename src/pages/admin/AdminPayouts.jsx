import { useEffect, useState } from 'react'
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Copy,
  Building2,
  Smartphone,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { rupee } from '../../lib/wallet'
import { formatDate } from './adminHelpers'
import { fetchPayoutRequests, updatePayoutStatus } from '../../lib/payoutService'

export default function AdminPayouts() {
  const { showToast } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'completed' | 'rejected'
  const [search, setSearch] = useState('')
  const [actionModal, setActionModal] = useState(null) // { type: 'complete' | 'reject', request: {...} }
  const [actionInput, setActionInput] = useState({ ref: '', note: '' })
  const [busy, setBusy] = useState(false)

  const loadRequests = async () => {
    setLoading(true)
    try {
      const list = await fetchPayoutRequests()
      setRequests(list)
    } catch (err) {
      showToast('Failed to load payout requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const copy = async (text, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(`${label} copied to clipboard!`, 'success')
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  const handleOpenAction = (type, request) => {
    setActionModal({ type, request })
    setActionInput({ ref: '', note: '' })
  }

  const handleConfirmAction = async (e) => {
    e?.preventDefault()
    if (!actionModal) return

    const { type, request } = actionModal
    setBusy(true)
    try {
      if (type === 'complete') {
        await updatePayoutStatus(request.id, {
          status: 'completed',
          transactionRef: actionInput.ref.trim() || 'Direct UPI/Bank Transfer',
          adminNotes: actionInput.note.trim() || 'Paid successfully',
        })
        showToast(`Payout #${request.id.slice(-6)} marked as completed!`, 'success')
      } else {
        await updatePayoutStatus(request.id, {
          status: 'rejected',
          adminNotes: actionInput.note.trim() || 'Rejected by admin (refunded to wallet)',
        })
        showToast(`Payout #${request.id.slice(-6)} rejected and refunded to user wallet.`, 'info')
      }
      setActionModal(null)
      await loadRequests()
    } catch (err) {
      showToast(err.message || 'Action failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  // Filtered requests
  const filtered = requests.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.id?.toLowerCase().includes(q) ||
      r.user?.full_name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.upi_id?.toLowerCase().includes(q) ||
      r.bank_details?.accountNumber?.includes(q) ||
      String(r.amount).includes(q)
    )
  })

  // Aggregates
  const stats = {
    pendingCount: requests.filter((r) => r.status === 'pending').length,
    pendingSum: requests.filter((r) => r.status === 'pending').reduce((sum, r) => sum + (r.amount || 0), 0),
    completedSum: requests.filter((r) => r.status === 'completed').reduce((sum, r) => sum + (r.amount || 0), 0),
    totalCount: requests.length,
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Pending Payouts</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-300">
            {rupee(stats.pendingSum)}
          </div>
          <div className="text-xs text-white/40 mt-1">
            {stats.pendingCount} request{stats.pendingCount === 1 ? '' : 's'} awaiting action
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Completed Payouts</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {rupee(stats.completedSum)}
          </div>
          <div className="text-xs text-white/40 mt-1">
            Processed & transferred
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Total Requests</span>
            <Wallet size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-cyan-300">
            {stats.totalCount}
          </div>
          <div className="text-xs text-white/40 mt-1">
            All-time user withdrawal tickets
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm flex flex-col justify-between">
          <div className="text-xs text-white/50 font-semibold">Security Policy</div>
          <div className="text-xs text-white/70 space-y-1">
            <p>🔒 <strong>Referrals & Welcome Bonuses</strong> are strictly non-withdrawable.</p>
            <p>Only verified rental earnings can be requested.</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-black/40 border border-white/10">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-white/5 px-3 py-2 rounded-xl border border-white/10">
          <Search size={16} className="text-white/40" />
          <input
            type="text"
            placeholder="Search by user, email, UPI ID, or amount..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-0 text-sm text-white focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'pending', 'completed', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
              }`}
            >
              {f}
            </button>
          ))}

          <button
            onClick={loadRequests}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all ml-1"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="p-12 text-center text-white/40 text-sm">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-cyan-400" />
          Loading payout requests…
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-black/20 border border-white/10 space-y-2">
          <Wallet size={36} className="mx-auto text-white/20" />
          <div className="text-white/70 font-semibold">No payout requests found</div>
          <p className="text-white/40 text-xs max-w-sm mx-auto">
            {filter !== 'all'
              ? `There are currently no requests with "${filter}" status.`
              : 'When listers request wallet payouts, they will appear here for review and settlement.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isPending = req.status === 'pending'
            const isCompleted = req.status === 'completed'
            const isRejected = req.status === 'rejected'

            return (
              <div
                key={req.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isPending
                    ? 'bg-amber-500/[0.04] border-amber-500/30'
                    : isCompleted
                    ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                    : 'bg-white/[0.02] border-white/10 opacity-70'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: User & Amount */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold font-mono text-white">
                        {rupee(req.amount)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isPending
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}
                      >
                        {isPending ? 'Pending Settlement' : isCompleted ? 'Completed' : 'Rejected'}
                      </span>
                      <span className="text-white/40 text-xs">
                        #{req.id.slice(-6)}
                      </span>
                    </div>

                    <div className="text-sm text-white/80 flex items-center gap-2">
                      <span className="font-semibold">{req.user?.full_name || 'Member'}</span>
                      <span className="text-white/40">·</span>
                      <span className="text-white/60 text-xs">{req.user?.email}</span>
                      {req.user?.phone && req.user?.phone !== 'N/A' && (
                        <>
                          <span className="text-white/40">·</span>
                          <span className="text-white/60 text-xs">{req.user?.phone}</span>
                        </>
                      )}
                    </div>

                    <div className="text-xs text-white/40">
                      Requested on {formatDate(req.created_at)}
                    </div>
                  </div>

                  {/* Middle: Destination Details */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 min-w-[260px]">
                    {req.payout_method === 'upi' ? (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1">
                          <Smartphone size={12} /> UPI Payout
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <code className="text-xs font-mono text-white font-bold truncate">
                            {req.upi_id}
                          </code>
                          <button
                            type="button"
                            onClick={() => copy(req.upi_id, 'UPI ID')}
                            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
                            title="Copy UPI ID"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs space-y-1">
                        <div className="text-[11px] uppercase tracking-wider text-purple-400 font-semibold flex items-center gap-1">
                          <Building2 size={12} /> Bank Transfer
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white/60 text-[11px]">A/C No:</span>
                          <div className="flex items-center gap-1 font-mono text-white font-semibold">
                            <span>{req.bank_details?.accountNumber}</span>
                            <button
                              type="button"
                              onClick={() => copy(req.bank_details?.accountNumber, 'Account number')}
                              className="p-0.5 text-white/50 hover:text-white"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-white/60">IFSC:</span>
                          <span className="font-mono text-white/90">{req.bank_details?.ifsc}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-white/60">Name:</span>
                          <span className="text-white/90">{req.bank_details?.accountHolderName}</span>
                        </div>
                      </div>
                    )}

                    {req.transaction_ref && (
                      <div className="text-[11px] text-emerald-400/90 pt-1 border-t border-white/10 flex items-center gap-1">
                        <ShieldCheck size={12} /> Ref: {req.transaction_ref}
                      </div>
                    )}
                    {req.admin_notes && (
                      <div className="text-[11px] text-white/50 italic">
                        Note: {req.admin_notes}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenAction('complete', req)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <CheckCircle2 size={14} />
                          <span>Mark Paid</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAction('reject', req)}
                          className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <XCircle size={14} />
                          <span>Reject & Refund</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-xs text-white/40 flex items-center gap-1">
                        <span>Settled {formatDate(req.updated_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmation / Details Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/20 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {actionModal.type === 'complete' ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    Confirm Payout Payment
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} className="text-red-400" />
                    Reject Payout Request
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-white/60">Amount:</span>
                <span className="font-bold font-mono text-white">{rupee(actionModal.request.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Payee:</span>
                <span className="text-white font-medium">{actionModal.request.user?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Destination:</span>
                <span className="text-cyan-300 font-mono">
                  {actionModal.request.payout_method === 'upi'
                    ? actionModal.request.upi_id
                    : `A/C ${actionModal.request.bank_details?.accountNumber}`}
                </span>
              </div>
            </div>

            {actionModal.type === 'complete' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Bank UTR / Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={actionInput.ref}
                    onChange={(e) => setActionInput((prev) => ({ ...prev, ref: e.target.value }))}
                    placeholder="e.g. UTR-92384910283 or IMPS-8291"
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Admin Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={actionInput.note}
                    onChange={(e) => setActionInput((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="e.g. Paid via PhonePe Merchant"
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  Reason for Rejection (Will be visible to user & money refunded)
                </label>
                <textarea
                  rows={3}
                  value={actionInput.note}
                  onChange={(e) => setActionInput((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="e.g. Invalid bank account IFSC code / Name mismatch"
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-red-400"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={busy}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  actionModal.type === 'complete'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-bold'
                    : 'bg-red-500 hover:bg-red-400 text-white font-bold'
                }`}
              >
                {busy ? 'Processing…' : actionModal.type === 'complete' ? 'Confirm Payment' : 'Reject & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

