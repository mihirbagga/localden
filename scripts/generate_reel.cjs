#!/usr/bin/env node

/**
 * 🎬 localDen Viral Instagram Reel Generator
 * 
 * Creates a high-impact, fast-paced, 10-second Gen-Z Instagram Reel MP4 (1080x1920)
 * featuring the exact logo & text: [Hexagon] लोकल DEN (Pink लोकल + Cyan DEN).
 */

const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
const scratchDir = path.join(process.cwd(), 'scratch');

if (!fs.existsSync(outDirPublic)) fs.mkdirSync(outDirPublic, { recursive: true });
if (!fs.existsSync(outDirArtifacts)) fs.mkdirSync(outDirArtifacts, { recursive: true });
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

const getDefs = () => `
  <defs>
    <linearGradient id="bgReel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#05060c"/>
      <stop offset="35%" stop-color="#0c0e20"/>
      <stop offset="70%" stop-color="#140724"/>
      <stop offset="100%" stop-color="#04050a"/>
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
      <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1.2"/>
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
  gamepad: (fill="#ffffff", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm4.5 1c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
  music: (fill="#ffffff", size=24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`
};

const getBrandHeader = () => `
  <g transform="translate(0, 0)">
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
    <text x="95" y="52" font-size="46" font-weight="900" font-family="'Kohinoor Devanagari', 'Devanagari Sangam MN', sans-serif">
      <tspan fill="#ff2e6d">लोकल </tspan>
      <tspan fill="#00e5ff" font-family="system-ui, -apple-system, sans-serif" letter-spacing="1">DEN</tspan>
    </text>
  </g>
`;

// SCENE 1
const renderScene1 = () => `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" font-family="'Kohinoor Devanagari', 'Devanagari Sangam MN', system-ui, -apple-system, sans-serif">
  ${getDefs()}
  <rect width="1080" height="1920" fill="url(#bgReel)"/>
  <rect width="1080" height="1920" fill="url(#acidGrid)"/>

  <circle cx="200" cy="350" r="350" fill="#ff2e6d" opacity="0.3" filter="blur(70px)"/>
  <circle cx="850" cy="850" r="350" fill="#e2f80d" opacity="0.22" filter="blur(80px)"/>

  <g transform="translate(80, 100)">
    <rect width="420" height="74" rx="37" fill="#04050a" fill-opacity="0.9" stroke="url(#hexGradient)" stroke-width="2.5"/>
    <g transform="translate(25, 8)">${getBrandHeader()}</g>
  </g>

  <g transform="translate(80, 260)">
    <rect width="360" height="54" rx="27" fill="#ff2e6d" fill-opacity="0.2" stroke="#ff2e6d" stroke-width="2"/>
    <g transform="translate(20, 15)">${icons.fire("#ff2e6d", 24)}</g>
    <text x="56" y="36" fill="#ff2e6d" font-size="22" font-weight="900" letter-spacing="1">UNPOPULAR OPINION</text>
  </g>

  <g transform="translate(80, 420)">
    <g>
      <text x="0" y="40" fill="#94a3b8" font-size="44" font-weight="800">50K KA PS5 BUY KARNA?</text>
      <line x1="0" y1="26" x2="570" y2="26" stroke="#ff2e6d" stroke-width="7" stroke-linecap="round"/>
      <rect x="590" y="-4" width="160" height="50" rx="12" fill="#ff2e6d"/>
      <text x="670" y="32" fill="#ffffff" font-size="24" font-weight="900" text-anchor="middle">LMAO NO</text>
    </g>

    <text x="0" y="140" fill="#ffffff" font-size="76" font-weight="900">KHARIDNA KYU HAI?</text>
    <text x="0" y="240" fill="url(#acidYellowGreen)" font-size="94" font-weight="900" letter-spacing="2">RENT KARO!</text>
    <text x="0" y="320" fill="#ffffff" font-size="34" font-weight="700">Starting @ ₹199/day for the weekend!</text>
  </g>

  <g transform="translate(80, 840)">
    <ellipse cx="460" cy="400" rx="420" ry="80" fill="#00e5ff" opacity="0.15" filter="blur(25px)"/>
    <image href="${ps5Img}" x="180" y="0" width="550" height="480"/>

    <g transform="translate(30, 80) rotate(-6)">
      <rect width="320" height="74" rx="18" fill="url(#badgeYellow)" stroke="#000000" stroke-width="4"/>
      <g transform="translate(18, 20)">${icons.bolt("#000000", 34)}</g>
      <text x="62" y="50" fill="#000000" font-size="28" font-weight="900">STARTING ₹199/DAY</text>
    </g>
  </g>

  <g transform="translate(80, 1600)">
    <rect width="920" height="110" rx="30" fill="url(#btnGrad)"/>
    <text x="460" y="68" fill="#ffffff" font-size="36" font-weight="900" text-anchor="middle">LEVEL UP YOUR WEEKEND &#x2794;</text>
  </g>
</svg>
`;

