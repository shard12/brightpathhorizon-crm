const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
router.use(isAuthenticated);
router.get('/', (req, res) => {
  res.render('incentives', {
    title: 'Incentives | BrightPathHorizon CRM',
    error: req.flash('error'),
    success: req.flash('success')
  });
});
module.exports = router;