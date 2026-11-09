import { supabase } from './supabase'
import SONY_FREE_GAMES from '../data/sonyFreeGames.json'
import SCRAPED_GAMING_DEALS from '../data/gamingDeals.json'

/**
 * Game Discs inventory - dynamically fetched from Supabase listings.
 * Zero hardcoded mock items.
 */
export const CURATED_GAMES_MARKET = []

/**
 * Fetch all game listings (from Supabase P2P listings + Hub inventory).
 */
export async function fetchAllMarketGames() {
  try {
    const { data: dbListings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_published', true)
      .eq('category', 'gaming')

    if (error) {
      console.warn('fetchAllMarketGames Supabase error:', error.message)
      return []
    }

    // Hardware keywords that belong in Browse Gear, NOT in Game Discs Vault
    const HARDWARE_KEYWORDS = [
      'console', 'controller', 'dualsense', 'gamepad', 'vr', 'headset',
      'racing wheel', 'wheel', 'pedal', 'gaming chair', 'chair', 'monitor',
      'keyboard', 'mouse', 'charging station', 'dock', 'cable', 'adapter',
      'stand', 'camera', 'flight stick', 'joystick'
    ]

    const dbGames = (dbListings || [])
      .filter((l) => {
        const sub = (l.subcategory || '').toLowerCase().trim()
        const title = (l.title || '').toLowerCase().trim()

        // 1. Exclude any listing categorized as hardware
        if (HARDWARE_KEYWORDS.some((kw) => sub === kw || sub.includes(kw))) {
          return false
        }

        // 2. Exclude hardware titles unless explicitly a game disc
        const isHardwareTitle = HARDWARE_KEYWORDS.some((kw) => title.includes(kw))
        const hasDiscMarker = title.includes('disc') || title.includes('cd') || title.includes('cartridge')

        if (isHardwareTitle && !hasDiscMarker) {
          return false
        }

        // 3. Must be Game Disc subcategory, or clearly a disc/game title
        return sub === 'game disc' || sub.includes('disc') || hasDiscMarker
      })
      .map((l) => {
        const photos = Array.isArray(l.photos) ? l.photos : []
        const cover = photos[0] || '/hero/ps5.png'
        const saleMatch = (l.description || '').match(/\[SALE_PRICE:\s*(\d+)\]/i)
        const buyPrice = Number(l.sale_price) || (saleMatch ? Number(saleMatch[1]) : (Number(l.price_day) * 30 || 2499))

        return {
          id: l.id,
          title: l.title,
          platform: l.brand && ['PS5', 'PS4', 'Xbox', 'PC'].includes(l.brand) ? l.brand : 'PS5',
          publisher: l.brand || 'Verified Lister',
          genre: l.subcategory === 'Game Disc' ? 'Action' : l.subcategory || 'Gaming',
          cover,
          rentPriceDay: Number(l.price_day) || 79,
          buyPrice,
          condition: l.condition || 'good',
          deposit: Number(l.deposit_amount) || 1000,
          isAvailableForRent: l.is_available !== false,
          isAvailableForBuy: true,
          rating: Number(l.rating) || 5.0,
          reviewsCount: Number(l.total_reviews) || 1,
          hubLocation: l.location || 'LocalDen Hub',
          stockQty: Number(l.stock_qty) || 1,
          badge: l.is_verified ? 'Verified Disc' : 'User Listed',
          description: l.description,
          isUserListing: true,
          user_id: l.user_id,
        }
      })

    return dbGames
  } catch (err) {
    console.warn('fetchAllMarketGames error:', err?.message)
    return []
  }
}

/**
 * Return official Sony Free to Play games directory
 */
export function getSonyFreeGames() {
  return SONY_FREE_GAMES
}

/**
 * Fetch live gaming deals (Sony PS Store, Steam, Xbox, Epic Games, Black Friday)
 */
export async function fetchGamingDeals() {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'gaming_deals')
      .maybeSingle()

    const customDeals = Array.isArray(data?.value) ? data.value : []
    const customIds = new Set(customDeals.map((d) => d.id))
    const merged = [...customDeals, ...SCRAPED_GAMING_DEALS.filter((d) => !customIds.has(d.id))]
    return merged
  } catch (err) {
    console.warn('fetchGamingDeals error:', err?.message)
    return SCRAPED_GAMING_DEALS
  }
}

/**
 * User / Admin Add Game Listing directly to LocalDen
 */
