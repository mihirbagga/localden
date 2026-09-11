import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import LogoMark from '../components/LogoMark'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import './auth.css'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const next = email.trim()
    if (!next) {
      showToast('Enter your email', 'error')
      return
    }
    setLoading(true)
    try {
      await requestPasswordReset(next)
      setSent(true)
      showToast('Reset link sent if that email exists', 'success')
    } catch (err) {
      showToast(err.message || 'Could not send reset email', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="grid-floor" />
      <GameBackground />

      <div className="auth-wrap">
        <div className="auth-brand">
          <LogoMark size={64} />
          <h1>
            <span className="is-magenta">लोकल</span>
            <span className="is-cyan">&nbsp;Den</span>
          </h1>
          <p>Reset your password</p>
        </div>

        <div className="glass rounded-3xl auth-card">
          {sent ? (
            <div className="auth-ok">
              <div className="auth-ok__icon" aria-hidden="true">📧</div>
              <h2>Check your inbox</h2>
              <p>
                If <strong>{email}</strong> has an account, a reset link is on the way.
                Open it on this device. Link dies after about an hour.
              </p>
              <button
                type="button"
                className="btn-outline w-full"
                onClick={() => setSent(false)}
                aria-label="Send another reset email"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="auth-lead">Type the email you used to sign up. We send a one-time link.</p>
              <label htmlFor="forgot-email" className="auth-label">EMAIL ADDRESS</label>
              <div className="auth-field">
                <Mail size={16} className="auth-icon" aria-hidden="true" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-dark input-icon-left"
                  aria-label="Email address"
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
                aria-label="Send password reset email"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="auth-foot">
            Remembered it? <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
