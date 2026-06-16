// Coda — Premium Fintech ERP for Nigerian SMEs
// Entry point: wires Express, routes, middleware, and the static frontend.
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const config = require('./src/config');
const { attachUser, requireAuth, requireBusiness, requireAdmin } = require('./src/auth');
const { db } = require('./src/db');

const app = express();
app.use((req, res, next) => {
  console.log('INCOMING REQUEST:', req.method, req.url, req.originalUrl);
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachUser);

// Rate limiting for auth endpoints
const authRequestCounts = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 10;

function authRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const key = `auth:${ip}`;
  
  if (!authRequestCounts.has(key)) {
    authRequestCounts.set(key, { count: 0, windowStart: now });
  }
  
  const record = authRequestCounts.get(key);
  if (now - record.windowStart > AUTH_WINDOW_MS) {
    record.count = 0;
    record.windowStart = now;
  }
  
  record.count++;
  
  res.set({
    'X-RateLimit-Limit': AUTH_MAX_REQUESTS,
    'X-RateLimit-Remaining': Math.max(0, AUTH_MAX_REQUESTS - record.count),
    'X-RateLimit-Reset': new Date(record.windowStart + AUTH_WINDOW_MS).toISOString()
  });
  
  if (record.count > AUTH_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many attempts, please try again later' });
  }
  
  next();
}

app.use('/api/v1/auth/login', (req, res, next) => {
  console.log('RATE LIMITER HIT for login:', req.ip);
  authRateLimiter(req, res, next);
});
app.use('/api/v1/auth/signup', (req, res, next) => {
  console.log('RATE LIMITER HIT for signup:', req.ip);
  authRateLimiter(req, res, next);
});

// API routes
app.use('/api/v1/auth',         require('./src/routes/auth'));
app.use('/api/v1/business',     require('./src/routes/business'));
app.use('/api/v1/accounting',   require('./src/routes/accounting'));
app.use('/api/v1/inventory',    require('./src/routes/inventory'));
app.use('/api/v1/crm',          require('./src/routes/crm'));
app.use('/api/v1/hr',           require('./src/routes/hr'));
app.use('/api/v1/tax',          require('./src/routes/tax'));
app.use('/api/v1/subscription', require('./src/routes/subscription'));
app.use('/api/v1/admin', require('./src/routes/admin'));

// Backward-compat: the original /api/v1/business/onboard endpoint
const subscription = require('./src/modules/subscription');
const accounting = require('./src/modules/accounting');
app.post('/api/v1/business/onboard', (req, res) => {
  try {
    const { businessName, registrationNumber, businessType, contactEmail, contactPhone, subscriptionTier, address } = req.body;
    if (!businessName || !registrationNumber || !contactEmail) {
      return res.status(400).json({ success: false, error: 'businessName, registrationNumber, contactEmail required' });
    }
    if (!/^(RC|BN)\d{6,8}$/i.test(registrationNumber)) {
      return res.status(400).json({ success: false, error: 'Invalid CAC registration format (e.g. RC1234567)' });
    }
    const businessId = 'BIZ_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    db.prepare(
      `INSERT INTO businesses (id, name, cac_number, business_type, address, phone, email, tier, subscription_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`
    ).run(businessId, businessName, registrationNumber, businessType || 'limited', address || null, contactPhone || null, contactEmail, subscriptionTier || 'starter');
    const { seedAccounts } = require('./src/db');
    seedAccounts(businessId);
    const sub = subscription.createSubscription(businessId, subscriptionTier || 'starter');
    res.json({ success: true, businessId, subscriptionId: sub.id, onboardingComplete: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Compliance validation (no auth — public for the marketing site demo)
const { validateBusiness } = (() => {
  function validateCAC(rn) { return /^(RC|BN)\d{6,8}$/i.test(rn || ''); }
  function validateTIN(tin) { return /^\d{10,12}$/.test(tin || ''); }
  function validateBusiness(data) {
    const errors = [];
    const required = ['businessName', 'registrationNumber', 'businessType', 'address', 'contactEmail', 'contactPhone'];
    for (const f of required) if (!data[f]) errors.push(`Missing required field: ${f}`);
    if (data.registrationNumber && !validateCAC(data.registrationNumber)) errors.push('Invalid CAC registration number format');
    if (data.tin && !validateTIN(data.tin)) errors.push('Invalid Tax Identification Number format');
    return { valid: errors.length === 0, errors };
  }
  return { validateBusiness };
})();
app.post('/api/v1/compliance/validate', (req, res) => res.json(validateBusiness(req.body)));

// Protected dashboard route
app.get('/dashboard', attachUser, (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Protected admin route
app.get('/admin', attachUser, (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }
  if (req.user.email !== config.adminEmail) {
    return res.redirect('/dashboard');
  }
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// /login and /signup -> dedicated auth pages
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/healthz', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    res.json({ ok: true, users: userCount, version: config.version });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Boot
const PORT = process.env.PORT || 3100;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║              C O D A                     ║
  ║     Premium Fintech for Nigerian SMEs    ║
  ║                                          ║
  ║  Version: ${config.version.padEnd(32)}║
  ║  Company: ${config.company.padEnd(31)}║
  ╚══════════════════════════════════════════╝

  Server running on http://localhost:${PORT}
  Landing:    http://localhost:${PORT}/
  Dashboard:  http://localhost:${PORT}/dashboard
  API:        http://localhost:${PORT}/api/v1
  Health:     http://localhost:${PORT}/healthz

  Tiers: Starter ₦5,000 | Professional ₦15,000 | Enterprise ₦45,000
    `);
  });
}

module.exports = app;
