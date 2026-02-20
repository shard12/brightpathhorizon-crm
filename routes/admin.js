// routes/admin.js
// Admin-only routes: user management

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.use(isAuthenticated);
router.use(isAdmin);

// ─── GET /admin/users ─────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.render('admin/users', {
      title: 'Manage Users | BrightPathHorizon CRM',
      users,
      error:   req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load users');
    res.redirect('/dashboard');
  }
});

// ─── POST /admin/users/:id/toggle ─────────────────────────────────────────────
router.post('/users/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.session.user.id) {
      req.flash('error', 'You cannot disable your own account');
      return res.redirect('/admin/users');
    }

    await db.query('UPDATE users SET is_active = NOT is_active WHERE id = ?', [id]);
    req.flash('success', 'User status updated');
    res.redirect('/admin/users');

  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update user');
    res.redirect('/admin/users');
  }
});

// ─── POST /admin/users/:id/delete ─────────────────────────────────────────────
router.post('/users/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.session.user.id) {
      req.flash('error', 'You cannot delete your own account');
      return res.redirect('/admin/users');
    }

    // Unassign their leads before deleting
    await db.query('UPDATE leads SET assigned_to = NULL WHERE assigned_to = ?', [id]);
    await db.query('DELETE FROM users WHERE id = ?', [id]);

    req.flash('success', 'User deleted successfully');
    res.redirect('/admin/users');

  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete user');
    res.redirect('/admin/users');
  }
});

module.exports = router;