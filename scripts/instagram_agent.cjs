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

const uploadToSupabaseStorage = async (filePath, filename) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const uploadUrl = `${supabaseUrl}/storage/v1/object/listing-photos/banners/${filename}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'image/png',
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

    let publicUrl = await uploadToSupabaseStorage(post.postImagePath, post.postImage);
    if (!publicUrl) {
      publicUrl = `${CONFIG.defaultSiteUrl}/banners/${post.postImage}`;
    }
    console.log(`Using public image URL: ${publicUrl}`);
    await publisher.publishMedia(publicUrl, post.caption);
  } else {
    console.log('Usage:');
    console.log('  node scripts/instagram_agent.cjs preview [weekend|benefits]');
    console.log('  node scripts/instagram_agent.cjs publish [weekend|benefits]');
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

