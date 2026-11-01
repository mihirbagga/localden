import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scrolls window and main scroll containers to top on every route change.
 * Drop inside <BrowserRouter> anywhere above <Routes>.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    // 1. Scroll window directly
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    // 2. Also scroll documentElement & body
    if (document.documentElement) document.documentElement.scrollTop = 0
    if (document.body) document.body.scrollTop = 0

    // 3. Reset any app-root or main scroll container
    const rootEl = document.getElementById('root')
    if (rootEl) rootEl.scrollTop = 0

    const mainEl = document.querySelector('main')
    if (mainEl) mainEl.scrollTop = 0
  }, [pathname, search])

  return null
}
