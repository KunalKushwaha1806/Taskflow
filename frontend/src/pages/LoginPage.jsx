import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-orb" style={{ width: 400, height: 400, background: '#7c6dfa', top: -100, left: -100 }} />
      <div className="auth-bg-orb" style={{ width: 300, height: 300, background: '#ec4899', bottom: -50, right: -50 }} />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark" style={{ background: '#7c6dfa', boxShadow: '0 0 20px rgba(124,109,250,0.4)' }}>T</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700 }}>TaskFlow</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue to your workspace</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
            />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center', marginTop: 8 }}>
            {loading ? <><span className="spinner" style={{width:16,height:16}} /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account? <Link to="/signup" className="auth-link">Sign up free</Link>
        </div>
      </div>
    </div>
  )
}
