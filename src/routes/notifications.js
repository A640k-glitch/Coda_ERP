const express = require('express');
const router = express.Router();
const { db } = require('../db');
const TenantDB = require('../tenant-db');
const { requireAuth } = require('../auth');

router.use(requireAuth);

router.get('/', (req, res) => {
  try {
    const notifications = (new TenantDB(req.user.business_id || req.businessId)).prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? OR business_id = ?
      ORDER BY created_at DESC 
      LIMIT 20
    `).all(req.user.id, req.user.business_id);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/read', (req, res) => {
  try {
    const notif = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.user_id && notif.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    (new TenantDB(req.user.business_id || req.businessId)).prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/unread', (req, res) => {
  try {
    const notif = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.user_id && notif.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    (new TenantDB(req.user.business_id || req.businessId)).prepare('UPDATE notifications SET is_read = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/toggle-read', (req, res) => {
  try {
    const notif = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.user_id && notif.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const newStatus = notif.is_read ? 0 : 1;
    (new TenantDB(req.user.business_id || req.businessId)).prepare('UPDATE notifications SET is_read = ? WHERE id = ?').run(newStatus, req.params.id);
    res.json({ success: true, is_read: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/read-all', (req, res) => {
  try {
    (new TenantDB(req.user.business_id || req.businessId)).prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? OR business_id = ?').run(req.user.id, req.user.business_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
