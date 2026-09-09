/* Reusable लोकल Den logo mark — the hexagonal neon SVG */
export default function LogoMark({ size = 36 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="lm-bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#0e1017" />
          <stop offset="50%"  stopColor="#0a0a0f" />
          <stop offset="100%" stopColor="#06070a" />
        </linearGradient>

        <linearGradient id="lm-hexGrad" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%"   stopColor="#ff1666" />
          <stop offset="45%"  stopColor="#bf24c7" />
          <stop offset="55%"  stopColor="#5486f7" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>

        <filter id="lm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5"  result="b1" />
          <feGaussianBlur stdDeviation="12" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id="lm-pink" cx="35%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ff1666" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff1666" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="lm-cyan" cx="65%" cy="40%" r="50%">
          <stop offset="0%"   stopColor="#00e5ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="500" height="500" fill="url(#lm-bgGrad)" rx="30" />

      {/* Ambient glows */}
      <circle cx="210" cy="250" r="140" fill="url(#lm-pink)" />
      <circle cx="290" cy="210" r="140" fill="url(#lm-cyan)" />

      {/* Hex frame */}
      <polygon
        points="250,55 395,140 395,308 250,392 105,308 105,140"
        fill="#0d0f16"
        stroke="url(#lm-hexGrad)"
        strokeWidth="9"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter="url(#lm-glow)"
      />

      {/* Cyan chevron (top) */}
      <polyline
        points="180,215 250,150 320,215"
        fill="none"
        stroke="#00e5ff"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#lm-glow)"
      />

      {/* Pink chevron (bottom) */}
      <polyline
        points="200,270 250,225 300,270"
        fill="none"
        stroke="#ff1666"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#lm-glow)"
      />

      {/* Center dot */}
      <circle cx="250" cy="320" r="9" fill="#ffffff" filter="url(#lm-glow)" />
    </svg>
  )
}
