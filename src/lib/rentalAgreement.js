/**
 * generateAgreementPDF — generates a rental agreement PDF using jsPDF.
 * Dynamically imports jsPDF so it only loads when needed.
 *
 * Usage:
 *   const { generateAgreementPDF } = await import('./rentalAgreement')
 *   await generateAgreementPDF(booking, listing, renterName, listerName)
 */
export async function generateAgreementPDF(booking, listing, renterName, listerName) {
  let jsPDF
  try {
    const mod = await import('jspdf')
    jsPDF = mod.jsPDF
  } catch {
    // jspdf not installed — show instructions in console
    console.error('jspdf not installed. Run: npm install jspdf')
    throw new Error('PDF library not installed. Run: npm install jspdf')
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W   = 210
  const accent = [255, 46, 109]
  const dark   = [10, 10, 20]
  const grey   = [140, 140, 160]
  const white  = [220, 220, 240]

  // ── Background
  doc.setFillColor(...dark)
  doc.rect(0, 0, W, 297, 'F')

  // ── Header bar
  doc.setFillColor(...accent)
  doc.rect(0, 0, W, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('localDen', 14, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Rental Agreement', 14, 21)

  const agreementNo = `LD-${(booking.id || '').slice(0, 8).toUpperCase()}`
  doc.setFontSize(8)
  doc.setTextColor(...grey)
  doc.text(`Agreement: ${agreementNo}`, W - 14, 14, { align: 'right' })
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, W - 14, 21, { align: 'right' })

  let y = 40

  const section = (title) => {
    if (y > 260) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, 'F'); y = 20 }
    doc.setFillColor(25, 25, 45)
    doc.rect(10, y, W - 20, 9, 'F')
    doc.setTextColor(...accent)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, y + 6)
    y += 14
  }

  const row = (label, value) => {
    if (y > 270) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, 'F'); y = 20 }
    doc.setTextColor(...grey)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(label, 14, y)
    doc.setTextColor(...white)
    doc.text(String(value || '—'), 80, y)
    y += 6
  }

  // ── Sections
  section('PARTIES')
  row('Renter (Borrower):', renterName || '—')
  row('Lister (Owner):',   listerName  || '—')
  y += 2

  section('ITEM DETAILS')
  row('Item:',      listing?.title)
  row('Category:',  listing?.category)
  row('Condition:', listing?.condition)
  if (listing?.brand) row('Brand:', listing.brand)
  if (listing?.model) row('Model:', listing.model)
  y += 2

  section('RENTAL PERIOD')
  row('Start Date:', booking.start_date)
  row('End Date:',   booking.end_date)
  row('Duration:',   `${booking.total_days} day${booking.total_days > 1 ? 's' : ''}`)
  y += 2

  section('PRICING BREAKDOWN')
  row('Rate per Day:',       `Rs. ${booking.price_per_day}`)
  row('Subtotal:',           `Rs. ${booking.subtotal}`)
  row('Platform Fee (20%):', `Rs. ${booking.platform_fee}`)
  row('Security Deposit:',   `Rs. ${booking.deposit}`)
  if (booking.insurance_opted) row('Damage Protection:', `Rs. ${booking.insurance_amount}`)
  y += 2
  doc.setTextColor(...accent)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL PAID:', 14, y)
  doc.text(`Rs. ${booking.total_amount}`, 80, y)
  y += 10

  section('PAYMENT DETAILS')
  row('Method:',         'Razorpay (UPI / Card / Netbanking)')
  row('Status:',         (booking.payment_status || 'paid').toUpperCase())
  row('Payment ID:',     booking.razorpay_payment_id || '—')
  row('Booking Status:', (booking.status || '').toUpperCase())
  y += 2

  section('TERMS & CONDITIONS')
  const terms = [
    '1. The renter agrees to use the rented item with care and return it in the same condition.',
    '2. Any damage beyond normal wear will be deducted from the security deposit.',
    '3. Security deposit is refunded within 48 hours of confirmed return.',
    '4. Late returns are charged at the daily rate per additional day.',
    '5. The lister must ensure the item is functional at the time of handover.',
    '6. LOCAL DEN acts as a facilitator and is not liable for disputes between parties.',
    '7. Disputes must be raised within 24 hours of rental end via the Dispute Center.',
  ]
  doc.setTextColor(...grey)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  terms.forEach(t => {
    if (y > 270) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, 'F'); y = 20 }
    doc.text(t, 14, y, { maxWidth: W - 28 })
    y += 5.5
  })
  y += 2

  // ── Digital E-Signatures
  section('DIGITAL E-SIGNATURES')
  const renterSig = booking.renter_signature || (booking.signerRole === 'renter' ? booking.signatureUrl : null)
  const listerSig = booking.lister_signature || (booking.signerRole === 'lister' ? booking.signatureUrl : null)

  if (renterSig) {
    try {
      doc.addImage(renterSig, 'PNG', 14, y, 45, 18)
    } catch {
      doc.text('[Digital Signature Captured]', 14, y + 10)
    }
  } else {
    doc.setTextColor(...grey)
    doc.setFontSize(8)
    doc.text('[ Renter Signature Pending ]', 14, y + 10)
  }

  if (listerSig) {
    try {
      doc.addImage(listerSig, 'PNG', 110, y, 45, 18)
    } catch {
      doc.text('[Digital Signature Captured]', 110, y + 10)
    }
  } else {
    doc.setTextColor(...grey)
    doc.setFontSize(8)
    doc.text('[ Lister Signature Pending ]', 110, y + 10)
  }

  y += 22
  doc.setFontSize(7)
  doc.setTextColor(...grey)
  doc.text(`Renter: ${renterName || 'Renter'}`, 14, y)
  doc.text(`Lister: ${listerName || 'Lister'}`, 110, y)
  if (booking.signedAt) {
    doc.text(`Signed At: ${new Date(booking.signedAt).toLocaleString('en-IN')}`, 14, y + 4)
  }

  // ── Footer
  doc.setTextColor(60, 60, 80)
  doc.setFontSize(7)
  doc.text('Generated by LOCAL DEN · Bangalore, Karnataka · Legally Binding Rental Contract.', W / 2, 290, { align: 'center' })

  doc.save(`lokalden-agreement-${agreementNo}.pdf`)
}
