import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

const PAGE_SIZE = 400

async function fetchAll() {
  const [usersRes, listingsRes, bookingsRes, reviewsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE),
    supabase
      .from('listings')
      .select('*, profiles(id, full_name, email, kyc_status)')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE),
    supabase
      .from('bookings')
      .select(`
        *,
        listings(id, title, emoji, category),
        renter:profiles!renter_id(id, full_name, email),
        lister:profiles!lister_id(id, full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE),
    supabase
      .from('reviews')
      .select(`
        *,
        listings(id, title, emoji),
        reviewer:profiles!reviewer_id(id, full_name),
        reviewee:profiles!reviewee_id(id, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE),
  ])

  const firstError =
    usersRes.error || listingsRes.error || bookingsRes.error || reviewsRes.error
  if (firstError) throw firstError

  return {
    users: usersRes.data || [],
    listings: listingsRes.data || [],
    bookings: bookingsRes.data || [],
    reviews: reviewsRes.data || [],
  }
}

export function useAdminData() {
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [listings, setListings] = useState([])
  const [bookings, setBookings] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAll()
      setUsers(data.users)
      setListings(data.listings)
      setBookings(data.bookings)
      setReviews(data.reviews)
    } catch (err) {
      showToast(err.message || 'Failed to load admin data', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    reload()
  }, [reload])

  const patchUser = useCallback((id, patch) => {
    setUsers((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }, [])

  const patchListing = useCallback((id, patch) => {
    setListings((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }, [])

  const removeListing = useCallback((id) => {
    setListings((prev) => prev.filter((row) => row.id !== id))
  }, [])

  const patchBooking = useCallback((id, patch) => {
    setBookings((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }, [])

  const patchReview = useCallback((id, patch) => {
    setReviews((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }, [])

  const removeReview = useCallback((id) => {
    setReviews((prev) => prev.filter((row) => row.id !== id))
  }, [])

  return {
    users,
    listings,
    bookings,
    reviews,
    loading,
    reload,
    patchUser,
    patchListing,
    removeListing,
    patchBooking,
    patchReview,
    removeReview,
  }
}
