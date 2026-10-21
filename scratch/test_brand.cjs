const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');

const svg = `
<svg width="600" height="150" viewBox="0 0 600 150" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hexGradient" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#ff2e6d" />
      <stop offset="50%" stop-color="#bf24c7" />
      <stop offset="100%" stop-color="#00e5ff" />
    </linearGradient>
  </defs>
  <rect width="600" height="150" fill="#0b0b12"/>

  <!-- Exact Logo + Text -->
  <g transform="translate(40, 30)">
    <!-- Hexagon icon -->
    <g transform="translate(0, 0) scale(0.2)">
      <polygon points="250,55 395,140 395,308 250,392 105,308 105,140"
               fill="#090a10"
               stroke="url(#hexGradient)"
               stroke-width="16"
               stroke-linejoin="round"
               stroke-linecap="round"/>
      <polyline points="180,215 250,150 320,215"
                fill="none"
                stroke="#00e5ff"
                stroke-width="24"
                stroke-linecap="round"
                stroke-linejoin="round"/>
      <polyline points="200,270 250,225 300,270"
                fill="none"
                stroke="#ff2e6d"
                stroke-width="24"
                stroke-linecap="round"
                stroke-linejoin="round"/>
      <circle cx="250" cy="325" r="16" fill="#ffffff"/>
    </g>

    <!-- Text: Pink लोकल + Cyan DEN -->
    <text x="105" y="60" font-size="52" font-weight="900" font-family="'Kohinoor Devanagari', 'Devanagari Sangam MN', sans-serif">
      <tspan fill="#ff2e6d">लोकल </tspan>
      <tspan fill="#00e5ff" font-family="system-ui, -apple-system, sans-serif" letter-spacing="1">DEN</tspan>
    </text>
  </g>
</svg>
`;

const resvg = new Resvg(svg, { font: { loadSystemFonts: true } });
fs.writeFileSync('scratch/test_exact_brand.png', resvg.render().asPng());
console.log('Exact brand test generated.');

