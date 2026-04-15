import { useCart }  from '../../context/CartContext'
import { useAuth }  from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatPrice } from '../../data/products'
import { useState } from 'react'
import CheckoutModal from '../checkout/CheckoutModal'

export default function CartPanel() {
  const { cart, cartOpen, setCartOpen, removeFromCart, changeQty, subtotal, shipping, total, itemCount } = useCart()
  const { user, setAuthOpen } = useAuth()
  const { showToast }         = useToast()
  const [checkout, setCheckout] = useState(false)

  const goCheckout = () => {
    if (!user) {
      setCartOpen(false)
      setTimeout(() => { setAuthOpen(true); showToast('Login required', 'Please login to checkout') }, 400)
      return
    }
    setCartOpen(false)
    setTimeout(() => setCheckout(true), 400)
  }

  return (
    <>
      {cartOpen && <div className="backdrop" onClick={() => setCartOpen(false)} style={{ zIndex:2000 }} />}

      <div className={`cart-panel${cartOpen?' open':''}`}>
        <div className="cart-head">
          <div className="cart-title">CART</div>
          <button className="modal-close" onClick={() => setCartOpen(false)}>✕</button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">⊕</div>
              <div className="cart-empty-text">YOUR CART IS EMPTY</div>
              <button className="btn-ghost" style={{ marginTop:'16px' }} onClick={() => setCartOpen(false)}>Shop Now →</button>
            </div>
          ) : (
            cart.map(item => (
              <div className="cart-item" key={item.key}>
                <img className="cart-item-img" src={item.image} alt={item.name}
                  onError={e => { e.target.style.background='var(--surface2)'; e.target.removeAttribute('src') }} />
                <div>
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-meta">SIZE: {item.size} &nbsp;|&nbsp; {formatPrice(item.price)} each</div>
                  <div className="qty-row">
                    <button className="qty-btn" onClick={() => changeQty(item.key, -1)}>−</button>
                    <span className="qty-val">{item.qty}</span>
                    <button className="qty-btn" onClick={() => changeQty(item.key,  1)}>+</button>
                  </div>
                </div>
                <div>
                  <div className="cart-item-price">{formatPrice(item.price * item.qty)}</div>
                  <button className="cart-item-remove" onClick={() => removeFromCart(item.key)}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-foot">
            <div className="cart-total-row">
              <span className="cart-total-label">Total (Shop Above Rs.999 For Free Shipping)</span>
              <span className="cart-total-val">{formatPrice(total)}</span>
            </div>
            <button className="btn-primary btn-block" onClick={goCheckout}>Checkout →</button>
          </div>
        )}
      </div>

      {checkout && <CheckoutModal onClose={() => setCheckout(false)} />}
    </>
  )
}
