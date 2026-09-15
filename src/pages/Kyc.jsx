import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertCircle, CheckCircle, Shield } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import {
  KYC_ID_TYPES,
  fileExt,
  last4Valid,
  normalizeLast4,
  phoneValid,
} from '../lib/kyc'
import './kyc.css'

const MAX_BYTES = 5 * 1024 * 1024

function pickImage(file) {
  if (!file) return null
  if (!file.type.startsWith('image/')) return 'Use a photo (JPG or PNG).'
  if (file.size > MAX_BYTES) return 'Keep each photo under 5 MB.'
  return null
}

export default function Kyc() {
  const { user, profile, updateProfile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const location = useLocation()
  const back = location.state?.from?.pathname || '/dashboard'

  const [latest, setLatest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [idType, setIdType] = useState('aadhaar')
  const [last4, setLast4] = useState('')
  const [idFile, setIdFile] = useState(null)
  const [selfie, setSelfie] = useState(null)
  const [idPreview, setIdPreview] = useState('')
  const [selfiePreview, setSelfiePreview] = useState('')
  const [consent, setConsent] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name || '')
    setPhone(profile?.phone || '')
  }, [profile?.full_name, profile?.phone])

  useEffect(() => {
    if (!idFile) {
      setIdPreview('')
      return undefined
    }
    const url = URL.createObjectURL(idFile)
    setIdPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [idFile])

  useEffect(() => {
    if (!selfie) {
      setSelfiePreview('')
      return undefined
    }
    const url = URL.createObjectURL(selfie)
    setSelfiePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [selfie])

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    supabase
      .from('kyc_submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error: loadErr }) => {
        if (cancelled) return
        if (loadErr && !/does not exist|schema cache/i.test(loadErr.message || '')) {
          setError(loadErr.message)
        }
        setLatest(data || null)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user])

  const status = latest?.status || profile?.kyc_status || 'pending'
  const canForm = status === 'pending' || status === 'rejected' || !latest

  const uploadDoc = async (file, kind) => {
    const path = `${user.id}/${kind}-${Date.now()}.${fileExt(file)}`
    const { error: upErr } = await supabase.storage
      .from('kyc-docs')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
    if (upErr) throw upErr
    return path
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const name = fullName.trim()
    const code = normalizeLast4(last4)
    if (name.length < 2) {
      setError('Enter the name on your ID.')
      return
    }
    if (!phoneValid(phone)) {
      setError('Enter a valid 10-digit Indian phone.')
      return
    }
    if (!last4Valid(idType, code)) {
      setError(idType === 'aadhaar' ? 'Aadhaar last 4 must be 4 digits.' : 'PAN last 4 must be 4 letters or digits.')
      return
    }
    const idBad = pickImage(idFile)
    const selfBad = pickImage(selfie)
    if (idBad || selfBad) {
      setError(idBad || selfBad)
      return
    }
    if (!consent) {
      setError('Accept that we store these photos privately for verification.')
      return
    }

    setSaving(true)
    try {
      await updateProfile({ full_name: name, phone: phone.replace(/\D/g, '').slice(-10) })
      const idDocPath = await uploadDoc(idFile, 'id')
      const selfiePath = await uploadDoc(selfie, 'selfie')
      const { data, error: insErr } = await supabase
        .from('kyc_submissions')
        .insert({
          user_id: user.id,
          full_name: name,
          phone: phone.replace(/\D/g, '').slice(-10),
          id_type: idType,
          id_last4: code,
          id_doc_path: idDocPath,
          selfie_path: selfiePath,
          status: 'submitted',
        })
        .select()
        .single()
      if (insErr) throw insErr
      setLatest(data)
      await refreshProfile?.()
      showToast('KYC sent. Admin will review.', 'success')
    } catch (err) {
      const msg = err.message || 'Could not submit KYC.'
      setError(/kyc-docs|bucket/i.test(msg)
        ? 'KYC storage missing. Run supabase/kyc_migration.sql and create the private kyc-docs bucket.'
        : msg)
      showToast('KYC submit failed', 'error')
    }
    setSaving(false)
  }

  return (
    <div className="kyc-page">
      <div className="grid-floor" />
      <GameBackground />
      <div className="kyc-wrap">
        <div className="glass kyc-card">
          <p className="section-label">Trust</p>
          <h1>Quick KYC</h1>
          <p>Aadhaar or PAN last 4 + ID photo + selfie. Admin reviews by hand. We never store the full ID number.</p>

          {loading ? <p>Loading…</p> : null}

          {!loading && status === 'verified' ? (
            <div className="kyc-ok">
              <CheckCircle size={36} />
              <h2>You are verified</h2>
              <p>Rent and list across Bangalore.</p>
              <Link to={back} className="btn-primary">Continue</Link>
            </div>
          ) : null}

          {!loading && status === 'submitted' ? (
            <div className="kyc-wait">
              <Shield size={36} />
              <h2>With admin</h2>
              <p>Usually under an hour. We ping you here and in the bell when it is done.</p>
              <Link to="/dashboard" className="btn-outline">Back to dashboard</Link>
            </div>
          ) : null}

          {!loading && canForm && status !== 'verified' && status !== 'submitted' ? (
            <form className="kyc-form" onSubmit={submit}>
              {status === 'rejected' && (latest?.reviewer_note || profile?.kyc_note) ? (
                <div className="kyc-note" role="status">
                  Rejected: {latest?.reviewer_note || profile?.kyc_note}
                </div>
              ) : null}

              <div>
                <label className="field-label" htmlFor="kyc-name">Legal name</label>
                <input
                  id="kyc-name"
                  className="input-dark"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  aria-label="Legal name as on ID"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="kyc-phone">Phone</label>
                <input
                  id="kyc-phone"
                  className="input-dark"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  aria-label="Phone number"
                />
              </div>

              <div>
                <p className="field-label">ID type</p>
                <div className="kyc-types" role="group" aria-label="ID type">
                  {KYC_ID_TYPES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={idType === item.id ? 'is-on' : ''}
                      onClick={() => setIdType(item.id)}
                      aria-pressed={idType === item.id}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="kyc-last4">
                  {idType === 'aadhaar' ? 'Aadhaar last 4 digits' : 'PAN last 4 characters'}
                </label>
                <input
                  id="kyc-last4"
                  className="input-dark"
                  value={last4}
                  onChange={(e) => setLast4(normalizeLast4(e.target.value))}
                  maxLength={4}
                  autoComplete="off"
                  aria-label="Last four of ID"
                />
              </div>

              <div>
                <p className="field-label">ID photo</p>
                <label className="kyc-upload">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                    aria-label="Upload ID photo"
                  />
                  {idFile ? idFile.name : 'Upload Aadhaar or PAN card photo'}
                </label>
                {idPreview ? <img className="kyc-preview" src={idPreview} alt="ID preview" /> : null}
              </div>

              <div>
                <p className="field-label">Selfie</p>
                <label className="kyc-upload">
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                    aria-label="Upload selfie"
                  />
                  {selfie ? selfie.name : 'Upload a clear selfie'}
                </label>
                {selfiePreview ? <img className="kyc-preview" src={selfiePreview} alt="Selfie preview" /> : null}
              </div>

              <label className="kyc-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  aria-label="Agree to private KYC storage"
                />
                <span>
                  I am 18+. Store these photos in a private folder for verification only. Last 4 of my ID is enough — not the full number.
                </span>
              </label>

              {error ? (
                <div className="kyc-err" role="alert">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              ) : null}

              <button type="submit" className="btn-primary w-full" disabled={saving}>
                {saving ? 'Sending…' : 'Submit for review'}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
