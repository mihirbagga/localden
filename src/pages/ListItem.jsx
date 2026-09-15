import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, AlertCircle, Gamepad2, Music, ChevronRight } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { usePlatformFee } from '../hooks/usePlatformFee'
import { needsKyc } from '../lib/kyc'
import KycGate from '../components/KycGate'
import { computePlatformFee, platformFeeCopy } from '../lib/platformFee'
import './couponApply.css'
import './listItem.css'

const GAMING_TYPES = ['Console','Controller','VR Headset','Gaming Mouse','Racing Wheel','Gaming Chair','Monitor','Headset','Other']
const MUSIC_TYPES  = ['Guitar','Bass','Piano / Keyboard','Drums','DJ Controller','Microphone','Amplifier','Synthesizer','Violin','Saxophone','Other']
const LOCATIONS    = ['Koramangala','Indiranagar','HSR Layout','Whitefield','BTM Layout','Marathahalli','Electronic City','Jayanagar','Sadashivanagar','Malleshwaram','Hebbal']
const CONDITIONS   = [
  { value: 'like_new', label: '✨ Like New',  desc: 'Barely used, mint condition' },
  { value: 'good',     label: '👍 Good',      desc: 'Normal wear, works perfectly' },
  { value: 'fair',     label: '🔧 Fair',      desc: 'Visible wear, fully functional' },
]
const PRICE_PRESETS = [199, 299, 499, 799, 999]
const DEPOSIT_PRESETS = [2000, 5000, 10000]
const STEP_LABELS = ['Category', 'Details', 'Pricing']

const CATEGORY_EMOJI = {
  Console: '🎮', Controller: '🕹️', 'VR Headset': '🥽', 'Gaming Mouse': '🖱️',
  'Racing Wheel': '🏎️', 'Gaming Chair': '🪑', Monitor: '🖥️', Headset: '🎧',
  Guitar: '🎸', Bass: '🎸', 'Piano / Keyboard': '🎹', Drums: '🥁',
  'DJ Controller': '🎛️', Microphone: '🎤', Amplifier: '🔊', Synthesizer: '🎹',
  Violin: '🎻', Saxophone: '🎷', Other: '📦',
}

const EMPTY_FORM = {
  title: '', description: '', itemType: '', brand: '', model: '',
  condition: 'good', location: 'Koramangala',
  priceDay: '', priceWeekend: '', priceWeek: '',
  deposit: '5000', phone: '',
  stockQty: '1',
}

function keepAfterFee(amount, fee) {
  const n = Number(amount) || 0
  return Math.max(0, n - computePlatformFee(n, fee))
}

