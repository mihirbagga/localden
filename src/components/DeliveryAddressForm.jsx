import { useState, useEffect } from 'react'
import {
  Home, Briefcase, MapPin, Navigation, ExternalLink,
  Clock, Check, Trash2, BookmarkPlus, AlertTriangle,
} from 'lucide-react'
import DeliveryAddressDisplay from './DeliveryAddressDisplay'
import { reverseGeocode, formatDeliveryAddress, parseDeliveryAddress } from '../lib/deliveryAddress'
import { lookupPincode } from '../lib/deliveryFee'
import { BENGALURU_LOCALITIES, GURUGRAM_LOCALITIES } from '../lib/cities'

const POPULAR_QUICK_LOCALITIES = [
  'Koramangala',
  'Indiranagar',
  'HSR Layout',
  'Whitefield',
  'Cyber City',
  'DLF Phase 2',
  'Golf Course Road',
]

const DELIVERY_SLOTS = [
  { id: 'Express (60–90 mins)', label: '⚡ Express', sub: '60–90 mins' },
  { id: 'Morning (10 AM – 1 PM)', label: '🌅 Morning', sub: '10 AM – 1 PM' },
  { id: 'Afternoon (1 – 5 PM)', label: '☀️ Afternoon', sub: '1 – 5 PM' },
  { id: 'Evening (5 – 9 PM)', label: '🌙 Evening', sub: '5 – 9 PM' },
]

const QUICK_NOTES = [
  'Call on arrival',
  'Leave with building security',
  'Ring doorbell — do not call',
]

const SAVED_LIST_KEY = 'rent_saved_addresses_v2'
const LEGACY_SAVED_KEY = 'rent_saved_delivery_address'

function readSavedAddresses() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_LIST_KEY) || '[]')
    if (Array.isArray(raw) && raw.length > 0) return raw
    const legacy = localStorage.getItem(LEGACY_SAVED_KEY)
    if (legacy && legacy.trim()) {
      const parsed = parseDeliveryAddress(legacy)
      return [
        {
          id: 'default-home',
          label: 'Home',
          flat: parsed.cleanAddress,
          street: '',
          locality: parsed.locality || '',
          landmark: '',
          pincode: parsed.pincode || '',
          mapsUrl: parsed.mapsUrl || '',
          formatted: legacy,
        },
      ]
    }
  } catch {}
  return []
}

