const express = require('express');
const router = express.Router();
const { db } = require('../db');
const TenantDB = require('../tenant-db');
const { requireAuth, requireAdmin, logAudit } = require('../auth');
const subscription = require('../modules/subscription');
const { generateId } = require('../utils');

router.use(requireAuth, requireAdmin);

router.delete('/users/:id', (req, res) => {
  try {
    const user = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    (new TenantDB(req.user.business_id || req.businessId)).prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    (new TenantDB(req.user.business_id || req.businessId)).prepare('DELETE FROM users WHERE id = ?').run(user.id);
    logAudit(user.business_id, req.user.id, 'admin.user.delete', { deleted_user_id: user.id, email: user.email });
    
    // Add notification to admin's own business that a user was deleted
    const notifId = generateId('notif');
    (new TenantDB(req.user.business_id || req.businessId)).prepare('INSERT INTO notifications (id, business_id, title, message, is_admin) VALUES (?, ?, ?, ?, 1)').run(notifId, req.user.business_id, 'User Deleted', `Admin deleted user ${user.email}.`);
    
    // Auto-dismiss and audit pending appeal notifications
    const affectedNotifs = db.prepare("SELECT id FROM notifications WHERE target_item_id = ? AND title LIKE 'Account Appeal%' AND is_read = 0").all(user.id);
    if (affectedNotifs.length > 0) {
      db.prepare("UPDATE notifications SET is_read = 1 WHERE target_item_id = ? AND title LIKE 'Account Appeal%'").run(user.id);
      for (const notif of affectedNotifs) {
        logAudit(user.business_id, req.user.id, 'admin.notification.auto_read', { notification_id: notif.id, reason: 'user_deleted' });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'blocked', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'status must be active, blocked, or suspended' });
    }
    const user = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    (new TenantDB(req.user.business_id || req.businessId)).prepare('UPDATE users SET status = ? WHERE id = ?').run(status, user.id);
    // Destroy all sessions if blocked or suspended
    if (status === 'blocked' || status === 'suspended') {
      (new TenantDB(req.user.business_id || req.businessId)).prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    }
    logAudit(user.business_id, req.user.id, 'admin.user.status', { user_id: user.id, email: user.email, status });

    // Add notification to admin's own business that a user status changed
    const notifId = generateId('notif');
    (new TenantDB(req.user.business_id || req.businessId)).prepare('INSERT INTO notifications (id, business_id, title, message, is_admin) VALUES (?, ?, ?, ?, 1)').run(notifId, req.user.business_id, 'User ' + status.charAt(0).toUpperCase() + status.slice(1), `Admin changed user ${user.email} status to ${status}.`);

    // Auto-dismiss and audit pending appeal notifications
    const affectedNotifs = db.prepare("SELECT id FROM notifications WHERE target_item_id = ? AND title LIKE 'Account Appeal%' AND is_read = 0").all(user.id);
    if (affectedNotifs.length > 0) {
      db.prepare("UPDATE notifications SET is_read = 1 WHERE target_item_id = ? AND title LIKE 'Account Appeal%'").run(user.id);
      for (const notif of affectedNotifs) {
        logAudit(user.business_id, req.user.id, 'admin.notification.auto_read', { notification_id: notif.id, reason: `user_status_changed_to_${status}` });
      }
    }

    res.json({ success: true, userId: user.id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/upgrade', (req, res) => {
  try {
    const { tier } = req.body;
    if (!['starter', 'professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    const user = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    (new TenantDB(req.user.business_id || req.businessId)).prepare('UPDATE businesses SET tier = ? WHERE id = ?').run(tier, user.business_id);
    subscription.upgradeSubscription(user.business_id, tier);
    logAudit(user.business_id, req.user.id, 'admin.business.upgrade', { business_id: user.business_id, new_tier: tier, user_id: user.id });
    res.json({ success: true, userId: user.id, newTier: tier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/businesses/:id/tier', (req, res) => {
  try {
    const { tier } = req.body;
    if (!['starter', 'professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    const business = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    
    (new TenantDB(req.user.business_id || req.businessId)).prepare('UPDATE businesses SET tier = ? WHERE id = ?').run(tier, business.id);
    subscription.upgradeSubscription(business.id, tier);
    logAudit(business.id, req.user.id, 'admin.business.tier_change', { business_id: business.id, new_tier: tier });
    // Auto-dismiss and audit pending upgrade request notifications for this business
    const affectedNotifs = db.prepare("SELECT id FROM notifications WHERE business_id = ? AND title = 'Upgrade Request' AND is_read = 0").all(business.id);
    if (affectedNotifs.length > 0) {
      db.prepare("UPDATE notifications SET is_read = 1 WHERE business_id = ? AND title = 'Upgrade Request'").run(business.id);
      for (const notif of affectedNotifs) {
        logAudit(business.id, req.user.id, 'admin.notification.auto_read', { notification_id: notif.id, reason: `tier_changed_to_${tier}` });
      }
    }

    res.json({ success: true, businessId: business.id, newTier: tier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/me/tier', (req, res) => {
  try {
    const { tier } = req.body;
    if (!['starter', 'professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    const adminUser = (new TenantDB(req.user.business_id || req.businessId)).prepare("SELECT * FROM users WHERE email = ?").get(require('../config').adminEmail);
    if (!adminUser || adminUser.id !== req.user.id) {
      return res.status(404).json({ error: 'Admin user not found or mismatch' });
    }
    (new TenantDB(req.user.business_id || req.businessId)).prepare('UPDATE businesses SET tier = ? WHERE id = ?').run(tier, adminUser.business_id);
    subscription.upgradeSubscription(adminUser.business_id, tier);
    logAudit(adminUser.business_id, req.user.id, 'admin.self.upgrade', { new_tier: tier });
    res.json({ success: true, tier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/overview', (req, res) => {
  const totalUsers = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const activeUsers = (new TenantDB(req.user.business_id || req.businessId)).prepare("SELECT COUNT(*) AS c FROM users WHERE status = 'active' OR status IS NULL").get().c;
  const suspendedUsers = (new TenantDB(req.user.business_id || req.businessId)).prepare("SELECT COUNT(*) AS c FROM users WHERE status = 'suspended'").get().c;
  const blockedUsers = (new TenantDB(req.user.business_id || req.businessId)).prepare("SELECT COUNT(*) AS c FROM users WHERE status = 'blocked'").get().c;
  const totalBusinesses = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT COUNT(*) AS c FROM businesses').get().c;
  const activeSubscriptions = (new TenantDB(req.user.business_id || req.businessId)).prepare("SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'active'").get().c;
  const paidRevenue = (new TenantDB(req.user.business_id || req.businessId)).prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid'").get().total;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const signupsThisMonth = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?').get(monthStart).c;
  const trialCount = (new TenantDB(req.user.business_id || req.businessId)).prepare("SELECT COUNT(*) AS c FROM businesses WHERE subscription_status = 'trial'").get().c;
  const tierDist = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT tier, COUNT(*) AS count FROM businesses GROUP BY tier').all();

  res.json({
    overview: {
      totalUsers,
      activeUsers,
      suspendedUsers,
      blockedUsers,
      totalBusinesses,
      activeSubscriptions,
      paidRevenue,
      signupsThisMonth,
      trialCount,
      tierDistribution: tierDist,
    }
  });
});

router.get('/analytics/signups', (req, res) => {
  const months = 12;
  const now = new Date();
  const labels = [];
  const values = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const count = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT COUNT(*) AS c FROM users WHERE created_at >= ? AND created_at <= ?').get(start, end).c;
    labels.push(d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }));
    values.push(count);
  }
  res.json({ signups: { labels, values } });
});

router.get('/analytics/revenue', (req, res) => {
  const byTier = (new TenantDB(req.user.business_id || req.businessId)).prepare(`
    SELECT b.tier, COALESCE(SUM(p.amount), 0) AS total
    FROM businesses b
    LEFT JOIN payments p ON p.business_id = b.id AND p.status = 'paid'
    GROUP BY b.tier
  `).all();
  const months = 12;
  const now = new Date();
  const labels = [];
  const values = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const total = (new TenantDB(req.user.business_id || req.businessId)).prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid' AND created_at >= ? AND created_at <= ?").get(start, end).total;
    labels.push(d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }));
    values.push(total);
  }
  res.json({
    revenueByTier: byTier,
    revenueTrend: { labels, values },
  });
});

router.get('/users', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const total = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const users = (new TenantDB(req.user.business_id || req.businessId)).prepare(`
    SELECT u.id, u.email, u.name, u.role, u.status, u.created_at, u.business_id,
           b.name AS business_name, b.tier AS business_tier
    FROM users u
    LEFT JOIN businesses b ON b.id = u.business_id
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get('/businesses', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const total = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT COUNT(*) AS c FROM businesses').get().c;
  const businesses = (new TenantDB(req.user.business_id || req.businessId)).prepare(`
    SELECT b.*,
           (SELECT COUNT(*) FROM users WHERE business_id = b.id) AS user_count,
           (SELECT COUNT(*) FROM payments WHERE business_id = b.id AND status = 'paid') AS payment_count
    FROM businesses b
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ businesses, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get('/audit-log', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const total = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT COUNT(*) AS c FROM audit_log').get().c;
  const entries = (new TenantDB(req.user.business_id || req.businessId)).prepare(`
    SELECT a.*, u.email AS user_email, u.name AS user_name, b.name AS business_name
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN businesses b ON b.id = a.business_id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get('/notifications', (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE is_admin = 1
      ORDER BY created_at DESC 
      LIMIT 50
    `).all();
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/notifications/:id/read', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND is_admin = 1').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/notifications/:id/unread', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 0 WHERE id = ? AND is_admin = 1').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
