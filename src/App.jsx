import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import WelcomeScreen from './components/WelcomeScreen'
import Home from './pages/Home'
import Browse from './pages/Browse'
import ListItem from './pages/ListItem'
import HowItWorks from './pages/HowItWorks'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ListingDetail from './pages/ListingDetail'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

/* ── Page transition wrapper ─────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18 } },
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <Routes location={location}>
          {/* Public routes */}
          <Route path="/"             element={<Home />} />
          <Route path="/browse"       element={<Browse />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/signup"       element={<Signup />} />
          <Route path="/listing/:id"  element={<ListingDetail />} />

          {/* Protected routes — require login */}
          <Route path="/list-item" element={
            <ProtectedRoute><ListItem /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute><Admin /></AdminRoute>
          } />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const [entered, setEntered] = useState(
    () => sessionStorage.getItem('den-entered') === 'true'
  )

  const handleEnter = () => {
    sessionStorage.setItem('den-entered', 'true')
    setEntered(true)
  }

  return (
    <AuthProvider>
      <ToastProvider>
        {!entered && <WelcomeScreen onEnter={handleEnter} />}
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <AnimatedRoutes />
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
