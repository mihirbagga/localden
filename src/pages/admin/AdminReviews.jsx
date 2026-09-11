import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { AdminBadge, AdminConfirm, AdminEmpty, AdminSearch, matchesQuery } from './AdminShared'
import { displayName, explainAdminError, formatDate } from './adminHelpers'

function starText(rating) {
  const n = Math.max(0, Math.min(5, rating || 0))
  return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`
}

export default function AdminReviews({ reviews, patchReview, removeReview }) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => (
    reviews.filter((r) => matchesQuery([
      r.comment,
      r.listings?.title,
      r.reviewer?.full_name,
      r.reviewee?.full_name,
    ], query))
  ), [reviews, query])

  const toggleHidden = async (review) => {
    const isHidden = !review.is_hidden
    const { error } = await supabase
      .from('reviews')
      .update({ is_hidden: isHidden })
      .eq('id', review.id)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    patchReview(review.id, { is_hidden: isHidden })
    showToast(isHidden ? 'Review hidden from listing' : 'Review visible on listing', 'success')
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    const { error } = await supabase.from('reviews').delete().eq('id', deleteTarget.id)
    setBusy(false)
    if (error) {
      showToast(explainAdminError(error), 'error')
      return
    }
    removeReview(deleteTarget.id)
    showToast('Review deleted', 'success')
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search reviews, listing, reviewer…"
          ariaLabel="Search listing reviews"
        />
        <p className="admin-muted">{filtered.length} review{filtered.length === 1 ? '' : 's'}</p>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty emoji="⭐" title="No reviews yet" body="Moderate listing reviews here." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>From → To</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((review) => (
                <tr key={review.id}>
                  <td>
                    {review.listings?.id ? (
                      <Link to={`/listing/${review.listings.id}`} className="admin-link">
                        {review.listings?.emoji || '⭐'} {review.listings?.title || 'Listing'}
                      </Link>
                    ) : (
                      <span>Listing</span>
                    )}
                    <span className="admin-cell-sub">{formatDate(review.created_at)}</span>
                  </td>
                  <td>
                    {displayName(review.reviewer)} → {displayName(review.reviewee)}
                    <span className="admin-cell-sub">{review.review_type || 'review'}</span>
                  </td>
                  <td>
                    <span className="admin-stars" aria-label={`${review.rating} of 5 stars`}>
                      {starText(review.rating)}
                    </span>
                  </td>
                  <td>
                    <span className="admin-comment">{review.comment || '—'}</span>
                    {review.is_hidden ? (
                      <span className="admin-cell-sub">
                        <AdminBadge kind="hidden">Hidden</AdminBadge>
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className={`admin-icon-btn${review.is_hidden ? '' : ' admin-icon-btn--on'}`}
                        aria-label={review.is_hidden ? 'Show review on listing' : 'Hide review from listing'}
                        onClick={() => toggleHidden(review)}
                      >
                        {review.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Delete review"
                        onClick={() => setDeleteTarget(review)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget ? (
        <AdminConfirm
          title="Delete review?"
          body="This review is permanently removed from the listing."
          confirmLabel="Delete review"
          loading={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}
