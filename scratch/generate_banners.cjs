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
const xboxImg = readBase64('xbox-pack.png') || readBase64('xbox.png');
const guitarImg = readBase64('guitar.png');
const djImg = readBase64('dj.png');
const vrImg = readBase64('vr.png');
const micImg = readBase64('mic.png');

const outDirPublic = path.join(process.cwd(), 'public/banners');
const outDirArtifacts = '/Users/mihirbagga/.gemini/antigravity/brain/ec781e6b-d257-42d4-a9bc-42bd02387c23';

if (!fs.existsSync(outDirPublic)) fs.mkdirSync(outDirPublic, { recursive: true });
if (!fs.existsSync(outDirArtifacts)) fs.mkdirSync(outDirArtifacts, { recursive: true });

// SVG Vector Icon Generator Helpers
const icons = {
  globe: (fill="#00e5ff", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
  gamepad: (fill="#ffffff", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm4.5 1c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
  music: (fill="#ffffff", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
  shield: (fill="#10b981", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>`,
  cash: (fill="#10b981", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-1H9.5v-2H13c.83 0 1.5-.67 1.5-1.5S13.83 10 13 10h-3V9h3.5V7H11V6h2v1h1.5v2H11c-.83 0-1.5.67-1.5 1.5S10.17 12 11 12h3v1h-3.5v2H13v1z"/></svg>`,
  truck: (fill="#f59e0b", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-7.5l1.96 2.5H17V11h2.5zm-1 7.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
  bolt: (fill="#ff1666", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`,
  star: (fill="#f59e0b", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
  lock: (fill="#c026d3", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>`
};

const getDefs = () => `
  <defs>
    <linearGradient id="bgStory1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06070c"/>
      <stop offset="30%" stop-color="#0d1124"/>
      <stop offset="70%" stop-color="#180b27"/>
      <stop offset="100%" stop-color="#070914"/>
    </linearGradient>

    <linearGradient id="bgStory2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811"/>
      <stop offset="40%" stop-color="#0a1526"/>
      <stop offset="80%" stop-color="#19102b"/>
      <stop offset="100%" stop-color="#04060d"/>
    </linearGradient>

    <linearGradient id="pinkCyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff1666"/>
      <stop offset="50%" stop-color="#d946ef"/>
      <stop offset="100%" stop-color="#00e5ff"/>
    </linearGradient>

    <linearGradient id="goldGreen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#00e5ff"/>
    </linearGradient>

    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>

    <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff1666"/>
      <stop offset="50%" stop-color="#c026d3"/>
      <stop offset="100%" stop-color="#00e5ff"/>
    </linearGradient>

    <linearGradient id="btnGradGold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="50%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#00e5ff"/>
    </linearGradient>

    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>
`;

// 1. BANNER 1 STORY (1080 x 1920) - RENTERS
const createBanner1Story = () => `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, sans-serif">
  ${getDefs()}

  <rect width="1080" height="1920" fill="url(#bgStory1)"/>
  <rect width="1080" height="1920" fill="url(#grid)"/>

  <circle cx="200" cy="350" r="300" fill="#ff1666" opacity="0.18" filter="blur(60px)"/>
  <circle cx="880" cy="850" r="350" fill="#00e5ff" opacity="0.15" filter="blur(70px)"/>
  <circle cx="300" cy="1450" r="320" fill="#c026d3" opacity="0.16" filter="blur(65px)"/>

  <g transform="translate(80, 90)">
    <rect width="390" height="60" rx="30" fill="#000000" fill-opacity="0.4" stroke="#ff1666" stroke-width="2" stroke-opacity="0.6"/>
    <polygon points="120,110 135,118 135,135 120,143 105,135 105,118" transform="translate(-85, -97)" fill="#ff1666"/>
    <text x="55" y="38" fill="#ffffff" font-size="24" font-weight="900" letter-spacing="1">localDen</text>
    <text x="175" y="38" fill="#00e5ff" font-size="20" font-weight="700" letter-spacing="1">• localden.online</text>
  </g>

  <g transform="translate(80, 180)">
    <rect width="440" height="46" rx="23" fill="url(#cardBg)" stroke="#00e5ff" stroke-width="1.5" stroke-opacity="0.5"/>
    <g transform="translate(18, 11)">${icons.bolt("#00e5ff", 24)}</g>
    <text x="52" y="29" fill="#00e5ff" font-size="19" font-weight="800" letter-spacing="1.5">BANGALORE GEAR RENTALS</text>
  </g>

  <g transform="translate(80, 310)">
    <text x="0" y="0" fill="#ffffff" font-size="64" font-weight="900" letter-spacing="2">WEEKEND IS</text>
    <text x="0" y="80" fill="url(#pinkCyan)" font-size="82" font-weight="900" letter-spacing="3">COMING!</text>
    <text x="0" y="140" fill="#94a3b8" font-size="28" font-weight="600">Why buy? Rent your dream setup for the weekend!</text>
  </g>

  <g transform="translate(80, 480)">
    <ellipse cx="460" cy="460" rx="420" ry="120" fill="none" stroke="url(#pinkCyan)" stroke-width="3" stroke-dasharray="10 15" opacity="0.7"/>
    <ellipse cx="460" cy="460" rx="360" ry="90" fill="#00e5ff" opacity="0.08" filter="blur(20px)"/>

    <image href="${ps5Img}" x="220" y="20" width="480" height="420"/>
    <image href="${djImg}" x="20" y="230" width="420" height="260"/>
    <image href="${guitarImg}" x="500" y="140" width="380" height="320"/>
    <image href="${vrImg}" x="380" y="320" width="260" height="190"/>

    <g transform="translate(0, 40)">
      <rect width="210" height="48" rx="24" fill="#060913" stroke="#ff1666" stroke-width="2"/>
      <g transform="translate(16, 12)">${icons.gamepad("#ff1666", 24)}</g>
      <text x="48" y="30" fill="#ffffff" font-size="18" font-weight="800">PS5 &amp; Xbox</text>
    </g>

    <g transform="translate(680, 70)">
      <rect width="220" height="48" rx="24" fill="#060913" stroke="#00e5ff" stroke-width="2"/>
      <g transform="translate(16, 12)">${icons.music("#00e5ff", 24)}</g>
      <text x="48" y="30" fill="#ffffff" font-size="18" font-weight="800">DJ &amp; Guitars</text>
    </g>

    <g transform="translate(640, 410)">
      <rect width="260" height="52" rx="26" fill="#ff1666" opacity="0.9"/>
      <g transform="translate(18, 14)">${icons.bolt("#ffffff", 24)}</g>
      <text x="48" y="33" fill="#ffffff" font-size="20" font-weight="900">FROM ₹199/DAY</text>
    </g>

    <g transform="translate(10, 420)">
      <rect width="260" height="52" rx="26" fill="#00e5ff" opacity="0.9"/>
      <g transform="translate(16, 14)">${icons.truck("#060913", 24)}</g>
      <text x="46" y="33" fill="#060913" font-size="18" font-weight="900">SAME DAY DELIVERY</text>
    </g>
  </g>

  <g transform="translate(80, 1080)">
    <rect width="920" height="420" rx="32" fill="url(#cardBg)" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2"/>
    <rect width="920" height="420" rx="32" fill="#0b1021" fill-opacity="0.6"/>

    <text x="50" y="65" fill="#ffffff" font-size="30" font-weight="800">WHY RENT FROM LOCALDEN?</text>

    <g transform="translate(50, 105)">
      <rect width="60" height="60" rx="18" fill="#ff1666" fill-opacity="0.2" stroke="#ff1666" stroke-width="2"/>
      <g transform="translate(15, 15)">${icons.gamepad("#ff1666", 30)}</g>
      <text x="80" y="30" fill="#ffffff" font-size="22" font-weight="700">Top-Tier Tech &amp; Consoles</text>
      <text x="80" y="55" fill="#94a3b8" font-size="18">PS5, Xbox, VR, Laptops &amp; 4K Displays</text>
    </g>

    <g transform="translate(500, 105)">
      <rect width="60" height="60" rx="18" fill="#00e5ff" fill-opacity="0.2" stroke="#00e5ff" stroke-width="2"/>
      <g transform="translate(15, 15)">${icons.music("#00e5ff", 30)}</g>
      <text x="80" y="30" fill="#ffffff" font-size="22" font-weight="700">Pro Audio &amp; Instruments</text>
      <text x="80" y="55" fill="#94a3b8" font-size="18">Pioneer DJ Decks, Guitars &amp; Mics</text>
    </g>

    <g transform="translate(50, 245)">
      <rect width="60" height="60" rx="18" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
      <g transform="translate(15, 15)">${icons.truck("#10b981", 30)}</g>
      <text x="80" y="30" fill="#ffffff" font-size="22" font-weight="700">Doorstep Express Delivery</text>
      <text x="80" y="55" fill="#94a3b8" font-size="18">Delivered &amp; picked up from home</text>
    </g>

    <g transform="translate(500, 245)">
      <rect width="60" height="60" rx="18" fill="#c026d3" fill-opacity="0.2" stroke="#c026d3" stroke-width="2"/>
      <g transform="translate(15, 15)">${icons.shield("#c026d3", 30)}</g>
      <text x="80" y="30" fill="#ffffff" font-size="22" font-weight="700">100% Verified &amp; Safe</text>
      <text x="80" y="55" fill="#94a3b8" font-size="18">Cleaned, tested &amp; sanitized gear</text>
    </g>
  </g>

  <g transform="translate(80, 1560)">
    <rect width="920" height="110" rx="30" fill="url(#btnGrad)"/>
    <text x="460" y="68" fill="#ffffff" font-size="34" font-weight="900" text-anchor="middle" letter-spacing="1">BOOK YOUR WEEKEND GEAR &#x2794;</text>

    <g transform="translate(0, 140)">
      <rect width="920" height="80" rx="24" fill="#04060f" stroke="#00e5ff" stroke-width="2"/>
      <g transform="translate(260, 24)">${icons.globe("#00e5ff", 32)}</g>
      <text x="480" y="50" fill="#00e5ff" font-size="32" font-weight="900" text-anchor="middle" letter-spacing="2">www.localden.online</text>
    </g>

    <g transform="translate(460, 260)">
      <text x="0" y="0" fill="#94a3b8" font-size="20" font-weight="600" text-anchor="middle">
        4.9/5 Rating • 1000+ Happy Gamers &amp; Musicians in Bangalore
      </text>
    </g>
  </g>
</svg>
`;

// 2. BANNER 1 POST (1080 x 1080) - RENTERS
const createBanner1Post = () => `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, sans-serif">
  ${getDefs()}

  <rect width="1080" height="1080" fill="url(#bgStory1)"/>
  <rect width="1080" height="1080" fill="url(#grid)"/>

  <circle cx="200" cy="200" r="250" fill="#ff1666" opacity="0.2" filter="blur(60px)"/>
  <circle cx="900" cy="500" r="280" fill="#00e5ff" opacity="0.18" filter="blur(70px)"/>

  <g transform="translate(60, 50)">
    <rect width="360" height="52" rx="26" fill="#000000" fill-opacity="0.5" stroke="#ff1666" stroke-width="2"/>
    <text x="35" y="34" fill="#ffffff" font-size="22" font-weight="900" letter-spacing="1">localDen</text>
    <text x="150" y="34" fill="#00e5ff" font-size="18" font-weight="700">• localden.online</text>
  </g>

  <g transform="translate(660, 50)">
    <rect width="360" height="52" rx="26" fill="url(#cardBg)" stroke="#00e5ff" stroke-width="1.5"/>
    <g transform="translate(25, 14)">${icons.bolt("#00e5ff", 22)}</g>
    <text x="195" y="33" fill="#00e5ff" font-size="18" font-weight="800" text-anchor="middle" letter-spacing="1">WEEKEND GEAR RENTALS</text>
  </g>

  <g transform="translate(60, 160)">
    <text x="0" y="45" fill="#ffffff" font-size="52" font-weight="900" letter-spacing="1">WEEKEND IS <tspan fill="url(#pinkCyan)">COMING!</tspan></text>
    <text x="0" y="85" fill="#94a3b8" font-size="22" font-weight="600">Rent PS5, Xbox, Guitars, DJ Decks &amp; VR from ₹199/day</text>
  </g>

  <g transform="translate(60, 260)">
    <rect width="960" height="450" rx="30" fill="url(#cardBg)" stroke="#ffffff" stroke-opacity="0.1" stroke-width="2"/>
    <rect width="960" height="450" rx="30" fill="#090d1c" fill-opacity="0.6"/>

    <ellipse cx="480" cy="400" rx="420" ry="45" fill="#00e5ff" opacity="0.1" filter="blur(15px)"/>

    <image href="${ps5Img}" x="120" y="10" width="380" height="330"/>
    <image href="${djImg}" x="20" y="170" width="350" height="230"/>
    <image href="${guitarImg}" x="520" y="80" width="340" height="280"/>
    <image href="${vrImg}" x="400" y="240" width="220" height="170"/>

    <g transform="translate(30, 30)">
      <rect width="180" height="40" rx="20" fill="#ff1666"/>
      <g transform="translate(18, 9)">${icons.gamepad("#ffffff", 22)}</g>
      <text x="105" y="26" fill="#ffffff" font-size="16" font-weight="900" text-anchor="middle">PS5 &amp; XBOX</text>
    </g>

    <g transform="translate(740, 30)">
      <rect width="190" height="40" rx="20" fill="#00e5ff"/>
      <g transform="translate(18, 9)">${icons.music("#060913", 22)}</g>
      <text x="110" y="26" fill="#060913" font-size="16" font-weight="900" text-anchor="middle">DJ &amp; GUITARS</text>
    </g>
  </g>

  <g transform="translate(60, 740)">
    <rect width="960" height="110" rx="24" fill="#0b1021" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.5"/>

    <g transform="translate(40, 35)">
      <g transform="translate(0, 0)">${icons.truck("#ff1666", 30)}</g>
      <text x="40" y="4" fill="#ffffff" font-size="19" font-weight="700">Same-Day Delivery</text>
      <text x="40" y="26" fill="#94a3b8" font-size="15">Doorstep in Bangalore</text>
    </g>

    <g transform="translate(360, 35)">
      <g transform="translate(0, 0)">${icons.shield("#00e5ff", 30)}</g>
      <text x="40" y="4" fill="#ffffff" font-size="19" font-weight="700">100% Verified Gear</text>
      <text x="40" y="26" fill="#94a3b8" font-size="15">Sanitized &amp; Tested</text>
    </g>

    <g transform="translate(670, 35)">
      <g transform="translate(0, 0)">${icons.cash("#10b981", 30)}</g>
      <text x="40" y="4" fill="#ffffff" font-size="19" font-weight="700">Starts ₹199/day</text>
      <text x="40" y="26" fill="#94a3b8" font-size="15">No Long Commitments</text>
    </g>
  </g>

  <g transform="translate(60, 880)">
    <rect width="480" height="90" rx="24" fill="url(#btnGrad)"/>
    <text x="240" y="55" fill="#ffffff" font-size="24" font-weight="900" text-anchor="middle">RENT FOR WEEKEND &#x2794;</text>

    <g transform="translate(510, 0)">
      <rect width="450" height="90" rx="24" fill="#04060f" stroke="#00e5ff" stroke-width="2"/>
      <g transform="translate(60, 29)">${icons.globe("#00e5ff", 30)}</g>
      <text x="240" y="55" fill="#00e5ff" font-size="24" font-weight="900" text-anchor="middle">www.localden.online</text>
    </g>
  </g>
</svg>
`;

// 3. BANNER 2 STORY (1080 x 1920) - OWNERS BENEFITS
const createBanner2Story = () => `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, sans-serif">
  ${getDefs()}

  <rect width="1080" height="1920" fill="url(#bgStory2)"/>
  <rect width="1080" height="1920" fill="url(#grid)"/>

  <circle cx="850" cy="300" r="320" fill="#10b981" opacity="0.16" filter="blur(70px)"/>
  <circle cx="200" cy="900" r="350" fill="#00e5ff" opacity="0.15" filter="blur(80px)"/>
  <circle cx="800" cy="1500" r="300" fill="#f59e0b" opacity="0.14" filter="blur(65px)"/>

  <g transform="translate(80, 90)">
    <rect width="390" height="60" rx="30" fill="#000000" fill-opacity="0.4" stroke="#10b981" stroke-width="2"/>
    <polygon points="120,110 135,118 135,135 120,143 105,135 105,118" transform="translate(-85, -97)" fill="#10b981"/>
    <text x="55" y="38" fill="#ffffff" font-size="24" font-weight="900" letter-spacing="1">localDen</text>
    <text x="175" y="38" fill="#10b981" font-size="20" font-weight="700" letter-spacing="1">• LENDER PARTNER</text>
  </g>

  <g transform="translate(80, 180)">
    <rect width="480" height="46" rx="23" fill="url(#cardBg)" stroke="#10b981" stroke-width="1.5"/>
    <g transform="translate(20, 11)">${icons.cash("#10b981", 24)}</g>
    <text x="54" y="29" fill="#10b981" font-size="19" font-weight="800" letter-spacing="1.5">PASSIVE INCOME FROM IDLE GEAR</text>
  </g>

  <g transform="translate(80, 310)">
    <text x="0" y="0" fill="#ffffff" font-size="58" font-weight="900" letter-spacing="1">PUT YOUR STUFF ONLINE</text>
    <text x="0" y="75" fill="url(#goldGreen)" font-size="58" font-weight="900" letter-spacing="1.5">&amp; GET UNMATCHED BENEFITS!</text>
    <text x="0" y="135" fill="#94a3b8" font-size="26" font-weight="600">Turn your unused PS5, Guitars, Cameras &amp; Tech into cash.</text>
  </g>

  <g transform="translate(80, 480)">
    <rect width="920" height="150" rx="28" fill="url(#cardBg)" stroke="#10b981" stroke-width="2.5"/>
    <rect width="920" height="150" rx="28" fill="#041814" fill-opacity="0.7"/>

    <g transform="translate(40, 40)">
      <text x="0" y="30" fill="#94a3b8" font-size="22" font-weight="700">ESTIMATED EARNING POTENTIAL</text>
      <text x="0" y="80" fill="#10b981" font-size="48" font-weight="900" letter-spacing="1">EARN UP TO ₹15,000 <tspan fill="#ffffff" font-size="28">/ MONTH</tspan></text>
    </g>

    <g transform="translate(680, 30)">
      <rect width="200" height="90" rx="20" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="1.5"/>
      <g transform="translate(84, 12)">${icons.shield("#10b981", 32)}</g>
      <text x="100" y="72" fill="#ffffff" font-size="16" font-weight="800" text-anchor="middle">100% SECURE</text>
    </g>
  </g>

  <g transform="translate(80, 660)">
    <text x="0" y="0" fill="#ffffff" font-size="30" font-weight="900" letter-spacing="1">TOP BENEFITS FOR LENDERS:</text>

    <!-- Benefit 1 -->
    <g transform="translate(0, 30)">
      <rect width="920" height="145" rx="24" fill="url(#cardBg)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
      <rect width="920" height="145" rx="24" fill="#07101f" fill-opacity="0.7"/>
      <rect width="10" height="145" rx="5" fill="#10b981"/>

      <g transform="translate(45, 30)">
        <circle cx="35" cy="40" r="35" fill="#10b981" fill-opacity="0.2"/>
        <g transform="translate(15, 20)">${icons.cash("#10b981", 40)}</g>
        <text x="90" y="34" fill="#ffffff" font-size="26" font-weight="800">1. High Passive Income</text>
        <text x="90" y="65" fill="#94a3b8" font-size="20">Monetize idle gadgets sitting in your drawer. Get paid directly to UPI.</text>
      </g>
    </g>

    <!-- Benefit 2 -->
    <g transform="translate(0, 195)">
      <rect width="920" height="145" rx="24" fill="url(#cardBg)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
      <rect width="920" height="145" rx="24" fill="#07101f" fill-opacity="0.7"/>
      <rect width="10" height="145" rx="5" fill="#00e5ff"/>

      <g transform="translate(45, 30)">
        <circle cx="35" cy="40" r="35" fill="#00e5ff" fill-opacity="0.2"/>
        <g transform="translate(15, 20)">${icons.shield("#00e5ff", 40)}</g>
        <text x="90" y="34" fill="#ffffff" font-size="26" font-weight="800">2. 100% KYC Verified Renters</text>
        <text x="90" y="65" fill="#94a3b8" font-size="20">Aadhaar/Govt ID verified renters + instant security deposit safety.</text>
      </g>
    </g>

    <!-- Benefit 3 -->
    <g transform="translate(0, 360)">
      <rect width="920" height="145" rx="24" fill="url(#cardBg)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
      <rect width="920" height="145" rx="24" fill="#07101f" fill-opacity="0.7"/>
      <rect width="10" height="145" rx="5" fill="#f59e0b"/>

      <g transform="translate(45, 30)">
        <circle cx="35" cy="40" r="35" fill="#f59e0b" fill-opacity="0.2"/>
        <g transform="translate(15, 20)">${icons.truck("#f59e0b", 40)}</g>
        <text x="90" y="34" fill="#ffffff" font-size="26" font-weight="800">3. Free Doorstep Logistics</text>
        <text x="90" y="65" fill="#94a3b8" font-size="20">We handle pickup, inspection, delivery and return right from your door.</text>
      </g>
    </g>

    <!-- Benefit 4 -->
    <g transform="translate(0, 525)">
      <rect width="920" height="145" rx="24" fill="url(#cardBg)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
      <rect width="920" height="145" rx="24" fill="#07101f" fill-opacity="0.7"/>
      <rect width="10" height="145" rx="5" fill="#c026d3"/>

      <g transform="translate(45, 30)">
        <circle cx="35" cy="40" r="35" fill="#c026d3" fill-opacity="0.2"/>
        <g transform="translate(15, 20)">${icons.lock("#c026d3", 40)}</g>
        <text x="90" y="34" fill="#ffffff" font-size="26" font-weight="800">4. Damage Cover &amp; Item Safety</text>
        <text x="90" y="65" fill="#94a3b8" font-size="20">Your gear is fully protected under localDen host safety agreement.</text>
      </g>
    </g>

    <!-- Benefit 5 -->
    <g transform="translate(0, 690)">
      <rect width="920" height="145" rx="24" fill="url(#cardBg)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
      <rect width="920" height="145" rx="24" fill="#07101f" fill-opacity="0.7"/>
      <rect width="10" height="145" rx="5" fill="#ff1666"/>

      <g transform="translate(45, 30)">
        <circle cx="35" cy="40" r="35" fill="#ff1666" fill-opacity="0.2"/>
        <g transform="translate(15, 20)">${icons.bolt("#ff1666", 40)}</g>
        <text x="90" y="34" fill="#ffffff" font-size="26" font-weight="800">5. 2-Min Free Listing</text>
        <text x="90" y="65" fill="#94a3b8" font-size="20">Zero upfront fees. Set your own prices &amp; availability whenever you want.</text>
      </g>
    </g>
  </g>

  <g transform="translate(80, 1560)">
    <rect width="920" height="110" rx="30" fill="url(#btnGradGold)"/>
    <text x="460" y="68" fill="#ffffff" font-size="34" font-weight="900" text-anchor="middle" letter-spacing="1">LIST YOUR GEAR TODAY &#x2794;</text>

    <g transform="translate(0, 140)">
      <rect width="920" height="80" rx="24" fill="#04060f" stroke="#10b981" stroke-width="2"/>
      <g transform="translate(260, 24)">${icons.globe("#10b981", 32)}</g>
      <text x="480" y="50" fill="#10b981" font-size="32" font-weight="900" text-anchor="middle" letter-spacing="2">www.localden.online</text>
    </g>

    <text x="460" y="260" fill="#94a3b8" font-size="20" font-weight="600" text-anchor="middle">
      Join 200+ Verified Gear Owners Earning Monthly in Bangalore
    </text>
  </g>
</svg>
`;

// 4. BANNER 2 POST (1080 x 1080) - OWNERS BENEFITS
const createBanner2Post = () => `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, sans-serif">
  ${getDefs()}

  <rect width="1080" height="1080" fill="url(#bgStory2)"/>
  <rect width="1080" height="1080" fill="url(#grid)"/>

  <circle cx="850" cy="250" r="280" fill="#10b981" opacity="0.18" filter="blur(60px)"/>
  <circle cx="200" cy="800" r="280" fill="#00e5ff" opacity="0.16" filter="blur(70px)"/>

  <g transform="translate(60, 45)">
    <rect width="360" height="50" rx="25" fill="#000000" fill-opacity="0.5" stroke="#10b981" stroke-width="2"/>
    <text x="35" y="33" fill="#ffffff" font-size="22" font-weight="900" letter-spacing="1">localDen</text>
    <text x="150" y="33" fill="#10b981" font-size="18" font-weight="700">• LENDER PARTNER</text>
  </g>

  <g transform="translate(660, 45)">
    <rect width="360" height="50" rx="25" fill="url(#cardBg)" stroke="#10b981" stroke-width="1.5"/>
    <g transform="translate(25, 13)">${icons.cash("#10b981", 24)}</g>
    <text x="195" y="32" fill="#10b981" font-size="17" font-weight="800" text-anchor="middle">EARN PASSIVE INCOME</text>
  </g>

  <g transform="translate(60, 145)">
    <text x="0" y="45" fill="#ffffff" font-size="48" font-weight="900">PUT YOUR STUFF ONLINE</text>
    <text x="0" y="90" fill="url(#goldGreen)" font-size="42" font-weight="900">&amp; UNLOCK 5 GREAT BENEFITS!</text>
  </g>

  <g transform="translate(60, 270)">
    <!-- Benefit 1 -->
    <g transform="translate(0, 0)">
      <rect width="465" height="135" rx="20" fill="#07101f" fill-opacity="0.8" stroke="#10b981" stroke-width="1.5"/>
      <circle cx="45" cy="50" r="28" fill="#10b981" fill-opacity="0.2"/>
      <g transform="translate(30, 35)">${icons.cash("#10b981", 30)}</g>
      <text x="90" y="42" fill="#ffffff" font-size="20" font-weight="800">Earn Up To ₹15,000/mo</text>
      <text x="90" y="70" fill="#94a3b8" font-size="15">Turn unused tech into steady cash</text>
    </g>

    <!-- Benefit 2 -->
    <g transform="translate(495, 0)">
      <rect width="465" height="135" rx="20" fill="#07101f" fill-opacity="0.8" stroke="#00e5ff" stroke-width="1.5"/>
      <circle cx="45" cy="50" r="28" fill="#00e5ff" fill-opacity="0.2"/>
      <g transform="translate(30, 35)">${icons.shield("#00e5ff", 30)}</g>
      <text x="90" y="42" fill="#ffffff" font-size="20" font-weight="800">100% KYC Verified Renters</text>
      <text x="90" y="70" fill="#94a3b8" font-size="15">Aadhaar verified &amp; deposit safe</text>
    </g>

    <!-- Benefit 3 -->
    <g transform="translate(0, 155)">
      <rect width="465" height="135" rx="20" fill="#07101f" fill-opacity="0.8" stroke="#f59e0b" stroke-width="1.5"/>
      <circle cx="45" cy="50" r="28" fill="#f59e0b" fill-opacity="0.2"/>
      <g transform="translate(30, 35)">${icons.truck("#f59e0b", 30)}</g>
      <text x="90" y="42" fill="#ffffff" font-size="20" font-weight="800">Free Doorstep Pickup</text>
      <text x="90" y="70" fill="#94a3b8" font-size="15">Full pickup &amp; return handled by us</text>
    </g>

    <!-- Benefit 4 -->
    <g transform="translate(495, 155)">
      <rect width="465" height="135" rx="20" fill="#07101f" fill-opacity="0.8" stroke="#c026d3" stroke-width="1.5"/>
      <circle cx="45" cy="50" r="28" fill="#c026d3" fill-opacity="0.2"/>
      <g transform="translate(30, 35)">${icons.lock("#c026d3", 30)}</g>
      <text x="90" y="42" fill="#ffffff" font-size="20" font-weight="800">Damage Protection</text>
      <text x="90" y="70" fill="#94a3b8" font-size="15">Host safety agreement protection</text>
    </g>

    <!-- Benefit 5 -->
    <g transform="translate(0, 310)">
      <rect width="960" height="120" rx="20" fill="#07101f" fill-opacity="0.8" stroke="#ff1666" stroke-width="1.5"/>
      <circle cx="45" cy="50" r="28" fill="#ff1666" fill-opacity="0.2"/>
      <g transform="translate(30, 35)">${icons.bolt("#ff1666", 30)}</g>
      <text x="90" y="42" fill="#ffffff" font-size="21" font-weight="800">2-Min Free Listing with 0% Initial Commission</text>
      <text x="90" y="70" fill="#94a3b8" font-size="16">List PS5, Guitars, Cameras, DJ Decks &amp; Laptops anytime</text>
    </g>
  </g>

  <g transform="translate(60, 730)">
    <rect width="960" height="130" rx="24" fill="url(#cardBg)" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
    <image href="${ps5Img}" x="30" y="-20" width="160" height="140"/>
    <image href="${djImg}" x="260" y="10" width="200" height="110"/>
    <image href="${guitarImg}" x="550" y="-10" width="170" height="130"/>
    <image href="${vrImg}" x="780" y="15" width="140" height="100"/>
  </g>

  <g transform="translate(60, 890)">
    <rect width="480" height="90" rx="24" fill="url(#btnGradGold)"/>
    <text x="240" y="55" fill="#ffffff" font-size="24" font-weight="900" text-anchor="middle">START EARNING TODAY &#x2794;</text>

    <g transform="translate(510, 0)">
      <rect width="450" height="90" rx="24" fill="#04060f" stroke="#10b981" stroke-width="2"/>
      <g transform="translate(60, 29)">${icons.globe("#10b981", 30)}</g>
      <text x="240" y="55" fill="#10b981" font-size="24" font-weight="900" text-anchor="middle">www.localden.online</text>
    </g>
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

console.log('Re-generating updated banners...');
renderAndSave(createBanner1Story(), 'poster1_weekend_story.png');
renderAndSave(createBanner1Post(), 'poster1_weekend_post.png');
renderAndSave(createBanner2Story(), 'poster2_benefits_story.png');
renderAndSave(createBanner2Post(), 'poster2_benefits_post.png');

console.log('All 4 banners re-generated with perfect alignment!');
