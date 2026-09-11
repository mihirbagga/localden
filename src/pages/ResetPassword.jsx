import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import LogoMark from '../components/LogoMark'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import './auth.css'

const MIN_PASSWORD = 6

function hasRecoveryInUrl() {
  const code = new URLSearchParams(window.location.search).get('code')
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return Boolean(code || hash.get('type') === 'recovery' || hash.get('access_token'))
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const { user, updatePassword } = useAuth()
  const { showToast } = useToast()

  const [ready, setReady] = useState(false)
  const [canReset, setCanReset] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      const href = window.location.href
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(href)
        if (error && !/already|session/i.test(error.message || '')) {
          if (!cancelled) {
            setReady(true)
            setCanReset(false)
          }
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setCanReset(Boolean(data.session) || hasRecoveryInUrl())
      setReady(true)
    }

    boot()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (user) setCanReset(true)
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) {
      showToast(`Password must be at least ${MIN_PASSWORD} characters`, 'error')
      return
    }
    if (password !== confirm) {
      showToast('Passwords do not match', 'error')
      return
    }
    setLoading(true)
    try {
      await updatePassword(password)
      window.history.replaceState({}, document.title, '/reset-password')
      showToast('Password updated', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      showToast(err.message || 'Could not update password', 'error')
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
          <p>Set a new password</p>
        </div>

        <div className="glass rounded-3xl auth-card">
          {!ready ? (
            <p className="auth-lead">Checking reset link…</p>
          ) : !canReset ? (
            <div className="auth-ok">
              <div className="auth-ok__icon" aria-hidden="true">⏳</div>
              <h2>Link expired</h2>
              <p>That reset link is dead or already used. Request a fresh one.</p>
              <Link to="/forgot-password" className="btn-primary w-full">Get a new link</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="reset-password" className="auth-label">NEW PASSWORD</label>
              <div className="auth-field">
                <Lock size={16} className="auth-icon" aria-hidden="true" />
                <input
                  id="reset-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={MIN_PASSWORD}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-dark input-icon-both"
                  aria-label="New password"
                />
                <button
                  type="button"
                  className="auth-toggle"
                  onClick={() => setShowPw((on) => !on)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <label htmlFor="reset-confirm" className="auth-label">CONFIRM PASSWORD</label>
              <div className="auth-field">
                <Lock size={16} className="auth-icon" aria-hidden="true" />
                <input
                  id="reset-confirm"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={MIN_PASSWORD}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="input-dark input-icon-left"
                  aria-label="Confirm new password"
                />
              </div>
              <p className="auth-hint">At least {MIN_PASSWORD} characters.</p>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
                aria-label="Save new password"
              >
                {loading ? 'Saving...' : 'Save new password'}
              </button>
            </form>
          )}

          <p className="auth-foot">
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
