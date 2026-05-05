import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      await signup(form.name, form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-orb" style={{ width: 400, height: 400, background: '#10b981', top: -100, right: -100 }} />
      <div className="auth-bg-orb" style={{ width: 300, height: 300, background: '#7c6dfa', bottom: -50, left: -50 }} />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark" style={{ background: '#7c6dfa', boxShadow: '0 0 20px rgba(124,109,250,0.4)' }}>T</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700 }}>TaskFlow</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start managing tasks with your team today</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" placeholder="Jane Smith"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min. 6 characters"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center', marginTop: 8 }}>
            {loading ? <><span className="spinner" style={{width:16,height:16}} /> Creating account...</> : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