export default function ListItem() {
  const navigate = useNavigate()
  const { user, profile, isBanned, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const { fee: platformFeeSetting } = usePlatformFee()

  const [step, setStep] = useState(1)
  const [category, setCategory] = useState('')
  const [photos, setPhotos] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    phone: profile?.phone || '',
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const types = category === 'gaming' ? GAMING_TYPES : MUSIC_TYPES
  const emoji = CATEGORY_EMOJI[form.itemType] || (category === 'music' ? '🎵' : '🎮')

  const previews = useMemo(
    () => photos.map((file) => URL.createObjectURL(file)),
    [photos]
  )

  useEffect(() => () => {
    previews.forEach((url) => URL.revokeObjectURL(url))
  }, [previews])

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (!incoming.length) return
    setPhotos((prev) => {
      const next = [...prev, ...incoming].slice(0, 5)
      if (prev.length + incoming.length > 5) {
        showToast('Max 5 photos.', 'error')
      }
      return next
    })
  }

  const handlePhotos = (e) => {
    addFiles(e.target.files)
    e.target.value = ''
  }

  const removePhoto = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i))

  const uploadPhotos = async (listingId) => {
    const urls = []
    for (const file of photos) {
      const ext = file.name.split('.').pop().toLowerCase()
      const path = `listings/${user.id}/${listingId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('listing-photos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) {
        showToast(`Photo upload failed: ${upErr.message}`, 'error')
        setError(`Photo upload failed: ${upErr.message}`)
      } else {
        const { data: { publicUrl } } = supabase.storage.from('listing-photos').getPublicUrl(path)
        urls.push(publicUrl)
      }
    }
    return urls
  }

  const goStep = (n) => {
    if (n === step) return
    if (n === 2 && !category) {
      showToast('Pick gaming or music first.', 'error')
      return
    }
    if (n === 3 && (!form.itemType || !form.title)) {
      showToast('Type and title needed first.', 'error')
      return
    }
    if (n > step + 1) {
      showToast('Finish this step first.', 'error')
      return
    }
    setError('')
    setStep(n)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isBanned) {
      showToast('Account banned. Contact support.', 'error')
      return
    }
    if (needsKyc(profile)) {
      showToast('Complete KYC before listing.', 'error')
      navigate('/kyc', { state: { from: { pathname: '/list-item' } } })
      return
    }
    if (!form.title || !form.itemType || !form.priceDay || !form.location) {
      showToast('Fill required fields.', 'error')
      return
    }
    setLoading(true)
    setError('')

    try {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || user.user_metadata?.full_name || '',
          phone: form.phone || profile?.phone || null,
          is_lister: true,
        }, { onConflict: 'id' })
      } catch (profileErr) {
        console.warn('Profile upsert skipped:', profileErr.message)
      }

      const listingId = crypto.randomUUID()
      let photoUrls = []
      if (photos.length > 0) {
        photoUrls = await uploadPhotos(listingId)
      }

      const { error: insErr } = await supabase.from('listings').insert({
        id: listingId,
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        category,
        subcategory: form.itemType,
        condition: form.condition,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        price_day: parseInt(form.priceDay, 10),
        price_weekend: form.priceWeekend ? parseInt(form.priceWeekend, 10) : null,
        price_week: form.priceWeek ? parseInt(form.priceWeek, 10) : null,
        deposit_amount: parseInt(form.deposit, 10) || 5000,
        location: form.location,
        contact_phone: form.phone || profile?.phone || null,
        emoji: CATEGORY_EMOJI[form.itemType] || (category === 'gaming' ? '🎮' : '🎵'),
        photos: photoUrls,
        is_available: true,
        is_published: true,
        stock_qty: parseInt(form.stockQty, 10) || 1,
        stock_total: parseInt(form.stockQty, 10) || 1,
      })

      if (insErr) throw insErr
      showToast('Listing live', 'success')
      setStep(4)
    } catch (err) {
      const msg = err.message || 'Failed to list item. Please try again.'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setCategory('')
    setPhotos([])
    setForm({ ...EMPTY_FORM, phone: profile?.phone || '' })
    setError('')
  }

  const dayKeep = keepAfterFee(form.priceDay, platformFeeSetting)
  const weekKeep = keepAfterFee(form.priceWeek || (Number(form.priceDay) || 0) * 7, platformFeeSetting)
  const monthKeep = keepAfterFee((Number(form.priceDay) || 0) * 20, platformFeeSetting)

  if (authLoading) {
    return (
      <div className="list-page">
        <div className="grid-floor" />
        <GameBackground />
      </div>
    )
  }

  if (needsKyc(profile)) {
    return (
      <div className="list-page">
        <div className="grid-floor" />
        <GameBackground />
        <KycGate status={profile?.kyc_status} action="list gear" from={{ pathname: '/list-item' }} />
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="list-page">
        <div className="grid-floor" />
        <GameBackground />
        <div className="list-success">
          <div className="text-6xl" aria-hidden="true">🎉</div>
          <h2>Listing Live!</h2>
          <p>Your item is visible to renters across Bangalore.</p>
          <div className="list-success__actions">
            <button type="button" className="btn-primary" onClick={() => navigate('/browse')} aria-label="View all listings">
              View All Listings
            </button>
            <button type="button" className="btn-outline" onClick={resetForm} aria-label="List another item">
              List Another Item
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="list-page">
      <div className="grid-floor" />
      <GameBackground />
      <div className="list-wrap">
        <header className="list-head">
          <p className="section-label mb-2">Earn from your gear</p>
          <h1 className="list-title">
            List Your <span className="gradient-text">Gear</span>
          </h1>
        </header>

        <div className="list-steps" role="navigation" aria-label="Listing steps">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1
            const done = step > n
            const on = step === n
            return (
              <button
                key={label}
                type="button"
                className={`list-step${on ? ' is-on' : ''}${done ? ' is-done' : ''}`}
                onClick={() => goStep(n)}
                aria-label={`${label} step${done ? ', completed' : ''}`}
                aria-current={on ? 'step' : undefined}
              >
                <span className="list-step__num">{done ? '✓' : n}</span>
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {error ? (
          <div className="flex items-start gap-2 p-3 rounded-xl mb-5 text-sm font-display list-error" role="alert">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" /> {error}
          </div>
        ) : null}

        <div className="list-layout">
          <div className="list-form">
            {step === 1 ? (
              <div>
                <h2>What are you listing?</h2>
                <div className="list-cats">
                  <button
                    type="button"
                    className={`list-cat is-gaming${category === 'gaming' ? ' is-on' : ''}`}
                    onClick={() => {
                      setCategory('gaming')
                      setForm((f) => ({ ...f, itemType: GAMING_TYPES.includes(f.itemType) ? f.itemType : '' }))
                    }}
                    aria-pressed={category === 'gaming'}
                    aria-label="List gaming gear"
                  >
                    <Gamepad2 size={22} aria-hidden="true" />
                    <strong>Gaming Gear</strong>
                    <span>Consoles, VR, controllers</span>
                  </button>
                  <button
                    type="button"
                    className={`list-cat is-music${category === 'music' ? ' is-on' : ''}`}
                    onClick={() => {
                      setCategory('music')
                      setForm((f) => ({ ...f, itemType: MUSIC_TYPES.includes(f.itemType) ? f.itemType : '' }))
                    }}
                    aria-pressed={category === 'music'}
                    aria-label="List music gear"
                  >
                    <Music size={22} aria-hidden="true" />
                    <strong>Music Gear</strong>
                    <span>Instruments, mics, amps</span>
                  </button>
                </div>

                {category ? (
                  <div className="list-field">
                    <p className="field-label">Item type</p>
                    <div className="list-chips" role="group" aria-label="Item type">
                      {types.map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={`list-chip${form.itemType === t ? ' is-on' : ''}`}
                          onClick={() => setForm((f) => ({ ...f, itemType: t }))}
                          aria-pressed={form.itemType === t}
                          aria-label={`Type ${t}`}
                        >
                          {CATEGORY_EMOJI[t] || ''} {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="list-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (!category || !form.itemType) {
                        showToast('Pick a category and type.', 'error')
                        return
                      }
                      goStep(2)
                    }}
                    aria-label="Continue to details"
                  >
                    Next: Details <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <h2>Item details</h2>
                <div className="list-field">
                  <label className="field-label" htmlFor="list-title">Listing title *</label>
                  <input
                    id="list-title"
                    type="text"
                    value={form.title}
                    onChange={set('title')}
                    placeholder={category === 'gaming' ? 'Sony PS5 with 2 controllers' : 'Yamaha P-125 Digital Piano'}
                    className="input-dark"
                    aria-label="Listing title"
                  />
                </div>
                <div className="list-grid-2">
                  <div className="list-field">
                    <label className="field-label" htmlFor="list-brand">Brand</label>
                    <input id="list-brand" type="text" value={form.brand} onChange={set('brand')}
                      placeholder="Sony, Fender..." className="input-dark" aria-label="Brand" />
                  </div>
                  <div className="list-field">
                    <label className="field-label" htmlFor="list-model">Model</label>
                    <input id="list-model" type="text" value={form.model} onChange={set('model')}
                      placeholder="PS5, Stratocaster..." className="input-dark" aria-label="Model" />
                  </div>
                </div>

                <div className="list-field">
                  <p className="field-label">Condition *</p>
                  <div className="list-grid-3">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={`list-cond${form.condition === c.value ? ' is-on' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, condition: c.value }))}
                        aria-pressed={form.condition === c.value}
                        aria-label={`Condition ${c.label}`}
                      >
                        <strong>{c.label}</strong>
                        <span>{c.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="list-field">
                  <label className="field-label" htmlFor="list-desc">Description</label>
                  <textarea
                    id="list-desc"
                    value={form.description}
                    onChange={set('description')}
                    rows={3}
                    placeholder="Accessories, usage, anything renters should know..."
                    className="input-dark resize-none"
                    aria-label="Description"
                  />
                </div>

                <div className="list-field">
                  <p className="field-label">Area in Bangalore *</p>
                  <div className="list-chips" role="group" aria-label="Area">
                    {LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        className={`list-chip${form.location === loc ? ' is-on' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, location: loc }))}
                        aria-pressed={form.location === loc}
                        aria-label={`Area ${loc}`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="list-field">
                  <p className="field-label">Photos (up to 5)</p>
                  <label
                    className={`list-drop${dragOver ? ' is-over' : ''}`}
                    htmlFor="list-photos"
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      addFiles(e.dataTransfer.files)
                    }}
                  >
                    <Upload size={22} aria-hidden="true" />
                    Drag photos here or click to upload
                    <input
                      id="list-photos"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotos}
                      aria-label="Upload listing photos"
                    />
                  </label>
                  {previews.length > 0 ? (
                    <div className="list-thumbs">
                      {previews.map((src, i) => (
                        <div key={src} className="list-thumb">
                          <img src={src} alt={`Listing photo ${i + 1}`} />
                          <button type="button" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}>
                            <X size={10} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="list-actions">
                  <button type="button" className="btn-outline" onClick={() => goStep(1)} aria-label="Back to category">← Back</button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (!form.itemType || !form.title) {
                        showToast('Item type and title are required.', 'error')
                        return
                      }
                      goStep(3)
                    }}
                    aria-label="Continue to pricing"
                  >
                    Next: Pricing <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <form onSubmit={handleSubmit}>
                <h2>Set your pricing</h2>
                <p className="list-fee-note">{platformFeeCopy(platformFeeSetting)}</p>

                <div className="list-field">
                  <p className="field-label">Quick day price</p>
                  <div className="list-chips" role="group" aria-label="Day price presets">
                    {PRICE_PRESETS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`list-chip${String(form.priceDay) === String(n) ? ' is-on' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, priceDay: String(n) }))}
                        aria-label={`Set day price ${n}`}
                      >
                        ₹{n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="list-grid-3">
                  <div className="list-field">
                    <label className="field-label" htmlFor="price-day">Per day *</label>
                    <div className="list-rupee">
                      <span aria-hidden="true">₹</span>
                      <input id="price-day" type="number" value={form.priceDay} onChange={set('priceDay')}
                        required min={50} max={5000} placeholder="499" className="input-dark" aria-label="Price per day" />
                    </div>
                  </div>
                  <div className="list-field">
                    <label className="field-label" htmlFor="price-weekend">Weekend</label>
                    <div className="list-rupee">
                      <span aria-hidden="true">₹</span>
                      <input id="price-weekend" type="number" value={form.priceWeekend} onChange={set('priceWeekend')}
                        min={50} placeholder="799" className="input-dark" aria-label="Weekend price" />
                    </div>
                  </div>
                  <div className="list-field">
                    <label className="field-label" htmlFor="price-week">Per week</label>
                    <div className="list-rupee">
                      <span aria-hidden="true">₹</span>
                      <input id="price-week" type="number" value={form.priceWeek} onChange={set('priceWeek')}
                        min={50} placeholder="2499" className="input-dark" aria-label="Price per week" />
                    </div>
                  </div>
                </div>

                {form.priceDay ? (
                  <div className="list-earn">
                    <p>YOUR CUT AFTER PLATFORM FEE</p>
                    <div className="list-earn__row">
                      <div><strong>₹{dayKeep}</strong><small>Per day</small></div>
                      <div><strong>₹{weekKeep}</strong><small>Per week</small></div>
                      <div><strong>₹{monthKeep}</strong><small>Busy month (×20)</small></div>
                    </div>
                  </div>
                ) : null}

                <div className="list-field">
                  <p className="field-label">Security deposit</p>
                  <div className="list-chips" role="group" aria-label="Deposit presets">
                    {DEPOSIT_PRESETS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`list-chip${String(form.deposit) === String(n) ? ' is-on' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, deposit: String(n) }))}
                        aria-label={`Set deposit ${n}`}
                      >
                        ₹{n}
                      </button>
                    ))}
                  </div>
                  <div className="list-rupee">
                    <span aria-hidden="true">₹</span>
                    <input id="list-deposit" type="number" value={form.deposit} onChange={set('deposit')}
                      min={500} className="input-dark" aria-label="Security deposit" />
                  </div>
                  <p className="list-hint">Held on the booking. Returned after a clean rental.</p>
                </div>

                <div className="list-grid-2">
                  <div className="list-field">
                    <label className="field-label" htmlFor="stock-qty">Units in stock</label>
                    <input id="stock-qty" type="number" min={1} max={99} value={form.stockQty}
                      onChange={set('stockQty')} className="input-dark" aria-label="Units in stock" />
                  </div>
                  <div className="list-field">
                    <label className="field-label" htmlFor="contact-phone">Contact phone</label>
                    <input id="contact-phone" type="tel" value={form.phone} onChange={set('phone')}
                      placeholder="+91 98765 43210" className="input-dark" aria-label="Contact phone" />
                  </div>
                </div>

                <div className="list-actions">
                  <button type="button" className="btn-outline" onClick={() => goStep(2)} aria-label="Back to details">← Back</button>
                  <button type="submit" disabled={loading} className="btn-primary" aria-label="Publish listing">
                    {loading ? 'Publishing…' : '🚀 Publish Listing'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          <aside className="list-preview" aria-label="Listing preview">
            <p className="list-preview__kicker">Live preview</p>
            <div className="list-preview__art">
              {previews[0] ? <img src={previews[0]} alt="" /> : emoji}
            </div>
            <h3>{form.title || 'Your listing title'}</h3>
            <p>{form.itemType || 'Pick a type'} · {form.location}</p>
            <p>{CONDITIONS.find((c) => c.value === form.condition)?.label || 'Condition'}</p>
            <div className="list-preview__price">
              {form.priceDay ? `₹${form.priceDay}/day` : 'Set a day price'}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