// SCENE 2
const renderScene2 = () => `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" font-family="'Kohinoor Devanagari', 'Devanagari Sangam MN', system-ui, -apple-system, sans-serif">
  ${getDefs()}
  <rect width="1080" height="1920" fill="url(#bgReel)"/>
  <rect width="1080" height="1920" fill="url(#acidGrid)"/>

  <circle cx="850" cy="400" r="350" fill="#00e5ff" opacity="0.25" filter="blur(75px)"/>
  <circle cx="200" cy="1200" r="350" fill="#9333ea" opacity="0.25" filter="blur(75px)"/>

  <g transform="translate(80, 100)">
    <rect width="420" height="74" rx="37" fill="#04050a" fill-opacity="0.9" stroke="url(#hexGradient)" stroke-width="2.5"/>
    <g transform="translate(25, 8)">${getBrandHeader()}</g>
  </g>

  <g transform="translate(80, 230)">
    <rect width="450" height="52" rx="26" fill="#00e5ff" fill-opacity="0.15" stroke="#00e5ff" stroke-width="2"/>
    <g transform="translate(20, 14)">${icons.gamepad("#00e5ff", 24)}</g>
    <text x="56" y="35" fill="#00e5ff" font-size="21" font-weight="900" letter-spacing="1">WEEKEND FIFA TOURNAMENT</text>
  </g>

  <g transform="translate(80, 360)">
    <text x="0" y="50" fill="#ffffff" font-size="68" font-weight="900">PS5 SETUP DELIVERED</text>
    <text x="0" y="140" fill="url(#acidYellowGreen)" font-size="82" font-weight="900">TO YOUR DOORSTEP!</text>
    <text x="0" y="210" fill="#94a3b8" font-size="30" font-weight="600">Dual Controllers • 4K HDMI • Pre-loaded Games</text>
  </g>

  <g transform="translate(80, 640)">
    <ellipse cx="460" cy="460" rx="420" ry="100" fill="#00e5ff" opacity="0.18" filter="blur(25px)"/>
    <image href="${ps5Img}" x="150" y="20" width="580" height="500"/>
    <image href="${vrImg}" x="480" y="340" width="350" height="250"/>

    <g transform="translate(20, 480)">
      <rect width="420" height="80" rx="20" fill="#0b1329" stroke="#00e5ff" stroke-width="3"/>
      <text x="30" y="52" fill="#ffffff" font-size="30" font-weight="900">🎮 2 CONTROLLERS INCL.</text>
    </g>
  </g>

  <g transform="translate(80, 1600)">
    <rect width="920" height="110" rx="30" fill="url(#btnGrad)"/>
    <text x="460" y="68" fill="#ffffff" font-size="36" font-weight="900" text-anchor="middle">RENT FOR THE WEEKEND &#x2794;</text>
  </g>
</svg>
`;

