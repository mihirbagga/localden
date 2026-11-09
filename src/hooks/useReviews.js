import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useReviews(listingId) {
  const [reviews,   setReviews]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [avgRating, setAvgRating] = useState(0)

  useEffect(() => {
    if (!listingId) return
    setLoading(true)
    supabase
      .from('reviews')
      .select('*, profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = data || []
        setReviews(rows)
        if (rows.length) setAvgRating(rows.reduce((s, r) => s + r.rating, 0) / rows.length)
        setLoading(false)
      })
  }, [listingId])

  return { reviews, loading, avgRating, count: reviews.length }
}

// Returns { saved: true, feedbackSaved } — feedbackSaved is false when the
// review_feedback_migration columns aren't deployed yet and only rating/comment were stored.
export async function submitReview({
  bookingId, listingId, reviewerId, revieweeId, rating, comment,
  reviewType = null, highlights = [], improvement = '',
}) {
  const base = {
    id:          crypto.randomUUID(),
    booking_id:  bookingId,
    listing_id:  listingId,
    reviewer_id: reviewerId,
    reviewee_id: revieweeId,
    rating,
    comment:     comment?.trim() || null,
    review_type: reviewType,
    created_at:  new Date().toISOString(),
  }
  const feedback = { highlights, improvement: improvement?.trim() || null }

  const { error } = await supabase.from('reviews').insert({ ...base, ...feedback })
  if (!error) return { saved: true, feedbackSaved: true }

  if (error.code === '23505') throw new Error('You have already reviewed this booking.')

  // Feedback columns missing (migration not run yet) → keep the core review
  const missingColumn = error.code === '42703' || error.code === 'PGRST204' || /highlights|improvement/i.test(error.message || '')
  if (!missingColumn) throw error

  const { review_type: _type, ...core } = base
  const retry = await supabase.from('reviews').insert(core)
  if (retry.error) {
    if (retry.error.code === '23505') throw new Error('You have already reviewed this booking.')
    throw retry.error
  }
  return { saved: true, feedbackSaved: false }
}
