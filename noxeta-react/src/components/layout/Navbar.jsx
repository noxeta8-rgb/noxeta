import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart }  from '../../context/CartContext'
import { useAuth }  from '../../context/AuthContext'
import AuthModal    from '../auth/AuthModal'
import SearchModal  from './SearchModal'

export default function Navbar() {
  const [scrolled,   setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [dropOpen,   setDropOpen]   = useState(false)
  const [isLight, setIsLight] = useState(() => localStorage.getItem('nox_theme') === 'light')

  const { itemCount, setCartOpen }              = useCart()
  const { user, logout, authOpen, setAuthOpen } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 70)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (isLight) {
      document.body.classList.add('light')
      localStorage.setItem('nox_theme', 'light')
    } else {
      document.body.classList.remove('light')
      localStorage.setItem('nox_theme', 'dark')
    }
  }, [isLight])

  useEffect(() => {
    if (!dropOpen) return
    const handler = () => setDropOpen(false)
    setTimeout(() => document.addEventListener('click', handler), 0)
    return () => document.removeEventListener('click', handler)
  }, [dropOpen])

  const navBtnBase = {
    background: 'none', border: 'none', color: 'var(--text-dim)',
    fontFamily: 'var(--font-m)', fontSize: '11px', letterSpacing: '1px',
    textTransform: 'uppercase', cursor: 'pointer', padding: '6px 10px',
    transition: 'color .3s',
  }

  return (
    <>
      <nav className={`nox-nav${scrolled ? ' scrolled' : ''}`}>
        <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/images/logo-light.png" alt="Noxeta" className="logo-light" style={{ height: '32px' }} />
          <img src="/images/logo-dark.png" alt="Noxeta" className="logo-dark" style={{ height: '32px' }} />
        </Link>

        <ul className="nav-links">
          <li><NavLink to="/shop">Shop</NavLink></li>
          <li><NavLink to="/shop?cat=Track+Pants">Track Pants</NavLink></li>
          <li><NavLink to="/shop?cat=Tees">Tees</NavLink></li>
          <li><NavLink to="/shop?cat=Cod+Sets">Cod set</NavLink></li>
          <li>
            <a href="#story" onClick={e => {
              e.preventDefault()
              document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })
            }}>Story</a>
          </li>
        </ul>

        <div className="nav-right">

          {/* Theme Toggle */}
          <button style={{ ...navBtnBase, display:'flex', alignItems:'center', padding:'6px' }} 
            onClick={() => setIsLight(!isLight)}
            onMouseEnter={e => e.currentTarget.style.color='var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-dim)'}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
            {isLight ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
          </button>

          {/* Search — text label */}
          <button style={navBtnBase} onClick={() => setSearchOpen(true)}
            onMouseEnter={e => e.currentTarget.style.color='var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-dim)'}>
            Search
          </button>

          {/* Cart — text label with count */}
          <button style={{ ...navBtnBase, display:'flex', alignItems:'center', gap:'5px', position:'relative' }}
            onClick={() => setCartOpen(true)}
            onMouseEnter={e => e.currentTarget.style.color='var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-dim)'}>
            Cart
            {itemCount > 0 && (
              <span style={{ background:'var(--red)', color:'#fff', fontSize:'9px', width:'16px', height:'16px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-m)' }}>
                {itemCount}
              </span>
            )}
          </button>

          {/* Account / User */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={e => { e.stopPropagation(); setDropOpen(o => !o) }}
                style={{ display:'flex', alignItems:'center', gap:'7px', fontFamily:'var(--font-m)', fontSize:'11px', letterSpacing:'1px', color:'var(--text)', padding:'5px 10px', border:'1px solid var(--border)', background:'var(--surface2)', cursor:'pointer', transition:'border-color .3s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                <span style={{ width:'22px', height:'22px', borderRadius:'50%', background:'var(--accent)', color:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontFamily:'var(--font-m)', flexShrink:0 }}>
                  {user.name[0].toUpperCase()}
                </span>
                <span style={{ maxWidth:'90px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {user.name}
                </span>
                <span style={{ fontSize:'9px', opacity:.5 }}>▾</span>
              </button>

              {dropOpen && (
                <div onClick={e => e.stopPropagation()}
                  style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'var(--surface)', border:'1px solid var(--border)', minWidth:'180px', zIndex:2000, boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
                  <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ fontFamily:'var(--font-m)', fontSize:'11px', letterSpacing:'1px', color:'var(--text)' }}>{user.name}</div>
                    <div style={{ fontFamily:'var(--font-m)', fontSize:'9px', color:'var(--text-dim)', marginTop:'3px', letterSpacing:'1px' }}>{user.email}</div>
                  </div>
                  {user.role === 'admin' && (
                    <button onClick={() => { setDropOpen(false); navigate('/admin') }}
                      style={{ display:'block', width:'100%', padding:'12px 18px', background:'none', border:'none', color:'var(--accent)', fontFamily:'var(--font-m)', fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', textAlign:'left', cursor:'pointer', borderBottom:'1px solid var(--border)' }}>
                      ⊞ Admin Panel
                    </button>
                  )}
                  <button onClick={() => { setDropOpen(false); logout() }}
                    style={{ display:'block', width:'100%', padding:'12px 18px', background:'none', border:'none', color:'var(--text-dim)', fontFamily:'var(--font-m)', fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', textAlign:'left', cursor:'pointer' }}>
                    ✕ Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)}
              style={{ ...navBtnBase, border:'1px solid var(--border)', padding:'6px 16px' }}
              onMouseEnter={e => { e.currentTarget.style.color='var(--accent)'; e.currentTarget.style.borderColor='var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.color='var(--text-dim)'; e.currentTarget.style.borderColor='var(--border)' }}>
              Login
            </button>
          )}

          {/* Hamburger */}
          <button className={`hamburger${mobileOpen ? ' open' : ''}`}
            onClick={() => setMobileOpen(o => !o)}
            style={{ cursor: 'pointer' }}>
            <span/><span/><span/>
          </button>
        </div>
      </nav>

      {/* Mobile Nav */}
      <div className={`mobile-nav${mobileOpen ? ' open' : ''}`}>
        {['Track Pants','Tees','Cod Sets','Acid Wash Tees','Waffle T-Shirts','Tank Tops','Vests'].map(cat => (
          <Link key={cat} to={`/shop?cat=${encodeURIComponent(cat)}`} onClick={() => setMobileOpen(false)}>{cat}</Link>
        ))}
        {!user && (
          <button onClick={() => { setMobileOpen(false); setAuthOpen(true) }}
            style={{ background:'none', border:'none', color:'var(--accent)', fontFamily:'var(--font-m)', fontSize:'12px', letterSpacing:'3px', textTransform:'uppercase', textAlign:'left', padding:'14px 0', borderBottom:'1px solid var(--border)', cursor:'pointer', width:'100%' }}>
            Login / Sign Up
          </button>
        )}
        {user?.role === 'admin' && (
          <Link to="/admin" onClick={() => setMobileOpen(false)} style={{ color:'var(--accent)' }}>Admin Panel</Link>
        )}
      </div>

            {authOpen   && <AuthModal   onClose={() => setAuthOpen(false)} />}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  )
}

 
