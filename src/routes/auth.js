// Auth routes: signup, login, logout, me
const express = require('express');
const router = express.Router();
const { db, seedAccounts } = require('../db');
const { generateId, generateApiKey } = require('../utils');
const {
  hashPassword, verifyPassword, createSession, destroySession,
  setSessionCookie, clearSessionCookie, requireAuth, logAudit,
} = require('../auth');
const subscription = require('../modules/subscription');
const config = require('../config');

// Simple rate limiting
const authRequestCounts = new Map();
const AUTH_WINDOW_MS=15 * 60 * 1000;
const AUTH_MAX_REQUESTS=10;

function checkAuthRateLimit(req, res) {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const key = `auth:${ip}`;
  
  console.log('RATE LIMIT CHECK:', ip, 'key:', key, 'windowStart:', authRequestCounts.has(key) ? authRequestCounts.get(key).windowStart : 'new');
  
  if (!authRequestCounts.has(key)) {
    authRequestCounts.set(key, { count: 0, windowStart: now });
  }
  
  const record = authRequestCounts.get(key);
  if (now - record.windowStart > AUTH_WINDOW_MS) {
    record.count = 0;
    record.windowStart = now;
  }
  
  record.count++;
  console.log('RATE LIMIT COUNT:', record.count, 'max:', AUTH_MAX_REQUESTS);
  
  res.set({
    'X-RateLimit-Limit': AUTH_MAX_REQUESTS,
    'X-RateLimit-Remaining': Math.max(0, AUTH_MAX_REQUESTS - record.count),
    'X-RateLimit-Reset': new Date(record.windowStart + AUTH_WINDOW_MS).toISOString()
  });
  
  if (record.count > AUTH_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many attempts, please try again later' });
  }
  
  return null;
}

router.post('/signup', (req, res) => {
  const rateLimitResult = checkAuthRateLimit(req, res);
  if (rateLimitResult) return rateLimitResult;
  
  const { email, password, name, businessName, cacNumber, phone, businessType, tier } = req.body || {};
  if (!email || !password || !name || !businessName) {
    return res.status(400).json({ error: 'email, password, name, businessName are required' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  if (cacNumber && !/^(RC|BN)\d{6,8}$/i.test(cacNumber)) {
    return res.status(400).json({ error: 'Invalid CAC registration number (e.g. RC1234567 or BN1234567)' });
  }

  const businessId = generateId('biz');
  const userId = generateId('usr');
  const apiKey = generateApiKey();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO businesses (id, name, cac_number, business_type, address, phone, email, tier, subscription_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'trial')`
    ).run(
      businessId,
      businessName,
      cacNumber || null,
      businessType || 'limited',
      req.body.address || null,
      phone || null,
      email,
      (tier && config.subscriptionTiers[tier]) ? tier : 'starter'
    );
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, business_id, role, api_key)
       VALUES (?, ?, ?, ?, ?, 'owner', ?)`
    ).run(userId, email, hashPassword(password), name, businessId, apiKey);
    seedAccounts(businessId);
  });
  tx();

  const sub = subscription.createSubscription(businessId, (tier && config.subscriptionTiers[tier]) ? tier : 'starter');

  const session = createSession(userId);
  setSessionCookie(res, session.id, session.expires);
  logAudit(businessId, userId, 'user.signup', { email });

  res.status(201).json({
    user: { id: userId, email, name, business_id: businessId, role: 'owner', api_key: apiKey },
    business: { id: businessId, name: businessName, tier: sub.tier, subscription_status: 'trial' },
    subscription: sub,
    token: session.id
  });
});

router.post('/login', (req, res) => {
  console.log('LOGIN HANDLER CALLED');
  res.setHeader('X-Test-Header', 'test-value');
  const rateLimitResult = checkAuthRateLimit(req, res);
  if (rateLimitResult) return rateLimitResult;
  
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const session = createSession(user.id);
  setSessionCookie(res, session.id, session.expires);
  logAudit(user.business_id, user.id, 'user.login', { email });
  const isAdmin = user.email === config.adminEmail;
  res.json({
    user: { id: user.id, email: user.email, name: user.name, business_id: user.business_id, role: user.role, api_key: user.api_key },
    token: session.id,
    isAdmin
  });
});

router.post('/logout', (req, res) => {
  const sid = req.sessionId;
  if (sid) destroySession(sid);
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.user.business_id);
  const sub = subscription.getSubscription(req.user.business_id);
  const isAdmin = req.user.email === config.adminEmail;
  res.json({
    user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role, api_key: req.user.api_key },
    isAdmin,
    business,
    subscription: sub,
  });
});

module.exports = router;