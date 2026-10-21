import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Package, Calendar, Eye, TrendingUp, ShieldCheck,
  Wallet, Tag, MessageSquare, CreditCard, ArrowRight,
} from 'lucide-react'
import { AdminStat } from './AdminShared'
import { displayName, formatDate, isLowStock, KYC_LABEL, BOOKING_LABEL } from './adminHelpers'
import { fetchVisitAnalytics } from '../../lib/visitTracker'

export default function AdminOverview({
  users = [],
  listings = [],
  bookings = [],
  kycSubmissions = [],
  pendingPayouts = 0,
  onOpenTab,
}) {
  const [visitStats, setVisitStats] = useState({ totalUnique: 0, totalVisits: 0, sources: [] })

  useEffect(() => {
    fetchVisitAnalytics().then((res) => {
      if (res) setVisitStats(res)
    }).catch(() => {})
  }, [])

  const kycQueue = useMemo(
    () => kycSubmissions.filter((k) => k.status === 'submitted').length || users.filter((u) => u.kyc_status === 'submitted').length,
    [kycSubmissions, users]
  )
  const verifiedUsers = useMemo(
    () => users.filter((u) => u.kyc_status === 'verified').length,
    [users]
  )
  const liveListings = useMemo(
    () => listings.filter((l) => l.is_published !== false && l.is_available !== false).length,
    [listings]
  )
  const hiddenListings = useMemo(
    () => listings.filter((l) => l.is_published === false).length,
    [listings]
  )
  const lowStockItems = useMemo(() => listings.filter(isLowStock), [listings])
  const openBookings = useMemo(
    () => bookings.filter((b) => ['pending', 'confirmed', 'active'].includes(b.status)).length,
    [bookings]
  )
  const grossBookingVolume = useMemo(
    () => bookings
      .filter((b) => ['confirmed', 'active', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0),
    [bookings]
  )
  const unverifiedPaidCount = useMemo(
    () => bookings.filter((b) => b.payment_status === 'marked_paid' && !b.payment_verified).length,
    [bookings]
  )

  return (
    <div className="space-y-5">
      {/* ── Primary KPI Row ── */}
      <div className="admin-stats">
        <div className="cursor-pointer transition-transform hover:-translate-y-0.5" onClick={() => onOpenTab('bookings')}>
          <AdminStat
            icon={<TrendingUp size={16} />}
            label="Confirmed GMV"
            value={`₹${grossBookingVolume.toLocaleString('en-IN')}`}
            sub={`${bookings.length} total bookings · ${openBookings} active`}
            tone="green"
          />
        </div>

        <div className="cursor-pointer transition-transform hover:-translate-y-0.5" onClick={() => onOpenTab('users')}>
          <AdminStat
            icon={<Users size={16} />}
            label="Community Members"
            value={users.length}
            sub={`${verifiedUsers} KYC verified · ${kycQueue} in review`}
            tone="cyan"
          />
        </div>

        <div className="cursor-pointer transition-transform hover:-translate-y-0.5" onClick={() => onOpenTab('listings')}>
          <AdminStat
            icon={<Package size={16} />}
            label="Marketplace Gear"
            value={listings.length}
            sub={`${liveListings} bookable · ${hiddenListings} hidden`}
            tone="gold"
          />
        </div>

        <div className="cursor-pointer transition-transform hover:-translate-y-0.5" onClick={() => onOpenTab('visits')}>
          <AdminStat
            icon={<Eye size={16} />}
            label="Unique Site Visitors"
            value={visitStats.totalUnique.toLocaleString('en-IN')}
            sub={
              visitStats.sources[0]
                ? `Top source: ${visitStats.sources[0].source} (${visitStats.sources[0].unique_count})`
                : `${visitStats.totalVisits || 0} total page hits`
            }
            tone="magenta"
          />
        </div>
      </div>

      {/* ── Quick Launch Shortcuts ── */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="admin-card__title !mb-0">QUICK OPERATIONS</h3>
          <span className="text-xs font-display" style={{ color: 'var(--text-dim)' }}>
            One-click access to high-frequency workflows
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button type="button" onClick={() => onOpenTab('bookings')} className="admin-quick-tile">
            <Calendar size={16} style={{ color: '#ff2e6d' }} />
            <span className="font-display font-bold text-xs">Bookings</span>
            <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
              {unverifiedPaidCount > 0 ? `${unverifiedPaidCount} pay to verify` : `${openBookings} open`}
            </span>
          </button>

          <button type="button" onClick={() => onOpenTab('kyc')} className="admin-quick-tile">
            <ShieldCheck size={16} style={{ color: '#ffd23f' }} />
            <span className="font-display font-bold text-xs">KYC Verification</span>
            <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
              {kycQueue > 0 ? `${kycQueue} awaiting review` : 'All caught up'}
            </span>
          </button>

          <button type="button" onClick={() => onOpenTab('payouts')} className="admin-quick-tile">
            <Wallet size={16} style={{ color: '#00e5ff' }} />
            <span className="font-display font-bold text-xs">Lister Payouts</span>
            <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
              {pendingPayouts > 0 ? `${pendingPayouts} pending` : 'Ledger synced'}
            </span>
          </button>

          <button type="button" onClick={() => onOpenTab('coupons')} className="admin-quick-tile">
            <Tag size={16} style={{ color: '#00e676' }} />
            <span className="font-display font-bold text-xs">Discounts & Deals</span>
            <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
              Coupons & banners
            </span>
          </button>

          <button type="button" onClick={() => onOpenTab('whatsapp')} className="admin-quick-tile">
            <MessageSquare size={16} style={{ color: '#25d366' }} />
            <span className="font-display font-bold text-xs">WhatsApp Alerts</span>
            <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
              Order notifications
            </span>
          </button>

          <button type="button" onClick={() => onOpenTab('payments')} className="admin-quick-tile">
            <CreditCard size={16} style={{ color: '#a855f7' }} />
            <span className="font-display font-bold text-xs">Payment Config</span>
            <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
              UPI, QR & fees
            </span>
          </button>
        </div>
      </div>

      {/* ── Recent Activity Columns ── */}
      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="admin-card__title !mb-0">RECENT BOOKINGS</h3>
            <button
              type="button"
              className="admin-link text-xs inline-flex items-center gap-1"
              onClick={() => onOpenTab('bookings')}
              aria-label="View all bookings"
            >
              Manage all <ArrowRight size={12} />
            </button>
          </div>
          {bookings.slice(0, 6).map((b) => (
            <div key={b.id} className="admin-list-row">
              <span className="text-lg">{b.listings?.emoji || '🎮'}</span>
              <div className="flex-1 min-w-0">
                <div className="admin-cell-title truncate">{b.listings?.title || 'Gear Listing'}</div>
                <span className="admin-cell-sub">
                  {displayName(b.renter, 'Renter')} · {b.start_date} → {b.end_date} · ₹{Number(b.total_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span className={`admin-badge admin-badge--${b.status}`}>
                {BOOKING_LABEL[b.status] || b.status}
              </span>
            </div>
          ))}
          {bookings.length === 0 ? (
            <p className="admin-muted py-4 text-center">No bookings recorded yet.</p>
          ) : null}
        </div>

        <div className="admin-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="admin-card__title !mb-0">NEWEST MEMBERS</h3>
            <button
              type="button"
              className="admin-link text-xs inline-flex items-center gap-1"
              onClick={() => onOpenTab('users')}
              aria-label="View all users"
            >
              Manage all <ArrowRight size={12} />
            </button>
          </div>
          {users.slice(0, 6).map((u) => (
            <div key={u.id} className="admin-list-row">
              <div className="flex-1 min-w-0">
                <div className="admin-cell-title truncate">{displayName(u)}</div>
                <span className="admin-cell-sub">{u.email || 'No email'} · Joined {formatDate(u.created_at)}</span>
              </div>
              <span className={`admin-badge admin-badge--${u.kyc_status || 'pending'}`}>
                {KYC_LABEL[u.kyc_status] || 'Standard'}
              </span>
            </div>
          ))}
          {users.length === 0 ? (
            <p className="admin-muted py-4 text-center">No users onboarded yet.</p>
          ) : null}
        </div>

        <div className="admin-card md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="admin-card__title !mb-0">SITE TRAFFIC BY ACQUISITION SOURCE</h3>
            <button
              type="button"
              className="admin-link text-xs inline-flex items-center gap-1"
              onClick={() => onOpenTab('visits')}
              aria-label="Open site visits tracker"
            >
              Full analytics <ArrowRight size={12} />
            </button>
          </div>
          {visitStats.sources.length === 0 ? (
            <p className="admin-muted">
              No referral traffic logged yet. Share campaign links with <code className="text-pink-400 font-mono">?source=instagram</code> to track conversion sources automatically.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {visitStats.sources.slice(0, 4).map((s) => (
                <div key={s.source} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-cyan-300 font-semibold truncate">{s.source}</span>
                    <span className="text-[10px] text-white/40">
                      {visitStats.totalUnique > 0 ? `${Math.round((s.unique_count / visitStats.totalUnique) * 100)}%` : '0%'}
                    </span>
                  </div>
                  <div className="font-bungee text-lg text-white">
                    {s.unique_count.toLocaleString()} <span className="text-[10px] font-sans text-white/40 font-normal">uniques</span>
                  </div>
                  <div className="text-[10px] text-white/40">
                    {s.total_count} total sessions
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="admin-card__title !mb-0">LOW STOCK & INVENTORY WATCH</h3>
            <button
              type="button"
              className="admin-link text-xs inline-flex items-center gap-1"
              onClick={() => onOpenTab('stock')}
              aria-label="Open stock details"
            >
              Manage inventory <ArrowRight size={12} />
            </button>
          </div>
          {lowStockItems.slice(0, 6).map((l) => (
            <div key={l.id} className="admin-list-row">
              <span>{l.emoji || '📦'}</span>
              <div className="flex-1 min-w-0">
                <Link to={`/listing/${l.id}`} className="admin-link">{l.title}</Link>
                <span className="admin-cell-sub">
                  {l.location || 'City Hub'} · Available: {l.stock_qty ?? 0} of {l.stock_total ?? 1} unit{(l.stock_total ?? 1) === 1 ? '' : 's'}
                </span>
              </div>
              <span className="admin-badge admin-badge--low">
                {(l.stock_qty ?? 0) === 0 ? 'Booked Out' : 'Low Stock'}
              </span>
            </div>
          ))}
          {lowStockItems.length === 0 ? (
            <p className="admin-muted">All active listings have healthy stock levels.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
