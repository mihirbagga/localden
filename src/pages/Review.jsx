import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { submitReview } from '../hooks/useReviews'

export default function Review() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [booking,    setBooking]    = useState(null)
  const [rating,     setRating]     = useState(0)
  const [hover,      setHover]      = useState(0)
  const [comment,    setComment]    = useState('')
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)

  useEffect(() => {
    if (!bookingId || !user) return
    supabase
      .from('bookings')
      .select('*, listings(title, photos, category), profiles!bookings_lister_id_fkey(full_name)')
      .eq('id', bookingId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { showToast('Booking not found', 'error'); navigate('/dashboard'); return }
        if (data.status !== 'completed') { showToast('Can only review completed bookings', 'error'); navigate('/dashboard'); return }
        if (data.renter_id !== user.id && data.lister_id !== user.id) { navigate('/dashboard'); return }
        setBooking(data)
        setLoading(false)
      })
  }, [bookingId, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) { showToast('Pick a star rating', 'error'); return }
    setSubmitting(true)
    try {
      const revieweeId = booking.renter_id === user.id ? booking.lister_id : booking.renter_id
      await submitReview({ bookingId, listingId: booking.listing_id, reviewerId: user.id, revieweeId, rating, comment })
      setDone(true)
      showToast('Review submitted!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to submit', 'error')
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="relative min-h-screen pt-24 flex items-center justify-center">
      <div className="grid-floor" /><GameBackground />
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (done) return (
    <div className="relative min-h-screen pt-24 flex items-center justify-center">
      <div className="grid-floor" /><GameBackground />
      <div className="relative z-10 text-center px-4">
        <div className="text-6xl mb-4">⭐</div>
        <h2 className="font-bungee text-3xl text-white mb-3">Review Submitted!</h2>
        <p className="font-display mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>Thanks for helping the community.</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    </div>
  )

  const listing = booking?.listings
  const accent  = listing?.category === 'gaming' ? '#ff2e6d' : '#00e5ff'

  return (
    <div className="relative min-h-screen pt-24 pb-20">
      <div className="grid-floor" /><GameBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4">
        <div className="glass rounded-3xl p-8">
          <p className="section-label mb-2">Rate Your Experience</p>
          <h1 className="font-bungee text-2xl text-white mb-1">{listing?.title}</h1>
          <p className="font-display text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {new Date(booking.start_date).toLocaleDateString('en-IN')} – {new Date(booking.end_date).toLocaleDateString('en-IN')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star picker */}
            <div>
              <label className="field-label mb-3 block">YOUR RATING</label>
              <div className="flex gap-3">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button"
                    onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(s)}
                    className="transition-transform hover:scale-110 active:scale-95">
                    <Star size={40}
                      fill={(hover || rating) >= s ? '#ffd23f' : 'transparent'}
                      style={{ color: (hover || rating) >= s ? '#ffd23f' : 'rgba(255,255,255,0.2)' }} />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm font-display mt-2 font-bold" style={{ color: '#ffd23f' }}>
                  {['','😞 Poor','😐 Fair','🙂 Good','😄 Great','🤩 Excellent!'][rating]}
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="field-label mb-2 block">YOUR REVIEW <span style={{ color: 'rgba(255,255,255,0.3)' }}>(OPTIONAL)</span></label>
              <textarea
                value={comment} onChange={e => setComment(e.target.value)}
                rows={4} placeholder="Share your experience with this item and lister..."
                className="input-dark w-full resize-none" style={{ paddingTop: 12, paddingBottom: 12 }} />
            </div>

            <button type="submit" disabled={submitting || rating === 0} className="btn-primary w-full py-4"
              style={{ opacity: rating === 0 ? 0.5 : 1 }}>
              {submitting ? 'Submitting…' : '⭐ Submit Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
