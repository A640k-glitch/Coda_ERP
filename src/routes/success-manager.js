const express = require('express');
const router = express.Router();
const TenantDB = require('../tenant-db');
const { requireAuth, requireBusiness } = require('../auth');
const crypto = require('crypto');

router.use(requireAuth, requireBusiness);

// Get messages history
router.get('/messages', (req, res) => {
  try {
    const tdb = new TenantDB(req.businessId);
    const messages = tdb.prepare('SELECT * FROM success_manager_messages WHERE business_id = ? ORDER BY created_at ASC').all(req.businessId);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post a message and auto-simulate manager response
router.post('/messages', (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    const tdb = new TenantDB(req.businessId);
    const userMsgId = 'msg_' + crypto.randomUUID();
    
    // Save user message
    tdb.prepare(`
      INSERT INTO success_manager_messages (id, business_id, sender, message)
      VALUES (?, ?, ?, ?)
    `).run(userMsgId, req.businessId, req.user.name || 'User', message);

    // Auto-generate a response from Femi Adebayo
    const replyMsgId = 'msg_' + crypto.randomUUID();
    const responses = [
      "Hi there! Thank you for reaching out. I've received your note and am looking into your account now. Feel free to book a direct call below if you need a screen share!",
      "Hello! Femi here, your Success Manager. I am reviewing this with our technical team and will get back to you with an update shortly.",
      "Got it! Let's resolve this quickly. If you want to jump on a quick Google Meet, please schedule a time slot using the calendar below.",
      "Thanks for the message. I have flagged this for priority support and will track it personally until resolved."
    ];
    const randomReply = responses[Math.floor(Math.random() * responses.length)];
    
    tdb.prepare(`
      INSERT INTO success_manager_messages (id, business_id, sender, message)
      VALUES (?, ?, ?, ?)
    `).run(replyMsgId, req.businessId, 'Femi Adebayo', randomReply);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bookings
router.get('/bookings', (req, res) => {
  try {
    const tdb = new TenantDB(req.businessId);
    const bookings = tdb.prepare('SELECT * FROM success_manager_bookings WHERE business_id = ? ORDER BY created_at DESC').all(req.businessId);
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book a meeting
router.post('/bookings', (req, res) => {
  try {
    const { topic, meeting_date, meeting_time } = req.body;
    if (!topic || !meeting_date || !meeting_time) {
      return res.status(400).json({ error: 'Missing topic, date, or time' });
    }
    const tdb = new TenantDB(req.businessId);
    const id = 'book_' + crypto.randomUUID();
    tdb.prepare(`
      INSERT INTO success_manager_bookings (id, business_id, topic, meeting_date, meeting_time)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.businessId, topic, meeting_date, meeting_time);

    // Create admin notification for booking
    const notifId = require('../utils').generateId('notif');
    const adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get(require('../config').adminEmail);
    db.prepare(`
      INSERT INTO notifications (id, business_id, user_id, title, message, is_admin, target_view, target_item_id)
      VALUES (?, ?, ?, ?, ?, 1, 'bookings', ?)
    `).run(
      notifId,
      adminUser ? adminUser.business_id : req.businessId,
      adminUser ? adminUser.id : null,
      'Support Booking',
      `Business ${req.businessId} booked a meeting: ${topic} on ${meeting_date} at ${meeting_time}`,
      id
    );

    const { logAudit } = require('../auth');
    logAudit(req.businessId, req.user.id, 'booking.create', { id, topic, meeting_date, meeting_time });

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking status (and auto-dismiss notification)
router.patch('/bookings/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const tdb = new TenantDB(req.businessId);
    const booking = tdb.prepare('SELECT * FROM success_manager_bookings WHERE id = ? AND business_id = ?').get(req.params.id, req.businessId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    tdb.prepare('UPDATE success_manager_bookings SET status = ? WHERE id = ?').run(status, req.params.id);
    
    const { logAudit } = require('../auth');
    logAudit(req.businessId, req.user.id, 'booking.status_change', { booking_id: req.params.id, status });
    
    // Auto-dismiss and audit booking notification
    const affectedNotifs = db.prepare("SELECT id FROM notifications WHERE target_item_id = ? AND title = 'Support Booking' AND is_read = 0").all(req.params.id);
    if (affectedNotifs.length > 0) {
      db.prepare("UPDATE notifications SET is_read = 1 WHERE target_item_id = ? AND title = 'Support Booking'").run(req.params.id);
      for (const notif of affectedNotifs) {
        logAudit(req.businessId, req.user.id, 'booking.notification.auto_read', { notification_id: notif.id, reason: `booking_${status}` });
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
