/**
 * gamification.js — User Trust Score & Achievement Badges calculator
 */

export function calculateUserTrustScore(profile, listings = [], bookings = []) {
  let score = 50 // Base starting score

  if (profile?.kyc_status === 'verified') score += 25
  if (profile?.is_lister) score += 10
  if (profile?.rating >= 4.8) score += 15

  const totalReviews = Number(profile?.total_reviews) || 0
  if (totalReviews >= 10) score += 10
  else if (totalReviews >= 3) score += 5

  return Math.min(100, score)
}

export function getUserBadges(profile, listing = null) {
  const badges = []

  if (profile?.kyc_status === 'verified') {
    badges.push({
      id: 'kyc_verified',
      label: '🔒 Verified Rig Owner',
      desc: '100% Govt ID & Selfie Verified Host',
      tone: 'emerald',
    })
  }

  if (profile?.rating >= 4.8 && (profile?.total_reviews || 0) >= 3) {
    badges.push({
      id: 'super_host',
      label: '🌟 Super Host',
      desc: 'Top-rated hardware host with 4.8+ rating',
      tone: 'amber',
    })
  }

  const gpu = (listing?.gpu || listing?.title || '').toLowerCase()
  if (gpu.includes('4090') || gpu.includes('4080') || gpu.includes('4070') || gpu.includes('7900')) {
    badges.push({
      id: 'beast_gpu',
      label: '🎮 Pro Gaming Beast',
      desc: 'Ultra High-Performance RTX 40-Series / RX 7000 GPU',
      tone: 'pink',
    })
  }

  if (listing && (listing.brand || listing.specs?.ram >= 32)) {
    badges.push({
      id: 'workstation_certified',
      label: '⚡ AI & Workstation Certified',
      desc: 'High RAM & compute capacity for AI / 3D Rendering',
      tone: 'cyan',
    })
  }

  return badges
}
