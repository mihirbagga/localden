import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ShieldCheck, CheckCircle2, AlertTriangle, Truck, KeyRound,
  ArrowRight, User, MessageCircle, RotateCcw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { getBookingTracking, verifyDualOtp } from '../lib/trackingService'
import { getHandoverPin, getReturnPin } from '../lib/messages'
import { buildWhatsAppLink, formatHandoverActiveMessage } from '../lib/whatsappSmsService'
import GameBackground from '../components/GameBackground'
import DeliveryAddressDisplay from '../components/DeliveryAddressDisplay'

export default function VerifyDelivery() {
  const [params] = useSearchParams()
  const urlBookingId = params.get('id') || params.get('bookingId') || ''
  const urlPhase = params.get('phase') || ''
  const { showToast } = useToast()

  const [bookingId, setBookingId] = useState(urlBookingId)
  const [booking, setBooking] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [phase, setPhase] = useState(urlPhase === 'checkout' ? 'checkout' : 'checkin')
  const [loading, setLoading] = useState(false)
  const [renterOtp, setRenterOtp] = useState('')
  const [driverOtp, setDriverOtp] = useState('')
  const [checklist, setChecklist] = useState({
    cables: true,
    controllers: true,
    condition: true,
  })
  const [verifying, setVerifying] = useState(false)
  const [verifiedSuccess, setVerifiedSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (urlBookingId) {
      loadBooking(urlBookingId)
    }
  }, [urlBookingId])

  const loadBooking = async (idToLoad) => {
    const cleanId = idToLoad.trim()
    if (!cleanId) return
    setLoading(true)
    setErrorMessage('')
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, listings(id, title, photos, area, location), profiles:renter_id(full_name, phone)')
        .eq('id', cleanId)
        .maybeSingle()

      if (error || !data) {
        setErrorMessage('Booking not found. Please verify the Order ID.')
        setBooking(null)
        setTracking(null)
      } else {
        setBooking(data)
        const trk = await getBookingTracking(data.id, data)
        setTracking(trk)
        // Auto-detect whether this is a delivery handover or a return pickup
        if (urlPhase === 'checkout' || data.status === 'active') {
          setPhase('checkout')
          if (trk?.return_verified || data.status === 'completed') {
            setVerifiedSuccess(true)
          } else {
            setVerifiedSuccess(false)
          }
        } else {
          setPhase('checkin')
          if (trk?.verified && data.status === 'active') {
            setVerifiedSuccess(true)
          }
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load booking details.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    if (!renterOtp.trim() || !driverOtp.trim()) {
      setErrorMessage('Please enter both the Customer OTP and Driver Security OTP.')
      return
    }

    setVerifying(true)
    try {
      const result = await verifyDualOtp({
        bookingId: booking?.id || bookingId,
        inputRenterOtp: renterOtp,
        inputDriverOtp: driverOtp,
        phase,
        checklist,
      })

      if (result.success) {
        setVerifiedSuccess(true)
        setTracking(result.tracking)
        showToast(result.message, 'success')
      } else {
        setErrorMessage(result.message)
        showToast(result.message, 'error')
      }
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleSendWhatsAppReceipt = () => {
    if (!booking) return
    const phone = booking.profiles?.phone || ''
    const handoverPin = getHandoverPin(booking.id)
    const returnPin = getReturnPin(booking.id)
    if (phase === 'checkin') {
      const msg = formatHandoverActiveMessage({
        booking,
        handoverPin,
        returnPin,
        recipientRole: 'renter',
      })
      window.open(buildWhatsAppLink(phone, msg), '_blank', 'noopener,noreferrer')
    } else {
      const shortId = String(booking.id || '').slice(0, 8).toUpperCase()
      const msg = `📦 *RETURN HANDSHAKE VERIFIED (#${shortId})*\n\nYour *${booking.listings?.title || 'gear'}* return has been verified via Dual OTP! Your security deposit settlement is now queued. Thank you for renting on LocalDen! ⚡`
      window.open(buildWhatsAppLink(phone, msg), '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-nav pb-20">
      <div className="grid-floor" />
      <GameBackground />

      <div className="relative z-10 w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3 shadow-lg shadow-cyan-500/20">
            <ShieldCheck size={36} />
          </div>
          <h1 className="font-bungee text-2xl md:text-3xl text-white tracking-wide">
            Delivery &amp; Return Handshake Portal
          </h1>
          <p className="font-display text-xs md:text-sm text-white/50 mt-1 max-w-md mx-auto">
            Dual OTP + 3-Point Hardware Verification for doorstep delivery and return pickup.
          </p>
        </div>

        <div className="glass rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl space-y-6">
          {/* Booking ID Selector if not prefilled */}
          {!booking && (
            <div className="space-y-4">
              <label className="block text-xs font-display font-semibold text-white/60 tracking-wider uppercase">
                Enter Booking / Order ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 84b3d7b4-..."
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="input-dark flex-1 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => loadBooking(bookingId)}
                  disabled={loading || !bookingId.trim()}
                  className="btn-primary text-xs px-5 py-2.5 font-bold flex items-center gap-1.5"
                >
                  {loading ? 'Finding...' : 'Look Up'}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Booking Card Preview */}
          {booking && (
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                    Order Reference: #{booking.id.slice(0, 8)}
                  </span>
                  <h3 className="font-bungee text-base text-white">
                    {booking.listings?.title || 'Gaming Hardware Rig'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <User size={12} className="text-cyan-400" />
                    <span>
                      Renter: <strong>{booking.profiles?.full_name || 'Customer'}</strong>
                      {booking.profiles?.phone ? ` (${booking.profiles.phone})` : ''}
                    </span>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {tracking?.tracking_status?.replace(/_/g, ' ') || 'Out For Delivery'}
                </div>
              </div>

              {/* Handshake Phase Switcher (Delivery Handover vs Return Pickup) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPhase('checkin')
                    setVerifiedSuccess(false)
                    setErrorMessage('')
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    phase === 'checkin'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                      : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                  }`}
                >
                  <Truck size={13} /> 1. Delivery Handover
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('checkout')
                    setVerifiedSuccess(false)
                    setErrorMessage('')
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    phase === 'checkout'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400/50'
                      : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                  }`}
                >
                  <RotateCcw size={13} /> 2. Return Pickup
                </button>
              </div>

              {booking.delivery_address && (
                <DeliveryAddressDisplay address={booking.delivery_address} />
              )}
            </div>
          )}

          {/* Verification Success View */}
          {verifiedSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="font-bungee text-xl text-emerald-300">
                  {phase === 'checkout' ? 'Return Pickup Verified!' : 'Delivery Handover Verified!'}
                </h3>
                <p className="text-xs text-white/70 font-display mt-1">
                  {phase === 'checkout'
                    ? 'Both OTPs matched! Hardware return is authenticated and the rental is now marked Completed.'
                    : 'Both OTPs matched! Physical custody is transferred and the rental session is now officially Active.'}
                </p>
                {(tracking?.verified_at || tracking?.return_verified_at) && (
                  <p className="text-[10px] text-white/40 font-mono mt-2">
                    Verified at: {new Date(tracking.return_verified_at || tracking.verified_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                )}
              </div>
              <div className="pt-2 flex justify-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleSendWhatsAppReceipt}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all flex items-center gap-1.5"
                >
                  <MessageCircle size={14} /> Send WhatsApp Receipt to Customer
                </button>
                <Link to="/dashboard" className="btn-outline text-xs py-2 px-5">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            /* OTP Input Form */
            booking && (
              <form onSubmit={handleVerify} className="space-y-5 animate-fade-in">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Customer / Renter OTP */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                        <KeyRound size={13} /> 1. Customer {phase === 'checkout' ? 'Return' : 'Handover'} OTP
                      </label>
                      <span className="text-[10px] text-white/40">From Renter</span>
                    </div>
                    <p className="text-[11px] text-white/50 leading-tight">
                      4-digit {phase === 'checkout' ? 'Return' : 'Handover'} PIN displayed on customer's pass.
                    </p>
                    <input
                      type="text"
                      maxLength={4}
                      value={renterOtp}
                      onChange={(e) => setRenterOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • •"
                      className="input-dark w-full text-center text-2xl font-mono font-bold tracking-widest py-3 text-cyan-300 border-cyan-500/40 focus:border-cyan-400"
                    />
                  </div>

                  {/* Driver / Courier OTP */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                        <Truck size={13} /> 2. Driver Security OTP
                      </label>
                      <span className="text-[10px] text-white/40">From Dispatch</span>
                    </div>
                    <p className="text-[11px] text-white/50 leading-tight">
                      4-digit security code issued on the driver dispatch sheet.
                    </p>
                    <input
                      type="text"
                      maxLength={4}
                      value={driverOtp}
                      onChange={(e) => setDriverOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • •"
                      className="input-dark w-full text-center text-2xl font-mono font-bold tracking-widest py-3 text-pink-300 border-pink-500/40 focus:border-pink-400"
                    />
                  </div>
                </div>

                {/* 3-Point Hardware Checklist */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 block">
                    3-Point Physical Inspection Checklist
                  </span>
                  {[
                    { key: 'cables', label: 'Power cable & HDMI/AV cords present and intact' },
                    { key: 'controllers', label: 'Controllers / accessories tested & counted' },
                    { key: 'condition', label: 'Hardware exterior inspected with customer at doorstep' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklist[item.key]}
                        onChange={(e) => setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                        className="rounded accent-emerald-400"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={verifying || renterOtp.length < 4 || driverOtp.length < 4}
                  className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-40"
                >
                  <ShieldCheck size={18} />
                  {verifying
                    ? 'Authenticating Handshake...'
                    : phase === 'checkout'
                      ? 'Verify Dual OTP & Complete Return Pickup'
                      : 'Verify Dual OTP & Complete Delivery Handover'}
                </button>
              </form>
            )
          )}

          {/* Quick Help Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40 font-display">
            <span>LocalDen Secure Logistics</span>
            <Link to="/" className="text-cyan-400 hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

