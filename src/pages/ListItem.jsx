import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, CheckCircle, AlertCircle, Gamepad2, Music, ChevronRight } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const GAMING_TYPES = ['Console','Controller','VR Headset','Gaming Mouse','Racing Wheel','Gaming Chair','Monitor','Headset','Other']
const MUSIC_TYPES  = ['Guitar','Bass','Piano / Keyboard','Drums','DJ Controller','Microphone','Amplifier','Synthesizer','Violin','Saxophone','Other']
const LOCATIONS    = ['Koramangala','Indiranagar','HSR Layout','Whitefield','BTM Layout','Marathahalli','Electronic City','Jayanagar','Sadashivanagar','Malleshwaram','Hebbal']
const CONDITIONS   = [
  { value: 'like_new', label: '✨ Like New',  desc: 'Barely used, mint condition' },
  { value: 'good',     label: '👍 Good',      desc: 'Normal wear, works perfectly' },
  { value: 'fair',     label: '🔧 Fair',      desc: 'Visible wear, fully functional' },
]

const CATEGORY_EMOJI = {
  Console: '🎮', Controller: '🕹️', 'VR Headset': '🥽', 'Gaming Mouse': '🖱️',
  'Racing Wheel': '🏎️', 'Gaming Chair': '🪑', Monitor: '🖥️', Headset: '🎧',
  Guitar: '🎸', Bass: '🎸', 'Piano / Keyboard': '🎹', Drums: '🥁',
  'DJ Controller': '🎛️', Microphone: '🎤', Amplifier: '🔊', Synthesizer: '🎹',
  Violin: '🎻', Saxophone: '🎷', Other: '📦',
}

