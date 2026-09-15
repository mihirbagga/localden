import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { explainAdminError } from '../pages/admin/adminHelpers'

const PAGE_SIZE = 400

function profileMap(users) {
  return Object.fromEntries(users.map((u) => [u.id, u]))
}

function hydrateBookings(bookings, usersById) {
  return bookings.map((row) => ({
    ...row,
    renter: usersById[row.renter_id] || null,
    lister: usersById[row.lister_id] || null,
  }))
}

function hydrateReviews(reviews, usersById) {
  return reviews.map((row) => ({
    ...row,
    reviewer: usersById[row.reviewer_id] || null,
    reviewee: usersById[row.reviewee_id] || null,
  }))
}

async function loadRows(table, select, orderCol = 'created_at') {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order(orderCol, { ascending: orderCol === 'sort_order' })
    .limit(PAGE_SIZE)
  if (error) throw error
  return data || []
}

async function fetchAll() {
  const settled = await Promise.allSettled([
    loadRows('profiles', '*'),
    loadRows('listings', '*, profiles(id, full_name, email, kyc_status)'),
    loadRows('bookings', '*, listings(id, title, emoji, category)'),
    loadRows('reviews', '*, listings(id, title, emoji)'),
    loadRows('coupons', '*'),
    loadRows('payment_methods', '*', 'sort_order'),
    loadRows('kyc_submissions', '*, profiles(id, full_name, email, phone, kyc_status)', 'submitted_at'),
  ])

  const labels = ['users', 'listings', 'bookings', 'reviews', 'coupons', 'payments', 'kyc']
  const values = [[], [], [], [], [], [], []]
  const failures = []

  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      values[i] = result.value
      return
    }
    failures.push(`${labels[i]}: ${explainAdminError(result.reason)}`)
  })

  const [users, listings, bookings, reviews, coupons, paymentMethods, kycSubmissions] = values
  const usersById = profileMap(users)

  return {
    users,
    listings,
    bookings: hydrateBookings(bookings, usersById),
    reviews: hydrateReviews(reviews, usersById),
    coupons,
    paymentMethods,
    kycSubmissions,
    failures,
  }
}

export function useAdminData() {
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [listings, setListings] = useState([])
  const [bookings, setBookings] = useState([])
  const [reviews, setReviews] = useState([])
  const [coupons, setCoupons] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [kycSubmissions, setKycSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAll()
      setUsers(data.users)
      setListings(data.listings)
      setBookings(data.bookings)
      setReviews(data.reviews)
      setCoupons(data.coupons)
      setPaymentMethods(data.paymentMethods)
      setKycSubmissions(data.kycSubmissions)
      if (data.failures.length) {
        showToast(data.failures[0], 'error')
      }
    } catch (err) {
      showToast(explainAdminError(err), 'error')
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

  const patchCoupon = useCallback((id, patch) => {
    setCoupons((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }, [])

  const removeCoupon = useCallback((id) => {
    setCoupons((prev) => prev.filter((row) => row.id !== id))
  }, [])

  const patchPaymentMethod = useCallback((id, patch) => {
    setPaymentMethods((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }, [])

  const patchSubmission = useCallback((id, patch) => {
    setKycSubmissions((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }, [])

  return {
    users,
    listings,
    bookings,
    reviews,
    coupons,
    loading,
    reload,
    patchUser,
    patchListing,
    removeListing,
    patchBooking,
    patchReview,
    removeReview,
    setCoupons,
    patchCoupon,
    removeCoupon,
    paymentMethods,
    patchPaymentMethod,
    kycSubmissions,
    patchSubmission,
  }
}
