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
    // Check if user already has a welcome coupon
    const { data: existing } = await supabaseClient
      .from('coupons')
      .select('id, code, discount_value')
      .eq('owner_id', userId)
      .ilike('code', 'WELCOME%')
      .maybeSingle()

    if (existing) return existing

    const setting = await fetchSignupCouponSetting(supabaseClient)
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
