import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Upload, X, AlertCircle, Gamepad2, Music, ChevronRight, Shield } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { usePlatformFee } from '../hooks/usePlatformFee'
import { needsKyc } from '../lib/kyc'
import KycGate from '../components/KycGate'
import ListingGamesSelector from '../components/ListingGamesSelector'
import { fetchListingGames, saveListingGames } from '../lib/gamesService'
import { computePlatformFee, platformFeeCopy } from '../lib/platformFee'
import { calculateSuggestedPricing } from '../lib/dynamicPricing'
import { MESSAGES, friendlyError } from '../lib/messages'
import './couponApply.css'
import './listItem.css'
import {
  CITIES,
  BENGALURU_LOCALITIES,
  GURUGRAM_LOCALITIES,
  getCityForLocation,
} from '../lib/cities'

const GAMING_TYPES = ['Console','Controller','VR Headset','Gaming Mouse','Racing Wheel','Gaming Chair','Monitor','Headset','Other']
const MUSIC_TYPES  = ['Guitar','Bass','Piano / Keyboard','Drums','DJ Controller','Microphone','Amplifier','Synthesizer','Violin','Saxophone','Other']
const CONDITIONS   = [
  { value: 'like_new', label: '✨ Like New',  desc: 'Barely used, mint condition' },
  { value: 'good',     label: '👍 Good',      desc: 'Normal wear, works perfectly' },
  { value: 'fair',     label: '🔧 Fair',      desc: 'Visible wear, fully functional' },
]
const PRICE_PRESETS = [199, 299, 499, 799, 999]
const DEPOSIT_PRESETS = [0, 2000, 5000, 10000]
const STEP_LABELS = ['1. Gear Details & Photos', '2. Pricing & Publish']

const CATEGORY_EMOJI = {
  Console: '🎮', Controller: '🕹️', 'VR Headset': '🥽', 'Gaming Mouse': '🖱️',
  'Racing Wheel': '🏎️', 'Gaming Chair': '🪑', Monitor: '🖥️', Headset: '🎧',
  Guitar: '🎸', Bass: '🎸', 'Piano / Keyboard': '🎹', Drums: '🥁',
  'DJ Controller': '🎛️', Microphone: '🎤', Amplifier: '🔊', Synthesizer: '🎹',
  Violin: '🎻', Saxophone: '🎷', Other: '📦',
}

const EMPTY_FORM = {
  title: '', description: '', itemType: '', brand: '', model: '',
  condition: 'good',
  city: 'Bengaluru',
  location: 'Koramangala',
  priceDay: '', priceWeekend: '', priceWeek: '',
  deposit: '0',
  hasDeposit: false,
  phone: '',
  stockQty: '1',
  fulfillmentType: 'direct',
}

