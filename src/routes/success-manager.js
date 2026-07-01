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

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
