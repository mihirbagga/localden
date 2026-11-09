import { supabase } from './supabase'
import { logAuditEvent } from './auditService'

/**
 * Safely updates profile, auto-pruning any optional/migration columns that do not exist yet in schema cache
 */
async function safeUpdateProfile(userId, payload) {
  const currentPayload = { ...payload }

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .update(currentPayload)
      .eq('id', userId)
      .select()
      .maybeSingle()

    if (!error) return data

    // Handle missing column error: "Could not find the '...' column of 'profiles' in the schema cache"
    const missingColMatch = error.message?.match(/Could not find the '([^']+)' column/i)
    if (missingColMatch && missingColMatch[1]) {
      const colName = missingColMatch[1].toLowerCase()
      const keyToRemove = Object.keys(currentPayload).find((k) => k.toLowerCase() === colName)
      if (keyToRemove) {
        delete currentPayload[keyToRemove]
        continue
      }
    }

    throw error
  }
}

/**
 * Checks if a user has any ongoing/unsettled bookings (as renter or host)
 */
export async function checkActiveBookings(userId) {
  if (!userId) return { hasActive: false, count: 0, bookings: [] }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, status, listings(title)')
      .or(`renter_id.eq.${userId},lister_id.eq.${userId}`)
      .in('status', ['pending', 'confirmed', 'active'])

    if (error) throw error
    const activeList = data || []
    return {
      hasActive: activeList.length > 0,
      count: activeList.length,
      bookings: activeList,
    }
  } catch (err) {
    console.warn('Error checking active bookings:', err)
    return { hasActive: false, count: 0, bookings: [] }
  }
}

/**
 * User submits request to delete their account and personal data
 */
export async function requestAccountDeletion({ userId, reason = 'User requested account closure' }) {
  if (!userId) throw new Error('User ID required')

  const activeCheck = await checkActiveBookings(userId)
  if (activeCheck.hasActive) {
    throw new Error(
      `Cannot delete account. You have ${activeCheck.count} active rental(s) in progress. Complete all handovers & returns first.`
    )
  }

  const payload = {
    deletion_requested_at: new Date().toISOString(),
    deletion_reason: reason,
    updated_at: new Date().toISOString(),
  }

  const data = await safeUpdateProfile(userId, payload)

  await logAuditEvent({
    actorId: userId,
    actorRole: 'user',
    action: 'account.deletion_requested',
    entityType: 'user',
    entityId: userId,
    metadata: { reason },
  })

  return data
}

/**
 * Permanently purge user profile & credentials from DB (GDPR / DPDP compliance)
 */
export async function executeAccountDeletion({ userId, actorId = null, reason = 'Account purge confirmed' }) {
  if (!userId) throw new Error('User ID required')

  const activeCheck = await checkActiveBookings(userId)
  if (activeCheck.hasActive) {
    throw new Error(
      `Cannot purge account. User has ${activeCheck.count} active rental(s) in progress.`
    )
  }

  // 1. Primary path: Call secure database RPC to delete from auth.users AND public.profiles
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('delete_user_account', {
    p_user_id: userId,
  })

  if (!rpcErr && rpcRes?.success) {
    await logAuditEvent({
      actorId: actorId || userId,
      actorRole: actorId ? 'admin' : 'user',
      action: 'account.permanently_deleted_from_db',
      entityType: 'user',
      entityId: userId,
      metadata: { reason, method: 'rpc' },
    })
    return { id: userId, deleted: true }
  }

  // If RPC returned a specific error (permission denied, active bookings, foreign key, etc.), throw it
  if (rpcRes?.error) {
    throw new Error(rpcRes.error)
  }

  // 2. Secondary path: Direct table deletion on child tables + profiles (if RPC not yet created in Supabase)
  try {
    await supabase.from('listings').delete().eq('user_id', userId)
    await supabase.from('kyc_submissions').delete().eq('user_id', userId)
    await supabase.from('wallet_entries').delete().eq('user_id', userId)
    await supabase.from('reviews').delete().or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`)
  } catch (err) {
    console.warn('Child tables cleanup warning:', err?.message)
  }

  const { data: deletedProfile, error: profileDelErr } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)
    .select('id')

  if (!profileDelErr && deletedProfile && deletedProfile.length > 0) {
    await logAuditEvent({
      actorId: actorId || userId,
      actorRole: actorId ? 'admin' : 'user',
      action: 'account.profile_deleted_from_db',
      entityType: 'user',
      entityId: userId,
      metadata: { reason, method: 'direct_delete' },
    })
    return { id: userId, deleted: true }
  }

  // 3. If neither worked, report the exact database cause instead of silently faking success
  if (rpcErr && (rpcErr.code === '42883' || rpcErr.message?.includes('delete_user_account') || rpcErr.message?.includes('schema cache'))) {
    throw new Error(
      'Database delete function not installed yet. Please run supabase/delete_user_migration.sql in Supabase Dashboard → SQL Editor.'
    )
  }

  if (profileDelErr) {
    throw new Error(`Database error: ${profileDelErr.message}`)
  }

  throw new Error(
    rpcErr?.message || 'Could not delete user. Row-level security prevented deletion. Run supabase/delete_user_migration.sql in Supabase.'
  )
}
