import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()
const API = '/api'

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(() => JSON.parse(localStorage.getItem('nox_user') || 'null'))
  const [authOpen, setAuthOpen] = useState(false)

  const saveUser = (u, tok) => {
    setUser(u)
    localStorage.setItem('nox_user', JSON.stringify(u))
    if (tok) localStorage.setItem('nox_token', tok)
  }

  // ── Email + OTP login ─────────────────────────────────────
  const sendOtp = async (email, phone) => {
    try {
      const res  = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),   // phone now sent so backend can SMS the OTP
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Server error')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  const verifyOtp = async (email, otp) => {
    try {
      const res  = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid OTP')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  // ── Standard login (admin) ────────────────────────────────
  const login = async (email, password) => {
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Invalid email or password' }
      saveUser(data.user, data.token)
      return { ok: true, user: data.user }
    } catch {
      // Backend not running — demo fallback (works offline, no real uploads)
      if (email === 'admin@noxeta.in') {
        const u = { name: 'Admin', email, role: 'admin' }
        saveUser(u, 'demo-admin-offline')
        return { ok: true, user: u, demo: true }
      }
      const u = { name: email.split('@')[0], email, role: 'user' }
      saveUser(u, 'demo-user-offline')
      return { ok: true, user: u, demo: true }
    }
  }

  const signup = async (name, email, password, phone) => {
    try {
      const res  = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      saveUser(data.user, data.token)
      return { ok: true }
    } catch {
      const u = { name, email, role: 'user' }
      saveUser(u, 'demo-token')
      return { ok: true }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('nox_user')
    localStorage.removeItem('nox_token')
  }

  const token = () => localStorage.getItem('nox_token')

  return (
    <AuthContext.Provider value={{ user, authOpen, setAuthOpen, sendOtp, verifyOtp, login, signup, logout, token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)