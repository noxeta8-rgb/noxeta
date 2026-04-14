# NOXETA — React Frontend Setup

## Quick Start

```bash
# 1. Go into the folder
cd noxeta-react

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# → http://localhost:3000
```

---

## Folder Structure

```
src/
├── main.jsx              ← Entry point
├── App.jsx               ← Router + all providers
├── context/
│   ├── CartContext.jsx   ← Cart state (add/remove/qty)
│   ├── AuthContext.jsx   ← Login/signup/logout
│   ├── ToastContext.jsx  ← Toast notifications
│   └── ThemeContext.jsx  ← Dark/light mode
├── data/
│   └── products.js       ← All 12 products — EDIT HERE to add/change products
├── pages/
│   ├── Home.jsx          ← Homepage (hero, categories, featured, story)
│   ├── Shop.jsx          ← Shop with filters + URL params
│   └── admin/
│       └── Admin.jsx     ← Full admin panel (product CRUD + image manager)
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx    ← Nav with cart badge, auth button, mobile menu
│   │   ├── Footer.jsx
│   │   └── SearchModal.jsx
│   ├── product/
│   │   ├── ProductCard.jsx   ← Card with image slider + quick add
│   │   └── ProductModal.jsx  ← Detail popup with size picker
│   ├── cart/
│   │   └── CartPanel.jsx     ← Slide-in cart panel
│   ├── checkout/
│   │   └── CheckoutModal.jsx ← 2-step checkout + Razorpay
│   ├── auth/
│   │   └── AuthModal.jsx     ← Login + signup tabs
│   └── ui/
│       ├── Cursor.jsx        ← Custom cursor
│       ├── Toast.jsx         ← Toast notification
│       ├── ScrollReveal.jsx  ← Scroll animation wrapper
│       └── ImageSlider.jsx   ← Reusable image slider
└── styles/
    ├── base.css          ← CSS variables, reset, keyframes, buttons
    └── components.css    ← All component styles
```

---

## Routes

| URL        | Page                  |
|------------|-----------------------|
| `/`        | Homepage              |
| `/shop`    | Shop (all products)   |
| `/shop?cat=Track+Pants` | Shop filtered by category |
| `/admin`   | Admin panel           |

---

## Adding Product Images

**Option 1 — Admin Panel (easiest)**
Go to `http://localhost:3000/admin` → click **⊕ Images** on any product → drag & drop photos → Save

**Option 2 — Edit products.js directly**
Open `src/data/products.js`, find the product, add paths to `images[]`:
```js
images: [
  'images/products/my-tee-front.jpg',
  'images/products/my-tee-back.jpg',
],
```
Put the actual files in `public/images/products/`.

---

## Connecting Backend

The Vite dev server proxies `/api` calls to `http://localhost:5000` automatically (configured in `vite.config.js`).

So just run the backend:
```bash
cd noxeta-backend
npm run dev
```

And all API calls work automatically. No URL changes needed.

For production, update `vite.config.js` proxy target to your server URL.

---

## Build for Production

```bash
npm run build
# Output goes to dist/ folder
# Upload dist/ to S3 / Vercel / Netlify
```

---

## Setting Razorpay Key

Open `src/components/checkout/CheckoutModal.jsx` and replace:
```js
const RAZORPAY_KEY = 'rzp_test_XXXXXXXXXX'
```
With your actual key from Razorpay dashboard.
