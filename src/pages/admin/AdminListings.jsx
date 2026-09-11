import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Star, Shield, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { AdminBadge, AdminConfirm, AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { displayName, explainAdminError } from './adminHelpers'

export default function AdminListings({ listings, patchListing, removeListing }) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => (
    listings.filter((l) => matchesQuery([l.title, l.location, l.subcategory, l.brand, l.profiles?.full_name], query))
  ), [listings, query])

  const updateListing = async (listing, patch, okMsg) => {
    const { error } = await supabase
      .from('listings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    patchListing(listing.id, patch)
    showToast(okMsg, 'success')
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    const { error } = await supabase.from('listings').delete().eq('id', deleteTarget.id)
    setBusy(false)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    removeListing(deleteTarget.id)
    showToast('Listing removed', 'success')
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search listings, lister, area…"
          ariaLabel="Search listings"
        />
        <p className="admin-muted">{filtered.length} listing{filtered.length === 1 ? '' : 's'}</p>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty emoji="📦" title="No listings found" body="Approve, hide, or feature listings here." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Lister</th>
                <th>Price</th>
                <th>Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((listing) => {
                const published = listing.is_published !== false
                return (
                  <tr key={listing.id}>
                    <td>
                      <span className="admin-cell-title">{listing.emoji || '🎮'} {listing.title}</span>
                      <span className="admin-cell-sub">{listing.category} · {listing.subcategory} · {listing.location}</span>
                    </td>
                    <td>
                      {displayName(listing.profiles)}
                      <span className="admin-cell-sub">{listing.profiles?.email || ''}</span>
                    </td>
                    <td>₹{listing.price_day}/day</td>
                    <td>
                      <div className="admin-actions">
                        <AdminBadge kind={published ? 'live' : 'hidden'}>
                          {published ? 'Shown' : 'Hidden'}
                        </AdminBadge>
                        {listing.is_featured ? <AdminBadge kind="disputed">Featured</AdminBadge> : null}
                        {listing.is_verified ? <AdminBadge kind="verified">Verified</AdminBadge> : null}
                        <AdminBadge kind={listing.is_available ? 'live' : 'hidden'}>
                          {listing.is_available ? 'In stock' : 'Off'}
                        </AdminBadge>
                      </div>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <Link
                          to={`/listing/${listing.id}`}
                          className="admin-icon-btn"
                          aria-label={`View ${listing.title}`}
                        >
                          <Eye size={14} />
                        </Link>
                        <button
                          type="button"
                          className={`admin-icon-btn${published ? ' admin-icon-btn--on' : ''}`}
                          aria-label={published ? `Hide ${listing.title} from browse` : `Show ${listing.title} on browse`}
                          onClick={() => updateListing(
                            listing,
                            { is_published: !published },
                            published ? 'Listing hidden from browse' : 'Listing visible on browse'
                          )}
                        >
                          {published ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          type="button"
                          className={`admin-icon-btn${listing.is_available ? ' admin-icon-btn--on' : ''}`}
                          aria-label={listing.is_available ? `Mark ${listing.title} unavailable` : `Mark ${listing.title} available`}
                          onClick={() => updateListing(
                            listing,
                            { is_available: !listing.is_available },
                            listing.is_available ? 'Marked unavailable' : 'Marked available'
                          )}
                        >
                          {listing.is_available ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                        <button
                          type="button"
                          className={`admin-icon-btn${listing.is_featured ? ' admin-icon-btn--on' : ''}`}
                          aria-label={listing.is_featured ? `Unfeature ${listing.title}` : `Feature ${listing.title}`}
                          onClick={() => updateListing(
                            listing,
                            { is_featured: !listing.is_featured },
                            listing.is_featured ? 'Removed from featured' : 'Listing featured'
                          )}
                        >
                          <Star size={14} />
                        </button>
                        <button
                          type="button"
                          className={`admin-icon-btn${listing.is_verified ? ' admin-icon-btn--on' : ''}`}
                          aria-label={listing.is_verified ? `Unverify ${listing.title}` : `Verify ${listing.title}`}
                          onClick={() => updateListing(
                            listing,
                            { is_verified: !listing.is_verified },
                            listing.is_verified ? 'Verification removed' : 'Listing verified'
                          )}
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--danger"
                          aria-label={`Delete ${listing.title}`}
                          onClick={() => setDeleteTarget(listing)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget ? (
        <AdminConfirm
          title="Delete listing?"
          body={`${deleteTarget.title} will be removed. Bookings tied to it may cascade.`}
          confirmLabel="Delete"
          loading={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}
