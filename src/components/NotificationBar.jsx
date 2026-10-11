import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Instagram, X, ArrowRight, Tag, Check, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import { useToast } from '../contexts/ToastContext'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../lib/contact'

export default function NotificationBar() {
  const { isAuthenticated } = useAuth()
  const { items } = useNotifications()
  const { showToast } = useToast()
  const [dismissed, setDismissed] = useState(false)
  const [copiedCoupon, setCopiedCoupon] = useState(false)

  // Check session storage on mount
  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem('ld_notif_bar_dismissed') === 'true'
      if (isDismissed) setDismissed(true)
    } catch {
      // Ignore storage errors
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem('ld_notif_bar_dismissed', 'true')
    } catch {
      // Ignore storage errors
    }
  }

  const handleCopyCoupon = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText('WELCOME10')
      .then(() => {
        setCopiedCoupon(true)
        showToast('Coupon WELCOME10 copied! (10% off)', 'success')
        setTimeout(() => setCopiedCoupon(false), 2500)
      })
      .catch(() => {
        showToast('Code: WELCOME10', 'info')
      })
  }

  if (dismissed) return null

  // Prioritize an urgent unread notification for logged-in user
  const urgentAlert = isAuthenticated
    ? items.find((i) => !i.is_read && (
        /return|due|pickup|agreement|sign|refund/i.test(i.title || '') ||
        /return|due|pickup|agreement|sign|refund/i.test(i.body || '')
      ))
    : null

  if (urgentAlert) {
    return (
      <aside aria-label="Urgent booking notification" className="relative z-50 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white text-xs py-1.5 px-3 sm:px-6 shadow-md border-b border-pink-400/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <Bell size={11} className="text-white" />
            </span>
            <div className="truncate flex items-center gap-1.5">
              <strong className="font-semibold tracking-wide whitespace-nowrap">{urgentAlert.title}:</strong>
              <span className="text-white/90 truncate hidden sm:inline">{urgentAlert.body}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to={urgentAlert.link || '/dashboard'}
              className="inline-flex items-center gap-1 bg-white text-gray-950 font-bold px-2.5 py-0.5 rounded-full hover:bg-white/90 transition-all text-[11px] shadow-sm"
            >
              <span>View</span>
              <ArrowRight size={10} />
            </Link>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-white/70 hover:text-white transition-colors rounded hover:bg-white/10"
              aria-label="Dismiss notification bar"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </aside>
    )
  }

  // Default Promotional / Social Announcement Bar
  return (
    <aside aria-label="Announcement bar" className="relative z-50 bg-gradient-to-r from-gray-950 via-[#13091e] to-gray-950 text-white text-xs py-1.5 px-3 sm:px-6 border-b border-pink-500/20 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Instagram Drop Announcement */}
        <div className="flex items-center gap-2 min-w-0 truncate">
          <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-pink-500/20 border border-pink-500/30 text-pink-300 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
            <Sparkles size={9} /> Drops
          </span>
          <p className="truncate text-white/80 text-[11px] sm:text-xs">
            Join the community on Instagram{' '}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 font-semibold underline underline-offset-2 decoration-pink-500/40 inline-flex items-center gap-1"
            >
              <Instagram size={11} className="inline text-pink-400" />
              @{INSTAGRAM_HANDLE}
            </a>
            <span className="hidden md:inline text-white/40"> · Zero security deposit gear available</span>
          </p>
        </div>

        {/* Right: Coupon & Dismiss */}
        <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
          <button
            type="button"
            onClick={handleCopyCoupon}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 hover:text-white transition-all font-mono"
            title="Click to copy coupon code"
          >
            {copiedCoupon ? <Check size={11} className="text-emerald-400" /> : <Tag size={11} className="text-amber-400" />}
            <span>WELCOME10</span>
            <span className="text-[10px] text-pink-300 hidden sm:inline">(10% OFF)</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-white/50 hover:text-white transition-colors rounded hover:bg-white/10"
            aria-label="Dismiss announcement bar"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}