export default function ListItem() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [step, setStep]         = useState(1) // 1=category, 2=details, 3=pricing, 4=done
  const [category, setCategory] = useState('')
  const [photos, setPhotos]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    title: '', description: '', itemType: '', brand: '', model: '',
    condition: 'good', location: 'Koramangala',
    priceDay: '', priceWeekend: '', priceWeek: '',
    deposit: '5000', phone: profile?.phone || '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  /* ── Photo handling ──────────────────────── */
  const handlePhotos = (e) => {
    const files = Array.from(e.target.files).slice(0, 5)
    setPhotos(prev => [...prev, ...files].slice(0, 5))
  }
  const removePhoto = (i) => setPhotos(p => p.filter((_, idx) => idx !== i))

  /* ── Upload photos to Supabase Storage ───── */
  const uploadPhotos = async (listingId) => {
    const urls = []
    console.log(`📸 Uploading ${photos.length} photo(s) for listing ${listingId}`)

    for (const file of photos) {
      console.log('  → file:', file.name, file.type, `${(file.size/1024).toFixed(1)}KB`)

      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `listings/${user.id}/${listingId}/${Date.now()}.${ext}`
      console.log('  → uploading to path:', path)

      const { data: upData, error: upErr } = await supabase.storage
        .from('listing-photos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (upErr) {
        console.error('  ✗ Upload failed:', upErr.message, upErr)
        // Show error but continue with other photos
        setError(`Photo upload failed: ${upErr.message}`)
      } else {
        console.log('  ✓ Uploaded:', upData)
        const { data: { publicUrl } } = supabase.storage
          .from('listing-photos').getPublicUrl(path)
        console.log('  ✓ Public URL:', publicUrl)
        urls.push(publicUrl)
      }
    }
    console.log('📸 Final URLs:', urls)
    return urls
  }

  /* ── Submit to Supabase ──────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.itemType || !form.priceDay || !form.location) {
      return setError('Please fill in all required fields.')
    }
    setLoading(true)
    setError('')

    try {
      // 0. Ensure profile exists — non-fatal
      try {
        await supabase.from('profiles').upsert({
          id:        user.id,
          email:     user.email,
          full_name: profile?.full_name || user.user_metadata?.full_name || '',
          phone:     form.phone || profile?.phone || null,
          is_lister: true,
        }, { onConflict: 'id' })
      } catch (profileErr) {
        console.warn('Profile upsert skipped:', profileErr.message)
      }

      // 1. Generate ID first — we need it for the Storage path
      const listingId = crypto.randomUUID()

      // 2. Upload photos FIRST → include URLs directly in INSERT (no UPDATE needed)
      let photoUrls = []
      if (photos.length > 0) {
        console.log(`📸 Uploading ${photos.length} photo(s) before insert...`)
        photoUrls = await uploadPhotos(listingId)
        console.log('📸 URLs ready:', photoUrls)
      }

      // 3. Single INSERT with photos already included
      const { error: insErr } = await supabase
        .from('listings')
        .insert({
          id:             listingId,
          user_id:        user.id,
          title:          form.title.trim(),
          description:    form.description.trim(),
          category,
          subcategory:    form.itemType,
          condition:      form.condition,
          brand:          form.brand.trim() || null,
          model:          form.model.trim() || null,
          price_day:      parseInt(form.priceDay),
          price_weekend:  form.priceWeekend ? parseInt(form.priceWeekend) : null,
          price_week:     form.priceWeek    ? parseInt(form.priceWeek)    : null,
          deposit_amount: parseInt(form.deposit) || 5000,
          location:       form.location,
          contact_phone:  form.phone || profile?.phone || null,
          emoji:          CATEGORY_EMOJI[form.itemType] || (category === 'gaming' ? '🎮' : '🎵'),
          photos:         photoUrls,   // ← included directly in INSERT
          is_available:   true,
        })

      if (insErr) throw insErr
      console.log('✅ Listing created with', photoUrls.length, 'photo(s)')

      setStep(4)
    } catch (err) {
      console.error('ListItem error:', err)
      setError(err.message || 'Failed to list item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 4: Success ─────────────────────── */
  if (step === 4) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 pt-24">
        <div className="grid-floor" /><GameBackground />
        <div className="relative z-10 text-center glass rounded-3xl p-12 max-w-md w-full">
          <div className="text-6xl mb-5">🎉</div>
          <h2 className="font-bungee text-3xl text-white mb-3">Listing Live!</h2>
          <p className="font-display mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Your item is now visible to renters across Bangalore.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/browse')} className="btn-primary">
              View All Listings
            </button>
            <button onClick={() => { setStep(1); setCategory(''); setPhotos([]); setForm(f => ({ ...f, title:'', description:'', itemType:'', brand:'', model:'', priceDay:'', priceWeekend:'', priceWeek:'' })) }}
              className="btn-outline">
              List Another Item
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen pt-24 pb-20">
      <div className="grid-floor" /><GameBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="mb-8">
          <p className="section-label mb-2">Earn from your gear</p>
          <h1 className="font-bungee text-4xl text-white">
            List Your <span className="gradient-text">Item</span>
          </h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {['Category','Details','Pricing'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bungee transition-all`}
                  style={{
                    background: step > i+1 ? '#00ff94' : step === i+1 ? 'linear-gradient(135deg,#ff2e6d,#00e5ff)' : 'rgba(255,255,255,0.08)',
                    color: step >= i+1 ? '#0a0a14' : 'rgba(255,255,255,0.3)',
                  }}>
                  {step > i+1 ? '✓' : i+1}
                </div>
                <span className="text-xs font-display hidden sm:block"
                  style={{ color: step === i+1 ? 'white' : 'rgba(255,255,255,0.3)' }}>{s}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px" style={{ background: step > i+1 ? 'rgba(0,255,148,0.4)' : 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl mb-5 text-sm font-display"
            style={{ background: 'rgba(255,46,109,0.1)', border: '1px solid rgba(255,46,109,0.3)', color: '#ff6b9d' }}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="glass rounded-3xl p-8">

          {/* ── Step 1: Category ─────────────── */}
          {step === 1 && (
            <div>
              <h2 className="font-bungee text-xl text-white mb-6">What are you listing?</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id:'gaming', emoji:'🎮', label:'Gaming Gear', desc:'Consoles, VR, Controllers', color:'#ff2e6d' },
                  { id:'music',  emoji:'🎸', label:'Music Gear',  desc:'Instruments, Mics, Amps', color:'#00e5ff' },
                ].map(cat => (
                  <button key={cat.id} onClick={() => { setCategory(cat.id); setStep(2) }}
                    className="rounded-2xl p-6 text-left transition-all duration-300 group"
                    style={{
                      background: `linear-gradient(135deg, ${cat.color}12, ${cat.color}06)`,
                      border: `1px solid ${cat.color}30`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color+'70'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = cat.color+'30'; e.currentTarget.style.transform = 'none' }}>
                    <div className="text-4xl mb-3">{cat.emoji}</div>
                    <div className="font-bungee text-lg text-white mb-1">{cat.label}</div>
                    <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>{cat.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Details ──────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-bungee text-xl text-white mb-6">Item Details</h2>

              {/* Type */}
              <div>
                <label className="field-label">ITEM TYPE *</label>
                <select value={form.itemType} onChange={set('itemType')} className="select-dark" required>
                  <option value="">Select type...</option>
                  {(category === 'gaming' ? GAMING_TYPES : MUSIC_TYPES).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="field-label">LISTING TITLE *</label>
                <input type="text" value={form.title} onChange={set('title')} required
                  placeholder={category === 'gaming' ? 'e.g. Sony PS5 with 2 controllers' : 'e.g. Yamaha P-125 Digital Piano'}
                  className="input-dark" />
              </div>

              {/* Brand + Model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">BRAND</label>
                  <input type="text" value={form.brand} onChange={set('brand')}
                    placeholder="Sony, Fender..." className="input-dark" />
                </div>
                <div>
                  <label className="field-label">MODEL</label>
                  <input type="text" value={form.model} onChange={set('model')}
                    placeholder="PS5, Stratocaster..." className="input-dark" />
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="field-label mb-2 block">CONDITION *</label>
                <div className="grid grid-cols-3 gap-3">
                  {CONDITIONS.map(c => (
                    <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, condition: c.value }))}
                      className="p-3 rounded-xl text-left transition-all duration-200"
                      style={{
                        background: form.condition === c.value ? 'rgba(255,46,109,0.12)' : 'rgba(255,255,255,0.04)',
                        border:     `1px solid ${form.condition === c.value ? 'rgba(255,46,109,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      <div className="text-sm font-display font-bold text-white">{c.label}</div>
                      <div className="text-xs mt-1 font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="field-label">DESCRIPTION</label>
                <textarea value={form.description} onChange={set('description')} rows={3}
                  placeholder="Describe the item — accessories included, usage history, special features..."
                  className="input-dark resize-none" />
              </div>

              {/* Location */}
              <div>
                <label className="field-label">YOUR AREA IN BANGALORE *</label>
                <select value={form.location} onChange={set('location')} className="select-dark">
                  {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>

              {/* Photos */}
              <div>
                <label className="field-label mb-2 block">PHOTOS (up to 5)</label>
                <label className="flex flex-col items-center justify-center w-full h-28 rounded-2xl cursor-pointer transition-all duration-200"
                  style={{ border: '2px dashed rgba(255,46,109,0.25)', background: 'rgba(255,46,109,0.04)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,46,109,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,46,109,0.25)' }}>
                  <Upload size={22} style={{ color: 'rgba(255,255,255,0.3)' }} className="mb-2" />
                  <span className="text-sm font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>Click to upload photos</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
                </label>
                {photos.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {photos.map((f, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removePhoto(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(255,46,109,0.9)' }}>
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1">← Back</button>
                <button type="button" onClick={() => {
                  if (!form.itemType || !form.title) return setError('Item type and title are required.')
                  setError(''); setStep(3)
                }} className="btn-primary flex-1">
                  Next: Pricing <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Pricing ──────────────── */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="font-bungee text-xl text-white mb-2">Set Your Pricing</h2>
              <p className="text-sm font-display mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                You keep <strong style={{ color: '#ffd23f' }}>80%</strong> of every rental. Platform takes 20%.
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="field-label">PER DAY *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bungee text-sm pointer-events-none" style={{ color: '#ff2e6d' }}>₹</span>
                    <input type="number" value={form.priceDay} onChange={set('priceDay')} required min={50} max={5000}
                      placeholder="499" className="input-dark pl-7" />
                  </div>
                </div>
                <div>
                  <label className="field-label">WEEKEND</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bungee text-sm pointer-events-none" style={{ color: '#00e5ff' }}>₹</span>
                    <input type="number" value={form.priceWeekend} onChange={set('priceWeekend')} min={50}
                      placeholder="799" className="input-dark pl-7" />
                  </div>
                </div>
                <div>
                  <label className="field-label">PER WEEK</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bungee text-sm pointer-events-none" style={{ color: '#ffd23f' }}>₹</span>
                    <input type="number" value={form.priceWeek} onChange={set('priceWeek')} min={50}
                      placeholder="2499" className="input-dark pl-7" />
                  </div>
                </div>
              </div>

              {/* Earnings preview */}
              {form.priceDay && (
                <div className="glass rounded-2xl p-4"
                  style={{ border: '1px solid rgba(0,229,255,0.15)' }}>
                  <p className="text-xs font-display mb-3" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
                    YOUR ESTIMATED EARNINGS
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'Per Day', amount: Math.floor(form.priceDay * 0.8) },
                      { label: 'Per Week (×7)', amount: Math.floor(form.priceDay * 0.8 * 7) },
                      { label: 'Per Month (×20)', amount: Math.floor(form.priceDay * 0.8 * 20) },
                    ].map(e => (
                      <div key={e.label}>
                        <div className="font-bungee text-lg" style={{ color: '#ffd23f' }}>₹{e.amount}</div>
                        <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.35)' }}>{e.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security deposit */}
              <div>
                <label className="field-label">SECURITY DEPOSIT</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bungee text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>₹</span>
                  <input type="number" value={form.deposit} onChange={set('deposit')} min={500}
                    className="input-dark pl-8" />
                </div>
                <p className="text-xs font-display mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Held by platform and returned after rental completes.
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="field-label">CONTACT PHONE</label>
                <input type="tel" value={form.phone} onChange={set('phone')}
                  placeholder="+91 98765 43210" className="input-dark" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className="btn-outline flex-1">← Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1"
                  style={{ opacity: loading ? 0.7 : 1 }}>
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                      Publishing...
                    </span>
                  ) : '🚀 Publish Listing'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
