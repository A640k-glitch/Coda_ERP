// Coda — Premium Fintech ERP for Nigerian SMEs
// Entry point: wires Express, routes, middleware, and the static frontend.
require('dotenv').config({ quiet: true });

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

const config = require('./src/config');
const { attachUser, requireAuth, requireBusiness, requireAdmin } = require('./src/auth');
const { db } = require('./src/db');
const { csrfProtection } = require('./src/csrf');
const { escapeHtml, generateNonce, serveHtml } = require('./src/utils');
const rateLimit = require('express-rate-limit');

// Seed demo data only on localhost/development
if (process.env.NODE_ENV === 'development') {
  const { seedDemoData } = require('./src/seed');
  seedDemoData();
}

const onboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many onboard requests from this IP, please try again after 15 minutes' }
});

const app = express();

// Trust Render proxy headers for rate-limiting
app.set('trust proxy', 1);

// Nonce middleware — generates a crypto random nonce per request
app.use((req, res, next) => {
  res.locals.nonce = generateNonce();
  res.locals.useStrictCsp = false; // default: relaxed CSP
  next();
});

// Helper to set strict nonce-based CSP for authenticated/protected pages
function setStrictCsp(req, res, nonce) {
  res.setHeader(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net`,
      `script-src-attr 'unsafe-inline'`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob:`,
      `connect-src 'self' https://api.coingecko.com https://open.er-api.com https://cdn.jsdelivr.net`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `object-src 'none'`
    ].join('; ')
  );
}

// Helper to set relaxed CSP for public marketing pages (allows inline scripts)
function setPublicCsp(req, res, nonce) {
  res.setHeader(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://code.jquery.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob:`,
      `connect-src 'self' https://api.coingecko.com https://open.er-api.com https://cdn.jsdelivr.net`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `object-src 'none'`
    ].join('; ')
  );
}

// Other security headers (CSP handled per-route above)
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: false },
  xDownloadOptions: true,
  xFrameOptions: { action: 'deny' },
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
  xXssProtection: false
}));

// Disable X-Powered-By
app.disable('x-powered-by');

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

// CSRF middleware — only GET/HEAD/OPTIONS and the compliance validator bypass
const csrfBypassRoutes = ['/api/v1/compliance/validate'];
app.use((req, res, next) => {
  if (csrfBypassRoutes.includes(req.path) || req.path.startsWith('/api/v1/integrations')) {
    return next();
  }
  csrfProtection(req, res, (err) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }
    next();
  });
});

// Prevent API responses from being cached by the browser
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
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
app.use('/api/v1/addons', require('./src/routes/addons'));
app.use('/api/v1/success-manager', require('./src/routes/success-manager'));
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

// Landing page — relaxed CSP (public marketing content)
app.get('/', (req, res) => {
  setPublicCsp(req, res, res.locals.nonce);
  serveHtml(res, path.join(__dirname, 'public', 'index.html'));
});

// How it works page — public CSP (uses inline styles for auth popout, same as index)
app.get('/how-it-works', (req, res) => {
  setPublicCsp(req, res, res.locals.nonce);
  serveHtml(res, path.join(__dirname, 'public', 'how-it-works.html'));
});

// Protected dashboard route — strict CSP
app.get('/dashboard', attachUser, (req, res) => {
  if (!req.user) {
    return res.redirect('/');
  }
  setStrictCsp(req, res, res.locals.nonce);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  serveHtml(res, path.join(__dirname, 'public', 'dashboard.html'));
});

// Protected admin route — strict CSP
app.get('/admin', attachUser, (req, res) => {
  if (!req.user) {
    return res.redirect('/');
  }
  if (req.user.email !== config.adminEmail) {
    return res.redirect('/dashboard');
  }
  setStrictCsp(req, res, res.locals.nonce);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  serveHtml(res, path.join(__dirname, 'public', 'admin.html'));
});

// Redirect api.html to the unified how-it-works page
app.get('/api.html', (req, res) => {
  res.redirect('/how-it-works');
});

// Redirect old auth routes to the new homepage modal flow
app.get('/login', (req, res) => res.redirect('/'));
app.get('/signup', (req, res) => res.redirect('/'));
app.get('/forgot-password', (req, res) => {
  setPublicCsp(req, res, res.locals.nonce);
  serveHtml(res, path.join(__dirname, 'public', 'forgot-password.html'));
});
app.get('/reset-password', (req, res) => {
  setPublicCsp(req, res, res.locals.nonce);
  serveHtml(res, path.join(__dirname, 'public', 'reset-password.html'));
});
app.get('/blocked', (req, res) => {
  setPublicCsp(req, res, res.locals.nonce);
  serveHtml(res, path.join(__dirname, 'public', 'blocked.html'));
});

// Static frontend — serves CSS, JS, images (HTML is handled by routes above)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', process.env.NODE_ENV === 'production' ? 'public, max-age=86400' : 'no-cache, no-store, must-revalidate');
    }
  }
}));

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
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: 'Internal server error',
    ...(isDev && { detail: err.message, stack: err.stack })
  });
});

// Boot
const PORT = process.env.PORT || 3100;
if (require.main === module) {
  const server = app.listen(PORT, () => {
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
  How It Works: http://localhost:${PORT}/how-it-works
  Dashboard:  http://localhost:${PORT}/dashboard
  API:        http://localhost:${PORT}/api/v1
  Health:     http://localhost:${PORT}/healthz

  Tiers: Starter ₦${config.subscriptionTiers.starter.price.toLocaleString()} | Professional ₦${config.subscriptionTiers.professional.price.toLocaleString()} | Enterprise ₦${config.subscriptionTiers.enterprise.price.toLocaleString()}
    `);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the existing server or set PORT to another value.`);
    } else {
      console.error('Failed to start server:', err);
    }
    process.exit(1);
  });
}

module.exports = app;


