import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { welcomeCouponCode } from '../lib/coupons'
import LogoMark from '../components/LogoMark'
import GameBackground from '../components/GameBackground'
import './auth.css'

export default function Signup() {
  const { signUp, signInWithGoogle } = useAuth()
  const { showToast } = useToast()

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirm: '',
  })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const welcomeCode = welcomeCouponCode(form.fullName)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      return setError('Passwords do not match.')
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.')
    }
    setLoading(true)
    try {
      await signUp({
        email:    form.email,
        password: form.password,
        fullName: form.fullName,
        phone:    form.phone,
      })
      setSuccess(true)
      showToast(`Welcome coupon ${welcomeCouponCode(form.fullName)} — 50% off`, 'success')
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="grid-floor" />
        <GameBackground />
        <div className="relative z-10 text-center glass rounded-3xl p-10 max-w-md w-full">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="font-bungee text-2xl text-white mb-3">Check your email!</h2>
          <p className="auth-ok-copy">
            We sent a confirmation link to <strong>{form.email}</strong>.
            Click it to activate your account.
          </p>
          <div className="auth-coupon">
            <span>Your welcome coupon</span>
            <strong>{welcomeCode}</strong>
            <em>50% off first rental · one use</em>
          </div>
          <Link to="/login" className="btn-primary inline-flex">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-16 pb-10">
      <div className="grid-floor" />
      <GameBackground />

      <div className="relative z-10 w-full max-w-md">

        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-8">
          <LogoMark size={64} />
          <h1 className="font-bungee text-2xl mt-3">
            <span style={{ color: '#ff2e6d' }}>लोकल</span>
            <span style={{ color: '#00e5ff' }}>&nbsp;Den</span>
          </h1>
          <p className="font-display text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Join Bangalore's rental community
          </p>
        </div>

        <div className="glass rounded-3xl p-8">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl mb-5 text-sm font-display"
              style={{ background: 'rgba(255,46,109,0.1)', border: '1px solid rgba(255,46,109,0.3)', color: '#ff6b9d' }}>
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full name */}
            <div>
              <label htmlFor="signup-name" className="block text-xs font-display font-semibold mb-1.5"
                style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
                FULL NAME
              </label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input id="signup-name" type="text" required value={form.fullName} onChange={set('fullName')}
                  placeholder="Arjun Sharma" className="input-dark input-icon-left"
                  aria-label="Full name" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="signup-phone" className="block text-xs font-display font-semibold mb-1.5"
                style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
                PHONE (BANGALORE)
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input id="signup-phone" type="tel" required value={form.phone} onChange={set('phone')}
                  placeholder="+91 98765 43210" className="input-dark input-icon-left"
                  aria-label="Phone number" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-xs font-display font-semibold mb-1.5"
                style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input id="signup-email" type="email" required value={form.email} onChange={set('email')}
                  placeholder="you@example.com" className="input-dark input-icon-left"
                  aria-label="Email address" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-xs font-display font-semibold mb-1.5"
                style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
                PASSWORD
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input id="signup-password" type={showPw ? 'text' : 'password'} required value={form.password} onChange={set('password')}
                  placeholder="Min. 6 characters" className="input-dark input-icon-both"
                  aria-label="Password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="signup-confirm" className="block text-xs font-display font-semibold mb-1.5"
                style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
                CONFIRM PASSWORD
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input id="signup-confirm" type="password" required value={form.confirm} onChange={set('confirm')}
                  placeholder="Repeat password" className="input-dark input-icon-both"
                  aria-label="Confirm password"
                  style={{
                    borderColor: form.confirm && form.password !== form.confirm
                      ? 'rgba(255,46,109,0.5)' : '',
                  }} />
                {form.confirm && form.password === form.confirm && (
                  <CheckCircle size={16} className="absolute right-4 top-1/2 -translate-y-1/2"
                    style={{ color: '#00ff94' }} aria-hidden="true" />
                )}
              </div>
            </div>

            {/* Terms */}
            <p className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.3)' }}>
              By signing up you agree to our{' '}
              <span style={{ color: '#ff2e6d', cursor: 'pointer' }}>Terms of Service</span>{' '}and{' '}
              <span style={{ color: '#ff2e6d', cursor: 'pointer' }}>Privacy Policy</span>.
            </p>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3.5 text-base"
              style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.25)' }}>OR</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google */}
          <button onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-display font-semibold text-sm transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border:     '1px solid rgba(255,255,255,0.1)',
              color:      'rgba(255,255,255,0.7)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center mt-6 text-sm font-display" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#ff2e6d', fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
