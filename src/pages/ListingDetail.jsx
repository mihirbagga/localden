import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Star, Shield, Calendar,
  ChevronLeft, ChevronRight, Share2, Heart,
  CheckCircle, AlertCircle, User, CreditCard, X, MessageSquare,
} from 'lucide-react'
import { SUPPORT_PHONE_TEL } from '../lib/contact'
import { MESSAGES, getHandoverPin } from '../lib/messages'
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
import { formatLocationDisplay } from '../lib/cities'
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
import {
  calculateDeliveryFee,
  fetchWarehouseSettings,
  DEFAULT_WAREHOUSE_SETTINGS,
} from '../lib/deliveryFee'
import {
  formatCustomerConfirmationMessage,
  formatListerNewOrderMessage,
  buildWhatsAppLink,
  notifyAdminOnNewOrder,
} from '../lib/whatsappSmsService'
import './terms.css'
import './couponApply.css'
import './listingDetail.css'
import './listingDetail-progress.css'

const SAVED_KEY = 'ldSaved'
const RAZORPAY_ENABLED = import.meta.env.VITE_ENABLE_RAZORPAY === 'true'
const HOW_STEPS = [
  { title: '1. Pick your dates', body: 'Available dates are selectable on the calendar. Pricing & duration discounts update live.' },
  { title: '2. Secure checkout', body: 'Apply promo codes and pay via UPI, QR, Razorpay, Wallet, or cash on handover.' },
  { title: '3. Handover & play', body: 'Choose self-pickup or doorstep delivery. Quick check-in photos keep both sides protected.' },
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

function HoldCountdown({ expiresAt, onExpire }) {
  const [left, setLeft] = useState(() => Math.max(0, expiresAt - Date.now()))
  const expiredRef = useRef(false)

  useEffect(() => {
    expiredRef.current = false
    const tick = () => {
      const ms = Math.max(0, expiresAt - Date.now())
      setLeft(ms)
      if (ms <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [expiresAt, onExpire])

  const total = Math.ceil(left / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return <b className={`ld-hold__time${total <= 60 ? ' is-urgent' : ''}`}>{mm}:{ss}</b>
}

function BookingWidget({ listing, mobile = false, forceOpen = false }) {
  const { isAuthenticated, user, profile, isBanned } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { openCheckout, loading: rzpLoading } = useRazorpay()
  const { methods: allPayMethods } = usePaymentMethods({ enabledOnly: true })
  // Free payment modes by default — gateways like Razorpay charge a per-transaction fee.
  // Set VITE_ENABLE_RAZORPAY=true to also offer admin-enabled Razorpay methods.
  const payMethods = useMemo(
    () => (allPayMethods || []).filter((m) => m.method_type !== 'razorpay' || RAZORPAY_ENABLED),
    [allPayMethods]
  )
  const { wallet, refresh: refreshWallet } = useWallet()
  const walletMethod = { id: 'wallet', name: 'Wallet', method_type: 'wallet' }
  const { coupons: openCoupons } = useAvailableCoupons()
  const { fee: platformFeeSetting } = usePlatformFee()

  const isOwner = isAuthenticated && user?.id === listing.user_id
  const today = todayIso()
  const uid = mobile ? 'm' : 'd'
  const units = listingUnits(listing)
  const rawAvailable = listing.is_available ?? listing.available ?? true
  const isBookedOut = rawAvailable === false
  const outOfStock = isBookedOut

  const { busy } = useBusyDates(listing.id, units, !isBookedOut)
  const busyRef = useRef(busy)
  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  const [warehouseSettings, setWarehouseSettings] = useState(DEFAULT_WAREHOUSE_SETTINGS)
  useEffect(() => {
    fetchWarehouseSettings().then((s) => s && setWarehouseSettings(s))
  }, [])

  const [params] = useSearchParams()

  const [startDate, setStartDate] = useState(() => params.get('from') || '')
  const [endDate, setEndDate] = useState(() => params.get('to') || '')

  useEffect(() => {
    const f = params.get('from')
    const t = params.get('to')
    if (f) setStartDate(f)
    if (t) setEndDate(t)
  }, [params])
  const [quick, setQuick] = useState('')
  const [booking, setBooking] = useState(null)
  const [payError, setPayError] = useState('')
  const [saving, setSaving] = useState(false)
  // Slot hold for an online payment that has been started but not completed yet
  const [hold, setHold] = useState(null)
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
  const [couponTouched, setCouponTouched] = useState(false)
  const [showCouponBox, setShowCouponBox] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [bookingTab, setBookingTab] = useState('plan') // 'plan' | 'pay'
  // Short code placed in the UPI payment note so admins can match payments without a UTR.
  // 8 chars of A-Z/0-9 so it also satisfies the server's UTR format check.
  const [payCode] = useState(() => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    const bytes = new Uint8Array(6)
    crypto.getRandomValues(bytes)
    return `LD${Array.from(bytes, (b) => chars[b % chars.length]).join('')}`
  })

  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000))
    : 0
  const deposit = listing.deposit_amount != null ? Math.max(0, Number(listing.deposit_amount)) : 0
  const protectionCost = calculateProtectionCost(protectionPlan, days, protectionSettings)
  const priced = priceWithCoupon({
    days,
    priceDay: listing.price_day,
    deposit,
    coupon: appliedCoupon,
    fee: platformFeeSetting,
    protectionCost,
  })

  // Proactively fetch official server quote so client is always 100% in sync with database
  const [serverQuote, setServerQuote] = useState(null)

  useEffect(() => {
    if (!startDate || !endDate || !listing?.id || days <= 0) {
      setServerQuote(null)
      return
    }
    let cancelled = false
    supabase.rpc('quote_booking', {
      p_listing_id: listing.id,
      p_start_date: startDate,
      p_end_date: endDate,
      p_coupon_code: appliedCoupon?.code || null,
      p_protection_plan: protectionPlan || 'none',
    }).then(({ data, error }) => {
      if (!cancelled && !error && data && data.total != null) {
        setServerQuote(data)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [listing?.id, startDate, endDate, appliedCoupon?.code, protectionPlan, days])

  const subtotal = serverQuote?.subtotal ?? priced.subtotal
  const durationDiscount = serverQuote?.duration_discount ?? priced.durationDiscount
  const couponDiscount = serverQuote?.coupon_discount ?? priced.couponDiscount
  const totalDiscount = serverQuote?.discount_total ?? priced.totalDiscount
  const platformFee = serverQuote?.platform_fee ?? priced.platformFee
  const baseOrderTotal = serverQuote?.total ?? priced.total

  // Dynamic distance delivery calculation from warehouse hub
  const deliveryCalc = useMemo(() => {
    if (handover !== 'delivery') {
      return { deliveryFee: 0, distanceKm: 0, isFree: false, isServiceable: true, printNote: '', warehouseName: '' }
    }
    return calculateDeliveryFee({
      address,
      listingLocation: listing?.location || '',
      orderSubtotal: subtotal,
      settings: warehouseSettings,
    })
  }, [handover, address, listing?.location, subtotal, warehouseSettings])

  const deliveryFee = handover === 'delivery' ? deliveryCalc.deliveryFee : 0
  const grandTotal = Math.max(0, baseOrderTotal + deliveryFee)
  const total = grandTotal

  // Wallet Hybrid Split Payment
  const [useWalletBalance, setUseWalletBalance] = useState(true)
  const walletAvailable = Number(wallet?.available || 0)
  const walletDeduction = useWalletBalance && walletAvailable > 0
    ? Math.min(walletAvailable, grandTotal)
    : 0
  const remainingPayable = Math.max(0, grandTotal - walletDeduction)
  const isFullWalletPaid = walletDeduction > 0 && remainingPayable === 0
  const canWallet = isFullWalletPaid

  const selectedPay = isFullWalletPaid || payMethodId === 'wallet'
    ? walletMethod
    : (payMethods.find((m) => m.id === payMethodId) || payMethods[0] || (canWallet ? walletMethod : null))

  const applyRange = (from, to, chip) => {
    if (isBookedOut) {
      showToast('This item is currently booked out and unavailable for rent.', 'error')
      return
    }
    if (from && to && rangeHasBusy(from, to, busyRef.current)) {
      showToast('⚠️ Selected dates overlap an existing booking. Please pick available dates.', 'error')
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
    if (payMethodId) return
    const preferred = payMethods.find((m) => m.method_type === 'qr' || m.method_type === 'upi') || payMethods[0]
    if (preferred) setPayMethodId(preferred.id)
  }, [payMethodId, payMethods])

  const isUpiLike = ['qr', 'upi', 'bank'].includes(selectedPay?.method_type)
  // UTR is optional: when skipped, the pay code (also placed in the UPI note) is sent instead.
  const effectivePaymentRef = isUpiLike ? (paymentRef.trim() || payCode) : paymentRef.trim()

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

  const buildConfirmation = (rpc, method, extra = {}) => {
    const walletPart = Number(rpc.wallet_amount || 0)
    return {
      id: rpc.booking_id,
      startDate,
      endDate,
      days: rpc.days || days,
      subtotal: rpc.subtotal ?? subtotal,
      deliveryFee: rpc.delivery_fee ?? deliveryFee,
      distanceKm: deliveryCalc.distanceKm,
      warehouseNote: deliveryCalc.printNote,
      deposit: rpc.deposit ?? deposit,
      protectionCost: rpc.protection_cost ?? protectionCost,
      walletAmount: walletPart,
      paidAmount: rpc.amount_due ?? rpc.total,
      total: rpc.total,
      couponCode: rpc.coupon_code || appliedCoupon?.code,
      discount: rpc.discount_total ?? totalDiscount,
      methodName: walletPart > 0 && Number(rpc.amount_due) > 0
        ? `Wallet (₹${walletPart}) + ${method?.name || 'UPI'}`
        : (method?.name || 'Direct UPI'),
      deliveryType: handover,
      deliveryAddress: handover === 'delivery' ? address : null,
      paymentRef: effectivePaymentRef,
      paid: rpc.payment_status === 'paid',
      paymentStatus: rpc.payment_status,
      ...extra,
    }
  }

  const finishBooking = async (confirmation, method, rpc) => {
    await updateBookingTracking(confirmation.id, { tracking_status: 'awaiting_confirmation' })
    setSaving(false)
    setBooking(confirmation)

    notifyAdminOnNewOrder({
      bookingId: confirmation.id,
      listing,
      renter: user,
      startDate,
      endDate,
      days: confirmation.days,
      total: confirmation.total,
      paymentStatus: confirmation.paymentStatus,
      paymentMethod: method?.name || method?.id,
      deliveryType: handover,
      deliveryAddress: handover === 'delivery' ? address : null,
      couponCode: confirmation.couponCode,
    }).catch((err) => console.warn('WhatsApp notify error:', err))

    if (confirmation.paid) {
      showToast('Booking confirmed & paid!', 'success')
    } else if (confirmation.paymentStatus === 'submitted') {
      showToast('Payment reference submitted! Verification in progress.', 'success')
    } else {
      showToast('Booking placed! Awaiting confirmation.', 'success')
    }
  }

  const releaseHold = async () => {
    const current = hold
    setHold(null)
    if (!current) return
    try {
      await supabase.rpc('cancel_pending_hold', { p_booking_id: current.bookingId })
    } catch (err) {
      console.warn('cancel_pending_hold:', err?.message)
    }
    refreshWallet?.()
  }

  const handleHoldExpired = useCallback(async () => {
    setHold(null)
    setPayError('Your hold on these dates expired. Please book again to continue.')
    showToast('Hold expired. The dates were released.', 'info')
    try { await supabase.rpc('release_expired_holds') } catch { /* cleanup runs on the next booking anyway */ }
    refreshWallet?.()
  }, [refreshWallet, showToast])

  const confirmOnlinePayment = async (current, response) => {
    setSaving(true)
    let status = null
    try {
      const { data, error } = await supabase.functions.invoke('razorpay-verify', {
        body: {
          booking_id: current.bookingId,
          razorpay_order_id: response?.razorpay_order_id,
          razorpay_payment_id: response?.razorpay_payment_id,
          razorpay_signature: response?.razorpay_signature,
        },
      })
      if (!error) status = data?.status || null
    } catch (err) {
      console.warn('razorpay-verify:', err?.message)
    }

    // The webhook is the safety net: wait briefly for it if instant verification failed.
    for (let i = 0; i < 8 && status !== 'paid' && status !== 'already_paid' && status !== 'needs_refund'; i += 1) {
      await new Promise((r) => setTimeout(r, 2500))
      const { data } = await supabase
        .from('bookings')
        .select('payment_status')
        .eq('id', current.bookingId)
        .maybeSingle()
      if (data?.payment_status === 'paid') status = 'paid'
    }

    setHold(null)

    if (status === 'needs_refund') {
      setSaving(false)
      const msg = 'Your payment reached us after the hold expired and the dates were taken. It will be refunded automatically.'
      setPayError(msg)
      showToast(msg, 'error')
      return
    }

    const paid = status === 'paid' || status === 'already_paid'
    await finishBooking(
      { ...current.confirmation, paid, paymentStatus: paid ? 'paid' : 'submitted' },
      current.method,
    )
  }

  const launchCheckout = async (current) => {
    setPayError('')
    setSaving(true)
    let order = null
    try {
      const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
        body: { booking_id: current.bookingId },
      })
      if (error || !data?.order_id) throw new Error(data?.error || error?.message || 'Could not start the payment.')
      order = data
    } catch (err) {
      setSaving(false)
      setPayError(err.message)
      showToast(err.message, 'error')
      return
    }
    setSaving(false)

    await openCheckout({
      orderId: order.order_id,
      amount: order.amount / 100,
      name: listing.title,
      description: `${days} day${days > 1 ? 's' : ''} rental · ${startDate} to ${endDate}`,
      keyId: order.key_id || methodConfig(current.method).key_id,
      prefill: {
        name: profile?.full_name || '',
        email: user?.email || '',
        contact: profile?.phone || '',
      },
      notes: { booking_id: current.bookingId },
      onSuccess: (_paymentId, response) => confirmOnlinePayment(current, response),
      onFailure: (err) => {
        // Hold stays active so the renter can retry before the timer ends.
        if (err.message !== 'Payment dismissed') {
          const msg = err.description || err.message || 'Payment could not be completed. Please try again.'
          setPayError(msg)
          showToast(msg, 'error')
        }
      },
    })
  }

  const saveBooking = async ({ method }) => {
    setSaving(true)
    setPayError('')

    // One atomic server call: prices, stock/dates, wallet split and the booking row.
    const { data: rpc, error: rpcError } = await supabase.rpc('create_booking', {
      p_listing_id: listing.id,
      p_start_date: startDate,
      p_end_date: endDate,
      p_payment_method: method?.id || 'cash',
      p_payment_ref: effectivePaymentRef || null,
      p_coupon_code: appliedCoupon?.code || null,
      p_protection_plan: protectionPlan || 'none',
      p_delivery_type: handover,
      p_delivery_address: handover === 'delivery' ? address.trim() || null : null,
      p_expected_total: total,
      p_use_wallet: walletDeduction > 0,
      p_delivery_fee: deliveryFee,
      p_delivery_distance_km: deliveryCalc.distanceKm || 0,
      p_warehouse_note: deliveryCalc.printNote || null,
    })

    if (rpcError || !rpc?.booking_id) {
      setSaving(false)
      const raw = rpcError?.message || 'Booking failed.'
      const match = raw.match(/PRICE_CHANGED: the total is now ₹(\d+)/i)
      if (match) {
        const newTotal = parseInt(match[1], 10)
        setServerQuote((prev) => (prev ? { ...prev, total: newTotal - deliveryFee } : { total: newTotal - deliveryFee }))
        const reviewMsg = `Total updated to ₹${newTotal}. Review and tap to confirm.`
        setPayError(reviewMsg)
        showToast(reviewMsg, 'info')
        return
      }
      const missing = /does not exist|could not find the function/i.test(raw)
      const msg = missing
        ? 'Booking is being updated. Please try again in a few minutes.'
        : /already booked/i.test(raw)
          ? 'Those dates were just booked. Pick another range.'
          : raw
      setPayError(msg)
      showToast(msg, 'error')
      return
    }

    if (Number(rpc.wallet_amount) > 0) refreshWallet?.()

    // Online payment: the booking already exists and holds the dates. Pay inside the hold window.
    if (rpc.requires_payment) {
      setSaving(false)
      const current = {
        bookingId: rpc.booking_id,
        method,
        amountDue: rpc.amount_due,
        expiresAt: Date.now() + Number(rpc.hold_seconds || 600) * 1000,
        confirmation: buildConfirmation(rpc, method, { paid: false, paymentStatus: 'pending' }),
      }
      setHold(current)
      await launchCheckout(current)
      return
    }

    await finishBooking(buildConfirmation(rpc, method), method, rpc)
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
    showToast(`Promo "${coupon.code}" applied! Discount reflected below.`, 'success')
    return true
  }

  const applyCoupon = async () => {
    const code = normalizeCouponCode(couponInput)
    if (!code) {
      showToast(MESSAGES.coupon.enterCode, 'error')
      return
    }
    if (days < 1) {
      showToast(MESSAGES.booking.selectDates, 'error')
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
      showToast(error.message || MESSAGES.coupon.invalid, 'error')
      return
    }
    tryApplyCoupon(data)
  }

  const clearCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponTouched(true)
    showToast(MESSAGES.coupon.removed, 'info')
  }

  useEffect(() => {
    if (!appliedCoupon || days < 1) return
    const invalid = validateCoupon(appliedCoupon, days * (listing.price_day || 0), user?.id)
    if (!invalid) return
    setAppliedCoupon(null)
    showToast(invalid, 'error')
  }, [appliedCoupon, days, listing.price_day, showToast])

  // Auto-apply the best valid coupon so renters never have to hunt for a code.
  useEffect(() => {
    if (couponTouched || appliedCoupon || days < 1 || !openCoupons?.length) return
    const base = days * (listing.price_day || 0)
    let best = null
    let bestOff = 0
    for (const c of openCoupons) {
      if (validateCoupon(c, base, user?.id)) continue
      const off = priceWithCoupon({
        days,
        priceDay: listing.price_day,
        deposit,
        coupon: c,
        fee: platformFeeSetting,
        protectionCost,
      }).couponDiscount
      if (off > bestOff) { best = c; bestOff = off }
    }
    if (best) {
      setAppliedCoupon(best)
      setCouponInput(best.code)
    }
  }, [couponTouched, appliedCoupon, days, openCoupons, listing.price_day, deposit, platformFeeSetting, protectionCost, user?.id])

  const handleBook = async () => {
    if (bookingTab === 'plan') {
      if (outOfStock) {
        showToast(MESSAGES.booking.outOfStock, 'error')
        return
      }
      if (!startDate || !endDate || days < 1) {
        showToast(MESSAGES.booking.selectDates, 'error')
        return
      }
      if (rangeHasBusy(startDate, endDate, busyRef.current)) {
        showToast(MESSAGES.booking.datesUnavailable, 'error')
        return
      }
      if (handover === 'delivery' && !address.trim()) {
        showToast('Please enter your delivery address to proceed.', 'error')
        return
      }
      setBookingTab('pay')
      return
    }

    // A payment window is already open for these dates: reopen it instead of creating a second booking.
    if (hold) {
      await launchCheckout(hold)
      return
    }

    if (!isAuthenticated) {
      showToast(MESSAGES.auth.loginRequiredBook, 'info')
      navigate('/login', { state: { from: { pathname: `/listing/${listing.id}?rent=1` } } })
      return
    }
    if (isBanned) {
      showToast('Your account is currently restricted. Please contact support for assistance.', 'error')
      return
    }
    if (isOwner) {
      showToast(MESSAGES.booking.cannotRentOwn, 'error')
      return
    }
    if (needsKyc(profile)) {
      showToast(MESSAGES.booking.kycRequired, 'info')
      navigate('/kyc', { state: { from: { pathname: `/listing/${listing.id}?rent=1` } } })
      return
    }
    if (outOfStock) {
      showToast(MESSAGES.booking.outOfStock, 'error')
      return
    }
    if (!startDate || !endDate || days < 1) {
      setBookingTab('plan')
      showToast(MESSAGES.booking.selectDates, 'error')
      return
    }
    if (rangeHasBusy(startDate, endDate, busyRef.current)) {
      setBookingTab('plan')
      showToast(MESSAGES.booking.datesUnavailable, 'error')
      return
    }
    if (handover === 'delivery' && !address.trim()) {
      setBookingTab('plan')
      showToast('Please enter your delivery address.', 'error')
      return
    }
    if (!acceptTerms) {
      showToast('Please tick the box to accept the rental terms.', 'error')
      return
    }
    if (!selectedPay && payMethodId !== 'wallet') {
      showToast('No payment method is currently active. Please reach out to support.', 'error')
      return
    }
    if (payMethodId === 'wallet' && !canWallet) {
      showToast('Your wallet balance is lower than the booking total. Choose another payment method or top up.', 'error')
      return
    }
    setPayError('')

    if (payMethodId === 'wallet' || selectedPay?.id === 'wallet') {
      await saveBooking({ method: walletMethod })
      return
    }

    // UTR is optional for manual modes — the pay code in the UPI note is used for matching when it's skipped.
    // Online modes are pending-first: saveBooking holds the dates, then opens the gateway.
    await saveBooking({ method: selectedPay })
    return

  }

  if (isOwner && mobile) {
    return <p className="ld-hint">Your listing · Share link with renters</p>
  }

  if (isOwner) {
    return (
      <div className="glass ld-book ld-owner is-sticky" id="rent-now">
        <div className="text-4xl" aria-hidden="true">🏠</div>
        <h3>This is Your Gear</h3>
        <p>Share this page with renters in your city or manage availability and stock from your Dashboard.</p>
        <ShareLinkBox />
        <Link to="/dashboard?tab=listings" className="btn-outline w-full">Manage in My Dashboard</Link>
      </div>
    )
  }

  if (booking) {
    const handoverPin = getHandoverPin(booking.id)
    const waSupportMsg = `Hi LocalDen! I just placed a booking for *${listing?.title || 'gear'}* (Order #${String(booking.id).slice(0, 8).toUpperCase()} · Handover PIN: ${handoverPin}). Dates: ${booking.startDate} → ${booking.endDate}. Total: ₹${booking.total}. Need assistance with my order.`
    const waSupportLink = buildWhatsAppLink(SUPPORT_PHONE_TEL, waSupportMsg)

    const successCard = (
      <div className="glass ld-book ld-success is-sticky">
        <CheckCircle size={36} />
        <h3>{booking.paid ? 'Booking Confirmed!' : 'Booking Request Received!'}</h3>
        <p>
          {booking.paid
            ? 'Your payment is verified! We have notified the lister and hub team to prepare your handover.'
            : 'Your payment reference is logged! Our team will verify the transfer shortly and confirm your handover.'}
        </p>

        {/* 4-Digit Handover OTP PIN Card */}
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 my-2.5 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-300 block">
              🔐 4-Digit Handover OTP
            </span>
            <span className="text-[11px] text-white/60">
              Share with host/rider only when receiving gear
            </span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-black/50 border border-cyan-400/40 font-mono text-lg font-extrabold tracking-[0.25em] text-cyan-300">
            {handoverPin}
          </div>
        </div>

        {/* WhatsApp Notification confirmation pill */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold my-2">
          <MessageSquare size={14} className="text-emerald-400 shrink-0" />
          <span>Instant order alert sent to Local Den dispatch on WhatsApp!</span>
        </div>

        <div className="ld-facts">
          <div><span>Order Reference</span><b>#{String(booking.id).slice(0, 8).toUpperCase()}</b></div>
          <div><span>Rental Dates</span><b>{booking.startDate} → {booking.endDate}</b></div>
          <div><span>Rental Base</span><b>₹{booking.subtotal || 0} ({booking.days}d)</b></div>
          {booking.deliveryFee > 0 && (
            <div><span>Delivery Charge</span><b className="text-cyan-300">+₹{booking.deliveryFee} (~{booking.distanceKm} km)</b></div>
          )}
          {booking.deposit > 0 && (
            <div><span>Refundable Deposit</span><b>+₹{booking.deposit}</b></div>
          )}
          {booking.couponCode ? <div><span>Promo Applied</span><b className="text-emerald-400">{booking.couponCode} (−₹{booking.discount})</b></div> : null}
          {booking.walletAmount > 0 && (
            <div><span>Wallet Deducted</span><b className="text-emerald-400">−₹{booking.walletAmount}</b></div>
          )}
          <div>
            <span>{booking.walletAmount > 0 ? 'Balance Paid via UPI' : 'Total Amount'}</span>
            <b className="text-white font-bold">₹{booking.paidAmount || booking.total}</b>
          </div>
          {booking.warehouseNote && (
            <div className="text-[10px] text-white/50 pt-1 border-t border-white/10">
              <span>Dispatch Note</span>
              <span className="text-right text-white/70">{booking.warehouseNote}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-3">
          <a
            href={waSupportLink}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] text-black font-bold text-xs hover:bg-[#20ba59] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#25D366]/20"
          >
            <MessageSquare size={14} />
            Chat with Team on WhatsApp
          </a>
          <Link to="/dashboard?tab=bookings" className="btn-primary w-full text-center">
            Track in My Bookings
          </Link>
        </div>
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
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-3">
          <span className="text-xl">🏬</span>
          <div>
            <p className="text-xs font-display font-bold text-cyan-300">Local Den Hub Dispatch (Koramangala)</p>
            <p className="text-[11px] font-display text-white/50 leading-tight">Pre-inspected &amp; verified hardware.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 mb-3">
          <span className="text-xl">🏠</span>
          <div>
            <p className="text-xs font-display font-bold text-white/80">Direct Handover (From Owner)</p>
            <p className="text-[11px] font-display text-white/40 leading-tight">{formatLocationDisplay(listing.location)}.</p>
          </div>
        </div>
      )}

      {isBookedOut ? (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 mb-3 space-y-1 text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-[11px]">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span>🚫 Unavailable</span>
          </div>
          <p className="text-white/70 font-display leading-relaxed">
            No units are currently available in stock. Dates are temporarily locked.
          </p>
        </div>
      ) : null}

      {/* Progress */}
      <div className="ld-progress" role="progressbar" aria-valuemin={1} aria-valuemax={3}
        aria-valuenow={bookingTab === 'pay' ? 2 : 1} aria-label="Booking progress">
        <span className="is-done" />
        <span className={days > 0 ? 'is-done' : ''} />
        <span className={bookingTab === 'pay' && days > 0 ? 'is-done' : ''} />
      </div>
      <p className="ld-progress__label">
        {bookingTab === 'pay' ? 'Step 2 of 2 · Pay & confirm' : days > 0 ? 'Step 1 of 2 · Review & continue' : 'Step 1 of 2 · Pick your dates'}
      </p>

      {/* 2 Tabs: Plan vs Pay */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10 mb-3" role="tablist" aria-label="Booking steps">
        <button
          type="button"
          role="tab"
          aria-selected={bookingTab === 'plan'}
          onClick={() => setBookingTab('plan')}
          className={`py-2 px-3 rounded-xl text-xs font-display font-bold flex items-center justify-center gap-1.5 transition-all ${
            bookingTab === 'plan'
              ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-cyan-200 border border-cyan-400/40 shadow-md shadow-cyan-500/10'
              : 'text-white/60 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Calendar size={13} className={bookingTab === 'plan' ? 'text-cyan-300' : 'text-white/50'} />
          <span>1. Plan Dates</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={bookingTab === 'pay'}
          onClick={() => {
            if (days <= 0) {
              showToast('Please select rental dates on the calendar first.', 'info')
              return
            }
            if (handover === 'delivery' && !address.trim()) {
              showToast('Please enter your delivery address to proceed.', 'info')
              return
            }
            setBookingTab('pay')
          }}
          className={`py-2 px-3 rounded-xl text-xs font-display font-bold flex items-center justify-center gap-1.5 transition-all ${
            bookingTab === 'pay'
              ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/20 text-emerald-200 border border-emerald-400/40 shadow-md shadow-emerald-500/10'
              : days > 0
                ? 'text-white/80 hover:text-white hover:bg-white/[0.02]'
                : 'text-white/35 cursor-not-allowed opacity-60'
          }`}
        >
          <CreditCard size={13} className={bookingTab === 'pay' ? 'text-emerald-300' : 'text-white/50'} />
          <span>2. Pay &amp; Confirm</span>
          {days > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
        </button>
      </div>

      {/* TAB 1: PLAN (Dates, Fulfillment, Protection & Coupons) */}
      {bookingTab === 'plan' && (
        <div className="space-y-3">
          {/* Quick Dates Presets */}
          <div className="ld-chips flex gap-1.5 flex-wrap" role="group" aria-label="Quick rental dates">
            <button
              type="button"
              disabled={isBookedOut}
              className={`ld-chip transition-all ${isBookedOut ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''} ${quick === 'tonight' ? ' is-on !border-cyan-400 !bg-cyan-500/20' : ''}`}
              onClick={() => applyRange(today, shiftIso(today, 1), 'tonight')}
            >
              ⚡ Tonight (1d)
            </button>
            <button
              type="button"
              disabled={isBookedOut}
              className={`ld-chip transition-all ${isBookedOut ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''} ${quick === 'weekend' ? ' is-on !border-magenta !bg-magenta/20' : ''}`}
              onClick={() => { const w = weekendRange(); applyRange(w.from, w.to, 'weekend') }}
            >
              🎉 Weekend
            </button>
            <button
              type="button"
              disabled={isBookedOut}
              className={`ld-chip transition-all ${isBookedOut ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''} ${quick === '3' ? ' is-on !border-orange-400 !bg-orange-500/20' : ''}`}
              onClick={() => applyRange(today, shiftIso(today, 3), '3')}
            >
              🔥 3 Days (5% OFF)
            </button>
            <button
              type="button"
              disabled={isBookedOut}
              className={`ld-chip transition-all ${isBookedOut ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''} ${quick === 'week' ? ' is-on !border-purple-400 !bg-purple-500/20' : ''}`}
              onClick={() => applyRange(today, shiftIso(today, 7), 'week')}
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

          {/* Handover Mode */}
          <div className="pt-1">
            <label className="field-label mb-1.5 block">HANDOVER &amp; FULFILLMENT</label>
            <div className="ld-hand" role="group" aria-label="Handover type">
              <button
                type="button"
                className={handover === 'pickup' ? 'is-on' : ''}
                onClick={() => setHandover('pickup')}
              >
                <span>🏠 Self Pickup</span>
                <span className="ml-1.5 text-[10px] opacity-75 font-semibold">FREE</span>
              </button>
              <button
                type="button"
                className={handover === 'delivery' ? 'is-on' : ''}
                onClick={() => setHandover('delivery')}
              >
                <span>🚚 Doorstep Delivery</span>
                <span className="ml-1.5 text-[10px] text-cyan-300 font-bold">
                  {warehouseSettings?.free_delivery_above > 0 && subtotal >= warehouseSettings.free_delivery_above
                    ? 'FREE'
                    : `from ₹${warehouseSettings?.base_fee || 99}`}
                </span>
              </button>
            </div>
            {handover === 'delivery' ? (
              <div className="mt-2 space-y-2">
                <DeliveryAddressForm value={address} onChange={setAddress} />
                {address.trim() && (
                  <div
                    className={`p-3 rounded-2xl border text-xs space-y-2 ${
                      deliveryCalc.isServiceable === false
                        ? 'bg-red-500/10 border-red-500/35'
                        : 'bg-cyan-500/10 border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-cyan-200 font-bold">
                        <span>🚚</span>
                        <span>Doorstep Delivery Quote</span>
                        {deliveryCalc.etaLabel && deliveryCalc.isServiceable !== false && (
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-amber-200 font-semibold">
                            ⚡ {deliveryCalc.etaLabel}
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-sm">
                        {deliveryCalc.isFree ? (
                          <span className="text-emerald-400">
                            {deliveryCalc.originalFee ? (
                              <s className="text-white/40 text-xs mr-1">₹{deliveryCalc.originalFee}</s>
                            ) : null}
                            FREE ✓
                          </span>
                        ) : (
                          <span className="text-cyan-300">+₹{deliveryFee}</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/65 flex-wrap gap-1">
                      <span>
                        📍 {deliveryCalc.warehouseName || 'Dispatch Hub'} →{' '}
                        <strong className="text-white/85">{deliveryCalc.resolvedArea || 'Your Address'}</strong> (~{deliveryCalc.distanceKm} km)
                      </span>
                      {!deliveryCalc.isFree && deliveryCalc.baseFee && (
                        <span className="text-[10px] text-white/50 font-mono">
                          Base ₹{deliveryCalc.baseFee} ({deliveryCalc.baseKm}km)
                          {deliveryCalc.extraKm > 0
                            ? ` + ${deliveryCalc.extraKm}km × ₹${deliveryCalc.perKmRate}`
                            : ''}
                        </span>
                      )}
                    </div>

                    {deliveryCalc.isServiceable === false && (
                      <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-[11px] text-red-200 flex items-center justify-between gap-2">
                        <span>
                          ⚠️ Distance (~{deliveryCalc.distanceKm} km) exceeds our {deliveryCalc.maxServiceKm} km doorstep radius. Pin a closer location or choose Self Pickup.
                        </span>
                        <button
                          type="button"
                          onClick={() => setHandover('pickup')}
                          className="shrink-0 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold"
                        >
                          Switch to Pickup
                        </button>
                      </div>
                    )}

                    {/* Free delivery progress bar */}
                    {!deliveryCalc.isFree && deliveryCalc.freeThreshold > 0 && deliveryCalc.freeShortfall > 0 && (
                      <div className="pt-1.5 border-t border-cyan-500/20 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-emerald-300 font-semibold">
                            🎁 Add ₹{deliveryCalc.freeShortfall.toLocaleString('en-IN')} more rental value for FREE delivery
                          </span>
                          <span className="text-white/45 font-mono">{deliveryCalc.freeProgressPct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                            style={{ width: `${deliveryCalc.freeProgressPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {deliveryCalc.printNote && (
                      <div className="pt-1 border-t border-cyan-500/20 text-[10px] text-white/55 flex items-start gap-1">
                        <span>🏷️</span>
                        <span>{deliveryCalc.printNote}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Optional Damage Protection */}
          {days > 0 && protectionSettings?.enabled ? (
            <div className="pt-1">
              {(() => {
                const basicCost = calculateProtectionCost('basic', days, protectionSettings)
                const isOpted = protectionPlan !== 'none'
                return (
                  <button
                    type="button"
                    onClick={() => setProtectionPlan(isOpted ? 'none' : 'basic')}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                      isOpted
                        ? 'bg-purple-500/20 border-purple-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={14} className={isOpted ? 'text-purple-400' : 'text-white/40'} />
                      <div>
                        <span className="font-bold text-white block">Accidental Damage Protection</span>
                        <span className="text-[10px] text-white/50">Covers drops &amp; scratches up to ₹15,000</span>
                      </div>
                    </div>
                    <span className="font-bold text-xs text-emerald-400 shrink-0">
                      {isOpted ? `+₹${basicCost} ✓` : `+₹${basicCost}`}
                    </span>
                  </button>
                )
              })()}
            </div>
          ) : null}

          {/* Auto-applied Promo Banner */}
          {days > 0 && (
            <div>
              {appliedCoupon ? (
                <div className="p-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <span>🎉</span> {appliedCoupon.code} saved ₹{couponDiscount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCouponBox((prev) => !prev)}
                    className="text-[11px] text-white/50 hover:text-white underline ml-2"
                  >
                    {showCouponBox ? 'Close' : 'Change'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCouponBox((prev) => !prev)}
                  className="text-xs text-cyan-300/80 hover:text-cyan-200 underline font-semibold flex items-center gap-1"
                >
                  <span>🏷️</span> Have a coupon code?
                </button>
              )}

              {showCouponBox && (
                <div className="coupon-box mt-2 p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
                  <div className="coupon-row">
                    <input
                      id={`booking-coupon-${uid}`}
                      className="input-dark"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value)
                        setCouponTouched(true)
                      }}
                      placeholder="ENTER CODE"
                      aria-label="Coupon code"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                    />
                    <button type="button" className="btn-outline coupon-apply-btn" onClick={applyCoupon} disabled={couponBusy}>
                      {couponBusy ? '…' : 'Apply'}
                    </button>
                  </div>
                  {appliedCoupon && (
                    <button type="button" className="text-red-400 hover:underline text-[11px] mt-1.5 block" onClick={clearCoupon}>
                      Remove current code
                    </button>
                  )}
                  <AvailableCoupons
                    coupons={openCoupons}
                    subtotal={subtotal}
                    selectedId={appliedCoupon?.id}
                    onPick={(c) => {
                      setCouponTouched(true)
                      tryApplyCoupon(c)
                    }}
                    userId={user?.id}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 1 Proceed Button */}
          <div className="pt-2 border-t border-white/10">
            {days > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <div>
                    <span className="text-white/60">Estimated Total ({days}d):</span>
                    <strong className="text-sm text-white font-bold ml-1.5">₹{grandTotal}</strong>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    {deposit > 0 ? `+ ₹${deposit} dep (refundable)` : '₹0 Deposit'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (handover === 'delivery' && !address.trim()) {
                      showToast('Please enter your delivery address to proceed.', 'error')
                      return
                    }
                    if (handover === 'delivery' && deliveryCalc.isServiceable === false) {
                      showToast(`Address is outside our ${deliveryCalc.maxServiceKm} km delivery radius. Please pin a closer address or choose Self Pickup.`, 'error')
                      return
                    }
                    if (!isAuthenticated) {
                      showToast(MESSAGES.auth.loginRequiredBook, 'info')
                      navigate('/login', { state: { from: { pathname: `/listing/${listing.id}?rent=1` } } })
                      return
                    }
                    if (needsKyc(profile)) {
                      showToast(MESSAGES.booking.kycRequired, 'info')
                      navigate('/kyc', { state: { from: { pathname: `/listing/${listing.id}?rent=1` } } })
                      return
                    }
                    setBookingTab('pay')
                  }}
                  className="btn-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <span>
                    {!isAuthenticated
                      ? `Sign in to continue (₹${grandTotal})`
                      : needsKyc(profile)
                        ? 'Complete KYC to continue'
                        : `Proceed to Pay (₹${grandTotal})`}
                  </span>
                  <ChevronRight size={15} />
                </button>
              </div>
            ) : (
              <p className="ld-hint text-center text-xs text-white/50 py-1">
                📅 Pick your dates above to view pricing and proceed to payment.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAY & CONFIRM (Wallet, Payment Modes & Confirmation) */}
      {bookingTab === 'pay' && (
        <div className="space-y-3">
          {/* Quick Recap Header with Edit Link */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
            <div>
              <span className="text-white/50 text-[10px] block uppercase font-bold tracking-wider">Rental Window &amp; Mode</span>
              <strong className="text-white font-semibold">
                📅 {startDate} → {endDate} ({days}d · {handover === 'delivery' ? '🚚 Delivery' : '🏠 Pickup'})
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setBookingTab('plan')}
              disabled={Boolean(hold)}
              className="text-xs text-cyan-300 hover:text-cyan-200 underline font-semibold shrink-0 ml-2 disabled:opacity-40 disabled:no-underline"
            >
              Edit Dates
            </button>
          </div>

          {hold ? (
            <div className="ld-hold" role="status" aria-live="polite">
              <div>
                <span className="ld-hold__label">Dates reserved for you</span>
                <p>Complete the payment of <b>₹{hold.amountDue}</b> before the timer ends.</p>
              </div>
              <HoldCountdown expiresAt={hold.expiresAt} onExpire={handleHoldExpired} />
              <button type="button" className="ld-hold__release" onClick={releaseHold} disabled={isProcessing}>
                Release dates
              </button>
            </div>
          ) : null}

          {/* Wallet Balance Usage Card (Hybrid Split Payment) */}
          {isAuthenticated && walletAvailable > 0 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={useWalletBalance}
                    onChange={(e) => setUseWalletBalance(e.target.checked)}
                    className="accent-emerald-400 w-4 h-4 rounded cursor-pointer shrink-0"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      Use Wallet Balance ({rupee(walletAvailable)} available)
                    </span>
                    <span className="text-[10px] text-white/60">
                      {isFullWalletPaid
                        ? '✓ Wallet balance covers 100% of this rental'
                        : `Deducts ₹${walletDeduction} from wallet · Pay remaining ₹${remainingPayable} via UPI`}
                    </span>
                  </div>
                </div>
                <span className="font-mono font-extrabold text-emerald-400 text-xs shrink-0">
                  {useWalletBalance ? `-₹${walletDeduction}` : `₹0`}
                </span>
              </label>
            </div>
          )}

          {/* Payment Method Selector (0% fee direct modes) */}
          <div className="space-y-1.5">
            <label className="field-label block">SELECT PAYMENT MODE</label>
            {isFullWalletPaid ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-center text-xs text-emerald-300 font-bold">
                ✓ Full ₹{grandTotal} will be paid from your Wallet Balance!
              </div>
            ) : payMethods.length > 0 ? (
              <PaymentOptions
                methods={payMethods}
                selectedId={payMethodId === 'wallet' ? '' : selectedPay?.id}
                onSelect={setPayMethodId}
                paymentRef={paymentRef}
                onPaymentRef={setPaymentRef}
                total={remainingPayable}
                payCode={payCode}
              />
            ) : null}
          </div>

          {/* Collapsible Price Summary */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white/50 uppercase tracking-wider text-[10px] font-bold block">
                  {walletDeduction > 0 ? 'Net Payable via UPI' : 'Total Amount'}
                </span>
                <strong className="text-base text-white font-display">
                  ₹{walletDeduction > 0 ? remainingPayable : total}
                </strong>
                {walletDeduction > 0 && (
                  <span className="text-[10px] text-emerald-400 block font-semibold">
                    (Total: ₹{total} − ₹{walletDeduction} wallet)
                  </span>
                )}
                <span className="text-[11px] text-white/50 block">
                  {deposit > 0 ? `(includes ₹${deposit} refundable deposit)` : '(₹0 security deposit)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakdown((prev) => !prev)}
                className="text-[11px] text-cyan-300 hover:underline font-semibold"
              >
                {showBreakdown ? 'Hide Breakdown ▴' : 'View Breakdown ▾'}
              </button>
            </div>

            {showBreakdown && (
              <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Base rental ({days}d × ₹{listing.price_day})</span>
                  <b>₹{subtotal}</b>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Doorstep Delivery (~{deliveryCalc.distanceKm} km)</span>
                    <b className="text-cyan-300">+₹{deliveryFee}</b>
                  </div>
                )}
                {durationDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Duration Saver</span>
                    <b>−₹{durationDiscount}</b>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Promo ({appliedCoupon?.code})</span>
                    <b>−₹{couponDiscount}</b>
                  </div>
                )}
                {platformFee > 0 && (
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <b>₹{platformFee}</b>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Refundable Security Deposit</span>
                  <b>₹{deposit}</b>
                </div>
                {protectionCost > 0 && (
                  <div className="flex justify-between">
                    <span>Damage Protection</span>
                    <b>₹{protectionCost}</b>
                  </div>
                )}
                {walletDeduction > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-white/10">
                    <span>Wallet Balance Applied</span>
                    <b>−₹{walletDeduction}</b>
                  </div>
                )}
                {walletDeduction > 0 && (
                  <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10 text-xs">
                    <span>Balance to Pay via UPI</span>
                    <span className="text-cyan-300">₹{remainingPayable}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Shield size={13} /> Borrower Care Charter — Treat It Like Your Own
              </span>
              <Link to="/terms#care-charter" target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-white text-[10px]">
                View Care Rules ↗
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] text-white/75">
              <span className="px-2 py-1 rounded bg-black/30 border border-white/10">💨 6&quot; Airflow</span>
              <span className="px-2 py-1 rounded bg-black/30 border border-white/10">🚫 No Liquids</span>
              <span className="px-2 py-1 rounded bg-black/30 border border-white/10">🔒 Seals Intact</span>
            </div>
            <div className="book-terms !mt-1 !pt-1.5 border-t border-white/10">
              <input
                id={`accept-terms-${uid}`}
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                aria-label="Accept borrower care pledge and rental terms"
              />
              <label htmlFor={`accept-terms-${uid}`}>
                I pledge to care for this gear like my own, return all original accessories on time, and accept the{' '}
                <Link to="/terms" target="_blank" rel="noreferrer">Lender Protection &amp; Care Policy</Link>.
              </label>
            </div>
          </div>

          {payError ? (
            <div className="ld-err">
              <AlertCircle size={14} />
              <span>{payError}</span>
              <button type="button" onClick={() => setPayError('')} aria-label="Dismiss error"><X size={12} /></button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleBook}
            disabled={isProcessing || isBookedOut || (isAuthenticated && days > 0 && !acceptTerms)}
            className="btn-primary w-full py-3.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            {isProcessing ? (saving ? 'Confirming…' : 'Processing…') : null}
            {!isProcessing && isBookedOut ? '🚫 Unavailable' : null}
            {!isProcessing && !isBookedOut && !isAuthenticated ? <><CreditCard size={16} /> Sign in to Rent</> : null}
            {!isProcessing && !isBookedOut && isAuthenticated && needsKyc(profile) ? <><Shield size={16} /> Complete KYC to Rent</> : null}
            {!isProcessing && !isBookedOut && isAuthenticated && !needsKyc(profile) && days < 1 ? <><Calendar size={16} /> Select Dates to Rent</> : null}
            {!isProcessing && !isBookedOut && isAuthenticated && !needsKyc(profile) && days > 0 ? (
              <><CreditCard size={16} /> {
                isFullWalletPaid
                  ? `Confirm & Pay ₹${grandTotal} from Wallet`
                  : selectedPay?.method_type === 'cash'
                    ? `Book Now · Pay ₹${remainingPayable} on Handover`
                    : hold
                      ? `Resume payment · ₹${hold.amountDue}`
                      : isOnlineMethod(selectedPay)
                        ? `Reserve & Pay ₹${remainingPayable}${walletDeduction > 0 ? ` (₹${walletDeduction} from Wallet)` : ''}`
                      : walletDeduction > 0
                      ? `I Have Paid ₹${remainingPayable} via UPI (₹${walletDeduction} from Wallet)`
                      : `I Have Paid ₹${remainingPayable} · Complete Booking`
              }</>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setBookingTab('plan')}
            className="w-full text-center text-xs text-white/50 hover:text-white py-1 transition-colors"
          >
            ← Back to Dates &amp; Fulfillment
          </button>
        </div>
      )}

      <div className="ld-trust mt-2.5 text-[11px] flex items-center justify-between text-white/50">
        <span>🔒 Zero gateway fee · Direct UPI</span>
        <span>🛡️ Deposit refunded in 48h</span>
      </div>
    </div>
  )

  if (mobile) {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="ld-bar-price flex-1 min-w-0">
            <strong>{days > 0 ? `₹${total}` : `₹${listing.price_day}`}</strong>
            <span>{isBookedOut ? 'Unavailable' : days > 0 ? `${days} day${days === 1 ? '' : 's'} incl. deposit` : '/day · tap to rent'}</span>
          </div>
          <button
            type="button"
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => {
              if (isBookedOut) {
                showToast('This item is currently Unavailable.', 'error')
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
            aria-label={isBookedOut ? 'Item is Unavailable' : isAuthenticated ? 'Open rent form' : 'Sign in to rent'}
            disabled={isBookedOut}
          >
            {isBookedOut ? 'Unavailable' : 'Rent now'}
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
        description={listing?.description || `Rent ${listing?.title} in ${formatLocationDisplay(listing?.location)} for ₹${listing?.price_day}/day.`}
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
              {listing.is_available !== false ? (
                <span className="ld-pill is-ok">Available to rent</span>
              ) : (
                <span className="ld-pill is-bad">🚫 Unavailable</span>
              )}
              {listing.deposit_amount && Number(listing.deposit_amount) > 0 ? (
                <span className="ld-pill is-warn">Deposit ₹{listing.deposit_amount}</span>
              ) : (
                <span className="ld-pill is-ok">✓ Zero Deposit</span>
              )}
            </div>

            <h1>{listing.title}</h1>
            <div className="ld-meta">
              {listing.rating > 0 ? (
                <span className="is-gold">
                  <Star size={14} /> {listing.rating} ({listing.total_reviews} reviews)
                </span>
              ) : null}
              <span><MapPin size={14} /> {formatLocationDisplay(listing.location)}</span>
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
                { id: 'care', label: '🛡️ Care & Protection' },
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
                    ['Deposit', (listing.deposit_amount && Number(listing.deposit_amount) > 0) ? `₹${listing.deposit_amount}` : '₹0 (Zero Deposit)'],
                    ['Units', `${listingUnits(listing)}`],
                    ['Area', formatLocationDisplay(listing.location)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label.toUpperCase()}</span>
                      <b>{value}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {panel === 'care' ? (
              <div className="ld-card space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3>🛡️ BORROWER CARE CHARTER &amp; LENDER PROTECTION</h3>
                  <Link
                    to="/terms"
                    className="text-xs font-bold text-cyan-300 underline hover:text-white"
                  >
                    Read Full Policy ↗
                  </Link>
                </div>
                <p className="text-xs text-white/70">
                  Every rental on LocalDen is a neighbor-to-neighbor pact. Treat this gear like your own so community owners keep sharing their best hardware.
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    ['💨 6-Inch Airflow Rule', 'Place consoles & amps on hard, flat surfaces. Never run on beds, sofas, carpets, or closed cabinets.'],
                    ['🚫 Zero Liquids or Smoke', 'Keep drinks, food, and smoke away from controllers, fretboards, and decks. Clean hands before play.'],
                    ['🔌 Surge-Safe Power', 'Use original power bricks & HDMI/audio cables provided. Shut down completely before unplugging.'],
                    ['🔒 Warranty Seals Intact', 'Never open casings, peel serial stickers, or factory-reset host digital game accounts.'],
                    ['📸 2-Hour Pickup Check', 'Test all buttons/ports within 2 hours of handover and flag any pre-existing issue in the app.'],
                    ['🎒 Neat & On-Time Return', 'Wipe down gear, coil all cables neatly into the carry bag, and verify the Return PIN at pickup.'],
                  ].map(([title, desc]) => (
                    <div key={title} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <strong className="text-emerald-300 block mb-1">{title}</strong>
                      <span className="text-white/65 text-[11px] leading-relaxed">{desc}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs text-cyan-200 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    <strong>Protected by 5-Layer Host Shield:</strong> Govt KYC · E-Signed Legal Pact · Dual-OTP Handover · Photo Proof · 48h Deposit Escrow
                  </span>
                  <Link to="/terms#accessory-tariff" className="underline text-white font-semibold whitespace-nowrap">
                    View Fair Tariff →
                  </Link>
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
