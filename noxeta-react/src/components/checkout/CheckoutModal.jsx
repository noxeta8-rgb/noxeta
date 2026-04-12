import { useState } from 'react'
import { useCart }  from '../../context/CartContext'
import { useAuth }  from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatPrice } from '../../data/products'

// Razorpay key from Vite env variable
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || ''

// API base URL for Vercel / hosted deployments
const API = import.meta.env.VITE_API_URL || ''

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== 'undefined') { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload  = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

const METHODS = [
  {
    id: 'upi',
    label: 'UPI',
    sub: 'GPay · PhonePe · Paytm · BHIM & more',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="6" width="18" height="13" rx="2"/>
        <path d="M3 10h18"/>
      </svg>
    ),
  },
  {
    id: 'card',
    label: 'Debit / Credit Card',
    sub: 'Visa · Mastercard · RuPay · Amex',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20M7 15h2M13 15h4"/>
      </svg>
    ),
  },
  {
    id: 'netbanking',
    label: 'Net Banking',
    sub: 'All major Indian banks supported',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11"/>
      </svg>
    ),
  },
  {
    id: 'wallet',
    label: 'Wallets',
    sub: 'Mobikwik · Freecharge · Airtel Money',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
        <circle cx="17" cy="14" r="1.5" fill="currentColor"/>
        <path d="M20 7V5a2 2 0 00-2-2H6"/>
      </svg>
    ),
  },
]

const RAZORPAY_METHOD_MAP = {
  upi:        { method: 'upi' },
  card:       { method: 'card' },
  netbanking: { method: 'netbanking' },
  wallet:     { method: 'wallet' },
}

