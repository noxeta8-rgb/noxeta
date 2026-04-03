import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { PRODUCTS, CATEGORIES } from '../../data/products'
import { PRODUCTS_STORAGE_KEY, PRODUCTS_UPDATED_EVENT } from '../../hooks/useProducts'

const initProducts = () => {
  try {
    const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return []
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

const emptyForm = {
  name:'', category:'', price:'', originalPrice:'',
  badge:'', material:'', gsm:'', fit:'', description:'', featured:'false',
  sizeStocks: { S: '', M: '', L: '', XL: '', XXL: '' },
  customSizes: '',
}

// ── Compress image to small JPEG before storing ──────────────
const compressImage = (file, maxW = 800, quality = 0.72) =>
  new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const scale  = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })

// ── Save to localStorage with quota guard ────────────────────
const safeSetLocal = (key, value) => {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) return false
    throw e
  }
}

const broadcastProductsUpdated = () => {
  window.dispatchEvent(new Event(PRODUCTS_UPDATED_EVENT))
}

const toImageRecord = (image, fallbackAlt = '', index = 0) => {
  if (typeof image === 'string') {
    return {
      url: image,
      thumbnail: image,
      publicId: '',
      alt: fallbackAlt || `Product image ${index + 1}`,
      order: index,
    }
  }

  return {
    url: image?.url || '',
    thumbnail: image?.thumbnail || image?.url || '',
    publicId: image?.publicId || '',
    alt: image?.alt || fallbackAlt || `Product image ${index + 1}`,
    order: image?.order ?? index,
  }
}

