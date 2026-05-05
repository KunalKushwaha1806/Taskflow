const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  const myProjects = db.prepare('SELECT project_id FROM project_members WHERE user_id = ?').all(userId).map(r => r.project_id);

  if (myProjects.length === 0) {
    return res.json({ total_tasks: 0, todo: 0, in_progress: 0, done: 0, overdue: 0, assigned_to_me: 0, tasks_per_user: [], recent_tasks: [], priority_breakdown: [], projects_count: 0 });
  }

  const placeholders = myProjects.map(() => '?').join(',');

  // Get all tasks for these projects
  const allTasks = db.prepare(`SELECT * FROM tasks WHERE project_id IN (${placeholders})`).all(...myProjects);

  const total_tasks = allTasks.length;
  const todo = allTasks.filter(t => t.status === 'todo').length;
  const in_progress = allTasks.filter(t => t.status === 'in_progress').length;
  const done = allTasks.filter(t => t.status === 'done').length;
  const overdue = allTasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today).length;
  const assigned_to_me = allTasks.filter(t => t.assigned_to === userId).length;

  // Tasks per user
  const assignedTasks = allTasks.filter(t => t.assigned_to);
  const userMap = {};
  assignedTasks.forEach(t => {
    if (!userMap[t.assigned_to]) userMap[t.assigned_to] = { total: 0, done: 0 };
    userMap[t.assigned_to].total++;
    if (t.status === 'done') userMap[t.assigned_to].done++;
  });
  const tasks_per_user = Object.entries(userMap).map(([uid, counts]) => {
    const u = db.prepare('SELECT name, avatar_color FROM users WHERE id = ?').get(uid);
    return { name: u?.name || 'Unknown', avatar_color: u?.avatar_color || '#6366f1', ...counts };
  }).sort((a, b) => b.total - a.total).slice(0, 10);

  // Recent tasks
  const recent_tasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      u.name as assigned_to_name, u.avatar_color as assigned_to_color
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.project_id IN (${placeholders})
    ORDER BY t.updated_at DESC LIMIT 8
  `).all(...myProjects);

  // Priority breakdown
  const priorityMap = {};
  allTasks.filter(t => t.status !== 'done').forEach(t => {
    priorityMap[t.priority] = (priorityMap[t.priority] || 0) + 1;
  });
  const priority_breakdown = Object.entries(priorityMap).map(([priority, count]) => ({ priority, count }));

  res.json({ total_tasks, todo, in_progress, done, overdue, assigned_to_me, projects_count: myProjects.length, tasks_per_user, recent_tasks, priority_breakdown });
});

module.exports = router;
