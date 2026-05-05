import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { api } from '../utils/api'

function initials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])

  useEffect(() => {
    api.get('/projects').then(setProjects).catch(() => {})
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">T</div>
          <span className="logo-text">TaskFlow</span>
        </div>

        <div className="sidebar-section">Navigation</div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Dashboard
          </NavLink>
          <NavLink to="/projects" end className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            All Projects
          </NavLink>
        </nav>

        {projects.length > 0 && (
          <>
            <div className="sidebar-section">Projects</div>
            <div className="sidebar-projects">
              {projects.slice(0, 8).map(p => (
                <NavLink
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className={({isActive}) => `project-nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="project-dot" style={{ background: p.color }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}

        <div className="sidebar-user">
          <div className="user-avatar" style={{ background: user?.avatar_color }}>
            {initials(user?.name)}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet context={{ refreshProjects: () => api.get('/projects').then(setProjects) }} />
      </main>
    </div>
  )
}
