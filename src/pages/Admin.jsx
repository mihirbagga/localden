import { useState, useEffect, useMemo } from 'react'
import {
  Users, Package, Calendar, Star, Boxes, LayoutDashboard, Shield,
  CreditCard, ShieldCheck, Truck, Wallet, Music, Eye, Tag,
  MessageSquare, RefreshCw, Search, AlertTriangle, CheckCircle2, Command, X,
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useAdminData } from '../hooks/useAdminData'
import { fetchVisitAnalytics } from '../lib/visitTracker'
import { fetchPendingPayoutCount } from '../lib/payoutService'
import { MESSAGES, getHandoverPin } from '../lib/messages'
import { AdminTab } from './admin/AdminShared'
import AdminOverview from './admin/AdminOverview'
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
import './admin/admin.css'

const TABS = [
  { id: 'overview',  label: 'Overview',          icon: LayoutDashboard, group: 'ops',     desc: 'Live KPIs, pending queues, traffic & stock alerts' },
  { id: 'bookings',  label: 'Bookings',          icon: Calendar,        group: 'ops',     desc: 'Verify payments, manage active rentals & returns' },
  { id: 'listings',  label: 'Listings',          icon: Package,         group: 'ops',     desc: 'Approve, verify, feature, or hide marketplace gear' },
  { id: 'stock',     label: 'Stock & Inventory', icon: Boxes,           group: 'ops',     desc: 'Adjust available unit counts and total stock' },
  { id: 'drivers',   label: 'Drivers & Hub',     icon: Truck,           group: 'ops',     desc: 'Manage delivery riders and warehouse dispatches' },

  { id: 'users',     label: 'Users & Roles',     icon: Users,           group: 'trust',   desc: 'Manage accounts, KYC requirements, and admin permissions' },
  { id: 'kyc',       label: 'KYC Queue',         icon: ShieldCheck,     group: 'trust',   desc: 'Review uploaded ID documents and approve verifications' },
  { id: 'reviews',   label: 'Reviews',           icon: Star,            group: 'trust',   desc: 'Moderate community ratings and feedback' },

  { id: 'payouts',   label: 'Payouts',           icon: Wallet,          group: 'finance', desc: 'Process lister earnings withdrawals and wallet ledger' },
  { id: 'payments',  label: 'Payment Setup',     icon: CreditCard,      group: 'finance', desc: 'Configure UPI, QR codes, bank details, and platform fees' },
  { id: 'coupons',   label: 'Discounts & Deals', icon: Tag,             group: 'growth',  desc: 'Run promo codes, auto-campaigns, and homepage deals' },
  { id: 'whatsapp',  label: 'WhatsApp Alerts',   icon: MessageSquare,   group: 'growth',  desc: 'Configure instant WhatsApp order & status notifications' },
  { id: 'live',      label: 'Live & Artists',    icon: Music,           group: 'growth',  desc: 'Curate live event packages and artist bookings' },
  { id: 'visits',    label: 'Traffic Analytics', icon: Eye,             group: 'growth',  desc: 'Track unique visitors and acquisition sources' },
]

const GROUPS = [
  { id: 'all',     label: 'All Modules' },
  { id: 'ops',     label: 'Operations' },
  { id: 'trust',   label: 'Trust & Users' },
  { id: 'finance', label: 'Finance' },
  { id: 'growth',  label: 'Growth & Comms' },
]

