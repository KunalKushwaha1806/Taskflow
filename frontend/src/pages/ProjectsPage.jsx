import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from '../utils/api'

function initials(name) {
  return name?.[0]?.toUpperCase() || '?'
}

export default function ProjectsPage() {
  const { refreshProjects } = useOutletContext()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    api.get('/projects').then(data => { setProjects(data); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const p = await api.post('/projects', form)
      setProjects(prev => [p, ...prev])
      setShowModal(false)
      setForm({ name: '', description: '' })
      refreshProjects()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Projects</div>
          <div className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} you're part of</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <div className="empty-title">No projects yet</div>
            <div className="empty-desc">Create your first project to start collaborating with your team.</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Project</button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
                <div className="project-card-header">
                  <div className="project-icon" style={{ background: p.color }}>
                    {initials(p.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="project-name">{p.name}</div>
                    {p.description && <div className="project-desc">{p.description}</div>}
                  </div>
                  <span className={`role-badge role-${p.user_role}`}>{p.user_role}</span>
                </div>
                <div className="project-stats">
                  <div className="project-stat"><strong>{p.task_count}</strong> tasks</div>
                  <div className="project-stat"><strong>{p.member_count}</strong> members</div>
                  <div className="project-stat" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>
                    {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">New Project</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input className="form-input" placeholder="e.g. Website Redesign"
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" placeholder="What is this project about?"
                    value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  💡 You'll be the Admin of this project and can invite team members after creation.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" style={{width:14,height:14}} /> Creating...</> : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
