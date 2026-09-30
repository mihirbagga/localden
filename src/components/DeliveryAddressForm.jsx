import { useState, useEffect } from 'react'
import { Home, ExternalLink, MapPin, Navigation } from 'lucide-react'

const BANGALORE_LOCALITIES = [
  'Koramangala',
  'Indiranagar',
  'HSR Layout',
  'Whitefield',
  'Jayanagar',
  'JP Nagar',
  'BTM Layout',
  'Bellandur',
  'Marathahalli',
  'Electronic City',
]

export default function DeliveryAddressForm({ value = '', onChange }) {
  const [flat, setFlat] = useState('')
  const [street, setStreet] = useState('')
  const [locality, setLocality] = useState('') // Optional by default
  const [landmark, setLandmark] = useState('')
  const [pincode, setPincode] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [savedAddr, setSavedAddr] = useState('')
  const [locating, setLocating] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('')

  // Check localStorage for saved address on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rent_saved_delivery_address')
      if (saved) {
        setSavedAddr(saved)
      }
    } catch {
      // ignore localStorage errors
    }
  }, [])

  // Auto-update combined string whenever fields change
  const updateCombinedAddress = (newFlat, newStreet, newLocality, newLandmark, newPin, newMaps) => {
    const parts = [
      newFlat.trim(),
      newStreet.trim(),
      newLocality.trim(),
      newLandmark.trim() ? `Landmark: ${newLandmark.trim()}` : '',
      newPin.trim() ? `Bangalore - ${newPin.trim()}` : 'Bangalore',
      newMaps.trim() ? `[Map: ${newMaps.trim()}]` : '',
    ].filter(Boolean)
    const combined = parts.join(', ')
    onChange(combined)
    try {
      localStorage.setItem('rent_saved_delivery_address', combined)
    } catch {
      // ignore
    }
  }

  const handleFieldChange = (field, val) => {
    let f = flat
    let s = street
    let loc = locality
    let lm = landmark
    let pin = pincode
    let m = mapsUrl

    if (field === 'flat') { setFlat(val); f = val }
    if (field === 'street') { setStreet(val); s = val }
    if (field === 'locality') { setLocality(val); loc = val }
    if (field === 'landmark') { setLandmark(val); lm = val }
    if (field === 'pincode') { setPincode(val); pin = val }
    if (field === 'mapsUrl') { setMapsUrl(val); m = val }

    updateCombinedAddress(f, s, loc, lm, pin, m)
  }

  const toggleLocalityChip = (locName) => {
    const nextLoc = locality === locName ? '' : locName
    setLocality(nextLoc)
    updateCombinedAddress(flat, street, nextLoc, landmark, pincode, mapsUrl)
  }

  const useSavedAddress = (savedString) => {
    onChange(savedString)
  }

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setGpsStatus('Locating...')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`
        setMapsUrl(url)
        updateCombinedAddress(flat, street, locality, landmark, pincode, url)
        setGpsStatus('📍 GPS Location Attached!')
        setLocating(false)
      },
      (error) => {
        console.error(error)
        setGpsStatus('Location access denied. Paste a Google Maps link below.')
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-3 mt-2">
      {/* Saved address banner if available */}
      {savedAddr && value !== savedAddr && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs">
          <div className="flex items-center gap-2 truncate text-cyan-300">
            <Home size={14} className="flex-shrink-0" />
            <span className="truncate font-medium">{savedAddr}</span>
          </div>
          <button
            type="button"
            onClick={() => useSavedAddress(savedAddr)}
            className="flex-shrink-0 px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-[11px] font-bold tracking-wide transition-all"
          >
            Use Saved
          </button>
        </div>
      )}

      {/* Structured address fields */}
      <div className="space-y-2.5">
        <div>
          <label className="text-[11px] font-semibold tracking-wider text-white/50 uppercase block mb-1">
            House / Flat No. & Building
          </label>
          <input
            type="text"
            className="input-dark text-xs py-2"
            placeholder="e.g. Flat 402, Sunshine Apartments"
            value={flat}
            onChange={(e) => handleFieldChange('flat', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold tracking-wider text-white/50 uppercase block mb-1">
              Street / Area / Road
            </label>
            <input
              type="text"
              className="input-dark text-xs py-2"
              placeholder="e.g. 10th Main, 4th Block"
              value={street}
              onChange={(e) => handleFieldChange('street', e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold tracking-wider text-white/50 uppercase block mb-1">
              Locality (Optional)
            </label>
            <select
              className="select-dark text-xs py-2"
              value={locality}
              onChange={(e) => handleFieldChange('locality', e.target.value)}
            >
              <option value="">-- Select Locality (Optional) --</option>
              {BANGALORE_LOCALITIES.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Locality Chips */}
        <div>
          <span className="text-[10px] text-white/40 block mb-1">Select Locality (Optional):</span>
          <div className="flex flex-wrap gap-1">
            {BANGALORE_LOCALITIES.slice(0, 6).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => toggleLocalityChip(loc)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
              Google Maps Link / Pin URL (Optional)
            </label>
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={locating}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Navigation size={12} className={locating ? 'animate-spin' : ''} />
              <span>{locating ? 'Detecting...' : '📍 Use GPS Location'}</span>
            </button>
          </div>
          {gpsStatus && (
            <div className={`text-[10px] mb-1.5 ${gpsStatus.includes('Attached') ? 'text-green-400' : gpsStatus.includes('Locating') ? 'text-cyan-400' : 'text-red-400'}`}>
              {gpsStatus}
            </div>
          )}
          <div className="relative">
            <input
              type="url"
              className="input-dark text-xs py-2 pr-8"
              placeholder="e.g. https://maps.app.goo.gl/xyz..."
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
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold tracking-wider text-white/50 uppercase block mb-1">
              Landmark (Optional)
            </label>
            <input
              type="text"
              className="input-dark text-xs py-2"
              placeholder="e.g. Near Sony Signal"
              value={landmark}
              onChange={(e) => handleFieldChange('landmark', e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold tracking-wider text-white/50 uppercase block mb-1">
              Pincode (Optional)
            </label>
            <input
              type="text"
              maxLength={6}
              className="input-dark text-xs py-2"
              placeholder="e.g. 560034"
              value={pincode}
              onChange={(e) => handleFieldChange('pincode', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Address Preview Summary */}
      {value && (
        <div className="p-2 rounded bg-black/40 border border-white/10 text-xs">
          <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-0.5 font-bold flex items-center justify-between">
            <span>📍 Delivery Address Preview:</span>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline text-[10px] flex items-center gap-1 font-sans"
              >
                <span>Maps Link</span>
                <ExternalLink size={10} />
              </a>
            )}
          </span>
          <p className="text-white/80 font-mono text-[11px] leading-relaxed break-words">{value}</p>
        </div>
      )}
    </div>
  )
}
