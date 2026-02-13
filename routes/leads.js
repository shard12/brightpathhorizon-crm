// routes/leads.js
// Lead management: create, read, update, delete, export

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const ExcelJS = require('exceljs');
const moment = require('moment');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// All lead routes require login
router.use(isAuthenticated);

// ─── GET /leads ───────────────────────────────────────────────────────────────
// List all leads (admin: all | bde: own only)
router.get('/', async (req, res) => {
  try {
    const { status, bde, search } = req.query;
    const user = req.session.user;
    const today = moment().format('YYYY-MM-DD');

    let query = `
      SELECT l.*, u.name AS bde_name 
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];

    // BDE can only see their own leads
    if (user.role === 'bde') {
      query += ' AND l.assigned_to = ?';
      params.push(user.id);
    }

    // Admin filters
    if (status && status !== 'all') {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (bde && user.role === 'admin') {
      query += ' AND l.assigned_to = ?';
      params.push(bde);
    }
    if (search) {
      query += ' AND (l.name LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY l.created_at DESC';

    const [leads] = await db.query(query, params);

    // Count today's follow-ups
    let followUpQuery = `SELECT COUNT(*) AS cnt FROM leads WHERE follow_up_date = ?`;
    const followUpParams = [today];
    if (user.role === 'bde') {
      followUpQuery += ' AND assigned_to = ?';
      followUpParams.push(user.id);
    }
    const [followUpCount] = await db.query(followUpQuery, followUpParams);

    // Get BDE list for admin filter
    let bdeUsers = [];
    if (user.role === 'admin') {
      const [bdRows] = await db.query("SELECT id, name FROM users WHERE role = 'bde' AND is_active = 1");
      bdeUsers = bdRows;
    }

    res.render('leads/index', {
      title: 'Leads | BrightPathHorizon CRM',
      leads,
      bdeUsers,
      filters: { status, bde, search },
      followUpsToday: followUpCount[0].cnt,
      today,
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });

  } catch (err) {
    console.error('Leads list error:', err);
    req.flash('error', 'Failed to load leads');
    res.redirect('/dashboard');
  }
});

// ─── GET /leads/new ───────────────────────────────────────────────────────────
router.get('/new', async (req, res) => {
  try {
    let bdeUsers = [];
    if (req.session.user.role === 'admin') {
      const [rows] = await db.query("SELECT id, name FROM users WHERE role = 'bde' AND is_active = 1");
      bdeUsers = rows;
    }

    res.render('leads/form', {
      title: 'Add Lead | BrightPathHorizon CRM',
      lead: null,
      bdeUsers,
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    res.redirect('/leads');
  }
});

// ─── POST /leads ──────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, email, phone, source, project_type, budget, status, follow_up_date, comment, assigned_to } = req.body;
  const user = req.session.user;

  if (!name || !source || !status) {
    req.flash('error', 'Name, source, and status are required');
    return res.redirect('/leads/new');
  }

  try {
    // BDE can only assign to themselves
    const assignee = user.role === 'admin' && assigned_to ? assigned_to : user.id;

    await db.query(
      `INSERT INTO leads (name, email, phone, source, project_type, budget, status, follow_up_date, comment, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        source,
        project_type?.trim() || null,
        budget?.trim() || null,
        status,
        follow_up_date || null,
        comment?.trim() || null,
        assignee
      ]
    );

    req.flash('success', 'Lead added successfully!');
    res.redirect('/leads');
  } catch (err) {
    console.error('Create lead error:', err);
    req.flash('error', 'Failed to add lead. Try again.');
    res.redirect('/leads/new');
  }
});

// ─── GET /leads/:id/edit ──────────────────────────────────────────────────────
router.get('/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;

    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [id]);
    if (rows.length === 0) {
      req.flash('error', 'Lead not found');
      return res.redirect('/leads');
    }

    const lead = rows[0];

    // BDE can only edit their own leads
    if (user.role === 'bde' && lead.assigned_to !== user.id) {
      req.flash('error', 'Access denied: Not your lead');
      return res.redirect('/leads');
    }

    let bdeUsers = [];
    if (user.role === 'admin') {
      const [bdRows] = await db.query("SELECT id, name FROM users WHERE role = 'bde' AND is_active = 1");
      bdeUsers = bdRows;
    }

    res.render('leads/form', {
      title: 'Edit Lead | BrightPathHorizon CRM',
      lead,
      bdeUsers,
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    res.redirect('/leads');
  }
});

