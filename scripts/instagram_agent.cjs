#!/usr/bin/env node

/**
 * 🤖 localDen Instagram AI Social Agent
 * 
 * Automates content generation, caption crafting, hashtag strategy, 
 * and publishing/scheduling to the Instagram Graph API.
 */

const fs = require('fs');
const path = require('path');

// 1. Load Environment Variables from .env.local
const loadEnv = () => {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim().replace(/(^"|"$|^'|'$)/g, '');
        }
      }
    });
  }
};
loadEnv();

// Configuration
const CONFIG = {
  instagramAccountId: process.env.INSTAGRAM_ACCOUNT_ID || '',
  instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
  graphApiVersion: 'v19.0',
  defaultSiteUrl: 'https://localden.online',
  bannersDir: path.join(process.cwd(), 'public/banners'),
};

// Available Content Campaigns
const CAMPAIGNS = {
  gurugram: {
    name: 'Gurugram City Launch Announcement',
    target: 'Gurugram / NCR Gamers, Techies, House Party Hosts & Gear Owners (CyberHub, DLF Phase 1-5, Golf Course Road, Sohna Road)',
    postImage: 'gurugram_launch_soon.png',
    storyImage: 'gurugram_launch_soon.png',
    captionVariants: [
      {
        hook: '🚨 GURUGRAM, ARE YOU READY?! लोकल DEN IS ENTERING THE CHAT! 🚀🔥',
        body: `After powering the wildest FIFA nights & house parties in Bangalore, we’re officially dropping in GURUGRAM very soon! 🎮🎧

From DLF CyberCity & Phase 1–5 to Golf Course Road, Sushant Lok & Sohna Road — your weekend scene is about to get a massive upgrade! ⚡

What’s landing at your doorstep soon:
🎮 PlayStation 5 & Xbox Series X (DualSense Controllers + Top Titles)
🎧 Pioneer DJ Controllers & Club-Grade Party Audio
🥽 Meta Quest VR Headsets
🎸 Electric Guitars & Jamming Gear

━━━━━━━━━━━━━━━━━━━━━
💰 𝗚𝗢𝗧 𝗜𝗗𝗟𝗘 𝗚𝗘𝗔𝗥 𝗜𝗡 𝗚𝗨𝗥𝗨𝗚𝗥𝗔𝗠?
Become a Founding Lender on लोकल DEN! List your PS5, DJ deck, camera, or guitar and earn up to ₹10,000+/month passively with 100% verified renters!
━━━━━━━━━━━━━━━━━━━━━

👇 Tag your Gurgaon squad & drop your Sector/Phase in the comments so we unlock your area FIRST! 📍`,
        cta: 'Sign up early or list your gear now at 👉 localden.online (Link in bio) 🔗',
        hashtags: [
          '#localDen',
          '#Gurugram',
          '#GurgaonDiaries',
          '#CyberHub',
          '#GurgaonGamers',
          '#DLFCyberCity',
          '#GurgaonLife',
          '#GurgaonHouseParty',
          '#DelhiNCRGamers',
          '#PS5Gurgaon',
          '#GolfCourseRoad',
          '#GurgaonNightlife',
          '#LaunchingSoon',
          '#NoCap'
        ]
      }
    ]
  },
  festive25: {
    name: 'Festive 25 Sale - Flat 25% OFF All Products',
    target: 'Bangalore Gamers, House Party Hosts, Friends & Families Celebrating the Festive Season',
    postImage: 'festive_25_sale.png',
    storyImage: 'festive_25_sale.png',
    captionVariants: [
      {
        hook: '🪔✨ FESTIVE 25 SALE IS LIVE: FLAT 25% OFF ON ALL GEAR! 🎮🎧',
        body: `Kurta pehen ke FIFA aur Tekken khelne ka maza hi alag hai! 🔥
Iss festive season, house party aur cousins get-together ko banao legendary with लोकल DEN! 🥳

Get FLAT 25% OFF on every single product on our platform:
🎮 PlayStation 5 & Xbox Series X (Dual Controllers + FIFA / Tekken / GTA / Mortal Kombat)
🎧 Pioneer DJ Controllers & Party Sound Systems
🥽 Meta Quest VR Headsets for the ultimate family reaction
🎸 Electric Guitars & Jamming Amps

━━━━━━━━━━━━━━━━━━━━━
🏷️ 𝗨𝗦𝗘 𝗖𝗢𝗗𝗘: 𝗙𝗘𝗦𝗧𝗜𝗩𝗘𝟮𝟱 at checkout for an instant 𝗙𝗟𝗔𝗧 𝟮𝟱% 𝗢𝗙𝗙!
⚡ 100% Verified Gear • Zero Deposit Drama • Same-Day Doorstep Delivery
━━━━━━━━━━━━━━━━━━━━━

📍 Delivering across all of Bangalore (Koramangala, Indiranagar, HSR Layout, Whitefield, Bellandur, JP Nagar & more)!
⏳ Festive slots are filling up super fast — book your setup before it’s gone!`,
        cta: 'Tap the link in bio or visit 👉 localden.online to book now with code FESTIVE25! 🔗',
        hashtags: [
          '#localDen',
          '#FestiveSale',
          '#DiwaliHouseParty',
          '#BangaloreGamers',
          '#PS5Bangalore',
          '#BangaloreRentals',
          '#BangaloreLife',
          '#Koramangala',
          '#Indiranagar',
          '#HSRLayout',
          '#Whitefield',
          '#GameNight',
          '#DesiGamers',
          '#RentInBangalore'
        ]
      }
    ]
  },
  weekend10: {
    name: 'Weekend Flash Sale - Extra 10% OFF',
    target: 'Bangalore Gamers, House Party Hosts, Students & Techies',
    postImage: 'weekend_10_off_offer.png',
    storyImage: 'weekend_10_off_offer.png',
    captionVariants: [
      {
        hook: '🔥 WEEKEND FLASH SALE: EXTRA 10% OFF ON ALL GEAR! 🎮🎧',
        body: `Weekend plans sorted! Why spend ₹55,000+ buying gear when you can rent it for the weekend & get an EXTRA 10% OFF?! ⚡

Get top-tier gear delivered straight to your doorstep in Bangalore:
🎮 PlayStation 5 & Xbox Series X (with Dual Controllers + FIFA/Tekken)
🎧 Pioneer DJ Controllers & Party Speakers
🥽 Meta Quest VR Headsets
🎸 Electric Guitars & Jamming Gear

━━━━━━━━━━━━━━━━━━━━━
🏷️ 𝗨𝗦𝗘 𝗖𝗢𝗗𝗘: 𝗪𝗘𝗘𝗞𝗘𝗡𝗗𝟭𝟬 at checkout for an instant 𝗘𝗫𝗧𝗥𝗔 𝟭𝟬% 𝗢𝗙𝗙!
⚡ 100% Verified Gear • Zero Deposit Drama • Express Bangalore Delivery
━━━━━━━━━━━━━━━━━━━━━

📍 Delivering across Koramangala, Indiranagar, HSR Layout, Bellandur, Whitefield, BTM & more!
⏳ Limited weekend slots left — grab yours before they get booked out!`,
        cta: 'Tap the link in bio or visit 👉 localden.online to book your weekend setup now! 🔗',
        hashtags: [
          '#localDen',
          '#BangaloreGamers',
          '#PS5Bangalore',
          '#WeekendOffer',
          '#BangaloreRentals',
          '#BangaloreHouseParty',
          '#Koramangala',
          '#HSRLayout',
          '#Indiranagar',
          '#Whitefield',
          '#BangaloreLife',
          '#GameNight',
          '#FIFA24',
          '#RentInBangalore'
        ]
      }
    ]
  },
  contest: {
    name: 'Free PS5 Weekend Coliving/PG Contest',
    target: 'Bangalore PG & Flat Residents (Zolo, Stanza, HelloWorld, Techies)',
    postImage: 'free_ps5_contest.png',
    storyImage: 'free_ps5_contest.png',
    captionVariants: [
      {
        hook: '🏆 48-HOUR GIVEAWAY: TAG 3 FLATMATES YOU’D DESTROY IN FIFA! ⚽🎮',
        body: `Har PG aur flat mein ek banda hota hai jo bolta hai:
"Bhai controller theek nahi tha warna 5-0 se harata tujhe..." 🥱

Toh time aa gaya hai to settle the beef once and for all! 💥

Winner gets a 𝗙𝗥𝗘𝗘 𝗣𝗦𝟱 𝗦𝗘𝗧𝗨𝗣 delivered right to your PG/Flat doorstep this Saturday:
🎮 PlayStation 5 Console (Disc Edition)
🎮 2x DualSense Wireless Controllers
⚽ EA Sports FC / FIFA 24 + Mortal Kombat
⚡ Zero Rent • Zero Deposit • Free Doorstep Delivery!

━━━━━━━━━━━━━━━━━━━━━
⚡ 𝗛𝗢𝗪 𝗧𝗢 𝗘𝗡𝗧𝗘𝗥 (Takes 10 Seconds):
1️⃣ TAG 3 flatmates / rivals in the comments who talk big game in FIFA 👇
2️⃣ FOLLOW @localden.online
3️⃣ SHARE this post to your Story (Tag @localden.online) for 𝟮𝗫 𝗪𝗜𝗡𝗡𝗜𝗡𝗚 𝗖𝗛𝗔𝗡𝗖𝗘! 🚀
━━━━━━━━━━━━━━━━━━━━━

📍 Open to all Bangalore PGs, Coliving spaces & Flats (Zolo, Stanza Living, HelloWorld, Koramangala, Indiranagar, HSR Layout, Bellandur, Whitefield).
⏳ Contest closes: Friday 8:00 PM IST. Winner announced on our Story!

P.S. Funniest trash-talk comment gets instant bonus points. Tag your squad below! 👇`,
        cta: 'Tag your flatmates below and sort your weekend gaming scene! 👇',
        hashtags: [
          '#localDen',
          '#BangaloreGamers',
          '#PS5Bangalore',
          '#BangalorePG',
          '#ZoloStays',
          '#StanzaLiving',
          '#HelloWorldColiving',
          '#Koramangala',
          '#HSRLayout',
          '#Indiranagar',
          '#BangaloreLife',
          '#FIFA24',
          '#BangaloreGiveaway',
          '#NoCap'
        ]
      }
    ]
  },
  genz: {
    name: 'Gen-Z High-Conversion Meta Ad Campaign',
    target: 'Gen-Z, Gamers, Students & Young Techies in Bangalore',
    postImage: 'genz_ad_post.png',
    storyImage: 'genz_ad_story.png',
    captionVariants: [
      {
        hook: '50,000 ka PS5 buy karna for just 2 days? LMAO NO BRO. 🛑',
        body: `Kharidna kyu hai jab RENT kar sakte ho starting @ just ₹199/day on लोकलDen!

Whether you need:
🎮 PS5 with dual controllers for weekend FIFA & Tekken with the boys
🎧 Pioneer DJ Console for the sickest house party
🎸 Electric Guitar for jamming sessions
🥽 VR Headset for mind-blowing immersion

🚀 Doorstep delivery across Bangalore (Koramangala, Indiranagar, HSR, Whitefield & more)
✅ 100% verified & tested hardware
⚡ Zero deposit drama, instant booking!`,
        cta: 'Weekend scene sort karo abhi 👉 localden.online (Link in bio) 🔗',
        hashtags: [
          '#localDen',
          '#BangaloreGamers',
          '#PS5Bangalore',
          '#BangaloreLife',
          '#RentKaro',
          '#BangaloreHouseParty',
          '#GenZIndia',
          '#BangaloreRentals',
          '#GamerVibes',
          '#NoCap'
        ]
      }
    ]
  },
  weekend: {
    name: 'Weekend Gear Rental Campaign',
    target: 'Renters (Gamers, Musicians, Creators in Bangalore)',
    postImage: 'poster1_weekend_post.png',
    storyImage: 'poster1_weekend_story.png',
    captionVariants: [
      {
        hook: '🚨 WEEKEND IS COMING! Don’t let your Friday night be boring.',
        body: `Why spend ₹50,000+ buying tech when you can RENT top-tier gear for the weekend starting at just ₹199/day?

🎮 What you can get delivered today:
• PlayStation 5 & Xbox Series X (Dual controllers included)
• Pioneer DJ Controllers & Studio Audio
• Electric Guitars & Party Amplifiers
• VR Headsets & 4K Displays

🚀 Express Same-Day Delivery anywhere in Bangalore!
Cleaned, tested, sanitized, and dropped right to your doorstep.`,
        cta: 'Tap the link in bio or visit localden.online to reserve your gear before slots fill up! 👇',
        hashtags: [
          '#BangaloreGamers',
          '#PS5Bangalore',
          '#BangaloreRentals',
          '#RentYourSystem',
          '#localDen',
          '#BangaloreMusic',
          '#XboxBangalore',
          '#WeekendVibesBangalore',
          '#TechRentals',
          '#BangaloreStartups'
        ]
      },
      {
        hook: '⚡ Turn your living room into an arcade or a concert stage this weekend.',
        body: `Got friends coming over? Rent a PS5 setup or DJ deck for 48 hours without burning a hole in your pocket.

✅ Instant booking in under 2 minutes
✅ Verified & tested hardware
✅ Free doorstep pickup & drop
✅ Zero hassle, maximum fun!`,
        cta: 'Lock in your weekend setup now at localden.online 🕹️',
        hashtags: [
          '#BangaloreEvents',
          '#GamingSetup',
          '#BangaloreNightlife',
          '#GamerLife',
          '#localDen',
          '#BangaloreLife'
        ]
      }
    ]
  },

  benefits: {
    name: 'Lender Benefits & Passive Income Campaign',
    target: 'Gear Owners & Tech Enthusiasts sitting on idle items',
    postImage: 'poster2_benefits_post.png',
    storyImage: 'poster2_benefits_story.png',
    captionVariants: [
      {
        hook: '💰 Got a PS5, Guitar, Camera, or Laptop sitting idle? Put it to work!',
        body: `Turn your unused gadgets into steady passive income with localDen. Hosts in Bangalore are already earning up to ₹15,000/month from items sitting in their drawers.

5 Reasons to List on localDen Today:
1️⃣ High Passive Income: Direct UPI payouts into your bank account.
2️⃣ 100% KYC Verified Renters: Aadhaar & Govt ID verified + instant security deposits.
3️⃣ Zero Logistics Hassle: We handle doorstep pickup, inspection, delivery & return.
4️⃣ Comprehensive Safety Protection: Complete damage protection agreement.
5️⃣ Free 2-Min Listing: Zero upfront fees and 0% commission on your first 3 rentals!`,
        cta: 'Start monetizing your gear today. Visit localden.online/list-gear or link in bio! 📈',
        hashtags: [
          '#PassiveIncomeBangalore',
          '#SideHustleIndia',
          '#EarnFromHome',
          '#BangaloreTech',
          '#localDen',
          '#PeerToPeerRental',
          '#BangaloreEntrepreneurs',
          '#MonetizeYourTech'
        ]
      }
    ]
  }
};

