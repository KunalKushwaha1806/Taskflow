# 🚀 TaskFlow — Team Task Manager

> A full-stack collaborative task management web application built for the Full-Stack Coding Assignment.

![TaskFlow](https://img.shields.io/badge/TaskFlow-v1.0.0-6366f1?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Railway](https://img.shields.io/badge/Deployed-Railway-0B0D0E?style=for-the-badge)

---

## 🌐 Live Demo

**Deployed URL:** `https://taskflow-production-85ea.up.railway.app`
**GitHub Repo:** `https://github.com/KunalKushwaha1806`

---

## ✅ Features Implemented

### Authentication
- [x] Signup with Name, Email, Password
- [x] Secure Login with **JWT** (7-day expiry)
- [x] Password hashing with **bcrypt** (12 rounds)
- [x] Protected routes (frontend + API)

### Project Management
- [x] Create projects (creator auto-becomes Admin)
- [x] Admin can add members by email
- [x] Admin can remove members
- [x] Members can view only their assigned projects

### Task Management
- [x] Create tasks (Title, Description, Due Date, Priority)
- [x] Priority levels: Low / Medium / High / Urgent
- [x] Assign tasks to project members
- [x] Update status: **To Do → In Progress → Done**
- [x] Delete tasks (Admin only)

### Dashboard
- [x] Total tasks count
- [x] Tasks by status (To Do / In Progress / Done)
- [x] Overdue tasks count
- [x] Tasks per user (workload view with progress bars)
- [x] Priority breakdown chart
- [x] Recent activity feed

### Role-Based Access Control
| Action | Admin | Member |
|--------|-------|--------|
| View project tasks | ✅ | ✅ |
| Create / Edit / Delete tasks | ✅ | ❌ |
| Update status of **assigned** tasks | ✅ | ✅ |
| Add / Remove members | ✅ | ❌ |
| Delete project | ✅ | ❌ |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v6, Vite |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (via better-sqlite3) |
| **Auth** | JWT + bcryptjs |
| **Validation** | express-validator |
| **Deployment** | Railway |

---

## 📁 Project Structure

```
taskflow/
├── backend/                    # Express REST API
│   ├── db/
│   │   └── index.js            # SQLite schema + connection (WAL mode)
│   ├── middleware/
│   │   └── auth.js             # JWT middleware + token generator
│   ├── routes/
│   │   ├── auth.js             # POST /signup, /login, GET /me
│   │   ├── projects.js         # CRUD + member management
│   │   ├── tasks.js            # Task CRUD with RBAC
│   │   └── dashboard.js        # Aggregated analytics
│   ├── server.js               # Express app entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx      # Sidebar + navigation shell
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Global auth state (login/logout/signup)
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProjectsPage.jsx
│   │   │   └── ProjectDetailPage.jsx  # Kanban board + members
│   │   ├── utils/
│   │   │   └── api.js          # Fetch wrapper with JWT headers
│   │   ├── App.jsx             # Route definitions + guards
│   │   ├── main.jsx
│   │   └── index.css           # Full design system (CSS variables)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js          # Dev proxy → backend :5000
│
├── railway.toml                # Railway deployment config
├── nixpacks.toml               # Build pipeline config
├── package.json                # Root monorepo scripts
├── .gitignore
└── README.md
```

---

## 🗄️ Database Schema

```sql
-- Users table
users (id, name, email, password, avatar_color, created_at)

-- Projects table
projects (id, name, description, color, created_by → users.id, created_at)

-- Junction table: many-to-many Users ↔ Projects with role
project_members (id, project_id → projects.id, user_id → users.id, role CHECK('admin','member'), joined_at)

-- Tasks table
tasks (
  id, project_id → projects.id,
  title, description,
  status CHECK('todo','in_progress','done'),
  priority CHECK('low','medium','high','urgent'),
  assigned_to → users.id,
  created_by → users.id,
  due_date, created_at, updated_at
)
-- Trigger: auto-updates updated_at on every UPDATE
```

---

## 📡 REST API Reference

### Auth Endpoints
```
POST   /api/auth/signup     { name, email, password }  → { user, token }
POST   /api/auth/login      { email, password }         → { user, token }
GET    /api/auth/me         [JWT required]              → user object
```

### Project Endpoints
```
GET    /api/projects                        [JWT] → list my projects
POST   /api/projects                        [JWT] → create project (become admin)
GET    /api/projects/:id                    [JWT] → project + members
PATCH  /api/projects/:id                    [Admin] → update project
DELETE /api/projects/:id                    [Admin] → delete project + tasks
POST   /api/projects/:id/members            [Admin] → add member by email
DELETE /api/projects/:id/members/:userId    [Admin] → remove member
```

### Task Endpoints
```
GET    /api/projects/:id/tasks              [Member] → list tasks (sorted by priority)
POST   /api/projects/:id/tasks              [Admin] → create task
PATCH  /api/projects/:id/tasks/:taskId      [Admin | Assignee] → update task
DELETE /api/projects/:id/tasks/:taskId      [Admin] → delete task
```

### Dashboard
```
GET    /api/dashboard                       [JWT] → aggregated stats for all my projects
```

---

## 🔧 Local Development Setup

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone
```bash
git clone https://github.com/KunalKushwaha1806
cd taskflow
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env — set a strong JWT_SECRET
npm install
npm run dev
# ✅ API running at http://localhost:5000
```

### 3. Frontend
```bash
# Open a new terminal
cd frontend
npm install
npm run dev
# ✅ App running at http://localhost:5173
```

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 5000) | No |
| `JWT_SECRET` | Secret for signing JWTs | **Yes (prod)** |
| `DB_PATH` | SQLite file path (default: `./data/taskmanager.db`) | No |
| `FRONTEND_URL` | CORS origin (default: `*`) | No |
| `NODE_ENV` | `development` or `production` | No |

---



---

## 👤 Author
**Your Name**
- GitHub: [@kunnalkushwaha1806] https://github.com/KunalKushwaha1806
- Email: kunalkushwaha1806@email.com


