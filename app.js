// Coda — Premium Fintech ERP for Nigerian SMEs
// Entry point: wires Express, routes, middleware, and the static frontend.
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

const config = require('./src/config');
const { attachUser, requireAuth, requireBusiness, requireAdmin } = require('./src/auth');
const { db } = require('./src/db');
const { csrfProtection } = require('./src/csrf');
const { escapeHtml } = require('./src/utils');
const rateLimit = require('express-rate-limit');

const onboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many onboard requests from this IP, please try again after 15 minutes' }
});

const app = express();

// Security headers with CSP for external CDNs (Fonts, Chartjs)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://api.coingecko.com", "https://open.er-api.com", "https://cdn.jsdelivr.net"]
    }
  }
}));

// CORS with origin whitelist/reflection
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
  credentials: true
}));

// Dev-only conditional request logging
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('INCOMING REQUEST:', req.method, req.url, req.originalUrl);
  }
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachUser);

// CSRF middleware
const csrfBypassRoutes = ['/api/v1/compliance/validate', '/api/v1/auth/appeal'];
app.use((req, res, next) => {
  if (csrfBypassRoutes.includes(req.path)) {
    return next();
  }
  csrfProtection(req, res, (err) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }
    next();
  });
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
app.use('/api/v1/reconciliation', require('./src/routes/reconciliation'));
app.use('/api/v1/admin', require('./src/routes/admin'));
app.use('/api/v1/notifications', require('./src/routes/notifications'));
app.use('/api/v1/integrations', require('./src/routes/integrations'));
app.use('/api/v1/macro', require('./src/routes/macro'));
app.use('/api/v1/config/public', require('./src/routes/public-config'));


// Backward-compat: the original /api/v1/business/onboard endpoint
const subscription = require('./src/modules/subscription');
const accounting = require('./src/modules/accounting');
app.post('/api/v1/business/onboard', onboardLimiter, requireAuth, (req, res) => {
  try {
    const { businessName, registrationNumber, businessType, contactEmail, contactPhone, subscriptionTier, address } = req.body;
    if (!businessName || !registrationNumber || !contactEmail) {
      return res.status(400).json({ success: false, error: 'businessName, registrationNumber, contactEmail required' });
    }
    if (!/^(RC|BN)\d{6,8}$/i.test(registrationNumber)) {
      return res.status(400).json({ success: false, error: 'Invalid CAC registration format (e.g. RC1234567)' });
    }
    const businessId = 'BIZ_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    
    const safeBusinessName = escapeHtml(businessName);
    const safeAddress = escapeHtml(address);
    const safePhone = escapeHtml(contactPhone);

    db.prepare(
      `INSERT INTO businesses (id, name, cac_number, business_type, address, phone, email, tier, subscription_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`
    ).run(businessId, safeBusinessName, registrationNumber, businessType || 'limited', safeAddress || null, safePhone || null, contactEmail, subscriptionTier || 'starter');
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
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});
app.get('/blocked', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blocked.html'));
});

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/healthz', (req, res) => {
  try {
    res.json({ ok: true, version: config.version });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const message = process.env.NODE_ENV !== 'production' ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
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

  Tiers: Starter ₦${config.subscriptionTiers.starter.price.toLocaleString()} | Professional ₦${config.subscriptionTiers.professional.price.toLocaleString()} | Enterprise ₦${config.subscriptionTiers.enterprise.price.toLocaleString()}
    `);
  });
}

module.exports = app;