/**
 * AI Caption Formatter
 */
const generatePostPayload = (campaignKey = 'weekend', variantIndex = 0) => {
  const campaign = CAMPAIGNS[campaignKey] || CAMPAIGNS.weekend;
  const variant = campaign.captionVariants[variantIndex] || campaign.captionVariants[0];

  const fullCaption = `${variant.hook}\n\n${variant.body}\n\n${variant.cta}\n\n.\n.\n${variant.hashtags.join(' ')}`;
  const postImagePath = path.join(CONFIG.bannersDir, campaign.postImage);
  const storyImagePath = path.join(CONFIG.bannersDir, campaign.storyImage);

  return {
    campaign: campaign.name,
    target: campaign.target,
    postImage: campaign.postImage,
    postImagePath,
    storyImage: campaign.storyImage,
    storyImagePath,
    caption: fullCaption,
    hashtagsCount: variant.hashtags.length,
    characterCount: fullCaption.length,
  };
};

/**
 * Upload helper to Supabase public storage bucket
 */
const uploadToSupabaseStorage = async (filePath, filename) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const contentType = filename.endsWith('.mp4') ? 'video/mp4' : 'image/png';
    const uploadUrl = `${supabaseUrl}/storage/v1/object/listing-photos/banners/${filename}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: fileBuffer
    });
    if (res.ok) {
      return `${supabaseUrl}/storage/v1/object/public/listing-photos/banners/${filename}`;
    }
  } catch (err) {
    console.warn('⚠️ Supabase Storage upload fallback:', err.message);
  }
  return null;
};

/**
 * Meta Instagram Graph API Client
 */
class InstagramPublisher {
  constructor(accountId, accessToken) {
    this.accountId = accountId;
    this.accessToken = accessToken;
    // Instagram Login tokens start with 'IG' (e.g. IGAAU...) and must be sent to graph.instagram.com
    // Facebook Graph API tokens start with 'EA...' and must be sent to graph.facebook.com
    const isInstagramToken = this.accessToken.startsWith('IG');
    const apiHost = isInstagramToken ? 'https://graph.instagram.com' : 'https://graph.facebook.com';
    this.baseUrl = `${apiHost}/${CONFIG.graphApiVersion}`;
    console.log(`🌐 Routing requests via: ${apiHost} (${isInstagramToken ? 'Instagram Login API' : 'Facebook Graph API'})`);
  }

  isConfigured() {
    return Boolean(this.accountId && this.accessToken);
  }

  async publishMedia(publicImageUrl, caption) {
    if (!this.isConfigured()) {
      throw new Error('Instagram Account ID or Access Token is missing. Set INSTAGRAM_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN in .env.local.');
    }

    // Step 1: Create Media Container
    console.log('📡 Step 1/2: Creating Instagram Media Container...');
    const containerUrl = new URL(`${this.baseUrl}/${this.accountId}/media`);
    containerUrl.searchParams.append('image_url', publicImageUrl);
    containerUrl.searchParams.append('caption', caption);
    containerUrl.searchParams.append('access_token', this.accessToken);

    const containerRes = await fetch(containerUrl.toString(), { method: 'POST' });
    const containerData = await containerRes.json();

    if (!containerRes.ok || !containerData.id) {
      throw new Error(`Failed to create media container: ${JSON.stringify(containerData)}`);
    }

    const creationId = containerData.id;
    console.log(`✅ Container created with ID: ${creationId}`);

    // Wait and check container status (Meta needs a couple seconds to download & process image from CDN)
    console.log('⏳ Waiting for Meta to process image...');
    let isReady = false;
    let attempts = 0;
    while (!isReady && attempts < 6) {
      attempts++;
      await new Promise(r => setTimeout(r, 2500));
      try {
        const statusUrl = new URL(`${this.baseUrl}/${creationId}`);
        statusUrl.searchParams.append('fields', 'status_code');
        statusUrl.searchParams.append('access_token', this.accessToken);
        const statusRes = await fetch(statusUrl.toString());
        const statusData = await statusRes.json();
        if (statusData.status_code === 'FINISHED' || !statusData.status_code) {
          isReady = true;
        } else if (statusData.status_code === 'ERROR') {
          throw new Error(`Media container processing failed: ${JSON.stringify(statusData)}`);
        }
      } catch (e) {
        // Fallback to proceed if status check isn't supported
        isReady = true;
      }
    }

    // Step 2: Publish the Container
    console.log('🚀 Step 2/2: Publishing Media Container to Instagram Feed...');
    const publishUrl = new URL(`${this.baseUrl}/${this.accountId}/media_publish`);
    publishUrl.searchParams.append('creation_id', creationId);
    publishUrl.searchParams.append('access_token', this.accessToken);

    const publishRes = await fetch(publishUrl.toString(), { method: 'POST' });
    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData.id) {
      throw new Error(`Failed to publish media: ${JSON.stringify(publishData)}`);
    }

    console.log(`🎉 Successfully published to Instagram! Post ID: ${publishData.id}`);
    return publishData;
  }

  async publishReel(publicVideoUrl, caption, shareToFeed = true) {
    if (!this.isConfigured()) {
      throw new Error('Instagram Account ID or Access Token is missing in .env.local.');
    }

    // Step 1: Create Video/Reels Media Container
    console.log('📡 Step 1/2: Creating Instagram REELS Media Container...');
    const containerUrl = new URL(`${this.baseUrl}/${this.accountId}/media`);
    containerUrl.searchParams.append('media_type', 'REELS');
    containerUrl.searchParams.append('video_url', publicVideoUrl);
    containerUrl.searchParams.append('caption', caption);
    containerUrl.searchParams.append('share_to_feed', shareToFeed ? 'true' : 'false');
    containerUrl.searchParams.append('access_token', this.accessToken);

    const containerRes = await fetch(containerUrl.toString(), { method: 'POST' });
    const containerData = await containerRes.json();

    if (!containerRes.ok || !containerData.id) {
      throw new Error(`Failed to create Reels container: ${JSON.stringify(containerData)}`);
    }

    const creationId = containerData.id;
    console.log(`✅ Reel Container created with ID: ${creationId}`);

    // Step 2: Poll container status until Meta encodes the video
    console.log('⏳ Waiting for Meta servers to download & encode video (this takes 15-30s)...');
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!isReady && attempts < maxAttempts) {
      attempts++;
      await new Promise(r => setTimeout(r, 4000));
      process.stdout.write(`   Polling attempt ${attempts}/${maxAttempts}... `);

      try {
        const statusUrl = new URL(`${this.baseUrl}/${creationId}`);
        statusUrl.searchParams.append('fields', 'status_code,status');
        statusUrl.searchParams.append('access_token', this.accessToken);
        const statusRes = await fetch(statusUrl.toString());
        const statusData = await statusRes.json();

        console.log(`Status: ${statusData.status_code || 'UNKNOWN'}`);

        if (statusData.status_code === 'FINISHED') {
          isReady = true;
        } else if (statusData.status_code === 'ERROR') {
          throw new Error(`Meta video processing failed: ${JSON.stringify(statusData)}`);
        }
      } catch (err) {
        if (err.message.includes('failed')) throw err;
        console.log('Waiting...');
      }
    }

    if (!isReady) {
      throw new Error('Video processing timed out on Meta servers.');
    }

    // Step 3: Publish Media Container
    console.log('🚀 Step 2/2: Publishing Reel to Instagram...');
    const publishUrl = new URL(`${this.baseUrl}/${this.accountId}/media_publish`);
    publishUrl.searchParams.append('creation_id', creationId);
    publishUrl.searchParams.append('access_token', this.accessToken);

    const publishRes = await fetch(publishUrl.toString(), { method: 'POST' });
    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData.id) {
      throw new Error(`Failed to publish Reel: ${JSON.stringify(publishData)}`);
    }

    console.log(`🎉 Successfully published Reel to Instagram! ID: ${publishData.id}`);
    return publishData;
  }
}

// CLI Execution & Controller
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0] || 'preview';
  const campaignKey = args[1] || 'weekend';

  console.log('====================================================');
  console.log('🤖 localDen Instagram AI Social Agent');
  console.log('====================================================\n');

  if (command === 'preview' || command === 'dry-run') {
    const post = generatePostPayload(campaignKey);
    console.log(`📌 Campaign: ${post.campaign}`);
    console.log(`🎯 Target Audience: ${post.target}`);
    console.log(`🖼️  Post Banner: ${post.postImage}`);
    console.log(`📱 Story Banner: ${post.storyImage}`);
    console.log(`📊 Stats: ${post.characterCount} characters | ${post.hashtagsCount} hashtags\n`);
    console.log('------------------ [ CAPTION PREVIEW ] ------------------');
    console.log(post.caption);
    console.log('---------------------------------------------------------\n');

    const publisher = new InstagramPublisher(CONFIG.instagramAccountId, CONFIG.instagramAccessToken);
    if (!publisher.isConfigured()) {
      console.log('ℹ️  Instagram API status: [DRY-RUN / SIMULATED MODE]');
      console.log('   To enable real live publishing to your Instagram account:');
      console.log('   Add INSTAGRAM_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN to .env.local\n');
    } else {
      console.log('✅ Instagram API credentials detected in .env.local.');
      console.log('   Ready to publish with: node scripts/instagram_agent.cjs publish ' + campaignKey);
    }
  } else if (command === 'publish') {
    const post = generatePostPayload(campaignKey);
    const publisher = new InstagramPublisher(CONFIG.instagramAccountId, CONFIG.instagramAccessToken);

    if (!publisher.isConfigured()) {
      console.error('❌ Cannot publish: Instagram credentials are not configured in .env.local.');
      console.error('   Please provide INSTAGRAM_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN.');
      process.exit(1);
    }

    let publicUrl = await uploadToSupabaseStorage(post.postImagePath, post.postImage);
    if (!publicUrl) {
      publicUrl = `${CONFIG.defaultSiteUrl}/banners/${post.postImage}`;
    }
    console.log(`Using public image URL: ${publicUrl}`);
    await publisher.publishMedia(publicUrl, post.caption);
  } else if (command === 'preview-reel') {
    const reelPath = path.join(CONFIG.bannersDir, 'localden_viral_reel.mp4');
    console.log('🎬 Reel File:', reelPath);
    console.log('📏 Resolution: 1080x1920 (9:16 vertical)');
    console.log('⏱️  Duration: ~10.2 seconds\n');
    console.log('📝 Suggested Reel Caption:');
    console.log(`Why spend ₹55,000 on a PS5 just for the weekend? 🎮😭

