import { supabase } from './supabase'

export const DEFAULT_PROTECTION_PLANS = {
  enabled: true, // Master admin toggle
  basic_fee_per_day: 99,
  basic_coverage: 5000,
  full_fee_per_day: 249,
  full_coverage: 50000,
}

export function parseProtectionSettings(row) {
  const raw = row?.value && typeof row.value === 'object' ? row.value : {}
  return {
    enabled: raw.enabled !== false,
    basic_fee_per_day: Number.isFinite(Number(raw.basic_fee_per_day)) ? Number(raw.basic_fee_per_day) : DEFAULT_PROTECTION_PLANS.basic_fee_per_day,
    basic_coverage: Number.isFinite(Number(raw.basic_coverage)) ? Number(raw.basic_coverage) : DEFAULT_PROTECTION_PLANS.basic_coverage,
    full_fee_per_day: Number.isFinite(Number(raw.full_fee_per_day)) ? Number(raw.full_fee_per_day) : DEFAULT_PROTECTION_PLANS.full_fee_per_day,
    full_coverage: Number.isFinite(Number(raw.full_coverage)) ? Number(raw.full_coverage) : DEFAULT_PROTECTION_PLANS.full_coverage,
  }
}

export function calculateProtectionCost(planId, totalDays, settings = DEFAULT_PROTECTION_PLANS) {
  if (!settings.enabled || planId === 'none' || !planId) return 0
  const days = Math.max(1, Number(totalDays) || 1)
  if (planId === 'basic') return settings.basic_fee_per_day * days
  if (planId === 'full') return settings.full_fee_per_day * days
  return 0
}

export function getProtectionPlanDetails(planId, settings = DEFAULT_PROTECTION_PLANS) {
  if (planId === 'basic') {
    return {
      id: 'basic',
      name: 'Basic Shield',
      desc: `Covers accidental cosmetic wear & minor scuffs up to ₹${settings.basic_coverage.toLocaleString('en-IN')}`,
      feePerDay: settings.basic_fee_per_day,
      maxCoverage: settings.basic_coverage,
      badge: '🛡️ Basic Coverage',
    }
  }
  if (planId === 'full') {
    return {
      id: 'full',
      name: 'Zero-Deductible Waiver',
      desc: `100% protection against accidental hardware failure & damage up to ₹${settings.full_coverage.toLocaleString('en-IN')}`,
      feePerDay: settings.full_fee_per_day,
      maxCoverage: settings.full_coverage,
      badge: '🌟 Zero Deductible',
    }
  }
  return {
    id: 'none',
    name: 'No Protection',
    desc: 'Standard security deposit applies. Renter is liable for any damaged hardware.',
    feePerDay: 0,
    maxCoverage: 0,
    badge: 'Standard Deposit',
  }
}
