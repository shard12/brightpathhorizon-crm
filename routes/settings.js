// routes/settings.js
// Settings: appearance prefs + help/support email

const express = require('express');
const router  = express.Router();
const { isAuthenticated } = require('../middleware/auth');

let resend = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resend = new Resend(process.env.RESEND_API_KEY);
}

router.use(isAuthenticated);


// ─────────────────────────────────────────────────────────────
// GET /settings
// ─────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.render('settings', {
    title: 'Settings | BrightPathHorizon CRM',
    error:   req.flash('error'),
    success: req.flash('success'),
  });
});


// ─────────────────────────────────────────────────────────────
// POST /settings/help
// ─────────────────────────────────────────────────────────────
router.post('/help', async (req, res) => {
  const { category, subject, message } = req.body;
  const user = req.session.user;

  if (!category || !subject || !message) {
    req.flash('error', 'Please fill in all fields.');
    return res.redirect('/settings#help');
  }

  try {
    if (resend) {
      // 1. Notify admin
      await resend.emails.send({
        from: 'BrightPathHorizon CRM <onboarding@resend.dev>',
        to:   process.env.ADMIN_EMAIL || 'admin@brightpathhorizon.com',
        subject: `[CRM Help] ${category.toUpperCase()}: ${subject}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;">
            <h2 style="color:#1a56db;">New Help Request</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;width:100px;">From</td>
                <td style="font-weight:600;">${user.name} (${user.email})</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;">Category</td>
                <td>
                  <span style="background:#ebf0ff;color:#1a56db;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">
                    ${category}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;">Subject</td>
                <td style="font-weight:600;">${subject}</td>
              </tr>
            </table>
            <div style="margin-top:16px;padding:16px;background:#f8fafc;border-radius:8px;font-size:14px;line-height:1.7;color:#0f172a;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="font-size:12px;color:#94a3b8;margin-top:20px;">
              Submitted via BrightPathHorizon CRM — Settings → Help
            </p>
          </div>
        `
      });

      // 2. Confirm to user
      await resend.emails.send({
        from: 'BrightPathHorizon CRM <onboarding@resend.dev>',
        to:   user.email,
        subject: `We received your request: ${subject}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;">
            <h2 style="color:#1a56db;">Hi ${user.name},</h2>
            <p style="color:#0f172a;">We've received your help request and will respond within 24 hours.</p>
            <div style="padding:14px 18px;background:#f0f4ff;border-left:4px solid #1a56db;border-radius:4px;margin:20px 0;">
              <strong>${subject}</strong><br>
              <span style="font-size:13px;color:#64748b;">
                ${message.substring(0, 200)}${message.length > 200 ? '…' : ''}
              </span>
            </div>
            <p style="color:#64748b;font-size:13px;">— BrightPathHorizon CRM Team</p>
          </div>
        `
      });

      req.flash('success', 'Your message has been sent! Check your email for confirmation.');

    } else {
      // Resend not configured — log it and still confirm to user
      console.log(`[DEV] Help request from ${user.name} (${user.email})`);
      console.log(`[DEV] Category: ${category} | Subject: ${subject}`);
      console.log(`[DEV] Message: ${message}`);

      req.flash('success', 'Your message has been received. We will get back to you soon.');
    }

  } catch (err) {
    console.error('Help email error:', err);
    req.flash('error', 'Failed to send message. Please try again.');
  }

  res.redirect('/settings');
});

module.exports = router;