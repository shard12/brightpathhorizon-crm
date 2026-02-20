// routes/auth.js
// Authentication routes: login, register, logout, forgot password

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { isGuest, isAuthenticated, isAdmin } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

let resend = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resend = new Resend(process.env.RESEND_API_KEY);
}


// ─────────────────────────────────────────────────────────────
// 🔒 Rate Limiter (Login Protection)
// ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts. Try again later.'
});


// ─────────────────────────────────────────────────────────────
// 🔐 LOGIN
// ─────────────────────────────────────────────────────────────
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Login | BrightPathHorizon CRM',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

router.post('/login', isGuest, loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash('error', 'Email and password are required');
    return res.redirect('/auth/login');
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

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


// ─────────────────────────────────────────────────────────────
// 👤 REGISTER (Admin Only)
// ─────────────────────────────────────────────────────────────
router.get('/register', isAuthenticated, isAdmin, (req, res) => {
  res.render('auth/register', {
    title: 'Add User | BrightPathHorizon CRM',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

router.post('/register', isAuthenticated, isAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

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
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (existing.length > 0) {
      req.flash('error', 'Email already registered');
      return res.redirect('/auth/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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


// ─────────────────────────────────────────────────────────────
// 🔁 FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────
router.get('/forgot', (req, res) => {
  res.render('auth/forgot', {
    title: 'Forgot Password | BrightPathHorizon CRM',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

router.post('/forgot', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    req.flash('error', 'Email is required');
    return res.redirect('/auth/forgot');
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    // Always show the same message to prevent email enumeration
    if (rows.length === 0) {
      req.flash('success', 'If that email exists, a reset link has been sent.');
      return res.redirect('/auth/login');
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [token, expiry, user.id]
    );

    const resetLink = `${req.protocol}://${req.get('host')}/auth/reset/${token}`;

    if (resend) {
      await resend.emails.send({
        from: 'BrightPathHorizon <onboarding@resend.dev>',
        to: user.email,
        subject: 'Password Reset - BrightPathHorizon CRM',
        html: `
          <h3>Password Reset</h3>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>This link expires in 1 hour.</p>
        `
      });
    } else {
      // Email not configured — log the link so it's not lost during development
      console.log(`[DEV] Password reset link for ${user.email}: ${resetLink}`);
    }

    req.flash('success', 'If that email exists, a reset link has been sent.');
    res.redirect('/auth/login');

  } catch (err) {
    console.error('Forgot password error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/auth/forgot');
  }
});


// ─────────────────────────────────────────────────────────────
// 🔄 RESET PASSWORD
// ─────────────────────────────────────────────────────────────
router.get('/reset/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const [rows] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if (rows.length === 0) {
      req.flash('error', 'This reset link is invalid or has expired.');
      return res.redirect('/auth/forgot');
    }

    res.render('auth/reset', {
      title: 'Reset Password | BrightPathHorizon CRM',
      token,
      error: req.flash('error'),
      success: req.flash('success')
    });

  } catch (err) {
    console.error('Reset GET error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/auth/forgot');
  }
});

router.post('/reset/:token', async (req, res) => {
  const { token } = req.params;
  const { password, confirm_password } = req.body;

  try {
    if (!password || password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters.');
      return res.redirect(`/auth/reset/${token}`);
    }

    if (confirm_password && password !== confirm_password) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect(`/auth/reset/${token}`);
    }

    const [rows] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if (rows.length === 0) {
      req.flash('error', 'This reset link is invalid or has expired.');
      return res.redirect('/auth/forgot');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, rows[0].id]
    );

    req.flash('success', 'Password updated successfully. Please log in.');
    res.redirect('/auth/login');

  } catch (err) {
    console.error('Reset POST error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/auth/forgot');
  }
});


// ─────────────────────────────────────────────────────────────
// 🚪 LOGOUT
// ─────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.redirect('/auth/login');
  });
});

module.exports = router;