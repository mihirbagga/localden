/**
 * Formats a viral Instagram caption for a listing advertisement
 */
export function formatInstagramListingPost({ listing, couponCode = 'WELCOME10', discountPercent = 10 }) {
  const title = listing?.title || 'Gaming Gear'
  const emoji = listing?.emoji || '🎮'
  const category = (listing?.category || 'tech').toUpperCase()
  const priceDay = listing?.price_day ? `₹${Number(listing.price_day).toLocaleString('en-IN')}` : 'Best Price'
  const location = listing?.location || 'Bangalore & Gurugram'
  const isWeekend = Boolean(listing?.price_weekend)
  const isWeek = Boolean(listing?.price_week)
  const isBangalore = location.toLowerCase().includes('bengaluru') || location.toLowerCase().includes('bangalore')
  const isGurugram = location.toLowerCase().includes('gurugram') || location.toLowerCase().includes('gurgaon')
  const cityTag = isGurugram ? '#Gurugram #DLFCyberCity #GurgaonGamers' : '#Bangalore #BangaloreGamers #Koramangala #Indiranagar'

  return `🔥 NOW IN THE DEN: ${emoji} ${title.toUpperCase()}! 🚀
━━━━━━━━━━━━━━━━━━━━━
Why buy when you can rent the ultimate setup for your weekend battle or party scene?! ⚡

📦 Gear: ${title} [${category}]
💸 Rental Rate: Starting at ${priceDay}/day
${isWeekend ? `🎉 Weekend Pass: ₹${Number(listing.price_weekend).toLocaleString('en-IN')}\n` : ''}${isWeek ? `📅 7-Day Pass: ₹${Number(listing.price_week).toLocaleString('en-IN')}\n` : ''}📍 Hub / Area: ${location}

✨ WHAT’S INCLUDED WITH LOCAL DEN:
✅ 100% Sanitised & Verified Hardware
✅ Zero Security Deposit Drama
✅ Same-Day Doorstep Courier Delivery
✅ Dual Controllers / Complete Cable Kit Included

━━━━━━━━━━━━━━━━━━━━━
🏷️ SPECIAL DROP OFFER:
Use code "${couponCode}" at checkout for ${discountPercent}% OFF your first rental!
━━━━━━━━━━━━━━━━━━━━━

👇 How to book:
1. Tap the link in our bio 👉 @localden.online
2. Select your rental dates & tap "Book Now"
3. Gear arrives at your doorstep ready to play!

Save this post & share with your squad before weekend slots are gone! 🎮💥

${cityTag} #localDen #RentYourGear #PS5Rental #ConsoleGaming #GamingCommunity #IndieGamers #HousePartyIndia #RentInIndia #GameNight #ZeroDeposit`
}

/**
 * Formats an Instagram Story copy
 */
export function formatInstagramStoryCopy({ listing }) {
  const title = listing?.title || 'Gaming Gear'
  const priceDay = listing?.price_day ? `₹${Number(listing.price_day).toLocaleString('en-IN')}` : 'Best Rate'
  const location = listing?.location || 'Bengaluru / Gurugram'

  return `⚡ NEW GEAR DROP ⚡
${title}
Only ${priceDay}/day!
📍 ${location}

Doorstep Delivery in 3 Hours 🚀
Tap Link to Rent Now 🔗`
}

