// Business routes
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const TenantDB = require('../tenant-db');
const { requireAuth, requireBusiness } = require('../auth');

router.get('/me', requireAuth, requireBusiness, (req, res) => {
  const tdb = new TenantDB(req.businessId);
  const business = tdb.prepare('SELECT * FROM businesses WHERE id = ?').get(req.businessId);
  res.json({ business });
});

router.patch('/me', requireAuth, requireBusiness, (req, res) => {
  const tdb = new TenantDB(req.businessId);
  const allowed = ['name', 'address', 'phone', 'email', 'cac_number', 'business_type'];
  const { escapeHtml } = require('../utils');
  const updates = {};
  for (const k of allowed) {
    if (k in req.body && typeof req.body[k] === 'string') {
      updates[k] = escapeHtml(req.body[k]);
    }
  }
  if (!Object.keys(updates).length) return res.json({ ok: true });
  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const vals = Object.values(updates);
  tdb.prepare(`UPDATE businesses SET ${sets} WHERE id = ?`).run(...vals, req.businessId);
  const business = tdb.prepare('SELECT * FROM businesses WHERE id = ?').get(req.businessId);
  res.json({ business });
});

router.post('/request-upgrade', requireAuth, requireBusiness, (req, res) => {
  const tdb = new TenantDB(req.businessId);
  const { new_tier } = req.body;
  if (!['starter', 'professional', 'enterprise'].includes(new_tier)) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  const business = tdb.prepare('SELECT * FROM businesses WHERE id = ?').get(req.businessId);
  // We can use tdb for getting admin because it's just a select query, 
  // but it's technically a global query. We'll use db for admin lookup.
  const admin = db.prepare("SELECT * FROM users WHERE email = ?").get(require('../config').adminEmail);
  
  if (admin) {
    const id = require('crypto').randomUUID();
    tdb.prepare(`
      INSERT INTO notifications (id, business_id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, business.id, admin.id, 'Upgrade Request', `${business.name} requested an upgrade to ${new_tier.toUpperCase()}`, 'info');
  }
  res.json({ success: true });
});

module.exports = router;
