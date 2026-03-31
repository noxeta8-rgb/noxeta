import { useEffect, useState } from 'react'
import { PRODUCTS } from '../data/products'

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
export const PRODUCTS_STORAGE_KEY = 'nox_admin_products'
export const PRODUCTS_UPDATED_EVENT = 'nox-products-updated'

const imageUrls = (product = {}) => {
  const source = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : Array.isArray(product._imageRecords) ? product._imageRecords : []

  return source
    .map(img => (typeof img === 'string' ? img : img?.url))
    .filter(Boolean)
}

const cloneList = (list = []) => list.map(item => ({ ...item }))

const matchesProduct = (left = {}, right = {}) =>
  (left.id && right.id && String(left.id) === String(right.id)) ||
  (left._mongoId && right._mongoId && String(left._mongoId) === String(right._mongoId)) ||
  (left._id && right._id && String(left._id) === String(right._id)) ||
  (left.slug && right.slug && left.slug === right.slug) ||
  (left.name && right.name && left.name === right.name)

const findMatch = (list = [], product = {}) =>
  list.find(item => matchesProduct(item, product)) || null

const isWeakImageSource = (url = '') =>
  !url ||
  url.startsWith('images/') ||
  url.includes('placehold.co')

const normalizeProduct = (product, fallback = {}, index = 0) => {
  const variants = Array.isArray(product.variants) && product.variants.length > 0
    ? cloneList(product.variants)
    : Array.isArray(fallback.variants) ? cloneList(fallback.variants) : []

  const productImages = imageUrls(product)
  const fallbackImages = imageUrls(fallback)

  // FIX: Only use fallback images if product has no usable images.
  // Removed the broken condition that forced fallback whenever fallback had cloudinary URLs —
  // that was causing old/local images to always override freshly updated backend images.
  const shouldUseFallbackImages =
    fallbackImages.length > 0 &&
    (
      productImages.length === 0 ||
      productImages.every(isWeakImageSource)
    )
  const images = shouldUseFallbackImages ? fallbackImages : (productImages.length > 0 ? productImages : fallbackImages)

  const sizes = Array.isArray(product.sizes) && product.sizes.length > 0
    ? [...product.sizes]
    : variants.length > 0
      ? variants.map(v => v.size).filter(Boolean)
      : Array.isArray(fallback.sizes) && fallback.sizes.length > 0
        ? [...fallback.sizes]
        : [...DEFAULT_SIZES]

  const colors = Array.isArray(product.colors) && product.colors.length > 0
    ? [...product.colors]
    : Array.isArray(fallback.colors) ? [...fallback.colors] : []

  const tags = Array.isArray(product.tags) && product.tags.length > 0
    ? [...product.tags]
    : Array.isArray(fallback.tags) ? [...fallback.tags] : []

  const featured = product.isFeatured ?? product.featured ?? fallback.isFeatured ?? fallback.featured ?? false
  const price = Number(product.price ?? fallback.price ?? 0)
  const originalPrice = product.originalPrice ?? fallback.originalPrice ?? null
  const fallbackId = fallback.id ?? fallback._id ?? fallback.slug
  const id = product.id ?? product._id ?? fallbackId ?? `product-${index + 1}`

  const discount = product.discount ?? fallback.discount ?? (
    originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0
  )

  return {
    ...fallback,
    ...product,
    id,
    _mongoId: product._id ?? fallback._mongoId ?? fallback._id ?? null,
    images,
    variants,
    sizes,
    colors,
    tags,
    price,
    originalPrice,
    discount,
    featured,
    isFeatured: featured,
    heroSlide: product.heroSlide ?? fallback.heroSlide ?? (featured && images.length > 0),
    totalStock: variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0),
  }
}

const sortProducts = (products, sort = '-createdAt') => {
  const list = [...products]

  switch (sort) {
    case 'price':
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price)
    case '-price':
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price)
    case 'name':
    case 'name-asc':
      return list.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return list.sort((a, b) => {
        const dateA = Date.parse(a.createdAt || 0) || 0
        const dateB = Date.parse(b.createdAt || 0) || 0
        if (dateA !== dateB) return dateB - dateA
        return String(b.id).localeCompare(String(a.id), undefined, { numeric: true })
      })
  }
}

