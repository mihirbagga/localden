import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Star, Calendar, Check, ThumbsUp, AlertTriangle, Lightbulb, ArrowLeft, Lock } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { submitReview } from '../hooks/useReviews'
import {
  RATING_LABELS, REVIEW_TAGS, COMMENT_MAX, IMPROVEMENT_MAX, reviewDirection,
} from '../lib/reviews'
import { getListingHeroPhoto } from '../lib/listingPhotos'
import './review.css'

const BOOKING_SELECT = '*, listings(title, photos, category, emoji), renter:profiles!renter_id(full_name, avatar_url), lister:profiles!lister_id(full_name, avatar_url)'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(String(iso).length === 10 ? `${iso}T00:00:00` : iso)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Stars({ value, size = 16 }) {
  return (
    <span className="rv-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} fill={value >= s ? 'currentColor' : 'transparent'} className={value >= s ? 'is-on' : ''} />
      ))}
    </span>
  )
}

export default function Review() {
  const { bookingId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [booking,     setBooking]     = useState(null)
  const [existing,    setExisting]    = useState(null)
  const [rating,      setRating]      = useState(() => {
    const preset = Number(params.get('rating'))
    return preset >= 1 && preset <= 5 ? preset : 0
  })
  const [hover,       setHover]       = useState(0)
  const [tags,        setTags]        = useState([])
  const [comment,     setComment]     = useState('')
  const [improvement, setImprovement] = useState('')
  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(null)

  useEffect(() => {
    if (!bookingId || !user) return
    let cancelled = false
    async function loadBooking() {
      let { data, error } = await supabase
        .from('bookings')
        .select(BOOKING_SELECT)
        .eq('id', bookingId)
        .maybeSingle()

      if (error || !data) {
        const fallback = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .maybeSingle()
        data = fallback.data
        error = fallback.error
      }

      if (cancelled) return
      if (error || !data) {
        showToast('Booking not found', 'error')
        navigate('/dashboard')
        return
      }
      if (data.renter_id !== user.id && data.lister_id !== user.id) {
        navigate('/dashboard')
        return
      }
      if (data.status !== 'completed') {
        showToast('You can review once the rental is completed', 'error')
        navigate(`/dashboard?tab=${data.renter_id === user.id ? 'bookings' : 'incoming'}`)
        return
      }

      const { data: mine } = await supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('reviewer_id', user.id)
        .maybeSingle()

      if (cancelled) return
      setBooking(data)
      setExisting(mine || null)
      setLoading(false)
    }
    loadBooking()
    return () => { cancelled = true }
  }, [bookingId, user])

  const direction = reviewDirection(booking, user?.id)
  const isRenter = direction === 'renter_to_lister'
  const party = isRenter ? booking?.lister : booking?.renter
  const partyName = party?.full_name || (isRenter ? 'your host' : 'your renter')
  const partyFirst = partyName.split(' ')[0]
  const sentiment = rating > 0 && rating <= 3 ? 'bad' : 'good'
  const tagOptions = REVIEW_TAGS[direction][sentiment]
  const backTo = `/dashboard?tab=${isRenter ? 'bookings' : 'incoming'}`

  // Switching between praise and problem tags drops picks that no longer apply
  useEffect(() => {
    setTags((prev) => prev.filter((t) => tagOptions.includes(t)))
  }, [sentiment, direction])

  const toggleTag = (tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) { showToast('Pick a star rating', 'error'); return }
    setSubmitting(true)
    try {
      const revieweeId = isRenter ? booking.lister_id : booking.renter_id
      const res = await submitReview({
        bookingId,
        listingId: booking.listing_id,
        reviewerId: user.id,
        revieweeId,
        rating,
        comment,
        reviewType: direction,
        highlights: tags,
        improvement,
      })
      if (!res.feedbackSaved && (tags.length || improvement.trim())) {
        showToast('Rating saved. Tags and suggestion need a database update to be stored.', 'error')
      } else {
        showToast('Review submitted!', 'success')
      }
      setDone({ rating, comment: comment.trim(), tags, improvement: improvement.trim() })
    } catch (err) {
      showToast(err.message || 'Failed to submit', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="rv-page is-center">
      <div className="grid-floor" /><GameBackground />
      <div className="rv-spinner" aria-label="Loading" />
    </div>
  )

  const listing = booking?.listings
  const photo = getListingHeroPhoto(listing)

  const header = (
    <header className="rv-head">
      <span className="rv-thumb">{photo ? <img src={photo} alt="" /> : (listing?.emoji || '🎮')}</span>
      <div>
        <span className="rv-eyebrow">{isRenter ? 'Rate your rental' : 'Rate your renter'}</span>
        <h1>{listing?.title || 'Your booking'}</h1>
        <p><Calendar size={13} /> {fmtDate(booking.start_date)} – {fmtDate(booking.end_date)}</p>
        <p className="rv-party">
          <span className="rv-avatar">
            {party?.avatar_url ? <img src={party.avatar_url} alt="" /> : partyFirst[0]?.toUpperCase()}
          </span>
          {isRenter ? 'Hosted by' : 'Rented by'} <strong>{partyName}</strong>
        </p>
      </div>
    </header>
  )

  const summary = done || existing

  if (summary) {
    const r = summary
    return (
      <div className="rv-page">
        <div className="grid-floor" /><GameBackground />
        <div className="rv-wrap">
          <Link to={backTo} className="rv-back"><ArrowLeft size={15} /> Back to dashboard</Link>
          <div className="rv-card">
            {header}
            <div className="rv-done">
              <span className="rv-done__icon"><Check size={26} /></span>
              <h2>{done ? 'Thanks for your review!' : 'You already reviewed this rental'}</h2>
              <p>{done ? `It helps ${partyFirst} and everyone renting on लोकल Den.` : 'Reviews can’t be edited after posting.'}</p>
            </div>
            <div className="rv-recap">
              <div className="rv-recap__rating">
                <Stars value={r.rating} size={20} />
                <strong>{RATING_LABELS[r.rating]}</strong>
              </div>
              {(r.tags || r.highlights)?.length ? (
                <div className="rv-chips is-static">
                  {(r.tags || r.highlights).map((t) => <span key={t} className="rv-chip is-on">{t}</span>)}
                </div>
              ) : null}
              {r.comment ? <blockquote>“{r.comment}”</blockquote> : null}
              {r.improvement ? (
                <div className="rv-note">
                  <Lightbulb size={15} />
                  <div><strong>Your suggestion for {partyFirst}</strong><p>{r.improvement}</p></div>
                </div>
              ) : null}
            </div>
            <div className="rv-actions">
              <Link to={backTo} className="btn-primary">Back to dashboard</Link>
              <Link to="/browse" className="btn-outline">Browse gear</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const shown = hover || rating

  return (
    <div className="rv-page">
      <div className="grid-floor" /><GameBackground />
      <div className="rv-wrap">
        <Link to={backTo} className="rv-back"><ArrowLeft size={15} /> Back to dashboard</Link>
        <form className="rv-card" onSubmit={handleSubmit}>
          {header}

          <section className="rv-step">
            <h2><span>1</span> How was it overall?</h2>
            <div className="rv-picker" role="radiogroup" aria-label="Star rating" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={rating === s}
                  aria-label={`${s} star${s === 1 ? '' : 's'} – ${RATING_LABELS[s]}`}
                  className={shown >= s ? 'is-on' : ''}
                  onMouseEnter={() => setHover(s)}
                  onFocus={() => setHover(s)}
                  onBlur={() => setHover(0)}
                  onClick={() => setRating(s)}
                >
                  <Star size={38} fill={shown >= s ? 'currentColor' : 'transparent'} />
                </button>
              ))}
            </div>
            <p className={`rv-picker__label${shown ? ' is-set' : ''}`}>
              {shown ? RATING_LABELS[shown] : 'Tap a star to rate'}
            </p>
          </section>

          <section className={`rv-step${rating ? '' : ' is-locked'}`} aria-disabled={!rating}>
            <h2>
              <span>2</span>
              {sentiment === 'bad'
                ? <>What went wrong? <AlertTriangle size={15} className="rv-ico is-warn" /></>
                : <>What stood out? <ThumbsUp size={15} className="rv-ico is-ok" /></>}
              <small>Pick any</small>
            </h2>
            <div className="rv-chips">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`rv-chip${tags.includes(tag) ? ' is-on' : ''}${sentiment === 'bad' ? ' is-bad' : ''}`}
                  aria-pressed={tags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                  disabled={!rating}
                >
                  {tags.includes(tag) ? <Check size={13} /> : null} {tag}
                </button>
              ))}
            </div>
          </section>

          <section className={`rv-step${rating ? '' : ' is-locked'}`}>
            <h2><span>3</span> Write a review <small>Optional · public</small></h2>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
              rows={4}
              disabled={!rating}
              placeholder={isRenter
                ? `How was the ${listing?.title || 'gear'}? Was the handover smooth?`
                : `How was ${partyFirst} as a renter? Would you rent to them again?`}
              className="input-dark rv-text"
            />
            <span className="rv-count">{comment.length}/{COMMENT_MAX}</span>
          </section>

          <section className={`rv-step${rating ? '' : ' is-locked'}`}>
            <h2>
              <span>4</span>
              {rating === 5 ? `Anything that would make it even better?` : `How could ${partyFirst} make it better?`}
              <small>Optional</small>
            </h2>
            <textarea
              value={improvement}
              onChange={(e) => setImprovement(e.target.value.slice(0, IMPROVEMENT_MAX))}
              rows={3}
              disabled={!rating}
              placeholder={isRenter
                ? 'e.g. Include a spare HDMI cable, share setup tips, reply a bit faster…'
                : 'e.g. Return the gear in its case, confirm pickup time a day earlier…'}
              className="input-dark rv-text"
            />
            <p className="rv-hint">
              <Lock size={12} /> Shown to {partyFirst} on their dashboard to help them improve, not on the public listing page.
            </p>
          </section>

          <div className="rv-submit">
            <button type="submit" disabled={submitting || rating === 0} className="btn-primary">
              {submitting ? 'Submitting…' : rating ? `Post ${rating}★ review` : 'Pick a rating to continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
