/**
 * generateAgreementPDF — generates a friendly, playful rental agreement PDF using jsPDF.
 * Dynamically imports jsPDF so it only loads when needed.
 *
 * Usage:
 *   const { generateAgreementPDF } = await import('./rentalAgreement')
 *   await generateAgreementPDF(booking, listing, renterName, listerName, { renterPhone, listerPhone })
 *
 * NOTE: jsPDF's built-in Helvetica only supports Latin text, so we stick to plain
 * characters (no emoji, no rupee sign) and draw the fun bits as shapes.
 */

import { getPaymentMethodLabel } from './payments'
import { supabase } from './supabase'
import { toPublicStorageUrl } from './storageUrl'
import { parseDeliveryAddress } from './deliveryAddress'

function paymentLabel(booking) {
  if (booking.razorpay_payment_id) return getPaymentMethodLabel('razorpay')
  return getPaymentMethodLabel(booking.payment_method)
}

async function resolveSignatureDataUrl(sig) {
  if (!sig || typeof sig !== 'string') return null
  if (sig.startsWith('data:image')) return sig
  try {
    const res = await fetch(sig)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`
}

function niceDate(value) {
  if (!value) return '-'
  const d = new Date(String(value).length <= 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function cap(text) {
  const s = String(text || '')
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '-'
}

export async function generateAgreementPDF(booking, listing, renterName, listerName, extras = {}) {
  let jsPDF
  try {
    const mod = await import('jspdf')
    jsPDF = mod.jsPDF
  } catch {
    console.error('jspdf not installed. Run: npm install jspdf')
    throw new Error('PDF library not installed. Run: npm install jspdf')
  }

  const renter = (renterName || 'The Renter').trim()
  const lister = (listerName || 'The Owner').trim()
  const itemName = listing?.title || 'the awesome gear'

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const M = 14 // side margin
  const CW = W - M * 2 // content width

  const C = {
    bg: [255, 250, 240],
    card: [255, 255, 255],
    ink: [30, 27, 46],
    muted: [110, 104, 130],
    pink: [255, 46, 109],
    pinkSoft: [255, 120, 160],
    cyan: [0, 168, 204],
    gold: [255, 176, 0],
    purple: [124, 58, 237],
    green: [16, 160, 96],
    line: [235, 226, 210],
  }

  const paintPage = () => {
    doc.setFillColor(...C.bg)
    doc.rect(0, 0, W, H, 'F')
    // playful corner confetti
    doc.setFillColor(...C.gold)
    doc.circle(W - 8, H - 10, 3, 'F')
    doc.setFillColor(...C.cyan)
    doc.circle(W - 17, H - 6, 1.8, 'F')
    doc.setFillColor(...C.pink)
    doc.circle(8, H - 8, 2.4, 'F')
    doc.setFillColor(...C.purple)
    doc.circle(16, H - 12, 1.4, 'F')
  }

  let y = 0
  const newPage = () => {
    doc.addPage()
    paintPage()
    y = 18
  }
  const ensure = (h) => { if (y + h > H - 22) newPage() }

  // ───────────────────────── Header
  paintPage()
  doc.setFillColor(...C.pink)
  doc.rect(0, 0, W, 44, 'F')
  doc.setFillColor(...C.pinkSoft)
  doc.circle(W - 14, 6, 16, 'F')
  doc.circle(W - 70, 4, 7, 'F')
  doc.setFillColor(...C.gold)
  doc.circle(W - 30, 12, 3.2, 'F')
  doc.setFillColor(...C.cyan)
  doc.circle(W - 52, 22, 2.2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text('LocalDen', M, 18)
  doc.setFontSize(13)
  doc.text('The Friendly Rental Pact', M, 27)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Borrow it. Love it. Return it. Repeat.', M, 34)

  const agreementNo = `LD-${String(booking.id || '').slice(0, 8).toUpperCase() || 'DRAFT'}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Pact #${agreementNo}`, W - M, 38, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(`Drawn up on ${niceDate(new Date().toISOString())}`, W - M, 42.5, { align: 'right' })

  y = 54

  // ───────────────────────── Intro
  doc.setTextColor(...C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  const intro = doc.splitTextToSize(
    `Hey ${renter} & ${lister}! Here is the deal for the ${itemName}.`,
    CW,
  )
  doc.text(intro, M, y)
  y += intro.length * 5.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  const sub = doc.splitTextToSize(
    'No scary legal jargon here. Just a clear, friendly promise between two real people. Read it, sign it, and enjoy the gear.',
    CW,
  )
  doc.text(sub, M, y)
  y += sub.length * 4.5 + 6

  // ───────────────────────── Building blocks
  const section = (num, title, color) => {
    ensure(46)
    doc.setFillColor(...color)
    doc.roundedRect(M, y, CW, 9, 4.5, 4.5, 'F')
    doc.setFillColor(255, 255, 255)
    doc.circle(M + 5.5, y + 4.5, 3.2, 'F')
    doc.setTextColor(...color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(String(num), M + 5.5, y + 5.6, { align: 'center' })
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.text(title.toUpperCase(), M + 12, y + 6.1)
    y += 14
  }

  const LABEL_X = M + 4
  const VALUE_X = M + 58
  const VALUE_W = CW - 62

  const row = (label, value, opts = {}) => {
    const text = String(value ?? '').trim() || '-'
    const lines = doc.splitTextToSize(text, VALUE_W)
    ensure(lines.length * 4.6 + 2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text(label, LABEL_X, y)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.big ? 11 : 9)
    doc.setTextColor(...(opts.color || C.ink))
    doc.text(lines, VALUE_X, y)
    y += lines.length * 4.6 + 1.6
  }

  const divider = () => {
    doc.setDrawColor(...C.line)
    doc.setLineWidth(0.3)
    doc.line(LABEL_X, y - 1, W - M - 4, y - 1)
    y += 2.5
  }

  const stamp = (text, color, cx, cy) => {
    doc.setDrawColor(...color)
    doc.setTextColor(...color)
    doc.setLineWidth(0.9)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    const w = doc.getTextWidth(text) + 8
    doc.roundedRect(cx - w / 2, cy - 6, w, 11, 2, 2, 'S')
    doc.text(text, cx, cy + 1.6, { align: 'center' })
  }

  // ───────────────────────── 1. Parties
  section(1, "Who's playing", C.pink)
  row('The Borrower (Renter)', renter, { bold: true })
  if (extras.renterPhone) row('Borrower phone', extras.renterPhone)
  row('The Owner (Lister)', lister, { bold: true })
  if (extras.listerPhone) row('Owner phone', extras.listerPhone)
  y += 3

  // ───────────────────────── 2. The gear
  section(2, 'The gear', C.cyan)
  row('Item', itemName, { bold: true })
  if (listing?.category) row('Category', cap(listing.category))
  if (listing?.condition) row('Condition', cap(listing.condition))
  if (listing?.brand) row('Brand', listing.brand)
  if (listing?.model) row('Model', listing.model)
  if (listing?.location) row('Location', listing.location)
  y += 3

  // ───────────────────────── 3. Time window
  const days = Number(booking.total_days || 1)
  section(3, 'The time window', C.purple)
  row('Pick-up / Start', niceDate(booking.start_date), { bold: true })
  row('Return / End', niceDate(booking.end_date), { bold: true })
  row('Duration', `${days} day${days > 1 ? 's' : ''}`)
  const parsedDelivery = parseDeliveryAddress(booking.delivery_address)
  row(
    'Handover',
    booking.delivery_type === 'delivery'
      ? `Home delivery${parsedDelivery.cleanAddress ? ` to ${parsedDelivery.cleanAddress}` : ''}${parsedDelivery.coordsLabel ? ` [GPS: ${parsedDelivery.coordsLabel}]` : ''}`
      : 'Pick-up from the Owner',
  )
  y += 3

  // ───────────────────────── 4. Money
  section(4, 'The money talk', C.gold)
  const subtotal = Number(booking.subtotal ?? Number(booking.price_per_day || 0) * days)
  const fee = Number(booking.platform_fee || 0)
  const feePct = subtotal > 0 && fee > 0 ? ` (${Math.round((fee / subtotal) * 100)}%)` : ''
  row('Rate per day', money(booking.price_per_day))
  row(`Rent for ${days} day${days > 1 ? 's' : ''}`, money(subtotal))
  row(`LocalDen service fee${feePct}`, money(fee))
  if (booking.insurance_opted) row('Damage protection', money(booking.insurance_amount))
  if (Number(booking.discount_amount) > 0) {
    row(`Discount${booking.coupon_code ? ` (${booking.coupon_code})` : ''}`, `- ${money(booking.discount_amount)}`, { color: C.green })
  }
  row('Refundable security deposit', money(booking.deposit))
  divider()
  ensure(16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C.ink)
  doc.text('GRAND TOTAL', LABEL_X, y + 3)
  doc.setTextColor(...C.pink)
  doc.setFontSize(15)
  doc.text(money(booking.total_amount), VALUE_X, y + 3.5)
  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text('Deposit is included in the total and comes back to the Borrower after a clean return.', LABEL_X, y - 3)
  y += 4

  // ───────────────────────── 5. Payment
  section(5, 'How it gets paid', C.green)
  const isPaid = String(booking.payment_status || '').toLowerCase() === 'paid'
  const isCash = String(booking.payment_method || '').toLowerCase() === 'cash'
  const payRef = booking.payment_ref || booking.razorpay_payment_id
  ensure(16)
  const statusY = y
  row('Payment method', paymentLabel(booking), { bold: true })
  row('Payment status', isPaid ? 'Paid - thank you!' : isCash ? 'To be paid in cash on pickup' : 'Waiting for confirmation', { color: isPaid ? C.green : C.gold, bold: true })
  if (payRef) row('Reference / UTR', payRef)
  row('Booking status', cap(booking.status || 'pending'))
  if (isPaid) stamp('PAID', C.green, W - M - 24, statusY + 6)
  else stamp(isCash ? 'PAY ON PICKUP' : 'PENDING', C.gold, W - M - 28, statusY + 6)
  y += 3

  // ───────────────────────── 6. Rules
  section(6, 'The rules of the game', C.pink)
  const rules = [
    ['Treat it like your own', `${renter} promises to use the gear with care and return it in the same condition it arrived.`],
    ['Oops happens', 'Normal wear and tear is totally fine. Real damage or loss gets deducted from the security deposit.'],
    ['The deposit comes home', `Your ${money(booking.deposit)} deposit is refunded within 48 hours of a confirmed, happy return.`],
    ['Be on time', `Late returns are charged at the daily rate (${money(booking.price_per_day)}) for each extra day.`],
    ["The Owner's promise", `${lister} promises the gear works and matches the listing at handover.`],
    ['Photos are proof', 'Take check-in and check-out photos in the app. They settle any "it was like that before" debates.'],
    ['Got a beef?', 'Raise a dispute within 24 hours of the rental ending, using the Dispute Center in the app.'],
    ["We're just the matchmaker", 'LocalDen connects Borrowers and Owners and is not liable for disputes between them. Be kind to each other!'],
  ]
  rules.forEach(([title, body], i) => {
    const lines = doc.splitTextToSize(body, CW - 18)
    ensure(lines.length * 4.2 + 9)
    doc.setFillColor(...(i % 2 ? C.cyan : C.pink))
    doc.circle(M + 6, y + 1.2, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(String(i + 1), M + 6, y + 2.3, { align: 'center' })
    doc.setTextColor(...C.ink)
    doc.setFontSize(9.5)
    doc.text(title, M + 13, y + 2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text(lines, M + 13, y + 7)
    y += lines.length * 4.2 + 8
  })
  y += 2

  // ───────────────────────── 7. Signatures
  section(7, 'Shake on it (digital signatures)', C.purple)
  const renterSigRaw = booking.renter_signature || (booking.signerRole === 'renter' ? booking.signatureUrl : null)
  const listerSigRaw = booking.lister_signature || (booking.signerRole === 'lister' ? booking.signatureUrl : null)
  const renterSig = await resolveSignatureDataUrl(renterSigRaw)
  const listerSig = await resolveSignatureDataUrl(listerSigRaw)
  const renterSignedAt = booking.renter_signed_at || (booking.signerRole === 'renter' ? booking.signedAt : null)
  const listerSignedAt = booking.lister_signed_at || (booking.signerRole === 'lister' ? booking.signedAt : null)
  ensure(46)

  const sigBox = (x, title, name, sig, signedDate) => {
    const w = (CW - 8) / 2
    doc.setFillColor(...C.card)
    doc.setDrawColor(...C.line)
    doc.setLineWidth(0.4)
    doc.roundedRect(x, y, w, 34, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text(title.toUpperCase(), x + 4, y + 6)
    if (sig) {
      try {
        doc.addImage(sig, 'PNG', x + 4, y + 8, 45, 14)
      } catch {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(10)
        doc.setTextColor(...C.green)
        doc.text('Digitally signed ✓', x + 4, y + 17)
      }
    } else {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(190, 184, 205)
      doc.text('Waiting for signature…', x + 4, y + 17)
    }
    doc.setDrawColor(...C.muted)
    doc.setLineWidth(0.3)
    doc.line(x + 4, y + 23, x + w - 4, y + 23)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.ink)
    doc.text(name, x + 4, y + 27.5, { maxWidth: w - 8 })
    if (signedDate) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.8)
      doc.setTextColor(...C.muted)
      doc.text(`Signed: ${new Date(signedDate).toLocaleDateString('en-IN')}`, x + 4, y + 31.5)
    }
  }

  const boxW = (CW - 8) / 2
  sigBox(M, 'Borrower', renter, renterSig, renterSignedAt)
  sigBox(M + boxW + 8, 'Owner', lister, listerSig, listerSignedAt)
  y += 38

  // ───────────────────────── Footer on every page
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text('Made with love by LocalDen - Bangalore, Karnataka. Be nice. Return stuff. Be awesome.', W / 2, H - 9, { align: 'center' })
    doc.text(`Page ${p} of ${pages}`, W / 2, H - 5, { align: 'center' })
  }

  const filename = `localden-pact-${agreementNo}.pdf`
  if (extras.download !== false) {
    doc.save(filename)
  }
  const blob = doc.output('blob')
  return { doc, blob, filename }
}

export async function uploadSignedAgreementPDF(booking, listing, renterName, listerName, extras = {}) {
  try {
    const { blob } = await generateAgreementPDF(booking, listing, renterName, listerName, {
      ...extras,
      download: false,
    })
    const path = `agreements/pact-${booking.id}.pdf`
    const { error } = await supabase.storage.from('listing-photos').upload(path, blob, {
      upsert: true,
      contentType: 'application/pdf',
    })
    if (error) {
      console.warn('Could not upload agreement PDF to storage:', error.message)
      return null
    }
    const { data: pubData } = supabase.storage.from('listing-photos').getPublicUrl(path)
    const agreementUrl = toPublicStorageUrl(pubData?.publicUrl)
    if (agreementUrl) {
      await supabase
        .from('bookings')
        .update({ agreement_url: agreementUrl, updated_at: new Date().toISOString() })
        .eq('id', booking.id)
    }
    return agreementUrl
  } catch (err) {
    console.warn('Upload signed agreement error:', err?.message)
    return null
  }
}
