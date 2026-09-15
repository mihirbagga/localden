export const PAYOUT_MIN = 100

export const WALLET_KIND_LABEL = {
  listing_earning: 'Listing earning',
  referral_referrer: 'Referral reward',
  referral_referee: 'Referral bonus',
  spend: 'Paid from wallet',
  payout_request: 'Payout requested',
}

export function rupee(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

export function entryLabel(entry) {
  return entry?.note || WALLET_KIND_LABEL[entry?.kind] || entry?.kind || 'Wallet'
}
