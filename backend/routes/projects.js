const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { auth } = require('../middleware/auth');

const PROJECT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'];

function getMemberRole(projectId, userId) {
  const db = getDb();
  const m = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
  return m ? m.role : null;
}

router.get('/', auth, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT p.*, pm.role as user_role, u.name as creator_name FROM projects p JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? JOIN users u ON u.id = p.created_by ORDER BY p.created_at DESC').all(req.user.id);

  const projects = rows.map(p => {
    const member_count = db.prepare('SELECT COUNT(*) as c FROM project_members WHERE project_id = ?').get(p.id).c;
    const task_count = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE project_id = ?').get(p.id).c;
    return { ...p, member_count, task_count };
  });
  res.json(projects);
});

router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Project name required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { name, description } = req.body;
  const color = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
  const result = db.prepare('INSERT INTO projects (name, description, color, created_by) VALUES (?, ?, ?, ?)').run(name, description || null, color, req.user.id);
  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, req.user.id, 'admin');
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...project, user_role: 'admin', member_count: 1, task_count: 0 });
});

router.get('/:id', auth, (req, res) => {
  const db = getDb();
  const role = getMemberRole(req.params.id, req.user.id);
  if (!role) return res.status(403).json({ error: 'Access denied' });
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const members = db.prepare('SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ?').all(req.params.id);
  res.json({ ...project, user_role: role, members });
});

router.patch('/:id', auth, (req, res) => {
  const db = getDb();
  if (getMemberRole(req.params.id, req.user.id) !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, description } = req.body;
  if (name) db.prepare('UPDATE projects SET name = ? WHERE id = ?').run(name, req.params.id);
  if (description !== undefined) db.prepare('UPDATE projects SET description = ? WHERE id = ?').run(description, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', auth, (req, res) => {
  const db = getDb();
  if (getMemberRole(req.params.id, req.user.id) !== 'admin') return res.status(403).json({ error: 'Admin only' });
  db.prepare('DELETE FROM tasks WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM project_members WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted' });
});

router.post('/:id/members', auth, [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  if (getMemberRole(req.params.id, req.user.id) !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const db = getDb();
  const { email, role = 'member' } = req.body;
  const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found. They must sign up first.' });
  if (db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.id, user.id))
    return res.status(409).json({ error: 'User is already a member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.id, user.id, role);
  res.status(201).json({ ...user, role });
});

router.delete('/:id/members/:userId', auth, (req, res) => {
  const db = getDb();
  if (getMemberRole(req.params.id, req.user.id) !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (parseInt(req.params.userId) === req.user.id) {
    const adminCount = db.prepare("SELECT COUNT(*) as c FROM project_members WHERE project_id = ? AND role = 'admin'").get(req.params.id).c;
    if (adminCount <= 1) return res.status(400).json({ error: 'Cannot remove the only admin' });
  }
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
