/**
 * dynamicPricing.js — Hardware spec valuation & dynamic pricing recommendation engine
 */

export function calculateSuggestedPricing({ gpu = '', cpu = '', ram = 16, storage = 512, category = 'desktop' }) {
  let basePrice = 500 // Base daily rate

  const gpuLower = gpu.toLowerCase()
  const cpuLower = cpu.toLowerCase()

  // GPU Tier Pricing Boost
  if (gpuLower.includes('4090') || gpuLower.includes('7900 xtx')) basePrice += 2000
  else if (gpuLower.includes('4080') || gpuLower.includes('7900 xt')) basePrice += 1400
  else if (gpuLower.includes('4070') || gpuLower.includes('3080') || gpuLower.includes('6800')) basePrice += 900
  else if (gpuLower.includes('4060') || gpuLower.includes('3070') || gpuLower.includes('6700')) basePrice += 600
  else if (gpuLower.includes('3060') || gpuLower.includes('2080') || gpuLower.includes('6600')) basePrice += 400
  else if (gpuLower.includes('2060') || gpuLower.includes('1660') || gpuLower.includes('580')) basePrice += 250
  else basePrice += 100

  // CPU Tier Boost
  if (cpuLower.includes('i9') || cpuLower.includes('ryzen 9') || cpuLower.includes('m3 max') || cpuLower.includes('m2 ultra')) basePrice += 500
  else if (cpuLower.includes('i7') || cpuLower.includes('ryzen 7') || cpuLower.includes('m2 pro') || cpuLower.includes('m3 pro')) basePrice += 300
  else if (cpuLower.includes('i5') || cpuLower.includes('ryzen 5') || cpuLower.includes('m1') || cpuLower.includes('m2')) basePrice += 150

  // RAM Boost
  const ramNum = Number(ram) || 16
  if (ramNum >= 64) basePrice += 300
  else if (ramNum >= 32) basePrice += 150

  // Category Multiplier
  if (category === 'laptop') basePrice *= 1.15

  const suggestedDaily = Math.round(basePrice / 10) * 10
  const recommendedDeposit = Math.max(3000, suggestedDaily * 5)
  const weekendPrice = Math.round(suggestedDaily * 1.15)
  const weeklyDiscountPercent = 20
  const monthlyDiscountPercent = 40

  return {
    suggestedDaily,
    recommendedDeposit,
    weekendPrice,
    weeklyDiscountPercent,
    monthlyDiscountPercent,
    hardwareTier: suggestedDaily > 2000 ? '🔥 Ultra Gaming / AI Monster' : suggestedDaily > 1000 ? '⚡ High-End Gaming Rig' : '🎮 Mid-Tier Performance',
  }
}
