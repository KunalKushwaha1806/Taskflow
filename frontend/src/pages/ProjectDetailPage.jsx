import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'

function initials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function formatDate(d) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false
  return new Date(dueDate + 'T00:00:00') < new Date()
}

const STATUSES = [
  { key: 'todo', label: 'To Do', color: '#6366f1' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'done', label: 'Done', color: '#22c55e' },
]

const PRIORITIES = ['low', 'medium', 'high', 'urgent']

export default function ProjectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { refreshProjects } = useOutletContext()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('board')

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null) // taskId
  const [editTask, setEditTask] = useState(null)

  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', assigned_to: '', due_date: '' })
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/tasks`)
    ]).then(([p, t]) => {
      setProject(p)
      setTasks(t)
      setLoading(false)
    }).catch(() => { navigate('/projects'); })
  }

  useEffect(() => { load() }, [id])

  const isAdmin = project?.user_role === 'admin'

  async function handleSaveTask(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...taskForm,
        assigned_to: taskForm.assigned_to ? parseInt(taskForm.assigned_to) : null,
        due_date: taskForm.due_date || null,
      }
      let saved
      if (editTask) {
        saved = await api.patch(`/projects/${id}/tasks/${editTask.id}`, payload)
        setTasks(prev => prev.map(t => t.id === saved.id ? saved : t))
      } else {
        saved = await api.post(`/projects/${id}/tasks`, payload)
        setTasks(prev => [...prev, saved])
      }
      setShowTaskModal(false)
      setEditTask(null)
      setTaskForm({ title: '', description: '', priority: 'medium', status: 'todo', assigned_to: '', due_date: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(task, newStatus) {
    try {
      const updated = await api.patch(`/projects/${id}/tasks/${task.id}`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setShowDeleteConfirm(null)
    } catch (err) { alert(err.message) }
  }

  async function handleAddMember(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const m = await api.post(`/projects/${id}/members`, { email: memberEmail, role: memberRole })
      setProject(prev => ({ ...prev, members: [...prev.members, m] }))
      setMemberEmail('')
      setMemberRole('member')
      setShowMemberModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(userId) {
    if (!confirm('Remove this member?')) return
    try {
      await api.delete(`/projects/${id}/members/${userId}`)
      setProject(prev => ({ ...prev, members: prev.members.filter(m => m.id !== userId) }))
    } catch (err) { alert(err.message) }
  }

  async function handleDeleteProject() {
    if (!confirm(`Delete "${project.name}"? This will remove all tasks. This cannot be undone.`)) return
    try {
      await api.delete(`/projects/${id}`)
      refreshProjects()
      navigate('/projects')
    } catch (err) { alert(err.message) }
  }

  function openEdit(task) {
    setEditTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to ? String(task.assigned_to) : '',
      due_date: task.due_date || '',
    })
    setShowTaskModal(true)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!project) return null

  const tasksByStatus = {}
  STATUSES.forEach(s => { tasksByStatus[s.key] = tasks.filter(t => t.status === s.key) })

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: project.color, display: 'grid', placeItems: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'white', flexShrink: 0 }}>
            {project.name[0].toUpperCase()}
          </div>
          <div>
            <div className="page-title">{project.name}</div>
            {project.description && <div className="page-subtitle">{project.description}</div>}
          </div>
          <span className={`role-badge role-${project.user_role}`} style={{ marginTop: 4 }}>{project.user_role}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => { setError(''); setShowMemberModal(true) }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add Member
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditTask(null); setTaskForm({ title: '', description: '', priority: 'medium', status: 'todo', assigned_to: '', due_date: '' }); setError(''); setShowTaskModal(true) }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Task
              </button>
            </>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === 'board' ? 'active' : ''}`} onClick={() => setTab('board')}>Board</button>
          <button className={`tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
            Members ({project.members?.length || 0})
          </button>
          {isAdmin && <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Settings</button>}
        </div>

        {tab === 'board' && (
          tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <div className="empty-title">No tasks yet</div>
              <div className="empty-desc">
                {isAdmin ? 'Add the first task to get the project moving.' : 'No tasks have been assigned yet.'}
              </div>
              {isAdmin && <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>Add First Task</button>}
            </div>
          ) : (
            <div className="task-columns">
              {STATUSES.map(status => (
                <div className="task-column" key={status.key}>
                  <div className="column-header">
                    <div className="column-title">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.color, display: 'inline-block' }} />
                      {status.label}
                      <span className="column-count">{tasksByStatus[status.key].length}</span>
                    </div>
                  </div>
                  <div className="column-body">
                    {tasksByStatus[status.key].map(task => {
                      const overdue = isOverdue(task.due_date, task.status)
                      const canEdit = isAdmin || task.assigned_to === user.id
                      return (
                        <div key={task.id} className="task-card">
                          <div className="task-card-title">{task.title}</div>
                          {task.description && (
                            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 }}>
                              {task.description.length > 80 ? task.description.slice(0, 80) + '…' : task.description}
                            </div>
                          )}
                          <div className="task-meta">
                            <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                            {task.due_date && (
                              <span className={`due-date ${overdue ? 'overdue' : ''}`}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(task.due_date)}
                                {overdue && ' · Overdue'}
                              </span>
                            )}
                            {task.assigned_to_name && (
                              <div className="assignee-chip" style={{ background: task.assigned_to_color }} title={task.assigned_to_name}>
                                {initials(task.assigned_to_name)}
                              </div>
                            )}
                          </div>

                          {canEdit && (
                            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {isAdmin && (
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEdit(task)}>Edit</button>
                              )}
                              {status.key !== 'todo' && canEdit && (
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '4px 10px' }}
                                  onClick={() => handleStatusChange(task, status.key === 'in_progress' ? 'todo' : 'in_progress')}>
                                  ← {status.key === 'done' ? 'In Progress' : 'To Do'}
                                </button>
                              )}
                              {status.key !== 'done' && canEdit && (
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--green)' }}
                                  onClick={() => handleStatusChange(task, status.key === 'todo' ? 'in_progress' : 'done')}>
                                  {status.key === 'todo' ? 'Start →' : 'Done ✓'}
                                </button>
                              )}
                              {isAdmin && (
                                <button className="btn btn-danger btn-sm" style={{ fontSize: 12, padding: '4px 10px', marginLeft: 'auto' }}
                                  onClick={() => setShowDeleteConfirm(task.id)}>
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'members' && (
          <div>
            <div className="members-list">
              {project.members?.map(m => (
                <div key={m.id} className="member-item">
                  <div className="user-avatar" style={{ background: m.avatar_color }}>
                    {initials(m.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.email}</div>
                  </div>
                  <span className={`role-badge role-${m.role}`}>{m.role}</span>
                  {isAdmin && m.id !== user.id && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>Remove</button>
                  )}
                  {m.id === user.id && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>You</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && isAdmin && (
          <div style={{ maxWidth: 480 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Danger Zone</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>
                Deleting this project will permanently remove all tasks and member associations. This action cannot be undone.
              </div>
              <button className="btn btn-danger" onClick={handleDeleteProject}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTaskModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editTask ? 'Edit Task' : 'New Task'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTaskModal(false)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveTask}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" placeholder="What needs to be done?"
                    value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" placeholder="Optional details..."
                    value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value})}>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Assign To</label>
                    <select className="form-select" value={taskForm.assigned_to} onChange={e => setTaskForm({...taskForm, assigned_to: e.target.value})}>
                      <option value="">Unassigned</option>
                      {project.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date" value={taskForm.due_date}
                      onChange={e => setTaskForm({...taskForm, due_date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" style={{width:14,height:14}} /> Saving...</> : editTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMemberModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Add Member</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowMemberModal(false)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="teammate@example.com"
                    value={memberEmail} onChange={e => setMemberEmail(e.target.value)} required autoFocus />
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>The user must already have a TaskFlow account.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={memberRole} onChange={e => setMemberRole(e.target.value)}>
                    <option value="member">Member — can view & update assigned tasks</option>
                    <option value="admin">Admin — can manage tasks and members</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" style={{width:14,height:14}} /> Adding...</> : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <div className="modal-title">Delete Task?</div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-2)' }}>This will permanently delete the task. This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDeleteTask(showDeleteConfirm)}>Delete Task</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
