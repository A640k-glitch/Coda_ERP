// Auth routes: signup, login, logout, me, csrf-token, forgot-password, reset-password
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { db, seedAccounts } = require('../db');
const { generateId, generateApiKey } = require('../utils');
const {
  hashPassword, verifyPassword, createSession, destroySession,
  setSessionCookie, clearSessionCookie, clearAuthCookies, requireAuth, logAudit,
} = require('../auth');
const { generateCsrfToken } = require('../csrf');
const subscription = require('../modules/subscription');
const config = require('../config');

// Rate limiting for login: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for signup: 3 attempts per hour per IP
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many accounts created from this IP. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for forgot password: 3 attempts per hour per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/v1/auth/csrf-token
router.get('/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// POST /api/v1/auth/signup
router.post('/signup', signupLimiter, async (req, res) => {
  const { email, password, name, businessName, cacNumber, phone, businessType, tier } = req.body || {};
  if (!email || !password || !name || !businessName) {
    return res.status(400).json({ error: 'email, password, name, businessName are required' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  if (cacNumber && !/^(RC|BN)\d{6,8}$/i.test(cacNumber)) {
    return res.status(400).json({ error: 'Invalid CAC registration number (e.g. RC1234567 or BN1234567)' });
  }

  const businessId = generateId('biz');
  const userId = generateId('usr');
  const apiKey = generateApiKey();

  // Hash password using async bcrypt
  const hashedPassword = await hashPassword(password);

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
    ).run(userId, email, hashedPassword, name, businessId, apiKey);
    seedAccounts(businessId);
  });
  tx();

  const sub = subscription.createSubscription(businessId, (tier && config.subscriptionTiers[tier]) ? tier : 'starter');

  const session = createSession(userId);
  setSessionCookie(res, session.id, session.expires);
  logAudit(businessId, userId, 'user.signup', { email });

  res.status(201).json({
    user: { id: userId, email, name, business_id: businessId, role: 'owner' },
    business: { id: businessId, name: businessName, tier: sub.tier, subscription_status: 'trial' },
    subscription: sub
  });
});

// POST /api/v1/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check account lockout
  if (user.locked_until) {
    const lockTime = new Date(user.locked_until);
    if (lockTime > new Date()) {
      return res.status(403).json({ error: 'Account temporarily locked. Please try again in 15 minutes.' });
    }
  }

  // Verify password using async bcrypt
  const isMatch = await verifyPassword(password, user.password_hash);
  if (!isMatch) {
    const failedAttempts = (user.failed_login_attempts || 0) + 1;
    let lockedUntil = null;
    if (failedAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?')
      .run(failedAttempts, lockedUntil, user.id);

    if (failedAttempts >= 5) {
      return res.status(403).json({ error: 'Account temporarily locked. Please try again in 15 minutes.' });
    }
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Clear failed login attempts and lockout on success
  db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?')
    .run(user.id);

  const session = createSession(user.id);
  setSessionCookie(res, session.id, session.expires);
  logAudit(user.business_id, user.id, 'user.login', { email });
  const isAdmin = user.email === config.adminEmail;

  res.json({
    user: { id: user.id, email: user.email, name: user.name, business_id: user.business_id, role: user.role },
    isAdmin
  });
});

// POST /api/v1/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const sid = req.sessionId;
  if (sid) destroySession(sid);
  clearAuthCookies(res);
  res.json({ ok: true });
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, (req, res) => {
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.user.business_id);
  const sub = subscription.getSubscription(req.user.business_id);
  const isAdmin = req.user.email === config.adminEmail;
  res.json({
    user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role },
    isAdmin,
    business,
    subscription: sub,
  });
});

const { sendPasswordResetEmail } = require('../services/email');

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (user) {
    // Generate a secure plain token
    const plainToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing it to prevent DB-leak hijack
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?')
      .run(hashedToken, expires, user.id);

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${plainToken}`;
    
    // Send email securely
    await sendPasswordResetEmail(user.email, resetUrl);
    
    logAudit(user.business_id, user.id, 'user.password_reset_request', { email });
  }

  // Timing-safe dummy response
  res.json({ message: 'If the email exists in our system, a password reset link has been sent.' });
});

// POST /api/v1/auth/delete-account — self-service account deletion
router.post('/delete-account', requireAuth, async (req, res) => {
  try {
    const { password, confirmation } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (confirmation !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) return res.status(403).json({ error: 'Incorrect password' });

    // Count remaining owners for this business
    const ownerCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE business_id = ? AND role = 'owner'").get(user.business_id).c;
    const isLastOwner = ownerCount <= 1 && user.role === 'owner';

    if (isLastOwner) {
      // Delete everything — cascade from business
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM businesses WHERE id = ?').run(user.business_id);
    } else {
      // Just delete the user (sessions cascade)
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    }

    // Destroy current session and clear cookies
    const sid = req.sessionId;
    if (sid) destroySession(sid);
    clearAuthCookies(res);

    logAudit(user.business_id, user.id, 'user.delete_account', { isLastOwner });

    res.json({ success: true, message: isLastOwner ? 'Account and business deleted.' : 'Account deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Hash the incoming plain token to compare with DB
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = db.prepare('SELECT * FROM users WHERE password_reset_token = ?').get(hashedToken);
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const expiresDate = new Date(user.password_reset_expires);
  if (expiresDate < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const hashedPassword = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL, failed_login_attempts = 0, locked_until = NULL WHERE id = ?')
    .run(hashedPassword, user.id);

  logAudit(user.business_id, user.id, 'user.password_reset_success', { email: user.email });

  res.json({ message: 'Password has been reset successfully.' });
});

module.exports = router;