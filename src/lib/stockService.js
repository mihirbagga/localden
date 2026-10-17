import { supabase } from './supabase'

/**
 * Adjusts the stock of a listing automatically when bookings are created or updated.
 * @param {string} listingId - ID of the listing to update
 * @param {number} delta - Number to add or subtract (e.g. -1 when booked, +1 when returned/cancelled)
 */
export async function adjustListingStock(listingId, delta) {
  if (!listingId) return null

  try {
    // 1. Fetch current stock and available status
    const { data: listing, error: fetchErr } = await supabase
      .from('listings')
      .select('id, stock_qty, stock_total, is_available')
      .eq('id', listingId)
      .single()

    if (fetchErr || !listing) {
      console.warn('adjustListingStock: Listing not found or query error', fetchErr)
      return null
    }

    // In a peer-to-peer rental marketplace, bookings are date-bound reservations.
    // We never mark listings unavailable (is_available = false) just because a rental is placed.
    // Date availability is checked against the bookings calendar.
    const capacity = Math.max(1, typeof listing.stock_total === 'number' ? listing.stock_total : (listing.stock_qty || 1))
    const currentQty = typeof listing.stock_qty === 'number' ? listing.stock_qty : capacity
    const nextQty = Math.min(capacity, Math.max(1, currentQty + delta))

    // 2. Ensure listing remains available and stock does not collapse to 0
    const { data: updated, error: updateErr } = await supabase
      .from('listings')
      .update({
        stock_qty: nextQty,
        is_available: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .select()

    if (updateErr) {
      console.warn('adjustListingStock: Failed to update listing stock', updateErr)
      return null
    }

    return updated?.[0] || null
  } catch (err) {
    console.error('adjustListingStock unexpected error:', err)
    return null
  }
}