// SCENE 3
const renderScene3 = () => `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" font-family="'Kohinoor Devanagari', 'Devanagari Sangam MN', system-ui, -apple-system, sans-serif">
  ${getDefs()}
  <rect width="1080" height="1920" fill="url(#bgReel)"/>
  <rect width="1080" height="1920" fill="url(#acidGrid)"/>

  <circle cx="250" cy="400" r="350" fill="#ff2e6d" opacity="0.25" filter="blur(75px)"/>
  <circle cx="850" cy="1100" r="350" fill="#e2f80d" opacity="0.2" filter="blur(80px)"/>

  <g transform="translate(80, 100)">
    <rect width="420" height="74" rx="37" fill="#04050a" fill-opacity="0.9" stroke="url(#hexGradient)" stroke-width="2.5"/>
    <g transform="translate(25, 8)">${getBrandHeader()}</g>
  </g>

  <g transform="translate(80, 230)">
    <rect width="420" height="52" rx="26" fill="#ff2e6d" fill-opacity="0.15" stroke="#ff2e6d" stroke-width="2"/>
    <g transform="translate(20, 14)">${icons.music("#ff2e6d", 24)}</g>
    <text x="56" y="35" fill="#ff2e6d" font-size="21" font-weight="900" letter-spacing="1">HOST THE SICKEST PARTY</text>
  </g>

  <g transform="translate(80, 360)">
    <text x="0" y="50" fill="#ffffff" font-size="68" font-weight="900">PIONEER DJ DECKS &amp;</text>
    <text x="0" y="140" fill="url(#acidYellowGreen)" font-size="82" font-weight="900">GUITARS ON RENT!</text>
    <text x="0" y="210" fill="#94a3b8" font-size="30" font-weight="600">Turn your living room into a concert stage.</text>
  </g>

  <g transform="translate(80, 650)">
    <ellipse cx="460" cy="420" rx="420" ry="100" fill="#ff2e6d" opacity="0.15" filter="blur(25px)"/>
    <image href="${djImg}" x="0" y="80" width="540" height="340"/>
    <image href="${guitarImg}" x="500" y="0" width="400" height="500"/>

    <g transform="translate(20, 480) rotate(-3)">
      <rect width="360" height="74" rx="18" fill="url(#badgeYellow)" stroke="#000000" stroke-width="4"/>
      <text x="30" y="50" fill="#000000" font-size="28" font-weight="900">DJ GEAR FROM ₹299/DAY</text>
    </g>
  </g>

  <g transform="translate(80, 1600)">
    <rect width="920" height="110" rx="30" fill="url(#btnGrad)"/>
    <text x="460" y="68" fill="#ffffff" font-size="36" font-weight="900" text-anchor="middle">RENT DJ &amp; GUITARS NOW &#x2794;</text>
  </g>
</svg>
`;

// SCENE 4
const renderScene4 = () => `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" font-family="'Kohinoor Devanagari', 'Devanagari Sangam MN', system-ui, -apple-system, sans-serif">
  ${getDefs()}
  <rect width="1080" height="1920" fill="url(#bgReel)"/>
  <rect width="1080" height="1920" fill="url(#acidGrid)"/>

  <circle cx="540" cy="600" r="400" fill="#9333ea" opacity="0.25" filter="blur(80px)"/>

  <g transform="translate(80, 100)">
    <rect width="420" height="74" rx="37" fill="#04050a" fill-opacity="0.9" stroke="url(#hexGradient)" stroke-width="2.5"/>
    <g transform="translate(25, 8)">${getBrandHeader()}</g>
  </g>

  <g transform="translate(80, 260)">
    <text x="0" y="60" fill="#ffffff" font-size="64" font-weight="900">WHY BANGALORE LOVES</text>
    <text x="0" y="150" font-size="82" font-weight="900">
      <tspan fill="#ff2e6d">लोकल </tspan><tspan fill="#00e5ff">DEN</tspan>
    </text>
  </g>

  <g transform="translate(80, 520)">
    <g transform="translate(0, 0)">
      <rect width="920" height="220" rx="30" fill="#090f24" stroke="#ff2e6d" stroke-width="2.5"/>
      <g transform="translate(50, 45)">
        <circle cx="40" cy="40" r="40" fill="#ff2e6d" fill-opacity="0.2"/>
        <g transform="translate(24, 24)">${icons.bolt("#ff2e6d", 32)}</g>
        <text x="110" y="38" fill="#ffffff" font-size="32" font-weight="900">Same-Day Doorstep Drop</text>
        <text x="110" y="80" fill="#94a3b8" font-size="24">Delivered straight to your flat or PG in Bangalore.</text>
      </g>
    </g>

    <g transform="translate(0, 260)">
      <rect width="920" height="220" rx="30" fill="#090f24" stroke="#00e5ff" stroke-width="2.5"/>
      <g transform="translate(50, 45)">
        <circle cx="40" cy="40" r="40" fill="#00e5ff" fill-opacity="0.2"/>
        <g transform="translate(24, 24)">${icons.check("#00e5ff", 32)}</g>
        <text x="110" y="38" fill="#ffffff" font-size="32" font-weight="900">100% Verified Hardware</text>
        <text x="110" y="80" fill="#94a3b8" font-size="24">Tested, sanitized, pre-loaded and ready to plug &amp; play.</text>
      </g>
    </g>

    <g transform="translate(0, 520)">
      <rect width="920" height="220" rx="30" fill="#090f24" stroke="#e2f80d" stroke-width="2.5"/>
      <g transform="translate(50, 45)">
        <circle cx="40" cy="40" r="40" fill="#e2f80d" fill-opacity="0.2"/>
        <g transform="translate(24, 24)">${icons.check("#e2f80d", 32)}</g>
        <text x="110" y="38" fill="#ffffff" font-size="32" font-weight="900">Zero Deposit Drama</text>
        <text x="110" y="80" fill="#94a3b8" font-size="24">Instant KYC verification. No high security deposits!</text>
      </g>
    </g>
  </g>

  <g transform="translate(80, 1600)">
    <rect width="920" height="110" rx="30" fill="url(#btnGrad)"/>
    <text x="460" y="68" fill="#ffffff" font-size="36" font-weight="900" text-anchor="middle">SEE ALL GEAR &#x2794;</text>
  </g>
</svg>
`;