Renting tech in Bangalore is now easier than ordering Biryani! 🍕
Get PS5, Xbox Series X, DJ Consoles, & VR headsets delivered directly to your doorstep in Koramangala, Indiranagar, HSR & beyond starting at just ₹399/day!

✅ 100% verified & tested
✅ No long-term commitments
⚡ Instant doorstep delivery

👉 Tap the link in bio to book: localden.online

#localDen #BangaloreGamers #PS5Bangalore #RentBangalore #BangaloreLife #GameNight #Koramangala #HSRLayout #Indiranagar #FIFA24 #NoCap`);
  } else if (command === 'publish-reel') {
    const publisher = new InstagramPublisher(CONFIG.instagramAccountId, CONFIG.instagramAccessToken);
    if (!publisher.isConfigured()) {
      console.error('❌ Cannot publish: Instagram credentials are not configured in .env.local.');
      process.exit(1);
    }

    const reelFileName = 'localden_viral_reel.mp4';
    const reelFilePath = path.join(CONFIG.bannersDir, reelFileName);
    if (!fs.existsSync(reelFilePath)) {
      console.error(`❌ Reel video not found at: ${reelFilePath}`);
      process.exit(1);
    }

    console.log(`📤 Uploading Reel to Supabase Storage (${reelFileName})...`);
    let publicUrl = await uploadToSupabaseStorage(reelFilePath, reelFileName);
    if (!publicUrl) {
      publicUrl = `${CONFIG.defaultSiteUrl}/banners/${reelFileName}`;
    }
    console.log(`🌐 Public Reel URL: ${publicUrl}`);

    const reelCaption = `Why spend ₹55,000 on a PS5 just for the weekend? 🎮😭

Renting tech in Bangalore is now easier than ordering Biryani! 🍕
Get PS5, Xbox Series X, DJ Consoles, & VR headsets delivered directly to your doorstep in Koramangala, Indiranagar, HSR & beyond starting at just ₹399/day!

✅ 100% verified & tested
✅ No long-term commitments
⚡ Instant doorstep delivery

👉 Tap the link in bio to book: localden.online

#localDen #BangaloreGamers #PS5Bangalore #RentBangalore #BangaloreLife #GameNight #Koramangala #HSRLayout #Indiranagar #BangaloreRentals`;

    await publisher.publishReel(publicUrl, reelCaption, true);
  } else if (command === 'post-image' || command === 'post-file') {
    const targetFile = args[1];
    if (!targetFile) {
      console.error('❌ Please provide a file path: node scripts/instagram_agent.cjs post-image <path>');
      process.exit(1);
    }
    const resolvedPath = path.isAbsolute(targetFile) ? targetFile : path.join(process.cwd(), targetFile);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ File not found at: ${resolvedPath}`);
      process.exit(1);
    }
    const publisher = new InstagramPublisher(CONFIG.instagramAccountId, CONFIG.instagramAccessToken);
    if (!publisher.isConfigured()) {
      console.error('❌ Cannot publish: Instagram credentials are not configured in .env.local.');
      process.exit(1);
    }

    const filename = path.basename(resolvedPath).replace(/\s+/g, '_');
    console.log(`📤 Uploading custom file to Supabase Storage (${filename})...`);
    let publicUrl = await uploadToSupabaseStorage(resolvedPath, filename);
    if (!publicUrl) {
      publicUrl = `${CONFIG.defaultSiteUrl}/banners/${filename}`;
    }
    console.log(`🌐 Public URL: ${publicUrl}`);

    const defaultContestPayload = generatePostPayload('contest');
    const customCaption = args[2] || defaultContestPayload.caption;

    if (filename.endsWith('.mp4')) {
      await publisher.publishReel(publicUrl, customCaption, true);
    } else {
      await publisher.publishMedia(publicUrl, customCaption);
    }
  } else {
    console.log('Usage:');
    console.log('  node scripts/instagram_agent.cjs preview [contest|genz|weekend|benefits]');
    console.log('  node scripts/instagram_agent.cjs publish [contest|genz|weekend|benefits]');
    console.log('  node scripts/instagram_agent.cjs post-image <filePath> [caption]');
    console.log('  node scripts/instagram_agent.cjs preview-reel');
    console.log('  node scripts/instagram_agent.cjs publish-reel');
  }
};

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  CAMPAIGNS,
  generatePostPayload,
  InstagramPublisher,
};

