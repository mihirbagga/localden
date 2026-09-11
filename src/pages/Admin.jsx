import { useState } from 'react'
import { Users, Package, Calendar, Star, Boxes, LayoutDashboard, Shield, Ticket, CreditCard } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useAuth } from '../contexts/AuthContext'
import { useAdminData } from '../hooks/useAdminData'
import { AdminTab } from './admin/AdminShared'
import AdminOverview from './admin/AdminOverview'
import AdminUsers from './admin/AdminUsers'
import AdminListings from './admin/AdminListings'
import AdminBookings from './admin/AdminBookings'
import AdminStock from './admin/AdminStock'
import AdminReviews from './admin/AdminReviews'
import AdminCoupons from './admin/AdminCoupons'
import AdminPayments from './admin/AdminPayments'
import './admin/admin.css'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'listings', label: 'Listings', icon: Package },
  { id: 'bookings', label: 'Bookings', icon: Calendar },
  { id: 'stock', label: 'Stock', icon: Boxes },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'payments', label: 'Payments', icon: CreditCard },
]

export default function Admin() {
  const { user, isSuperAdmin } = useAuth()
  const data = useAdminData()
  const [tab, setTab] = useState('overview')

  const counts = {
    overview: 0,
    users: data.users.length,
    listings: data.listings.length,
    bookings: data.bookings.length,
    stock: data.listings.length,
    reviews: data.reviews.length,
    coupons: data.coupons.length,
    payments: data.paymentMethods.length,
  }

  return (
    <div className="admin-page">
      <div className="grid-floor" />
      <GameBackground />

      <div className="admin-wrap">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Control room</p>
            <h1 className="admin-title">Admin Panel</h1>
            <p className="admin-subtitle">
              Review users, listings, bookings, stock, reviews, coupons, and payments.
            </p>
          </div>
          <span className={`admin-role-badge admin-role-badge--${isSuperAdmin ? 'super' : 'admin'}`}>
            <Shield size={12} aria-hidden="true" />
            {isSuperAdmin ? 'Overall Admin' : 'User Admin'}
          </span>
        </header>

        <div className="admin-tabs" role="tablist" aria-label="Admin sections">
          {TABS.map((item) => {
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

        {data.loading ? (
          <div className="admin-empty">
            <div className="w-10 h-10 rounded-full border-2 animate-spin admin-spinner mx-auto mb-3" />
            <p className="admin-muted">Loading admin data…</p>
          </div>
        ) : null}

        {!data.loading && tab === 'overview' ? (
          <AdminOverview
            users={data.users}
            listings={data.listings}
            bookings={data.bookings}
            onOpenTab={setTab}
          />
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

        {!data.loading && tab === 'payments' ? (
          <AdminPayments
            methods={data.paymentMethods}
            patchMethod={data.patchPaymentMethod}
          />
        ) : null}
      </div>
    </div>
  )
}
