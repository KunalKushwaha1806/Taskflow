const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { auth } = require('../middleware/auth');

function getMemberRole(projectId, userId) {
  const db = getDb();
  const m = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
  return m ? m.role : null;
}

function getTaskWithUser(taskId) {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, u.name as assigned_to_name, u.avatar_color as assigned_to_color, c.name as created_by_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN users c ON c.id = t.created_by
    WHERE t.id = ?
  `).get(taskId);
}

router.get('/:projectId/tasks', auth, (req, res) => {
  const db = getDb();
  const role = getMemberRole(req.params.projectId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Access denied' });

  const tasks = db.prepare(`
    SELECT t.*, u.name as assigned_to_name, u.email as assigned_to_email, u.avatar_color as assigned_to_color, c.name as created_by_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN users c ON c.id = t.created_by
    WHERE t.project_id = ?
    ORDER BY
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.created_at DESC
  `).all(req.params.projectId);
  res.json(tasks);
});

router.post('/:projectId/tasks', auth, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('priority').optional().isIn(['low','medium','high','urgent']),
  body('status').optional().isIn(['todo','in_progress','done']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  if (getMemberRole(req.params.projectId, req.user.id) !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { title, description, priority = 'medium', status = 'todo', assigned_to, due_date } = req.body;

  if (assigned_to) {
    const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, assigned_to);
    if (!isMember) return res.status(400).json({ error: 'Assignee is not a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (project_id, title, description, priority, status, assigned_to, created_by, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.projectId, title, description || null, priority, status, assigned_to || null, req.user.id, due_date || null);

  res.status(201).json(getTaskWithUser(result.lastInsertRowid));
});

router.patch('/:projectId/tasks/:taskId', auth, (req, res) => {
  const db = getDb();
  const role = getMemberRole(req.params.projectId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Access denied' });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (role === 'member') {
    if (task.assigned_to !== req.user.id) return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    const { status } = req.body;
    if (!status || !['todo','in_progress','done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const now = new Date().toISOString();
    db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run(status, now, task.id);
  } else {
    const { title, description, priority, status, assigned_to, due_date } = req.body;
    const now = new Date().toISOString();
    const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id);
    db.prepare(`
      UPDATE tasks SET
        title = ?, description = ?, priority = ?, status = ?,
        assigned_to = ?, due_date = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title || current.title,
      description !== undefined ? description : current.description,
      priority || current.priority,
      status || current.status,
      assigned_to !== undefined ? (assigned_to || null) : current.assigned_to,
      due_date !== undefined ? (due_date || null) : current.due_date,
      now,
      task.id
    );
  }

  res.json(getTaskWithUser(task.id));
});

router.delete('/:projectId/tasks/:taskId', auth, (req, res) => {
  const db = getDb();
  if (getMemberRole(req.params.projectId, req.user.id) !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
