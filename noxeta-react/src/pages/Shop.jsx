import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { CATEGORIES } from '../data/products'
import ProductCard from '../components/product/ProductCard'

const normalizeCategory = (value) =>
  CATEGORIES.includes(value) ? value : ''

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [category, setCategory] = useState(() => normalizeCategory(searchParams.get('cat') || ''))
  const [sort, setSort] = useState('-createdAt')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [view, setView] = useState('grid')

  const { products = [], ready, error } = useProducts({
    category: category || undefined,
    sort,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    limit: 100,
  })

  useEffect(() => {
    const nextCategory = normalizeCategory(searchParams.get('cat') || '')
    setCategory(nextCategory)

    if ((searchParams.get('cat') || '') !== nextCategory) {
      nextCategory ? setSearchParams({ cat: nextCategory }) : setSearchParams({})
    }
  }, [searchParams])

  const selectCat = cat => {
    setCategory(cat)
    cat ? setSearchParams({ cat }) : setSearchParams({})
  }

  const clearFilters = () => {
    setCategory('')
    setSort('-createdAt')
    setMinPrice('')
    setMaxPrice('')
    setSearchParams({})
  }

  return (
    <>
      <div className="shop-hero">
        <h1 className="shop-hero-title">{category ? category.toUpperCase() : 'ALL DROPS'}</h1>
        <p className="shop-hero-sub">Premium streetwear. Original art. Wear the dark.</p>
        <p className="shop-hero-count">{products.length} item{products.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="shop-layout">
        <aside className="filters-sidebar">
          <div className="filter-title">
            FILTERS
            <button className="filter-clear" onClick={clearFilters}>Clear All</button>
          </div>

          <div className="filter-group">
            <div className="filter-group-title">Category</div>
            <div className="filter-options">
              <label className={`filter-option${!category ? ' selected' : ''}`}>
                <input type="radio" name="cat" checked={!category} onChange={() => selectCat('')} /> All
              </label>
              {CATEGORIES.map(cat => (
                <label key={cat} className={`filter-option${category === cat ? ' selected' : ''}`}>
                  <input type="radio" name="cat" checked={category === cat} onChange={() => selectCat(cat)} />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-title">Price Range</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="number" className="form-input" style={{ padding: '8px 10px', fontSize: '11px' }}
                placeholder="₹0" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
              <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-m)', fontSize: '11px' }}>—</span>
              <input type="number" className="form-input" style={{ padding: '8px 10px', fontSize: '11px' }}
                placeholder="₹5000" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-title">Sort By</div>
            <div className="filter-options">
              {[
                ['-createdAt', 'Newest'], 
                ['price', 'Price: Low to High'], 
                ['-price', 'Price: High to Low'], 
                ['name', 'Name A–Z']
              ].map(([val, label]) => (
                <label key={val} className={`filter-option${sort === val ? ' selected' : ''}`}>
                  <input type="radio" name="sort" checked={sort === val} onChange={() => setSort(val)} /> {label}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div className="shop-products-wrap">
          <div className="shop-toolbar">
            <span style={{ fontFamily: 'var(--font-m)', fontSize: '10px', letterSpacing: '2px', color: 'var(--text-dim)' }}>
              {products.length} product{products.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="-createdAt">Newest</option>
                <option value="price">Price ↑</option>
                <option value="-price">Price ↓</option>
                <option value="name">Name A–Z</option>
              </select>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')}>⊞</button>
                <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>☰</button>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'red' }}>
              <div style={{ fontFamily: 'var(--font-m)', fontSize: '11px', letterSpacing: '1px' }}>ERROR: {error}</div>
            </div>
          )}

          {!ready && !error ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
              <div style={{ fontFamily: 'var(--font-m)', fontSize: '11px', letterSpacing: '3px' }}>LOADING...</div>
            </div>
          ) : products.length === 0 && !error ? (
            <div className="no-results">
              <div className="no-results-icon">⊘</div>
              <div className="no-results-text">NO PRODUCTS FOUND</div>
              <button className="btn-ghost" style={{ marginTop: '20px' }} onClick={clearFilters}>Clear Filters</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: view === 'list' ? '1fr' : 'repeat(3,1fr)', gap: '20px' }}>
              {products.map(p => <ProductCard key={p._mongoId || p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
