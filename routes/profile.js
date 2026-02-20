// routes/profile.js
// User profile page with stats

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const moment  = require('moment');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated);

router.get('/', async (req, res) => {
  try {
    const user = req.session.user;

    // Fetch full user record to get created_at and latest details
    const [[fullUser]] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [user.id]
    );

    if (!fullUser) {
      req.flash('error', 'User not found');
      return res.redirect('/dashboard');
    }

    // Stats scoped to user role
    const statsWhere  = user.role === 'admin' ? '' : 'WHERE assigned_to = ?';
    const statsParams = user.role === 'admin' ? [] : [user.id];

    const [[profileStats]] = await db.query(`
      SELECT
        COUNT(*)                    AS total,
        SUM(status = 'New')         AS new_leads,
        SUM(status = 'In Progress') AS in_progress,
        SUM(status = 'Closed')      AS closed
      FROM leads ${statsWhere}
    `, statsParams);

    // Recent leads
    const recentWhere  = user.role === 'admin' ? '' : 'WHERE l.assigned_to = ?';
    const recentParams = user.role === 'admin' ? [] : [user.id];

    const [recentLeads] = await db.query(`
      SELECT l.*, u.name AS bde_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ${recentWhere}
      ORDER BY l.created_at DESC
      LIMIT 8
    `, recentParams);

    res.render('profile', {
      title:        'Profile | BrightPathHorizon CRM',
      profileStats,
      recentLeads,
      memberSince:  fullUser.created_at,
      moment,
      error:        req.flash('error'),
      success:      req.flash('success'),
    });

  } catch (err) {
    console.error('Profile error:', err);
    req.flash('error', 'Failed to load profile');
    res.redirect('/dashboard');
  }
});

module.exports = router;