export default function CheckoutModal({ onClose }) {
  const [step,    setStep]   = useState(1)
  const [method,  setMethod] = useState('upi')
  const [success, setSuccess]= useState(null)
  const [paying,  setPaying] = useState(false)
  const [addr,    setAddr]   = useState({ name:'', phone:'', line1:'', line2:'', city:'', state:'', pincode:'' })

  const { cart, total, subtotal, shipping, clearCart } = useCart()
  const { user, token } = useAuth()
  const { showToast }   = useToast()

  // phone and pincode stay numeric; all other fields auto-uppercase
  const setA = k => e => {
    const val = (k === 'pincode' || k === 'phone') ? e.target.value : e.target.value.toUpperCase()
    setAddr(a => ({ ...a, [k]: val }))
  }

  // ── Step 1: Address ─────────────────────────────────────
  const submitAddress = () => {
    const { name, phone, line1, city, state, pincode } = addr
    if (!name||!phone||!line1||!city||!state||!pincode) {
      showToast('Missing details', 'Please fill all required fields'); return
    }
    if (!/^\d{10}$/.test(phone))   { showToast('Invalid phone',   'Enter a valid 10-digit number'); return }
    if (!/^\d{6}$/.test(pincode))  { showToast('Invalid pincode', 'Enter a valid 6-digit pincode'); return }
    setStep(2)
  }

  // ── Step 2: Place order ──────────────────────────────────
  const placeOrder = async () => {
    setPaying(true)

    let orderId = null
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({
          items: cart.map(i => ({ productId:i.id, name:i.name, size:i.size, quantity:i.qty })),
          shipping: addr,
          paymentMethod: 'razorpay', // backend enum only accepts 'razorpay'
        }),
      })
      const data = await res.json()
      orderId = data.order?.orderId
      if (!orderId) throw new Error(data.error || 'No orderId returned')
    } catch (err) {
      setPaying(false)
      showToast('Error', err.message || 'Could not create order. Please try again.')
      return
    }

    const loaded = await loadRazorpay()
    if (!loaded) {
      setPaying(false)
      showToast('Error', 'Could not load payment gateway. Check your internet and try again.')
      return
    }

    let rzpOrderId, rzpAmount, rzpKeyId
    try {
      const rzpRes = await fetch(`${API}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ orderId }),
      })
      const rzpData = await rzpRes.json()
      if (!rzpRes.ok) throw new Error(rzpData.error || 'Failed to create payment')
      rzpOrderId = rzpData.razorpayOrderId
      rzpAmount  = rzpData.amount
      rzpKeyId   = rzpData.keyId
    } catch (err) {
      setPaying(false)
      showToast('Error', err.message || 'Could not initiate payment. Please try again.')
      return
    }

    const rzpConfig = {
      key:         rzpKeyId || RAZORPAY_KEY,
      order_id:    rzpOrderId,
      amount:      rzpAmount,
      currency:    'INR',
      name:        'NOXETA',
      description: 'Premium Streetwear',
      image:       '/images/favicon.svg',
      prefill: {
        name:    user?.name  || addr.name,
        email:   user?.email || '',
        contact: addr.phone,
      },
      config: {
        display: {
          hide: [],
          preferences: { show_default_blocks: true },
        },
      },
      theme: { color: '#c9a84c' },
      handler: async (response) => {
        try {
          const verifyRes = await fetch(`${API}/api/payments/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              orderId,
            }),
          })
          const verifyData = await verifyRes.json()
          if (!verifyRes.ok) {
            showToast('Payment Error', verifyData.error || 'Payment could not be verified. Contact support.')
            setPaying(false)
            return
          }
          confirmOrder(verifyData.orderId || orderId || genId())
        } catch {
          showToast('Payment Error', 'Could not verify payment. Please contact support.')
          setPaying(false)
        }
      },
      modal: {
        ondismiss: () => {
          setPaying(false)
          showToast('Payment cancelled', 'Your cart is still saved')
        },
      },
    }

    if (RAZORPAY_METHOD_MAP[method]) {
      rzpConfig.config.display.default_block = method === 'upi' ? 'upi' : method
    }

    new window.Razorpay(rzpConfig).open()
  }

  const confirmOrder = (id) => {
    setPaying(false)
    clearCart()
    setSuccess(id)
  }

  const genId = () => 'NXL' + Date.now().toString().slice(-8)

  // ── Success screen ───────────────────────────────────────
  if (success) return (
    <div className="success-screen">
      <div className="success-inner">
        <div className="success-icon">✦</div>
        <h1 className="success-title">ORDER PLACED</h1>
        <p className="success-text">
          Your order is confirmed. A confirmation email has been sent to your inbox. Welcome to the dark side.
        </p>
        <div className="success-oid">Order ID: {success}</div>
        <button className="btn-primary" onClick={onClose}>Continue Shopping →</button>
      </div>
    </div>
  )

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal checkout-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">CHECKOUT</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Steps */}
          <div className="checkout-steps">
            {[['01','Address'],['02','Payment'],['03','Confirm']].map(([num, label], i) => (
              <div key={i} className={`co-step${step===i+1?' active':step>i+1?' done':''}`}>
                <span className="co-num">{num}</span>{label}
              </div>
            ))}
          </div>

          {/* ── Step 1: Address ── */}
          {step === 1 && (
            <>
              {[
                ['name',  'Full Name *',       'Your full name'],
                ['phone', 'Phone Number *',     '10-digit mobile'],
                ['line1', 'Address Line 1 *',   'House/Flat No., Street'],
                ['line2', 'Address Line 2',     'Area, Landmark (optional)'],
              ].map(([k, label, ph]) => (
                <div className="form-group" key={k}>
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    placeholder={ph}
                    value={addr[k]}
                    onChange={setA(k)}
                    style={k !== 'phone' ? { textTransform: 'uppercase' } : {}}
                  />
                </div>
              ))}
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input className="form-input" placeholder="Mumbai" value={addr.city} onChange={setA('city')} style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <input className="form-input" placeholder="Maharashtra" value={addr.state} onChange={setA('state')} style={{ textTransform: 'uppercase' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Pincode *</label>
                <input className="form-input" placeholder="6-digit pincode" maxLength={6} value={addr.pincode} onChange={setA('pincode')} />
              </div>
              <button className="btn-primary btn-block" onClick={submitAddress}>
                Continue to Payment →
              </button>
            </>
          )}

          {/* ── Step 2: Payment ── */}
          {step === 2 && (
            <>
              {/* Order summary */}
              <div className="order-summary">
                <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'2px', color:'var(--text-dim)', marginBottom:'12px' }}>
                  ORDER SUMMARY
                </div>
                {cart.map(i => (
                  <div className="order-row" key={i.key}>
                    <span>
                      {i.name} × {i.qty}{' '}
                      <span style={{ fontFamily:'var(--font-m)', fontSize:'9px', color:'var(--text-dim)' }}>({i.size})</span>
                    </span>
                    <span style={{ fontFamily:'var(--font-m)', color:'var(--accent)' }}>{formatPrice(i.price * i.qty)}</span>
                  </div>
                ))}
                <div className="order-row" style={{ marginTop:'8px' }}>
                  <span>Shipping</span>
                  <span style={{ fontFamily:'var(--font-m)', color: shipping===0 ? 'var(--green)' : 'var(--text)' }}>
                    {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                  </span>
                </div>
                <div className="order-total">
                  <div className="order-row">
                    <span>TOTAL</span>
                    <span style={{ color:'var(--accent)' }}>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment method selector */}
              <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'2px', color:'var(--text-dim)', marginBottom:'10px' }}>
                SELECT PAYMENT METHOD
              </div>
              <div className="pay-options">
                {METHODS.map(({ id, label, sub, icon }) => (
                  <div
                    key={id}
                    className={`pay-label${method===id?' selected':''}`}
                    onClick={() => setMethod(id)}
                    style={{ alignItems:'center', gap:'14px' }}
                  >
                    <input
                      type="radio" name="pay" value={id}
                      checked={method===id} onChange={() => setMethod(id)}
                      style={{ accentColor:'var(--accent)', flexShrink:0 }}
                    />
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', flex:1 }}>
                      <span style={{ opacity: method===id ? 1 : 0.4, color:'var(--accent)', flexShrink:0 }}>
                        {icon}
                      </span>
                      <div>
                        <div style={{ fontFamily:'var(--font-m)', fontSize:'10px', letterSpacing:'1px' }}>{label}</div>
                        <div style={{ fontFamily:'var(--font-m)', fontSize:'8px', letterSpacing:'0.5px', color:'var(--text-dim)', marginTop:'2px' }}>{sub}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {method === 'upi' && (
                <div style={{ fontFamily:'var(--font-m)', fontSize:'8px', letterSpacing:'0.5px', color:'var(--text-dim)',
                  border:'1px solid var(--border)', padding:'10px 12px', marginBottom:'14px', lineHeight:'1.6' }}>
                  ⟁ &nbsp;You'll enter your UPI ID or scan QR inside the secure payment window.
                  GPay, PhonePe, Paytm all supported.
                </div>
              )}

              <button
                className="btn-primary btn-block"
                onClick={placeOrder}
                disabled={paying}
                style={paying ? { opacity:0.6, cursor:'not-allowed' } : {}}
              >
                {paying ? 'Opening Payment...' : `Pay ${formatPrice(total)} →`}
              </button>
              <button className="btn-ghost btn-block" style={{ marginTop:'10px' }} onClick={() => setStep(1)}>
                ← Edit Address
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
