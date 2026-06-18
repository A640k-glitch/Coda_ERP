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

module.exports = router;