const POPULAR_GEAR_TEMPLATES = [
  {
    id: 'ps5-bundle',
    badge: '🎮 PS5 + 2 Controllers',
    category: 'gaming',
    itemType: 'Console',
    title: 'Sony PlayStation 5 Disc Edition + 2 DualSense Controllers',
    brand: 'Sony',
    model: 'PS5 Disc Edition (1TB)',
    condition: 'like_new',
    description: 'Includes Sony PS5 console, 2 original DualSense wireless controllers, HDMI 2.1 cable, power cord, and USB-C charging cable. Cleaned, tested, and ready for couch co-op or weekend gaming.',
    priceDay: '599',
    priceWeekend: '1499',
    priceWeek: '3299',
    deposit: '5000',
  },
  {
    id: 'quest-3',
    badge: '🥽 Meta Quest 3 VR',
    category: 'gaming',
    itemType: 'VR Headset',
    title: 'Meta Quest 3 (128GB) Mixed Reality VR Headset + Touch Plus',
    brand: 'Meta',
    model: 'Quest 3 128GB',
    condition: 'like_new',
    description: 'Standalone wireless VR headset with 4K+ Infinite Display, 2 Touch Plus controllers, silicone hygiene face cover, and fast USB-C charger. Sanitized before every rental.',
    priceDay: '699',
    priceWeekend: '1699',
    priceWeek: '3799',
    deposit: '5000',
  },
  {
    id: 'xbox-series-x',
    badge: '🕹️ Xbox Series X',
    category: 'gaming',
    itemType: 'Console',
    title: 'Microsoft Xbox Series X 1TB + 2 Wireless Controllers',
    brand: 'Microsoft',
    model: 'Xbox Series X 1TB',
    condition: 'like_new',
    description: 'True 4K 120FPS Xbox Series X console with 2 official wireless controllers, Ultra High Speed HDMI cable, and power cord. Ready for Game Pass sessions.',
    priceDay: '499',
    priceWeekend: '1299',
    priceWeek: '2799',
    deposit: '5000',
  },
  {
    id: 'switch-oled',
    badge: '🎯 Switch OLED',
    category: 'gaming',
    itemType: 'Console',
    title: 'Nintendo Switch OLED Console + Neon Joy-Cons & Dock',
    brand: 'Nintendo',
    model: 'Switch OLED',
    condition: 'like_new',
    description: '7-inch OLED screen Nintendo Switch with Joy-Con pair, TV Dock, HDMI cable, Joy-Con grip, and carry case. Ideal for house parties and travel.',
    priceDay: '399',
    priceWeekend: '999',
    priceWeek: '2199',
    deposit: '2000',
  },
  {
    id: 'g29-wheel',
    badge: '🏎️ Logitech G29 Wheel',
    category: 'gaming',
    itemType: 'Racing Wheel',
    title: 'Logitech G29 Driving Force Racing Wheel + Floor Pedals',
    brand: 'Logitech',
    model: 'G29 Driving Force',
    condition: 'good',
    description: 'Dual-motor force feedback sim racing wheel with stainless steel paddle shifters and responsive 3-pedal floor unit. Compatible with PS5, PS4, and PC.',
    priceDay: '449',
    priceWeekend: '1149',
    priceWeek: '2499',
    deposit: '2000',
  },
  {
    id: 'pioneer-dj',
    badge: '🎛️ Pioneer DJ Deck',
    category: 'music',
    itemType: 'DJ Controller',
    title: 'Pioneer DDJ-FLX4 / DDJ-400 2-Channel DJ Controller',
    brand: 'Pioneer DJ',
    model: 'DDJ-FLX4',
    condition: 'like_new',
    description: 'Club-standard 2-channel Rekordbox & Serato DJ controller with USB-C cable and RCA master out cable. Plug-and-play with laptop or iPad for house parties and gigs.',
    priceDay: '699',
    priceWeekend: '1799',
    priceWeek: '3899',
    deposit: '5000',
  },
  {
    id: 'yamaha-p125',
    badge: '🎹 Yamaha P-125 Piano',
    category: 'music',
    itemType: 'Piano / Keyboard',
    title: 'Yamaha P-125 88-Key Weighted Digital Piano + Sustain Pedal',
    brand: 'Yamaha',
    model: 'P-125',
    condition: 'like_new',
    description: 'Full 88-key Graded Hammer Standard (GHS) weighted digital piano with sustain pedal, music rest, stand, and power adapter.',
    priceDay: '599',
    priceWeekend: '1499',
    priceWeek: '3299',
    deposit: '5000',
  },
  {
    id: 'fender-strat',
    badge: '🎸 Fender Strat + Amp',
    category: 'music',
    itemType: 'Guitar',
    title: 'Fender Player Stratocaster Electric Guitar + 15W Practice Amp',
    brand: 'Fender',
    model: 'Player Stratocaster',
    condition: 'good',
    description: 'Authentic Fender Stratocaster freshly set up with Ernie Ball strings, padded gig bag, strap, picks, 1/4" instrument cable, and compact practice amplifier.',
    priceDay: '499',
    priceWeekend: '1249',
    priceWeek: '2699',
    deposit: '2000',
  },
]

