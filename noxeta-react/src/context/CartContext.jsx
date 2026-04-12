import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

const SHIPPING_FREE_ABOVE = 999
const SHIPPING_CHARGE     = 99

export function CartProvider({ children }) {
  const [cart, setCart]       = useState(() =>
    JSON.parse(localStorage.getItem('nox_cart') || '[]')
  )
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('nox_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product, size) => {
    if (!size) return false
    const key = `${product.id}-${size}`
    setCart(prev => {
      const existing = prev.find(i => i.key === key)
      if (existing) return prev.map(i => i.key === key ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, {
        key, id: product.id, name: product.name,
        price: product.price, image: product.images?.[0] || '',
        size, qty: 1,
      }]
    })
    return true
  }

  const removeFromCart = (key) =>
    setCart(prev => prev.filter(i => i.key !== key))

  const changeQty = (key, delta) =>
    setCart(prev => prev.map(i =>
      i.key === key ? { ...i, qty: Math.max(1, i.qty + delta) } : i
    ))

  const clearCart = () => setCart([])

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping = subtotal >= SHIPPING_FREE_ABOVE ? 0 : SHIPPING_CHARGE
  const total    = subtotal + shipping
  const itemCount = cart.reduce((s, i) => s + i.qty, 0)

  return (
    <CartContext.Provider value={{
      cart, cartOpen, setCartOpen,
      addToCart, removeFromCart, changeQty, clearCart,
      subtotal, shipping, total, itemCount,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