// SCENE 5
const renderScene5 = () => `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" font-family="'Kohinoor Devanagari', 'Devanagari Sangam MN', system-ui, -apple-system, sans-serif">
  ${getDefs()}
  <rect width="1080" height="1920" fill="url(#bgReel)"/>
  <rect width="1080" height="1920" fill="url(#acidGrid)"/>

  <circle cx="540" cy="700" r="450" fill="#ff2e6d" opacity="0.25" filter="blur(80px)"/>
  <circle cx="540" cy="1200" r="450" fill="#00e5ff" opacity="0.25" filter="blur(80px)"/>

  <!-- Giant Exact Brand Logo in Center -->
  <g transform="translate(540, 360)">
    <g transform="translate(-60, -80) scale(0.4)">
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

    <text x="0" y="160" font-size="94" font-weight="900" text-anchor="middle">
      <tspan fill="#ff2e6d">लोकल </tspan><tspan fill="#00e5ff">DEN</tspan>
    </text>
    <text x="0" y="225" fill="#ffffff" font-size="32" font-weight="800" text-anchor="middle">BANGALORE GEAR RENTALS</text>
  </g>

  <!-- Big Callout Box -->
  <g transform="translate(80, 680)">
    <rect width="920" height="240" rx="32" fill="#0b1227" stroke="#e2f80d" stroke-width="3"/>
    <g transform="translate(460, 75)">
      <text x="0" y="0" fill="#e2f80d" font-size="44" font-weight="900" text-anchor="middle">COMMENT "PS5"</text>
      <text x="0" y="55" fill="#ffffff" font-size="32" font-weight="800" text-anchor="middle">FOR 20% OFF YOUR 1ST BOOKING!</text>
      <text x="0" y="105" fill="#94a3b8" font-size="24" font-weight="600" text-anchor="middle">Direct link will be sent to your DM 📩</text>
    </g>
  </g>

  <!-- CTA Button & Website Link -->
  <g transform="translate(80, 1020)">
    <rect width="920" height="120" rx="35" fill="url(#btnGrad)"/>
    <text x="460" y="75" fill="#ffffff" font-size="40" font-weight="900" text-anchor="middle">BOOK YOUR SETUP NOW &#x2794;</text>

    <!-- Website URL -->
    <g transform="translate(0, 160)">
      <rect width="920" height="96" rx="28" fill="#04060f" stroke="#00e5ff" stroke-width="3"/>
      <g transform="translate(240, 30)">${icons.globe("#00e5ff", 36)}</g>
      <text x="490" y="62" fill="#00e5ff" font-size="38" font-weight="900" text-anchor="middle">www.localden.online</text>
    </g>
  </g>

  <g transform="translate(540, 1500)">
    <text x="0" y="0" fill="#64748b" font-size="24" font-weight="700" text-anchor="middle">
      Koramangala • Indiranagar • HSR Layout • Whitefield • Bellandur
    </text>
    <text x="0" y="45" fill="#475569" font-size="20" font-weight="600" text-anchor="middle">
      Delivered Same-Day in Bangalore 🚀
    </text>
  </g>
</svg>
`;

