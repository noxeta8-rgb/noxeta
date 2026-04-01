import { useState } from 'react'
import { formatPrice, badgeClass } from '../../data/products'
import { useCart }  from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import ImageSlider  from '../ui/ImageSlider'

export default function ProductModal({ product: p, onClose }) {
  const availableSizes = p.variants && p.variants.length > 0
    ? p.variants.filter(v => Number(v.stock) > 0).map(v => v.size)
    : (p.sizes || ['S','M','L','XL','XXL'])
  const [size, setSize]   = useState(availableSizes[1] || availableSizes[0] || 'M')
  const { addToCart, setCartOpen } = useCart()
  const { showToast }     = useToast()
  
  const stockCount = p.totalStock !== undefined ? p.totalStock : p.stock;
  const isOutOfStock = stockCount === 0;

  const handleAdd = () => {
    if (!size) { showToast('Select a size', 'Please choose your size first'); return }
    addToCart(p, size)
    onClose()
    setTimeout(() => setCartOpen(true), 320)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal product-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}
          style={{ position:'absolute', top:'14px', right:'14px', zIndex:20 }}>✕</button>

        <div className="product-modal-inner">
          {/* Left — images */}
          <div>
            <div className="pd-slider" style={{ overflow:'hidden' }}>
              <ImageSlider
                images={p.images || []}
                slideClass="pd-slide"
                showArrows
                showThumbs
              />
            </div>
          </div>

          {/* Right — details */}
          <div className="pd-right">
            {p.badge && (
              <div className={`card-badge pd-badge ${badgeClass(p.badge)}`} style={{ display:'inline-block', marginBottom:'12px' }}>
                {p.badge}
              </div>
            )}
            <div className="pd-name">{p.name}</div>
            <div className="pd-price">
              {p.originalPrice && <s>{formatPrice(p.originalPrice)}</s>}
              {formatPrice(p.price)}
            </div>
            <p className="pd-desc">{p.description}</p>

            <div className="size-label">Select Size</div>
            <div className="sizes">
              {(p.variants && p.variants.length > 0
                ? p.variants.filter(v => Number(v.stock) > 0).map(v => v.size)
                : (p.sizes || ['S','M','L','XL','XXL'])
              ).map(s => (
                <button key={s} className={`size-btn${size===s?' active':''}`} onClick={() => setSize(s)}>{s}</button>
              ))}
            </div>

            {isOutOfStock ? (
              <button className="add-to-cart-btn" style={{ background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'not-allowed' }} disabled>
                <span>Out of Stock</span>
              </button>
            ) : (
              <button className="add-to-cart-btn" onClick={handleAdd}>
                <span>Add to Cart — {formatPrice(p.price)}</span>
              </button>
            )}

            <div className="pd-feats">
              {p.material && <span className="pd-feat">✓ {p.material}</span>}
              {p.gsm      && <span className="pd-feat">✓ {p.gsm}gsm</span>}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
