import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { BOOKING_LABEL, BOOKING_STATUSES, displayName, explainAdminError, formatDate, shortId } from './adminHelpers'

export default function AdminBookings({ bookings, patchBooking }) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => (
    bookings.filter((b) => matchesQuery([
      b.listings?.title,
      b.renter?.full_name,
      b.renter?.email,
      b.lister?.full_name,
      b.status,
      b.razorpay_payment_id,
      b.coupon_code,
    ], query))
  ), [bookings, query])

  const handleStatus = async (booking, status) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', booking.id)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    patchBooking(booking.id, { status })
    showToast(`Booking ${BOOKING_LABEL[status] || status}`, 'success')
  }

  return (
    <div>
      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search booking, renter, payment…"
          ariaLabel="Search bookings"
        />
        <p className="admin-muted">{filtered.length} booking{filtered.length === 1 ? '' : 's'}</p>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty emoji="📅" title="No bookings found" body="All platform bookings land here." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Renter</th>
                <th>Lister</th>
                <th>Dates</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    {booking.listings?.id ? (
                      <Link to={`/listing/${booking.listings.id}`} className="admin-link">
                        {booking.listings?.emoji || '🎮'} {booking.listings?.title || 'Listing'}
                      </Link>
                    ) : (
                      <span className="admin-cell-title">{booking.listings?.title || 'Listing'}</span>
                    )}
                    <span className="admin-cell-sub">{shortId(booking.id)} · {formatDate(booking.created_at)}</span>
                  </td>
                  <td>
                    {displayName(booking.renter)}
                    <span className="admin-cell-sub">{booking.renter?.email || ''}</span>
                  </td>
                  <td>{displayName(booking.lister)}</td>
                  <td>
                    {booking.start_date} → {booking.end_date}
                    <span className="admin-cell-sub">{booking.total_days} day{booking.total_days === 1 ? '' : 's'}</span>
                  </td>
                  <td>
                    ₹{booking.total_amount}
                    <span className="admin-cell-sub">
                      {booking.payment_status || 'pending'}
                      {booking.payment_method ? ` · ${booking.payment_method}` : ''}
                      {booking.payment_ref ? ` · ${booking.payment_ref}` : ''}
                      {booking.coupon_code ? ` · ${booking.coupon_code} −₹${booking.discount_amount || 0}` : ''}
                    </span>
                  </td>
                  <td>
                    <select
                      className="select-dark admin-select"
                      value={booking.status}
                      aria-label={`Status for booking ${shortId(booking.id)}`}
                      title="Change booking status"
                      onChange={(e) => handleStatus(booking, e.target.value)}
                    >
                      {BOOKING_STATUSES.map((opt) => (
                        <option key={opt} value={opt}>{BOOKING_LABEL[opt]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
