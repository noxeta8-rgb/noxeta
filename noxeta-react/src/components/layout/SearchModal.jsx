import { useState } from 'react'
import { formatPrice } from '../../data/products'
import { useProducts } from '../../hooks/useProducts'
import ProductModal from '../product/ProductModal'

export default function SearchModal({ onClose }) {
  const [query,   setQuery]   = useState('')
  const [product, setProduct] = useState(null)
  const { products = [] } = useProducts({ sort: 'name', limit: 100 })

  const results = query.length >= 2
    ? products.filter(p => {
        const normalizedQuery = query.toLowerCase()
        return (
          p.name?.toLowerCase().includes(normalizedQuery) ||
          p.description?.toLowerCase().includes(normalizedQuery) ||
          (p.tags || []).some(tag => tag.toLowerCase().includes(normalizedQuery))
        )
      }).slice(0, 6)
    : []

  return (
    <>
      <div className="overlay" onClick={onClose}>
        <div className="search-modal" onClick={e => e.stopPropagation()}
          style={{ width:'92%', maxWidth:'640px', background:'var(--surface)', border:'1px solid var(--border)' }}>
          <div className="search-bar" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'20px 24px', borderBottom:'1px solid var(--border)' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products..."
              style={{ flex:1, background:'none', border:'none', outline:'none', fontFamily:'var(--font-b)', fontSize:'20px', color:'var(--text)' }}
            />
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', fontSize:'18px', cursor:'none' }}>✕</button>
          </div>
          <div style={{ padding:'16px 24px', maxHeight:'400px', overflowY:'auto' }}>
            {results.length === 0 && query.length >= 2 && (
              <div style={{ fontFamily:'var(--font-m)', fontSize:'11px', color:'var(--text-dim)', letterSpacing:'2px', padding:'20px 0' }}>
                No products found for "{query}"
              </div>
            )}
            {results.map(p => (
              <div key={p.id}
                onClick={() => { setProduct(p); onClose() }}
                style={{ display:'flex', gap:'14px', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border)', cursor:'none' }}>
                <img src={p.images?.[0]} alt={p.name}
                  style={{ width:'48px', height:'60px', objectFit:'cover', objectPosition:'top' }}
                  onError={e => { e.target.style.background='var(--surface2)'; e.target.removeAttribute('src') }} />
                <div>
                  <div style={{ fontSize:'15px' }}>{p.name}</div>
                  <div style={{ fontFamily:'var(--font-m)', fontSize:'12px', color:'var(--accent)' }}>{formatPrice(p.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {product && <ProductModal product={product} onClose={() => setProduct(null)} />}
    </>
  )
}
