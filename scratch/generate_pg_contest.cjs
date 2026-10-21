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

const outDirPublic = path.join(process.cwd(), 'public/banners');
const outDirArtifacts = '/Users/mihirbagga/.gemini/antigravity/brain/ec781e6b-d257-42d4-a9bc-42bd02387c23';

if (!fs.existsSync(outDirPublic)) fs.mkdirSync(outDirPublic, { recursive: true });
if (!fs.existsSync(outDirArtifacts)) fs.mkdirSync(outDirArtifacts, { recursive: true });

const getDefs = () => `
  <defs>
    <linearGradient id="bgContest" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060710"/>
      <stop offset="30%" stop-color="#0f0c22"/>
      <stop offset="65%" stop-color="#1b082b"/>
      <stop offset="100%" stop-color="#070914"/>
    </linearGradient>

    <linearGradient id="acidYellowGreen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e2f80d"/>
      <stop offset="100%" stop-color="#00ff87"/>
    </linearGradient>

    <linearGradient id="pinkOrange" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff2e6d"/>
      <stop offset="100%" stop-color="#ff8c00"/>
    </linearGradient>

    <linearGradient id="cyanBlue" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00e5ff"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>

    <linearGradient id="goldTrophy" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe600"/>
      <stop offset="50%" stop-color="#ffb800"/>
      <stop offset="100%" stop-color="#ff8800"/>
    </linearGradient>

    <pattern id="gridPat" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1.2"/>
    </pattern>

    <linearGradient id="hexGradient" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#ff2e6d" />
      <stop offset="50%" stop-color="#bf24c7" />
      <stop offset="100%" stop-color="#00e5ff" />
    </linearGradient>
  </defs>
`;

