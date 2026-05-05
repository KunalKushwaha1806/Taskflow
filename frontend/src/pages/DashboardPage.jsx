import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'

function initials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false
  return new Date(dueDate) < new Date()
}

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const STATUS_COLORS = { todo: '#6366f1', in_progress: '#f59e0b', done: '#22c55e' }
const PRIORITY_COLORS = { low: '#22c55e', medium: '#eab308', high: '#f97316', urgent: '#ef4444' }

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard').then(data => { setStats(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</div>
          <div className="page-subtitle">Here's what's happening across your projects.</div>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats?.total_tasks ?? 0}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#6366f1' }}>{stats?.todo ?? 0}</div>
            <div className="stat-label">To Do</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#eab308' }}>{stats?.in_progress ?? 0}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#22c55e' }}>{stats?.done ?? 0}</div>
            <div className="stat-label">Done</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#ef4444' }}>{stats?.overdue ?? 0}</div>
            <div className="stat-label">Overdue</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#9d8ffc' }}>{stats?.assigned_to_me ?? 0}</div>
            <div className="stat-label">Assigned to Me</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent tasks */}
          <div className="card" style={{ padding: 20, gridColumn: '1 / -1' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Activity
            </div>
            {!stats?.recent_tasks?.length ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-title">No tasks yet</div>
                <div className="empty-desc">Create a project and add some tasks to get started.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.recent_tasks.map(t => (
                  <div key={t.id}
                    onClick={() => navigate(`/projects/${t.project_id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-3)', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-4)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-3)'}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.project_color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t.project_name}</div>
                    </div>
                    <span className={`priority-badge priority-${t.priority}`}>{t.priority}</span>
                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-4)', color: STATUS_COLORS[t.status], fontWeight: 500 }}>
                      {STATUS_LABELS[t.status]}
                    </span>
                    {t.due_date && (
                      <span style={{ fontSize: 12, color: isOverdue(t.due_date, t.status) ? 'var(--red)' : 'var(--text-3)', flexShrink: 0 }}>
                        {formatDate(t.due_date)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks per user */}
          {stats?.tasks_per_user?.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Team Workload</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {stats.tasks_per_user.map(u => (
                  <div key={u.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div className="user-avatar" style={{ background: u.avatar_color, width: 28, height: 28, fontSize: 11 }}>
                        {initials(u.name)}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-2)' }}>{u.done}/{u.total}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${u.total > 0 ? (u.done / u.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priority breakdown */}
          {stats?.priority_breakdown?.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Open Tasks by Priority</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['urgent','high','medium','low'].map(p => {
                  const item = stats.priority_breakdown.find(x => x.priority === p)
                  if (!item) return null
                  const max = Math.max(...stats.priority_breakdown.map(x => x.count))
                  return (
                    <div key={p}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className={`priority-badge priority-${p}`}>{p}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{item.count}</span>
                      </div>
                      <div className="progress-bar">
                        <div style={{ height: '100%', borderRadius: 99, background: PRIORITY_COLORS[p], width: `${(item.count / max) * 100}%`, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
