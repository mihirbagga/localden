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

export async function submitReview({ bookingId, listingId, reviewerId, revieweeId, rating, comment }) {
  const { error } = await supabase.from('reviews').insert({
    id:          crypto.randomUUID(),
    booking_id:  bookingId,
    listing_id:  listingId,
    reviewer_id: reviewerId,
    reviewee_id: revieweeId,
    rating,
    comment:     comment?.trim() || null,
    created_at:  new Date().toISOString(),
  })
  if (error) throw error
}
