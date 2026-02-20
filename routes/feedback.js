const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
router.use(isAuthenticated);
router.get('/', (req, res) => {
  res.render('feedback', {
    title: 'Feedback | BrightPathHorizon CRM',
    error: req.flash('error'),
    success: req.flash('success')
  });
});
module.exports = router;