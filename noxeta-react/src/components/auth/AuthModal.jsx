import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function AuthModal({ onClose }) {
  const [tab, setTab] = useState('login')
  const [step, setStep] = useState('form')   // form | otp
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', confirmPass: '', name: '' })
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(0)

  useEffect(() => {
    if (timer > 0) {
      const int = setInterval(() => setTimer(t => t - 1), 1000)
      return () => clearInterval(int)
    }
  }, [timer])

  const { login, signup, sendOtp, verifyOtp } = useAuth()
  const { showToast } = useToast()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Login (email + password) ──────────────────────────────
  const doLogin = async () => {
    if (!form.email || !form.password) { showToast('Error', 'Please fill all fields'); return }
    setLoading(true)
    const res = await login(form.email, form.password)
    setLoading(false)
    if (res.ok) {
      showToast('Welcome back ✦', `Logged in as ${res.user?.name || form.email.split('@')[0]}`)
      onClose()
    } else {
      showToast('Error', res.error || 'Invalid email or password')
    }
  }

  // ── Signup step 1 — collect details + send OTP ────────────
  const doSignupSendOtp = async () => {
    if (!form.name.trim()) { showToast('Error', 'Please enter your full name'); return }
    if (!form.email) { showToast('Error', 'Please enter your email'); return }
    if (!form.password) { showToast('Error', 'Please enter a password'); return }
    if (form.password.length < 6) { showToast('Error', 'Password must be at least 6 characters'); return }
    if (form.password !== form.confirmPass) { showToast('Error', 'Passwords do not match'); return }
    setLoading(true)
    const res = await sendOtp(form.email)
    setLoading(false)
    if (res.ok) {
      setStep('otp')
      setTimer(60)
      showToast('OTP Sent ✦', `Verification code sent to ${form.email}`)
    } else {
      showToast('Error', res.error || 'Could not send OTP')
    }
  }

  // ── Signup step 2 — verify OTP + create account ───────────
  const doVerifyAndSignup = async () => {
    const code = otp.join('')
    if (code.length !== 6) { showToast('Enter OTP', 'Please enter the 6-digit code'); return }
    setLoading(true)
    const vRes = await verifyOtp(form.email, code)
    if (!vRes.ok) { setLoading(false); showToast('Invalid OTP', 'The code is incorrect'); return }
    const sRes = await signup(form.name, form.email, form.password)
    setLoading(false)
    if (sRes.ok) {
      showToast('Welcome to Noxeta 🖤', `Account created for ${form.name}`)
      onClose()
    } else {
      showToast('Error', sRes.error || 'Could not create account')
    }
  }

  // ── Google ────────────────────────────────────────────────
  const handleGoogle = () => {
    showToast('Google Login', 'Connect Google OAuth in your backend to enable this')
  }

  // ── OTP box handlers ──────────────────────────────────────
  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next)
    if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus()
  }
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`otp-${i - 1}`)?.focus()
  }
  const handleOtpPaste = e => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (p.length === 6) { setOtp(p.split('')); document.getElementById('otp-5')?.focus() }
  }

  const inp = {
    width: '100%', padding: '13px 15px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: '15px',
    outline: 'none', transition: 'border-color .3s',
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-head">
          <div className="modal-title">
            {step === 'otp' ? 'VERIFY EMAIL' : 'ACCOUNT'}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Tabs — only show on form step */}
          {step === 'form' && (
            <div className="auth-tabs">
              <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setStep('form') }}>Login</button>
              <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => { setTab('signup'); setStep('form') }}>Sign Up</button>
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && step === 'form' && (
            <>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input style={inp} type="email" placeholder="your@email.com"
                  value={form.email} onChange={set('email')}
                  onKeyDown={e => e.key === 'Enter' && doLogin()} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input style={inp} type="password" placeholder="••••••••"
                  value={form.password} onChange={set('password')}
                  onKeyDown={e => e.key === 'Enter' && doLogin()} />
              </div>
              <button className="btn-primary btn-block" onClick={doLogin} disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </>
          )}

          {/* ── SIGNUP FORM ── */}
          {tab === 'signup' && step === 'form' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input style={inp} type="text" placeholder="Your name"
                  value={form.name} onChange={set('name')} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input style={inp} type="email" placeholder="your@email.com"
                  value={form.email} onChange={set('email')} />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input style={inp} type="password" placeholder="Min 6 characters"
                  value={form.password} onChange={set('password')} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input style={inp} type="password" placeholder="Re-enter password"
                  value={form.confirmPass} onChange={set('confirmPass')}
                  onKeyDown={e => e.key === 'Enter' && doSignupSendOtp()} />
              </div>
              <button className="btn-primary btn-block" onClick={doSignupSendOtp} disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Sending OTP...' : 'Verify Email →'}
              </button>
            </>
          )}

          {/* ── OTP VERIFY (signup only) ── */}
          {step === 'otp' && (
            <>
              <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '28px', lineHeight: 1.7 }}>
                We sent a 6-digit code to{' '}
                <strong style={{ color: 'var(--text)' }}>{form.email}</strong>.
                Enter it below to verify your email.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '28px' }}
                onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input key={i} id={`otp-${i}`}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    style={{
                      width: '48px', height: '58px', textAlign: 'center',
                      background: 'var(--surface2)',
                      border: `1px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                      color: 'var(--text)', fontSize: '22px', fontFamily: 'var(--font-m)',
                      outline: 'none', transition: 'border-color .2s',
                    }}
                  />
                ))}
              </div>

              <button className="btn-primary btn-block" onClick={doVerifyAndSignup} disabled={loading}
                style={{ opacity: loading ? 0.7 : 1, marginBottom: '14px' }}>
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>

              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                {timer > 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Resend OTP in <strong style={{ color: 'var(--accent)' }}>{timer}s</strong>
                  </span>
                ) : (
                  <button onClick={doSignupSendOtp} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'var(--font-m)' }}>
                    Resend OTP
                  </button>
                )}
              </div>

              <button onClick={() => { setStep('form'); setOtp(['', '', '', '', '', '']); setTimer(0); }}
                style={{ display: 'block', margin: '0 auto', background: 'none', border: 'none', color: 'var(--text-dim)', fontFamily: 'var(--font-m)', fontSize: '10px', letterSpacing: '1px', cursor: 'pointer' }}>
                ← Change email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function GoogleBtn({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', padding: '13px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-m)', fontSize: '11px', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'border-color .3s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      Continue with Google
    </button>
  )
}