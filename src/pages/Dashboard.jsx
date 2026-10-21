import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  User, Star, Shield, Edit3, Plus, Trash2, Eye,
  Package, Calendar, TrendingUp, Clock, Camera, LogOut,
  ChevronRight, X, Check, Minus, Wallet,
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { supabase } from '../lib/supabase'
import { getPaymentMethodLabel, getPaymentStatusInfo } from '../lib/payments'
import {
  bookingThreadText,
  mailtoHref,
  otherPartyContact,
  whatsappHref,
  bookingWhatsAppLink,
  bookingMailtoLink,
} from '../lib/alerts'
import { fetchInspections } from '../lib/inspections'
import InspectionPanel from '../components/InspectionPanel'
import BookingThread from '../components/BookingThread'
import LiveTrackingModal from '../components/LiveTrackingModal'
import BookingStepper from '../components/BookingStepper'
import DepositRefundModal from '../components/DepositRefundModal'
import DeliveryAddressDisplay from '../components/DeliveryAddressDisplay'
import SignatureModal from '../components/SignatureModal'
import DashboardWallet from './DashboardWallet'
import BookingPaymentBreakup, { parseBookingFinancials } from '../components/BookingPaymentBreakup'
import { useWallet } from '../hooks/useWallet'
import { adjustListingStock } from '../lib/stockService'
import { updateBookingTracking } from '../lib/trackingService'
import { formatLocationDisplay } from '../lib/cities'
import { shiftIso } from '../lib/bookingDates'
import { MESSAGES, getHandoverPin, getReturnPin } from '../lib/messages'

import './dashboard.css'

const TABS = ['overview', 'listings', 'bookings', 'incoming', 'wallet']
const BOOKING_SELECT = '*, listings(id, title, emoji, category, location, contact_phone, price_day), renter:profiles!renter_id(id, full_name, phone, email, kyc_status, rating), lister:profiles!lister_id(id, full_name, phone, email, kyc_status, rating)'
const LISTING_SELECT = '*, profiles(full_name, rating, kyc_status)'
const PAID_STATUSES = ['confirmed', 'active', 'completed']
const STATUS_CHIPS = ['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled']
const LISTING_CHIPS = ['all', 'live', 'hidden', 'low']

const STATUS_LABEL = {
  pending: 'Pending Approval',
  confirmed: 'Confirmed',
  active: 'Active Rental',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
}

function rupee(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function firstName(profile, user) {
  const raw = profile?.full_name || user?.email?.split('@')[0] || 'there'
  return raw.split(' ')[0]
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const start = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((start.getTime() - today.getTime()) / 86400000)
}

function bookingEarn(booking) {
  if (booking.subtotal != null) return Number(booking.subtotal)
  return Math.max(0, Number(booking.total_amount || 0) - Number(booking.deposit || 0))
}

function listingTone(listing) {
  if (listing.is_published === false) return { label: 'Hidden', cls: 'is-off' }
  if (listing.is_available) return { label: `Live · ${listing.stock_qty ?? 1}`, cls: 'is-live' }
  return { label: 'Off', cls: 'is-off' }
}

function filterBookings(rows, status) {
  if (status === 'all') return rows
  return rows.filter((row) => row.status === status)
}

function filterListings(rows, chip) {
  if (chip === 'live') return rows.filter((row) => row.is_published !== false && row.is_available)
  if (chip === 'hidden') return rows.filter((row) => row.is_published === false)
  if (chip === 'low') return rows.filter((row) => (row.stock_qty ?? 1) <= 1)
  return rows
}

function Counter({ end, prefix = '', duration = 900 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    started.current = false
    setCount(0)
    const node = ref.current
    if (!node) return undefined
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return
      started.current = true
      const frames = Math.max(1, Math.round(duration / 16))
      let frame = 0
      const timer = setInterval(() => {
        frame += 1
        setCount(Math.floor((end * frame) / frames))
        if (frame >= frames) clearInterval(timer)
      }, 16)
    })
    obs.observe(node)
    return () => obs.disconnect()
  }, [end, duration])

  return <span ref={ref}>{prefix}{Number(count).toLocaleString('en-IN')}</span>
}

