// Business routes
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireBusiness } = require('../auth');

router.get('/me', requireAuth, requireBusiness, (req, res) => {
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.businessId);
  res.json({ business });
});

router.patch('/me', requireAuth, requireBusiness, (req, res) => {
  const allowed = ['name', 'address', 'phone', 'email', 'cac_number', 'business_type'];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  if (!Object.keys(updates).length) return res.json({ ok: true });
  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const vals = Object.values(updates);
  db.prepare(`UPDATE businesses SET ${sets} WHERE id = ?`).run(...vals, req.businessId);
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.businessId);
  res.json({ business });
});

router.post('/request-upgrade', requireAuth, requireBusiness, (req, res) => {
  const { new_tier } = req.body;
  if (!['starter', 'professional', 'enterprise'].includes(new_tier)) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.businessId);
  const admin = db.prepare("SELECT * FROM users WHERE email = ?").get(require('../config').adminEmail);
  
  if (admin) {
    const id = require('crypto').randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, business_id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, business.id, admin.id, 'Upgrade Request', `${business.name} requested an upgrade to ${new_tier.toUpperCase()}`, 'info');
  }
  res.json({ success: true });
});

module.exports = router;
