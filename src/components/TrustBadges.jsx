import { getUserBadges } from '../lib/gamification'

export default function TrustBadges({ profile, listing, compact = false }) {
  const badges = getUserBadges(profile, listing)
  if (!badges.length) return null

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {badges.map((b) => (
          <span
            key={b.id}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-display border bg-${b.tone}-500/10 border-${b.tone}-500/30 text-${b.tone}-300`}
            title={b.desc}
          >
            {b.label}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2 my-3">
      <span className="text-xs font-bold text-white/50 uppercase tracking-wider block">Trust & Performance Badges</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`p-2.5 rounded-xl border bg-white/5 border-white/10 flex items-start gap-2 text-xs font-display`}
          >
            <div>
              <strong className="text-white block">{b.label}</strong>
              <span className="text-[10px] text-white/60 block">{b.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