// Exact Brand Header SVG
const getBrandHeader = (scale = 1.0) => `
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

/**
 * 1. Square Post (1080 x 1080)
 */
const generateSquareContest = () => {
  return `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    ${getDefs()}

    <!-- Background -->
    <rect width="1080" height="1080" fill="url(#bgContest)"/>
    <rect width="1080" height="1080" fill="url(#gridPat)"/>

    <!-- Glow Orbs -->
    <circle cx="540" cy="480" r="320" fill="#9333ea" opacity="0.22" filter="blur(70px)"/>
    <circle cx="200" cy="250" r="240" fill="#00e5ff" opacity="0.14" filter="blur(60px)"/>
    <circle cx="880" cy="700" r="260" fill="#ff2e6d" opacity="0.18" filter="blur(70px)"/>

    <!-- Top Bar -->
    <g transform="translate(60, 56)">
      ${getBrandHeader(1.0)}

      <!-- 48H Giveaway Pill -->
      <g transform="translate(630, 2)">
        <rect width="330" height="52" rx="26" fill="#e2f80d"/>
        <text x="165" y="34" font-size="20" font-weight="900" fill="#000000" text-anchor="middle" font-family="system-ui, sans-serif" letter-spacing="1.5">
          ⚡ 48-HOUR GIVEAWAY ⚡
        </text>
      </g>
    </g>

    <!-- Target Audience Pill -->
    <g transform="translate(60, 150)">
      <rect width="520" height="42" rx="21" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5"/>
      <text x="260" y="27" font-size="17" font-weight="800" fill="#00e5ff" text-anchor="middle" font-family="system-ui, sans-serif" letter-spacing="1.2">
        📍 BANGALORE PG &amp; FLATMATES SPECIAL
      </text>
    </g>

    <!-- Main Punchy Hook Headline -->
    <g transform="translate(60, 235)">
      <text font-family="system-ui, -apple-system, sans-serif">
        <tspan x="0" y="0" font-size="44" font-weight="800" fill="#ffffff">TAG 3 FLATMATES YOU'D</tspan>
        <tspan x="0" y="70" font-size="68" font-weight="950" fill="url(#acidYellowGreen)" letter-spacing="1.5">DESTROY IN FIFA 24!</tspan>
      </text>
    </g>

    <!-- Prize Callout Subtitle -->
    <g transform="translate(60, 365)">
      <rect width="960" height="64" rx="16" fill="#ff2e6d" fill-opacity="0.14" stroke="#ff2e6d" stroke-width="2"/>
      <text x="480" y="41" font-size="23" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="system-ui, sans-serif">
        ★ Winner gets a <tspan fill="#e2f80d">FREE PS5 SETUP</tspan> delivered this Saturday! (₹0 Rent)
      </text>
    </g>

    <!-- Center Stage: PS5 Image & Relatable Badges -->
    <g transform="translate(60, 455)">
      <!-- Left Card: What Winner Gets -->
      <g transform="translate(0, 0)">
        <rect width="440" height="280" rx="24" fill="#0d1124" fill-opacity="0.85" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1.5"/>

        <text x="32" y="48" font-size="20" font-weight="900" fill="#00e5ff" font-family="system-ui, sans-serif" letter-spacing="1">
          WHAT YOU GET (DELIVERED FREE):
        </text>

        <!-- Bullet 1 -->
        <g transform="translate(32, 85)">
          <circle cx="12" cy="12" r="12" fill="#00ff87"/>
          <path d="M7 12l3 3 7-7" stroke="#000000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <text x="36" y="18" font-size="20" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">
            PlayStation 5 Console (Disc)
          </text>
        </g>

        <!-- Bullet 2 -->
        <g transform="translate(32, 135)">
          <circle cx="12" cy="12" r="12" fill="#00ff87"/>
          <path d="M7 12l3 3 7-7" stroke="#000000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <text x="36" y="18" font-size="20" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">
            2x DualSense Wireless Controllers
          </text>
        </g>

        <!-- Bullet 3 -->
        <g transform="translate(32, 185)">
          <circle cx="12" cy="12" r="12" fill="#00ff87"/>
          <path d="M7 12l3 3 7-7" stroke="#000000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <text x="36" y="18" font-size="20" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">
            EA Sports FC / FIFA 24 + Mortal Kombat
          </text>
        </g>

        <!-- Bullet 4 -->
        <g transform="translate(32, 235)">
          <circle cx="12" cy="12" r="12" fill="#00ff87"/>
          <path d="M7 12l3 3 7-7" stroke="#000000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <text x="36" y="18" font-size="20" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">
            Entire Weekend (Sat Morning - Sun Night)
          </text>
        </g>
      </g>

      <!-- Right: PS5 Console Glow & Image -->
      <g transform="translate(470, -20)">
        <ellipse cx="240" cy="160" rx="180" ry="80" fill="#00e5ff" opacity="0.25" filter="blur(35px)"/>
        ${ps5Img ? `<image href="${ps5Img}" x="40" y="-15" width="400" height="310" preserveAspectRatio="xMidYMid meet"/>` : ''}

        <!-- Funny Trash Talk Sticker -->
        <g transform="translate(190, 205)">
          <rect width="280" height="48" rx="24" fill="#ff2e6d"/>
          <text x="140" y="31" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="system-ui, sans-serif">
            &quot;Bhai Controller Kharab Tha!&quot;
          </text>
        </g>
      </g>
    </g>

    <!-- 3 Simple Rules to Enter (Gamified) -->
    <g transform="translate(60, 765)">
      <rect width="960" height="175" rx="24" fill="#121630" stroke="#00e5ff" stroke-opacity="0.35" stroke-width="2"/>

      <!-- Header -->
      <text x="40" y="44" font-size="20" font-weight="900" fill="#e2f80d" font-family="system-ui, sans-serif" letter-spacing="1.5">
        ⚡ HOW TO ENTER IN 10 SECONDS:
      </text>

      <!-- Rule 1 -->
      <g transform="translate(40, 68)">
        <rect width="280" height="84" rx="16" fill="#1b2042" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.2"/>
        <text x="24" y="34" font-size="24" font-weight="900" fill="#00e5ff" font-family="system-ui, sans-serif">01. TAG 3</text>
        <text x="24" y="62" font-size="16" font-weight="700" fill="#e2e8f0" font-family="system-ui, sans-serif">Flatmates in comments</text>
      </g>

      <!-- Rule 2 -->
      <g transform="translate(340, 68)">
        <rect width="280" height="84" rx="16" fill="#1b2042" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.2"/>
        <text x="24" y="34" font-size="24" font-weight="900" fill="#ff2e6d" font-family="system-ui, sans-serif">02. FOLLOW</text>
        <text x="24" y="62" font-size="16" font-weight="700" fill="#e2e8f0" font-family="system-ui, sans-serif">@localden.online</text>
      </g>

      <!-- Rule 3 -->
      <g transform="translate(640, 68)">
        <rect width="280" height="84" rx="16" fill="#1b2042" stroke="#e2f80d" stroke-opacity="0.4" stroke-width="1.5"/>
        <text x="24" y="34" font-size="24" font-weight="900" fill="#e2f80d" font-family="system-ui, sans-serif">03. SHARE STORY</text>
        <text x="24" y="62" font-size="16" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">For 2X Winning Chance!</text>
      </g>
    </g>

    <!-- Bottom Footer Bar -->
    <g transform="translate(60, 970)">
      <!-- Locations pill -->
      <text x="0" y="42" font-size="17" font-weight="700" fill="#94a3b8" font-family="system-ui, sans-serif">
        📍 Koramangala • Indiranagar • HSR • Bellandur • Zolo &amp; Stanza Residents
      </text>

      <!-- Results timer -->
      <g transform="translate(640, 10)">
        <rect width="320" height="48" rx="24" fill="#00e5ff" fill-opacity="0.12" stroke="#00e5ff" stroke-width="1.5"/>
        <text x="160" y="31" font-size="17" font-weight="800" fill="#00e5ff" text-anchor="middle" font-family="system-ui, sans-serif">
          Ends Friday 8 PM IST
        </text>
      </g>
    </g>
  </svg>
  `;
};

/**
 * 2. Vertical Story / Reel Post (1080 x 1920)
 */
const generateStoryContest = () => {
  return `
  <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
    ${getDefs()}

    <!-- Background -->
    <rect width="1080" height="1920" fill="url(#bgContest)"/>
    <rect width="1080" height="1920" fill="url(#gridPat)"/>

    <!-- Glowing Orbs -->
    <circle cx="540" cy="500" r="450" fill="#9333ea" opacity="0.25" filter="blur(90px)"/>
    <circle cx="200" cy="900" r="350" fill="#00e5ff" opacity="0.18" filter="blur(80px)"/>
    <circle cx="850" cy="1400" r="400" fill="#ff2e6d" opacity="0.2" filter="blur(90px)"/>

    <!-- Top Brand & Header Safe Zone -->
    <g transform="translate(80, 130)">
      ${getBrandHeader(1.0)}

      <g transform="translate(580, 2)">
        <rect width="340" height="54" rx="27" fill="#e2f80d"/>
        <text x="170" y="35" font-size="20" font-weight="900" fill="#000000" text-anchor="middle" font-family="system-ui, sans-serif" letter-spacing="1.5">
          ⚡ 48H PG CONTEST ⚡
        </text>
      </g>
    </g>

    <!-- Location & Target Audience Badge -->
    <g transform="translate(80, 240)">
      <rect width="580" height="46" rx="23" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5"/>
      <text x="290" y="30" font-size="18" font-weight="800" fill="#00e5ff" text-anchor="middle" font-family="system-ui, sans-serif" letter-spacing="1.2">
        📍 BANGALORE COLIVING &amp; PG RESIDENTS
      </text>
    </g>

    <!-- Main Headline Hook -->
    <g transform="translate(80, 340)">
      <text font-family="system-ui, -apple-system, sans-serif">
        <tspan x="0" y="0" font-size="52" font-weight="850" fill="#ffffff">TAG 3 FLATMATES</tspan>
        <tspan x="0" y="65" font-size="52" font-weight="850" fill="#ffffff">YOU WOULD ABSOLUTELY</tspan>
        <tspan x="0" y="155" font-size="80" font-weight="950" fill="url(#acidYellowGreen)" letter-spacing="1.5">DESTROY IN FIFA!</tspan>
      </text>
    </g>

    <!-- Prize Announcement Box -->
    <g transform="translate(80, 540)">
      <rect width="920" height="96" rx="22" fill="#ff2e6d" fill-opacity="0.15" stroke="#ff2e6d" stroke-width="2.5"/>
      <text x="460" y="42" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="system-ui, sans-serif">
        ★ Winner gets a <tspan fill="#e2f80d">FREE PS5 SETUP</tspan> delivered to
      </text>
      <text x="460" y="78" font-size="24" font-weight="800" fill="#00e5ff" text-anchor="middle" font-family="system-ui, sans-serif">
        your doorstep this Saturday! (Zero Deposit • Zero Rent)
      </text>
    </g>

    <!-- Giant Hero Showcase: PS5 & Trash Talk -->
    <g transform="translate(80, 680)">
      <ellipse cx="460" cy="200" rx="300" ry="120" fill="#00e5ff" opacity="0.3" filter="blur(40px)"/>
      ${ps5Img ? `<image href="${ps5Img}" x="160" y="0" width="600" height="380" preserveAspectRatio="xMidYMid meet"/>` : ''}

      <!-- Funny Floating Quote Bubble 1 -->
      <g transform="translate(20, 20)">
        <rect width="320" height="54" rx="27" fill="#151b3d" stroke="#00e5ff" stroke-width="1.5"/>
        <text x="160" y="34" font-size="17" font-weight="800" fill="#00e5ff" text-anchor="middle" font-family="system-ui, sans-serif">
          &quot;Pass kar de bro, goal hoga!&quot;
        </text>
      </g>

      <!-- Funny Floating Quote Bubble 2 -->
      <g transform="translate(560, 280)">
        <rect width="340" height="54" rx="27" fill="#151b3d" stroke="#ff2e6d" stroke-width="1.5"/>
        <text x="170" y="34" font-size="17" font-weight="800" fill="#ff2e6d" text-anchor="middle" font-family="system-ui, sans-serif">
          &quot;Controller disconnected tha!&quot;
        </text>
      </g>
    </g>

    <!-- What You Get Package Box -->
    <g transform="translate(80, 1120)">
      <rect width="920" height="230" rx="26" fill="#0e132b" fill-opacity="0.9" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1.5"/>

      <text x="40" y="48" font-size="22" font-weight="900" fill="#00e5ff" font-family="system-ui, sans-serif" letter-spacing="1.2">
        PACKAGE DELIVERED TO YOUR FLAT:
      </text>

      <g transform="translate(40, 80)">
        <g transform="translate(0, 0)">
          <circle cx="12" cy="12" r="12" fill="#00ff87"/>
          <path d="M7 12l3 3 7-7" stroke="#000000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <text x="36" y="19" font-size="22" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">
            PlayStation 5 Console (Ultra 4K HDR)
          </text>
        </g>

        <g transform="translate(0, 50)">
          <circle cx="12" cy="12" r="12" fill="#00ff87"/>
          <path d="M7 12l3 3 7-7" stroke="#000000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <text x="36" y="19" font-size="22" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">
            2x DualSense Wireless Controllers + Charger
          </text>
        </g>

        <g transform="translate(0, 100)">
          <circle cx="12" cy="12" r="12" fill="#00ff87"/>
          <path d="M7 12l3 3 7-7" stroke="#000000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <text x="36" y="19" font-size="22" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">
            FIFA 24 / EA FC, Mortal Kombat 1, Spider-Man 2
          </text>
        </g>
      </g>
    </g>

    <!-- 3 Simple Rules to Win (Vertical Cards) -->
    <g transform="translate(80, 1380)">
      <rect width="920" height="290" rx="26" fill="#121735" stroke="#e2f80d" stroke-opacity="0.35" stroke-width="2"/>

      <text x="40" y="48" font-size="22" font-weight="900" fill="#e2f80d" font-family="system-ui, sans-serif" letter-spacing="1.5">
        ⚡ 3 STEPS TO ENTER (10 SECONDS):
      </text>

      <!-- Step 1 -->
      <g transform="translate(40, 75)">
        <rect width="840" height="54" rx="14" fill="#1b2044"/>
        <text x="24" y="34" font-size="20" font-weight="900" fill="#00e5ff" font-family="system-ui, sans-serif">01</text>
        <text x="75" y="34" font-size="19" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">
          TAG 3 flatmates / rivals in the comments below
        </text>
      </g>

      <!-- Step 2 -->
      <g transform="translate(40, 140)">
        <rect width="840" height="54" rx="14" fill="#1b2044"/>
        <text x="24" y="34" font-size="20" font-weight="900" fill="#ff2e6d" font-family="system-ui, sans-serif">02</text>
        <text x="75" y="34" font-size="19" font-weight="700" fill="#ffffff" font-family="system-ui, sans-serif">
          FOLLOW @localden.online on Instagram
        </text>
      </g>

      <!-- Step 3 -->
      <g transform="translate(40, 205)">
        <rect width="840" height="58" rx="14" fill="#e2f80d"/>
        <text x="24" y="36" font-size="20" font-weight="900" fill="#000000" font-family="system-ui, sans-serif">03</text>
        <text x="75" y="36" font-size="19" font-weight="900" fill="#000000" font-family="system-ui, sans-serif">
          SHARE THIS TO YOUR STORY = 2X WINNING CHANCE!
        </text>
      </g>
    </g>

    <!-- Bottom CTA Bar (Safe Zone Above Navigation) -->
    <g transform="translate(80, 1700)">
      <rect width="920" height="80" rx="40" fill="url(#cyanBlue)"/>
      <text x="460" y="49" font-size="24" font-weight="900" fill="#000000" text-anchor="middle" font-family="system-ui, sans-serif" letter-spacing="1">
        DROP YOUR COMMENTS BELOW &amp; WIN!
      </text>
    </g>

    <!-- Micro Note -->
    <text x="540" y="1820" font-size="16" font-weight="700" fill="#94a3b8" text-anchor="middle" font-family="system-ui, sans-serif">
      Results Live on Friday 8 PM | Doorstep delivery across Bangalore this Saturday
    </text>
  </svg>
  `;
};

const renderAndSave = (svgStr, filename) => {
  const resvg = new Resvg(svgStr, {
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'system-ui'
    }
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  const publicPath = path.join(outDirPublic, filename);
  const artifactPath = path.join(outDirArtifacts, filename);

  fs.writeFileSync(publicPath, pngBuffer);
  fs.writeFileSync(artifactPath, pngBuffer);

  console.log(`✅ Generated ${filename} (${pngBuffer.length} bytes)`);
};

console.log('🚀 Generating PG Contest Campaign Creatives...');
renderAndSave(generateSquareContest(), 'pg_contest_post.png');
renderAndSave(generateStoryContest(), 'pg_contest_story.png');
console.log('🎉 Done!');