export default function Admin() {
  const { user, logout, setAuthOpen } = useAuth()
  const navigate = useNavigate()
  const [products,  setProducts]  = useState(initProducts)
  const [orders,    setOrders]    = useState([])
  const [section,   setSection]   = useState('products')
  const [search,    setSearch]    = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [imgModal,  setImgModal]  = useState(null)
  const [prodModal, setProdModal] = useState(null)
  const [curImgs,   setCurImgs]   = useState([])
  const [toast,     setToast]     = useState(null)
  const [form,      setForm]      = useState(emptyForm)
  const [saving,      setSaving]      = useState(false)
  const [cloudUsage,  setCloudUsage]  = useState(null)   // { used_bytes, limit }
  const fileRef    = useRef()
  const toastTimer = useRef()

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = (prods) => {
    setProducts(prods)
    // Sync live PRODUCTS array
    prods.forEach(sp => {
      const live = PRODUCTS.find(p => p.id === sp.id)
      if (live) live.images = sp.images || []
    })
    console.log('💾 Saving', prods.length, 'products to localStorage')
    // Try saving — if quota exceeded strip base64 and only keep paths
    const ok = safeSetLocal(PRODUCTS_STORAGE_KEY, JSON.stringify(prods))
    if (!ok) {
      // Quota exceeded — save lightweight version (no base64, only real URLs)
      const lite = prods.map(p => ({
        ...p,
        images: (p.images || []).filter(url => !String(url).startsWith('data:')),
        _imageRecords: (p._imageRecords || []).filter(img => !String(img?.url || '').startsWith('data:')),
      }))
      safeSetLocal(PRODUCTS_STORAGE_KEY, JSON.stringify(lite))
      showToast('Storage almost full', 'Connect backend to save more images permanently')
    }
    // Clear localStorage cache after a short delay so user-facing pages
    // always re-fetch fresh data from backend instead of serving stale cache
    setTimeout(() => {
      try { localStorage.removeItem(PRODUCTS_STORAGE_KEY) } catch {}
      broadcastProductsUpdated()
    }, 600)
  }

  const showToast = (title, msg = '') => {
    setToast({ title, msg })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  // ── All useEffects must be before any early return ──────
  // ── Fetch Cloudinary usage from backend ──────────────────
  useEffect(() => {
    const fetchUsage = async () => {
      const token = localStorage.getItem('nox_token') || ''
      // Skip if clearly a demo/offline token
      if (!token || token.startsWith('demo-')) return
      try {
        const res = await fetch('/api/upload/usage', {
          headers: { Authorization: 'Bearer ' + token }
        })
        if (res.ok) {
          const data = await res.json()
          setCloudUsage(data)
        }
        // Silently ignore 401/403 — just means no real token yet
      } catch { /* backend not running — ignore */ }
    }
    if (user) fetchUsage()
  }, [user])

  // Always fetch fresh from backend on load so admin sees latest data
  useEffect(() => {
    fetchAdminProducts()
  }, [])

  // Fetch orders only when switching to orders section
  useEffect(() => {
    if (section === 'orders') fetchOrders()
  }, [section])

  // Redirect if not logged in or not admin
  if (!user) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:'48px', minWidth:'320px', textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:'32px', letterSpacing:'6px', marginBottom:'8px' }}>
            NOX<span style={{ color:'var(--accent)' }}>E</span>TA
          </div>
          <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'3px', color:'var(--text-dim)', marginBottom:'32px' }}>ADMIN ACCESS</div>
          <p style={{ fontFamily:'var(--font-b)', fontSize:'15px', color:'var(--text-dim)', marginBottom:'28px', lineHeight:1.7 }}>
            Please login with your admin account to access the panel.
          </p>
          <button className="btn-primary btn-block" onClick={() => { setAuthOpen(true); navigate('/') }}>
            Login to Continue →
          </button>
        </div>
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:'48px', minWidth:'320px', textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:'32px', letterSpacing:'6px', marginBottom:'8px', color:'var(--red)' }}>ACCESS DENIED</div>
          <p style={{ fontFamily:'var(--font-b)', fontSize:'15px', color:'var(--text-dim)', marginBottom:'28px' }}>
            Your account does not have admin privileges.
          </p>
          <button className="btn-ghost btn-block" onClick={() => navigate('/')}>← Back to Store</button>
        </div>
      </div>
    )
  }

  const totalImgs = products.reduce((s, p) => s + (p.images?.length || 0), 0)
  const cats      = new Set(products.map(p => p.category)).size
  const tableProducts = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
    (!filterCat || p.category === filterCat)
  )


  const fetchOrders = async () => {
    const token = localStorage.getItem('nox_token') || ''
    if (!token || token.startsWith('demo-')) return
    try {
      const res = await fetch('/api/orders?limit=100', { headers: { Authorization: 'Bearer ' + token } })
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (e) { console.error('Error fetching orders:', e) }
  }

  const fetchAdminProducts = async () => {
    const token = localStorage.getItem('nox_token') || ''
    if (!token || token.startsWith('demo-')) return
    try {
      const res = await fetch('/api/products?limit=100', { headers: { Authorization: 'Bearer ' + token } })
      if (res.ok) {
        const data = await res.json()
        const formatted = (data.products || []).map(p => {
          const rawImages = Array.isArray(p.images) && p.images.length > 0 ? p.images : []
          const validImageStrings = rawImages.map(img => typeof img === 'string' ? img : img?.url).filter(Boolean)
          const calcStock = p.variants ? p.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0) : 0

          return {
            ...p,
            id: p._id,          // use MongoDB _id as the id
            _mongoId: p._id,
            images: validImageStrings,
            heroSlide: p.heroSlide || validImageStrings.length > 0,
            stock: calcStock,
          }
        })

        save(formatted)
        console.log('✅ Loaded', formatted.length, 'products from backend')
      }
    } catch (e) { console.error('Error fetching admin products:', e) }
  }



  const updateOrderStatus = async (orderId, status) => {
    const token = localStorage.getItem('nox_token') || ''
    if (!token || token.startsWith('demo-')) {
       return showToast('Error', 'Real backend required')
    }
    
    // Optimistic update locally
    setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ status })
      })
      if (!res.ok) {
         showToast('Error', 'Could not update status')
         fetchOrders() // revert
      } else {
         showToast('Success', 'Order status updated')
      }
    } catch {
       showToast('Error', 'Connection failed')
    }
  }

  const resolveBackendProductId = async (product) => {
    // Already have a real MongoDB id
    if (product?._mongoId && !String(product._mongoId).startsWith('local-')) {
      return product._mongoId
    }

    const token = localStorage.getItem('nox_token') || ''

    // Search MongoDB by slug or name
    try {
      const res = await fetch('/api/products?limit=100')
      if (res.ok) {
        const data = await res.json()
        const match = (data.products || []).find(item =>
          item.slug === product.slug || item.name === product.name
        )
        if (match?._id) return match._id
      }
    } catch {}

    // Product not in MongoDB yet (local-only) — create it now so images have a real ID to attach to
    if (token && !token.startsWith('demo-') && product?.name) {
      try {
        const slug = (product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
        const payload = {
          name: product.name,
          slug,
          category: product.category || 'uncategorized',
          price: Number(product.price) || 0,
          description: product.description || product.name,
          sizes: product.sizes || ['S','M','L','XL','XXL'],
          variants: product.variants || [],
          isFeatured: product.isFeatured || false,
          isActive: true,
        }
        const createRes = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify(payload),
        })
        if (createRes.ok) {
          const created = await createRes.json()
          const newId = created.product?._id
          if (newId) {
            // Patch local state so future calls skip this step
            setProducts(prev => prev.map(p =>
              p.id === product.id ? { ...p, _mongoId: newId, id: newId } : p
            ))
            return newId
          }
        }
      } catch {}
    }

    return null
  }

  const openImgModal = (id) => {
    const p = products.find(x => x.id === id)
    const existingImages = (p?._imageRecords || p?.images || []).map((image, index) => ({
      ...toImageRecord(image, p?.name, index),
      isNew: false,
    })).filter(image => image.url)

    setCurImgs(existingImages)
    // Use MongoDB _id if available, otherwise use frontend id
    const mongoId = p?._mongoId || id
    setImgModal({ frontendId: id, mongoId, name: p?.name })
  }

  const handleFiles = (files) => {
    Array.from(files).filter(f => f.type.startsWith('image/')).forEach(async file => {
      if (file.size > 15 * 1024 * 1024) { showToast('Too large', file.name + ' exceeds 15MB'); return }
      // Compress before adding to preview
      const compressed = await compressImage(file)
      setCurImgs(prev => [...prev, { url: compressed, isNew: true, file }])
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  const saveImages = async () => {
    const p = products.find(x => x.id === (imgModal?.frontendId ?? imgModal))
    if (!p) return
    setSaving(true)

    const frontendId = imgModal?.frontendId ?? imgModal
    const token = localStorage.getItem('nox_token') || ''
    let productTargetId = await resolveBackendProductId(p) || imgModal?.mongoId || frontendId

    const newFiles = curImgs.filter(img => img.isNew && img.file)
    const oldImages = curImgs
      .filter(img => !img.isNew)
      .map((img, index) => toImageRecord(img, p.name, index))
      .filter(img => img.url)
    let uploadedImages = []

    // Upload all new files in one multipart request
    if (newFiles.length > 0) {
      // Check if we have a real token before attempting upload
      if (!token || token.startsWith('demo-')) {
        showToast('Not logged in', 'Please login with your admin account first, then try again')
        setSaving(false)
        return
      }

      try {
        const fd = new FormData()
        newFiles.forEach(img => fd.append('images', img.file))

        console.log('Uploading', newFiles.length, 'files to /api/upload/product/' + productTargetId)

        const res = await fetch('/api/upload/product/' + productTargetId, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
          body: fd,
        })

        const data = await res.json()
        console.log('Upload response:', res.status, data)

        if (res.ok) {
          uploadedImages = (data.images || []).map((img, index) =>
            toImageRecord(img, p.name, oldImages.length + index)
          )

          // Refresh usage stats
          try {
            const uRes = await fetch('/api/upload/usage', {
              headers: { Authorization: 'Bearer ' + token }
            })
            if (uRes.ok) setCloudUsage(await uRes.json())
          } catch {}
        } else {
          showToast('Upload failed', data.error || `Server error: ${res.status}`)
          setSaving(false)
          return
        }
      } catch (e) {
        console.error('Upload error:', e)
        showToast('Connection error', 'Could not reach backend. Is it running on port 5000?')
        setSaving(false)
        return
      }
    }

    const finalImageRecords = [...oldImages, ...uploadedImages].map((img, index) => ({
      ...toImageRecord(img, p.name, index),
      order: index,
    }))
    const finalUrls = finalImageRecords.map(img => img.url)

    if (token && !token.startsWith('demo-')) {
      try {
        const replaceRes = await fetch('/api/products/' + productTargetId + '/images/replace', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ images: finalImageRecords }),
        })
        if (!replaceRes.ok) {
          const errData = await replaceRes.json().catch(() => ({}))
          console.error('images/replace failed:', replaceRes.status, errData)
          showToast('Save failed', 'Images uploaded but could not be linked to product in database: ' + (errData.error || replaceRes.status))
          setSaving(false)
          return
        }
      } catch (e) {
        console.warn('Could not save to MongoDB:', e.message)
        showToast('Save failed', 'Images uploaded to Cloudinary but could not be saved to database')
        setSaving(false)
        return
      }
    }

    const updated = products.map(x =>
      x.id === frontendId
        ? {
            ...x,
            _mongoId: typeof productTargetId === 'string' ? productTargetId : x._mongoId,
            _imageRecords: finalImageRecords,
            images: finalUrls,
            heroSlide: finalUrls.length > 0,
          }
        : x
    )
    save(updated)
    showToast('Images saved ✦', finalUrls.length + ' image' + (finalUrls.length !== 1 ? 's' : '') + ' saved for ' + p.name)
    setSaving(false)
    setImgModal(null)
    setCurImgs([])
  }

  const openEdit = (id) => {
    if (id === 'new') { setForm(emptyForm); setProdModal('new'); return }
    const p = products.find(x => x.id === id)
    if (!p) return
    // Build sizeStocks from variants
    const sizeStocks = { S: '', M: '', L: '', XL: '', XXL: '' }
    if (Array.isArray(p.variants)) {
      p.variants.forEach(v => { if (v.size in sizeStocks) sizeStocks[v.size] = String(v.stock || '') })
    }
    setForm({ name:p.name, category:p.category, price:p.price, originalPrice:p.originalPrice||'', badge:p.badge||'', material:p.material||'', gsm:p.gsm||'', fit:p.fit||'', description:p.description, featured:(p.isFeatured ?? p.featured)?'true':'false', sizeStocks, customSizes:'' })
    setProdModal(id)
  }

  const saveForm = async () => {
    if (!form.name || !form.category || !form.price || !form.description) { showToast('Missing fields', 'Name, category, price and description are required'); return }
    setSaving(true)

    // Build variants from per-size stock inputs + optional custom sizes
    const extraSizes = form.customSizes
      ? form.customSizes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      : []
    const allSizes = [...DEFAULT_SIZES, ...extraSizes.filter(s => !DEFAULT_SIZES.includes(s))]
    const variants = allSizes.map(size => ({
      size,
      stock: Number(form.sizeStocks?.[size] || 0),
    }))
    const totalStockVal = variants.reduce((s, v) => s + v.stock, 0)

    const data = { ...form, price:Number(form.price), originalPrice:Number(form.originalPrice)||null, gsm:Number(form.gsm)||null, featured:form.featured==='true', isFeatured:form.featured==='true', sizes:allSizes, variants, colors:['#080808'], tags:[], heroSlide:form.featured==='true', slug:form.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), totalStock: totalStockVal }
    
    const token = localStorage.getItem('nox_token') || ''
    if (token && !token.startsWith('demo-')) {
      try {
        const isNew = prodModal === 'new'
        let targetId = null
        if (!isNew) {
          const existing = products.find(p => p.id === prodModal)
          targetId = await resolveBackendProductId(existing)
        }
        
        const url = targetId ? `/api/products/${targetId}` : '/api/products'
        const method = targetId ? 'PUT' : 'POST'
        
        const { _id, _mongoId, id, ...cleanData } = data;
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify(cleanData),
        })
        
        if (res.ok) {
          const resData = await res.json()
          if (resData.product && resData.product._id) {
            data._mongoId = resData.product._id
            data.totalStock = resData.product.totalStock
          }
        } else {
          const errData = await res.json()
          showToast('Database Error', errData.error || 'Failed to save to cloud')
        }
      } catch (err) {
        showToast('Connection Error', 'Could not save to database')
      }
    }

    let updated
    if (prodModal === 'new') {
      data.id = data._mongoId || ('local-' + Date.now())
      data.images = []
      data._imageRecords = []
      updated = [...products, data]
      showToast('Product added ✦', form.name + ' — Add images next!')
    } else {
      updated = products.map(p => p.id === prodModal ? { ...p, ...data } : p)
      showToast('Product updated ✦', form.name)
    }
    save(updated)
    setSaving(false)
    setProdModal(null)
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return
    const token = localStorage.getItem('nox_token') || ''
    if (token && !token.startsWith('demo-')) {
      try {
        const existing = products.find(p => p.id === id)
        const targetId = await resolveBackendProductId(existing)
        if (targetId) {
          await fetch(`/api/products/${targetId}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token },
          })
        }
      } catch (err) {
        console.warn('Could not delete from backend:', err)
      }
    }
    save(products.filter(p => p.id !== id))
    showToast('Deleted', '')
  }



  const inp = { width:'100%', padding:'11px 14px', background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', fontFamily:'var(--font-m)', fontSize:'12px', outline:'none' }
  const lbl = { display:'block', fontSize:'9px', letterSpacing:'2px', textTransform:'uppercase', color:'var(--text-dim)', marginBottom:'7px', fontFamily:'var(--font-m)' }
  const fg  = { marginBottom:'16px' }
  const th  = { background:'var(--surface2)', padding:'12px 16px', textAlign:'left', fontSize:'9px', letterSpacing:'2px', textTransform:'uppercase', color:'var(--text-dim)', borderBottom:'1px solid var(--border)' }
  const td  = { padding:'14px 16px', borderBottom:'1px solid var(--border)', verticalAlign:'middle' }


  return (
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', minHeight:'100vh', paddingTop:'72px', background:'var(--bg)' }}>

      {toast && (
        <div style={{ position:'fixed', bottom:'24px', right:'24px', background:'var(--surface2)', border:'1px solid var(--accent)', padding:'14px 20px', zIndex:9999, fontFamily:'var(--font-m)', fontSize:'11px', minWidth:'220px', maxWidth:'320px' }}>
          <div style={{ color:'var(--accent)', marginBottom:'3px' }}>{toast.title}</div>
          <div style={{ color:'var(--text-dim)', fontSize:'10px' }}>{toast.msg}</div>
        </div>
      )}

      <aside style={{ background:'var(--surface)', borderRight:'1px solid var(--border)', position:'sticky', top:'72px', height:'calc(100vh - 72px)', overflowY:'auto' }}>
        <div style={{ padding:'28px 24px', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-d)', fontSize:'22px', letterSpacing:'6px' }}>
          NOX<span style={{ color:'var(--accent)' }}>E</span>TA
          <small style={{ display:'block', fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'3px', color:'var(--text-dim)', marginTop:'2px' }}>ADMIN PANEL</small>
        </div>
        <nav style={{ padding:'16px 0' }}>
          {[['products','⊞ Products'],['orders','📦 Orders'],['images','◎ Image Manager']].map(([id,label]) => (
            <button key={id} onClick={() => setSection(id)}
              style={{ display:'block', width:'100%', padding:'13px 24px', background:section===id?'var(--surface2)':'none', border:'none', borderLeft:section===id?'2px solid var(--accent)':'2px solid transparent', color:section===id?'var(--accent)':'var(--text-dim)', fontFamily:'var(--font-m)', fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', textAlign:'left', cursor:'pointer' }}>
              {label}
            </button>
          ))}
          <div style={{ margin:'16px 24px', padding:'12px', background:'var(--surface2)', border:'1px solid var(--border)' }}>
            <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'1px', color:'var(--text-dim)', marginBottom:'6px' }}>CLOUDINARY STORAGE</div>
            {cloudUsage ? (
              <>
                <div style={{ fontFamily:'var(--font-m)', fontSize:'12px', color:'var(--green)' }}>
                  {(cloudUsage.used_bytes / 1024 / 1024 / 1024).toFixed(2)} GB used
                </div>
                <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', color:'var(--text-dim)', marginTop:'2px' }}>
                  of {cloudUsage.limit ? (cloudUsage.limit / 1024 / 1024 / 1024).toFixed(0) : '25'} GB free plan
                </div>
                <div style={{ marginTop:'8px', height:'4px', background:'var(--border)', borderRadius:'2px' }}>
                  <div style={{ height:'100%', background:'var(--accent)', borderRadius:'2px', width: Math.min(100, (cloudUsage.used_bytes / ((cloudUsage.limit || 25*1024*1024*1024))) * 100) + '%' }} />
                </div>
              </>
            ) : (
              <div style={{ fontFamily:'var(--font-m)', fontSize:'10px', color:'var(--text-dim)', lineHeight:1.6 }}>
                25 GB free<br/>Connect backend to see usage
              </div>
            )}
          </div>
          <button onClick={() => {
              if (window.confirm('Sync will pull latest data from server and overwrite local edits. Continue?')) {
                localStorage.removeItem(PRODUCTS_STORAGE_KEY)
                broadcastProductsUpdated()
                fetchAdminProducts().then(() => showToast('Synced ✦', 'Latest data loaded from server'))
              }
            }}
            style={{ display:'block', width:'100%', padding:'13px 24px', background:'none', border:'none', borderLeft:'2px solid transparent', color:'var(--text-dim)', fontFamily:'var(--font-m)', fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', textAlign:'left', cursor:'pointer' }}>
            ↻ Sync from Server
          </button>
          <button onClick={() => window.open('/','_blank')}
            style={{ display:'block', width:'100%', padding:'13px 24px', background:'none', border:'none', borderLeft:'2px solid transparent', color:'var(--text-dim)', fontFamily:'var(--font-m)', fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', textAlign:'left', cursor:'pointer' }}>
            ↗ View Store
          </button>
          <button onClick={() => { logout?.(); navigate('/') }}
            style={{ display:'block', width:'100%', padding:'13px 24px', background:'none', border:'none', borderLeft:'2px solid transparent', color:'var(--text-dim)', fontFamily:'var(--font-m)', fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', textAlign:'left', cursor:'pointer' }}>
            ✕ Logout
          </button>
        </nav>
      </aside>

      <main>
        {section === 'products' && (
          <>
            <div style={{ padding:'28px 40px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:'72px', background:'var(--bg)', zIndex:10 }}>
              <div style={{ fontFamily:'var(--font-d)', fontSize:'28px', letterSpacing:'4px' }}>PRODUCTS</div>
              <button className="btn-primary" onClick={() => openEdit('new')}>+ Add Product</button>
            </div>
            <div style={{ padding:'40px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'36px' }}>
                {[[products.length,'Total Products'],[products.filter(p=>p.featured).length,'Featured'],[cats,'Categories'],[totalImgs,'Total Images']].map(([val,label]) => (
                  <div key={label} style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:'24px' }}>
                    <div style={{ fontFamily:'var(--font-d)', fontSize:'36px', color:'var(--accent)' }}>{val}</div>
                    <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'2px', color:'var(--text-dim)', textTransform:'uppercase', marginTop:'4px' }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', gap:'12px', marginBottom:'20px' }}>
                <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, maxWidth:'320px', fontSize:'11px' }} />
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...inp, width:'200px' }}>
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['Image','Product','Category','Price','Stock','Images','Featured','Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {tableProducts.length === 0
                      ? <tr><td colSpan={8} style={{ ...td, textAlign:'center', padding:'40px', color:'var(--text-dim)' }}>No products found</td></tr>
                      : tableProducts.map(p => (
                        <tr key={p.id}>
                          <td style={td}><img src={p.images?.[0]} alt="" style={{ width:'48px', height:'60px', objectFit:'cover', objectPosition:'top', background:'var(--surface2)' }} onError={e => e.target.removeAttribute('src')} /></td>
                          <td style={td}><div style={{ fontSize:'13px' }}>{p.name}</div><div style={{ fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>{p.slug}</div></td>
                          <td style={td}><span style={{ background:'var(--surface2)', padding:'3px 8px', fontSize:'9px' }}>{p.category}</span></td>
                          <td style={{ ...td, fontFamily:'var(--font-m)', fontSize:'12px', color:'var(--accent)' }}>
                            {p.originalPrice && <div style={{ color:'var(--text-dim)', fontSize:'10px', textDecoration:'line-through' }}>₹{p.originalPrice}</div>}
                            ₹{p.price}
                          </td>
                          <td style={{ ...td, fontFamily:'var(--font-m)', fontSize:'11px', color: (p.totalStock||p.stock)>0?'var(--green)':'var(--red)' }}>{(p.totalStock||p.stock||0)}</td>
                          <td style={{ ...td, color:(p.images?.length||0)>0?'var(--green)':'var(--red)' }}>{p.images?.length||0}</td>
                          <td style={td}><span style={{ width:'8px', height:'8px', borderRadius:'50%', background:p.featured?'var(--green)':'var(--red)', display:'inline-block', marginRight:'6px' }}/>{p.featured?'Yes':'No'}</td>
                          <td style={td}>
                            <div style={{ display:'flex', gap:'6px' }}>
                              <button onClick={() => openImgModal(p.id)} style={{ padding:'7px 14px', background:'var(--accent)', border:'1px solid var(--accent)', color:'var(--bg)', fontFamily:'var(--font-m)', fontSize:'10px', cursor:'pointer' }}>⊕ Images</button>
                              <button onClick={() => openEdit(p.id)} style={{ padding:'7px 14px', background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontFamily:'var(--font-m)', fontSize:'10px', cursor:'pointer' }}>Edit</button>
                              <button onClick={() => deleteProduct(p.id)} style={{ padding:'7px 14px', background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontFamily:'var(--font-m)', fontSize:'10px', cursor:'pointer' }}>✕</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {section === 'orders' && (
          <>
            <div style={{ padding:'28px 40px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:'72px', background:'var(--bg)', zIndex:10 }}>
              <div style={{ fontFamily:'var(--font-d)', fontSize:'28px', letterSpacing:'4px' }}>ORDERS</div>
              <button className="btn-ghost" onClick={fetchOrders}>↻ Refresh</button>
            </div>
            <div style={{ padding:'40px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', marginBottom:'36px' }}>
                {[[orders.length,'Total Orders'],
                  [orders.filter(o => o.status === 'placed' || o.status === 'confirmed').length,'Pending'],
                  [orders.filter(o => o.status === 'delivered').length,'Delivered']
                 ].map(([val,label]) => (
                  <div key={label} style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:'24px' }}>
                    <div style={{ fontFamily:'var(--font-d)', fontSize:'36px', color:'var(--accent)' }}>{val}</div>
                    <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'2px', color:'var(--text-dim)', textTransform:'uppercase', marginTop:'4px' }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['Order ID','Customer','Shipping Address','Items','Amount','Status','Placed On'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {orders.length === 0
                      ? <tr><td colSpan={7} style={{ ...td, textAlign:'center', padding:'40px', color:'var(--text-dim)' }}>No orders found</td></tr>
                      : orders.map(o => (
                        <tr key={o.orderId}>
                          <td style={{...td, fontFamily:'var(--font-m)', fontSize:'11px', color:'var(--accent)'}}>#{o.orderId}</td>
                          <td style={td}>
                            <div style={{ fontSize:'13px' }}>{o.user?.name || o.shipping?.name}</div>
                            <div style={{ fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>{o.user?.email}</div>
                            <div style={{ fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>{o.shipping?.phone}</div>
                          </td>
                          <td style={td}>
                            <div style={{ fontSize:'11px', lineHeight:'1.6' }}>
                              {o.shipping?.line1 && <div>{o.shipping.line1}</div>}
                              {o.shipping?.line2 && <div>{o.shipping.line2}</div>}
                              {(o.shipping?.city || o.shipping?.state) && (
                                <div>{[o.shipping.city, o.shipping.state].filter(Boolean).join(', ')}</div>
                              )}
                              {o.shipping?.pin && <div>PIN: {o.shipping.pin}</div>}
                            </div>
                          </td>
                          <td style={td}>
                            {o.items?.map((item, idx) => (
                              <div key={idx} style={{ fontSize:'11px', color:'var(--text-dim)', marginBottom:'4px' }}>
                                {item.quantity}x {item.name} ({item.size})
                              </div>
                            ))}
                          </td>
                          <td style={{ ...td, fontFamily:'var(--font-m)', fontSize:'12px' }}>₹{o.total}</td>
                          <td style={td}>
                            <select 
                              value={o.status} 
                              onChange={(e) => updateOrderStatus(o.orderId, e.target.value)}
                              style={{ ...inp, padding:'6px 10px', fontSize:'11px', width:'auto' }}>
                              {['placed','confirmed','shipped','delivered','cancelled'].map(st => (
                                <option key={st} value={st}>{st.toUpperCase()}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{...td, fontSize:'11px', color:'var(--text-dim)'}}>
                            {new Date(o.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {section === 'images' && (
          <>
            <div style={{ padding:'28px 40px', borderBottom:'1px solid var(--border)', position:'sticky', top:'72px', background:'var(--bg)', zIndex:10 }}>
              <div style={{ fontFamily:'var(--font-d)', fontSize:'28px', letterSpacing:'4px' }}>IMAGE MANAGER</div>
            </div>
            <div style={{ padding:'40px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'16px' }}>
              {products.map(p => (
                <div key={p.id} onClick={() => openImgModal(p.id)}
                  style={{ background:'var(--surface)', border:'1px solid var(--border)', cursor:'pointer', transition:'border-color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                  <div style={{ aspectRatio:'3/4', background:'var(--surface2)', overflow:'hidden', position:'relative' }}>
                    {p.images?.[0] ? <img src={p.images[0]} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} onError={e => e.target.style.display='none'} /> : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-dim)', fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'2px' }}>NO IMAGE</div>}
                    <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,.7)', padding:'8px', fontFamily:'var(--font-m)', fontSize:'9px', color:'var(--accent)' }}>{p.images?.length||0} image{(p.images?.length||0)!==1?'s':''}</div>
                  </div>
                  <div style={{ padding:'12px' }}>
                    <div style={{ fontFamily:'var(--font-m)', fontSize:'11px', letterSpacing:'1px', marginBottom:'2px' }}>{p.name}</div>
                    <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', color:'var(--text-dim)' }}>{p.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {imgModal && (
        <div className="overlay" onClick={() => { if (!saving) setImgModal(null) }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', width:'92%', maxWidth:'760px', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'24px 28px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'var(--surface)', zIndex:1 }}>
              <div style={{ fontFamily:'var(--font-d)', fontSize:'22px', letterSpacing:'3px' }}>
                IMAGES — {products.find(p=>p.id===(imgModal?.frontendId??imgModal))?.name}
              </div>
              <button onClick={() => setImgModal(null)} style={{ background:'none', border:'none', color:'var(--text-dim)', fontSize:'18px', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:'28px' }}>
              <div style={{ border:'2px dashed var(--border)', padding:'36px', textAlign:'center', marginBottom:'24px', transition:'border-color .2s' }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--accent)' }}
                onDragLeave={e => e.currentTarget.style.borderColor='var(--border)'}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--border)'; handleFiles(e.dataTransfer.files) }}>
                <div style={{ fontSize:'32px', color:'var(--text-dim)', marginBottom:'10px' }}>⊕</div>
                <div style={{ fontFamily:'var(--font-m)', fontSize:'11px', letterSpacing:'2px', color:'var(--text-dim)', marginBottom:'8px' }}>DRAG & DROP IMAGES HERE</div>
                <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', color:'var(--text-dim)', opacity:.6, marginBottom:'14px' }}>Auto-compressed for storage • Unlimited images</div>
                <label htmlFor="admin-file-input" style={{ display:'inline-block', background:'var(--accent)', color:'var(--bg)', padding:'11px 28px', fontFamily:'var(--font-m)', fontSize:'10px', letterSpacing:'2px', cursor:'pointer', textTransform:'uppercase' }}>
                  + Click To Browse
                </label>
                <input id="admin-file-input" ref={fileRef} type="file" multiple accept="image/*" onChange={e => handleFiles(e.target.files)} style={{ display:'none' }} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'24px' }}>
                {curImgs.length === 0
                  ? <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'24px', color:'var(--text-dim)', fontFamily:'var(--font-m)', fontSize:'10px', letterSpacing:'2px' }}>No images yet — upload above</div>
                  : curImgs.map((img,i) => (
                    <div key={i} style={{ position:'relative', aspectRatio:'3/4', background:'var(--surface2)' }}>
                      <img src={img.url} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} onError={e => e.target.style.display='none'} />
                      <div style={{ position:'absolute', top:'6px', left:'6px', background:'var(--accent)', color:'var(--bg)', width:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontFamily:'var(--font-m)' }}>{i+1}</div>
                      <button onClick={() => setCurImgs(imgs => imgs.filter((_,j) => j!==i))} style={{ position:'absolute', top:'6px', right:'6px', background:'rgba(192,57,43,.9)', color:'#fff', border:'none', width:'22px', height:'22px', cursor:'pointer', fontSize:'14px' }}>✕</button>
                    </div>
                  ))
                }
              </div>
              <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end', alignItems:'center' }}>
                {saving && <span style={{ fontFamily:'var(--font-m)', fontSize:'10px', color:'var(--text-dim)', letterSpacing:'1px' }}>Saving...</span>}
                <button className="btn-ghost" onClick={() => setImgModal(null)} disabled={saving}>Cancel</button>
                <button className="btn-primary" onClick={saveImages} disabled={saving}
                  style={{ opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : 'Save Images →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {prodModal && (
        <div className="overlay" onClick={() => setProdModal(null)}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', width:'92%', maxWidth:'640px', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'24px 28px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'var(--surface)', zIndex:1 }}>
              <div style={{ fontFamily:'var(--font-d)', fontSize:'22px', letterSpacing:'3px' }}>{prodModal==='new'?'ADD PRODUCT':'EDIT PRODUCT'}</div>
              <button onClick={() => setProdModal(null)} style={{ background:'none', border:'none', color:'var(--text-dim)', fontSize:'18px', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:'28px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                <div style={fg}><label style={lbl}>Product Name *</label><input style={inp} placeholder="e.g. Flame Cod Set" value={form.name} onChange={setF('name')} /></div>
                <div style={fg}><label style={lbl}>Category *</label><select style={inp} value={form.category} onChange={setF('category')}><option value="">Select...</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div style={fg}><label style={lbl}>Price (₹) *</label><input style={inp} type="number" placeholder="1299" value={form.price} onChange={setF('price')} /></div>
                <div style={fg}><label style={lbl}>Original Price (₹)</label><input style={inp} type="number" placeholder="Leave blank if no discount" value={form.originalPrice} onChange={setF('originalPrice')} /></div>
                <div style={fg}><label style={lbl}>Badge</label><select style={inp} value={form.badge} onChange={setF('badge')}><option value="">None</option>{['New','Hot','Limited','Collab','Bestseller','Sale'].map(b=><option key={b}>{b}</option>)}</select></div>
                <div style={fg}><label style={lbl}>Material</label><input style={inp} placeholder="100% Cotton" value={form.material} onChange={setF('material')} /></div>
                <div style={fg}><label style={lbl}>GSM</label><input style={inp} type="number" placeholder="220" value={form.gsm} onChange={setF('gsm')} /></div>
                <div style={fg}><label style={lbl}>Fit</label><select style={inp} value={form.fit} onChange={setF('fit')}><option value="">Select...</option>{['Oversized','Regular','Slim','Wide Leg'].map(f=><option key={f}>{f}</option>)}</select></div>
              </div>
              <div style={fg}><label style={lbl}>Description *</label><textarea style={{ ...inp, resize:'vertical', minHeight:'90px' }} value={form.description} onChange={setF('description')} /></div>
              <div style={fg}><label style={lbl}>Featured on Homepage</label><select style={inp} value={form.featured} onChange={setF('featured')}><option value="false">No</option><option value="true">Yes</option></select></div>

              {/* ── Per-Size Stock ─────────────────── */}
              <div style={{ ...fg, gridColumn: '1 / -1' }}>
                <label style={lbl}>Stock Per Size</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px' }}>
                  {DEFAULT_SIZES.map(size => (
                    <div key={size}>
                      <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'2px', color:'var(--text-dim)', marginBottom:'5px', textAlign:'center' }}>{size}</div>
                      <input
                        style={{ ...inp, textAlign:'center', padding:'10px 6px' }}
                        type="number" min="0" placeholder="0"
                        value={form.sizeStocks?.[size] ?? ''}
                        onChange={e => setForm(f => ({ ...f, sizeStocks: { ...f.sizeStocks, [size]: e.target.value } }))}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'1px', color:'var(--text-dim)', flexShrink:0 }}>CUSTOM SIZES (comma-separated):</div>
                  <input
                    style={{ ...inp, fontSize:'11px', flex:1 }}
                    placeholder="e.g. XS, 3XL, 4XL"
                    value={form.customSizes || ''}
                    onChange={e => setForm(f => ({ ...f, customSizes: e.target.value }))}
                  />
                </div>
                {form.customSizes && form.customSizes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).map(size => (
                  <div key={size} style={{ marginTop:'8px', display:'grid', gridTemplateColumns:'80px 1fr', gap:'10px', alignItems:'center' }}>
                    <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', letterSpacing:'2px', color:'var(--accent)', textAlign:'center', border:'1px solid var(--accent)', padding:'6px' }}>{size}</div>
                    <input
                      style={{ ...inp, textAlign:'center' }}
                      type="number" min="0" placeholder="0"
                      value={form.sizeStocks?.[size] ?? ''}
                      onChange={e => setForm(f => ({ ...f, sizeStocks: { ...f.sizeStocks, [size]: e.target.value } }))}
                    />
                  </div>
                ))}
                <div style={{ marginTop:'10px', fontFamily:'var(--font-m)', fontSize:'10px', color:'var(--text-dim)' }}>
                  Total stock: <span style={{ color:'var(--accent)' }}>
                    {(Object.values(form.sizeStocks || {}).reduce((s, v) => s + (Number(v) || 0), 0) +
                      (form.customSizes ? form.customSizes.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean).reduce((s,size) => s + (Number(form.sizeStocks?.[size])||0), 0) : 0)
                    )}
                  </span>
                </div>
              </div>

              <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end', marginTop:'8px' }}>
                <button className="btn-ghost" onClick={() => setProdModal(null)}>Cancel</button>
                <button className="btn-primary" onClick={saveForm}>Save Product →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