export async function createGameListing(gameData, user, isAdmin = false) {
  if (!user?.id) throw new Error('You must be signed in to add a game.')

  const listingId = crypto.randomUUID()
  const title = (gameData.title || '').trim()
  const platform = gameData.platform || 'PS5'
  const rentPrice = parseInt(gameData.rentPriceDay, 10) || 79
  const buyPrice = parseInt(gameData.buyPrice, 10) || null
  const deposit = parseInt(gameData.deposit, 10) || 1000

  let desc = (gameData.description || `Original ${platform} game disc in ${gameData.condition || 'good'} condition.`).trim()
  if (buyPrice) {
    desc += `\n\n[SALE_PRICE: ${buyPrice}]`
  }

  const payload = {
    id: listingId,
    user_id: user.id,
    title: `${title} (${platform} Disc)`,
    description: desc,
    category: 'gaming',
    subcategory: 'Game Disc',
    condition: gameData.condition || 'good',
    brand: platform,
    model: `${platform} Disc Edition`,
    price_day: rentPrice,
    price_weekend: Math.round(rentPrice * 2 * 0.9),
    price_week: Math.round(rentPrice * 7 * 0.85),
    deposit_amount: deposit,
    location: gameData.location || 'Koramangala, Bengaluru',
    emoji: '💿',
    photos: gameData.cover ? [gameData.cover] : ['/hero/ps5.png'],
    is_available: true,
    is_published: true,
    is_verified: isAdmin,
    is_featured: isAdmin,
    fulfillment_type: isAdmin && gameData.fulfillmentType ? gameData.fulfillmentType : 'direct',
    stock_qty: parseInt(gameData.stockQty, 10) || 1,
    stock_total: parseInt(gameData.stockQty, 10) || 1,
  }

  const { data, error } = await supabase.from('listings').insert(payload).select().single()
  if (error) throw error
  return data
}

/**
 * Admin: Add or edit a major gaming deal (Sony, Steam, Xbox, Epic Games)
 */
export async function createGamingDeal(dealData) {
  const newDeal = {
    id: `deal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: dealData.title.trim(),
    store: dealData.store || 'PlayStation',
    platform: dealData.platform || 'PS5',
    saleName: dealData.saleName || 'Special Gaming Sale',
    originalPrice: parseInt(dealData.originalPrice, 10) || 3999,
    salePrice: parseInt(dealData.salePrice, 10) || 0,
    discountPercent: parseInt(dealData.discountPercent, 10) || Math.round((1 - (dealData.salePrice / dealData.originalPrice)) * 100),
    endsIn: dealData.endsIn || 'Limited Time Offer',
    cover: dealData.cover || '/hero/ps5.png',
    storeUrl: dealData.storeUrl || 'https://store.playstation.com',
    genre: dealData.genre || 'Action',
    isBlackFriday: Boolean(dealData.isBlackFriday),
    badge: dealData.badge || 'Sale Deal',
    localDenRentDay: dealData.localDenRentDay ? parseInt(dealData.localDenRentDay, 10) : null,
  }

  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'gaming_deals')
      .maybeSingle()

    const currentList = Array.isArray(data?.value) ? data.value : []
    const updated = [newDeal, ...currentList]

    await supabase.from('site_settings').upsert({
      id: 'gaming_deals',
      value: updated,
      updated_at: new Date().toISOString(),
    })

    return newDeal
  } catch (err) {
    console.warn('createGamingDeal error:', err?.message)
    return newDeal
  }
}

/**
 * Trade-In / Instant Selling Valuation Algorithm
 * Gives transparent cash payout and Den rental credit quote (+15% bonus).
 */
export function calculateGameValuation({
  title = '',
  platform = 'PS5',
  condition = 'mint', // 'mint' | 'good' | 'disc_only'
}) {
  const cleanTitle = title.trim().toLowerCase()
  let baseValue = 1800 // average pre-owned PS5 disc baseline

  // Demand multipliers
  if (cleanTitle.includes('gta 6') || cleanTitle.includes('gta vi')) {
    baseValue = 3800
  } else if (cleanTitle.includes('spider-man 2') || cleanTitle.includes('spiderman 2')) {
    baseValue = 2100
  } else if (cleanTitle.includes('fc 25') || cleanTitle.includes('fifa 25')) {
    baseValue = 2300
  } else if (cleanTitle.includes('tekken 8') || cleanTitle.includes('elden ring')) {
    baseValue = 1900
  } else if (cleanTitle.includes('god of war') || cleanTitle.includes('last of us')) {
    baseValue = 1700
  } else if (cleanTitle.includes('hogwarts') || cleanTitle.includes('gran turismo')) {
    baseValue = 1500
  } else if (cleanTitle.includes('cricket 24')) {
    baseValue = 1200
  }

  // Condition modifiers
  let conditionFactor = 1.0
  let conditionLabel = 'Mint with Original Case'
  if (condition === 'good') {
    conditionFactor = 0.85
    conditionLabel = 'Minor Shelf Wear, Play Tested'
  } else if (condition === 'disc_only') {
    conditionFactor = 0.65
    conditionLabel = 'Disc Only (No Case)'
  }

  // Platform modifier
  const platformFactor = platform === 'PS4' ? 0.7 : 1.0

  const estimatedCash = Math.round((baseValue * conditionFactor * platformFactor) / 50) * 50
  const denCreditBonus = Math.round(estimatedCash * 1.15) // +15% credit bonus for LocalDen wallet

  const recommendedRentPerDay = Math.max(49, Math.round((estimatedCash * 0.04) / 10) * 10)
  const recommendedSalePrice = Math.round((estimatedCash * 1.35) / 50) * 50

  return {
    title: title.trim() || 'PlayStation Game Disc',
    platform,
    condition,
    conditionLabel,
    cashPayout: estimatedCash,
    denCreditPayout: denCreditBonus,
    recommendedRentPerDay,
    recommendedSalePrice,
  }
}
