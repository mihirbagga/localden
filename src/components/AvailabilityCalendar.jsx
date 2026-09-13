import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { rangeHasBusy, todayIso } from '../lib/bookingDates'
import './AvailabilityCalendar.css'

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function isoFromParts(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function AvailabilityCalendar({
  busy,
  startDate,
  endDate,
  onPick,
  disabled = false,
}) {
  const today = todayIso()
  const now = new Date(`${today}T12:00:00`)
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const items = []
    for (let i = 0; i < startPad; i += 1) items.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push(isoFromParts(cursor.year, cursor.month, day))
    }
    return items
  }, [cursor])

  const canPrev = cursor.year > now.getFullYear() || cursor.month > now.getMonth()
  const clash = rangeHasBusy(startDate, endDate, busy)

  const clickDay = (iso) => {
    if (disabled || !iso || iso < today || busy.has(iso)) return
    if (!startDate || (startDate && endDate) || iso < startDate) {
      onPick(iso, '')
      return
    }
    if (iso === startDate) {
      onPick(iso, '')
      return
    }
    const nextEnd = iso
    if (rangeHasBusy(startDate, nextEnd, busy)) {
      onPick(iso, '')
      return
    }
    onPick(startDate, nextEnd)
  }

  return (
    <div className="avcal">
      <div className="avcal__head">
        <button
          type="button"
          className="avcal__nav"
          onClick={() => setCursor((c) => (
            c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }
          ))}
          disabled={!canPrev}
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <strong>{monthLabel(cursor.year, cursor.month)}</strong>
        <button
          type="button"
          className="avcal__nav"
          onClick={() => setCursor((c) => (
            c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }
          ))}
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="avcal__dow" aria-hidden="true">
        {DOW.map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className="avcal__grid" role="grid" aria-label="Availability calendar">
        {cells.map((iso, idx) => {
          if (!iso) return <span key={`e-${idx}`} className="avcal__day is-out" />
          const isBusy = busy.has(iso)
          const isPast = iso < today
          const isStart = iso === startDate
          const isEnd = endDate && iso === endDate
          const inRange = startDate && endDate && iso > startDate && iso < endDate
          const cls = [
            'avcal__day',
            isPast ? 'is-past' : '',
            isBusy ? 'is-busy' : '',
            iso === today ? 'is-today' : '',
            isStart || isEnd ? 'is-edge' : '',
            inRange ? 'is-range' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={iso}
              type="button"
              className={cls}
              disabled={disabled || isPast || isBusy}
              onClick={() => clickDay(iso)}
              aria-label={`${iso}${isBusy ? ' booked' : ''}${isStart ? ' start' : ''}${isEnd ? ' end' : ''}`}
            >
              {Number(iso.slice(8))}
            </button>
          )
        })}
      </div>

      <div className="avcal__legend">
        <span><i className="is-free" /> Free</span>
        <span><i className="is-taken" /> Booked</span>
        <span><i className="is-pick" /> Your dates</span>
      </div>
      {clash ? <p className="avcal__hint">Those dates overlap a booking. Pick another range.</p> : null}
    </div>
  )
}
