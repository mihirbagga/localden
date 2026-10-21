import { supabase } from './supabase'

/**
 * Payout Request Service
 * Handles user wallet payout requests and admin processing
 */

const SETTING_KEY = 'payout_requests'

/**
 * Fetch all payout requests for admin panel
 * Reads from dedicated `payout_requests` table with joined profile & wallet balance,
 * falling back gracefully to site_settings if table is not yet migrated.
 */
export async function fetchPayoutRequests() {
  try {
    let combined = []
    const seenIds = new Set()

    // 1. Primary: query dedicated payout_requests table (without broken wallets FK join)
    const { data: dbRows, error: dbErr } = await supabase
      .from('payout_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (!dbErr && Array.isArray(dbRows)) {
      for (const r of dbRows) {
        const id = String(r.id)
        seenIds.add(id)
        combined.push({
          id,
          user_id: r.user_id,
          amount: Math.abs(Number(r.amount || 0)),
          payout_method: r.payout_method || 'upi',
          upi_id: r.upi_id || null,
          bank_details: r.bank_details || null,
          status: r.status || 'pending',
          transaction_ref: r.transaction_ref || null,
          admin_notes: r.admin_notes || null,
          created_at: r.created_at,
          updated_at: r.updated_at || r.created_at,
        })
      }
    }

    // 2. Secondary: merge from site_settings (legacy fallback)
    const { data: settingRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', SETTING_KEY)
      .maybeSingle()

    if (settingRow?.value) {
      const sList = Array.isArray(settingRow.value)
        ? settingRow.value
        : Array.isArray(settingRow.value.requests)
          ? settingRow.value.requests
          : []
      for (const req of sList) {
        const id = String(req.id)
        if (!seenIds.has(id)) {
          seenIds.add(id)
          combined.push({
            ...req,
            id,
            amount: Math.abs(Number(req.amount || 0)),
            payout_method: req.payout_method || 'upi',
            status: req.status || 'pending',
          })
        }
      }
    }

    // 3. Tertiary: check wallet_entries (kind = 'payout_request') for any unrecorded requests
    const { data: ledgerRows } = await supabase
      .from('wallet_entries')
      .select('*')
      .eq('kind', 'payout_request')
      .order('created_at', { ascending: false })

    if (Array.isArray(ledgerRows)) {
      for (const le of ledgerRows) {
        const amt = Math.abs(Number(le.amount || 0))
        // Check if already matched by user_id + amount within 2 minutes
        const leTime = new Date(le.created_at || 0).getTime()
        const alreadyTracked = combined.some(
          (c) =>
            c.user_id === le.user_id &&
            c.amount === amt &&
            Math.abs(new Date(c.created_at || 0).getTime() - leTime) < 120000
        )
        const id = String(le.id)
        if (!alreadyTracked && !seenIds.has(id)) {
          seenIds.add(id)
          const upiMatch = (le.note || '').match(/UPI\s*\(([^)]+)\)/i)
          combined.push({
            id,
            user_id: le.user_id,
            amount: amt,
            payout_method: /bank/i.test(le.note || '') ? 'bank' : 'upi',
            upi_id: upiMatch ? upiMatch[1].trim() : null,
            bank_details: null,
            status: 'pending',
            transaction_ref: null,
            admin_notes: le.note || null,
            created_at: le.created_at,
            updated_at: le.created_at,
          })
        }
      }
    }

    if (!combined.length) {
      return []
    }

    // 4. Hydrate profiles and wallet balances in parallel
    const userIds = [...new Set(combined.map((r) => r.user_id).filter(Boolean))]
    let profileMap = {}
    let walletMap = {}

    if (userIds.length > 0) {
      const [profilesRes, walletsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, phone').in('id', userIds),
        supabase.from('wallets').select('user_id, available, pending').in('user_id', userIds),
      ])

      if (profilesRes.data) {
        profileMap = Object.fromEntries(profilesRes.data.map((p) => [p.id, p]))
      }
      if (walletsRes.data) {
        walletMap = Object.fromEntries(walletsRes.data.map((w) => [w.user_id, w]))
      }
    }

    return combined
      .map((req) => ({
        ...req,
        user: profileMap[req.user_id] || {
          full_name: 'Member',
          email: 'N/A',
          phone: 'N/A',
        },
        wallet: walletMap[req.user_id] || { available: 0, pending: 0 },
      }))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  } catch (err) {
    console.warn('Failed to fetch payout requests:', err?.message)
    return []
  }
}

/**
 * Fetch total count of pending payout requests for admin notification badges
 */
export async function fetchPendingPayoutCount() {
  try {
    const { count, error } = await supabase
      .from('payout_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (!error && count != null) {
      return count
    }

    // Fallback
    const all = await fetchPayoutRequests()
    return all.filter((r) => r.status === 'pending').length
  } catch {
    return 0
  }
}

