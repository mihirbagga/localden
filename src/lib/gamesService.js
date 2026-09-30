import { supabase } from './supabase'

export const POPULAR_PS5_GAMES = [
  { title: 'Grand Theft Auto V', format: 'Disc', genre: 'Open World' },
  { title: 'FIFA', format: 'Digital', genre: 'Sports' },
  { title: "Marvel's Spider-Man 2", format: 'Disc', genre: 'Action' },
  { title: 'God of War Ragnarök', format: 'Digital', genre: 'Action' },
  { title: 'Call of Duty: Modern Warfare III', format: 'Digital', genre: 'Shooter' },
  { title: 'The Last of Us Part I', format: 'Disc', genre: 'Story' },
  { title: 'Tekken 8', format: 'Digital', genre: 'Fighting' },
  { title: 'Gran Turismo 7', format: 'Digital', genre: 'Racing' },
  { title: 'Mortal Kombat 1', format: 'Disc', genre: 'Fighting' },
  { title: 'Hogwarts Legacy', format: 'Disc', genre: 'RPG' },
  { title: 'Cricket 24', format: 'Disc', genre: 'Sports' },
  { title: 'Cyberpunk 2077', format: 'Digital', genre: 'Sci-Fi RPG' },
]

export const DEFAULT_PS5_STARTER_GAMES = [
  { title: 'Grand Theft Auto V', format: 'Disc', genre: 'Open World' },
  { title: 'FIFA', format: 'Digital', genre: 'Sports' },
  { title: "Marvel's Spider-Man 2", format: 'Disc', genre: 'Action' },
  { title: 'God of War Ragnarök', format: 'Digital', genre: 'Action' },
]

export function isPs5Listing(listing) {
  if (!listing) return false
  const str = `${listing.title || ''} ${listing.model || ''} ${listing.subcategory || ''}`.toLowerCase()
  return str.includes('ps5') || str.includes('playstation 5') || str.includes('playstation')
}

export function parseGamesFromDescription(desc) {
  if (!desc) return []
  const match = desc.match(/\[GAMES:\s*(.*?)\]/i)
  if (!match || !match[1]) return []
  return match[1]
    .split('|')
    .map((g) => g.trim())
    .filter(Boolean)
    .map((title) => {
      let format = 'Digital'
      let cleanTitle = title
      if (title.toLowerCase().includes('(disc)')) {
        format = 'Disc'
        cleanTitle = title.replace(/\(disc\)/i, '').trim()
      } else if (title.toLowerCase().includes('(digital)')) {
        format = 'Digital'
        cleanTitle = title.replace(/\(digital\)/i, '').trim()
      }
      return { title: cleanTitle, format, genre: 'Action' }
    })
}

export async function fetchListingGames(listingId, listing = null) {
  if (!listingId) return []

  try {
    // 1. Check site_settings for listing_games
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'listing_games')
      .maybeSingle()

    if (data?.value && typeof data.value === 'object' && Array.isArray(data.value[listingId])) {
      return data.value[listingId]
    }
  } catch (err) {
    console.warn('fetchListingGames site_settings error:', err?.message)
  }

  // 2. Fallback to description tags
  if (listing?.description) {
    const fromDesc = parseGamesFromDescription(listing.description)
    if (fromDesc.length > 0) return fromDesc
  }

  // 3. Fallback for PS5 listings if no custom games saved yet
  if (listing && isPs5Listing(listing)) {
    return DEFAULT_PS5_STARTER_GAMES
  }

  return []
}

export async function saveListingGames(listingId, gamesList) {
  if (!listingId) return []

  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'listing_games')
      .maybeSingle()

    const currentMap = data?.value && typeof data.value === 'object' ? data.value : {}
    currentMap[listingId] = gamesList

    await supabase.from('site_settings').upsert({
      id: 'listing_games',
      value: currentMap,
      updated_at: new Date().toISOString(),
    })

    return gamesList
  } catch (err) {
    console.warn('saveListingGames error:', err?.message)
    return gamesList
  }
}
