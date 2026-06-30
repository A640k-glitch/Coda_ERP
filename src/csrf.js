const { doubleCsrf } = require('csrf-csrf');

const crypto = require('crypto');
const fallbackSecret = crypto.randomBytes(32).toString('hex');

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || fallbackSecret,
  cookieName: 'coda_csrf',
  cookieOptions: {
    path: '/',
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] || req.body._csrf,
  getSessionIdentifier: (req) => req.cookies?.coda_sid || 'anon',
});

module.exports = {
  generateCsrfToken,
  csrfProtection: doubleCsrfProtection,
};
