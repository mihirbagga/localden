import { welcomeCouponCode } from './coupons'

export const DEFAULT_SIGNUP_COUPON_SETTING = {
  enabled: true,
  discount_percent: 50,
  max_discount: 500,
  min_subtotal: 0,
}

export function parseSignupCouponSetting(row) {
  if (!row || !row.value) return DEFAULT_SIGNUP_COUPON_SETTING
  const v = typeof row.value === 'object' ? row.value : {}
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : true,
    discount_percent: Number.isFinite(Number(v.discount_percent)) ? Number(v.discount_percent) : 50,
    max_discount: Number.isFinite(Number(v.max_discount)) ? Number(v.max_discount) : 500,
    min_subtotal: Number.isFinite(Number(v.min_subtotal)) ? Number(v.min_subtotal) : 0,
  }
}

export async function fetchSignupCouponSetting(supabaseClient) {
  try {
    const { data } = await supabaseClient
      .from('site_settings')
      .select('*')
      .eq('id', 'signup_coupon')
      .maybeSingle()
    return parseSignupCouponSetting(data)
  } catch (err) {
    console.warn('Failed to fetch signup coupon setting:', err?.message)
    return DEFAULT_SIGNUP_COUPON_SETTING
  }
}

export async function issueWelcomeCouponForUser(supabaseClient, userId, fullName) {
  if (!userId) return null

  try {
    const setting = await fetchSignupCouponSetting(supabaseClient)

    // Check if user already has a welcome coupon
    const { data: existing } = await supabaseClient
      .from('coupons')
      .select('id, code, discount_value, used_count, is_active')
      .eq('owner_id', userId)
      .ilike('code', 'WELCOME%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      const isUnused = (existing.used_count || 0) === 0

      // If disabled by admin, deactivate unused coupon
      if (!setting.enabled && isUnused && existing.is_active) {
        try {
          await supabaseClient
            .from('coupons')
            .update({ is_active: false })
            .eq('id', existing.id)
        } catch (_) {}
        return null
      }

      // If unused and discount percent does not match admin setting, sync it!
      if (
        setting.enabled &&
        isUnused &&
        (Number(existing.discount_value) !== Number(setting.discount_percent) || !existing.is_active)
      ) {
        try {
          const newCode = welcomeCouponCode(fullName, setting.discount_percent)
          const { data: updated } = await supabaseClient
            .from('coupons')
            .update({
              code: newCode,
              description: `Welcome signup bonus (${setting.discount_percent}% off)`,
              discount_value: setting.discount_percent,
              max_discount: setting.max_discount > 0 ? setting.max_discount : null,
              min_subtotal: setting.min_subtotal > 0 ? setting.min_subtotal : 0,
              is_active: true,
            })
            .eq('id', existing.id)
            .select()
            .maybeSingle()

          if (updated) return updated
        } catch (updErr) {
          console.warn('Could not sync welcome coupon discount:', updErr?.message)
        }
      }

      return existing
    }

    if (!setting.enabled) return null

    const code = welcomeCouponCode(fullName, setting.discount_percent)
    const payload = {
      code,
      description: `Welcome signup bonus (${setting.discount_percent}% off)`,
      discount_type: 'percent',
      discount_value: setting.discount_percent,
      max_discount: setting.max_discount > 0 ? setting.max_discount : null,
      min_subtotal: setting.min_subtotal > 0 ? setting.min_subtotal : 0,
      usage_limit: 1,
      used_count: 0,
      is_active: true,
      owner_id: userId,
      created_at: new Date().toISOString(),
    }

    const { data: created, error } = await supabaseClient
      .from('coupons')
      .insert(payload)
      .select()
      .maybeSingle()

    if (error) {
      console.warn('Could not insert signup welcome coupon:', error.message)
      return null
    }

    return created
  } catch (err) {
    console.warn('issueWelcomeCouponForUser error:', err?.message)
    return null
  }
}
