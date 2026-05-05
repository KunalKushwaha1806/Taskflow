const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { generateToken, auth } = require('../middleware/auth');

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { name, email, password } = req.body;

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
    return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 12);
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const result = db.prepare('INSERT INTO users (name, email, password, avatar_color) VALUES (?, ?, ?, ?)').run(name, email, hash, color);
  const user = db.prepare('SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ user, token: generateToken(user) });
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password' });

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, token: generateToken(safeUser) });
});

router.get('/me', auth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