export default function DeliveryAddressForm({ value = '', onChange }) {
  const [flat, setFlat] = useState('')
  const [street, setStreet] = useState('')
  const [locality, setLocality] = useState('')
  const [landmark, setLandmark] = useState('')
  const [pincode, setPincode] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [slot, setSlot] = useState('Morning (10 AM – 1 PM)')
  const [instructions, setInstructions] = useState('')
  const [saveLabel, setSaveLabel] = useState('Home')
  const [justSaved, setJustSaved] = useState(false)

  const [savedList, setSavedList] = useState(() => readSavedAddresses())
  const [locating, setLocating] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('')
  const [pinHint, setPinHint] = useState(null)

  const syncCombined = (next) => {
    const combined = formatDeliveryAddress(next)
    onChange(combined)
    if (combined) {
      try {
        localStorage.setItem(LEGACY_SAVED_KEY, combined)
      } catch {}
    }
  }

  const currentFields = (overrides = {}) => ({
    flat,
    street,
    locality,
    landmark,
    pincode,
    mapsUrl,
    slot,
    instructions,
    ...overrides,
  })

  const handleFieldChange = (field, val) => {
    const next = currentFields({ [field]: val })
    if (field === 'flat') setFlat(val)
    if (field === 'street') setStreet(val)
    if (field === 'locality') setLocality(val)
    if (field === 'landmark') setLandmark(val)
    if (field === 'mapsUrl') setMapsUrl(val)
    if (field === 'slot') setSlot(val)
    if (field === 'instructions') setInstructions(val)

    if (field === 'pincode') {
      const digits = val.replace(/\D/g, '').slice(0, 6)
      setPincode(digits)
      next.pincode = digits
      if (digits.length === 6) {
        const info = lookupPincode(digits)
        if (info?.unsupportedCity) {
          setPinHint({ tone: 'warn', text: 'Doorstep delivery is currently live in Bengaluru (560xxx) & Gurugram (122xxx).' })
        } else if (info) {
          if (info.locality && !locality) {
            setLocality(info.locality)
            next.locality = info.locality
          }
          setPinHint({
            tone: 'ok',
            text: `✓ Serviceable ${info.city} area${info.locality ? ` · ${info.locality}` : ''}`,
          })
        }
      } else {
        setPinHint(null)
      }
    }

    syncCombined(next)
  }

  const toggleLocalityChip = (locName) => {
    const nextLoc = locality === locName ? '' : locName
    setLocality(nextLoc)
    syncCombined(currentFields({ locality: nextLoc }))
  }

  const applySavedAddress = (item) => {
    const nextFlat = item.flat || ''
    const nextStreet = item.street || ''
    const nextLoc = item.locality || ''
    const nextLandmark = item.landmark || ''
    const nextPin = item.pincode || ''
    const nextMaps = item.mapsUrl || ''
    setFlat(nextFlat)
    setStreet(nextStreet)
    setLocality(nextLoc)
    setLandmark(nextLandmark)
    setPincode(nextPin)
    setMapsUrl(nextMaps)
    if (nextPin.length === 6) {
      const info = lookupPincode(nextPin)
      if (info && !info.unsupportedCity) {
        setPinHint({ tone: 'ok', text: `✓ Serviceable ${info.city} area${info.locality ? ` · ${info.locality}` : ''}` })
      }
    }
    syncCombined(
      currentFields({
        flat: nextFlat,
        street: nextStreet,
        locality: nextLoc,
        landmark: nextLandmark,
        pincode: nextPin,
        mapsUrl: nextMaps,
      })
    )
  }

  const saveCurrentToBook = () => {
    if (!flat.trim() && !street.trim() && !locality.trim()) return
    const entry = {
      id: `${saveLabel.toLowerCase()}-${Date.now()}`,
      label: saveLabel,
      flat: flat.trim(),
      street: street.trim(),
      locality: locality.trim(),
      landmark: landmark.trim(),
      pincode: pincode.trim(),
      mapsUrl: mapsUrl.trim(),
      formatted: value,
    }
    const filtered = savedList.filter((x) => x.label !== saveLabel)
    const nextList = [entry, ...filtered].slice(0, 4)
    setSavedList(nextList)
    try {
      localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(nextList))
    } catch {}
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1800)
  }

  const removeSavedAddress = (id, e) => {
    e.stopPropagation()
    const nextList = savedList.filter((x) => x.id !== id)
    setSavedList(nextList)
    try {
      localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(nextList))
    } catch {}
  }

  // Hydrate once on mount if parent already passed a value
  useEffect(() => {
    if (!value || flat || street || locality) return
    const parsed = parseDeliveryAddress(value)
    if (parsed.cleanAddress) setFlat(parsed.cleanAddress)
    if (parsed.locality) setLocality(parsed.locality)
    if (parsed.pincode) setPincode(parsed.pincode)
    if (parsed.mapsUrl) setMapsUrl(parsed.mapsUrl)
    if (parsed.slot) setSlot(parsed.slot)
    if (parsed.instructions) setInstructions(parsed.instructions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setGpsStatus('Acquiring precise GPS fix...')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const url = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`
        setMapsUrl(url)
        setGpsStatus('Resolving road & pincode from GPS...')

        let nextStreet = street
        let nextLoc = locality
        let nextPin = pincode

        try {
          const geo = await reverseGeocode(latitude, longitude)
          if (geo) {
            if (!street && geo.road) {
              nextStreet = geo.road
              setStreet(geo.road)
            }
            if (!locality && (geo.locality || geo.road)) {
              nextLoc = geo.locality || geo.road
              setLocality(nextLoc)
            }
            if (!pincode && geo.pincode) {
              const cleanPin = String(geo.pincode).replace(/\D/g, '').slice(0, 6)
              nextPin = cleanPin
              setPincode(cleanPin)
            }
            const foundArea = geo.locality || geo.road || geo.city || 'Bengaluru'
            setGpsStatus(`📍 Exact GPS Pin (${foundArea}) attached!`)
          } else {
            setGpsStatus('📍 Exact GPS Coordinates attached!')
          }
        } catch {
          setGpsStatus('📍 Exact GPS Coordinates attached!')
        }

        syncCombined(
          currentFields({
            street: nextStreet,
            locality: nextLoc,
            pincode: nextPin,
            mapsUrl: url,
          })
        )
        setLocating(false)
      },
      () => {
        setGpsStatus('Location access denied. Type your address or pincode below.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-3 mt-2">
      {/* Top Action Bar: GPS 1-Tap + Saved Addresses */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={locating}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/15 hover:from-cyan-500/30 hover:to-blue-500/25 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Navigation size={12} className={locating ? 'animate-spin' : 'text-cyan-300'} />
          <span>{locating ? 'Detecting GPS…' : mapsUrl ? '✓ GPS Pin Attached (Update)' : '📍 Use My Current Location'}</span>
        </button>

        {savedList.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {savedList.map((item) => (
              <div
                key={item.id}
                onClick={() => applySavedAddress(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') applySavedAddress(item) }}
                className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-cyan-500/20 border border-white/15 hover:border-cyan-400/40 text-[11px] text-white/85 cursor-pointer transition-all"
                title={`Fill ${item.label}: ${item.flat}`}
              >
                {item.label === 'Work' ? <Briefcase size={10} className="text-cyan-300" /> : <Home size={10} className="text-pink-400" />}
                <span className="font-semibold">{item.label}</span>
                <button
                  type="button"
                  onClick={(e) => removeSavedAddress(item.id, e)}
                  className="opacity-50 hover:opacity-100 text-white/60 hover:text-red-300 ml-0.5"
                  aria-label={`Remove saved ${item.label} address`}
                >
                  <Trash2 size={9} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {gpsStatus && (
        <div
          className={`text-[11px] px-2.5 py-1.5 rounded-lg border ${
            gpsStatus.includes('attached')
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : gpsStatus.includes('denied')
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
          }`}
        >
          {gpsStatus}
        </div>
      )}

      {/* Structured Address Inputs */}
      <div className="space-y-2.5">
        <div>
          <label className="text-[11px] font-semibold tracking-wider text-white/60 uppercase block mb-1">
            House / Flat No. &amp; Building <span className="text-pink-400">*</span>
          </label>
          <input
            type="text"
            className="input-dark text-xs py-2"
            placeholder="e.g. Flat 402, Tower B, Prestige Shantiniketan"
            value={flat}
            onChange={(e) => handleFieldChange('flat', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold tracking-wider text-white/60 uppercase block mb-1">
              6-Digit Pincode <span className="text-pink-400">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="input-dark text-xs py-2 font-mono"
              placeholder="e.g. 560034 or 122002"
              value={pincode}
              onChange={(e) => handleFieldChange('pincode', e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold tracking-wider text-white/60 uppercase block mb-1">
              Locality / Hub Area
            </label>
            <select
              className="select-dark text-xs py-2"
              value={locality}
              onChange={(e) => handleFieldChange('locality', e.target.value)}
            >
              <option value="">-- Select Locality --</option>
              <optgroup label="🏙️ Bengaluru">
                {BENGALURU_LOCALITIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🏢 Gurugram (NCR)">
                {GURUGRAM_LOCALITIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {pinHint && (
          <div
            className={`text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
              pinHint.tone === 'ok'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
            }`}
          >
            {pinHint.tone === 'warn' && <AlertTriangle size={12} className="shrink-0" />}
            <span>{pinHint.text}</span>
          </div>
        )}

        {/* Quick Locality Chips */}
        <div>
          <span className="text-[10px] text-white/45 block mb-1">Quick Area Pick:</span>
          <div className="flex flex-wrap gap-1">
            {POPULAR_QUICK_LOCALITIES.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => toggleLocalityChip(loc)}
                className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all ${
                  locality === loc
                    ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold tracking-wider text-white/60 uppercase block mb-1">
              Street / Road
            </label>
            <input
              type="text"
              className="input-dark text-xs py-2"
              placeholder="e.g. 100 Feet Road, 4th Block"
              value={street}
              onChange={(e) => handleFieldChange('street', e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold tracking-wider text-white/60 uppercase block mb-1">
              Landmark (Optional)
            </label>
            <input
              type="text"
              className="input-dark text-xs py-2"
              placeholder="e.g. Near Sony World Signal"
              value={landmark}
              onChange={(e) => handleFieldChange('landmark', e.target.value)}
            />
          </div>
        </div>

        {/* Preferred Delivery Time Slot */}
        <div className="pt-1">
          <label className="text-[11px] font-semibold tracking-wider text-white/60 uppercase flex items-center gap-1 mb-1.5">
            <Clock size={11} className="text-cyan-300" />
            <span>Preferred Handover Window</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {DELIVERY_SLOTS.map((s) => {
              const active = slot === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleFieldChange('slot', s.id)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    active
                      ? 'bg-cyan-500/15 border-cyan-400/50 text-white shadow-sm'
                      : 'bg-white/[0.02] border-white/10 text-white/65 hover:border-white/25'
                  }`}
                >
                  <div className="text-[11px] font-bold leading-tight">{s.label}</div>
                  <div className="text-[10px] text-white/50">{s.sub}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Drop-off Instructions + Google Maps Link */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold tracking-wider text-white/60 uppercase block">
            Rider Drop-off Instructions (Optional)
          </label>
          <div className="flex flex-wrap gap-1">
            {QUICK_NOTES.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => handleFieldChange('instructions', instructions === note ? '' : note)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  instructions === note
                    ? 'bg-pink-500/20 border-pink-400 text-pink-200 font-semibold'
                    : 'bg-white/5 border-white/10 text-white/55 hover:border-white/25'
                }`}
              >
                {note}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="input-dark text-xs py-1.5"
            placeholder="Gate pass note, intercom code, or directions for the rider…"
            value={instructions}
            onChange={(e) => handleFieldChange('instructions', e.target.value)}
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold tracking-wider text-white/50 uppercase block mb-1">
            Google Maps Pin Link (Optional)
          </label>
          <div className="relative">
            <input
              type="url"
              className="input-dark text-xs py-1.5 pr-8"
              placeholder="Paste Google Maps share link for exact gate drop-off…"
              value={mapsUrl}
              onChange={(e) => handleFieldChange('mapsUrl', e.target.value)}
            />
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300"
                title="Open Maps Link"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Save Address for 1-Tap Reuse */}
      {(flat.trim() || street.trim()) && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/45 mr-1">Save as:</span>
            {['Home', 'Work', 'Other'].map((lbl) => (
              <button
                key={lbl}
                type="button"
                onClick={() => setSaveLabel(lbl)}
                className={`text-[10px] px-2 py-0.5 rounded-md border ${
                  saveLabel === lbl
                    ? 'bg-white/15 border-white/30 text-white font-bold'
                    : 'bg-transparent border-white/10 text-white/50'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={saveCurrentToBook}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-cyan-200 transition-all"
          >
            {justSaved ? <Check size={11} className="text-emerald-400" /> : <BookmarkPlus size={11} />}
            <span>{justSaved ? `Saved to ${saveLabel}!` : `Save ${saveLabel}`}</span>
          </button>
        </div>
      )}

      {/* Live Preview */}
      {value && (
        <div className="space-y-1 pt-1 border-t border-white/10">
          <DeliveryAddressDisplay address={value} />
        </div>
      )}
    </div>
  )
}