/**
 * Submit user payout request
 * Uses atomic Postgres RPC `request_user_payout`, ensuring wallet lock,
 * RLS authorization, and simultaneous ledger and payout request creation.
 */
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

  const roundedAmount = Math.round(amount)

  // 1. Primary: Try atomic Postgres RPC
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('request_user_payout', {
      p_amount: roundedAmount,
      p_payout_method: payoutMethod,
      p_upi_id: upiId ? upiId.trim() : null,
      p_bank_details: bankDetails || null,
    })

    if (!rpcErr && rpcData) {
      return rpcData
    }

    if (rpcErr && !/does not exist|Could not find/i.test(rpcErr.message || '')) {
      // Real database error (e.g. Insufficient wallet balance)
      throw new Error(rpcErr.message)
    }
  } catch (err) {
    if (err.message && !/does not exist|Could not find/i.test(err.message)) {
      throw err
    }
    console.warn('request_user_payout RPC not available, using fallback table path:', err?.message)
  }

  // 2. Direct table insert fallback if RPC not yet created
  const { data: tableData, error: tableErr } = await supabase
    .from('payout_requests')
    .insert({
      user_id: userId,
      amount: roundedAmount,
      payout_method: payoutMethod,
      upi_id: upiId ? upiId.trim() : null,
      bank_details: bankDetails || null,
      status: 'pending',
    })
    .select()
    .single()

  if (!tableErr && tableData) {
    // Also deduct balance using request_wallet_payout RPC
    try {
      await supabase.rpc('request_wallet_payout', { p_amount: roundedAmount })
    } catch (e) {
      console.warn('request_wallet_payout call skipped:', e?.message)
    }
    return tableData
  }

  // 3. Last-resort fallback for legacy environment without payout_requests table
  try {
    await supabase.rpc('request_wallet_payout', { p_amount: roundedAmount })
  } catch (err) {
    console.warn('RPC request_wallet_payout call skipped:', err?.message)
  }

  const newRequest = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    amount: roundedAmount,
    payout_method: payoutMethod,
    upi_id: upiId || null,
    bank_details: bankDetails || null,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    transaction_ref: null,
    admin_notes: null,
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

/**
 * Update payout status by admin
 * Uses atomic Postgres RPC `admin_process_payout` to update status,
 * refund or settle wallet balances, and dispatch notifications.
 */
export async function updatePayoutStatus(requestId, { status, transactionRef = '', adminNotes = '' }) {
  if (!requestId || !status) {
    throw new Error('Request ID and status are required')
  }

  // 1. Primary: Try atomic admin_process_payout RPC
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)
    if (isUuid) {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_process_payout', {
        p_request_id: requestId,
        p_status: status,
        p_transaction_ref: transactionRef ? transactionRef.trim() : null,
        p_admin_notes: adminNotes ? adminNotes.trim() : null,
      })

      if (!rpcErr && rpcData) {
        return rpcData
      }

      if (rpcErr && !/does not exist|Could not find/i.test(rpcErr.message || '')) {
        throw new Error(rpcErr.message)
      }
    }
  } catch (err) {
    if (err.message && !/does not exist|Could not find/i.test(err.message)) {
      throw err
    }
    console.warn('admin_process_payout RPC call skipped:', err?.message)
  }

  // 2. Direct table update fallback on payout_requests
  const { data: updatedDb, error: updateErr } = await supabase
    .from('payout_requests')
    .update({
      status,
      transaction_ref: transactionRef || null,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .maybeSingle()

  if (!updateErr && updatedDb) {
    // Settle / refund wallet accordingly
    if (status === 'rejected') {
      try {
        await supabase.from('wallet_entries').insert({
          user_id: updatedDb.user_id,
          amount: Math.abs(updatedDb.amount),
          kind: 'refund',
          note: `Payout #${String(requestId).slice(-6)} rejected: ${adminNotes || 'Refunded to wallet'}`,
        })

        const { data: wRow } = await supabase
          .from('wallets')
          .select('available, pending')
          .eq('user_id', updatedDb.user_id)
          .maybeSingle()

        if (wRow) {
          await supabase
            .from('wallets')
            .update({
              available: (wRow.available || 0) + Math.abs(updatedDb.amount),
              pending: Math.max(0, (wRow.pending || 0) - Math.abs(updatedDb.amount)),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', updatedDb.user_id)
        }
      } catch (refErr) {
        console.warn('Wallet refund failed:', refErr?.message)
      }
    } else if (status === 'completed') {
      try {
        const { data: wRow } = await supabase
          .from('wallets')
          .select('pending')
          .eq('user_id', updatedDb.user_id)
          .maybeSingle()

        if (wRow && wRow.pending > 0) {
          await supabase
            .from('wallets')
            .update({
              pending: Math.max(0, (wRow.pending || 0) - Math.abs(updatedDb.amount)),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', updatedDb.user_id)
        }
      } catch (penErr) {
        console.warn('Wallet pending clear failed:', penErr?.message)
      }
    }
    return updatedDb
  }

  // 3. Fallback for site_settings
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
  let updatedList = currentList.map((item) => {
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
    // Check if requestId is a wallet_entries row
    const { data: leRow } = await supabase
      .from('wallet_entries')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    if (leRow) {
      const upiMatch = (leRow.note || '').match(/UPI\s*\(([^)]+)\)/i)
      targetRequest = {
        id: String(leRow.id),
        user_id: leRow.user_id,
        amount: Math.abs(Number(leRow.amount || 0)),
        payout_method: /bank/i.test(leRow.note || '') ? 'bank' : 'upi',
        upi_id: upiMatch ? upiMatch[1].trim() : null,
        bank_details: null,
        status,
        transaction_ref: transactionRef || null,
        admin_notes: adminNotes || null,
        created_at: leRow.created_at,
        updated_at: new Date().toISOString(),
      }
      updatedList = [targetRequest, ...currentList]
    } else {
      throw new Error('Payout request not found')
    }
  }

  if (status === 'rejected') {
    try {
      await supabase.from('wallet_entries').insert({
        user_id: targetRequest.user_id,
        amount: Math.abs(targetRequest.amount),
        kind: 'refund',
        note: `Payout #${targetRequest.id.slice(-6)} rejected: ${adminNotes || 'Refunded to wallet'}`,
      })

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