function keepAfterFee(amount, fee) {
  const n = Number(amount) || 0
  return Math.max(0, n - computePlatformFee(n, fee))
}

export default function ListItem() {
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const isEdit = Boolean(editId)
  const { user, profile, isBanned, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const { fee: platformFeeSetting } = usePlatformFee()

  const [step, setStep] = useState(1)
  const [category, setCategory] = useState('')
  const [photos, setPhotos] = useState([])
  const [existingPhotos, setExistingPhotos] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [games, setGames] = useState([])
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

  // Load existing listing data in edit mode
  useEffect(() => {
    if (!editId || !user) return
    supabase.from('listings').select('*').eq('id', editId).eq('user_id', user.id).single()
      .then(({ data, error: err }) => {
        if (err || !data) { showToast('Could not find that listing on your shelf.', 'error'); navigate('/dashboard'); return }
        setCategory(data.category)
        setStep(1)
        const loadedDeposit = data.deposit_amount != null ? Number(data.deposit_amount) : 0
        const detectedCity = getCityForLocation(data.location || '')
        setForm({
          title:        data.title         || '',
          description:  (data.description || '').replace(/\s*\[GAMES:.*?\]/gi, '').trim(),
          itemType:     data.subcategory   || '',
          brand:        data.brand         || '',
          model:        data.model         || '',
          condition:    data.condition     || 'good',
          city:         detectedCity,
          location:     data.location      || (detectedCity === 'Gurugram' ? 'Cyber City' : 'Koramangala'),
          priceDay:     String(data.price_day     || ''),
          priceWeekend: String(data.price_weekend || ''),
          priceWeek:    String(data.price_week    || ''),
          deposit:      String(loadedDeposit),
          hasDeposit:   loadedDeposit > 0,
          phone:        data.contact_phone || profile?.phone || '',
          stockQty:     String(data.stock_qty || '1'),
          fulfillmentType: data.fulfillment_type || 'direct',
        })
        if (data.photos?.length) setExistingPhotos(data.photos)
        fetchListingGames(editId, data).then((loadedGames) => {
          if (Array.isArray(loadedGames) && loadedGames.length > 0) {
            setGames(loadedGames)
          }
        })
      })
  }, [editId, user])

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (!incoming.length) return
    setPhotos((prev) => {
      const next = [...prev, ...incoming].slice(0, 5)
      if (prev.length + incoming.length > 5) {
        showToast('You can upload up to 5 photos per listing.', 'error')
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
    if (n === 2 && (!category || !form.itemType || !form.title)) {
      showToast('Please select a category, item type, and enter a clear listing title first.', 'error')
      return
    }
    if (n > step + 1) {
      showToast('Please complete the current step first.', 'error')
      return
    }
    setError('')
    setStep(n)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isBanned) {
      showToast('Your account is currently restricted. Please contact support.', 'error')
      return
    }
    if (!isEdit && needsKyc(profile)) {
      showToast('Please complete quick ID verification before listing gear.', 'error')
      navigate('/kyc', { state: { from: { pathname: '/list-item' } } })
      return
    }
    if (!form.title || !form.itemType || !form.priceDay || !form.location) {
      showToast('Please fill in all required fields (title, item type, daily price, and location).', 'error')
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

      // Build description with games metadata if category is gaming
      let finalDescription = form.description.trim()
      if (category === 'gaming' && games.length > 0) {
        finalDescription = finalDescription.replace(/\s*\[GAMES:.*?\]/gi, '').trim()
        const gamesTag = `[GAMES: ${games.map((g) => `${g.title} (${g.format || 'Digital'})`).join(' | ')}]`
        finalDescription = finalDescription ? `${finalDescription}\n\n${gamesTag}` : gamesTag
      }

      if (isEdit) {
        let photoUrls = existingPhotos
        if (photos.length > 0) {
          const newUrls = await uploadPhotos(editId)
          photoUrls = [...existingPhotos, ...newUrls].slice(0, 5)
        }
        const parsedDeposit = parseInt(form.deposit, 10)
        const computedDeposit = (form.hasDeposit && !isNaN(parsedDeposit)) ? Math.max(0, parsedDeposit) : 0
        const savedLocation = form.city === 'Gurugram' && !form.location.toLowerCase().includes('gurugram')
          ? `${form.location.trim()}, Gurugram`
          : form.location.trim()

        const { error: updErr } = await supabase.from('listings').update({
          title:          form.title.trim(),
          description:    finalDescription,
          subcategory:    form.itemType,
          condition:      form.condition,
          brand:          form.brand.trim() || null,
          model:          form.model.trim() || null,
          price_day:      parseInt(form.priceDay, 10),
          price_weekend:  form.priceWeekend ? parseInt(form.priceWeekend, 10) : null,
          price_week:     form.priceWeek ? parseInt(form.priceWeek, 10) : null,
          deposit_amount: computedDeposit,
          location:       savedLocation,
          contact_phone:  form.phone || profile?.phone || null,
          photos:         photoUrls,
          stock_qty:      parseInt(form.stockQty, 10) || 1,
          fulfillment_type: form.fulfillmentType || 'direct',
          updated_at:     new Date().toISOString(),
        }).eq('id', editId).eq('user_id', user.id)
        if (updErr) throw updErr

        if (category === 'gaming') {
          await saveListingGames(editId, games)
        }

        showToast(MESSAGES.listing.savedDraft, 'success')
        navigate('/dashboard?tab=listings')
      } else {
        const listingId = crypto.randomUUID()
        let photoUrls = []
        if (photos.length > 0) {
          photoUrls = await uploadPhotos(listingId)
        }
        const parsedDeposit = parseInt(form.deposit, 10)
        const computedDeposit = (form.hasDeposit && !isNaN(parsedDeposit)) ? Math.max(0, parsedDeposit) : 0
        const savedLocation = form.city === 'Gurugram' && !form.location.toLowerCase().includes('gurugram')
          ? `${form.location.trim()}, Gurugram`
          : form.location.trim()

        const { error: insErr } = await supabase.from('listings').insert({
          id: listingId,
          user_id: user.id,
          title: form.title.trim(),
          description: finalDescription,
          category,
          subcategory: form.itemType,
          condition: form.condition,
          brand: form.brand.trim() || null,
          model: form.model.trim() || null,
          price_day: parseInt(form.priceDay, 10),
          price_weekend: form.priceWeekend ? parseInt(form.priceWeekend, 10) : null,
          price_week: form.priceWeek ? parseInt(form.priceWeek, 10) : null,
          deposit_amount: computedDeposit,
          location: savedLocation,
          contact_phone: form.phone || profile?.phone || null,
          emoji: CATEGORY_EMOJI[form.itemType] || (category === 'gaming' ? '🎮' : '🎵'),
          photos: photoUrls,
          is_available: true,
          is_published: true,
          stock_qty: parseInt(form.stockQty, 10) || 1,
          stock_total: parseInt(form.stockQty, 10) || 1,
          fulfillment_type: form.fulfillmentType || 'direct',
        })
        if (insErr) throw insErr

        if (category === 'gaming') {
          await saveListingGames(listingId, games)
        }

        showToast(MESSAGES.listing.published, 'success')
        setStep(3)
      }
    } catch (err) {
      const msg = friendlyError(err, 'Could not publish your listing. Please check your inputs and try again.')
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
    setGames([])
    setForm({ ...EMPTY_FORM, phone: profile?.phone || '' })
    setError('')
  }

  const dayKeep = keepAfterFee(form.priceDay, platformFeeSetting)
  const weekKeep = keepAfterFee(form.priceWeek || (Number(form.priceDay) || 0) * 7, platformFeeSetting)
  const monthKeep = keepAfterFee((Number(form.priceDay) || 0) * 20, platformFeeSetting)

  if (authLoading || (user && !profile)) {
    return (
      <div className="list-page min-h-screen flex items-center justify-center">
        <div className="grid-floor" />
        <GameBackground />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/20 border-t-[#ff2e6d] rounded-full animate-spin" />
          <span className="text-xs font-display text-white/40">Opening Listing Studio…</span>
        </div>
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

  if (step === 3) {
    return (
      <div className="list-page">
        <div className="grid-floor" />
        <GameBackground />
        <div className="list-success">
          <div className="text-6xl" aria-hidden="true">🎉</div>
          <h2>Your Gear is Live in the Den!</h2>
          <p>Renters across Bengaluru and Gurugram can now discover, reserve, and book your gear.</p>
          <div className="list-success__actions">
            <button type="button" className="btn-primary" onClick={() => navigate('/dashboard?tab=listings')} aria-label="Manage in Dashboard">
              Manage in My Dashboard
            </button>
            <button type="button" className="btn-outline" onClick={() => navigate('/browse')} aria-label="View catalog">
              Browse Live Catalog
            </button>
            <button type="button" className="btn-outline" onClick={resetForm} aria-label="List another item">
              + List Another Item
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
                {!isEdit && (
                  <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent border border-cyan-500/25">
                    <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                      <div>
                        <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                          ⚡ List in 30 Seconds · 1-Tap Smart Catalog Templates
                        </span>
                        <p className="text-xs text-white/60 mt-0.5">
                          Tap any popular gear below to auto-fill specs, descriptions, and market-winning rental rates.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_GEAR_TEMPLATES.map((tpl) => {
                        const isPicked = form.title === tpl.title
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => {
                              setCategory(tpl.category)
                              setForm((f) => ({
                                ...f,
                                itemType: tpl.itemType,
                                title: tpl.title,
                                brand: tpl.brand,
                                model: tpl.model,
                                condition: tpl.condition,
                                description: tpl.description,
                                priceDay: tpl.priceDay,
                                priceWeekend: tpl.priceWeekend,
                                priceWeek: tpl.priceWeek,
                                deposit: tpl.deposit,
                                hasDeposit: Number(tpl.deposit) > 0,
                              }))
                              setError('')
                              showToast(`⚡ Auto-filled "${tpl.badge}" — just add photos or tweak anything!`, 'success')
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-all border ${
                              isPicked
                                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
                                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-cyan-400/40'
                            }`}
                          >
                            {tpl.badge} · <span className="text-cyan-300">₹{tpl.priceDay}/d</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

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

                {/* Available Games Section for PS5 / Gaming listings */}
                {category === 'gaming' && (
                  <ListingGamesSelector games={games} onChange={setGames} />
                )}

                {/* Rental City */}
                <div className="list-field">
                  <p className="field-label">City *</p>
                  <div className="list-chips" role="group" aria-label="City">
                    {CITIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`list-chip${form.city === c.name ? ' is-on' : ''}`}
                        onClick={() => {
                          const defaultLoc = c.id === 'gurugram' ? 'Cyber City' : 'Koramangala'
                          setForm((f) => ({ ...f, city: c.name, location: defaultLoc }))
                        }}
                        aria-pressed={form.city === c.name}
                        aria-label={`City ${c.name}`}
                      >
                        {c.name === 'Gurugram' ? '🏢 Gurugram (NCR)' : '🏙️ Bengaluru'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Area in selected City */}
                <div className="list-field">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="field-label mb-0">Area / Locality in {form.city || 'City'} *</p>
                    <span className="text-[11px] font-mono text-cyan-400">
                      {form.city === 'Gurugram' ? 'Cyber City · DLF · Golf Course Rd' : 'Koramangala · Indiranagar · HSR'}
                    </span>
                  </div>
                  <div className="list-chips" role="group" aria-label={`Area in ${form.city}`}>
                    {(form.city === 'Gurugram' ? GURUGRAM_LOCALITIES : BENGALURU_LOCALITIES).map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        className={`list-chip${form.location === loc || form.location.startsWith(loc) ? ' is-on' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, location: loc }))}
                        aria-pressed={form.location === loc}
                        aria-label={`Area ${loc}`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={form.location}
                      onChange={set('location')}
                      placeholder={`Or enter specific sector, society or landmark in ${form.city}...`}
                      className="input-dark text-xs py-2"
                      aria-label={`Custom area in ${form.city}`}
                    />
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
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (!category || !form.itemType || !form.title) {
                        showToast('Category, type, and title are required.', 'error')
                        return
                      }
                      goStep(2)
                    }}
                    aria-label="Continue to pricing"
                  >
                    Next: Pricing <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <form onSubmit={handleSubmit}>
                <h2>Set your pricing</h2>

                <div className="list-field">
                  <p className="field-label">Fulfillment & Storage Option *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, fulfillmentType: 'direct' }))}
                      className={`p-4 rounded-2xl text-left transition-all duration-200 border ${
                        form.fulfillmentType === 'direct'
                          ? 'bg-pink-500/15 border-pink-500 text-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-display font-bold text-sm text-white mb-1">
                        <span>🏠</span> Deliver From My Place
                      </div>
                      <div className="text-xs font-display text-white/50 leading-relaxed">
                        Keep gear at your home/studio. Fulfill pickup or doorstep delivery directly with renters.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, fulfillmentType: 'warehouse' }))}
                      className={`p-4 rounded-2xl text-left transition-all duration-200 border ${
                        form.fulfillmentType === 'warehouse'
                          ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-display font-bold text-sm text-white mb-1">
                        <span>🏬</span> Store at लोकल Den Hub
                      </div>
                      <div className="text-xs font-display text-white/50 leading-relaxed">
                        Store gear at our Koramangala Warehouse. We manage inspection, storage, and dispatch.
                      </div>
                    </button>
                  </div>
                </div>

                <p className="list-fee-note">{platformFeeCopy(platformFeeSetting)}</p>

                {/* Smart Dynamic Pricing Recommendation Card */}
                <div className="mb-4 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs font-display">
                  <div>
                    <span className="font-bold text-cyan-400 block mb-0.5">⚡ Smart AI Price Recommendation</span>
                    <span className="text-white/70 text-[11px]">
                      Based on {form.title || form.brand || 'your gear specs'}, suggested rate is{' '}
                      <strong className="text-emerald-400">
                        ₹{calculateSuggestedPricing({ gpu: form.title, cpu: form.model, category }).suggestedDaily}/day
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const rec = calculateSuggestedPricing({ gpu: form.title, cpu: form.model, category })
                      setForm((f) => ({
                        ...f,
                        priceDay: String(rec.suggestedDaily),
                        priceWeekend: String(rec.weekendPrice),
                        deposit: String(rec.recommendedDeposit),
                      }))
                      showToast(`Applied smart rate ₹${rec.suggestedDaily}/day`, 'success')
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex-shrink-0"
                  >
                    Apply AI Price
                  </button>
                </div>

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
                  <div className="flex items-center justify-between mb-2">
                    <p className="field-label mb-0">Security deposit</p>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-cyan-400 select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(form.hasDeposit)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setForm((f) => ({
                            ...f,
                            hasDeposit: checked,
                            deposit: checked ? (f.deposit && f.deposit !== '0' ? f.deposit : '2000') : '0',
                          }))
                        }}
                        className="rounded border-white/20 text-cyan-400 focus:ring-0 focus:ring-offset-0 bg-black/40"
                      />
                      <span>Require security deposit</span>
                    </label>
                  </div>

                  {!form.hasDeposit || String(form.deposit) === '0' ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-300 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🛡️</span>
                        <span><strong>Zero Deposit Listing:</strong> Renters won&apos;t be charged a security deposit. Great for getting rentals faster!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, hasDeposit: true, deposit: '2000' }))}
                        className="underline text-emerald-200 hover:text-white font-medium ml-2 whitespace-nowrap"
                      >
                        + Add deposit
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="list-chips" role="group" aria-label="Deposit presets">
                        <button
                          type="button"
                          className={`list-chip${String(form.deposit) === '0' || !form.hasDeposit ? ' is-on' : ''}`}
                          onClick={() => setForm((f) => ({ ...f, hasDeposit: false, deposit: '0' }))}
                          aria-label="No deposit"
                        >
                          No deposit (₹0)
                        </button>
                        {DEPOSIT_PRESETS.filter((n) => n > 0).map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={`list-chip${String(form.deposit) === String(n) && form.hasDeposit ? ' is-on' : ''}`}
                            onClick={() => setForm((f) => ({ ...f, hasDeposit: true, deposit: String(n) }))}
                            aria-label={`Set deposit ${n}`}
                          >
                            ₹{n.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                      <div className="list-rupee">
                        <span aria-hidden="true">₹</span>
                        <input
                          id="list-deposit"
                          type="number"
                          value={form.deposit}
                          onChange={(e) => {
                            const val = e.target.value
                            setForm((f) => ({
                              ...f,
                              deposit: val,
                              hasDeposit: val !== '' && Number(val) > 0,
                            }))
                          }}
                          min={0}
                          placeholder="0"
                          className="input-dark"
                          aria-label="Security deposit"
                        />
                      </div>
                      <p className="list-hint">Held on the booking. Returned after a clean rental.</p>
                    </>
                  )}
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

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Shield size={15} /> 🛡️ 5-Layer Lender Protection Guarantee
                    </span>
                    <Link
                      to="/terms#lender-shield"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-cyan-300 underline hover:text-white"
                    >
                      Read Host Protection Policy ↗
                    </Link>
                  </div>
                  <p className="text-xs text-white/75 leading-relaxed">
                    List with 100% peace of mind. Every borrower is bound by our legal &amp; hardware verification stack before your gear ever leaves your hands:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 text-[11px] text-white/80">
                    <div className="p-2 rounded-lg bg-black/30 border border-white/10">
                      <strong className="text-emerald-300">1. Govt KYC + Selfie Verified:</strong> Aadhaar/PAN/DL + live selfie required before booking.
                    </div>
                    <div className="p-2 rounded-lg bg-black/30 border border-white/10">
                      <strong className="text-emerald-300">2. E-Signed Rental Pact:</strong> Legally binding IT Act 2000 PDF contract signed by both sides.
                    </div>
                    <div className="p-2 rounded-lg bg-black/30 border border-white/10">
                      <strong className="text-emerald-300">3. Dual-OTP + 3-Point Check:</strong> Handover &amp; Return PINs + serial &amp; cable verification.
                    </div>
                    <div className="p-2 rounded-lg bg-black/30 border border-white/10">
                      <strong className="text-emerald-300">4. Escrow &amp; Anti-Tamper Shield:</strong> Deposit held in escrow + 100% fair market recovery for damage/loss.
                    </div>
                  </div>
                </div>

                <div className="list-actions">
                  <button type="button" className="btn-outline" onClick={() => goStep(1)} aria-label="Back to details">← Back</button>
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
            <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-emerald-300/90 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <Shield size={12} /> Host Shield Active
              </div>
              <p className="text-white/60 text-[10px] leading-snug">
                Govt KYC renters only · E-Signed Pact · Dual-OTP Handover · Photo Proof.{' '}
                <Link to="/terms" target="_blank" rel="noreferrer" className="text-cyan-300 underline">
                  Policy ↗
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
