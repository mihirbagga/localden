import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import ScrollToTop from './components/ScrollToTop'
import InstallPrompt from './components/InstallPrompt'
import Home from './pages/Home'
import Browse from './pages/Browse'
const ListItem = lazy(() => import('./pages/ListItem'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const Contact = lazy(() => import('./pages/Contact'))
const About = lazy(() => import('./pages/About'))
const Terms = lazy(() => import('./pages/Terms'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const ListingDetail = lazy(() => import('./pages/ListingDetail'))
const ListerProfile = lazy(() => import('./pages/ListerProfile'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Kyc = lazy(() => import('./pages/Kyc'))
const Admin = lazy(() => import('./pages/Admin'))
const Review = lazy(() => import('./pages/Review'))
const Dispute = lazy(() => import('./pages/Dispute'))
const BlogIndex = lazy(() => import('./pages/blog/BlogIndex'))
const BlogPost = lazy(() => import('./pages/blog/BlogPost'))
const VerifyDelivery = lazy(() => import('./pages/VerifyDelivery'))

/* ── Page transition wrapper ─────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate">
        <Routes location={location}>
          {/* Public routes */}
          <Route path="/"             element={<Home />} />
          <Route path="/browse"       element={<Browse />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/contact"      element={<Contact />} />
          <Route path="/about"        element={<About />} />
          <Route path="/terms"        element={<Terms />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/signup"       element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/listing/:id"  element={<ListingDetail />} />
          <Route path="/lister/:id"   element={<ListerProfile />} />
          <Route path="/blog"          element={<BlogIndex />} />
          <Route path="/blog/:slug"    element={<BlogPost />} />
          <Route path="/verify-delivery" element={<VerifyDelivery />} />
          <Route path="/verify-otp"    element={<VerifyDelivery />} />

          {/* Protected routes — require login */}
          <Route path="/list-item" element={
            <ProtectedRoute><ListItem /></ProtectedRoute>
          } />
          <Route path="/list-item/edit/:id" element={
            <ProtectedRoute><ListItem /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/kyc" element={
            <ProtectedRoute><Kyc /></ProtectedRoute>
          } />
          <Route path="/review/:bookingId" element={
            <ProtectedRoute><Review /></ProtectedRoute>
          } />
          <Route path="/dispute/:bookingId" element={
            <ProtectedRoute><Dispute /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute><Admin /></AdminRoute>
          } />
        </Routes>
    </motion.div>
  )
}

const LoadingFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-10 h-10 border-2 border-white/10 border-t-[var(--magenta)] rounded-full animate-spin" />
  </div>
)

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <BrowserRouter>
              <ScrollToTop />
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1">
                  <Suspense fallback={<LoadingFallback />}>
                    <AnimatedRoutes />
                  </Suspense>
                </main>
                <Footer />
                <InstallPrompt />
              </div>
            </BrowserRouter>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
