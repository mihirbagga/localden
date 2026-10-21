const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const readBase64 = (filename) => {
  const fileP = path.join(process.cwd(), 'public/hero', filename);
  if (fs.existsSync(fileP)) {
    return `data:image/png;base64,${fs.readFileSync(fileP).toString('base64')}`;
  }
  return '';
};

const ps5Img = readBase64('ps5.png');
const guitarImg = readBase64('guitar.png');
const djImg = readBase64('dj.png');
const vrImg = readBase64('vr.png');

const outDirPublic = path.join(process.cwd(), 'public/banners');
const outDirArtifacts = '/Users/mihirbagga/.gemini/antigravity/brain/ec781e6b-d257-42d4-a9bc-42bd02387c23';

if (!fs.existsSync(outDirPublic)) fs.mkdirSync(outDirPublic, { recursive: true });
if (!fs.existsSync(outDirArtifacts)) fs.mkdirSync(outDirArtifacts, { recursive: true });

const getDefs = () => `
  <defs>
    <linearGradient id="bgGenZ" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#07080f"/>
      <stop offset="35%" stop-color="#0e1022"/>
      <stop offset="70%" stop-color="#160826"/>
      <stop offset="100%" stop-color="#06070e"/>
    </linearGradient>

    <linearGradient id="acidYellowGreen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e2f80d"/>
      <stop offset="100%" stop-color="#00ff87"/>
    </linearGradient>

    <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff2e6d"/>
      <stop offset="50%" stop-color="#9333ea"/>
      <stop offset="100%" stop-color="#00e5ff"/>
    </linearGradient>

    <linearGradient id="badgeYellow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e2f80d"/>
      <stop offset="100%" stop-color="#c4db00"/>
    </linearGradient>

    <pattern id="acidGrid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#ffffff" stroke-opacity="0.045" stroke-width="1.2"/>
    </pattern>

    <linearGradient id="hexGradient" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#ff2e6d" />
      <stop offset="50%" stop-color="#bf24c7" />
      <stop offset="100%" stop-color="#00e5ff" />
    </linearGradient>
  </defs>
`;

