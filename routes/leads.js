const express = require('express');
const router = express.Router();
const db = require('../config/db');
const ExcelJS = require('exceljs');
const moment = require('moment');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.use(isAuthenticated);

//////////////////////////////////////////////////////////////
// GET /leads
//////////////////////////////////////////////////////////////
router.get('/', async (req, res) => {
  try {
    const user = req.session.user;
    const { page, search, status, bde } = req.query;
    const today = moment().format('YYYY-MM-DD');

    const PER_PAGE = 10;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const offset = (currentPage - 1) * PER_PAGE;

    let where = 'WHERE 1=1';
    const params = [];

    if (user.role === 'bde') {
      where += ' AND l.assigned_to = ?';
      params.push(user.id);
    }

    if (search) {
      where += ' AND (l.name LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (status && status !== 'all') {
      where += ' AND l.status = ?';
      params.push(status);
    }

    if (bde && user.role === 'admin') {
      where += ' AND l.assigned_to = ?';
      params.push(bde);
    }

    const baseQuery = `
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ${where}
    `;

    const [[{ totalLeads }]] = await db.query(
      `SELECT COUNT(*) AS totalLeads ${baseQuery}`,
      params
    );

    const [leads] = await db.query(
      `SELECT l.*, u.name AS bde_name
       ${baseQuery}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, PER_PAGE, offset]
    );

    // Count today's follow-ups
    const fuWhere = user.role === 'bde'
      ? 'WHERE follow_up_date = ? AND assigned_to = ?'
      : 'WHERE follow_up_date = ?';
    const fuParams = user.role === 'bde' ? [today, user.id] : [today];
    const [[{ followUpsToday }]] = await db.query(
      `SELECT COUNT(*) AS followUpsToday FROM leads ${fuWhere}`,
      fuParams
    );

    // BDE list for admin filter dropdown
    const [bdeUsers] = user.role === 'admin'
      ? await db.query('SELECT id, name FROM users WHERE role = ? AND is_active = 1', ['bde'])
      : [[]];

    res.render('leads/index', {
      title: 'Leads',
      leads,
      totalLeads,
      page: currentPage,
      filters: { search: search || '', status: status || 'all', bde: bde || '', page: currentPage },
      followUpsToday,
      bdeUsers,
      today,
      moment,
      user,
      error: req.flash('error'),
      success: req.flash('success')
    });

  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});

//////////////////////////////////////////////////////////////
// GET /leads/export/excel  (must be before /:id routes)
//////////////////////////////////////////////////////////////
router.get('/export/excel', isAdmin, async (req, res) => {
  try {
    const [leads] = await db.query(`
      SELECT l.*, u.name AS bde_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ORDER BY l.created_at DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leads');

    sheet.columns = [
      { header: 'Name',          key: 'name',           width: 22 },
      { header: 'Email',         key: 'email',          width: 28 },
      { header: 'Phone',         key: 'phone',          width: 16 },
      { header: 'Source',        key: 'source',         width: 14 },
      { header: 'Status',        key: 'status',         width: 14 },
      { header: 'Project Type',  key: 'project_type',   width: 20 },
      { header: 'Budget',        key: 'budget',         width: 14 },
      { header: 'Follow-Up Date',key: 'follow_up_date', width: 18 },
      { header: 'Assigned BDE',  key: 'bde_name',       width: 20 },
      { header: 'Comments',      key: 'comment',        width: 30 },
      { header: 'Created At',    key: 'created_at',     width: 20 },
    ];

    sheet.addRows(leads);

    // Bold header row
    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=leads-${moment().format('YYYY-MM-DD')}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Export error:', err);
    req.flash('error', 'Failed to export leads');
    res.redirect('/leads');
  }
});

//////////////////////////////////////////////////////////////
// GET /leads/new
//////////////////////////////////////////////////////////////
router.get('/new', async (req, res) => {
  try {
    const user = req.session.user;
    const [bdeUsers] = user.role === 'admin'
      ? await db.query('SELECT id, name FROM users WHERE role = ? AND is_active = 1', ['bde'])
      : [[]];

    res.render('leads/form', {
      title: 'Add Lead',
      lead: null,
      user,
      bdeUsers,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    res.redirect('/leads');
  }
});

//////////////////////////////////////////////////////////////
// POST /leads
//////////////////////////////////////////////////////////////
router.post('/', async (req, res) => {
  const { name, email, phone, source, status, project_type, budget, follow_up_date, comment, assigned_to } = req.body;
  const user = req.session.user;

  if (!name || !source || !status) {
    req.flash('error', 'Name, source and status are required');
    return res.redirect('/leads/new');
  }

  try {
    const assignedTo = user.role === 'admin' && assigned_to ? assigned_to : user.id;

    await db.query(
      `INSERT INTO leads (name, email, phone, source, status, project_type, budget, follow_up_date, comment, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email || null, phone || null, source, status,
       project_type || null, budget || null,
       follow_up_date || null, comment || null,
       assignedTo]
    );

    req.flash('success', `Lead "${name}" added successfully`);
    res.redirect('/leads');

  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add lead. Please try again.');
    res.redirect('/leads/new');
  }
});

//////////////////////////////////////////////////////////////
// GET /leads/:id/edit
//////////////////////////////////////////////////////////////
router.get('/:id/edit', async (req, res) => {
  try {
    const user = req.session.user;
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);

    if (!rows.length) return res.redirect('/leads');

    // BDEs can only edit their own leads
    if (user.role === 'bde' && rows[0].assigned_to !== user.id) {
      req.flash('error', 'Access denied');
      return res.redirect('/leads');
    }

    const [bdeUsers] = user.role === 'admin'
      ? await db.query('SELECT id, name FROM users WHERE role = ? AND is_active = 1', ['bde'])
      : [[]];

    res.render('leads/form', {
      title: 'Edit Lead',
      lead: rows[0],
      user,
      bdeUsers,
      error: req.flash('error'),
      success: req.flash('success')
    });

  } catch (err) {
    console.error(err);
    res.redirect('/leads');
  }
});

//////////////////////////////////////////////////////////////
// PUT /leads/:id
//////////////////////////////////////////////////////////////
router.put('/:id', async (req, res) => {
  const { name, email, phone, source, status, project_type, budget, follow_up_date, comment, assigned_to } = req.body;
  const user = req.session.user;

  try {
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);

    if (!rows.length) return res.redirect('/leads');

    // BDEs can only edit their own leads
    if (user.role === 'bde' && rows[0].assigned_to !== user.id) {
      req.flash('error', 'Access denied');
      return res.redirect('/leads');
    }

    const assignedTo = user.role === 'admin'
      ? (assigned_to || null)
      : rows[0].assigned_to;

    await db.query(
      `UPDATE leads SET
        name = ?, email = ?, phone = ?, source = ?, status = ?,
        project_type = ?, budget = ?, follow_up_date = ?,
        comment = ?, assigned_to = ?
       WHERE id = ?`,
      [name, email || null, phone || null, source, status,
       project_type || null, budget || null,
       follow_up_date || null, comment || null,
       assignedTo, req.params.id]
    );

    req.flash('success', 'Lead updated successfully');
    res.redirect('/leads');

  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update lead');
    res.redirect('/leads');
  }
});

//////////////////////////////////////////////////////////////
// POST /leads/:id/delete
//////////////////////////////////////////////////////////////
router.post('/:id/delete', async (req, res) => {
  const user = req.session.user;

  try {
    if (user.role !== 'admin') {
      req.flash('error', 'Only admins can delete leads');
      return res.redirect('/leads');
    }

    const [rows] = await db.query('SELECT id FROM leads WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      req.flash('error', 'Lead not found');
      return res.redirect('/leads');
    }

    await db.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    req.flash('success', 'Lead deleted');

  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete lead');
  }

  res.redirect('/leads');
});

module.exports = router;