const applyClientFilters = (products, filter = {}) => {
  let list = [...products]

  if (filter.category) {
    list = list.filter(product => product.category === filter.category)
  }

  if (filter.featured) {
    list = list.filter(product => product.featured)
  }

  if (filter.search) {
    const query = filter.search.toLowerCase()
    list = list.filter(product =>
      product.name?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      (product.tags || []).some(tag => tag.toLowerCase().includes(query))
    )
  }

  if (filter.minPrice !== undefined) {
    list = list.filter(product => product.price >= Number(filter.minPrice))
  }

  if (filter.maxPrice !== undefined) {
    list = list.filter(product => product.price <= Number(filter.maxPrice))
  }

  list = sortProducts(list, filter.sort)

  if (filter.limit) {
    return list.slice(0, Number(filter.limit))
  }

  return list
}

const findFallbackMatch = (product) =>
  PRODUCTS.find(item =>
    (product.id && item.id === product.id) ||
    (product.slug && item.slug === product.slug) ||
    (product.name && item.name === product.name)
  ) || {}

const getSavedProducts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || 'null')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

const getLocalProducts = () => {
  const savedProducts = getSavedProducts()

  if (savedProducts.length > 0) {
    return savedProducts.map((product, index) =>
      normalizeProduct(product, findFallbackMatch(product), index)
    )
  }

  return []
}

const mergeProducts = (backendProducts = [], localProducts = getLocalProducts()) => {
  if (backendProducts.length === 0) {
    return [...localProducts]
  }

  // FIX: Backend is always authoritative — pass backend as primary, local as fallback only.
  // Old code had these swapped, so localStorage always won over fresh backend data.
  const normalizedBackend = backendProducts.map((product, index) => {
    const localMatch = findMatch(localProducts, product)
    return normalizeProduct(product, localMatch || product, index)
  })

  const merged = [...normalizedBackend]

  localProducts.forEach(product => {
    if (!findMatch(normalizedBackend, product)) {
      merged.push(normalizeProduct(product, findFallbackMatch(product), merged.length))
    }
  })

  return merged
}

const getSnapshotProducts = (filter = {}, backendProducts = []) => {
  const localProducts = getLocalProducts()
  const mergedProducts = mergeProducts(backendProducts, localProducts)
  return applyClientFilters(mergedProducts, filter)
}

const buildApiUrl = (filter = {}) => {
  const params = new URLSearchParams()

  Object.entries({ ...filter, limit: filter.limit ?? 100 }).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })

  const query = params.toString()
  return query ? `/api/products?${query}` : '/api/products'
}

export function useProducts(filter = {}) {
  const filterKey = JSON.stringify(filter)
  const [products, setProducts] = useState(() => getSnapshotProducts(filter))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const handleProductsUpdated = () => {
      // FIX: Clear stale localStorage cache so user pages always re-fetch fresh from backend
      try { localStorage.removeItem(PRODUCTS_STORAGE_KEY) } catch {}
      setRefreshTick(tick => tick + 1)
    }
    const handleStorage = (event) => {
      if (!event.key || event.key === PRODUCTS_STORAGE_KEY) {
        setRefreshTick(tick => tick + 1)
      }
    }

    window.addEventListener(PRODUCTS_UPDATED_EVENT, handleProductsUpdated)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, handleProductsUpdated)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const fallbackProducts = getSnapshotProducts(filter)

    const load = async () => {
      setReady(false)

      try {
        const res = await fetch(buildApiUrl(filter), { cache: 'no-store' })
        if (!res.ok) throw new Error(`API error: ${res.status}`)

        const data = await res.json()
        const backendProducts = Array.isArray(data.products) ? data.products : []

        if (backendProducts.length === 0) {
          if (!cancelled) {
            setProducts(fallbackProducts)
            setError(null)
          }
          return
        }

        if (!cancelled) {
          setProducts(getSnapshotProducts(filter, backendProducts))
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setProducts(fallbackProducts)
          setError(fallbackProducts.length > 0 ? null : (err.message || 'Could not load products'))
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [filterKey, refreshTick])

  return { products, ready, error }
}