const icons = {
  fire: (fill="#ff2e6d", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.61 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>`,
  bolt: (fill="#e2f80d", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`,
  check: (fill="#00ff87", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
  globe: (fill="#00e5ff", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>`,
  truck: (fill="#000000", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-7.5l1.96 2.5H17V11h2.5zm-1 7.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`
};

// Reusable Exact Brand Header SVG
const getBrandHeader = (scale = 1.0) => `
  <!-- Exact Brand Component -->
  <g transform="translate(0, 0)">
    <!-- Hexagon icon -->
    <g transform="translate(0, 0) scale(0.18)">
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
    <text x="95" y="52" font-size="46" font-weight="900" font-family="'Kohinoor Devanagari', 'Devanagari Sangam MN', sans-serif">
      <tspan fill="#ff2e6d">लोकल </tspan>
      <tspan fill="#00e5ff" font-family="system-ui, -apple-system, sans-serif" letter-spacing="1">DEN</tspan>
    </text>
  </g>
`;

// ========================================================
// 1. GEN-Z AD SQUARE POST (1080 x 1080)
// ========================================================
const createGenZPost = () => `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg" font-family="'Kohinoor Devanagari', 'Devanagari Sangam MN', system-ui, -apple-system, sans-serif">
  ${getDefs()}

  <!-- Background Base -->
  <rect width="1080" height="1080" fill="url(#bgGenZ)"/>
  <rect width="1080" height="1080" fill="url(#acidGrid)"/>

  <!-- High-Energy Ambient Glow Orbs -->
  <circle cx="200" cy="220" r="260" fill="#ff2e6d" opacity="0.22" filter="blur(60px)"/>
  <circle cx="900" cy="480" r="280" fill="#e2f80d" opacity="0.16" filter="blur(70px)"/>
  <circle cx="540" cy="950" r="300" fill="#00e5ff" opacity="0.18" filter="blur(65px)"/>

  <!-- HEADER -->
  <g transform="translate(60, 48)">
    <!-- Brand Pill with Original Exact Logo & Text -->
    <rect width="400" height="66" rx="33" fill="#04050a" fill-opacity="0.85" stroke="url(#hexGradient)" stroke-width="2"/>
    <g transform="translate(20, 6)">
      ${getBrandHeader()}
    </g>
  </g>

  <!-- Top Right Tagline Badge -->
  <g transform="translate(710, 52)">
    <rect width="310" height="58" rx="29" fill="#111827" fill-opacity="0.8" stroke="#e2f80d" stroke-width="2"/>
    <g transform="translate(18, 16)">${icons.bolt("#e2f80d", 24)}</g>
    <text x="50" y="37" fill="#e2f80d" font-size="17" font-weight="900" letter-spacing="1">NO EMI. JUST RENT.</text>
  </g>

  <!-- PUNCHY GEN-Z HOOK -->
  <g transform="translate(60, 165)">
    <!-- Strikethrough First Line -->
    <g>
      <text x="0" y="40" fill="#94a3b8" font-size="34" font-weight="800" letter-spacing="1">50K KA PS5 BUY KARNA?</text>
      <line x1="0" y1="28" x2="480" y2="28" stroke="#ff2e6d" stroke-width="5" stroke-linecap="round"/>
      <rect x="495" y="6" width="130" height="38" rx="10" fill="#ff2e6d"/>
      <text x="560" y="32" fill="#ffffff" font-size="20" font-weight="900" text-anchor="middle">LMAO NO</text>
    </g>

    <!-- Main Loud Hook Line -->
    <g transform="translate(0, 60)">
      <text x="0" y="48" fill="#ffffff" font-size="56" font-weight="900" letter-spacing="1">KHARIDNA KYU HAI? </text>
      <text x="605" y="48" fill="url(#acidYellowGreen)" font-size="56" font-weight="900" letter-spacing="2">RENT KARO!</text>
    </g>
  </g>

  <!-- HERO HARDWARE SHOWCASE POD (Center) -->
  <g transform="translate(60, 298)">
    <!-- Glass Pod Background -->
    <rect width="960" height="420" rx="32" fill="#090d1f" fill-opacity="0.75" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
    <ellipse cx="480" cy="380" rx="420" ry="40" fill="#00e5ff" opacity="0.12" filter="blur(15px)"/>

    <!-- Cutout Images -->
    <image href="${ps5Img}" x="120" y="10" width="370" height="320"/>
    <image href="${djImg}" x="20" y="160" width="350" height="220"/>
    <image href="${guitarImg}" x="520" y="60" width="340" height="290"/>
    <image href="${vrImg}" x="400" y="230" width="220" height="160"/>

    <!-- NEO-BRUTALIST STICKERS / BADGES -->
    <g transform="translate(30, 25) rotate(-3)">
      <rect width="250" height="52" rx="14" fill="url(#badgeYellow)" stroke="#000000" stroke-width="3"/>
      <g transform="translate(14, 13)">${icons.fire("#000000", 24)}</g>
      <text x="44" y="35" fill="#000000" font-size="21" font-weight="900" letter-spacing="0.5">STARTING ₹199/DAY</text>
    </g>

    <g transform="translate(670, 25) rotate(2)">
      <rect width="260" height="52" rx="14" fill="#00e5ff" stroke="#000000" stroke-width="3"/>
      <g transform="translate(14, 13)">${icons.truck("#000000", 26)}</g>
      <text x="48" y="35" fill="#000000" font-size="20" font-weight="900" letter-spacing="0.5">SAME-DAY DELIVERY</text>
    </g>
  </g>

  <!-- 3 QUICK HOOK BULLETS -->
  <g transform="translate(60, 740)">
    <rect width="960" height="115" rx="24" fill="#070c1a" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5"/>

    <!-- Bullet 1 -->
    <g transform="translate(35, 28)">
      <circle cx="20" cy="28" r="20" fill="#ff2e6d" fill-opacity="0.2"/>
      <g transform="translate(8, 16)">${icons.check("#ff2e6d", 24)}</g>
      <text x="50" y="24" fill="#ffffff" font-size="19" font-weight="800">Weekend FIFA Night?</text>
      <text x="50" y="48" fill="#94a3b8" font-size="15">Rent PS5 with 2 controllers</text>
    </g>

    <!-- Bullet 2 -->
    <g transform="translate(365, 28)">
      <circle cx="20" cy="28" r="20" fill="#00e5ff" fill-opacity="0.2"/>
      <g transform="translate(8, 16)">${icons.check("#00e5ff", 24)}</g>
      <text x="50" y="24" fill="#ffffff" font-size="19" font-weight="800">House Party Vibes?</text>
      <text x="50" y="48" fill="#94a3b8" font-size="15">Pioneer DJ Decks &amp; Sound</text>
    </g>

    <!-- Bullet 3 -->
    <g transform="translate(685, 28)">
      <circle cx="20" cy="28" r="20" fill="#e2f80d" fill-opacity="0.2"/>
      <g transform="translate(8, 16)">${icons.check("#e2f80d", 24)}</g>
      <text x="50" y="24" fill="#ffffff" font-size="19" font-weight="800">Zero Deposit Drama</text>
      <text x="50" y="48" fill="#94a3b8" font-size="15">Instant KYC &amp; safe pickup</text>
    </g>
  </g>

  <!-- AD CTA BUTTON & WEBSITE -->
  <g transform="translate(60, 878)">
    <!-- Main High-Converting CTA Button -->
    <rect width="520" height="92" rx="26" fill="url(#btnGrad)"/>
    <text x="260" y="56" fill="#ffffff" font-size="26" font-weight="900" text-anchor="middle" letter-spacing="1">RENT YOUR SETUP NOW &#x2794;</text>

    <!-- Website URL Box -->
    <g transform="translate(550, 0)">
      <rect width="410" height="92" rx="26" fill="#04060f" stroke="#e2f80d" stroke-width="2.5"/>
      <g transform="translate(30, 30)">${icons.globe("#e2f80d", 32)}</g>
      <text x="220" y="56" fill="#e2f80d" font-size="26" font-weight="900" text-anchor="middle" letter-spacing="1">localden.online</text>
    </g>
  </g>

  <!-- Bottom Location Trust Badge -->
  <text x="540" y="1015" fill="#64748b" font-size="17" font-weight="700" text-anchor="middle">
    Koramangala • Indiranagar • HSR Layout • Whitefield • Electronic City • Bangalore
  </text>
</svg>
`;

// ========================================================
// 2. GEN-Z AD STORY POST (1080 x 1920)
// ========================================================
const createGenZStory = () => `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" font-family="'Kohinoor Devanagari', 'Devanagari Sangam MN', system-ui, -apple-system, sans-serif">
  ${getDefs()}

  <!-- Background Base -->
  <rect width="1080" height="1920" fill="url(#bgGenZ)"/>
  <rect width="1080" height="1920" fill="url(#acidGrid)"/>

  <!-- Orbs -->
  <circle cx="200" cy="350" r="320" fill="#ff2e6d" opacity="0.22" filter="blur(65px)"/>
  <circle cx="880" cy="880" r="350" fill="#e2f80d" opacity="0.16" filter="blur(75px)"/>
  <circle cx="300" cy="1450" r="320" fill="#00e5ff" opacity="0.2" filter="blur(70px)"/>

  <!-- HEADER -->
  <g transform="translate(80, 95)">
    <rect width="420" height="74" rx="37" fill="#04050a" fill-opacity="0.85" stroke="url(#hexGradient)" stroke-width="2.5"/>
    <g transform="translate(25, 8)">
      ${getBrandHeader()}
    </g>
  </g>

  <!-- Tagline Pill -->
  <g transform="translate(80, 195)">
    <rect width="440" height="50" rx="25" fill="#111827" fill-opacity="0.8" stroke="#e2f80d" stroke-width="2"/>
    <g transform="translate(20, 13)">${icons.bolt("#e2f80d", 24)}</g>
    <text x="56" y="33" fill="#e2f80d" font-size="19" font-weight="900" letter-spacing="1">NO EMI. JUST RENT.</text>
  </g>

  <!-- PUNCHY HOOK -->
  <g transform="translate(80, 315)">
    <!-- Strikethrough Line -->
    <g>
      <text x="0" y="35" fill="#94a3b8" font-size="38" font-weight="800" letter-spacing="1">50K KA PS5 BUY KARNA?</text>
      <line x1="0" y1="22" x2="530" y2="22" stroke="#ff2e6d" stroke-width="6" stroke-linecap="round"/>
      <rect x="550" y="-3" width="140" height="42" rx="10" fill="#ff2e6d"/>
      <text x="620" y="27" fill="#ffffff" font-size="22" font-weight="900" text-anchor="middle">LMAO NO</text>
    </g>

    <text x="0" y="115" fill="#ffffff" font-size="64" font-weight="900" letter-spacing="1">KHARIDNA KYU HAI?</text>
    <text x="0" y="195" fill="url(#acidYellowGreen)" font-size="76" font-weight="900" letter-spacing="2">RENT KARO!</text>
    <text x="0" y="255" fill="#94a3b8" font-size="28" font-weight="600">Why own when you can rent starting @ ₹199/day?</text>
  </g>

  <!-- HARDWARE SHOWCASE POD -->
  <g transform="translate(80, 620)">
    <ellipse cx="460" cy="380" rx="420" ry="90" fill="#00e5ff" opacity="0.1" filter="blur(20px)"/>

    <!-- Images Composite -->
    <image href="${ps5Img}" x="220" y="0" width="480" height="410"/>
    <image href="${djImg}" x="20" y="210" width="410" height="250"/>
    <image href="${guitarImg}" x="510" y="100" width="370" height="320"/>
    <image href="${vrImg}" x="380" y="300" width="260" height="190"/>

    <!-- Floating Badges -->
    <g transform="translate(10, 30) rotate(-4)">
      <rect width="280" height="60" rx="16" fill="url(#badgeYellow)" stroke="#000000" stroke-width="3.5"/>
      <g transform="translate(18, 16)">${icons.fire("#000000", 28)}</g>
      <text x="54" y="40" fill="#000000" font-size="24" font-weight="900">STARTING ₹199/DAY</text>
    </g>

    <g transform="translate(620, 30) rotate(3)">
      <rect width="290" height="60" rx="16" fill="#00e5ff" stroke="#000000" stroke-width="3.5"/>
      <g transform="translate(18, 16)">${icons.truck("#000000", 28)}</g>
      <text x="56" y="40" fill="#000000" font-size="22" font-weight="900">SAME-DAY DELIVERY</text>
    </g>
  </g>

  <!-- VALUE PROPOSITION CARD -->
  <g transform="translate(80, 1170)">
    <rect width="920" height="340" rx="32" fill="#090f24" fill-opacity="0.8" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2"/>

    <!-- Item 1 -->
    <g transform="translate(45, 45)">
      <circle cx="28" cy="28" r="28" fill="#ff2e6d" fill-opacity="0.2"/>
      <g transform="translate(14, 14)">${icons.check("#ff2e6d", 28)}</g>
      <text x="75" y="26" fill="#ffffff" font-size="25" font-weight="800">Weekend FIFA / Tekken Night with the Boys</text>
      <text x="75" y="55" fill="#94a3b8" font-size="19">Rent PS5 with Dual Controllers &amp; Top Games</text>
    </g>

    <!-- Item 2 -->
    <g transform="translate(45, 140)">
      <circle cx="28" cy="28" r="28" fill="#00e5ff" fill-opacity="0.2"/>
      <g transform="translate(14, 14)">${icons.check("#00e5ff", 28)}</g>
      <text x="75" y="26" fill="#ffffff" font-size="25" font-weight="800">Host the Craziest House Party</text>
      <text x="75" y="55" fill="#94a3b8" font-size="19">Pioneer DJ Decks, Electric Guitars &amp; Party Audio</text>
    </g>

    <!-- Item 3 -->
    <g transform="translate(45, 235)">
      <circle cx="28" cy="28" r="28" fill="#e2f80d" fill-opacity="0.2"/>
      <g transform="translate(14, 14)">${icons.check("#e2f80d", 28)}</g>
      <text x="75" y="26" fill="#ffffff" font-size="25" font-weight="800">Zero Hassle • Zero Deposit Drama</text>
      <text x="75" y="55" fill="#94a3b8" font-size="19">Delivered &amp; picked up directly from your doorstep</text>
    </g>
  </g>

  <!-- CTA & URL -->
  <g transform="translate(80, 1560)">
    <!-- Big Glowing CTA Button -->
    <rect width="920" height="110" rx="30" fill="url(#btnGrad)"/>
    <text x="460" y="68" fill="#ffffff" font-size="34" font-weight="900" text-anchor="middle" letter-spacing="1">RENT YOUR SETUP NOW &#x2794;</text>

    <!-- Website URL -->
    <g transform="translate(0, 140)">
      <rect width="920" height="85" rx="26" fill="#04060f" stroke="#e2f80d" stroke-width="2.5"/>
      <g transform="translate(260, 26)">${icons.globe("#e2f80d", 34)}</g>
      <text x="490" y="55" fill="#e2f80d" font-size="34" font-weight="900" text-anchor="middle" letter-spacing="2">localden.online</text>
    </g>

    <!-- Trust Tagline -->
    <text x="460" y="265" fill="#64748b" font-size="20" font-weight="700" text-anchor="middle">
      Koramangala • Indiranagar • HSR Layout • Whitefield • Bangalore
    </text>
  </g>
</svg>
`;

const renderAndSave = (svgContent, filename) => {
  const resvg = new Resvg(svgContent, {
    font: {
      loadSystemFonts: true,
    }
  });
  const pngData = resvg.render().asPng();

  const pathPublic = path.join(outDirPublic, filename);
  const pathArtifacts = path.join(outDirArtifacts, filename);

  fs.writeFileSync(pathPublic, pngData);
  fs.writeFileSync(pathArtifacts, pngData);
  console.log(`Saved ${filename} to public and artifacts.`);
};

console.log('Generating updated Gen-Z Ad Banners with exact brand logo & colors...');
renderAndSave(createGenZPost(), 'genz_ad_post.png');
renderAndSave(createGenZStory(), 'genz_ad_story.png');

console.log('Updated Gen-Z Ad Banners generated successfully!');
