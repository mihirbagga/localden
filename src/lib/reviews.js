// Review vocabulary shared by the Review page and the dashboard booking detail.

export const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

// Highlight tags differ by direction (renter reviewing host vs host reviewing renter)
// and by sentiment, so a 2★ review asks "what went wrong" instead of offering praise.
export const REVIEW_TAGS = {
  renter_to_lister: {
    good: ['Gear as described', 'Clean & working', 'On-time handover', 'Friendly host', 'Great value', 'Quick replies'],
    bad: ['Not as described', 'Missing accessories', 'Late handover', 'Hard to reach', 'Condition issues', 'Overpriced'],
  },
  lister_to_renter: {
    good: ['Returned on time', 'Took good care', 'Clear communication', 'Smooth handover', 'Would rent again'],
    bad: ['Returned late', 'Damage or wear', 'Missing items', 'Hard to reach', 'Changed plans last minute'],
  },
}

export const COMMENT_MAX = 500
export const IMPROVEMENT_MAX = 600

export function reviewDirection(booking, userId) {
  return booking?.renter_id === userId ? 'renter_to_lister' : 'lister_to_renter'
}

export function reviewLink(bookingId) {
  return `${window.location.origin}/review/${bookingId}`
}

export function askForReviewText({ booking, asRole, partyName }) {
  const first = (partyName || '').split(' ')[0] || 'there'
  const title = booking?.listings?.title || 'your rental'
  const thanks = asRole === 'lister'
    ? `Thanks for renting ${title} on लोकल Den 🙌`
    : `Thanks for hosting ${title} on लोकल Den 🙌`
  return `Hi ${first}! ${thanks}\n\nIf you have a minute, could you leave a quick review? It takes 30 seconds and really helps:\n${reviewLink(booking.id)}`
}
