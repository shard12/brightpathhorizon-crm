// server.js
// BrightPathHorizon CRM - Main Application Entry Point

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const moment = require('moment');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
      },
    },
  })
);

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// ─── Method Override (PUT/DELETE via forms) ───────────────────────────────────
// Supports _method in both query string and request body
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    const method = req.body._method;
    delete req.body._method;
    return method;
  }
  if (req.query && req.query._method) {
    return req.query._method;
  }
}));

// ─── Trust Proxy (Railway / reverse proxies) ──────────────────────────────────
app.set('trust proxy', 1);

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'brightpath-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge:   8 * 60 * 60 * 1000, // 8 hours
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// ─── Flash Messages ───────────────────────────────────────────────────────────
app.use(flash());

// ─── Global Template Variables ────────────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user        = req.session.user || null;
  res.locals.moment      = moment;
  res.locals.currentPath = req.path;
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const dashboardRoutes  = require('./routes/dashboard');
const adminRoutes      = require('./routes/admin');
const leadsRoutes      = require('./routes/leads');
const incentivesRoutes = require('./routes/incentives');
const feedbackRoutes   = require('./routes/feedback');
const profileRoutes    = require('./routes/profile');
const settingsRoutes   = require('./routes/settings');

app.use('/auth',       authRoutes);
app.use('/dashboard',  dashboardRoutes);
app.use('/admin',      adminRoutes);
app.use('/leads',      leadsRoutes);
app.use('/incentives', incentivesRoutes);
app.use('/feedback',   feedbackRoutes);
app.use('/profile',    profileRoutes);
app.use('/settings',   settingsRoutes);

// ─── Root Redirect ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/auth/login');
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 Not Found | BrightPathHorizon CRM'
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).render('error', {
    title:   'Error | BrightPathHorizon CRM',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 BrightPathHorizon CRM is running!`);
  console.log(`   Local:  http://localhost:${PORT}`);
  console.log(`   Mode:   ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;