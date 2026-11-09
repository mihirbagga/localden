import { useState, useEffect, useMemo } from 'react'
import {
  Users, Package, Calendar, Star, Boxes, LayoutDashboard, Shield,
  CreditCard, ShieldCheck, Truck, Wallet, Music, Eye, Tag,
  MessageSquare, RefreshCw, Search, AlertTriangle, CheckCircle2, Command, X,
  MapPin, Building2, Bell
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useAdminData } from '../hooks/useAdminData'
import { fetchVisitAnalytics } from '../lib/visitTracker'
import { fetchPendingPayoutCount } from '../lib/payoutService'
import { MESSAGES, getHandoverPin } from '../lib/messages'

import AdminSidebar from './admin/AdminSidebar'
import AdminTopBar from './admin/AdminTopBar'
import AdminDashboard from './admin/AdminDashboard'

import AdminVisits from './admin/AdminVisits'
import AdminUsers from './admin/AdminUsers'
import AdminListings from './admin/AdminListings'
import AdminBookings from './admin/AdminBookings'
import AdminStock from './admin/AdminStock'
import AdminReviews from './admin/AdminReviews'
import AdminCoupons from './admin/AdminCoupons'
import AdminPayments from './admin/AdminPayments'
import AdminKyc from './admin/AdminKyc'
import AdminDrivers from './admin/AdminDrivers'
import AdminPayouts from './admin/AdminPayouts'
import AdminLive from './admin/AdminLive'
import AdminWhatsApp from './admin/AdminWhatsApp'
import AdminCities from './admin/AdminCities'
import AdminHubs from './admin/AdminHubs'

import './admin/admin.css'
import './admin/admin-layout.css'
import './admin/admin-tables.css'
import './admin/admin-cards.css'

