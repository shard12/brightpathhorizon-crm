// routes/auth.js
// Authentication routes: login, register, logout

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { isGuest, isAuthenticated, isAdmin } = require('../middleware/auth');

// ─── GET /auth/login ──────────────────────────────────────────────────────────
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Login | BrightPathHorizon CRM',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', isGuest, async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    req.flash('error', 'Email and password are required');
    return res.redirect('/auth/login');
  }

  try {
    // Find user by email
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    const user = rows[0];

    // Compare password with hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    // Set session (exclude password from session)
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');

  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Server error. Please try again.');
    res.redirect('/auth/login');
  }
});

// ─── GET /auth/register ───────────────────────────────────────────────────────
// Only admin can access register page
router.get('/register', isAuthenticated, isAdmin, async (req, res) => {
  res.render('auth/register', {
    title: 'Add User | BrightPathHorizon CRM',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// ─── POST /auth/register ──────────────────────────────────────────────────────
router.post('/register', isAuthenticated, isAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validation
  if (!name || !email || !password || !role) {
    req.flash('error', 'All fields are required');
    return res.redirect('/auth/register');
  }

  if (!['admin', 'bde'].includes(role)) {
    req.flash('error', 'Invalid role selected');
    return res.redirect('/auth/register');
  }

  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters');
    return res.redirect('/auth/register');
  }

  try {
    // Check if email already exists
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (existing.length > 0) {
      req.flash('error', 'Email already registered');
      return res.redirect('/auth/register');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashedPassword, role]
    );

    req.flash('success', `Account created for ${name}`);
    res.redirect('/admin/users');

  } catch (err) {
    console.error('Register error:', err);
    req.flash('error', 'Failed to create account. Try again.');
    res.redirect('/auth/register');
  }
});

// ─── GET /auth/logout ─────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.redirect('/auth/login');
  });
});

module.exports = router;
