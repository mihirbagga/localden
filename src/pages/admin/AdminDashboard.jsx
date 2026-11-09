import { useMemo, useState } from 'react'
import {
  TrendingUp, Users, Package, Eye, Calendar,
  ShieldCheck, Wallet, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, ChevronRight, Plus, Tag,
  Send, Download, AlertCircle, Sparkles
} from 'lucide-react'
import { displayName, formatDate, BOOKING_LABEL } from './adminHelpers'

export default function AdminDashboard({
  users = [],
  listings = [],
  bookings = [],
  kycSubmissions = [],
  pendingPayouts = 0,
  onOpenTab
}) {
  const [metricTab, setMetricTab] = useState('gmv')
  const [timeRange, setTimeRange] = useState('30d')

  // Calculated KPI numbers
  const grossBookingVolume = useMemo(() => {
    return bookings
      .filter((b) => ['confirmed', 'active', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)
  }, [bookings])

  const netRevenue = useMemo(() => {
    // 15% estimated platform fee
    return Math.round(grossBookingVolume * 0.15)
  }, [grossBookingVolume])

  const activeBookingsCount = useMemo(() => {
    return bookings.filter((b) => ['confirmed', 'active'].includes(b.status)).length
  }, [bookings])

  const activeListingsCount = useMemo(() => {
    return listings.filter((l) => l.is_published !== false && l.is_available !== false).length
  }, [listings])

  // Action Center Queues
  const pendingKycCount = useMemo(() => {
    return kycSubmissions.filter((k) => k.status === 'submitted').length ||
      users.filter((u) => u.kyc_status === 'submitted').length
  }, [kycSubmissions, users])

  const pendingPaymentBookings = useMemo(() => {
    return bookings.filter((b) => b.payment_status === 'marked_paid' && !b.payment_verified).length
  }, [bookings])

  const pendingApprovalsCount = useMemo(() => {
    return listings.filter((l) => l.is_published === false).length
  }, [listings])

  const totalActionsPending = pendingKycCount + pendingPaymentBookings + pendingPayouts + (pendingApprovalsCount > 0 ? 1 : 0)

  // Category Distribution
  const categoryCounts = useMemo(() => {
    const counts = { Gaming: 0, 'Audio & Music': 0, Streaming: 0, Others: 0 }
    listings.forEach((item) => {
      const cat = (item.category || '').toLowerCase()
      if (cat.includes('game') || cat.includes('playstation') || cat.includes('ps5') || cat.includes('xbox')) {
        counts.Gaming++
      } else if (cat.includes('audio') || cat.includes('music') || cat.includes('dj') || cat.includes('mic')) {
        counts['Audio & Music']++
      } else if (cat.includes('stream') || cat.includes('camera') || cat.includes('lens')) {
        counts.Streaming++
      } else {
        counts.Others++
      }
    })
    return counts
  }, [listings])

  return (
    <div className="space-y-6">
      {/* Header Banner with Time Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Dashboard
            </h1>
            <p className="text-xs text-white/50">
              Your operations command center for Local Den.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 outline-none hover:bg-white/10 transition-colors cursor-pointer"
          >
            <option value="7d" className="bg-[#0b0f19]">Last 7 days</option>
            <option value="30d" className="bg-[#0b0f19]">Last 30 days</option>
            <option value="90d" className="bg-[#0b0f19]">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total GMV */}
        <div className="dashboard-kpi-card green">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Total GMV</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              ₹
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            ₹{grossBookingVolume.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-medium">
            <ArrowUpRight size={14} />
            <span>+12.8%</span>
            <span className="text-white/40 font-normal">vs previous period</span>
          </div>
        </div>

        {/* Net Revenue */}
        <div className="dashboard-kpi-card cyan">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Net Revenue</span>
            <span className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <TrendingUp size={14} />
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            ₹{netRevenue.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-cyan-400 font-medium">
            <ArrowUpRight size={14} />
            <span>+15.3%</span>
            <span className="text-white/40 font-normal">take rate ~15%</span>
          </div>
        </div>

        {/* Active Bookings */}
        <div className="dashboard-kpi-card magenta">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Active Bookings</span>
            <span className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Calendar size={14} />
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {activeBookingsCount}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-pink-400 font-medium">
            <ArrowUpRight size={14} />
            <span>+8.9%</span>
            <span className="text-white/40 font-normal">ongoing rentals</span>
          </div>
        </div>

        {/* Active Listings */}
        <div className="dashboard-kpi-card gold">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Active Listings</span>
            <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Package size={14} />
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {activeListingsCount}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-400 font-medium">
            <ArrowUpRight size={14} />
            <span>+21.1%</span>
            <span className="text-white/40 font-normal">in catalogue</span>
          </div>
        </div>
      </div>

      {/* Main Row: Business Performance + Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Performance Area Chart / Graphic */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0f1422]/70 border border-white/5 p-5 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#ff2e6d]" />
                  Business Performance
                </h3>
                <span className="text-xs text-white/40">Growth trajectory over selected period</span>
              </div>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                {['gmv', 'revenue', 'bookings', 'users'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetricTab(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                      metricTab === m
                        ? 'bg-[#ff2e6d] text-white shadow-sm'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Aesthetic SVG Chart */}
            <div className="relative h-56 w-full flex items-end pt-4 pb-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff2e6d" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ff2e6d" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal reference lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="500" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

                {/* Fill Area */}
                <path
                  d="M 0 130 Q 80 110, 150 90 T 300 70 T 400 40 T 500 20 L 500 150 L 0 150 Z"
                  fill="url(#chartGradient)"
                />
                {/* Stroke Line */}
                <path
                  d="M 0 130 Q 80 110, 150 90 T 300 70 T 400 40 T 500 20"
                  fill="none"
                  stroke="#ff2e6d"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* Highlight Point */}
                <circle cx="400" cy="40" r="5" fill="#ff2e6d" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/30 pt-3 border-t border-white/5 font-mono">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
          </div>
        </div>

        {/* Action Center Widget */}
        <div className="rounded-2xl bg-[#0f1422]/70 border border-white/5 p-5 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff2e6d] animate-pulse" />
                <h3 className="text-sm font-bold text-white">Action Center</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-semibold">
                {totalActionsPending} pending
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Payment Verification Queue */}
              <button
                type="button"
                onClick={() => onOpenTab('bookings')}
                className="w-full text-left p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
                    <Calendar size={17} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-pink-400 transition-colors">
                      Payment Verification
                    </h4>
                    <p className="text-[11px] text-white/40">
                      {pendingPaymentBookings} bookings awaiting review
                    </p>
                  </div>
                </div>
                {pendingPaymentBookings > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#ff2e6d] text-white font-bold text-xs">
                    {pendingPaymentBookings}
                  </span>
                )}
              </button>

              {/* KYC Review Queue */}
              <button
                type="button"
                onClick={() => onOpenTab('kyc')}
                className="w-full text-left p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                      KYC Verification
                    </h4>
                    <p className="text-[11px] text-white/40">
                      {pendingKycCount} users awaiting doc review
                    </p>
                  </div>
                </div>
                {pendingKycCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-bold text-xs">
                    {pendingKycCount}
                  </span>
                )}
              </button>

              {/* Lister Payouts Queue */}
              <button
                type="button"
                onClick={() => onOpenTab('payouts')}
                className="w-full text-left p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Wallet size={17} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors">
                      Lister Payout Requests
                    </h4>
                    <p className="text-[11px] text-white/40">
                      {pendingPayouts} requests waiting transfer
                    </p>
                  </div>
                </div>
                {pendingPayouts > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-black font-bold text-xs">
                    {pendingPayouts}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 mt-4">
            <span className="text-[11px] text-white/40 block text-center">
              All system triggers refreshed real-time
            </span>
          </div>
        </div>
      </div>

      {/* Row: Quick Actions + Gear by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Panel */}
        <div className="rounded-2xl bg-[#0f1422]/70 border border-white/5 p-5 backdrop-blur-sm">
          <h3 className="text-sm font-bold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onOpenTab('listings')}
              className="p-3.5 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/5 border border-pink-500/20 hover:border-pink-500/40 text-left transition-all group"
            >
              <Plus size={18} className="text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Add Listing</div>
              <div className="text-[10px] text-white/40">Catalogue gear</div>
            </button>

            <button
              type="button"
              onClick={() => onOpenTab('coupons')}
              className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/5 border border-cyan-500/20 hover:border-cyan-500/40 text-left transition-all group"
            >
              <Tag size={18} className="text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Create Coupon</div>
              <div className="text-[10px] text-white/40">Run promotions</div>
            </button>

            <button
              type="button"
              onClick={() => onOpenTab('whatsapp')}
              className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/20 hover:border-amber-500/40 text-left transition-all group"
            >
              <Send size={18} className="text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Send Alert</div>
              <div className="text-[10px] text-white/40">Broadcast update</div>
            </button>

            <button
              type="button"
              onClick={() => onOpenTab('visits')}
              className="p-3.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/20 hover:border-purple-500/40 text-left transition-all group"
            >
              <Download size={18} className="text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Export Data</div>
              <div className="text-[10px] text-white/40">PDF / CSV logs</div>
            </button>
          </div>
        </div>

        {/* Gear by Category breakdown */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0f1422]/70 border border-white/5 p-5 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Gear Distribution by Category</h3>
              <span className="text-xs text-white/40 font-mono">{listings.length} total units</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = listings.length > 0 ? Math.round((count / listings.length) * 100) : 0
                return (
                  <div key={cat} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                    <span className="text-xs font-medium text-white/70 block truncate">{cat}</span>
                    <div className="text-lg font-black text-white">{count}</div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#ff2e6d] to-[#00e5ff] h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/40 block font-mono">{pct}% of inventory</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="text-[11px] text-white/30 pt-3 border-t border-white/5 mt-4">
            Stock availability adjusts automatically upon active renter reservations
          </div>
        </div>
      </div>

      {/* Recent Bookings Table Preview */}
      <div className="rounded-2xl bg-[#0f1422]/70 border border-white/5 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Bookings</h3>
            <span className="text-xs text-white/40">Latest incoming rentals across active cities</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenTab('bookings')}
            className="text-xs font-semibold text-[#00e5ff] hover:underline flex items-center gap-1"
          >
            View All <ChevronRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Booking ID</th>
                <th className="pb-3 font-semibold">Gear</th>
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Rental Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.slice(0, 5).map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 font-mono text-white/80">
                    #{String(b.id).slice(0, 8).toUpperCase()}
                  </td>
                  <td className="py-3 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <span>{b.listings?.emoji || '🎮'}</span>
                      <span className="truncate max-w-[140px]">{b.listings?.title || 'System'}</span>
                    </div>
                  </td>
                  <td className="py-3 text-white/70">
                    {displayName(b.renter, 'Renter')}
                  </td>
                  <td className="py-3 font-bold text-white font-mono">
                    ₹{Number(b.total_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      b.status === 'confirmed' || b.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : b.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-white/5 text-white/50'
                    }`}>
                      {BOOKING_LABEL[b.status] || b.status}
                    </span>
                  </td>
                  <td className="py-3 text-white/50 text-[11px]">
                    {b.start_date} → {b.end_date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.length === 0 && (
            <div className="text-center py-8 text-white/40 text-xs">
              No recent bookings found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

