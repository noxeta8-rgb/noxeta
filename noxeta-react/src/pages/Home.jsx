import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/products'
import { useProducts } from '../hooks/useProducts'
import ProductCard  from '../components/product/ProductCard'
import ScrollReveal from '../components/ui/ScrollReveal'

/* ── Hero Slider ─────────────────────── */
function HeroSlider({ products = [] }) {
  const heroImgs = products.filter(product => product.heroSlide && (product.images || []).length > 0)
  const [idx, setIdx] = useState(0)
  const timer = useRef()

  const goTo = (i) => setIdx(((i % heroImgs.length) + heroImgs.length) % heroImgs.length)

  useEffect(() => {
    if (heroImgs.length <= 1) return
    timer.current = setInterval(() => setIdx(i => (i + 1) % heroImgs.length), 4500)
    return () => clearInterval(timer.current)
  }, [heroImgs.length])

  const slide = dir => { clearInterval(timer.current); goTo(idx + dir) }

  return (
    <div className="hero-right">
      <div className="hero-slider-wrap">
        <div className="hero-slides" style={{ transform:`translateX(-${idx*100}%)` }}>
          {heroImgs.length > 0 ? heroImgs.map((p, i) => (
            <div key={i} className="hero-slide">
              <img src={p.images[0]} alt={p.name}
                onError={e => { e.target.style.display='none'; e.target.parentElement.style.background='linear-gradient(135deg,#0a0010,#080808)' }} />
            </div>
          )) : (
            <div className="hero-slide" style={{ minWidth:'100%', background:'linear-gradient(135deg,#0a0010,#080808)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:'var(--font-d)', fontSize:'48px', letterSpacing:'8px', color:'rgba(201,168,76,0.3)' }}>NOXETA</span>
            </div>
          )}
        </div>
      </div>
      {heroImgs.length > 1 && (
        <div className="hero-dots">
          {heroImgs.map((_, i) => (
            <button key={i} className={`hero-dot${i===idx?' active':''}`} onClick={() => goTo(i)} aria-label={`Slide ${i+1}`} />
          ))}
        </div>
      )}
      <div className="hero-arrows">
        <button className="h-arr" onClick={() => slide(-1)}>←</button>
        <button className="h-arr" onClick={() => slide(1)}>→</button>
      </div>
    </div>
  )
}

/* ── Categories Grid ─────────────────── */
function CatsGrid({ products = [] }) {
  const navigate = useNavigate()
  
  const activeCategories = CATEGORIES.filter(name => 
    products.some(p => p.category === name)
  )

  const cats = activeCategories.map(name => ({
    name,
    img:   products.find(p => p.category === name)?.images?.[0] || '',
    count: products.filter(p => p.category === name).length,
  }))

  if (cats.length === 0) return null;

  return (
    <section className="section cats-section" style={{ background:'var(--surface)' }}>
      <div className="section-head">
        <div>
          <ScrollReveal><p className="section-eye">Browse By Category</p></ScrollReveal>
          <ScrollReveal delay={1}><h2 className="section-title">Shop <em>The Collection</em></h2></ScrollReveal>
        </div>
        <ScrollReveal delay={2}><Link to="/shop" className="btn-ghost">View All →</Link></ScrollReveal>
      </div>
      <div className="cats-grid">
        {cats.map((cat, i) => (
          <div key={cat.name} className={`cat-card${i===0?' large':''}`}
            onClick={() => navigate(`/shop?cat=${encodeURIComponent(cat.name)}`)}>
            {cat.img
              ? <img src={cat.img} alt={cat.name} onError={e => { e.target.style.display='none' }} />
              : <div style={{ width:'100%', height:'100%', background:'var(--surface2)' }} />
            }
            <div className="cat-overlay">
              <div className="cat-name">{cat.name}</div>
              <div className="cat-count">{cat.count} Style{cat.count !== 1 ? 's' : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Story Section ───────────────────── */
function StorySection() {
  const [idx, setIdx] = useState(0)
  const imgs = ['/images/story/1.jpg', '/images/story/2.jpg', '/images/story/3.jpg', '/images/story/4.jpg', '/images/story/5.jpg']

  useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % imgs.length), 3500)
    return () => clearInterval(timer)
  }, [imgs.length])

  return (
    <section className="story-section" id="story">
      <div className="story-visual">
        <div style={{ display: 'flex', height: '100%', transition: 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)', transform: `translateX(-${idx * 100}%)` }}>
          {imgs.map((src, i) => (
            <img key={src} src={src} alt={`Noxeta Model ${i+1}`} style={{ flex: '0 0 100%' }}
              onError={e => { e.target.parentElement.style.background='linear-gradient(135deg,#0a0010,#080808)'; e.target.style.display='none' }} />
          ))}
        </div>
      </div>
      <div className="story-content">
        <ScrollReveal><p className="section-eye">Est. 2026 — Gurugram</p></ScrollReveal>
        <ScrollReveal delay={1}><h2 className="section-title">Born From <em>Darkness</em></h2></ScrollReveal>
        <ScrollReveal delay={2}>
          <blockquote className="story-quote">"Fashion is the armor to survive the reality of everyday life."</blockquote>
        </ScrollReveal>
        <ScrollReveal delay={3}>
          <p className="story-text">Noxeta was born in the underground. Where heavy metal meets high fashion, where streetwear transcends into art. Every drop is a statement.</p>
        </ScrollReveal>
        <ScrollReveal>
          <div className="story-stats">
            {[['12K+','Customers'],['47+','Unique Drops'],['100%','Original Art']].map(([n,l]) => (
              <div key={l}><div className="stat-n">{n}</div><div className="stat-l">{l}</div></div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

/* ── Testimonials ────────────────────── */
const TESTIS = [
  { initials:'RK', name:'Rohan K.', city:'Delhi',     text:'The CC collab tee is my most complimented piece. People stop me on the street asking where I got it. Insane quality for the price.' },
  { initials:'AS', name:'Aanya S.', city:'Mumbai',    text:'Finally a brand that gets the aesthetic. The flame coord set is exactly what Indian streetwear needed. Heavyweight fabric, perfect fit.' },
  { initials:'VP', name:'Vikram P.',city:'Bengaluru', text:'The Dragon Koi pants are absolutely fire. Unique designs you won\'t find anywhere else. Fast shipping, premium packaging. 4th order already.' },
]

function Testimonials() {
  return (
    <section className="section testi-section">
      <ScrollReveal><p className="section-eye">What They Say</p></ScrollReveal>
      <ScrollReveal delay={1}><h2 className="section-title">The <em>Community</em></h2></ScrollReveal>
      <div className="testi-grid">
        {TESTIS.map((t, i) => (
          <div key={t.name} className={`testi-card${i>0?` d${i}`:''}`}>
            <div className="stars">★★★★★</div>
            <p className="testi-text">{t.text}</p>
            <div className="testi-author">
              <div className="testi-av">{t.initials}</div>
              <div>
                <div className="testi-name">{t.name}</div>
                <div className="testi-city">{t.city}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Home Page ───────────────────────── */
export default function Home() {
  const { products = [] } = useProducts()
  const featured = products.filter(product => product.featured).slice(0, 8)

  return (
    <>
      {/* Hero */}
<section className="hero">
  <div className="hero-left">
    <p className="eyebrow">New Drop — SS 2026</p>
    <h1 className="hero-title">
      WEAR<br />THE<br />DARK
      <em>Premium Streetwear</em>
    </h1>
    {/* Added 'readable-sub' class here */}
    <p className="hero-sub readable-sub">
      Crafted for those who exist between shadows and light. Each piece a statement. Each thread a rebellion.
    </p>
    <div className="hero-cta">
      <Link to="/shop" className="btn-primary">Shop Now →</Link>
      <a href="#story" className="btn-ghost"
        onClick={e => { e.preventDefault(); document.getElementById('story')?.scrollIntoView({ behavior:'smooth' }) }}>
        Our Story
      </a>
    </div>
  </div>
  <HeroSlider products={products} />
</section>

      {/* Ticker */}
      <div className="ticker">
        <div className="ticker-inner">
          {['TRACK PANTS','OVERSIZED TEES','CO-ORD SETS','ACID WASH','WAFFLE TEES','TANK TOPS',
            'TRACK PANTS','OVERSIZED TEES','CO-ORD SETS','ACID WASH','WAFFLE TEES','TANK TOPS'].map((t, i) => (
            <span key={i}>{t} <b>✦</b></span>
          ))}
        </div>
      </div>

      {/* Categories */}
      <CatsGrid products={products} />

      {/* Featured Products */}
      <section className="section" style={{ background:'var(--bg)' }}>
        <div className="section-head">
          <div>
            <ScrollReveal><p className="section-eye">Handpicked For You</p></ScrollReveal>
            <ScrollReveal delay={1}><h2 className="section-title">Featured <em>Drops</em></h2></ScrollReveal>
          </div>
          <ScrollReveal><Link to="/shop" className="btn-ghost">View All →</Link></ScrollReveal>
        </div>
        <div className="products-grid">
          {featured.map(p => <ProductCard key={p._mongoId || p.id} product={p} />)}
        </div>
      </section>

      {/* Story */}
      <StorySection />

      {/* Testimonials */}
      <Testimonials />
    </>
  )
}
