import { useState, useEffect } from 'react'
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2, Lock } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { checkActiveBookings, executeAccountDeletion, requestAccountDeletion } from '../lib/accountDeletionService'

export default function AccountDeletionModal({
  user,
  isAdmin = false,
  onClose,
  onDeleted,
}) {
  const { showToast } = useToast()
  const { user: currentUser, signOut } = useAuth()
  const [checking, setChecking] = useState(true)
  const [activeBookings, setActiveBookings] = useState({ hasActive: false, count: 0, bookings: [] })
  const [reason, setReason] = useState('No longer using the platform')
  const [customReason, setCustomReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const targetUserId = user?.id

  useEffect(() => {
    let isMounted = true
    if (targetUserId) {
      checkActiveBookings(targetUserId).then((res) => {
        if (isMounted) {
          setActiveBookings(res)
          setChecking(false)
        }
      })
    } else {
      setChecking(false)
    }
    return () => {
      isMounted = false
    }
  }, [targetUserId])

  const handleDelete = async (e) => {
    e.preventDefault()
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      showToast('Type DELETE to confirm.', 'error')
      return
    }

    if (activeBookings.hasActive) {
      showToast('Cannot delete account with active rentals in progress.', 'error')
      return
    }

    setDeleting(true)
    const finalReason = reason === 'other' ? customReason.trim() || 'Other' : reason

    try {
      if (isAdmin) {
        await executeAccountDeletion({
          userId: targetUserId,
          actorId: currentUser?.id,
          reason: finalReason,
        })
        showToast('User account has been permanently purged from database.', 'success')
        if (onDeleted) onDeleted(targetUserId)
        onClose()
      } else {
        await executeAccountDeletion({
          userId: targetUserId,
          reason: finalReason,
        })
        showToast('Your account and personal data have been removed. Goodbye! ⚡', 'info')
        onClose()
        await signOut()
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete account.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-[#0e121d] border border-red-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
              <Trash2 size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                {isAdmin ? 'Purge User Account' : 'Delete Account & Personal Data'}
              </h3>
              <p className="text-[11px] text-white/50">
                {user?.email || user?.full_name || 'Account'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        {checking ? (
          <div className="py-8 text-center text-xs text-white/50">
            Checking active rental records…
          </div>
        ) : activeBookings.hasActive ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-300">
                <AlertTriangle size={15} className="shrink-0" />
                Active Rentals In Progress ({activeBookings.count})
              </div>
              <p className="text-white/70 text-[11px] leading-relaxed">
                This account cannot be deleted yet because there are currently active or pending gear rentals.
                All rented gear must be returned and inspected before closure.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="btn-outline text-xs px-4 py-2 w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3.5">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/70 space-y-1.5">
              <span className="font-bold text-white block">What will happen:</span>
              <ul className="list-disc list-inside space-y-1 text-white/60">
                <li>Your name, phone number, and avatar will be permanently removed.</li>
                <li>All active gear listings will be permanently taken down.</li>
                <li>Government KYC records will be severed.</li>
                <li>Past completed booking receipts remain anonymized for legal audit.</li>
              </ul>
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">
                Reason for account closure
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="select-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white"
              >
                <option value="No longer using the platform">No longer using the platform</option>
                <option value="Privacy / data deletion request">Privacy / data deletion request</option>
                <option value="Relocating to an unserviced city">Relocating to an unserviced city</option>
                <option value="Switching to another account">Switching to another account</option>
                <option value="other">Other reason</option>
              </select>
            </div>

            {reason === 'other' && (
              <div>
                <input
                  type="text"
                  placeholder="Tell us why you are leaving (optional)..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-red-300 block mb-1">
                Type <strong className="text-white font-mono uppercase">DELETE</strong> to confirm permanent deletion:
              </label>
              <input
                type="text"
                required
                placeholder="Type DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input-dark w-full text-xs py-2 px-3 rounded-xl bg-black/50 border border-red-500/40 text-red-200 font-mono tracking-wider"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="btn-outline text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleting || confirmText.trim().toUpperCase() !== 'DELETE'}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-lg shadow-red-600/30"
              >
                <Trash2 size={13} />
                {deleting ? 'Deleting…' : isAdmin ? 'Confirm Purge' : 'Permanently Delete'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