export default function Admin() {
  const { user, isSuperAdmin } = useAuth()
  const { showToast } = useToast()
  const data = useAdminData()
  const [tab, setTab] = useState('overview')
  const [groupFilter, setGroupFilter] = useState('all')
  const [moduleQuery, setModuleQuery] = useState('')
  const [uniqueVisits, setUniqueVisits] = useState(0)
  const [pendingPayouts, setPendingPayouts] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')

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
    stock: data.listings.length,
    reviews: data.reviews.length,
    coupons: data.coupons.length,
    payments: data.paymentMethods.length,
    kyc: pendingKycCount,
    live: 0,
  }

  const visibleTabs = useMemo(() => {
    const q = moduleQuery.trim().toLowerCase()
    return TABS.filter((t) => {
      if (groupFilter !== 'all' && t.group !== groupFilter) return false
      if (q && !t.label.toLowerCase().includes(q) && !t.desc.toLowerCase().includes(q)) return false
      return true
    })
  }, [groupFilter, moduleQuery])

  const activeTabMeta = TABS.find((t) => t.id === tab) || TABS[0]
  const totalAttentionCount = pendingKycCount + pendingBookingsCount + pendingPayouts

  const openModule = (id) => {
    setTab(id)
    setGroupFilter('all')
    setModuleQuery('')
    setCmdOpen(false)
  }

  const cmdResults = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase()
    const modMatches = TABS.filter(
      (t) => !q || t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)
    ).slice(0, 5)

    if (!q) {
      return { modules: modMatches, bookings: [], listings: [], users: [] }
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

    return { modules: modMatches, bookings: bookingMatches, listings: listingMatches, users: userMatches }
  }, [cmdQuery, data.bookings, data.listings, data.users])

  return (
    <div className="admin-page">
      <div className="grid-floor" />
      <GameBackground />

      <div className="admin-wrap">
        {/* ── Command Header ── */}
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Local Den 2.0 · Command Center</p>
            <h1 className="admin-title">Admin Portal</h1>
            <p className="admin-subtitle">
              Manage operations, verify payments & KYC, control inventory, and run growth campaigns in one place.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="admin-sync-btn !border-cyan-500/35 hover:!border-cyan-400"
              aria-label="Open Global Command Palette"
            >
              <Command size={14} className="text-cyan-400" />
              <span>Quick Find</span>
              <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/15 text-[10px] font-mono text-cyan-300">
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing || data.loading}
              className="admin-sync-btn"
              aria-label="Sync live admin data"
            >
              <RefreshCw size={14} className={syncing || data.loading ? 'animate-spin' : ''} />
              <span>{syncing ? 'Syncing…' : 'Sync Data'}</span>
            </button>
            <span className={`admin-role-badge admin-role-badge--${isSuperAdmin ? 'super' : 'admin'}`}>
              <Shield size={12} aria-hidden="true" />
              {isSuperAdmin ? 'Overall Admin' : 'User Admin'}
            </span>
          </div>
        </header>

        {/* ── Action Queue Strip (shows whenever items need attention) ── */}
        {!data.loading && totalAttentionCount > 0 && (
          <div className="admin-attention-bar" role="region" aria-label="Pending admin actions">
            <div className="flex items-center gap-2.5">
              <span className="admin-attention-bar__icon">
                <AlertTriangle size={16} />
              </span>
              <div>
                <p className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>
                  {totalAttentionCount} {totalAttentionCount === 1 ? 'item requires' : 'items require'} your attention
                </p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  Click a queue below to review and resolve immediately.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {pendingBookingsCount > 0 && (
                <button
                  type="button"
                  onClick={() => openModule('bookings')}
                  className="admin-attention-pill is-magenta"
                >
                  <Calendar size={13} />
                  <span>{pendingBookingsCount} Booking{pendingBookingsCount === 1 ? '' : 's'} / Pay Check</span>
                </button>
              )}
              {pendingKycCount > 0 && (
                <button
                  type="button"
                  onClick={() => openModule('kyc')}
                  className="admin-attention-pill is-gold"
                >
                  <ShieldCheck size={13} />
                  <span>{pendingKycCount} KYC Submission{pendingKycCount === 1 ? '' : 's'}</span>
                </button>
              )}
              {pendingPayouts > 0 && (
                <button
                  type="button"
                  onClick={() => openModule('payouts')}
                  className="admin-attention-pill is-cyan"
                >
                  <Wallet size={13} />
                  <span>{pendingPayouts} Payout Request{pendingPayouts === 1 ? '' : 's'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Categorized Navigation & Module Finder ── */}
        <div className="admin-nav-shell">
          <div className="admin-nav-top">
            <div className="admin-group-pills" role="group" aria-label="Filter admin modules by category">
              {GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupFilter(g.id)}
                  className={`admin-group-pill${groupFilter === g.id ? ' is-on' : ''}`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="admin-module-search">
              <Search size={13} className="admin-module-search__icon" />
              <input
                type="search"
                value={moduleQuery}
                onChange={(e) => setModuleQuery(e.target.value)}
                placeholder="Jump to module (e.g. KYC, coupons, stock)…"
                aria-label="Filter admin modules"
              />
            </div>
          </div>

          <div className="admin-tabs" role="tablist" aria-label="Admin sections">
            {visibleTabs.map((item) => {
              const Icon = item.icon
              return (
                <AdminTab
                  key={item.id}
                  label={item.label}
                  icon={<Icon size={14} aria-hidden="true" />}
                  active={tab === item.id}
                  count={counts[item.id]}
                  ariaLabel={`Open ${item.label} tab`}
                  onClick={() => setTab(item.id)}
                />
              )
            })}
          </div>

          {/* Active Module Context Banner */}
          <div className="admin-active-context">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} style={{ color: 'var(--cyan)' }} />
              <span className="font-display font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--cyan)' }}>
                {activeTabMeta.label}
              </span>
              <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-dim)' }}>
                — {activeTabMeta.desc}
              </span>
            </div>
            {tab !== 'overview' && (
              <button
                type="button"
                onClick={() => setTab('overview')}
                className="text-xs font-display font-bold hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                ← Back to Overview
              </button>
            )}
          </div>
        </div>

        {data.loading ? (
          <div className="admin-empty">
            <div className="w-10 h-10 rounded-full border-2 animate-spin admin-spinner mx-auto mb-3" />
            <p className="admin-muted">Syncing live portal records…</p>
          </div>
        ) : null}

        {!data.loading && tab === 'overview' ? (
          <AdminOverview
            users={data.users}
            listings={data.listings}
            bookings={data.bookings}
            kycSubmissions={data.kycSubmissions}
            pendingPayouts={pendingPayouts}
            onOpenTab={openModule}
          />
        ) : null}

        {!data.loading && tab === 'visits' ? (
          <AdminVisits />
        ) : null}

        {!data.loading && tab === 'payouts' ? (
          <AdminPayouts />
        ) : null}

        {!data.loading && tab === 'users' ? (
          <AdminUsers
            users={data.users}
            patchUser={data.patchUser}
            isSuperAdmin={isSuperAdmin}
            currentUserId={user?.id}
          />
        ) : null}

        {!data.loading && tab === 'listings' ? (
          <AdminListings
            listings={data.listings}
            patchListing={data.patchListing}
            removeListing={data.removeListing}
          />
        ) : null}

        {!data.loading && tab === 'bookings' ? (
          <AdminBookings
            bookings={data.bookings}
            patchBooking={data.patchBooking}
          />
        ) : null}

        {!data.loading && tab === 'whatsapp' ? (
          <AdminWhatsApp />
        ) : null}

        {!data.loading && tab === 'drivers' ? (
          <AdminDrivers />
        ) : null}

        {!data.loading && tab === 'stock' ? (
          <AdminStock
            listings={data.listings}
            patchListing={data.patchListing}
          />
        ) : null}

        {!data.loading && tab === 'reviews' ? (
          <AdminReviews
            reviews={data.reviews}
            patchReview={data.patchReview}
            removeReview={data.removeReview}
          />
        ) : null}

        {!data.loading && tab === 'coupons' ? (
          <AdminCoupons
            coupons={data.coupons}
            setCoupons={data.setCoupons}
            patchCoupon={data.patchCoupon}
            removeCoupon={data.removeCoupon}
          />
        ) : null}

        {!data.loading && tab === 'live' ? <AdminLive /> : null}

        {!data.loading && tab === 'payments' ? (
          <AdminPayments
            methods={data.paymentMethods}
            patchMethod={data.patchPaymentMethod}
          />
        ) : null}

        {!data.loading && tab === 'kyc' ? (
          <AdminKyc
            submissions={data.kycSubmissions}
            patchSubmission={data.patchSubmission}
            patchUser={data.patchUser}
          />
        ) : null}
      </div>

      {/* ── Global Command Palette (⌘K / Ctrl+K) ── */}
      {cmdOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-nav p-4"
          onClick={() => setCmdOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Global Command Palette"
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
                placeholder="Search any booking ID, Handover PIN, UTR, renter, listing, or module…"
                className="w-full bg-transparent text-white text-sm outline-none placeholder:text-white/40"
              />
              <button
                type="button"
                onClick={() => setCmdOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/70"
                aria-label="Close Command Palette"
              >
                <X size={14} />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-3 space-y-4">
              {cmdResults.modules.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-white/40 px-2 block mb-1.5">
                    Admin Modules
                  </span>
                  <div className="space-y-1">
                    {cmdResults.modules.map((m) => {
                      const Icon = m.icon
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => openModule(m.id)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-500/15 flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon size={14} className="text-cyan-400" />
                            <div>
                              <strong className="text-white font-display block">{m.label}</strong>
                              <span className="text-[11px] text-white/50">{m.desc}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-cyan-300 font-semibold">Jump →</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

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
                            Renter: {b.renter?.full_name || 'Renter'} · PIN: {getHandoverPin(b.id)} · ₹{b.total_amount}
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
                            {u.email} {u.phone ? `· ${u.phone}` : ''}
                          </span>
                        </div>
                        <span className="text-[10px] text-cyan-300 font-semibold">Users →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
