// middleware/auth.js
// Authentication and authorization middleware

/**
 * Ensure user is logged in
 * Redirects to login if not authenticated
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    // Attach user to res.locals for easy EJS access
    res.locals.user = req.session.user;
    return next();
  }
  req.flash('error', 'Please log in to access this page');
  res.redirect('/auth/login');
};

/**
 * Ensure user is Admin
 * Returns 403 if not admin role
 */
const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'Access denied: Admin only');
  res.redirect('/dashboard');
};

/**
 * Redirect authenticated users away from login/register
 */
const isGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = { isAuthenticated, isAdmin, isGuest };