export default function Admin() {
  const { user, isSuperAdmin, isRegionalAdmin, isHubManager } = useAuth()
  const { showToast } = useToast()
  const data = useAdminData()

  const [tab, setTab] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [uniqueVisits, setUniqueVisits] = useState(0)
  const [pendingPayouts, setPendingPayouts] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')

  // ⌘K hotkey listener
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setCmdOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const refreshExtraMetrics = () => {
    fetchVisitAnalytics().then((res) => {
      if (res?.totalUnique != null) setUniqueVisits(res.totalUnique)
    }).catch(() => {})

    fetchPendingPayoutCount().then((cnt) => {
      if (cnt != null) setPendingPayouts(cnt)
    }).catch(() => {})
  }

  useEffect(() => {
    refreshExtraMetrics()
  }, [])

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      await data.reload()
      refreshExtraMetrics()
      showToast(MESSAGES.admin.refreshed, 'success')
    } finally {
      setSyncing(false)
    }
  }

  const pendingKycCount = useMemo(
    () => data.kycSubmissions.filter((row) => row.status === 'submitted').length,
    [data.kycSubmissions]
  )
  const pendingBookingsCount = useMemo(
    () => data.bookings.filter((b) => b.status === 'pending' || (b.payment_status !== 'paid' && b.status !== 'cancelled')).length,
    [data.bookings]
  )

  const counts = {
    overview: 0,
    visits: uniqueVisits,
    payouts: pendingPayouts,
    users: data.users.length,
    listings: data.listings.length,
    bookings: data.bookings.length,
    whatsapp: 0,
    drivers: 0,
    cities: 0,
    hubs: 0,
    stock: data.listings.length,
    reviews: data.reviews.length,
    coupons: data.coupons.length,
    payments: data.paymentMethods.length,
    kyc: pendingKycCount,
    live: 0,
  }

  const openModule = (id) => {
    setTab(id)
    setCmdOpen(false)
  }

  // ⌘K Search logic
  const cmdResults = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase()
    if (!q) {
      return { bookings: [], listings: [], users: [] }
    }

    const bookingMatches = data.bookings
      .filter((b) => {
        const pin = getHandoverPin(b.id)
        const hay = `${b.id} ${pin} ${b.listings?.title || ''} ${b.renter?.full_name || ''} ${b.renter?.phone || ''} ${b.payment_ref || ''} ${b.razorpay_payment_id || ''}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 5)

    const listingMatches = data.listings
      .filter((l) => `${l.title || ''} ${l.location || ''} ${l.category || ''}`.toLowerCase().includes(q))
      .slice(0, 4)

    const userMatches = data.users
      .filter((u) => `${u.full_name || ''} ${u.email || ''} ${u.phone || ''}`.toLowerCase().includes(q))
      .slice(0, 4)

    return { bookings: bookingMatches, listings: listingMatches, users: userMatches }
  }, [cmdQuery, data.bookings, data.listings, data.users])

  return (
    <div className="admin-v2-container">
      {/* ── Left Sidebar Navigation ── */}
      <AdminSidebar
        currentTab={tab}
        onSelectTab={setTab}
        counts={counts}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* ── Main Layout Column ── */}
      <div className="admin-main-wrap">
        {/* Top Navbar */}
        <AdminTopBar
          onOpenCmd={() => setCmdOpen(true)}
          onToggleMobile={() => setMobileMenuOpen(true)}
          syncing={syncing}
          onSync={handleManualSync}
        />

        {/* Content Outlet */}
        <main className="admin-content-outlet">
          {data.loading ? (
            <div className="admin-empty">
              <div className="w-10 h-10 rounded-full border-2 animate-spin admin-spinner mx-auto mb-3" />
              <p className="admin-muted">Syncing command center records…</p>
            </div>
          ) : null}

          {/* Dynamic Module Rendering */}
          {!data.loading && tab === 'overview' && (
            <AdminDashboard
              users={data.users}
              listings={data.listings}
              bookings={data.bookings}
              kycSubmissions={data.kycSubmissions}
              pendingPayouts={pendingPayouts}
              onOpenTab={openModule}
            />
          )}

          {!data.loading && tab === 'bookings' && (
            <AdminBookings
              bookings={data.bookings}
              patchBooking={data.patchBooking}
            />
          )}

          {!data.loading && tab === 'listings' && (
            <AdminListings
              listings={data.listings}
              patchListing={data.patchListing}
              removeListing={data.removeListing}
            />
          )}

          {!data.loading && tab === 'stock' && (
            <AdminStock
              listings={data.listings}
              patchListing={data.patchListing}
            />
          )}

          {!data.loading && tab === 'users' && (
            <AdminUsers
              users={data.users}
              patchUser={data.patchUser}
              removeUser={data.removeUser}
              isSuperAdmin={isSuperAdmin}
              currentUserId={user?.id}
            />
          )}

          {!data.loading && tab === 'kyc' && (
            <AdminKyc
              submissions={data.kycSubmissions}
              patchSubmission={data.patchSubmission}
              patchUser={data.patchUser}
            />
          )}

          {!data.loading && tab === 'cities' && (
            <AdminCities
              users={data.users}
              isSuperAdmin={isSuperAdmin}
            />
          )}

          {!data.loading && tab === 'hubs' && (
            <AdminHubs
              users={data.users}
              isSuperAdmin={isSuperAdmin}
            />
          )}

          {!data.loading && tab === 'drivers' && (
            <AdminDrivers />
          )}

          {!data.loading && tab === 'payouts' && (
            <AdminPayouts />
          )}

          {!data.loading && tab === 'payments' && (
            <AdminPayments
              methods={data.paymentMethods}
              patchMethod={data.patchPaymentMethod}
            />
          )}

          {!data.loading && tab === 'coupons' && (
            <AdminCoupons
              coupons={data.coupons}
              setCoupons={data.setCoupons}
              patchCoupon={data.patchCoupon}
              removeCoupon={data.removeCoupon}
            />
          )}

          {!data.loading && tab === 'whatsapp' && (
            <AdminWhatsApp />
          )}

          {!data.loading && tab === 'live' && (
            <AdminLive />
          )}

          {!data.loading && tab === 'reviews' && (
            <AdminReviews
              reviews={data.reviews}
              patchReview={data.patchReview}
              removeReview={data.removeReview}
            />
          )}

          {!data.loading && tab === 'visits' && (
            <AdminVisits />
          )}
        </main>
      </div>

      {/* ── Global Command Palette (⌘K) ── */}
      {cmdOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-nav p-4"
          onClick={() => setCmdOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-[#0d111a] border border-cyan-500/35 shadow-2xl overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-white/10 flex items-center gap-2.5">
              <Search size={16} className="text-cyan-400 shrink-0" />
              <input
                type="search"
                autoFocus
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                placeholder="Search any booking ID, PIN, UTR, renter, listing..."
                className="w-full bg-transparent text-white text-sm outline-none placeholder:text-white/40"
              />
              <button
                type="button"
                onClick={() => setCmdOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/70"
              >
                <X size={14} />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-3 space-y-4">
              {cmdResults.bookings.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-white/40 px-2 block mb-1.5">
                    Matching Bookings ({cmdResults.bookings.length})
                  </span>
                  <div className="space-y-1">
                    {cmdResults.bookings.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => openModule('bookings')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-500/15 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div>
                          <strong className="text-white font-display">
                            #{String(b.id).slice(0, 8).toUpperCase()} · {b.listings?.title || 'Gear'}
                          </strong>
                          <span className="text-[11px] text-white/55 block">
                            Renter: {b.renter?.full_name || 'Renter'} · ₹{b.total_amount}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase">
                          {b.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cmdResults.listings.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-white/40 px-2 block mb-1.5">
                    Matching Listings ({cmdResults.listings.length})
                  </span>
                  <div className="space-y-1">
                    {cmdResults.listings.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => openModule('listings')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-500/15 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div>
                          <strong className="text-white font-display">{l.emoji || '🎮'} {l.title}</strong>
                          <span className="text-[11px] text-white/55 block">
                            ₹{l.price_day}/day · {l.location}
                          </span>
                        </div>
                        <span className="text-[10px] text-cyan-300 font-semibold">Listings →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cmdResults.users.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-white/40 px-2 block mb-1.5">
                    Matching Users ({cmdResults.users.length})
                  </span>
                  <div className="space-y-1">
                    {cmdResults.users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => openModule('users')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-500/15 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div>
                          <strong className="text-white font-display">{u.full_name || 'User'}</strong>
                          <span className="text-[11px] text-white/55 block">
                            {u.email}
                          </span>
                        </div>
                        <span className="text-[10px] text-cyan-300 font-semibold">Users →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cmdQuery && cmdResults.bookings.length === 0 && cmdResults.listings.length === 0 && cmdResults.users.length === 0 && (
                <div className="p-4 text-center text-white/40 text-xs">
                  No records matching "{cmdQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
