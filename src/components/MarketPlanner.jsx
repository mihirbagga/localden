import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronDown, MapPin } from 'lucide-react'
import { shiftIso, todayIso } from '../lib/bookingDates'
import './MarketPlanner.css'

export const MARKET_AREAS = ['Bangalore', 'Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'BTM Layout']

function prettyDate(iso) {
  if (!iso) return ''
  const date = new Date(`${iso}T12:00:00`)
  const day = date.getDate()
  const suf = day % 10 === 1 && day !== 11 ? 'st'
    : day % 10 === 2 && day !== 12 ? 'nd'
      : day % 10 === 3 && day !== 13 ? 'rd' : 'th'
  return `${day}${suf} ${date.toLocaleDateString('en-IN', { month: 'short' })}`
}

export default function MarketPlanner() {
  const navigate = useNavigate()
  const [area, setArea] = useState('Bangalore')
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(shiftIso(todayIso(), 2))

  const goSearch = () => {
    const params = new URLSearchParams()
    if (area && area !== 'Bangalore') params.set('loc', area)
    navigate(`/browse?${params.toString()}`)
  }

  return (
    <div className="market-planner">
      <label className="market-pill">
        <MapPin size={14} />
        <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="City or area">
          {MARKET_AREAS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <ChevronDown size={14} />
      </label>
      <label className="market-pill">
        <CalendarDays size={14} />
        <span>Delivery Date: {prettyDate(startDate)}</span>
        <input
          type="date"
          value={startDate}
          min={todayIso()}
          onChange={(e) => {
            setStartDate(e.target.value)
            if (endDate <= e.target.value) setEndDate(shiftIso(e.target.value, 1))
          }}
          aria-label="Delivery date"
        />
      </label>
      <label className="market-pill">
        <CalendarDays size={14} />
        <span>Pickup Date: {prettyDate(endDate)}</span>
        <input
          type="date"
          value={endDate}
          min={startDate || todayIso()}
          onChange={(e) => setEndDate(e.target.value)}
          aria-label="Pickup date"
        />
      </label>
      <button type="button" className="market-edit" onClick={goSearch}>Edit</button>
    </div>
  )
}
