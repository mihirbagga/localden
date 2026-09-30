import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Star, Shield, Calendar,
  ChevronLeft, ChevronRight, Share2, Heart,
  CheckCircle, AlertCircle, User, CreditCard, X,
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import AvailableCoupons from '../components/AvailableCoupons'
import PaymentOptions from '../components/PaymentOptions'
import { useListingById } from '../hooks/useListings'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useRazorpay } from '../hooks/useRazorpay'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import { useAvailableCoupons } from '../hooks/useAvailableCoupons'
import { usePlatformFee } from '../hooks/usePlatformFee'
import { supabase } from '../lib/supabase'
import { normalizeCouponCode, priceWithCoupon, validateCoupon } from '../lib/coupons'
import { platformFeeLabel } from '../lib/platformFee'
import { isOnlineMethod, methodConfig, payButtonLabel } from '../lib/payments'
import { listingUnits, rangeHasBusy, shiftIso, todayIso } from '../lib/bookingDates'
import { needsKyc } from '../lib/kyc'
import { rupee } from '../lib/wallet'
import { useWallet } from '../hooks/useWallet'
import { useBusyDates } from '../hooks/useBusyDates'
import { useProtectionPlans } from '../hooks/useProtectionPlans'
import { calculateProtectionCost, getProtectionPlanDetails } from '../lib/protectionPlans'
import TrustBadges from '../components/TrustBadges'
import MaintenanceLogModal from '../components/MaintenanceLogModal'
import { fetchMaintenanceLogs, MAINTENANCE_TYPES } from '../lib/maintenance'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import SEOHead from '../components/SEOHead'
import { useReviews } from '../hooks/useReviews'
import DeliveryAddressForm from '../components/DeliveryAddressForm'
import ListingGamesDisplay from '../components/ListingGamesDisplay'
import { fetchListingGames } from '../lib/gamesService'
import { adjustListingStock } from '../lib/stockService'
import { updateBookingTracking } from '../lib/trackingService'
import './terms.css'
import './couponApply.css'
import './listingDetail.css'

const SAVED_KEY = 'ldSaved'
const HOW_STEPS = [
  { title: 'Pick dates', body: 'Grey days on the calendar are already booked. Total updates live.' },
  { title: 'Pay + deposit', body: 'Coupon, then UPI / QR / Razorpay / cash. Deposit sits until return.' },
  { title: 'Handover', body: 'Pickup or delivery. Check-in photos, then check-out when you return.' },
]

function weekendRange() {
  const start = new Date()
  start.setHours(12, 0, 0, 0)
  const dow = start.getDay()
  const satAdd = dow === 6 ? 0 : dow === 0 ? 6 : (6 - dow)
  return { from: shiftIso(todayIso(), satAdd), to: shiftIso(todayIso(), satAdd + 2) }
}

function conditionLabel(value) {
  if (value === 'like_new') return 'Like New'
  if (value === 'good') return 'Good'
  if (value === 'fair') return 'Fair'
  return value || '—'
}

function readSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function PhotoGallery({ photos, emoji, title }) {
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)
  const hasPhotos = photos?.length > 0

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, photos?.length])

  if (!hasPhotos) {
    return (
      <div className="ld-gallery__empty" aria-hidden="true">{emoji || '🎮'}</div>
    )
  }

  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length)
  const next = () => setIdx((i) => (i + 1) % photos.length)

  return (
    <div className="ld-gallery">
      <div className="ld-gallery__main">
        <img src={photos[idx]} alt={`${title || 'Listing'} photo ${idx + 1}`} />
        {photos.length > 1 ? (
          <>
            <button type="button" className="ld-gallery__nav is-prev" onClick={prev} aria-label="Previous photo">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="ld-gallery__nav is-next" onClick={next} aria-label="Next photo">
              <ChevronRight size={18} />
            </button>
            <div className="ld-gallery__dots">
              {photos.map((_, i) => (
                <button
                  key={photos[i]}
                  type="button"
                  className={`ld-gallery__dot${i === idx ? ' is-on' : ''}`}
                  onClick={() => setIdx(i)}
                  aria-label={`Show photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
        <button type="button" className="ld-gallery__open" onClick={() => setOpen(true)} aria-label="Open photo full screen">
          Full view
        </button>
      </div>
      {photos.length > 1 ? (
        <div className="ld-thumbs">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              className={i === idx ? 'is-on' : ''}
              onClick={() => setIdx(i)}
              aria-label={`Thumbnail ${i + 1}`}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? createPortal(
        <div className="ld-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
          <button type="button" className="ld-icon-btn ld-lightbox__x" onClick={() => setOpen(false)} aria-label="Close photo">
            <X size={16} />
          </button>
          {photos.length > 1 ? (
            <>
              <button type="button" className="ld-gallery__nav is-prev" onClick={prev} aria-label="Previous photo">
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="ld-gallery__nav is-next" onClick={next} aria-label="Next photo">
                <ChevronRight size={18} />
              </button>
            </>
          ) : null}
          <img src={photos[idx]} alt={`${title || 'Listing'} full view`} />
        </div>,
        document.body
      ) : null}
    </div>
  )
}

function ShareLinkBox() {
  const { showToast } = useToast()
  const url = window.location.href.replace(/\?rent=1/, '')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied', 'success')
    } catch {
      showToast('Copy failed', 'error')
    }
  }

  return (
    <div className="ld-share">
      <span>{url.replace(/^https?:\/\//, '')}</span>
      <button type="button" className="btn-outline" onClick={copy} aria-label="Copy listing link">Copy</button>
    </div>
  )
}

function BookingWidget({ listing, mobile = false, forceOpen = false }) {
  const { isAuthenticated, user, profile, isBanned } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { openCheckout, loading: rzpLoading } = useRazorpay()
  const { methods: payMethods } = usePaymentMethods({ enabledOnly: true })
  const { wallet, refresh: refreshWallet } = useWallet()
  const walletMethod = { id: 'wallet', name: 'Wallet', method_type: 'wallet' }
  const { coupons: openCoupons } = useAvailableCoupons()
  const { fee: platformFeeSetting } = usePlatformFee()

  const isOwner = isAuthenticated && user?.id === listing.user_id
  const today = todayIso()
  const uid = mobile ? 'm' : 'd'
  const units = listingUnits(listing)
  const { busy } = useBusyDates(listing.id, units)
  const busyRef = useRef(busy)
  busyRef.current = busy
  const rawAvailable = listing.is_available ?? listing.available ?? true
  const stockQty = listing.stock_qty !== undefined && listing.stock_qty !== null ? Number(listing.stock_qty) : null
  const isBookedOut = !rawAvailable || (stockQty !== null && stockQty <= 0)
  const outOfStock = isBookedOut

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [quick, setQuick] = useState('')
  const [booking, setBooking] = useState(null)
  const [payError, setPayError] = useState('')
  const [saving, setSaving] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponBusy, setCouponBusy] = useState(false)
  const [payMethodId, setPayMethodId] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [handover, setHandover] = useState('pickup')
  const [address, setAddress] = useState('')
  const { plans: protectionSettings } = useProtectionPlans()
  const [protectionPlan, setProtectionPlan] = useState('none')
  const [insuranceOpted, setInsuranceOpted] = useState(false)

  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000))
    : 0
  const deposit = listing.deposit_amount || 5000
  const priced = priceWithCoupon({
    days,
    priceDay: listing.price_day,
    deposit,
    coupon: appliedCoupon,
    fee: platformFeeSetting,
  })
  const { subtotal, discount: couponDiscount, platformFee } = priced
  
  let discountRate = 0
  if (days >= 14) discountRate = 0.20
  else if (days >= 7) discountRate = 0.10
  else if (days >= 3) discountRate = 0.05

  const durationDiscount = Math.round((listing.price_day * days) * discountRate)
  const totalDiscount = durationDiscount + couponDiscount
  const subtotalAfterDuration = Math.max(0, subtotal - durationDiscount)
  const baseTotal = Math.max(0, subtotalAfterDuration - couponDiscount) + platformFee + deposit
  
  const protectionCost = calculateProtectionCost(protectionPlan, days, protectionSettings)
  const total = baseTotal + protectionCost
  const canWallet = isAuthenticated && days > 0 && total > 0 && (wallet.available || 0) >= total
  const selectedPay = payMethodId === 'wallet'
    ? walletMethod
    : (payMethods.find((m) => m.id === payMethodId) || payMethods[0] || (canWallet ? walletMethod : null))

  const applyRange = (from, to, chip) => {
    if (isBookedOut) {
      showToast('This item is currently booked out and unavailable for rent.', 'error')
      return
    }
    if (from && to && rangeHasBusy(from, to, busyRef.current)) {
      showToast('Those dates are already booked.', 'error')
      setStartDate(from)
      setEndDate('')
      setQuick('')
      return
    }
    setStartDate(from)
    setEndDate(to)
    setQuick(chip)
  }

  useEffect(() => {
    if (!payMethodId && payMethods[0]) setPayMethodId(payMethods[0].id)
  }, [payMethodId, payMethods])

  useEffect(() => {
    if (forceOpen && mobile && isAuthenticated && !isOwner) setSheetOpen(true)
  }, [forceOpen, mobile, isAuthenticated, isOwner])

  useEffect(() => {
    const onQuick = (e) => {
      const kind = e.detail
      const start = todayIso()
      if (kind === 'tonight') applyRange(start, shiftIso(start, 1), 'tonight')
      if (kind === 'weekend') {
        const range = weekendRange()
        applyRange(range.from, range.to, 'weekend')
      }
      if (kind === 'week') applyRange(start, shiftIso(start, 7), 'week')
    }
    window.addEventListener('ld-quick-date', onQuick)
    return () => window.removeEventListener('ld-quick-date', onQuick)
  }, [])

  useEffect(() => {
    if (!sheetOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setSheetOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  const saveBooking = async ({ paymentId, method, paid }) => {
    setSaving(true)
    let isPaid = Boolean(paid)
    const bookingId = crypto.randomUUID()
    const { error } = await supabase.from('bookings').insert({
      id: bookingId,
      listing_id: listing.id,
      renter_id: user.id,
      lister_id: listing.user_id,
      start_date: startDate,
      end_date: endDate,
      total_days: days,
      price_per_day: listing.price_day,
      subtotal,
      platform_fee: platformFee,
      deposit,
      discount_amount: totalDiscount,
      coupon_id: appliedCoupon?.id || null,
      coupon_code: appliedCoupon?.code || null,
      total_amount: total,
      status: 'pending',
      payment_status: isPaid ? 'paid' : 'pending',
      payment_method: method?.id || null,
      payment_ref: paymentRef.trim() || null,
      razorpay_payment_id: paymentId || null,
      delivery_type: handover,
      delivery_address: handover === 'delivery' ? address.trim() || null : null,
      insurance_opted: insuranceOpted,
      insurance_amount: insuranceOpted ? INSURANCE_FEE : 0,
    })
    if (error) {
      setSaving(false)
      const taken = /already booked/i.test(error.message || '')
      setPayError(taken ? 'Those dates were just booked. Pick another range.' : 'Payment ok, booking save failed. Contact support.')
      showToast(taken ? 'Those dates are already booked.' : 'Booking save failed. Contact support.', 'error')
      return
    }
    if (method?.id === 'wallet') {
      const spent = await supabase.rpc('spend_wallet', { p_amount: total, p_booking_id: bookingId })
      if (spent.error) {
        setSaving(false)
        setPayError(spent.error.message || 'Wallet pay failed.')
        showToast(spent.error.message || 'Wallet pay failed.', 'error')
        return
      }
      await supabase.from('bookings').update({
        status: 'pending',
        payment_status: 'paid',
        payment_method: 'wallet',
        updated_at: new Date().toISOString(),
      }).eq('id', bookingId)
      isPaid = true
      refreshWallet?.()
    }
    // Initialize tracking in awaiting_confirmation state
    await updateBookingTracking(bookingId, {
      tracking_status: 'awaiting_confirmation',
    })
    setSaving(false)
    await supabase.from('listings').update({
      total_bookings: (listing.total_bookings || 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', listing.id)
    await adjustListingStock(listing.id, -1)
    setBooking({
      id: bookingId,
      startDate,
      endDate,
      days,
      total,
      paymentId,
      couponCode: appliedCoupon?.code,
      discount: totalDiscount,
      paid: isPaid,
      methodName: method?.name,
    })
    showToast(paid ? 'Booking confirmed' : 'Booking placed. Await payment confirm.', 'success')
  }

  const tryApplyCoupon = (coupon) => {
    const invalid = validateCoupon(coupon, subtotal, user?.id)
    if (invalid) {
      setAppliedCoupon(null)
      showToast(invalid, 'error')
      return false
    }
    setAppliedCoupon(coupon)
    setCouponInput(coupon.code)
    showToast(`Coupon ${coupon.code} applied`, 'success')
    return true
  }

  const applyCoupon = async () => {
    const code = normalizeCouponCode(couponInput)
    if (!code) {
      showToast('Enter a coupon code.', 'error')
      return
    }
    if (days < 1) {
      showToast('Select dates first.', 'error')
      return
    }
    const listed = openCoupons.find((c) => normalizeCouponCode(c.code) === code)
    if (listed) {
      tryApplyCoupon(listed)
      return
    }
    setCouponBusy(true)
    const { data, error } = await supabase.from('coupons').select('*').ilike('code', code).maybeSingle()
    setCouponBusy(false)
    if (error) {
      showToast(error.message || 'Could not check coupon.', 'error')
      return
    }
    tryApplyCoupon(data)
  }

  const clearCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    showToast('Coupon removed', 'info')
  }

  useEffect(() => {
    if (!appliedCoupon || days < 1) return
    const invalid = validateCoupon(appliedCoupon, days * (listing.price_day || 0), user?.id)
    if (!invalid) return
    setAppliedCoupon(null)
    showToast(invalid, 'error')
  }, [appliedCoupon, days, listing.price_day, showToast])

  const handleBook = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/listing/${listing.id}?rent=1` } } })
      return
    }
    if (isBanned) {
      showToast('Account banned. Contact support.', 'error')
      return
    }
    if (needsKyc(profile)) {
      showToast('Complete KYC before renting.', 'info')
      navigate('/kyc', { state: { from: { pathname: `/listing/${listing.id}?rent=1` } } })
      return
    }
    if (outOfStock) {
      showToast('This item is out of stock.', 'error')
      return
    }
    if (!startDate || !endDate || days < 1) {
      showToast('Pick rental dates first.', 'error')
      return
    }
    if (rangeHasBusy(startDate, endDate, busyRef.current)) {
      showToast('Those dates are already booked.', 'error')
      return
    }
    if (!acceptTerms) {
      showToast('Accept Terms and Damage Policy first.', 'error')
      return
    }
    if (!selectedPay && payMethodId !== 'wallet') {
      showToast('No payment method enabled. Ask admin.', 'error')
      return
    }
    if (payMethodId === 'wallet' && !canWallet) {
      showToast('Wallet balance is too low for this total.', 'error')
      return
    }
    if (handover === 'delivery' && !address.trim()) {
      showToast('Add a delivery address.', 'error')
      return
    }
    setPayError('')

    if (payMethodId === 'wallet' || selectedPay?.id === 'wallet') {
      await saveBooking({ method: walletMethod, paid: false, paymentId: null })
      return
    }

    if (!isOnlineMethod(selectedPay)) {
      await saveBooking({ method: selectedPay, paid: false, paymentId: null })
      return
    }

    const keyId = methodConfig(selectedPay).key_id
    await openCheckout({
      amount: total,
      name: listing.title,
      description: `${days} day${days > 1 ? 's' : ''} rental · ${startDate} to ${endDate}`,
      keyId,
      prefill: {
        name: profile?.full_name || '',
        email: user?.email || '',
        contact: profile?.phone || '',
      },
      notes: {
        listing_id: listing.id,
        renter_id: user.id,
        start_date: startDate,
        end_date: endDate,
        coupon: appliedCoupon?.code || '',
      },
      onSuccess: (paymentId) => saveBooking({ paymentId, method: selectedPay, paid: true }),
      onFailure: (err) => {
        if (err.message !== 'Payment dismissed') {
          const msg = err.description || err.message || 'Payment failed. Please try again.'
          setPayError(msg)
          showToast(msg, 'error')
        }
      },
    })
  }

  if (isOwner && mobile) {
    return <p className="ld-hint">Your listing · share the link</p>
  }

  if (isOwner) {
    return (
      <div className="glass ld-book ld-owner is-sticky" id="rent-now">
        <div className="text-4xl" aria-hidden="true">🏠</div>
        <h3>Your Listing</h3>
        <p>You cannot rent your own gear. Share this page.</p>
        <ShareLinkBox />
        <Link to="/dashboard?tab=listings" className="btn-outline w-full">Manage in Dashboard</Link>
      </div>
    )
  }

  if (booking) {
    const successCard = (
      <div className="glass ld-book ld-success is-sticky">
        <CheckCircle size={36} />
        <h3>{booking.paid ? 'You are booked' : 'Request sent'}</h3>
        <p>
          {booking.paid
            ? 'Payment in. Lister will ping you for handover.'
            : 'Pay marked. Lister or admin confirms when money shows.'}
        </p>
        <div className="ld-facts">
          <div><span>Dates</span><b>{booking.startDate} → {booking.endDate}</b></div>
          <div><span>Days</span><b>{booking.days}</b></div>
          <div><span>Total</span><b>₹{booking.total}</b></div>
          {booking.methodName ? <div><span>Pay</span><b>{booking.methodName}</b></div> : null}
          {booking.couponCode ? <div><span>Coupon</span><b>{booking.couponCode} −₹{booking.discount}</b></div> : null}
        </div>
        <Link to="/dashboard?tab=bookings" className="btn-primary w-full">View in My Bookings</Link>
      </div>
    )
    if (mobile) {
      return createPortal(
        <div className="listing-sheet" role="dialog" aria-modal="true" aria-label="Booking status">
          {successCard}
        </div>,
        document.body
      )
    }
    return successCard
  }

  const isProcessing = rzpLoading || saving

  const formCard = (
    <div className="glass ld-book is-sticky" id={mobile ? undefined : 'rent-now'}>
      <div className="ld-book__price">
        <strong>₹{listing.price_day}</strong>
        <span>/day</span>
        {listing.price_weekend > 0 ? <span className="ml-auto">Wknd ₹{listing.price_weekend}</span> : null}
      </div>

      {/* Fulfillment / Storage badge */}
      {listing.fulfillment_type === 'warehouse' ? (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4">
          <span className="text-xl">🏬</span>
          <div>
            <p className="text-xs font-display font-bold text-cyan-300">Stored at लोकल Den Hub (Koramangala)</p>
            <p className="text-[11px] font-display text-white/50 leading-tight">Pre-inspected, verified & dispatched directly from our central warehouse.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 mb-4">
          <span className="text-xl">🏠</span>
          <div>
            <p className="text-xs font-display font-bold text-white/80">Direct Handover (From Owner)</p>
            <p className="text-[11px] font-display text-white/40 leading-tight">Kept at owner's studio/home in {listing.location || 'Bangalore'}.</p>
          </div>
        </div>
      )}

      {isBookedOut ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 mb-4 space-y-1.5 text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-[11px]">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span>🚫 Booked Out / Zero Stock Available</span>
          </div>
          <p className="text-white/70 font-display leading-relaxed">
            All units for this hardware are currently in active rentals. Date selection and booking checkout are disabled until units are returned.
          </p>
        </div>
      ) : null}

      <h4 className="text-xs font-semibold tracking-wider text-white/40 uppercase mt-5 mb-2">DATES</h4>
      <div className="ld-chips flex gap-2 flex-wrap" role="group" aria-label="Quick rental dates">
        <button
          type="button"
          disabled={isBookedOut}
          className={`ld-chip transition-all duration-300 ${isBookedOut ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''} ${quick === 'tonight' ? ' is-on !border-cyan-400 !bg-cyan-500/20 !shadow-[0_0_12px_rgba(34,211,238,0.4)]' : ' hover:border-cyan-400/50 hover:bg-cyan-500/5'}`}
          onClick={() => applyRange(today, shiftIso(today, 1), 'tonight')}
          aria-label="Rent tonight"
        >
          ⚡ Tonight (1d)
        </button>
        <button
          type="button"
          disabled={isBookedOut}
          className={`ld-chip transition-all duration-300 ${isBookedOut ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''} ${quick === 'weekend' ? ' is-on !border-magenta !bg-magenta/20 !shadow-[0_0_12px_rgba(255,42,133,0.4)]' : ' hover:border-magenta/50 hover:bg-magenta/5'}`}
          onClick={() => { const w = weekendRange(); applyRange(w.from, w.to, 'weekend') }}
          aria-label="Rent this weekend"
        >
          🎉 Weekend (Sat–Mon)
        </button>
        <button
          type="button"
          disabled={isBookedOut}
          className={`ld-chip transition-all duration-300 ${isBookedOut ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''} ${quick === '3' ? ' is-on !border-orange-400 !bg-orange-500/20 !shadow-[0_0_12px_rgba(249,115,22,0.4)]' : ' hover:border-orange-400/50 hover:bg-orange-500/5'}`}
          onClick={() => applyRange(today, shiftIso(today, 3), '3')}
          aria-label="Rent three days"
        >
          🔥 3 Days (5% OFF)
        </button>
        <button
          type="button"
          disabled={isBookedOut}
          className={`ld-chip transition-all duration-300 ${isBookedOut ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''} ${quick === 'week' ? ' is-on !border-purple-400 !bg-purple-500/20 !shadow-[0_0_12px_rgba(168,85,247,0.4)]' : ' hover:border-purple-400/50 hover:bg-purple-500/5'}`}
          onClick={() => applyRange(today, shiftIso(today, 7), 'week')}
          aria-label="Rent one week"
        >
          💎 1 Week (10% OFF)
        </button>
      </div>

      <AvailabilityCalendar
        busy={busy}
        startDate={startDate}
        endDate={endDate}
        onPick={(from, to) => applyRange(from, to, '')}
        disabled={isBookedOut}
      />

      <div className="ld-dates">
        <div>
          <label className="field-label" htmlFor={`book-from-${uid}`}>FROM</label>
          <input
            id={`book-from-${uid}`}
            type="date"
            value={startDate}
            min={today}
            disabled={isBookedOut}
            onChange={(e) => {
              const next = e.target.value
              setQuick('')
              if (endDate && endDate <= next) {
                applyRange(next, '')
                return
              }
              applyRange(next, endDate)
            }}
            className={`input-dark ${isBookedOut ? 'opacity-30 cursor-not-allowed' : ''}`}
            aria-label="Rental start date"
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`book-to-${uid}`}>TO</label>
          <input
            id={`book-to-${uid}`}
            type="date"
            value={endDate}
            min={startDate || today}
            disabled={isBookedOut}
            onChange={(e) => applyRange(startDate, e.target.value)}
            className={`input-dark ${isBookedOut ? 'opacity-30 cursor-not-allowed' : ''}`}
            aria-label="Rental end date"
          />
        </div>
      </div>

      {days > 0 ? (
        <div className="ld-break">
          <h4 className="text-xs font-semibold tracking-wider text-white/40 uppercase mb-2">PRICE BREAKDOWN</h4>
          <div><span>₹{listing.price_day} × {days} day{days === 1 ? '' : 's'}</span><b>₹{subtotal}</b></div>
          {durationDiscount > 0 && (
            <div className="flex justify-between items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg my-1">
              <span className="flex items-center gap-1">
                <span>🎉</span> {days >= 14 ? 'Monthly Saver (20% OFF)' : days >= 7 ? 'Weekly Saver (10% OFF)' : '3-Day Saver (5% OFF)'}
              </span>
              <span>-₹{durationDiscount}</span>
            </div>
          )}
          {couponDiscount > 0 ? <div className="is-off"><span>Coupon {appliedCoupon?.code}</span><b>−₹{couponDiscount}</b></div> : null}
          {platformFee > 0 ? <div><span>{platformFeeLabel(platformFeeSetting)}</span><b>₹{platformFee}</b></div> : null}
          <div><span>Security deposit</span><b>₹{deposit}</b></div>
          {insuranceOpted ? <div><span>Damage Protection</span><b>₹{INSURANCE_FEE}</b></div> : null}
          <div className="is-total"><span>Total</span><span>₹{total}</span></div>
          <p>Deposit back after a clean return.</p>
        </div>
      ) : (
        <p className="ld-hint">Tap a chip or pick dates. Price fills in here.</p>
      )}

      {days > 0 ? (
        <>
          <h4 className="text-xs font-semibold tracking-wider text-white/40 uppercase mt-5 mb-2">DELIVERY</h4>
          <p className="field-label">Handover</p>
          <div className="ld-hand" role="group" aria-label="Handover type">
            <button type="button" className={handover === 'pickup' ? 'is-on' : ''} onClick={() => setHandover('pickup')} aria-pressed={handover === 'pickup'}>Pickup</button>
            <button type="button" className={handover === 'delivery' ? 'is-on' : ''} onClick={() => setHandover('delivery')} aria-pressed={handover === 'delivery'}>Delivery</button>
          </div>
          {handover === 'delivery' ? (
            <div>
              <label className="field-label">Delivery Address</label>
              <DeliveryAddressForm value={address} onChange={setAddress} />
            </div>
          ) : null}

          <h4 className="text-xs font-semibold tracking-wider text-white/40 uppercase mt-5 mb-2">COUPON</h4>
          <div className="coupon-box">
            <label className="field-label" htmlFor={`booking-coupon-${uid}`}>Coupon code</label>
            {appliedCoupon ? (
              <div className="coupon-applied">
                <span>{appliedCoupon.code} saved ₹{couponDiscount}</span>
                <button type="button" className="coupon-clear" onClick={clearCoupon} aria-label="Remove coupon">Remove</button>
              </div>
            ) : (
              <div className="coupon-row">
                <input
                  id={`booking-coupon-${uid}`}
                  className="input-dark"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="WELCOME10"
                  aria-label="Coupon code"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                />
                <button type="button" className="btn-outline coupon-apply-btn" onClick={applyCoupon} disabled={couponBusy} aria-label="Apply coupon">
                  {couponBusy ? '…' : 'Apply'}
                </button>
              </div>
            )}
            <AvailableCoupons
              coupons={openCoupons}
              subtotal={subtotal}
              selectedId={appliedCoupon?.id}
              onPick={tryApplyCoupon}
              userId={user?.id}
            />
          </div>

          {protectionSettings?.enabled ? (
            <>
              <h4 className="text-xs font-semibold tracking-wider text-white/40 uppercase mt-5 mb-2">PROTECTION</h4>
              <div className="book-damage" style={{ marginBottom: 12 }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                    <Shield size={14} /> Damage Protection Waiver
                  </span>
                  <span className="text-[10px] text-white/50">Admin Configured</span>
                </div>
                <div className="space-y-2">
                  {[
                    getProtectionPlanDetails('none', protectionSettings),
                    getProtectionPlanDetails('basic', protectionSettings),
                    getProtectionPlanDetails('full', protectionSettings),
                  ].map((plan) => {
                    const planCost = calculateProtectionCost(plan.id, days, protectionSettings)
                    const isSelected = protectionPlan === plan.id
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setProtectionPlan(plan.id)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all border ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500 text-white'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{plan.name}</span>
                          <span className="text-xs font-semibold text-emerald-400">
                            {planCost > 0 ? `+ ₹${planCost}` : '₹0'}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/60 mt-0.5">{plan.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : null}

          {(canWallet || payMethods.length > 0) && (
            <h4 className="text-xs font-semibold tracking-wider text-white/40 uppercase mt-5 mb-2">PAYMENT</h4>
          )}

          {canWallet ? (
            <button
              type="button"
              className={`ld-chip ld-wallet-opt${payMethodId === 'wallet' ? ' is-on' : ''}`}
              onClick={() => setPayMethodId('wallet')}
              aria-pressed={payMethodId === 'wallet'}
            >
              Pay with wallet · {rupee(wallet.available)}
            </button>
          ) : null}

          {payMethods.length > 0 ? (
            <PaymentOptions
              methods={payMethods}
              selectedId={payMethodId === 'wallet' ? '' : selectedPay?.id}
              onSelect={setPayMethodId}
              paymentRef={paymentRef}
              onPaymentRef={setPaymentRef}
            />
          ) : null}
          <div className="book-damage">
            <strong>Damage policy (short)</strong>
            <p>Wear is free. Scratches come from deposit. Smash / water / loss = used-market value. Photos at pickup and return.</p>
          </div>
          <div className="book-terms">
            <input
              id={`accept-terms-${uid}`}
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              aria-label="Accept terms and damage policy"
            />
            <label htmlFor={`accept-terms-${uid}`}>
              I accept the{' '}
              <Link to="/terms" target="_blank" rel="noreferrer">Terms &amp; Damage Policy</Link>
              {' '}before renting.
            </label>
          </div>
        </>
      ) : null}

      {payError ? (
        <div className="ld-err">
          <AlertCircle size={14} />
          <span>{payError}</span>
          <button type="button" onClick={() => setPayError('')} aria-label="Dismiss error"><X size={12} /></button>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 my-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <Shield size={14} className="flex-shrink-0" />
          <span>🔒 Deposit Held Safely · Auto-refunded within 48h</span>
        </div>
        <div className="flex items-center gap-2 text-cyan-300">
          <CheckCircle size={14} className="flex-shrink-0" />
          <span>🛡️ Normal wear & tear covered · Verified hardware</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleBook}
        disabled={isProcessing || isBookedOut || (isAuthenticated && days > 0 && !acceptTerms)}
        className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label={isBookedOut ? 'Item is booked out' : 'Rent this item now'}
      >
        {isProcessing ? (saving ? 'Confirming…' : 'Opening payment…') : null}
        {!isProcessing && isBookedOut ? '🚫 Currently Booked Out' : null}
        {!isProcessing && !isBookedOut && !isAuthenticated ? <><CreditCard size={16} /> Sign in to rent</> : null}
        {!isProcessing && !isBookedOut && isAuthenticated && needsKyc(profile) ? <><Shield size={16} /> Complete KYC to rent</> : null}
        {!isProcessing && !isBookedOut && isAuthenticated && !needsKyc(profile) && days < 1 ? <><Calendar size={16} /> Pick dates to rent</> : null}
        {!isProcessing && !isBookedOut && isAuthenticated && !needsKyc(profile) && days > 0 ? <><CreditCard size={16} /> Rent now · {payButtonLabel(selectedPay, total)}</> : null}
      </button>

      <div className="ld-trust">
        <span><Shield size={10} /> Deposit held</span>
        <span><CheckCircle size={10} /> Secure pay</span>
      </div>
    </div>
  )

  if (mobile) {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="ld-bar-price flex-1 min-w-0">
            <strong>{days > 0 ? `₹${total}` : `₹${listing.price_day}`}</strong>
            <span>{isBookedOut ? 'Out of stock' : days > 0 ? `${days} day${days === 1 ? '' : 's'} incl. deposit` : '/day · tap to rent'}</span>
          </div>
          <button
            type="button"
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => {
              if (isBookedOut) {
                showToast('This item is currently booked out.', 'error')
                return
              }
              if (!isAuthenticated) {
                navigate('/login', { state: { from: { pathname: `/listing/${listing.id}?rent=1` } } })
                return
              }
              if (needsKyc(profile)) {
                navigate('/kyc', { state: { from: { pathname: `/listing/${listing.id}?rent=1` } } })
                return
              }
              setSheetOpen(true)
            }}
            aria-label={isBookedOut ? 'Item is booked out' : isAuthenticated ? 'Open rent form' : 'Sign in to rent'}
            disabled={isBookedOut}
          >
            {isBookedOut ? 'Booked Out' : 'Rent now'}
          </button>
        </div>
        {sheetOpen ? createPortal(
          <>
            <button type="button" className="listing-sheet-backdrop" aria-label="Close rent form" onClick={() => setSheetOpen(false)} />
            <div className="listing-sheet" role="dialog" aria-modal="true" aria-label="Rent this listing">
              <div className="listing-sheet__head">
                <p>Rent this gear</p>
                <button type="button" className="btn-outline" onClick={() => setSheetOpen(false)} aria-label="Close rent form">
                  <X size={16} /> Close
                </button>
              </div>
              {formCard}
            </div>
          </>,
          document.body
        ) : null}
      </>
    )
  }

  return formCard
}

export default function ListingDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { listing, loading, error } = useListingById(id)
  const { user, isAdmin } = useAuth()
  const { showToast } = useToast()
  const [saved, setSaved] = useState(false)
  const [reviews, setReviews] = useState([])
  const [similar, setSimilar] = useState([])
  const [panel, setPanel] = useState('about')
  const [howStep, setHowStep] = useState(0)
  const [maintLogs, setMaintLogs] = useState([])
  const [maintModalOpen, setMaintModalOpen] = useState(false)
  const [listingGames, setListingGames] = useState([])
  const wantRent = params.get('rent') === '1'

  const loadMaint = async (listingId) => {
    if (!listingId) return
    const logs = await fetchMaintenanceLogs(listingId)
    setMaintLogs(logs)
  }

  useEffect(() => {
    if (listing?.id) {
      loadMaint(listing.id)
      fetchListingGames(listing.id, listing).then((loaded) => {
        if (Array.isArray(loaded)) setListingGames(loaded)
      })
    }
  }, [listing?.id])

  useEffect(() => {
    if (!id) return
    setSaved(readSaved().includes(id))
  }, [id])

  useEffect(() => {
    if (!id) return
    supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
      .eq('listing_id', id)
      .or('is_hidden.eq.false,is_hidden.is.null')
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data || []))
  }, [id])

  useEffect(() => {
    if (!listing) return
    supabase
      .from('listings')
      .select('*, profiles(full_name, rating, kyc_status)')
      .eq('category', listing.category)
      .eq('is_available', true)
      .eq('is_published', true)
      .neq('id', listing.id)
      .limit(3)
      .then(({ data }) => setSimilar(data || []))
  }, [listing])

  useEffect(() => {
    if (!wantRent || !listing) return
    const desktop = window.matchMedia('(min-width: 1024px)').matches
    if (desktop) {
      document.getElementById('rent-now')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    const next = new URLSearchParams(params)
    next.delete('rent')
    setParams(next, { replace: true })
  }, [wantRent, listing, params, setParams])

  const toggleSave = () => {
    const next = saved
      ? readSaved().filter((row) => row !== id)
      : [...readSaved(), id]
    localStorage.setItem(SAVED_KEY, JSON.stringify(next))
    setSaved(!saved)
    showToast(saved ? 'Removed from saved' : 'Saved for later', 'success')
  }

  const handleShare = async () => {
    const url = window.location.href.replace(/\?rent=1/, '')
    try {
      if (navigator.share) {
        await navigator.share({ title: listing?.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      showToast('Link copied', 'success')
    } catch {
      showToast('Share cancelled', 'info')
    }
  }

  const isGaming = listing?.category === 'gaming'
  const canViewHidden = isAdmin || user?.id === listing?.user_id
  const isHiddenFromPublic = listing && listing.is_published === false && !canViewHidden
  const stock = listing?.stock_qty ?? 1

  if (loading) {
    return (
      <div className={`ld${isGaming === false ? ' is-music' : ''}`}>
        <div className="grid-floor" />
        <GameBackground />
        <div className="ld-wrap"><div className="ld-skel" /></div>
      </div>
    )
  }

  if (error || !listing || isHiddenFromPublic) {
    return (
      <div className="ld">
        <div className="grid-floor" />
        <GameBackground />
        <div className="ld-miss">
          <h2 className="font-bungee text-white text-2xl mb-3">Listing not found</h2>
          <button type="button" onClick={() => navigate('/browse')} className="btn-primary" aria-label="Browse listings">
            Browse listings
          </button>
        </div>
      </div>
    )
  }

  const lister = listing.profiles
  const applyPriceChip = (kind) => {
    const el = document.getElementById('rent-now')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.dispatchEvent(new CustomEvent('ld-quick-date', { detail: kind }))
  }

  return (
    <div className={`ld${isGaming ? ' is-gaming' : ' is-music'}`}>
      <SEOHead
        title={listing?.title}
        description={listing?.description || `Rent ${listing?.title} in Bangalore for ₹${listing?.price_day}/day.`}
        image={listing?.photos?.[0]}
      />
      <div className="grid-floor" />
      <GameBackground />

      <div className="ld-wrap">
        <div className="ld-top">
          <button type="button" className="ld-back" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="ld-icon-row">
            <button type="button" className={`ld-icon-btn${saved ? ' is-on' : ''}`} onClick={toggleSave} aria-label={saved ? 'Unsave listing' : 'Save listing'}>
              <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button type="button" className="ld-icon-btn" onClick={handleShare} aria-label="Share listing">
              <Share2 size={16} />
            </button>
          </div>
        </div>

        <div className="ld-grid">
          <div className="ld-main">
            <PhotoGallery photos={listing.photos} emoji={listing.emoji} title={listing.title} />

            <div className="ld-pills">
              <span className={isGaming ? 'tag-gaming' : 'tag-music'}>
                {isGaming ? '🎮' : '🎵'} {listing.subcategory}
              </span>
              {listing.condition ? <span className="ld-pill">{conditionLabel(listing.condition)}</span> : null}
              {listing.is_available && stock > 0 ? (
                <span className="ld-pill is-ok">Available{stock <= 1 ? ' · last one' : ` · ${stock} left`}</span>
              ) : (
                <span className="ld-pill is-bad">Booked out</span>
              )}
              {listing.deposit_amount ? <span className="ld-pill is-warn">Deposit ₹{listing.deposit_amount}</span> : null}
            </div>

            <h1>{listing.title}</h1>
            <div className="ld-meta">
              {listing.rating > 0 ? (
                <span className="is-gold">
                  <Star size={14} /> {listing.rating} ({listing.total_reviews} reviews)
                </span>
              ) : null}
              <span><MapPin size={14} /> {listing.location}, Bangalore</span>
            </div>

            {/* Gamification Trust & Performance Badges */}
            <TrustBadges profile={lister} listing={listing} />

            <div className="ld-prices">
              {[
                { key: 'tonight', label: 'Per Day', price: listing.price_day, tone: '' },
                { key: 'weekend', label: 'Weekend', price: listing.price_weekend, tone: 'is-gold' },
                { key: 'week', label: 'Per Week', price: listing.price_week, tone: 'is-green' },
              ].filter((row) => row.price).map((row) => (
                <button
                  key={row.key}
                  type="button"
                  className={`ld-price ${row.tone}`}
                  onClick={() => applyPriceChip(row.key)}
                  aria-label={`Rent ${row.label.toLowerCase()} for ₹${row.price}`}
                >
                  <strong>₹{row.price}</strong>
                  <span>{row.label} · tap to fill dates</span>
                </button>
              ))}
            </div>

            {/* Available PS5 / Gaming Bundle Games */}
            {listingGames.length > 0 && (
              <ListingGamesDisplay games={listingGames} />
            )}

            <div className="ld-tabs" role="tablist" aria-label="Listing sections">
              {[
                { id: 'about', label: 'About' },
                { id: 'specs', label: 'Details' },
                { id: 'maint', label: `Servicing (${maintLogs.length})` },
                { id: 'howto', label: 'How rent works' },
                { id: 'reviews', label: `Reviews (${reviews.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={`ld-tab${panel === tab.id ? ' is-on' : ''}`}
                  aria-selected={panel === tab.id}
                  onClick={() => setPanel(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {panel === 'about' ? (
              <div className="ld-card">
                <h3>ABOUT THIS ITEM</h3>
                <p>
                  {(listing.description || '').replace(/\s*\[GAMES:.*?\]/gi, '').trim() || 'No write-up yet. Ask the lister on handover.'}
                </p>
              </div>
            ) : null}

            {panel === 'specs' ? (
              <div className="ld-card">
                <h3>ITEM DETAILS</h3>
                <div className="ld-specs">
                  {[
                    ['Category', isGaming ? 'Gaming' : 'Music'],
                    ['Type', listing.subcategory],
                    ['Brand', listing.brand || '—'],
                    ['Model', listing.model || '—'],
                    ['Condition', conditionLabel(listing.condition)],
                    ['Deposit', `₹${listing.deposit_amount || 5000}`],
                    ['Stock', `${listing.stock_qty ?? 1} / ${listing.stock_total ?? listing.stock_qty ?? 1}`],
                    ['Area', listing.location || 'Bangalore'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label.toUpperCase()}</span>
                      <b>{value}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {panel === 'maint' ? (
              <div className="ld-card space-y-4">
                <div className="flex items-center justify-between">
                  <h3>🛠️ VERIFIED MAINTENANCE & SERVICING LOGS</h3>
                  {user?.id === listing.user_id && (
                    <button
                      type="button"
                      onClick={() => setMaintModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all"
                    >
                      + Record Service Log
                    </button>
                  )}
                </div>

                {maintLogs.length === 0 ? (
                  <p className="text-xs text-white/50 italic">No formal servicing logs recorded yet by the owner.</p>
                ) : (
                  <div className="space-y-3">
                    {maintLogs.map((log) => {
                      const serviceDef = MAINTENANCE_TYPES.find((t) => t.id === log.service_type)
                      return (
                        <div key={log.id} className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-display">
                          <div className="flex items-center justify-between mb-1">
                            <strong className="text-amber-400 font-bold">{serviceDef?.label || log.service_type}</strong>
                            <span className="text-white/40 text-[10px]">{log.serviced_at}</span>
                          </div>
                          {log.notes && <p className="text-white/70 text-[11px] mt-1">{log.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {panel === 'howto' ? (
              <div className="ld-card">
                <h3>HOW RENT WORKS</h3>
                <div className="ld-how">
                  {HOW_STEPS.map((item, i) => (
                    <button
                      key={item.title}
                      type="button"
                      className={howStep === i ? 'is-on' : ''}
                      onClick={() => setHowStep(i)}
                      aria-pressed={howStep === i}
                    >
                      <b>{i + 1}</b>
                      <span>
                        <strong>{item.title}</strong>
                        <span>{item.body}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {panel === 'reviews' ? (
              <div className="ld-card">
                <h3>REVIEWS</h3>
                {reviews.length === 0 ? (
                  <div className="ld-empty">No reviews yet — be first to rent this.</div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="ld-review">
                      <div className="ld-review__top">
                        <strong>{review.reviewer?.full_name || 'Renter'}</strong>
                        <em>{'★'.repeat(review.rating || 0)}{'☆'.repeat(5 - (review.rating || 0))}</em>
                      </div>
                      {review.comment ? <p>{review.comment}</p> : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}

            <div className="ld-card">
              <h3>LISTED BY</h3>
              <div 
                className="ld-lister cursor-pointer hover:bg-white/5 p-2 -m-2 rounded-xl transition-all" 
                onClick={() => {
                  const listerId = listing.user_id || listing.lister_id || listing.profiles?.id
                  if (listerId) navigate(`/lister/${listerId}`)
                }}
              >
                <div className="ld-lister__face">
                  {lister?.avatar_url
                    ? <img src={lister.avatar_url} alt="" />
                    : (lister?.full_name?.[0]?.toUpperCase() || <User size={20} />)}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-white font-bold text-sm">{lister?.full_name || 'Anonymous'}</strong>
                    {lister?.kyc_status === 'verified' ? (
                      <span className="ld-pill is-ok font-bold text-[11px] inline-flex items-center gap-1"><Shield size={11} /> Verified</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-white/50 m-0">Member since {new Date(listing.created_at).getFullYear()}</p>
                </div>
              </div>
            </div>

            {similar.length > 0 ? (
              <div>
                <h3 className="ld-card-title">SIMILAR GEAR</h3>
                <div className="ld-similar">
                  {similar.map((row) => <ListingCard key={row.id} listing={row} />)}
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden lg:block">
            <BookingWidget listing={listing} forceOpen={wantRent} />
          </div>
        </div>

        <div className="lg:hidden listing-mobile-bar">
          <BookingWidget listing={listing} mobile forceOpen={wantRent} />
        </div>
        <div className="lg:hidden listing-mobile-spacer" />
      </div>

      {maintModalOpen && (
        <MaintenanceLogModal
          listing={listing}
          onClose={() => setMaintModalOpen(false)}
          onSaved={() => loadMaint(listing.id)}
        />
      )}
    </div>
  )
}
