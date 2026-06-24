// Authentication: bcryptjs + cookie session, plus API key for programmatic access
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const { generateId, generateApiKey, asyncHandler } = require('./utils');
const config = require('./config');

const SESSION_TTL_MS = 1 * 60 * 60 * 1000; // 1 hour

async function hashPassword(plain) {
  return await bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hash) {
  return await bcrypt.compare(plain, hash);
}

function createSession(userId) {
  const id = generateId('sess');
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(id, userId, expires);
  return { id, expires };
}

function destroySession(id) {
  if (!id) return;
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

function userFromSession(id) {
  if (!id) return null;
  const row = db
    .prepare(
      `SELECT s.id AS sid, s.expires_at, u.*
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .get(id);
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    destroySession(id);
    return null;
  }
  // Block suspended/blocked users from using existing sessions
  if (row.status === 'blocked' || row.status === 'suspended') {
    destroySession(id);
    return null;
  }
  return row;
}

function userFromApiKey(key) {
  if (!key) return null;
  const user = db.prepare('SELECT * FROM users WHERE api_key = ?').get(key);
  if (!user) return null;
  // Block suspended/blocked users from using API keys
  if (user.status === 'blocked' || user.status === 'suspended') {
    return null;
  }
  return user;
}

function setSessionCookie(res, id, expiresIso) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresIso) - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `coda_sid=${id}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`
  );
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `coda_sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`);
}

function clearAuthCookies(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `coda_sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
    `coda_csrf=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`
  ]);
}

function readSessionCookie(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(/(?:^|;\s*)coda_sid=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Middleware: load current user from session OR X-API-Key
function attachUser(req, res, next) {
  const sid = readSessionCookie(req);
  const apiKey = req.headers['x-api-key'];
  const user = sid ? userFromSession(sid) : null;
  const apiUser = !user && apiKey ? userFromApiKey(apiKey) : null;
  req.user = user || apiUser || null;
  req.sessionId = sid;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireActiveAccount(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.status === 'blocked') {
    return res.status(403).json({ error: 'This account has been blocked. Please contact support.' });
  }
  if (req.user.status === 'suspended') {
    return res.status(403).json({ error: 'This account has been suspended. Please contact support.' });
  }
  next();
}

function requireBusiness(req, res, next) {
  if (!req.user || !req.user.business_id) {
    return res.status(403).json({ error: 'No business associated with this account' });
  }
  req.businessId = req.user.business_id;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.email !== config.adminEmail) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function logAudit(businessId, userId, action, details) {
  try {
    db.prepare(
      'INSERT INTO audit_log (business_id, user_id, action, details) VALUES (?, ?, ?, ?)'
    ).run(businessId || null, userId || null, action, details ? JSON.stringify(details) : null);
  } catch (e) {
    // best-effort
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  clearAuthCookies,
  attachUser,
  requireAuth,
  requireActiveAccount,
  requireBusiness,
  requireAdmin,
  logAudit,
  asyncHandler,
};