function DeleteModal({ listing, onConfirm, onCancel, loading }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  if (!listing) return null

  return (
    <div className="dash-modal-bg" onClick={onCancel} role="presentation">
      <div className="dash-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="dash-del-title">
        <button type="button" className="dash-modal__x" aria-label="Close delete dialog" onClick={onCancel}>
          <X size={14} />
        </button>
        <div className="dash-modal__icon"><Trash2 size={28} /></div>
        <h2 id="dash-del-title">Delete Listing?</h2>
        <p>This permanently removes the listing. Cannot undo.</p>
        <div className="dash-modal__preview">
          <span aria-hidden="true">{listing.emoji || '🎮'}</span>
          <div>
            <b>{listing.title}</b>
            <span>{rupee(listing.price_day)}/day · {listing.location}</span>
          </div>
        </div>
        <div className="dash-modal__acts">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={loading} aria-label="Confirm delete listing">
            {loading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, tone, sub, active, onClick, prefix = '' }) {
  return (
    <button
      type="button"
      className={`dash-stat is-${tone}${active ? ' is-on' : ''}`}
      onClick={onClick}
      aria-label={`${label}: ${prefix}${value}`}
      aria-pressed={active}
    >
      <div className="dash-stat__icon">{icon}</div>
      <div className="dash-stat__val">
        {typeof value === 'number' ? <Counter end={value} prefix={prefix} /> : value}
      </div>
      <div className="dash-stat__label">{label}</div>
      {sub ? <div className="dash-stat__sub">{sub}</div> : null}
    </button>
  )
}

function BookingCard({ booking, role, open, onToggle, onStatus, onExtendRental }) {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const listing = booking.listings
  const listingId = listing?.id
  const status = booking.status || 'pending'
  const days = daysUntil(booking.start_date)
  let when = `${booking.start_date} → ${booking.end_date}`
  if (days === 0) when = 'Starts today'
  if (days === 1) when = 'Starts tomorrow'
  if (days > 1 && days < 14) when = `Starts in ${days} days`
  if (days < 0 && status === 'active') when = 'Happening now'
  if (days < 0 && status === 'completed') when = 'Returned'

  const listerActs = role === 'lister'
  const renterActs = role === 'renter'
  const [other, setOther] = useState(null)
  const [forcePhase, setForcePhase] = useState('')
  const [pendingStatus, setPendingStatus] = useState('')
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [signatureOpen, setSignatureOpen] = useState(false)

  const handleSaveDirectSignature = async (payload) => {
    const isRenter = role === 'renter'
    const sigField = isRenter ? 'renter_signature' : 'lister_signature'
    const dateField = isRenter ? 'renter_signed_at' : 'lister_signed_at'

    booking[sigField] = payload.signatureUrl
    booking[dateField] = payload.signedAt

    try {
      const { error: rpcErr } = await supabase.rpc('sign_booking_agreement', {
        p_booking_id: booking.id,
        p_signature: payload.signatureUrl,
      })
      if (rpcErr) {
        await supabase
          .from('bookings')
          .update({
            [sigField]: payload.signatureUrl,
            [dateField]: payload.signedAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id)
      }

      if (booking.renter_signature && booking.lister_signature) {
        const { uploadSignedAgreementPDF } = await import('../lib/rentalAgreement')
        const renterName = booking.renter?.full_name || (isRenter ? payload.signerName : 'Borrower')
        const listerName = booking.lister?.full_name || (!isRenter ? payload.signerName : 'Host')
        const agreementUrl = await uploadSignedAgreementPDF(booking, booking.listings, renterName, listerName)
        if (agreementUrl) booking.agreement_url = agreementUrl
        showToast('✓ Pact sealed with both signatures and saved to cloud!', 'success')
      } else {
        showToast('✓ Your digital signature was recorded!', 'success')
      }
      onStatus(booking, booking.status)
    } catch (err) {
      showToast(err.message || 'Could not save signature', 'error')
    }
  }

  useEffect(() => {
    if (!open) return undefined
    const otherId = role === 'lister' ? booking.renter_id : booking.lister_id
    let cancelled = false
    supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', otherId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setOther(data) })
    return () => { cancelled = true }
  }, [open, role, booking.renter_id, booking.lister_id])

  const partyName = role === 'lister'
    ? (booking.renter?.full_name || other?.full_name || 'Renter')
    : (booking.lister?.full_name || other?.full_name || 'Lister')
  const partyPhone = role === 'lister'
    ? (booking.renter?.phone || other?.phone || '')
    : (booking.lister?.phone || other?.phone || '')
  const partyKyc = role === 'lister'
    ? (booking.renter?.kyc_status || other?.kyc_status || 'unverified')
    : (booking.lister?.kyc_status || other?.kyc_status || 'unverified')
  const partyId = role === 'lister' ? booking.renter_id : booking.lister_id

  const contact = {
    ...otherPartyContact({ ...booking, renter: other, lister: other }, role),
    ...(other || {}),
  }
  const thread = bookingThreadText(booking)
  const wa = (partyPhone || contact.phone) ? whatsappHref(partyPhone || contact.phone, thread) : ''
  const mail = contact.email ? mailtoHref(contact.email, `लोकल Den · ${listing?.title || 'Booking'}`, thread) : ''

  const askThenStatus = async (next) => {
    if (next === 'active' || next === 'completed') {
      const need = next === 'active' ? 'checkin' : 'checkout'
      try {
        const rows = await fetchInspections(booking.id)
        const hasMine = rows.some((row) => row.phase === need && row.submitted_by === user?.id)
        if (!hasMine) {
          setPendingStatus(next)
          setForcePhase(need)
          return
        }
      } catch {
        /* table missing — don't block status */
      }
    }
    onStatus(booking, next)
  }

  const { confirm } = useConfirm()

  const handleConfirmCash = async () => {
    const ok = await confirm({
      title: 'Confirm Cash Received',
      message: `Confirm that you received ₹${booking.total_amount} in cash from ${partyName}?`,
      confirmText: 'Yes, Cash Received',
      variant: 'success',
    })
    if (!ok) return
    try {
      const { error } = await supabase.rpc('confirm_booking_payment', {
        p_booking_id: booking.id,
        p_note: 'Cash verified by lister',
      })
      if (error) {
        if (/does not exist/i.test(error.message || '')) {
          await supabase.from('bookings').update({ payment_status: 'paid', updated_at: new Date().toISOString() }).eq('id', booking.id)
        } else {
          throw error
        }
      }
      booking.payment_status = 'paid'
      onStatus(booking, booking.status)
    } catch (err) {
      console.error('Confirm cash error:', err?.message)
    }
  }

  return (
    <div className={`dash-book${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="dash-book__top"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${listing?.title || 'Booking'} ${STATUS_LABEL[status] || status}`}
      >
        <div className="dash-book__emoji">{listing?.emoji || '🎮'}</div>
        <div className="dash-book__body">
          <strong>{listing?.title || 'Listing'}</strong>
          <span>{when} · {booking.total_days}d · {role === 'lister' ? `Renter: ${partyName}` : `Host: ${partyName}`}</span>
        </div>
        <div className="dash-book__money">
          <b>{rupee(booking.total_amount)}</b>
          <div className="flex items-center gap-1.5">
            <span className={`dash-status is-${status}`}>{STATUS_LABEL[status] || status}</span>
          </div>
        </div>
      </button>

      {open ? (
        <div className="dash-book__more">
          {/* User Identity & Delivery Information Card */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 my-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">
                  {role === 'lister' ? '👤 Renter:' : '🏠 Host:'}{' '}
                  {partyId ? (
                    <Link to={`/lister/${partyId}`} className="text-cyan-300 hover:underline">
                      {partyName}
                    </Link>
                  ) : partyName}
                </span>
                {partyKyc === 'verified' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    ✓ Verified
                  </span>
                )}
              </div>
              {partyPhone && (
                <a href={`tel:${partyPhone}`} className="text-cyan-400 hover:underline text-xs flex items-center gap-1 font-semibold">
                  📞 {partyPhone}
                </a>
              )}
            </div>
            {booking.delivery_type === 'delivery' && booking.delivery_address && (
              <DeliveryAddressDisplay address={booking.delivery_address} className="mt-2" />
            )}
          </div>

          {/* Real Booking Progress Stepper with Clear Next Action */}
          <BookingStepper
            booking={booking}
            role={role}
            partyPhone={partyPhone || contact.phone}
            partyName={partyName}
            onAction={(next) => askThenStatus(next)}
            onOpenInspection={(phase) => setForcePhase(phase)}
            onOpenRefund={() => setRefundModalOpen(true)}
            onOpenSignature={() => setSignatureOpen(true)}
            onExtendRental={onExtendRental}
          />

          {/* Transparent Payment Breakup for Lister & Renter */}
          <BookingPaymentBreakup booking={booking} role={role} defaultExpanded={false} className="my-3" />

          <div className="dash-book__facts">
            <div>
              <span>Payment</span>
              <b className="flex items-center gap-1.5 flex-wrap">
                <span>{getPaymentMethodLabel(booking.payment_method)}</span>
                {(() => {
                  const payStatus = getPaymentStatusInfo(booking.payment_status, booking.payment_method)
                  return (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${payStatus.badgeClass}`}>
                      {payStatus.label}
                    </span>
                  )
                })()}
              </b>
              {booking.payment_ref && (
                <span className="text-[10px] text-white/50 font-mono block mt-0.5">
                  Ref: {booking.payment_ref}
                </span>
              )}
            </div>
            <div>
              <span>Deposit</span>
              <div className="flex flex-col">
                <b>{rupee(booking.deposit)}</b>
                {booking.deposit_status === 'refunded' ? (
                  <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                    ✓ Refunded ({rupee(booking.deposit_refunded_amount || booking.deposit)})
                  </span>
                ) : booking.deposit_status === 'partially_refunded' ? (
                  <span className="text-[10px] text-amber-400 font-semibold block mt-0.5" title={booking.deposit_deduction_reason || ''}>
                    ⚠️ Settled ({rupee(booking.deposit_refunded_amount)} back · {rupee(booking.deposit_deduction_amount)} held)
                  </span>
                ) : booking.deposit_status === 'forfeited' ? (
                  <span className="text-[10px] text-red-400 font-semibold block mt-0.5" title={booking.deposit_deduction_reason || ''}>
                    ✕ Forfeited ({rupee(booking.deposit_deduction_amount)})
                  </span>
                ) : Number(booking.deposit || 0) > 0 && status === 'completed' ? (
                  <span className="text-[10px] text-cyan-400 font-semibold block mt-0.5">
                    ⏳ Settlement pending
                  </span>
                ) : (
                  <span className="text-[10px] text-white/40 block mt-0.5">Held in escrow</span>
                )}
              </div>
            </div>
            <div>
              <span>Rental Pact</span>
              <div className="flex flex-col">
                <b>
                  {Boolean(booking.renter_signature && booking.lister_signature) ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      ✓ Signed by both
                    </span>
                  ) : booking.renter_signature ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                      ✍️ Borrower signed
                    </span>
                  ) : booking.lister_signature ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                      ✍️ Host signed
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/50 border border-white/20">
                      ✍️ Unsigned pact
                    </span>
                  )}
                </b>
              </div>
            </div>
            <div>
              <span>Handover</span>
              <b>{booking.delivery_type || 'pickup'}</b>
            </div>
          </div>
          {['confirmed', 'active', 'completed'].includes(status) ? (
            <InspectionPanel
              booking={booking}
              role={role}
              forcePhase={forcePhase}
              onForceHandled={() => setForcePhase('')}
              onAfterSave={(phase) => {
                if (pendingStatus === 'active' && phase === 'checkin') onStatus(booking, 'active')
                if (pendingStatus === 'completed' && phase === 'checkout') onStatus(booking, 'completed')
                setPendingStatus('')
                setForcePhase('')
              }}
            />
          ) : null}

          <div className="dash-book__acts">
            <button
              type="button"
              className="is-ok font-bold"
              onClick={() => setTrackingOpen(true)}
            >
              🚚 Live Tracking
            </button>
            {listingId ? (
              <Link to={`/listing/${listingId}`} className="is-cyan">Open listing</Link>
            ) : null}

            {/* Contextual WhatsApp Alerts with PINs */}
            {status === 'confirmed' && (partyPhone || contact.phone) ? (
              <a
                href={bookingWhatsAppLink('pickup_reminder', booking, partyPhone || contact.phone, {
                  handoverPin: getHandoverPin(booking.id),
                })}
                target="_blank"
                rel="noreferrer"
                className="is-ok text-xs font-semibold"
                title="Send pickup reminder with Handover PIN via WhatsApp"
              >
                📲 Pickup + PIN Reminder
              </a>
            ) : null}
            {status === 'active' && (partyPhone || contact.phone) ? (
              <a
                href={bookingWhatsAppLink('return_reminder', booking, partyPhone || contact.phone, {
                  returnPin: getReturnPin(booking.id),
                })}
                target="_blank"
                rel="noreferrer"
                className="is-ok text-xs font-semibold"
                title="Send return reminder with Return PIN via WhatsApp"
              >
                📲 Return + PIN Reminder
              </a>
            ) : null}

            {wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="is-ok" aria-label={`WhatsApp ${partyName}`}>
                WhatsApp {partyName.split(' ')[0]}
              </a>
            ) : null}
            {mail ? (
              <a href={mail} className="is-cyan" aria-label={`Email ${partyName}`}>Email</a>
            ) : null}

            {/* Host Deposit Refund Button */}
            {listerActs && status === 'completed' && Number(booking.deposit || 0) > 0 && !['refunded', 'partially_refunded', 'forfeited'].includes(booking.deposit_status) ? (
              <button
                type="button"
                className="is-ok font-bold"
                onClick={() => setRefundModalOpen(true)}
              >
                💰 Process Deposit Refund
              </button>
            ) : null}

            {/* Lister Cash Payment Confirmation */}
            {listerActs && booking.payment_method === 'cash' && booking.payment_status !== 'paid' && status !== 'cancelled' ? (
              <button
                type="button"
                className="is-ok font-bold"
                onClick={handleConfirmCash}
                aria-label="Confirm cash payment received"
              >
                💵 Confirm Cash Received
              </button>
            ) : null}

            {/* Lister Status Override Selector */}
            {listerActs && status !== 'completed' && status !== 'cancelled' ? (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] text-white/40 uppercase font-semibold">Set Status:</span>
                <select
                  className="select-dark text-xs py-1 px-2 h-8"
                  value={status}
                  onChange={(e) => onStatus(booking, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="active">Active / Handed Over</option>
                  <option value="completed">Completed / Returned</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            ) : null}

            {/* Leave Review — renter only on completed */}
            {renterActs && status === 'completed' ? (
              <Link to={`/review/${booking.id}`} className="is-ok" aria-label="Leave a review">⭐ Review</Link>
            ) : null}
            {/* Raise Dispute — both parties on active or completed */}
            {['active', 'completed'].includes(status) ? (
              <Link to={`/dispute/${booking.id}`} className="is-danger" aria-label="Raise dispute">⚖️ Dispute</Link>
            ) : null}
            {/* View / Download Agreement PDF — available for all non-cancelled bookings */}
            {status !== 'cancelled' ? (
              <button
                type="button"
                className="is-cyan font-bold"
                onClick={async () => {
                  try {
                    const { generateAgreementPDF, uploadSignedAgreementPDF } = await import('../lib/rentalAgreement')
                    const myName = profile?.full_name || user?.email?.split('@')[0] || ''
                    const renterName = role === 'renter' ? (booking.renter?.full_name || myName || 'Borrower') : partyName
                    const listerName = role === 'lister' ? (booking.lister?.full_name || myName || 'Host') : partyName
                    await generateAgreementPDF(booking, booking.listings, renterName, listerName, {
                      renterPhone: role === 'renter' ? (booking.renter?.phone || profile?.phone) : (partyPhone || contact.phone),
                      listerPhone: role === 'lister' ? (booking.lister?.phone || profile?.phone) : (partyPhone || contact.phone),
                      download: true,
                    })
                    if (booking.renter_signature && booking.lister_signature) {
                      const url = await uploadSignedAgreementPDF(booking, booking.listings, renterName, listerName)
                      if (url) booking.agreement_url = url
                    }
                  } catch (err) {
                    console.error('Agreement generation error:', err)
                    showToast('Failed to generate agreement PDF', 'error')
                  }
                }}
                aria-label="Download or view rental agreement PDF"
              >
                📄 {Boolean(booking.renter_signature && booking.lister_signature) ? 'Signed Pact PDF' : 'Rental Pact PDF'}
              </button>
            ) : null}
          </div>
          <BookingThread booking={booking} />
        </div>
      ) : null}
      {trackingOpen && (
        <LiveTrackingModal booking={booking} onClose={() => setTrackingOpen(false)} />
      )}
      {refundModalOpen && (
        <DepositRefundModal
          booking={booking}
          onClose={() => setRefundModalOpen(false)}
          onRefundSuccess={(res) => {
            Object.assign(booking, res)
            onStatus(booking, booking.status)
          }}
        />
      )}
      {signatureOpen && (
        <SignatureModal
          booking={booking}
          signerName={user?.user_metadata?.full_name || user?.email}
          signerRole={role}
          onClose={() => setSignatureOpen(false)}
          onSaveSignature={handleSaveDirectSignature}
        />
      )}
    </div>
  )
}

function EmptyBlock({ emoji, title, body, to, cta, large }) {
  return (
    <div className={`dash-empty${large ? ' is-lg' : ''}`}>
      <div className="dash-empty__emoji" aria-hidden="true">{emoji}</div>
      <h3 className="font-bungee text-white text-xl">{title}</h3>
      <p>{body}</p>
      {to && cta ? <Link to={to} className="btn-primary">{cta}</Link> : null}
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, signOut, updateProfile, uploadAvatar, isAdmin } = useAuth()
  const walletState = useWallet()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'overview'
  const [bookFilter, setBookFilter] = useState('all')
  const [incomingFilter, setIncomingFilter] = useState('all')
  const [listFilter, setListFilter] = useState('all')
  const [openBook, setOpenBook] = useState(null)

  const [myListings, setMyListings] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [incoming, setIncoming] = useState([])
  const [loadingL, setLoadingL] = useState(true)
  const [loadingB, setLoadingB] = useState(true)
  const [loadingIn, setLoadingIn] = useState(true)
  const [editName, setEditName] = useState(false)
  const [nameVal, setNameVal] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setNameVal(profile?.full_name || '')
  }, [profile?.full_name])

  const setTab = (next) => {
    const nextParams = new URLSearchParams(params)
    if (next === 'overview') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  const loadListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMyListings(data || [])
    setLoadingL(false)
  }

  const loadBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('renter_id', user.id)
      .order('created_at', { ascending: false })
    setMyBookings(data || [])
    setLoadingB(false)
  }

  const loadIncoming = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('lister_id', user.id)
      .order('created_at', { ascending: false })
    setIncoming(data || [])
    setLoadingIn(false)
  }

  useEffect(() => {
    if (!user) return undefined
    loadListings()
    loadBookings()
    loadIncoming()

    const channel = supabase
      .channel(`dash-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `renter_id=eq.${user.id}` }, loadBookings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `lister_id=eq.${user.id}` }, loadIncoming)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings', filter: `user_id=eq.${user.id}` }, loadListings)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const liveListings = myListings.filter((row) => row.is_available && row.is_published !== false).length
  const pendingIn = incoming.filter((row) => row.status === 'pending').length
  const completedBookings = myBookings.filter((row) => row.status === 'completed').length
  const earned = incoming.filter((row) => PAID_STATUSES.includes(row.status)).reduce((sum, row) => sum + bookingEarn(row), 0)

  const nextUp = useMemo(() => {
    if (pendingIn > 0) {
      return {
        title: `${pendingIn} incoming request${pendingIn === 1 ? '' : 's'} awaiting your response`,
        sub: 'Confirm or decline quickly so your renter can plan their session.',
        cta: 'Review Requests',
        go: () => { setTab('incoming'); setIncomingFilter('pending') },
      }
    }
    const pipeline = [...myBookings, ...incoming]
      .filter((row) => ['confirmed', 'active'].includes(row.status))
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))[0]
    if (pipeline) {
      const days = daysUntil(pipeline.start_date)
      const title = pipeline.listings?.title || 'Upcoming Rental'
      let sub = `${pipeline.start_date} → ${pipeline.end_date}`
      if (days === 0) sub = 'Handover is today! Remember to take quick check-in photos.'
      else if (days === 1) sub = 'Starts tomorrow — coordinate handover time on WhatsApp.'
      else if (days > 1) sub = `Starts in ${days} days — everything is locked in.`
      return {
        title,
        sub,
        cta: 'Open Booking',
        go: () => {
          setTab(pipeline.renter_id === user?.id ? 'bookings' : 'incoming')
          setOpenBook(pipeline.id)
        },
      }
    }
    if (myListings.length === 0) {
      return {
        title: 'Turn your idle gear into weekend income',
        sub: 'List a console, controller, guitar, or DJ rig in under 2 minutes.',
        cta: '+ List Your Gear',
        href: '/list-item',
      }
    }
    if (myBookings.length === 0) {
      return {
        title: 'Ready for your next gaming or jam session?',
        sub: 'Explore verified gear available across Bengaluru & Gurugram.',
        cta: 'Explore Gear',
        href: '/browse',
      }
    }
    return {
      title: 'All caught up!',
      sub: 'No pending actions right now. Browse new drops or list another item.',
      cta: 'Browse Catalog',
      href: '/browse',
    }
  }, [pendingIn, myBookings, incoming, myListings.length, user?.id])

  const checks = [
    {
      done: profile?.kyc_status === 'verified' || profile?.kyc_status !== 'required',
      title: profile?.kyc_status === 'verified'
        ? 'Identity Verified (KYC)'
        : profile?.kyc_status === 'required'
          ? 'KYC Verification Requested'
          : 'Account Ready to Rent & List',
      sub: profile?.kyc_status === 'verified'
        ? 'Your Verified badge is live across all listings and bookings.'
        : profile?.kyc_status === 'submitted'
          ? 'Our trust team is reviewing your documents.'
          : profile?.kyc_status === 'required'
            ? 'Complete quick ID verification to unlock high-value rentals.'
            : 'No extra documents needed right now — rent and list freely!',
      go: () => navigate('/kyc'),
    },
    {
      done: myListings.length > 0,
      title: 'List Your First Gear',
      sub: myListings.length ? `${myListings.length} item${myListings.length === 1 ? '' : 's'} on your gear shelf` : 'Put your idle console or instrument to work',
      go: () => (myListings.length ? setTab('listings') : navigate('/list-item')),
    },
    {
      done: myBookings.length + incoming.length > 0,
      title: 'First Rental Activity',
      sub: myBookings.length + incoming.length ? 'Active member of the Local Den community' : 'Book gear for the weekend or receive your first request',
      go: () => setTab(incoming.length ? 'incoming' : 'bookings'),
    },
  ]

  const activity = useMemo(() => {
    const listingRows = myListings.slice(0, 4).map((row) => ({
      id: `l-${row.id}`,
      title: row.title,
      sub: `Listed · ${row.location ? formatLocationDisplay(row.location) : 'Local'}`,
      tone: 'magenta',
      at: row.created_at,
      go: () => setTab('listings'),
    }))
    const rentRows = myBookings.slice(0, 4).map((row) => ({
      id: `b-${row.id}`,
      title: row.listings?.title || 'Booking',
      sub: `You booked · ${STATUS_LABEL[row.status] || row.status}`,
      tone: 'cyan',
      at: row.created_at,
      go: () => { setTab('bookings'); setOpenBook(row.id) },
    }))
    const inRows = incoming.slice(0, 4).map((row) => ({
      id: `i-${row.id}`,
      title: row.listings?.title || 'Incoming',
      sub: `Renter request · ${STATUS_LABEL[row.status] || row.status}`,
      tone: 'gold',
      at: row.created_at,
      go: () => { setTab('incoming'); setOpenBook(row.id) },
    }))
    return [...listingRows, ...rentRows, ...inRows]
      .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
      .slice(0, 6)
  }, [myListings, myBookings, incoming])

  const shownListings = filterListings(myListings, listFilter)
  const shownBooks = filterBookings(myBookings, bookFilter)
  const shownIncoming = filterBookings(incoming, incomingFilter)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('listings').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setMyListings((prev) => prev.filter((row) => row.id !== deleteTarget.id))
    setDeleteTarget(null)
    showToast(MESSAGES.listing.deleted, 'success')
  }

  const bumpStock = async (listing, delta) => {
    const nextQty = Math.max(0, (listing.stock_qty ?? 1) + delta)
    const nextTotal = Math.max(nextQty, listing.stock_total ?? nextQty)
    const { error } = await supabase
      .from('listings')
      .update({ stock_qty: nextQty, stock_total: nextTotal, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setMyListings((prev) => prev.map((row) => (
      row.id === listing.id ? { ...row, stock_qty: nextQty, stock_total: nextTotal } : row
    )))
    showToast(MESSAGES.listing.stockUpdated(nextQty, nextTotal), 'success')
  }

  const toggleListing = async (listing, field) => {
    const next = !listing[field]
    const { error } = await supabase
      .from('listings')
      .update({ [field]: next, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setMyListings((prev) => prev.map((row) => (
      row.id === listing.id ? { ...row, [field]: next } : row
    )))
    const msg = field === 'is_published'
      ? (next ? MESSAGES.listing.availabilityOn : MESSAGES.listing.availabilityOff)
      : (next ? MESSAGES.listing.availabilityOn : MESSAGES.listing.availabilityOff)
    showToast(msg, 'success')
  }

  const setBookingStatus = async (booking, status) => {
    if (status === 'cancelled') {
      const ok = await confirm({
        title: 'Cancel This Booking?',
        message: 'Are you sure you want to cancel this booking? Reserved dates will reopen on the calendar and unit stock will be restored.',
        confirmText: 'Yes, Cancel Booking',
        variant: 'danger',
      })
      if (!ok) return
    }
    // 1. Try secure RPC first (bypasses RLS mismatch, handles role permissions)
    let updatedOk = false
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_booking_status', {
        p_booking_id: booking.id,
        p_status: status,
      })
      if (!rpcErr) {
        if (rpcRes?.success) {
          updatedOk = true
        } else if (rpcRes?.error) {
          showToast(rpcRes.error, 'error')
          return
        }
      }
    } catch {
      /* proceed to direct table update fallback */
    }

    // 2. Direct table update fallback if RPC not present
    if (!updatedOk) {
      const { data: updated, error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', booking.id)
        .select('id')
      if (error) {
        showToast(error.message, 'error')
        return
      }
      if (!updated?.length) {
        showToast('Could not update booking status. Run migration SQL in Supabase.', 'error')
        return
      }
    }

    // Auto-return stock if booking is cancelled, declined, completed, or returned
    const listingId = booking.listing_id || booking.listings?.id
    if (['cancelled', 'declined', 'completed', 'returned'].includes(status) && listingId) {
      await adjustListingStock(listingId, 1)
      loadListings?.()
    }

    // Synchronize live tracking state
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

    const apply = (prev) => prev.map((row) => (row.id === booking.id ? { ...row, status } : row))
    setMyBookings(apply)
    setIncoming(apply)
    showToast(MESSAGES.booking.statusUpdated(status), 'success')
  }

  const handleExtendRental = async (booking) => {
    const extraDayRate = Number(booking.price_per_day || booking.listings?.price_day || 399)
    const nextEndDate = shiftIso(booking.end_date, 1)
    const nextDays = Number(booking.total_days || 1) + 1
    const nextSubtotal = Number(booking.subtotal || 0) + extraDayRate
    const nextTotal = Number(booking.total_amount || 0) + extraDayRate

    const ok = await confirm({
      title: 'Extend Rental by +1 Day?',
      message: `Extend "${booking.listings?.title || 'your gear'}" until ${nextEndDate} for +₹${extraDayRate.toLocaleString('en-IN')}?`,
      confirmText: `Extend (+₹${extraDayRate})`,
      variant: 'info',
    })
    if (!ok) return

    const { error } = await supabase
      .from('bookings')
      .update({
        end_date: nextEndDate,
        total_days: nextDays,
        subtotal: nextSubtotal,
        total_amount: nextTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    if (error) {
      showToast(error.message || 'Could not extend rental dates.', 'error')
      return
    }

    const patch = {
      end_date: nextEndDate,
      total_days: nextDays,
      subtotal: nextSubtotal,
      total_amount: nextTotal,
    }
    setMyBookings((prev) => prev.map((row) => (row.id === booking.id ? { ...row, ...patch } : row)))
    setIncoming((prev) => prev.map((row) => (row.id === booking.id ? { ...row, ...patch } : row)))
    showToast(`🎉 Rental extended to ${nextEndDate}! (+1 day added)`, 'success')
  }

  const allListingsPaused = myListings.length > 0 && myListings.every((l) => !l.is_available)

  const toggleVacationMode = async () => {
    if (!myListings.length) return
    const nextAvailable = allListingsPaused
    const inStockCount = myListings.filter((l) => l.stock_qty == null || l.stock_qty > 0).length
    const ok = await confirm({
      title: nextAvailable ? 'Resume In-Stock Listings?' : 'Pause All Listings (Vacation Mode)?',
      message: nextAvailable
        ? `Make your ${inStockCount} in-stock listing${inStockCount === 1 ? '' : 's'} bookable again right away? (Out-of-stock items will remain paused).`
        : `Temporarily pause new bookings across all ${myListings.length} of your listings while you're away? Existing bookings stay unaffected.`,
      confirmText: nextAvailable ? '⚡ Resume In-Stock Listings' : '🏖️ Enable Vacation Mode',
      variant: nextAvailable ? 'success' : 'warning',
    })
    if (!ok) return

    let dbQuery = supabase
      .from('listings')
      .update({ is_available: nextAvailable, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (nextAvailable) {
      dbQuery = dbQuery.or('stock_qty.is.null,stock_qty.gt.0')
    }

    const { error } = await dbQuery

    if (error) {
      showToast(error.message || 'Could not update listings.', 'error')
      return
    }
    setMyListings((prev) =>
      prev.map((row) => {
        if (!nextAvailable) return { ...row, is_available: false }
        if (row.stock_qty == null || row.stock_qty > 0) return { ...row, is_available: true }
        return row
      })
    )
    showToast(
      nextAvailable
        ? '⚡ Your in-stock listings are back live and open for bookings!'
        : '🏖️ Vacation Mode active — all your listings are paused until you resume.',
      'success'
    )
  }

  const handleHostQuickApprove = async (booking, openWhatsApp = false) => {
    await setBookingStatus(booking, 'confirmed')
    if (openWhatsApp) {
      const renterPhone = booking.renter?.phone
      if (renterPhone) {
        const pin = getHandoverPin(booking.id)
        const fin = parseBookingFinancials(booking)
        const { formatCustomerConfirmationMessage } = await import('../lib/whatsappSmsService')
        const text = formatCustomerConfirmationMessage({
          bookingId: booking.id,
          listing: booking.listings,
          renterName: booking.renter?.full_name,
          startDate: booking.start_date,
          endDate: booking.end_date,
          days: booking.total_days,
          subtotal: fin.subtotal,
          deliveryFee: fin.deliveryFee,
          deliveryDistanceKm: fin.deliveryDistanceKm,
          warehouseNote: fin.warehouseNote,
          deposit: fin.deposit,
          protectionAmount: fin.insuranceAmount,
          discountAmount: fin.discountAmount,
          walletAmount: fin.walletAmount,
          paidAmount: fin.paidAmount,
          total: fin.totalAmount,
          deliveryType: booking.delivery_type,
          deliveryAddress: booking.delivery_address,
          handoverPin: pin,
        })
        window.open(whatsappHref(renterPhone, text), '_blank', 'noopener,noreferrer')
      }
    }
  }

  const pendingIncomingRows = useMemo(
    () => incoming.filter((row) => row.status === 'pending'),
    [incoming]
  )

  const activeRenterBooking = useMemo(
    () => myBookings.find((row) => ['active', 'confirmed'].includes(row.status)),
    [myBookings]
  )

  const saveName = async () => {
    const next = nameVal.trim()
    if (!next) {
      showToast('Please enter a display name before saving.', 'error')
      return
    }
    setSaving(true)
    try {
      await updateProfile({ full_name: next })
      showToast(MESSAGES.profile.nameSaved, 'success')
      setEditName(false)
    } catch (err) {
      showToast(err.message || 'Could not update your display name.', 'error')
    }
    setSaving(false)
  }

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadAvatar(file)
      showToast(MESSAGES.profile.avatarUpdated, 'success')
    } catch (err) {
      showToast(err.message || 'Could not upload photo. Please try an image under 5 MB.', 'error')
    }
  }

  const jumpStat = (nextTab, filter) => {
    setTab(nextTab)
    if (filter) setBookFilter(filter)
    if (nextTab === 'listings' && filter) setListFilter(filter)
  }

  return (
    <div className="dash">
      <div className="grid-floor" />
      <GameBackground />

      <div className="dash-wrap">
        <header className="dash-hello">
          <h1>{greeting()}, {firstName(profile, user)}</h1>
          <p>Manage your gear rentals, incoming requests, listing inventory, and wallet payouts in one command hub.</p>
        </header>

        <section className="dash-profile">
          <label className="dash-avatar">
            <div className="dash-avatar__face">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" />
                : (profile?.full_name?.[0]?.toUpperCase() || <User size={28} />)}
            </div>
            <span className="dash-avatar__cam" aria-hidden="true"><Camera size={12} /></span>
            <input type="file" accept="image/*" onChange={handleAvatar} aria-label="Upload profile photo" />
          </label>

          <div className="dash-profile__body">
            {editName ? (
              <div className="dash-name-edit">
                <input
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  className="input-dark"
                  aria-label="Your display name"
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                />
                <button type="button" onClick={saveName} disabled={saving} className="btn-primary" aria-label="Save name">
                  {saving ? '...' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditName(false)} className="btn-outline" aria-label="Cancel name edit">Cancel</button>
              </div>
            ) : (
              <div className="dash-name-row">
                <h2>{profile?.full_name || user?.email?.split('@')[0] || 'My Account'}</h2>
                <button type="button" className="dash-icon-btn" onClick={() => setEditName(true)} aria-label="Edit display name">
                  <Edit3 size={14} />
                </button>
              </div>
            )}
            <div className="dash-meta">
              <span>{user?.email}</span>
              {profile?.kyc_status === 'verified' ? (
                <span className="dash-pill is-ok"><Shield size={11} /> Verified</span>
              ) : (
                <Link to="/kyc" className="dash-pill is-warn">
                  {profile?.kyc_status === 'submitted' ? 'KYC in review' : 'Complete KYC'}
                </Link>
              )}
              {profile?.rating > 0 ? (
                <span className="dash-pill is-gold"><Star size={11} /> {profile.rating}</span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="btn-outline"
            onClick={() => { signOut(); navigate('/') }}
            aria-label="Sign out"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </section>

        <div className="dash-stats">
          <StatCard
            icon={<Package size={18} />}
            label="My Listings"
            value={myListings.length}
            tone="magenta"
            sub={`${liveListings} live`}
            active={tab === 'listings'}
            onClick={() => jumpStat('listings')}
          />
          <StatCard
            icon={<Calendar size={18} />}
            label="Bookings Made"
            value={myBookings.length}
            tone="cyan"
            sub={`${completedBookings} completed`}
            active={tab === 'bookings'}
            onClick={() => jumpStat('bookings')}
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Earnings"
            value={earned}
            prefix="₹"
            tone="gold"
            sub={`wallet ${walletState.wallet.available ? `₹${walletState.wallet.available}` : 'ready'}`}
            active={tab === 'wallet'}
            onClick={() => jumpStat('wallet')}
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Incoming"
            value={incoming.length}
            tone="green"
            sub={pendingIn ? `${pendingIn} need action` : 'none waiting'}
            active={tab === 'incoming'}
            onClick={() => jumpStat('incoming', pendingIn ? 'pending' : 'all')}
          />
        </div>

        <div className="dash-tabs" role="tablist" aria-label="Dashboard sections">
          {[
            { id: 'overview', label: 'Overview', icon: <User size={14} />, count: 0 },
            { id: 'listings', label: 'My Listings', icon: <Package size={14} />, count: myListings.length },
            { id: 'bookings', label: 'My Bookings', icon: <Calendar size={14} />, count: myBookings.length },
            { id: 'incoming', label: 'Incoming', icon: <Clock size={14} />, count: incoming.length, pulse: pendingIn > 0 },
            { id: 'wallet', label: 'Wallet', icon: <Wallet size={14} />, count: 0 },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-label={item.label}
              className={`dash-tab${tab === item.id ? ' is-on' : ''}${item.pulse ? ' has-pulse' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.icon} {item.label}
              {item.count > 0 ? <span className="dash-tab__count">{item.count}</span> : null}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div>
            {/* 1. Host Fast-Action Request Inbox (if pending requests exist) */}
            {pendingIncomingRows.length > 0 && (
              <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent border border-emerald-500/35">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div>
                    <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      ⚡ Host Action Inbox · {pendingIncomingRows.length} Request{pendingIncomingRows.length === 1 ? '' : 's'} Waiting
                    </span>
                    <p className="text-xs text-white/65">
                      Approve in 1 tap to lock in your earnings and send the renter their 4-digit Handover OTP.
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {pendingIncomingRows.map((req) => {
                    const renterName = req.renter?.full_name || 'Verified Renter'
                    const netEarn = bookingEarn(req)
                    return (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl bg-black/45 border border-white/15 flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <span className="text-2xl">{req.listings?.emoji || '🎮'}</span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-sm text-white font-display">{req.listings?.title || 'Gear Rental'}</strong>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                                  You Earn {rupee(netEarn)}
                                </span>
                              </div>
                              <p className="text-xs text-white/65 mt-0.5">
                                👤 <strong>{renterName}</strong>
                                {req.renter?.kyc_status === 'verified' ? ' (✓ KYC Verified)' : ''} · 📅 {req.start_date} → {req.end_date} ({req.total_days}d) · {req.delivery_type === 'delivery' ? '🚚 Delivery' : '🏠 Pickup'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-auto flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleHostQuickApprove(req, true)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
                            >
                              ✓ Confirm &amp; WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHostQuickApprove(req, false)}
                              className="px-3 py-2 rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-400/35 font-bold text-xs hover:bg-cyan-500/30 transition-all"
                            >
                              Confirm Only
                            </button>
                            <button
                              type="button"
                              onClick={() => setBookingStatus(req, 'cancelled')}
                              className="px-3 py-2 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 font-semibold text-xs hover:bg-red-500/25 transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        </div>

                        {/* Expandable itemized payment breakup */}
                        <BookingPaymentBreakup booking={req} role="lister" defaultExpanded={false} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 2. Renter Live Active / Confirmed Session Card with Handover PIN & 1-Tap Extend */}
            {activeRenterBooking && (
              <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-purple-500/10 to-transparent border border-cyan-500/35 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-[10px] font-extrabold uppercase tracking-wider">
                      {activeRenterBooking.status === 'active' ? '🟢 Live Session in Progress' : '📅 Confirmed Upcoming Session'}
                    </span>
                    <span className="text-xs text-white/60">
                      {activeRenterBooking.start_date} → {activeRenterBooking.end_date} ({activeRenterBooking.total_days}d)
                    </span>
                  </div>
                  <h3 className="text-base font-display font-bold text-white">
                    {activeRenterBooking.listings?.emoji || '🎮'} {activeRenterBooking.listings?.title || 'Your Rental'}
                  </h3>
                  <p className="text-xs text-white/65">
                    {activeRenterBooking.status === 'confirmed'
                      ? 'Share your 4-digit Handover OTP with the host/rider when receiving your gear.'
                      : 'Enjoying the gear? Extend by +1 day in 1 tap or use your Return OTP when handing back.'}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap ml-auto">
                  <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-400/40 text-center">
                    <span className="text-[9px] uppercase tracking-wider text-cyan-300/80 block font-bold">
                      {activeRenterBooking.status === 'confirmed' ? 'Handover OTP' : 'Return OTP'}
                    </span>
                    <strong className="font-mono text-sm tracking-[0.22em] text-cyan-300">
                      {activeRenterBooking.status === 'confirmed'
                        ? getHandoverPin(activeRenterBooking.id)
                        : getReturnPin(activeRenterBooking.id)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExtendRental(activeRenterBooking)}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all shadow-md shadow-amber-400/20"
                  >
                    ⚡ +1 Day Extend
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('bookings')
                      setOpenBook(activeRenterBooking.id)
                    }}
                    className="px-3 py-2 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/15 transition-all"
                  >
                    Open Pass →
                  </button>
                </div>
              </div>
            )}

            <div className="dash-next">
              <div>
                <strong>NEXT UP</strong>
                <p>{nextUp.title}</p>
                <span>{nextUp.sub}</span>
              </div>
              {nextUp.href ? (
                <Link to={nextUp.href} className="btn-primary">{nextUp.cta}</Link>
              ) : (
                <button type="button" className="btn-primary" onClick={nextUp.go} aria-label={nextUp.cta}>
                  {nextUp.cta}
                </button>
              )}
            </div>

            <div className="dash-grid">
              <div className="dash-card">
                <div className="dash-card__head"><h3>QUICK ACTIONS</h3></div>
                {[
                  { to: '/list-item', icon: <Plus size={16} />, label: 'List a new item', desc: 'Earn from idle gear', tone: 'magenta' },
                  { to: '/browse', icon: <Eye size={16} />, label: 'Browse listings', desc: 'Find gear this weekend', tone: 'cyan' },
                  { to: '/terms#damage', icon: <Shield size={16} />, label: 'Damage policy', desc: 'Read before you rent', tone: 'gold' },
                  isAdmin && { to: '/admin', icon: <Shield size={16} />, label: 'Admin panel', desc: 'Users, stock, payouts', tone: 'green' },
                ].filter(Boolean).map((item) => (
                  <Link key={item.to} to={item.to} className="dash-action">
                    <div className={`dash-action__icon is-${item.tone}`}>{item.icon}</div>
                    <div className="flex-1">
                      <strong>{item.label}</strong>
                      <span>{item.desc}</span>
                    </div>
                    <ChevronRight size={14} />
                  </Link>
                ))}
              </div>

              <div className="dash-card">
                <div className="dash-card__head"><h3>SETUP</h3></div>
                {checks.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className={`dash-check${item.done ? ' is-done' : ''}`}
                    onClick={item.go}
                    aria-label={item.title}
                  >
                    <span className="dash-check__box">{item.done ? <Check size={12} /> : null}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <span>{item.sub}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="dash-card">
                <div className="dash-card__head">
                  <h3>YOUR LISTINGS</h3>
                  <button type="button" className="dash-ghost" onClick={() => setTab('listings')} aria-label="View all listings">View all</button>
                </div>
                {loadingL ? (
                  <><div className="dash-skel" /><div className="dash-skel" /></>
                ) : myListings.length === 0 ? (
                  <EmptyBlock emoji="📦" title="No listings yet" body="List your first item." to="/list-item" cta="+ List item" />
                ) : (
                  myListings.slice(0, 3).map((listing) => {
                    const tone = listingTone(listing)
                    return (
                      <button
                        key={listing.id}
                        type="button"
                        className="dash-mini"
                        onClick={() => navigate(`/listing/${listing.id}`)}
                        aria-label={`Open ${listing.title}`}
                      >
                        <span className="dash-mini__emoji" aria-hidden="true">{listing.emoji}</span>
                        <span className="flex-1 min-w-0">
                          <strong>{listing.title}</strong>
                          <span>{rupee(listing.price_day)}/day · {listing.location}</span>
                        </span>
                        <span className={`dash-status ${tone.cls === 'is-live' ? 'is-active' : 'is-pending'}`}>{tone.label}</span>
                      </button>
                    )
                  })
                )}
              </div>

              <div className="dash-card">
                <div className="dash-card__head is-cyan"><h3>ACTIVITY</h3></div>
                {activity.length === 0 ? (
                  <EmptyBlock emoji="⚡️" title="Quiet so far" body="List or book to fill this feed." />
                ) : (
                  <div className="dash-feed">
                    {activity.map((row) => (
                      <button key={row.id} type="button" className="dash-feed__row" onClick={row.go} aria-label={row.title}>
                        <span className={`dash-feed__dot is-${row.tone}`} />
                        <span>
                          <strong>{row.title}</strong>
                          <span>{row.sub}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="dash-card dash-span-2">
                <div className="dash-card__head is-cyan">
                  <h3>YOUR BOOKINGS</h3>
                  <button
                    type="button"
                    className="dash-ghost"
                    onClick={() => setTab('bookings')}
                    aria-label="View all bookings"
                  >
                    View all
                  </button>
                </div>
                {loadingB ? <><div className="dash-skel" /><div className="dash-skel" /></> : (
                  myBookings.length === 0
                    ? <EmptyBlock emoji="📅" title="No bookings yet" body="Find gear across Bengaluru & Gurugram." to="/browse" cta="Browse gear" />
                    : myBookings.slice(0, 3).map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        role="renter"
                        open={openBook === booking.id}
                        onToggle={() => setOpenBook(openBook === booking.id ? null : booking.id)}
                        onStatus={setBookingStatus}
                        onExtendRental={handleExtendRental}
                      />
                    ))
                )}
              </div>

              {incoming.length > 0 && (
                <div className="dash-card dash-span-2">
                  <div className="dash-card__head is-cyan">
                    <h3>INCOMING REQUESTS</h3>
                    <button
                      type="button"
                      className="dash-ghost"
                      onClick={() => setTab('incoming')}
                      aria-label="View all incoming"
                    >
                      View all
                    </button>
                  </div>
                  {loadingIn ? <><div className="dash-skel" /><div className="dash-skel" /></> : (
                    incoming.slice(0, 3).map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        role="lister"
                        open={openBook === booking.id}
                        onToggle={() => setOpenBook(openBook === booking.id ? null : booking.id)}
                        onStatus={setBookingStatus}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'listings' && (
          <div>
            <div className="dash-toolbar">
              <p>{shownListings.length} listing{shownListings.length === 1 ? '' : 's'}</p>
              <div className="dash-chips" role="group" aria-label="Filter listings">
                {LISTING_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`dash-chip${listFilter === chip ? ' is-on' : ''}`}
                    onClick={() => setListFilter(chip)}
                    aria-pressed={listFilter === chip}
                    aria-label={`Filter listings ${chip}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {myListings.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleVacationMode}
                    className={`px-3 py-2 rounded-xl text-xs font-display font-bold border transition-all ${
                      allListingsPaused
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
                    }`}
                  >
                    {allListingsPaused ? '⚡ Resume All Listings' : '🏖️ Vacation Mode (Pause All)'}
                  </button>
                )}
                <Link to="/list-item" className="btn-primary"><Plus size={14} /> New Listing</Link>
              </div>
            </div>

            {loadingL ? (
              <div className="dash-listings">
                {[1, 2, 3].map((n) => <div key={n} className="dash-skel is-card" />)}
              </div>
            ) : shownListings.length === 0 ? (
              <EmptyBlock large emoji="📦" title="No listings here" body="List gear or change the filter." to="/list-item" cta="+ List Your First Item" />
            ) : (
              <div className="dash-listings">
                {shownListings.map((listing) => {
                  const published = listing.is_published !== false
                  return (
                    <div key={listing.id} className="dash-own">
                      <ListingCard listing={listing} />
                      <div className="dash-own__bar">
                        <Link to={`/listing/${listing.id}`} className="is-view" aria-label={`View ${listing.title}`}>
                          <Eye size={12} /> View
                        </Link>
                        <button
                          type="button"
                          className={published ? 'is-live' : 'is-off'}
                          onClick={() => toggleListing(listing, 'is_published')}
                          aria-label={published ? `Hide ${listing.title}` : `Publish ${listing.title}`}
                        >
                          {published ? 'Hide' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => bumpStock(listing, -1)}
                          aria-label={`Decrease stock for ${listing.title}`}
                        >
                          <Minus size={12} /> {listing.stock_qty ?? 1}
                        </button>
                        <button
                          type="button"
                          onClick={() => bumpStock(listing, 1)}
                          aria-label={`Increase stock for ${listing.title}`}
                        >
                          <Plus size={12} />
                        </button>
                        <Link
                          to={`/list-item/edit/${listing.id}`}
                          className="is-view"
                          aria-label={`Edit ${listing.title}`}
                        >
                          <Edit3 size={12} /> Edit
                        </Link>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => setDeleteTarget(listing)}
                          aria-label={`Delete ${listing.title}`}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'bookings' && (
          <div>
            <div className="dash-toolbar">
              <p>{shownBooks.length} as renter</p>
              <div className="dash-chips" role="group" aria-label="Filter bookings">
                {STATUS_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`dash-chip${bookFilter === chip ? ' is-on' : ''}`}
                    onClick={() => setBookFilter(chip)}
                    aria-pressed={bookFilter === chip}
                    aria-label={`Filter bookings ${chip}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
            {loadingB ? (
              <><div className="dash-skel" /><div className="dash-skel" /><div className="dash-skel" /></>
            ) : shownBooks.length === 0 ? (
              <EmptyBlock large emoji="📅" title="No bookings here" body="Browse Bengaluru & Gurugram or change filter." to="/browse" cta="Browse Listings" />
            ) : (
              <div className="dash-books">
                {shownBooks.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    role="renter"
                    open={openBook === booking.id}
                    onToggle={() => setOpenBook(openBook === booking.id ? null : booking.id)}
                    onStatus={setBookingStatus}
                    onExtendRental={handleExtendRental}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'wallet' && (
          <DashboardWallet
            wallet={walletState.wallet}
            entries={walletState.entries}
            referrals={walletState.referrals}
            code={walletState.code}
            loading={walletState.loading}
            onRefresh={walletState.refresh}
          />
        )}

        {tab === 'incoming' && (
          <div>
            {pendingIncomingRows.length > 0 && (
              <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-emerald-300 block">
                  ⚡ Fast-Approve Pending Requests ({pendingIncomingRows.length})
                </span>
                {pendingIncomingRows.map((req) => (
                  <div
                    key={`fast-${req.id}`}
                    className="p-3 rounded-xl bg-black/45 border border-white/10 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <strong className="text-xs text-white font-display">
                          {req.listings?.emoji || '🎮'} {req.listings?.title} · <span className="text-emerald-300">You Earn {rupee(bookingEarn(req))}</span>
                        </strong>
                        <p className="text-[11px] text-white/60">
                          Renter: {req.renter?.full_name || 'Renter'} · {req.start_date} → {req.end_date} ({req.total_days}d) · {req.delivery_type === 'delivery' ? '🚚 Delivery' : '🏠 Pickup'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleHostQuickApprove(req, true)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all"
                        >
                          ✓ Confirm &amp; WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingStatus(req, 'cancelled')}
                          className="px-2.5 py-1.5 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 font-semibold text-xs hover:bg-red-500/25 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                    <BookingPaymentBreakup booking={req} role="lister" defaultExpanded={false} />
                  </div>
                ))}
              </div>
            )}

            <div className="dash-toolbar">
              <p>{shownIncoming.length} on your listings{pendingIn ? ` · ${pendingIn} waiting` : ''}</p>
              <div className="dash-chips" role="group" aria-label="Filter incoming bookings">
                {STATUS_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`dash-chip${incomingFilter === chip ? ' is-on' : ''}`}
                    onClick={() => setIncomingFilter(chip)}
                    aria-pressed={incomingFilter === chip}
                    aria-label={`Filter incoming ${chip}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
            {loadingIn ? (
              <><div className="dash-skel" /><div className="dash-skel" /></>
            ) : shownIncoming.length === 0 ? (
              <EmptyBlock large emoji="📥" title="No incoming bookings" body="Renters who book your gear show up here." />
            ) : (
              <div className="dash-books">
                {shownIncoming.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    role="lister"
                    open={openBook === booking.id}
                    onToggle={() => setOpenBook(openBook === booking.id ? null : booking.id)}
                    onStatus={setBookingStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteModal
        listing={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
