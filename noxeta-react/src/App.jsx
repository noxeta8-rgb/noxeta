import { Routes, Route } from 'react-router-dom'
import { CartProvider }  from './context/CartContext'
import { AuthProvider }  from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Navbar    from './components/layout/Navbar'
import Footer    from './components/layout/Footer'
import Toast     from './components/ui/Toast'
import CartPanel from './components/cart/CartPanel'
import Home      from './pages/Home'
import Shop      from './pages/Shop'
import Admin     from './pages/admin/Admin'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <Toast />
          <Navbar />
          <CartPanel />
          <Routes>
            <Route path="/"      element={<Home />} />
            <Route path="/shop"  element={<Shop />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
          <Footer />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  )
}