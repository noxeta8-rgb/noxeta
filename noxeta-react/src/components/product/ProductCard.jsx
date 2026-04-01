import { useState } from 'react'
import { formatPrice, badgeClass } from '../../data/products'
import { useCart }  from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import ProductModal from './ProductModal'
import ImageSlider  from '../ui/ImageSlider'

export default function ProductCard({ product: p }) {
  const [open, setOpen] = useState(false)
  const { addToCart }   = useCart()
  const { showToast }   = useToast()
  const discount = p.originalPrice
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0
  
  const stockCount = p.totalStock !== undefined ? p.totalStock : p.stock;
  const isOutOfStock = stockCount === 0;

  const quickAdd = e => {
    e.stopPropagation()
    const size = p.sizes?.includes('M') ? 'M' : p.sizes?.[0] || 'M'
    addToCart(p, size)
    showToast('Added to cart ✦', `${p.name} — Size ${size}`)
  }

  return (
    <>
      <div className="product-card" onClick={() => setOpen(true)}>
        <div className="card-img-wrap">
          <ImageSlider
            images={p.images || []}
            slideClass="card-slide"
            dotClass="card-dot"
            autoplay={3000}
          />
          {p.badge && (
            <div className={`card-badge ${badgeClass(p.badge)}`}>{p.badge}</div>
          )}
          {isOutOfStock ? (
            <div className="card-badge" style={{ background: 'var(--red)', color: 'white', left: '12px', right: 'auto' }}>SOLD OUT</div>
          ) : discount > 0 ? (
            <div className="discount-badge">-{discount}%</div>
          ) : null}
          {isOutOfStock ? (
             <div className="card-quick-add" style={{ background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'not-allowed' }}>Out of Stock</div>
          ) : (
             <div className="card-quick-add" onClick={quickAdd}>+ Quick Add</div>
          )}
        </div>
        <div className="card-info">
          <div className="card-name">{p.name}</div>
          <div className="card-price">
            {p.originalPrice && <s>{formatPrice(p.originalPrice)}</s>}
            {formatPrice(p.price)}
          </div>
          <div className="card-colors">
            {(p.colors || []).map((c, i) => (
              <div key={i} className={`card-color${i===0?' active':''}`} style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>

      {open && <ProductModal product={p} onClose={() => setOpen(false)} />}
    </>
  )
}
