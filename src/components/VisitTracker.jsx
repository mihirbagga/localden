import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { recordVisit } from '../lib/visitTracker'

/**
 * Silent global tracker that automatically logs unique visits
 * and captures incoming campaign sources from the URL or referrer.
 */
export default function VisitTracker() {
  const location = useLocation()

  useEffect(() => {
    recordVisit(location.pathname, location.search)
  }, [location.pathname, location.search])

  return null
}

