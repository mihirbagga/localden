import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Send, Zap, Eye, LayoutGrid, List, X, KeyRound, Copy, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { BOOKING_LABEL, BOOKING_STATUSES, displayName, explainAdminError, formatDate, shortId } from './adminHelpers'
import { adjustListingStock } from '../../lib/stockService'
import { updateBookingTracking } from '../../lib/trackingService'
import { getPaymentMethodLabel, getPaymentStatusInfo } from '../../lib/payments'
import { getHandoverPin, getReturnPin } from '../../lib/messages'
import {
  formatNewOrderAdminMessage,
  buildWhatsAppLink,
  sendWhatsAppNotification,
  fetchWhatsAppSettings
} from '../../lib/whatsappSmsService'

import LiveTrackingModal from '../../components/LiveTrackingModal'
import DepositRefundModal from '../../components/DepositRefundModal'
import DeliveryAddressDisplay from '../../components/DeliveryAddressDisplay'
import BookingPaymentBreakup, { parseBookingFinancials } from '../../components/BookingPaymentBreakup'

export default function AdminBookings({ bookings, patchBooking }) {
  const { showToast } = useToast()
  const { confirm, prompt } = useConfirm()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('cards')
  const [inspectedId, setInspectedId] = useState(null)
  const [activeTrackingBooking, setActiveTrackingBooking] = useState(null)
  const [activeRefundBooking, setActiveRefundBooking] = useState(null)

  const handleCopyRef = (text, label = 'Reference') => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    showToast(`Copied ${label} "${text}" to clipboard!`, 'success')
  }

  const needsVerifyCount = useMemo(
    () => bookings.filter((b) => b.payment_status !== 'paid' && b.status !== 'cancelled').length,
    [bookings]
  )

  const inspectedBooking = useMemo(
    () => bookings.find((b) => b.id === inspectedId) || null,
    [bookings, inspectedId]
  )

  const filtered = useMemo(() => (
    bookings.filter((b) => {
      if (statusFilter === 'pay_verify') {
        if (!(b.payment_status !== 'paid' && b.status !== 'cancelled')) return false
      } else if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false
      }
      return matchesQuery([
        b.id,
        b.listings?.title,
        b.renter?.full_name,
        b.renter?.email,
        b.renter?.phone,
        b.lister?.full_name,
        b.status,
        b.razorpay_payment_id,
        b.payment_ref,
        b.coupon_code,
      ], query)
    })
  ), [bookings, query, statusFilter])

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
    showToast(`Booking marked as ${BOOKING_LABEL[status] || status}.`, 'success')
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

  /**
   * 1-Click Super-Macro: Verifies Payment + Confirms Booking + Syncs Tracking + Opens WhatsApp to Renter with Handover OTP PIN
   */
  const handleOneClickApprove = async (booking) => {
    const handoverPin = getHandoverPin(booking.id)
    const ok = await confirm({
      title: '⚡ 1-Click Verify, Confirm & Notify',
      message: `Approve Order #${shortId(booking.id)} (₹${booking.total_amount}), mark payment as Paid, set status to Confirmed, and open WhatsApp to ${displayName(booking.renter)} with Handover PIN ${handoverPin}?`,
      confirmText: '⚡ Approve & WhatsApp Renter',
      variant: 'success',
    })
    if (!ok) return

    try {
      // 1. Verify payment if not already paid
      if (booking.payment_status !== 'paid') {
        const { error: rpcErr } = await supabase.rpc('confirm_booking_payment', {
          p_booking_id: booking.id,
          p_note: '1-Click Approved by Admin',
        })
        if (rpcErr && /does not exist/i.test(rpcErr.message || '')) {
          await supabase
            .from('bookings')
            .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', booking.id)
        }
      }

      // 2. Confirm booking status
      const { error: statusErr } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', booking.id)
      if (statusErr) throw statusErr

      // 3. Sync live tracking
      await updateBookingTracking(booking.id, { tracking_status: 'confirmed' }).catch(() => {})

      patchBooking(booking.id, { status: 'confirmed', payment_status: 'paid' })
      showToast(`⚡ Order #${shortId(booking.id)} verified & confirmed!`, 'success')

      // 4. Open WhatsApp to renter with 4-digit Handover OTP PIN
      const renterPhone = booking.renter?.phone
      if (renterPhone) {
        const name = displayName(booking.renter, 'there')
        const gearTitle = booking.listings?.title || 'gear'
        const msg = `Hi ${name}! 🎉 Your Local Den booking for *${gearTitle}* (#${shortId(booking.id)}) is *CONFIRMED & PAID*!\n\n📅 Dates: ${booking.start_date} → ${booking.end_date} (${booking.total_days}d)\n🔐 *4-Digit Handover OTP:* *${handoverPin}*\n\nShare this 4-digit PIN when receiving your gear. Let us know if you need anything! ⚡`
        window.open(buildWhatsAppLink(renterPhone, msg), '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      showToast(err.message || '1-Click Approval failed', 'error')
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

  const handleWhatsAppAlert = async (booking) => {
    try {
      const settings = await fetchWhatsAppSettings()
      const adminPhone = settings.admin_phone || '919034695091'
      const fin = parseBookingFinancials(booking)
      const msg = formatNewOrderAdminMessage({
        bookingId: booking.id,
        listing: booking.listings,
        renter: booking.renter,
        startDate: booking.start_date,
        endDate: booking.end_date,
        days: booking.total_days,
        subtotal: fin.subtotal,
        deliveryFee: fin.deliveryFee,
        deliveryDistanceKm: fin.deliveryDistanceKm,
        warehouseNote: fin.warehouseNote,
        deposit: fin.deposit,
        walletAmount: fin.walletAmount,
        paidAmount: fin.paidAmount,
        total: fin.totalAmount,
        paymentStatus: booking.payment_status,
        paymentMethod: booking.payment_method,
        deliveryType: booking.delivery_type,
        deliveryAddress: booking.delivery_address,
        couponCode: booking.coupon_code,
      })

      await sendWhatsAppNotification({
        phone: adminPhone,
        message: msg,
        event: 'admin_order_alert',
        payload: { webhook_url: settings.webhook_url, data: booking },
      })

      const waLink = buildWhatsAppLink(adminPhone, msg)
      window.open(waLink, '_blank')
      showToast('WhatsApp order alert opened!', 'success')
    } catch (err) {
      showToast(err.message || 'WhatsApp alert failed', 'error')
    }
  }

  const handleWhatsAppRenter = (booking) => {
    const renterPhone = booking.renter?.phone
    if (!renterPhone) {
      showToast('No phone number on renter profile. Contact via email.', 'info')
      return
    }
    const name = displayName(booking.renter, 'Customer')
    const gearTitle = booking.listings?.title || 'gear'
    const handoverPin = getHandoverPin(booking.id)
    const returnPin = getReturnPin(booking.id)
    const msg = `Hi ${name}! LocalDen team here regarding your rental for *${gearTitle}* (Booking #${shortId(booking.id)}).\n\n📅 Dates: ${booking.start_date} → ${booking.end_date}\n📌 Status: ${booking.status.toUpperCase()}\n🔐 *Handover PIN:* *${handoverPin}* · *Return PIN:* *${returnPin}*\n\nHow can we help you today? ⚡`
    const link = buildWhatsAppLink(renterPhone, msg)
    window.open(link, '_blank')
  }

  const handleWhatsAppHost = (booking) => {
    const hostPhone = booking.lister?.phone || booking.listings?.contact_phone
    if (!hostPhone) {
      showToast('No phone number on host profile or listing. Contact via email.', 'info')
      return
    }
    const hostName = displayName(booking.lister, 'Host')
    const renterName = displayName(booking.renter, 'Verified Renter')
    const gearTitle = booking.listings?.title || 'your gear'
    const fin = parseBookingFinancials(booking)
    const handoverPin = getHandoverPin(booking.id)
    const returnPin = getReturnPin(booking.id)
    const msg = `Hi ${hostName}! LocalDen Admin here regarding Booking #${shortId(booking.id)} for *${gearTitle}*.\n\n👤 Renter: *${renterName}*\n📅 Dates: ${booking.start_date} → ${booking.end_date} (${booking.total_days}d · ${booking.delivery_type || 'pickup'})\n💵 Your Net Earnings: *₹${fin.listerNetEarnings}*\n🔐 *Handover PIN:* *${handoverPin}* · *Return PIN:* *${returnPin}*\n\nPlease confirm readiness or verify the PIN on handover in your Host Dashboard! ⚡`
    window.open(buildWhatsAppLink(hostPhone, msg), '_blank')
  }

  const handleDownloadAgreement = async (booking) => {
    try {
      const { generateAgreementPDF } = await import('../../lib/rentalAgreement')
      const renterName = displayName(booking.renter, 'Borrower')
      const listerName = displayName(booking.lister, 'Host')
      await generateAgreementPDF(booking, booking.listings, renterName, listerName, {
        renterPhone: booking.renter?.phone || '',
        listerPhone: booking.lister?.phone || booking.listings?.contact_phone || '',
        download: true,
      })
      showToast(`Downloaded Rental Pact #${shortId(booking.id)}`, 'success')
    } catch (err) {
      showToast(err.message || 'Could not generate Rental Pact PDF', 'error')
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search gear, renter, UTR, Razorpay ID, coupon…"
          ariaLabel="Search bookings"
        />
        <div className="admin-filter-chips" role="group" aria-label="Filter bookings by status">
          {[
            { id: 'all', label: 'All' },
            { id: 'pay_verify', label: 'Needs Payment Verify' },
            { id: 'pending', label: 'Pending' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setStatusFilter(chip.id)}
              className={`admin-filter-chip${statusFilter === chip.id ? ' is-on' : ''}`}
            >
              {chip.label}
              {chip.id === 'pay_verify' && needsVerifyCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-black">
                  {needsVerifyCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/10 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                viewMode === 'cards' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-white/50 hover:text-white'
              }`}
              title="Pipeline Card View"
            >
              <LayoutGrid size={13} /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-white/50 hover:text-white'
              }`}
              title="Compact Table View"
            >
              <List size={13} /> Table
            </button>
          </div>
          <p className="admin-muted">{filtered.length} booking{filtered.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty
          emoji="📅"
          title="No matching bookings"
          body={statusFilter !== 'all' || query ? 'Try clearing your search or switching the status filter above.' : 'All platform bookings land here as soon as renters reserve gear.'}
        />
      ) : viewMode === 'cards' ? (
        /* NEW-AGE PIPELINE CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((booking) => {
            const payStatus = getPaymentStatusInfo(booking.payment_status, booking.payment_method)
            const needsAction = booking.status === 'pending' || (booking.payment_status !== 'paid' && booking.status !== 'cancelled')
            const handoverPin = getHandoverPin(booking.id)
            return (
              <div
                key={booking.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  needsAction
                    ? 'bg-gradient-to-br from-cyan-500/[0.08] via-white/[0.03] to-transparent border-cyan-500/30'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Top Bar: ID, Status, Payment Badge, Inspect button */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                        #{shortId(booking.id)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${payStatus.badgeClass}`}>
                        {payStatus.label} · {getPaymentMethodLabel(booking.payment_method)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-[10px] font-mono">
                        🔐 PIN: {handoverPin}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        booking.renter_signature && booking.lister_signature
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : booking.renter_signature || booking.lister_signature
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : 'bg-white/5 text-white/40 border-white/10'
                      }`}>
                        {booking.renter_signature && booking.lister_signature
                          ? '✓ Pact 2/2'
                          : booking.renter_signature || booking.lister_signature
                            ? '✍️ Pact 1/2'
                            : 'Pact 0/2'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedId(booking.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-cyan-300 flex items-center gap-1 transition-all"
                    >
                      <Eye size={12} /> Inspect
                    </button>
                  </div>

                  {/* Gear & Parties */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to={`/listing/${booking.listings?.id || booking.listing_id}`}
                        className="text-sm font-display font-bold text-white hover:text-cyan-300 transition-colors"
                      >
                        {booking.listings?.emoji || '🎮'} {booking.listings?.title || 'Gear Listing'}
                      </Link>
                      <div className="text-xs text-white/60 mt-1 space-y-0.5">
                        <div>
                          👤 Renter: <strong className="text-white/90">{displayName(booking.renter)}</strong>
                          {booking.renter?.phone ? ` (${booking.renter.phone})` : ''}
                        </div>
                        <div>
                          🏠 Host: <strong className="text-white/80">{displayName(booking.lister)}</strong> · 📅 {booking.start_date} → {booking.end_date} ({booking.total_days}d · {booking.delivery_type || 'pickup'})
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-display font-extrabold text-white">₹{booking.total_amount}</div>
                      {booking.deposit > 0 && (
                        <span className="text-[10px] text-white/50 block">incl. ₹{booking.deposit} dep</span>
                      )}
                    </div>
                  </div>

                  {/* UTR / PayCode / Razorpay Ref */}
                  {booking.payment_ref || booking.razorpay_payment_id ? (
                    <div className="mt-2.5 px-3 py-2 rounded-xl bg-black/50 border border-white/10 font-mono text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] uppercase font-bold font-sans text-cyan-300 tracking-wider">
                          {booking.payment_ref ? (booking.payment_ref.startsWith('LD') ? 'PayCode' : 'Ref') : 'RZP'}:
                        </span>
                        <span className="font-extrabold text-white tracking-wider select-all truncate">
                          {booking.payment_ref || booking.razorpay_payment_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyRef(booking.payment_ref || booking.razorpay_payment_id, 'Payment Ref')}
                          className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-all"
                          title="Copy reference"
                        >
                          <Copy size={12} />
                        </button>
                        {booking.payment_status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment(booking)}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-sans font-bold text-[10px] border border-emerald-500/30"
                          >
                            ✓ Verify
                          </button>
                        )}
                      </div>
                    </div>
                  ) : booking.payment_status !== 'paid' ? (
                    <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs flex items-center justify-between gap-2">
                      <span className="text-amber-300 text-[11px] font-medium truncate">
                        Payment awaiting match (0% fee direct UPI)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConfirmPayment(booking)}
                        className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold text-[10px] border border-amber-500/40 shrink-0"
                      >
                        ✓ Mark Paid
                      </button>
                    </div>
                  ) : null}

                  {/* Itemized Financial Breakup */}
                  <div className="mt-2.5">
                    <BookingPaymentBreakup booking={booking} role="admin" />
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                  {(booking.status === 'pending' || booking.payment_status !== 'paid') && booking.status !== 'cancelled' ? (
                    <button
                      type="button"
                      onClick={() => handleOneClickApprove(booking)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-xs hover:brightness-110 transition-all flex items-center gap-1 shadow-md shadow-emerald-500/20"
                    >
                      <Zap size={13} /> 1-Click Approve &amp; WhatsApp
                    </button>
                  ) : null}

                  <select
                    className="select-dark admin-select text-xs py-1 px-2"
                    value={booking.status}
                    aria-label={`Status for booking ${shortId(booking.id)}`}
                    onChange={(e) => handleStatus(booking, e.target.value)}
                  >
                    {BOOKING_STATUSES.map((opt) => (
                      <option key={opt} value={opt}>{BOOKING_LABEL[opt]}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveTrackingBooking(booking)}
                      className="px-2 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold hover:bg-cyan-500/30 transition-all"
                      title="Open Live Tracking & Courier Dispatch"
                    >
                      🚚 Track
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadAgreement(booking)}
                      className="px-2 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold hover:bg-purple-500/30 transition-all"
                      title="Download Rental Pact PDF"
                    >
                      📄 Pact
                    </button>
                    {booking.renter?.phone && (
                      <button
                        type="button"
                        onClick={() => handleWhatsAppRenter(booking)}
                        className="px-2 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                        title="WhatsApp Renter"
                      >
                        <Send size={10} /> WA Renter
                      </button>
                    )}
                    {(booking.lister?.phone || booking.listings?.contact_phone) && (
                      <button
                        type="button"
                        onClick={() => handleWhatsAppHost(booking)}
                        className="px-2 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold hover:bg-amber-500/30 transition-all flex items-center gap-1"
                        title="WhatsApp Host / Lister"
                      >
                        <Send size={10} /> WA Host
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* CLASSIC TABLE VIEW (WITH 1-CLICK MACRO & INSPECT BUTTON) */
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Renter</th>
                <th>Lister</th>
                <th>Dates</th>
                <th>Amount</th>
                <th>Status &amp; Actions</th>
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
                    <span className="admin-cell-sub">
                      #{shortId(booking.id)} · PIN: {getHandoverPin(booking.id)} · {formatDate(booking.created_at)}
                    </span>
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
                        <div className="text-[11px] text-white/70 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/10 flex items-center justify-between gap-1 select-all">
                          <span className="truncate">
                            {booking.payment_ref.startsWith('LD') ? 'PayCode' : 'Ref'}: <strong className="text-white">{booking.payment_ref}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyRef(booking.payment_ref, 'Reference')}
                            className="text-white/40 hover:text-white shrink-0"
                            title="Copy reference"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      )}

                      {booking.razorpay_payment_id && (
                        <div className="text-[11px] text-white/70 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/10 flex items-center justify-between gap-1 select-all">
                          <span className="truncate">
                            RZP: <strong className="text-white">{booking.razorpay_payment_id}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyRef(booking.razorpay_payment_id, 'Razorpay ID')}
                            className="text-white/40 hover:text-white shrink-0"
                            title="Copy Razorpay ID"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      )}

                      {booking.payment_status !== 'paid' && (
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment(booking)}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-500/30 transition-all"
                          >
                            ✓ Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectPayment(booking)}
                            className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold hover:bg-red-500/30 transition-all"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1.5">
                      {(booking.status === 'pending' || booking.payment_status !== 'paid') && booking.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleOneClickApprove(booking)}
                          className="px-2 py-1 rounded bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-[11px] hover:brightness-110 transition-all flex items-center justify-center gap-1"
                        >
                          <Zap size={11} /> 1-Click Approve
                        </button>
                      )}
                      <select
                        className="select-dark admin-select"
                        value={booking.status}
                        aria-label={`Status for booking ${shortId(booking.id)}`}
                        onChange={(e) => handleStatus(booking, e.target.value)}
                      >
                        {BOOKING_STATUSES.map((opt) => (
                          <option key={opt} value={opt}>{BOOKING_LABEL[opt]}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setInspectedId(booking.id)}
                          className="flex-1 px-2 py-1 rounded bg-white/10 text-white border border-white/15 text-[10px] font-bold hover:bg-white/15 transition-all flex items-center justify-center gap-1"
                        >
                          <Eye size={10} /> Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTrackingBooking(booking)}
                          className="flex-1 px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold hover:bg-cyan-500/30 transition-all"
                        >
                          🚚 Track
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SLIDE-OVER BOOKING INSPECTOR DRAWER */}
      {inspectedBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
          onClick={() => setInspectedId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Booking Inspector Drawer"
        >
          <div
            className="w-full max-w-lg bg-[#0d1018] border-l border-white/15 h-full overflow-y-auto p-5 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold block">
                  Order Inspector
                </span>
                <h3 className="text-base font-display font-bold text-white">
                  #{shortId(inspectedBooking.id)} · {inspectedBooking.listings?.title || 'Gear Rental'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedId(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white"
                aria-label="Close inspector"
              >
                <X size={15} />
              </button>
            </div>

            {/* 1-Click Super-Macro Banner */}
            {(inspectedBooking.status === 'pending' || inspectedBooking.payment_status !== 'paid') &&
              inspectedBooking.status !== 'cancelled' && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-500/35 flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-emerald-300 font-display block text-xs">
                      ⚡ Fast-Track This Order
                    </strong>
                    <span className="text-[11px] text-white/65">
                      Verify payment, confirm status &amp; open WhatsApp to renter with PIN.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOneClickApprove(inspectedBooking)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black font-extrabold text-xs hover:bg-emerald-400 transition-all shrink-0"
                  >
                    ⚡ 1-Click Approve
                  </button>
                </div>
              )}

            {/* Handover & Return PINs + Handshake Portal Link */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-300 flex items-center gap-1">
                    <KeyRound size={12} /> Handover OTP
                  </span>
                  <div className="font-mono text-lg font-extrabold tracking-[0.25em] text-white mt-1">
                    {getHandoverPin(inspectedBooking.id)}
                  </div>
                </div>
                <Link
                  to={`/verify-delivery?id=${inspectedBooking.id}&phase=checkin`}
                  target="_blank"
                  className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-400/35 text-[10px] font-bold hover:bg-cyan-500/30"
                  title="Open Delivery Handshake Portal"
                >
                  Verify ↗
                </Link>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-300 flex items-center gap-1">
                    <KeyRound size={12} /> Return OTP
                  </span>
                  <div className="font-mono text-lg font-extrabold tracking-[0.25em] text-white mt-1">
                    {getReturnPin(inspectedBooking.id)}
                  </div>
                </div>
                <Link
                  to={`/verify-delivery?id=${inspectedBooking.id}&phase=checkout`}
                  target="_blank"
                  className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-400/35 text-[10px] font-bold hover:bg-purple-500/30"
                  title="Open Return Handshake Portal"
                >
                  Verify ↗
                </Link>
              </div>
            </div>

            {/* Renter, Lister & Rental Pact Details */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-white/50">Renter</span>
                <strong className="text-white">
                  {displayName(inspectedBooking.renter)} ({inspectedBooking.renter?.phone || inspectedBooking.renter?.email || 'No contact'})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Lister (Host)</span>
                <strong className="text-white">
                  {displayName(inspectedBooking.lister)} ({inspectedBooking.lister?.phone || inspectedBooking.listings?.contact_phone || inspectedBooking.lister?.email || 'No contact'})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Rental Window</span>
                <strong className="text-white">
                  {inspectedBooking.start_date} → {inspectedBooking.end_date} ({inspectedBooking.total_days}d)
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Fulfillment</span>
                <strong className="text-cyan-300 uppercase">{inspectedBooking.delivery_type || 'pickup'}</strong>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span className="text-white/50">Digital Rental Pact</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    inspectedBooking.renter_signature && inspectedBooking.lister_signature
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : inspectedBooking.renter_signature || inspectedBooking.lister_signature
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : 'bg-white/5 text-white/45 border-white/10'
                  }`}>
                    {inspectedBooking.renter_signature && inspectedBooking.lister_signature
                      ? '✓ Signed by Both (2/2)'
                      : inspectedBooking.renter_signature
                        ? '✍️ Borrower Signed (1/2)'
                        : inspectedBooking.lister_signature
                          ? '✍️ Host Signed (1/2)'
                          : 'Unsigned (0/2)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadAgreement(inspectedBooking)}
                    className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 text-[10px] font-bold hover:bg-cyan-500/30"
                  >
                    📄 Download PDF
                  </button>
                </div>
              </div>
              {inspectedBooking.delivery_type === 'delivery' && inspectedBooking.delivery_address && (
                <div className="pt-2 border-t border-white/10">
                  <DeliveryAddressDisplay address={inspectedBooking.delivery_address} />
                </div>
              )}
            </div>

            {/* Financials & Itemized Payment Breakup */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-white text-xs">
                  Financial Breakup &amp; Settlement
                </span>
                <span className="text-[10px] text-cyan-300 font-mono">
                  {getPaymentMethodLabel(inspectedBooking.payment_method)}
                </span>
              </div>

              {/* Dynamic Itemized Financial Breakup */}
              <BookingPaymentBreakup booking={inspectedBooking} role="admin" defaultExpanded={true} />

              {inspectedBooking.payment_ref && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-white/50">{inspectedBooking.payment_ref.startsWith('LD') ? 'UPI PayCode' : 'UTR / Ref'}</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="font-mono text-white select-all">{inspectedBooking.payment_ref}</strong>
                    <button
                      type="button"
                      onClick={() => handleCopyRef(inspectedBooking.payment_ref, 'Reference')}
                      className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
                      title="Copy"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              )}
              {inspectedBooking.razorpay_payment_id && (
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Razorpay ID</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="font-mono text-white select-all">{inspectedBooking.razorpay_payment_id}</strong>
                    <button
                      type="button"
                      onClick={() => handleCopyRef(inspectedBooking.razorpay_payment_id, 'Razorpay ID')}
                      className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
                      title="Copy"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              )}
              {(inspectedBooking.status === 'pending' || inspectedBooking.payment_status !== 'paid') && inspectedBooking.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => handleOneClickApprove(inspectedBooking)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 mt-2"
                >
                  <Zap size={14} /> ⚡ 1-Click Approve (Verify, Confirm &amp; WhatsApp)
                </button>
              )}
              {inspectedBooking.deposit > 0 && inspectedBooking.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => setActiveRefundBooking(inspectedBooking)}
                  className="w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold hover:bg-emerald-500/30 transition-all mt-2"
                >
                  💰 Open Deposit Settlement &amp; Refund
                </button>
              )}
            </div>

            {/* Quick Communications & Tracking */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTrackingBooking(inspectedBooking)}
                className="py-2.5 px-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold hover:bg-cyan-500/30 transition-all"
              >
                🚚 Live Tracking Control
              </button>
              <button
                type="button"
                onClick={() => handleDownloadAgreement(inspectedBooking)}
                className="py-2.5 px-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold hover:bg-purple-500/30 transition-all"
              >
                📄 Download Pact PDF
              </button>
              <button
                type="button"
                onClick={() => handleWhatsAppRenter(inspectedBooking)}
                className="py-2.5 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Send size={12} /> WhatsApp Renter
              </button>
              <button
                type="button"
                onClick={() => handleWhatsAppHost(inspectedBooking)}
                className="py-2.5 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold hover:bg-amber-500/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Send size={12} /> WhatsApp Host
              </button>
              <button
                type="button"
                onClick={() => handleWhatsAppAlert(inspectedBooking)}
                className="py-2.5 px-3 rounded-xl bg-white/10 text-white border border-white/15 font-bold hover:bg-white/15 transition-all flex items-center justify-center gap-1.5 col-span-2"
              >
                <MessageSquare size={12} /> Send Full Order Summary to Admin WhatsApp
              </button>
            </div>
          </div>
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
