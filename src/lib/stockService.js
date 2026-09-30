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

    const currentQty = typeof listing.stock_qty === 'number' ? listing.stock_qty : 1
    const nextQty = Math.max(0, currentQty + delta)
    const isAvailable = nextQty > 0

    // 2. Update listing with new stock and availability
    const { data: updated, error: updateErr } = await supabase
      .from('listings')
      .update({
        stock_qty: nextQty,
        is_available: isAvailable,
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
