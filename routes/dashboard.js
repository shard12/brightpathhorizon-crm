// routes/dashboard.js
// Dashboard stats and admin user management

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.use(isAuthenticated);

// ─── GET /dashboard ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const user = req.session.user;
    const today = moment().format('YYYY-MM-DD');

    let statsQuery, followUpQuery;
    const params = [];
    const followUpParams = [today];

    if (user.role === 'admin') {
      // Admin sees all leads stats
      statsQuery = `
        SELECT 
          COUNT(*) AS total,
          SUM(status = 'New') AS new_leads,
          SUM(status = 'In Progress') AS in_progress,
          SUM(status = 'Closed') AS closed
        FROM leads
      `;
      followUpQuery = `
        SELECT l.*, u.name AS bde_name
        FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
        WHERE l.follow_up_date = ?
        ORDER BY l.name
        LIMIT 10
      `;
    } else {
      // BDE sees only their leads
      statsQuery = `
        SELECT 
          COUNT(*) AS total,
          SUM(status = 'New') AS new_leads,
          SUM(status = 'In Progress') AS in_progress,
          SUM(status = 'Closed') AS closed
        FROM leads
        WHERE assigned_to = ?
      `;
      params.push(user.id);

      followUpQuery = `
        SELECT l.*, u.name AS bde_name
        FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
        WHERE l.follow_up_date = ? AND l.assigned_to = ?
        ORDER BY l.name
        LIMIT 10
      `;
      followUpParams.push(user.id);
    }

    const [[stats]] = await db.query(statsQuery, params);
    const [followUps] = await db.query(followUpQuery, followUpParams);

    // Recent leads (last 5)
    let recentQuery = `
      SELECT l.*, u.name AS bde_name
      FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
      ${user.role === 'bde' ? 'WHERE l.assigned_to = ?' : ''}
      ORDER BY l.created_at DESC LIMIT 5
    `;
    const [recentLeads] = await db.query(recentQuery, user.role === 'bde' ? [user.id] : []);

    res.render('dashboard', {
      title: 'Dashboard | BrightPathHorizon CRM',
      stats,
      followUps,
      recentLeads,
      today,
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('dashboard', {
      title: 'Dashboard',
      stats: { total: 0, new_leads: 0, in_progress: 0, closed: 0 },
      followUps: [],
      recentLeads: [],
      today: moment().format('YYYY-MM-DD'),
      moment,
      error: ['Failed to load dashboard data'],
      success: []
    });
  }
});

// ─── GET /admin/users ─────────────────────────────────────────────────────────
router.get('/users', isAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.render('admin/users', {
      title: 'Manage Users | BrightPathHorizon CRM',
      users,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load users');
    res.redirect('/dashboard');
  }
});

// ─── POST /admin/users/:id/toggle ─────────────────────────────────────────────
// Toggle user active/inactive
router.post('/users/:id/toggle', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Don't disable yourself
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

// ─── POST /admin/users/:id/delete ────────────────────────────────────────────
router.post('/users/:id/delete', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.session.user.id) {
      req.flash('error', 'You cannot delete your own account');
      return res.redirect('/admin/users');
    }

    // Unassign their leads before deleting
    await db.query('UPDATE leads SET assigned_to = NULL WHERE assigned_to = ?', [id]);
    await db.query('DELETE FROM users WHERE id = ?', [id]);

    req.flash('success', 'User deleted');
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete user');
    res.redirect('/admin/users');
  }
});

module.exports = router;