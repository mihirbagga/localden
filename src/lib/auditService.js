import { supabase } from './supabase'

/**
 * Logs an administrative or critical operational action for immutable auditing
 */
export async function logAuditEvent({
  actorId,
  actorRole = 'admin',
  action,
  entityType,
  entityId,
  beforeData = null,
  afterData = null,
  metadata = null,
}) {
  try {
    await supabase.from('audit_log').insert([
      {
        actor_id: actorId || null,
        actor_role: actorRole,
        action,
        entity_type: entityType,
        entity_id: String(entityId),
        before_data: beforeData,
        after_data: afterData,
        metadata,
      },
    ])
  } catch (err) {
    console.warn('audit_log write silently bypassed:', err?.message)
  }
}

/**
 * Records a state transition in a booking's lifecycle
 */
export async function logBookingEvent({
  bookingId,
  event,
  actorId = null,
  actorRole = 'system',
  metadata = null,
}) {
  try {
    await supabase.from('booking_events').insert([
      {
        booking_id: bookingId,
        event,
        actor_id: actorId,
        actor_role: actorRole,
        metadata,
      },
    ])
  } catch (err) {
    console.warn('booking_events write silently bypassed:', err?.message)
  }
}

/**
 * Logs outgoing communication (WhatsApp, SMS, Email) with delivery metadata
 */
export async function logComm({
  bookingId = null,
  userId = null,
  channel = 'whatsapp',
  eventType,
  recipient,
  message,
  status = 'sent',
  error = null,
}) {
  try {
    await supabase.from('comm_log').insert([
      {
        booking_id: bookingId,
        user_id: userId,
        channel,
        event_type: eventType,
        recipient: String(recipient || ''),
        message,
        status,
        error: error ? String(error) : null,
      },
    ])
  } catch (err) {
    console.warn('comm_log write silently bypassed:', err?.message)
  }
}

