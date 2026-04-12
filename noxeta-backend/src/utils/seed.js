require('dotenv').config();
const mongoose = require('mongoose');
const Product  = require('../models/Product');
const User     = require('../models/User');

// Auto-generate slug from name
const toSlug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const PRODUCTS = [
  {
    name: 'Cannibal Corpse Skull Tee',
    slug: 'cannibal-corpse-skull-tee',
    description: 'Heavyweight 240gsm oversized tee featuring the iconic Cannibal Corpse collaboration. Drip-text logo embroidered on chest, skull artwork screen-printed on back. Drop shoulder boxy fit.',
    shortDesc: 'Heavy metal collab. Screen-printed skull. 240gsm.',
    category: 'Oversized Tees',
    price: 1299, originalPrice: 1699,
    badge: 'Collab', isFeatured: true,
    colors: ['#080808', '#8b1a1a'],
    material: '100% Heavyweight Cotton', fit: 'Oversized', gsm: 240,
    images: [
      { url: 'https://placehold.co/600x800/080808/ffffff?text=CC+Skull+Front', alt: 'Front view', order: 0 },
      { url: 'https://placehold.co/600x800/080808/ffffff?text=CC+Skull+Back',  alt: 'Back view',  order: 1 },
    ],
    variants: [
      { size: 'S', stock: 15 }, { size: 'M', stock: 25 },
      { size: 'L', stock: 20 }, { size: 'XL', stock: 15 }, { size: 'XXL', stock: 10 },
    ],
    tags: ['metal', 'collab', 'skull', 'oversized', 'black'],
  },
  {
    name: 'Flame Co-ord Set',
    slug: 'flame-coord-set',
    description: 'Premium matching set — oversized flame-print tee + wide-leg sweatpants. White abstract flame cascades down the full length. 300gsm fleece pants with drawstring waist.',
    shortDesc: 'Matching flame tee + pants. 300gsm fleece.',
    category: 'Co-ord Sets',
    price: 2799, originalPrice: 3499,
    badge: 'New', isFeatured: true,
    colors: ['#080808'],
    material: 'Cotton + Fleece Blend', fit: 'Oversized', gsm: 300,
    images: [
      { url: 'https://placehold.co/600x800/080808/ffffff?text=Flame+Coord', alt: 'Flame co-ord set', order: 0 },
    ],
    variants: [
      { size: 'S', stock: 8 }, { size: 'M', stock: 12 },
      { size: 'L', stock: 10 }, { size: 'XL', stock: 8 }, { size: 'XXL', stock: 5 },
    ],
    tags: ['coord', 'flame', 'set', 'matching', 'oversized'],
  },
  {
    name: 'Saiyan Chrome Tee',
    slug: 'saiyan-chrome-tee',
    description: 'Chrome-effect purple 3D lettering on premium heavyweight black cotton. Sleeve detail prints on both arms. Boxy oversized silhouette with Noxeta neck label.',
    shortDesc: 'Chrome purple 3D text. Sleeve detail. 220gsm.',
    category: 'Oversized Tees',
    price: 1199, originalPrice: 1499,
    badge: 'Hot', isFeatured: true,
    colors: ['#080808', '#4a0072'],
    material: '100% Cotton', fit: 'Oversized', gsm: 220,
    images: [
      { url: 'https://placehold.co/600x800/080808/9333ea?text=Saiyan+Front', alt: 'Front', order: 0 },
      { url: 'https://placehold.co/600x800/080808/9333ea?text=Saiyan+Back',  alt: 'Back',  order: 1 },
    ],
    variants: [
      { size: 'S', stock: 20 }, { size: 'M', stock: 30 },
      { size: 'L', stock: 25 }, { size: 'XL', stock: 18 }, { size: 'XXL', stock: 12 },
    ],
    tags: ['purple', 'chrome', 'text', 'oversized'],
  },
  {
    name: 'Chrome Skull Tee',
    slug: 'chrome-skull-tee',
    description: '3D hyper-realistic chrome skull graphic on premium oversized black tee. Metallic rendering catches light beautifully. Noxeta signature neck label.',
    shortDesc: '3D chrome skull. Hyper-realistic print. 220gsm.',
    category: 'Oversized Tees',
    price: 1399,
    badge: null, isFeatured: true,
    colors: ['#080808'],
    material: '100% Cotton', fit: 'Oversized', gsm: 220,
    images: [
      { url: 'https://placehold.co/600x800/080808/c0c0c0?text=Chrome+Skull', alt: 'Chrome skull tee', order: 0 },
    ],
    variants: [
      { size: 'S', stock: 15 }, { size: 'M', stock: 22 },
      { size: 'L', stock: 18 }, { size: 'XL', stock: 12 }, { size: 'XXL', stock: 8 },
    ],
    tags: ['skull', 'chrome', 'metal', 'oversized'],
  },
  {
    name: 'Spirit Figure Tee',
    slug: 'spirit-figure-tee',
    description: 'Ethereal dark-spirit figure rendered in pale blue. Detailed line art on oversized black canvas. Side-placed composition for a unique editorial look.',
    shortDesc: 'Spirit figure. Pale blue line art. 220gsm.',
    category: 'Oversized Tees',
    price: 1199,
    badge: 'Limited', isFeatured: true,
    colors: ['#080808'],
    material: '100% Cotton', fit: 'Oversized', gsm: 220,
    images: [
      { url: 'https://placehold.co/600x800/080808/93c5fd?text=Spirit+Figure', alt: 'Spirit figure tee', order: 0 },
    ],
    variants: [
      { size: 'S', stock: 8 }, { size: 'M', stock: 10 },
      { size: 'L', stock: 8 }, { size: 'XL', stock: 5 }, { size: 'XXL', stock: 3 },
    ],
    tags: ['spirit', 'blue', 'art', 'oversized', 'limited'],
  },
  {
    name: 'Tiger Kämpfe Tee',
    slug: 'tiger-kampfe-tee',
    description: '"Kämpfe mit Stil" — Fight with Style. Distressed tiger face print with German inscription. Vintage-washed feel on premium GSM cotton.',
    shortDesc: 'Distressed tiger + German text. 220gsm.',
    category: 'Oversized Tees',
    price: 1299, originalPrice: 1599,
    badge: null, isFeatured: false,
    colors: ['#080808'],
    material: '100% Cotton', fit: 'Oversized', gsm: 220,
    images: [
      { url: 'https://placehold.co/600x800/080808/f97316?text=Tiger+Kampfe', alt: 'Tiger tee', order: 0 },
    ],
    variants: [
      { size: 'S', stock: 12 }, { size: 'M', stock: 18 },
      { size: 'L', stock: 15 }, { size: 'XL', stock: 10 }, { size: 'XXL', stock: 6 },
    ],
    tags: ['tiger', 'german', 'oversized', 'vintage'],
  },
  {
    name: 'Noxeta Logo Tee',
    slug: 'noxeta-logo-tee',
    description: 'Clean essentials. Small chest Noxeta script logo on heavyweight black tee. The perfect foundation piece for any fit.',
    shortDesc: 'Clean logo tee. Essential piece. 220gsm.',
    category: 'Oversized Tees',
    price: 899,
    badge: null, isFeatured: false,
    colors: ['#080808', '#1a1a2e'],
    material: '100% Cotton', fit: 'Oversized', gsm: 220,
    images: [
      { url: 'https://placehold.co/600x800/080808/c9a84c?text=Noxeta+Logo', alt: 'Logo tee', order: 0 },
    ],
    variants: [
      { size: 'S', stock: 30 }, { size: 'M', stock: 40 },
      { size: 'L', stock: 35 }, { size: 'XL', stock: 25 }, { size: 'XXL', stock: 15 },
    ],
    tags: ['logo', 'essential', 'clean', 'minimal'],
  },
  {
    name: 'Serpent Track Pants',
    slug: 'serpent-track-pants',
    description: 'Black 300gsm fleece track pants featuring a large coiling crimson serpent print on the left leg. Noxeta script logo on right thigh. Elastic drawstring waist, wide straight leg.',
    shortDesc: 'Red serpent print. 300gsm fleece. Wide leg.',
    category: 'Track Pants',
    price: 1699,
    badge: 'New', isFeatured: true,
    colors: ['#080808'],
    material: '100% Heavyweight Fleece', fit: 'Wide Leg', gsm: 300,
    images: [
      { url: 'https://placehold.co/600x800/080808/c0392b?text=Serpent+Pants', alt: 'Serpent pants', order: 0 },
    ],
    variants: [
      { size: 'S', stock: 10 }, { size: 'M', stock: 18 },
      { size: 'L', stock: 15 }, { size: 'XL', stock: 10 }, { size: 'XXL', stock: 6 },
    ],
    tags: ['snake', 'serpent', 'track pants', 'fleece', 'red'],
  },
  {
    name: 'Dragon Koi Pants',
    slug: 'dragon-koi-pants',
    description: 'Off-white Japanese art sweatpants. Vivid blue dragon on right leg, golden koi fish on left. Katakana text accent. A collector piece — limited stock.',
    shortDesc: 'Japanese dragon + koi. Off-white. Collector piece.',
    category: 'Track Pants',
    price: 1999, originalPrice: 2499,
    badge: 'Bestseller', isFeatured: true,
    colors: ['#f5f5f0'],
    material: 'Cotton Fleece', fit: 'Wide Leg', gsm: 280,
    images: [
      { url: 'https://placehold.co/600x800/f5f5f0/1a3a6b?text=Dragon+Koi', alt: 'Dragon koi pants', order: 0 },
    ],
    variants: [
      { size: 'S', stock: 5 }, { size: 'M', stock: 8 },
      { size: 'L', stock: 6 }, { size: 'XL', stock: 4 }, { size: 'XXL', stock: 2 },
    ],
    tags: ['dragon', 'koi', 'japanese', 'white', 'track pants'],
  },
  {
    name: 'Tribal Wing Pants',
    slug: 'tribal-wing-pants',
    description: 'Cream/off-white heavy sweatpants with bold black tribal symmetrical wing design. Wide leg silhouette. A statement bottom for any wardrobe.',
    shortDesc: 'Tribal wing design. Off-white. Wide leg.',
    category: 'Track Pants',
    price: 1599,
    badge: null, isFeatured: false,
    colors: ['#f5f5f0'],
    material: 'Cotton Fleece', fit: 'Wide Leg', gsm: 280,
    images: [
      { url: 'https://placehold.co/600x800/f5f5f0/080808?text=Tribal+Wing', alt: 'Tribal wing pants', order: 0 },
    ],
    variants: [
      { size: 'S', stock: 10 }, { size: 'M', stock: 14 },
      { size: 'L', stock: 12 }, { size: 'XL', stock: 8 }, { size: 'XXL', stock: 5 },
    ],
    tags: ['tribal', 'wing', 'cream', 'track pants'],
  },
  {
    name: 'Golden Deity Pants',
    slug: 'golden-deity-pants',
    description: 'Black track pants with mirror-image golden deity/warrior artwork on both legs. Noxeta script logo. Drawstring waist, tapered hem with cuffs.',
    shortDesc: 'Golden deity print. Black. Tapered cuffs.',
    category: 'Track Pants',
    price: 1899,
    badge: 'Limited', isFeatured: false,
    colors: ['#080808'],
    material: 'Polyester Blend', fit: 'Regular', gsm: 260,
    images: [
      { url: 'https://placehold.co/600x800/080808/c9a84c?text=Golden+Deity', alt: 'Golden deity pants', order: 0 },
    ],
    variants: [
      { size: 'S', stock: 6 }, { size: 'M', stock: 8 },
      { size: 'L', stock: 7 }, { size: 'XL', stock: 5 }, { size: 'XXL', stock: 3 },
    ],
    tags: ['gold', 'deity', 'warrior', 'track pants', 'limited'],
  },
  {
    name: 'CC Front Embroidered Tee',
    slug: 'cc-front-embroidered-tee',
    description: 'Red embroidered Cannibal Corpse drip-logo on the chest. The companion piece to the skull back print tee. Heavy cotton, clean boxy silhouette.',
    shortDesc: 'Red embroidered CC logo. Companion to skull tee.',
    category: 'Oversized Tees',
    price: 1399,
    badge: 'Collab', isFeatured: false,
    colors: ['#080808'],
    material: '100% Heavyweight Cotton', fit: 'Oversized', gsm: 240,
    images: [
      { url: 'https://placehold.co/600x800/080808/dc2626?text=CC+Embroidered', alt: 'CC embroidered tee', order: 0 },
    ],
    variants: [
      { size: 'S', stock: 12 }, { size: 'M', stock: 18 },
      { size: 'L', stock: 15 }, { size: 'XL', stock: 10 }, { size: 'XXL', stock: 7 },
    ],
    tags: ['metal', 'collab', 'embroidered', 'oversized'],
  },
]

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Drop existing indexes to avoid conflicts
    try {
      await mongoose.connection.collection('products').dropIndexes()
      console.log('🗑️  Dropped old indexes')
    } catch (_) {}

    // Clear existing products
    await Product.deleteMany({})
    console.log('🗑️  Cleared products')

    // Insert products one by one to get better error messages
    let seeded = 0
    for (const p of PRODUCTS) {
      try {
        await Product.create(p)
        seeded++
        process.stdout.write(`✅ ${p.name}\n`)
      } catch (e) {
        console.error(`❌ Failed: ${p.name} — ${e.message}`)
      }
    }
    console.log(`\n✅ Seeded ${seeded}/${PRODUCTS.length} products`)

    // Create admin user
    const existing = await User.findOne({ email: 'admin@noxeta.in' })
    if (existing) {
      // Update password in case ADMIN_SECRET changed
      existing.password  = process.env.ADMIN_SECRET || 'admin123'
      existing.role      = 'admin'
      existing.isVerified = true
      await existing.save()
      console.log('✅ Admin user updated: admin@noxeta.in')
    } else {
      await User.create({
        name:       'Noxeta Admin',
        email:      'admin@noxeta.in',
        password:   process.env.ADMIN_SECRET || 'admin123',
        role:       'admin',
        isVerified: true,
      })
      console.log('✅ Admin user created: admin@noxeta.in')
    }

    console.log('\n🎉 Seed complete!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Admin login:')
    console.log('  Email:    admin@noxeta.in')
    console.log('  Password: ' + (process.env.ADMIN_SECRET || 'admin123'))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    process.exit(0)
  } catch (err) {
    console.error('❌ Seed error:', err.message)
    process.exit(1)
  }
}

seed()