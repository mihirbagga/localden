import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { BOOKING_LABEL, BOOKING_STATUSES, displayName, explainAdminError, formatDate, shortId } from './adminHelpers'
import { adjustListingStock } from '../../lib/stockService'
import { updateBookingTracking } from '../../lib/trackingService'
import { getPaymentMethodLabel, getPaymentStatusInfo } from '../../lib/payments'

import LiveTrackingModal from '../../components/LiveTrackingModal'
import DepositRefundModal from '../../components/DepositRefundModal'
import DeliveryAddressDisplay from '../../components/DeliveryAddressDisplay'

export default function AdminBookings({ bookings, patchBooking }) {
  const { showToast } = useToast()
  const { confirm, prompt } = useConfirm()
  const [query, setQuery] = useState('')
  const [activeTrackingBooking, setActiveTrackingBooking] = useState(null)
  const [activeRefundBooking, setActiveRefundBooking] = useState(null)

  const filtered = useMemo(() => (
    bookings.filter((b) => matchesQuery([
      b.listings?.title,
      b.renter?.full_name,
      b.renter?.email,
      b.lister?.full_name,
      b.status,
      b.razorpay_payment_id,
      b.coupon_code,
    ], query))
  ), [bookings, query])

  const handleStatus = async (booking, status) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', booking.id)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    const listingId = booking.listing_id || booking.listings?.id
    if (['cancelled', 'declined', 'completed', 'returned'].includes(status) && listingId) {
      await adjustListingStock(listingId, 1)
    }

    try {
      if (status === 'confirmed') {
        await updateBookingTracking(booking.id, { tracking_status: 'confirmed' })
      } else if (status === 'active') {
        await updateBookingTracking(booking.id, { tracking_status: 'delivered', verified: true })
      } else if (status === 'completed') {
        await updateBookingTracking(booking.id, { tracking_status: 'completed' })
      }
    } catch (err) {
      console.warn('Sync tracking error:', err?.message)
    }

    patchBooking(booking.id, { status })
    showToast(`Booking ${BOOKING_LABEL[status] || status}`, 'success')
  }

  const handleConfirmPayment = async (booking) => {
    const ok = await confirm({
      title: 'Verify Payment',
      message: `Verify payment of ₹${booking.total_amount} (Ref: ${booking.payment_ref || booking.razorpay_payment_id || 'N/A'})? This will mark the booking as paid.`,
      confirmText: 'Verify Payment',
      variant: 'success',
    })
    if (!ok) return
    try {
      const { error } = await supabase.rpc('confirm_booking_payment', {
        p_booking_id: booking.id,
        p_note: 'Verified by Admin',
      })
      if (error) {
        if (/does not exist/i.test(error.message || '')) {
          // Fallback direct update if migration hasn't run yet
          const { error: updErr } = await supabase
            .from('bookings')
            .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', booking.id)
          if (updErr) throw updErr
        } else {
          throw error
        }
      }
      patchBooking(booking.id, { payment_status: 'paid' })
      showToast('Payment verified successfully!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to verify payment', 'error')
    }
  }

  const handleRejectPayment = async (booking) => {
    const reason = await prompt({
      title: 'Reject Payment',
      message: 'Reason for rejecting payment (the renter will see this note):',
      defaultValue: 'Payment reference could not be verified on our bank account.',
      placeholder: 'Enter rejection reason...',
      confirmText: 'Reject & Cancel',
      variant: 'danger',
    })
    if (reason === null) return
    try {
      const { error } = await supabase.rpc('reject_booking_payment', {
        p_booking_id: booking.id,
        p_reason: reason.trim() || 'Payment could not be verified.',
      })
      if (error) {
        if (/does not exist/i.test(error.message || '')) {
          const { error: updErr } = await supabase
            .from('bookings')
            .update({ payment_status: 'failed', status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', booking.id)
          if (updErr) throw updErr
        } else {
          throw error
        }
      }
      patchBooking(booking.id, { payment_status: 'failed', status: 'cancelled' })
      showToast('Payment rejected and booking cancelled.', 'info')
    } catch (err) {
      showToast(err.message || 'Failed to reject payment', 'error')
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search booking, renter, payment…"
          ariaLabel="Search bookings"
        />
        <p className="admin-muted">{filtered.length} booking{filtered.length === 1 ? '' : 's'}</p>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty emoji="📅" title="No bookings found" body="All platform bookings land here." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Renter</th>
                <th>Lister</th>
                <th>Dates</th>
                <th>Amount</th>
                <th>Status & Tracking</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    {booking.listings?.id ? (
                      <Link to={`/listing/${booking.listings.id}`} className="admin-link">
                        {booking.listings?.emoji || '🎮'} {booking.listings?.title || 'Listing'}
                      </Link>
                    ) : (
                      <span className="admin-cell-title">{booking.listings?.title || 'Listing'}</span>
                    )}
                    <span className="admin-cell-sub">{shortId(booking.id)} · {formatDate(booking.created_at)}</span>
                  </td>
                  <td>
                    {displayName(booking.renter)}
                    <span className="admin-cell-sub">{booking.renter?.email || ''}</span>
                  </td>
                  <td>{displayName(booking.lister)}</td>
                  <td>
                    <div className="font-semibold text-white">{booking.start_date} → {booking.end_date}</div>
                    <span className="admin-cell-sub">{booking.total_days} day{booking.total_days === 1 ? '' : 's'} · {booking.delivery_type || 'pickup'}</span>
                    {booking.delivery_type === 'delivery' && booking.delivery_address && (
                      <div className="mt-1">
                        <DeliveryAddressDisplay address={booking.delivery_address} compact={true} />
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="font-bold text-white text-sm">₹{booking.total_amount}</div>
                    <div className="flex flex-col gap-1 mt-1 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(() => {
                          const payStatus = getPaymentStatusInfo(booking.payment_status, booking.payment_method)
                          return (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${payStatus.badgeClass}`}>
                              {payStatus.label}
                            </span>
                          )
                        })()}
                        <span className="text-[11px] text-cyan-300 font-medium">
                          {getPaymentMethodLabel(booking.payment_method)}
                        </span>
                      </div>

                      {booking.payment_ref && (
                        <div className="text-[11px] text-white/70 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/10 select-all">
                          UTR: <strong className="text-white">{booking.payment_ref}</strong>
                        </div>
                      )}

                      {booking.razorpay_payment_id && (
                        <div className="text-[11px] text-white/70 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/10 select-all">
                          RZP: <strong className="text-white">{booking.razorpay_payment_id}</strong>
                        </div>
                      )}

                      {booking.coupon_code && (
                        <span className="text-[10px] text-emerald-400">
                          Coupon: {booking.coupon_code} (−₹{booking.discount_amount || 0})
                        </span>
                      )}

                      {/* Deposit & Refund Summary */}
                      {booking.deposit > 0 && (
                        <div className="text-[11px] text-white/80 bg-white/[0.04] p-1.5 rounded-lg border border-white/10 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-[10px] uppercase font-bold">Deposit:</span>
                            <span className="font-bold text-white">₹{booking.deposit}</span>
                          </div>
                          <div className="mt-0.5">
                            {booking.deposit_status === 'refunded' ? (
                              <span className="text-emerald-400 font-semibold block text-[10px]">
                                ✓ Refunded: ₹{booking.deposit_refunded_amount || booking.deposit}
                              </span>
                            ) : booking.deposit_status === 'partially_refunded' ? (
                              <span className="text-amber-400 font-semibold block text-[10px]">
                                ⚠️ Settled: ₹{booking.deposit_refunded_amount} returned · ₹{booking.deposit_deduction_amount} held
                              </span>
                            ) : booking.deposit_status === 'forfeited' ? (
                              <span className="text-red-400 font-semibold block text-[10px]">
                                ✕ Forfeited (₹{booking.deposit_deduction_amount})
                              </span>
                            ) : (
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-cyan-400/80 text-[10px]">Held in Escrow</span>
                                {booking.status === 'completed' && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveRefundBooking(booking)}
                                    className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-500/30"
                                  >
                                    💰 Refund
                                  </button>
                                )}
                              </div>
                            )}
                            {booking.deposit_deduction_reason && (
                              <span className="text-[9px] text-white/50 italic block mt-0.5">
                                Reason: {booking.deposit_deduction_reason}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Agreement Status */}
                      <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                        {booking.agreement_url ? (
                          <a
                            href={booking.agreement_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline font-bold flex items-center gap-0.5"
                          >
                            📄 Signed Pact PDF
                          </a>
                        ) : Boolean(booking.renter_signature && booking.lister_signature) ? (
                          <span className="text-emerald-400 font-semibold">✓ Signed by both</span>
                        ) : booking.renter_signature ? (
                          <span className="text-purple-300 font-semibold">✍️ Borrower signed</span>
                        ) : booking.lister_signature ? (
                          <span className="text-purple-300 font-semibold">✍️ Host signed</span>
                        ) : (
                          <span className="text-white/40">Unsigned pact</span>
                        )}
                      </div>

                      {/* Payment Verification Buttons */}
                      {booking.payment_status !== 'paid' && (
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment(booking)}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-0.5"
                            title="Verify and mark payment as paid"
                          >
                            ✓ Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectPayment(booking)}
                            className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold hover:bg-red-500/30 transition-all flex items-center gap-0.5"
                            title="Reject payment reference and cancel booking"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1.5">
                      <select
                        className="select-dark admin-select"
                        value={booking.status}
                        aria-label={`Status for booking ${shortId(booking.id)}`}
                        title="Change booking status"
                        onChange={(e) => handleStatus(booking, e.target.value)}
                      >
                        {BOOKING_STATUSES.map((opt) => (
                          <option key={opt} value={opt}>{BOOKING_LABEL[opt]}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setActiveTrackingBooking(booking)}
                        className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-1"
                      >
                        🚚 Tracking Control
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeTrackingBooking && (
        <LiveTrackingModal
          booking={activeTrackingBooking}
          onClose={() => setActiveTrackingBooking(null)}
          isAdmin={true}
        />
      )}
      {activeRefundBooking && (
        <DepositRefundModal
          booking={activeRefundBooking}
          onClose={() => setActiveRefundBooking(null)}
          onRefundSuccess={(res) => {
            patchBooking(activeRefundBooking.id, res)
            setActiveRefundBooking(null)
          }}
        />
      )}
    </div>
  )
}