const renderScene = (svgContent, filepath) => {
  const resvg = new Resvg(svgContent, { font: { loadSystemFonts: true } });
  fs.writeFileSync(filepath, resvg.render().asPng());
};

console.log('Rendering 5 high-impact Reel Scenes with exact brand logo...');
const s1Path = path.join(scratchDir, 'scene1.png');
const s2Path = path.join(scratchDir, 'scene2.png');
const s3Path = path.join(scratchDir, 'scene3.png');
const s4Path = path.join(scratchDir, 'scene4.png');
const s5Path = path.join(scratchDir, 'scene5.png');

renderScene(renderScene1(), s1Path);
renderScene(renderScene2(), s2Path);
renderScene(renderScene3(), s3Path);
renderScene(renderScene4(), s4Path);
renderScene(renderScene5(), s5Path);
console.log('All 5 scenes rendered to PNG with exact brand logo.');

console.log('Compiling 10-second Instagram Reel MP4 with transitions & cyber audio beat...');

const outReelPublic = path.join(outDirPublic, 'localden_viral_reel.mp4');
const outReelArtifacts = path.join(outDirArtifacts, 'localden_viral_reel.mp4');

const filterComplex = `
  [0:v]loop=loop=55:size=1:start=0,setpts=PTS-STARTPTS[v0];
  [1:v]loop=loop=55:size=1:start=0,setpts=PTS-STARTPTS[v1];
  [2:v]loop=loop=55:size=1:start=0,setpts=PTS-STARTPTS[v2];
  [3:v]loop=loop=55:size=1:start=0,setpts=PTS-STARTPTS[v3];
  [4:v]loop=loop=70:size=1:start=0,setpts=PTS-STARTPTS[v4];
  [v0][v1]xfade=transition=slideleft:duration=0.35:offset=1.9[x1];
  [x1][v2]xfade=transition=zoomin:duration=0.35:offset=3.8[x2];
  [x2][v3]xfade=transition=wiperight:duration=0.35:offset=5.7[x3];
  [x3][v4]xfade=transition=fade:duration=0.35:offset=7.6,format=yuv420p[vout]
`;

const audioFilter = "aevalsrc='0.85*sin(2*PI*58*t)*exp(-20*mod(t,0.5)) + 0.35*sin(2*PI*(220+40*sin(12*t))*t)*exp(-12*mod(t,0.25)) + 0.08*random(0)*exp(-30*mod(t,0.25))':s=44100:d=10";

const ffmpegCmd = [
  '/opt/homebrew/bin/ffmpeg -y',
  `-r 25 -i "${s1Path}"`,
  `-r 25 -i "${s2Path}"`,
  `-r 25 -i "${s3Path}"`,
  `-r 25 -i "${s4Path}"`,
  `-r 25 -i "${s5Path}"`,
  `-f lavfi -i "${audioFilter}"`,
  `-filter_complex "${filterComplex}"`,
  '-map "[vout]" -map 5:a',
  '-c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p',
  '-c:a aac -b:a 192k',
  '-t 10.2',
  `"${outReelPublic}"`
].join(' ');

execSync(ffmpegCmd, { stdio: 'inherit' });
fs.copyFileSync(outReelPublic, outReelArtifacts);

// Also refresh thumbnail
execSync(`/opt/homebrew/bin/ffmpeg -y -ss 00:00:01.0 -i "${outReelPublic}" -vframes 1 -q:v 2 "${path.join(outDirPublic, 'localden_reel_thumb.png')}"`);
fs.copyFileSync(path.join(outDirPublic, 'localden_reel_thumb.png'), path.join(outDirArtifacts, 'localden_reel_thumb.png'));

console.log('🎉 Updated Instagram Reel generated successfully at:');
console.log(' - ' + outReelPublic);
console.log(' - ' + outReelArtifacts);
