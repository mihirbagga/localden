import { supabase } from './supabase'

/**
 * Payout Request Service
 * Handles user wallet payout requests and admin processing
 */

const SETTING_KEY = 'payout_requests'

export async function fetchPayoutRequests() {
  try {
    // 1. Fetch raw payout requests from site_settings
    const { data: settingRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', SETTING_KEY)
      .maybeSingle()

    let requests = []
    if (settingRow?.value) {
      if (Array.isArray(settingRow.value)) {
        requests = settingRow.value
      } else if (Array.isArray(settingRow.value.requests)) {
        requests = settingRow.value.requests
      }
    }

    if (!requests.length) {
      return []
    }

    // 2. Fetch profiles for user names/emails
    const userIds = [...new Set(requests.map((r) => r.user_id).filter(Boolean))]
    let profileMap = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds)

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
      }
    }

    // Merge profile details
    return requests
      .map((req) => ({
        ...req,
        user: profileMap[req.user_id] || {
          full_name: 'Member',
          email: 'N/A',
          phone: 'N/A',
        },
      }))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  } catch (err) {
    console.warn('Failed to fetch payout requests:', err?.message)
    return []
  }
}

export async function submitUserPayoutRequest({
  userId,
  amount,
  payoutMethod,
  upiId = '',
  bankDetails = null,
}) {
  if (!userId || !amount || amount <= 0) {
    throw new Error('Invalid payout request data')
  }

  // 1. Try to invoke Postgres request_wallet_payout RPC if available to deduct wallet balance
  try {
    const { error: rpcErr } = await supabase.rpc('request_wallet_payout', {
      p_amount: Math.round(amount),
    })
    if (rpcErr) {
      console.warn('request_wallet_payout RPC warning (falling back to direct ledger update):', rpcErr.message)
    }
  } catch (err) {
    console.warn('RPC request_wallet_payout call skipped:', err?.message)
  }

  // 2. Insert wallet entry for tracking if RPC didn't create one
  try {
    await supabase.from('wallet_entries').insert({
      user_id: userId,
      amount: -Math.round(amount),
      kind: 'payout_request',
      note: `Payout requested via ${payoutMethod === 'upi' ? `UPI (${upiId})` : 'Bank Transfer'}`,
    })
  } catch (wErr) {
    console.warn('Wallet entry note creation skipped:', wErr?.message)
  }

  // 3. Create persistent payout request record
  const newRequest = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    amount: Math.round(amount),
    payout_method: payoutMethod,
    upi_id: upiId || null,
    bank_details: bankDetails || null,
    status: 'pending', // 'pending' | 'completed' | 'rejected'
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    transaction_ref: null,
    admin_notes: null,
  }

  // 4. Save into site_settings
  const { data: currentSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('id', SETTING_KEY)
    .maybeSingle()

  let currentList = []
  if (currentSetting?.value) {
    if (Array.isArray(currentSetting.value)) {
      currentList = currentSetting.value
    } else if (Array.isArray(currentSetting.value.requests)) {
      currentList = currentSetting.value.requests
    }
  }

  const updatedList = [newRequest, ...currentList]

  const { error: saveErr } = await supabase
    .from('site_settings')
    .upsert({
      id: SETTING_KEY,
      value: { requests: updatedList },
      updated_at: new Date().toISOString(),
    })

  if (saveErr) {
    throw new Error(saveErr.message || 'Failed to submit payout request')
  }

  return newRequest
}

export async function updatePayoutStatus(requestId, { status, transactionRef = '', adminNotes = '' }) {
  if (!requestId || !status) {
    throw new Error('Request ID and status are required')
  }

  const { data: currentSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('id', SETTING_KEY)
    .maybeSingle()

  let currentList = []
  if (currentSetting?.value) {
    if (Array.isArray(currentSetting.value)) {
      currentList = currentSetting.value
    } else if (Array.isArray(currentSetting.value.requests)) {
      currentList = currentSetting.value.requests
    }
  }

  let targetRequest = null
  const updatedList = currentList.map((item) => {
    if (item.id === requestId) {
      targetRequest = {
        ...item,
        status,
        transaction_ref: transactionRef || item.transaction_ref,
        admin_notes: adminNotes || item.admin_notes,
        updated_at: new Date().toISOString(),
      }
      return targetRequest
    }
    return item
  })

  if (!targetRequest) {
    throw new Error('Payout request not found')
  }

  // If rejected, refund the money back to user wallet
  if (status === 'rejected') {
    try {
      await supabase.from('wallet_entries').insert({
        user_id: targetRequest.user_id,
        amount: Math.abs(targetRequest.amount),
        kind: 'refund',
        note: `Payout #${targetRequest.id.slice(-6)} rejected: ${adminNotes || 'Refunded to wallet'}`,
      })

      // Update wallets table
      const { data: wRow } = await supabase
        .from('wallets')
        .select('available, pending')
        .eq('user_id', targetRequest.user_id)
        .maybeSingle()

      if (wRow) {
        await supabase
          .from('wallets')
          .update({
            available: (wRow.available || 0) + Math.abs(targetRequest.amount),
            pending: Math.max(0, (wRow.pending || 0) - Math.abs(targetRequest.amount)),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', targetRequest.user_id)
      }
    } catch (refErr) {
      console.warn('Wallet refund on reject failed:', refErr?.message)
    }
  } else if (status === 'completed') {
    // If completed, clear pending wallet balance
    try {
      const { data: wRow } = await supabase
        .from('wallets')
        .select('pending')
        .eq('user_id', targetRequest.user_id)
        .maybeSingle()

      if (wRow && wRow.pending > 0) {
        await supabase
          .from('wallets')
          .update({
            pending: Math.max(0, (wRow.pending || 0) - Math.abs(targetRequest.amount)),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', targetRequest.user_id)
      }
    } catch (penErr) {
      console.warn('Wallet pending clear failed:', penErr?.message)
    }
  }

  // Save to site_settings
  const { error } = await supabase
    .from('site_settings')
    .upsert({
      id: SETTING_KEY,
      value: { requests: updatedList },
      updated_at: new Date().toISOString(),
    })

  if (error) {
    throw new Error(error.message || 'Failed to update payout request')
  }

  return targetRequest
}

