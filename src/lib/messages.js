/**
 * Local Den 2.0 — Centralized User-Facing Messages & Friendly Error System
 *
 * Ensures all notifications, validation messages, status updates, and error explanations
 * across the portal are clear, friendly, actionable, and on-brand.
 */

export const MESSAGES = {
  auth: {
    welcomeBack: (name) => `Welcome back${name ? `, ${name}` : ''}! Ready to rent or list gear.`,
    signedOut: 'Signed out safely. Catch you back in the Den soon!',
    accountCreated: 'Welcome to Local Den! Your account is ready to roll.',
    loginRequiredBook: 'Please sign in or create an account to reserve this gear.',
    loginRequiredList: 'Please sign in to list your gear and start earning.',
    invalidCredentials: 'That email or password didn’t match. Double-check and try again, or reset your password.',
    emailInUse: 'An account with this email already exists. Try signing in instead!',
  },

  booking: {
    selectDates: 'Select your start and return dates to lock in your rental.',
    invalidDateRange: 'Your return date needs to be on or after your start date.',
    ownListingBlocked: 'This is your own listing! Switch to your Dashboard to manage its availability or stock.',
    datesUnavailable: 'Those dates are already reserved. Try adjusting your dates or check out similar gear nearby.',
    outOfStock: 'All units for this gear are currently booked out. Check back soon or browse similar gear!',
    kycRequired: 'Quick ID verification is required before booking high-value gear. Head to your Dashboard to verify in under 2 minutes.',
    createdSuccess: 'Booking request locked in! Complete payment below so the lister or hub can prepare your gear.',
    paymentMarked: 'Payment submitted! Our team or the lister will verify your transfer shortly and confirm your booking.',
    paymentVerifiedInstant: 'Payment verified! Your booking is officially confirmed — get ready for your session.',
    cancelledByRenter: 'Your booking has been cancelled. If you already paid, our support team will assist with any eligible refund.',
    statusUpdated: (status) => {
      const map = {
        confirmed: 'Booking confirmed! The renter has been notified and handover is ready.',
        active: 'Rental marked active — gear is officially out on session!',
        completed: 'Rental completed! Thanks for keeping the Local Den community awesome.',
        cancelled: 'Booking cancelled and dates have been reopened on the calendar.',
        disputed: 'Booking flagged for support review. Our team will step in to help.',
      }
      return map[status] || `Booking updated to ${status}.`
    },
  },

  coupon: {
    enterCode: 'Enter a promo code to check your discount.',
    applied: (code, savings) => `Promo "${code}" applied! You save ₹${Number(savings || 0).toLocaleString('en-IN')}.`,
    removed: 'Promo code removed.',
    invalid: 'That promo code isn’t valid or has expired. Check the offers strip for active deals!',
  },

  listing: {
    published: 'Your gear is live in the Den! Renters in your city can now discover and book it.',
    savedDraft: 'Listing saved. You can publish or edit it anytime from your Dashboard.',
    availabilityOn: 'Listing is now visible and open for bookings.',
    availabilityOff: 'Listing paused — hidden from new bookings until you switch it back on.',
    stockUpdated: (qty, total) => `Stock updated: ${qty} of ${total} unit${total === 1 ? '' : 's'} available for booking.`,
    deleted: 'Listing permanently removed from your shelf.',
    photoLimit: 'You can upload up to 4 high-impact photos per listing.',
    photoTooLarge: 'Each photo must be under 5 MB. Try compressing or picking another shot.',
  },

  profile: {
    nameSaved: 'Profile name updated!',
    avatarUpdated: 'New profile photo looking sharp!',
    kycSubmitted: 'Verification documents submitted! Our trust team will review them shortly.',
  },

  review: {
    submitted: 'Thanks for sharing your review! Your feedback helps the entire community rent with confidence.',
    missingFields: 'Please select a star rating and write a quick note about your experience.',
  },

  wallet: {
    payoutRequested: 'Payout request submitted! Funds will be transferred to your linked payout method after verification.',
    payoutApproved: 'Payout marked complete and ledger updated.',
  },

  admin: {
    refreshed: 'Live portal metrics and tables synced.',
    roleUpdated: (role) => `User role updated to ${role}.`,
    kycReviewed: (decision) => `KYC submission marked as ${decision}.`,
  },
}

/**
 * Translates raw Supabase, network, or runtime errors into friendly, actionable Local Den 2.0 messages.
 */
export function friendlyError(err, fallback = 'Something went wrong on our end. Please try again in a moment.') {
  if (!err) return fallback
  const raw = typeof err === 'string' ? err : err?.message || err?.error_description || ''
  if (!raw) return fallback

  if (/invalid login credentials/i.test(raw)) {
    return MESSAGES.auth.invalidCredentials
  }
  if (/user already registered|already been registered/i.test(raw)) {
    return MESSAGES.auth.emailInUse
  }
  if (/email not confirmed/i.test(raw)) {
    return 'Please confirm your email address first — check your inbox (and spam folder) for the verification link.'
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return 'Connection hiccup! Please check your internet connection and try again.'
  }
  if (/jwt expired|invalid jwt|not authenticated|401/i.test(raw)) {
    return 'Your session expired for security. Please sign in again to continue.'
  }
  if (/row-level security|permission denied|42501/i.test(raw)) {
    return 'You don’t have permission to perform this action. Make sure you’re signed into the right account.'
  }
  if (/duplicate key value|unique constraint/i.test(raw)) {
    return 'This record already exists. Try refreshing or using a different value.'
  }
  if (/rate limit|too many requests|429/i.test(raw)) {
    return 'Whoa, slow down a beat! Too many requests in a short window — wait a few seconds and try again.'
  }

  return raw
}

/**
 * Generates a deterministic 4-digit Handover OTP PIN from a booking ID (works zero-migration).
 */
export function getHandoverPin(bookingId) {
  const s = String(bookingId || '0000')
  let hash = 2166136261
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const num = (Math.abs(hash) % 9000) + 1000
  return String(num)
}

/**
 * Generates a deterministic 4-digit Return OTP PIN from a booking ID (distinct from handover PIN).
 */
export function getReturnPin(bookingId) {
  const s = `return:${String(bookingId || '0000')}`
  let hash = 2166136261
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const num = (Math.abs(hash) % 9000) + 1000
  return String(num)
}