// ─── POST /leads/:id (method-override PUT) ────────────────────────────────────
router.post('/:id', async (req, res) => {
  const { name, email, phone, source, project_type, budget, status, follow_up_date, comment, assigned_to, _method } = req.body;
  const { id } = req.params;
  const user = req.session.user;

  try {
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [id]);
    if (rows.length === 0) {
      req.flash('error', 'Lead not found');
      return res.redirect('/leads');
    }

    const lead = rows[0];

    // BDE can only edit their own leads
    if (user.role === 'bde' && lead.assigned_to !== user.id) {
      req.flash('error', 'Access denied');
      return res.redirect('/leads');
    }

    const assignee = user.role === 'admin' && assigned_to ? assigned_to : lead.assigned_to;

    await db.query(
      `UPDATE leads SET name=?, email=?, phone=?, source=?, project_type=?, budget=?, 
       status=?, follow_up_date=?, comment=?, assigned_to=? WHERE id=?`,
      [
        name?.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        source,
        project_type?.trim() || null,
        budget?.trim() || null,
        status,
        follow_up_date || null,
        comment?.trim() || null,
        assignee,
        id
      ]
    );

    req.flash('success', 'Lead updated successfully!');
    res.redirect('/leads');
  } catch (err) {
    console.error('Update lead error:', err);
    req.flash('error', 'Failed to update lead');
    res.redirect(`/leads/${id}/edit`);
  }
});

// ─── POST /leads/:id/delete (Admin only) ──────────────────────────────────────
router.post('/:id/delete', isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    req.flash('success', 'Lead deleted');
    res.redirect('/leads');
  } catch (err) {
    console.error('Delete lead error:', err);
    req.flash('error', 'Failed to delete lead');
    res.redirect('/leads');
  }
});

// ─── GET /leads/export ────────────────────────────────────────────────────────
// Export all leads to Excel (admin only)
router.get('/export/excel', isAdmin, async (req, res) => {
  try {
    const [leads] = await db.query(`
      SELECT 
        l.id, l.name, l.email, l.phone, l.source, l.project_type, l.budget,
        l.status, l.follow_up_date, l.comment, u.name AS bde_name, l.created_at
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ORDER BY l.created_at DESC
    `);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BrightPathHorizon CRM';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Leads', {
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    // Header row styling
    sheet.columns = [
      { header: '#', key: 'id', width: 6 },
      { header: 'Full Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Source', key: 'source', width: 14 },
      { header: 'Project Type', key: 'project_type', width: 20 },
      { header: 'Budget', key: 'budget', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Follow-Up Date', key: 'follow_up_date', width: 16 },
      { header: 'Assigned BDE', key: 'bde_name', width: 18 },
      { header: 'Comments', key: 'comment', width: 30 },
      { header: 'Created At', key: 'created_at', width: 18 }
    ];

    // Style header row
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a56db' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    sheet.getRow(1).height = 25;

    // Add data rows
    leads.forEach(lead => {
      const row = sheet.addRow({
        id: lead.id,
        name: lead.name,
        email: lead.email || '-',
        phone: lead.phone || '-',
        source: lead.source,
        project_type: lead.project_type || '-',
        budget: lead.budget || '-',
        status: lead.status,
        follow_up_date: lead.follow_up_date
          ? moment(lead.follow_up_date).format('DD MMM YYYY') : '-',
        bde_name: lead.bde_name || '-',
        comment: lead.comment || '-',
        created_at: moment(lead.created_at).format('DD MMM YYYY HH:mm')
      });

      // Color-code status
      const statusCell = row.getCell('status');
      if (lead.status === 'New') {
        statusCell.font = { color: { argb: 'FF1a56db' }, bold: true };
      } else if (lead.status === 'In Progress') {
        statusCell.font = { color: { argb: 'FFf59e0b' }, bold: true };
      } else if (lead.status === 'Closed') {
        statusCell.font = { color: { argb: 'FF10b981' }, bold: true };
      }

      // Alternate row shading
      if (row.number % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FF' } };
        });
      }
    });

    // Auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length }
    };

    // Send file
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=BrightPathHorizon-Leads-${moment().format('YYYY-MM-DD')}.xlsx`
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Export error:', err);
    req.flash('error', 'Export failed');
    res.redirect('/leads');
  }
});

module.exports = router;
