import { Link } from 'react-router-dom'
import { Users, Package, Calendar, Boxes } from 'lucide-react'
import { AdminStat } from './AdminShared'
import { displayName, formatDate, isLowStock, KYC_LABEL } from './adminHelpers'

export default function AdminOverview({ users, listings, bookings, onOpenTab }) {
  const kycQueue = users.filter((u) => u.kyc_status === 'submitted').length
  const pendingKyc = users.filter((u) => u.kyc_status === 'pending' || u.kyc_status === 'submitted').length
  const hiddenListings = listings.filter((l) => l.is_published === false).length
  const lowStockItems = listings.filter(isLowStock)
  const lowStock = lowStockItems.length
  const openBookings = bookings.filter((b) => ['pending', 'confirmed', 'active'].includes(b.status)).length

  return (
    <div>
      <div className="admin-stats">
        <AdminStat
          icon={<Users size={16} />}
          label="Onboarded users"
          value={users.length}
          sub={kycQueue ? `${kycQueue} KYC to review` : `${pendingKyc} KYC pending`}
          tone="magenta"
        />
        <AdminStat
          icon={<Package size={16} />}
          label="Listings"
          value={listings.length}
          sub={`${hiddenListings} hidden from browse`}
          tone="cyan"
        />
        <AdminStat
          icon={<Calendar size={16} />}
          label="Bookings"
          value={bookings.length}
          sub={`${openBookings} in progress`}
          tone="gold"
        />
        <AdminStat
          icon={<Boxes size={16} />}
          label="Low stock"
          value={lowStock}
          sub="qty at 1 or below"
          tone="green"
        />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="flex items-center justify-between">
            <h3 className="admin-card__title">RECENT USERS</h3>
            <button type="button" className="admin-link text-xs" onClick={() => onOpenTab('users')} aria-label="View all users">
              View all
            </button>
          </div>
          {users.slice(0, 5).map((u) => (
            <div key={u.id} className="admin-list-row">
              <div className="flex-1 min-w-0">
                <div className="admin-cell-title truncate">{displayName(u)}</div>
                <span className="admin-cell-sub">{u.email || 'No email'} · {formatDate(u.created_at)}</span>
              </div>
              <span className={`admin-badge admin-badge--${u.kyc_status || 'pending'}`}>
                {KYC_LABEL[u.kyc_status] || 'Pending'}
              </span>
            </div>
          ))}
          {users.length === 0 ? <p className="admin-muted">No users yet.</p> : null}
        </div>

        <div className="admin-card">
          <div className="flex items-center justify-between">
            <h3 className="admin-card__title">RECENT BOOKINGS</h3>
            <button type="button" className="admin-link text-xs" onClick={() => onOpenTab('bookings')} aria-label="View all bookings">
              View all
            </button>
          </div>
          {bookings.slice(0, 5).map((b) => (
            <div key={b.id} className="admin-list-row">
              <div className="flex-1 min-w-0">
                <div className="admin-cell-title truncate">{b.listings?.title || 'Listing'}</div>
                <span className="admin-cell-sub">{b.start_date} → {b.end_date} · ₹{b.total_amount}</span>
              </div>
              <span className={`admin-badge admin-badge--${b.status}`}>{b.status}</span>
            </div>
          ))}
          {bookings.length === 0 ? <p className="admin-muted">No bookings yet.</p> : null}
        </div>

        <div className="admin-card md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="admin-card__title">LOW STOCK</h3>
            <button type="button" className="admin-link text-xs" onClick={() => onOpenTab('stock')} aria-label="Open stock details">
              Manage stock
            </button>
          </div>
          {lowStockItems.slice(0, 6).map((l) => (
            <div key={l.id} className="admin-list-row">
              <span>{l.emoji || '📦'}</span>
              <div className="flex-1 min-w-0">
                <Link to={`/listing/${l.id}`} className="admin-link">{l.title}</Link>
                <span className="admin-cell-sub">{l.location} · qty {l.stock_qty ?? 0}/{l.stock_total ?? 0}</span>
              </div>
            </div>
          ))}
          {lowStock === 0 ? <p className="admin-muted">All listings have stock.</p> : null}
        </div>
      </div>
    </div>
  )
}
