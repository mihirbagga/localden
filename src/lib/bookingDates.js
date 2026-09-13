export function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function shiftIso(iso, days) {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function listingUnits(listing) {
  const total = Number(listing?.stock_total)
  if (Number.isFinite(total) && total > 0) return total
  const qty = Number(listing?.stock_qty)
  if (Number.isFinite(qty) && qty > 0) return qty
  return 1
}

export function eachDayIso(start, end) {
  if (!start || !end || end <= start) return []
  const days = []
  let cursor = start
  while (cursor < end) {
    days.push(cursor)
    cursor = shiftIso(cursor, 1)
  }
  return days
}

export function expandBusyDates(bookings, units = 1, from, to) {
  const cap = Math.max(1, Number(units) || 1)
  const counts = new Map()
  for (const booking of bookings || []) {
    const start = booking.start_date
    const finish = booking.end_date
    if (!start || !finish) continue
    for (const day of eachDayIso(start, finish)) {
      if (from && day < from) continue
      if (to && day > to) continue
      counts.set(day, (counts.get(day) || 0) + 1)
    }
  }
  return new Set([...counts.entries()].filter(([, count]) => count >= cap).map(([day]) => day))
}

export function rangeHasBusy(start, end, busy) {
  if (!start || !end || !busy?.size) return false
  return eachDayIso(start, end).some((day) => busy.has(day))
}

export function formatDayLabel(iso) {
  if (!iso) return ''
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}
