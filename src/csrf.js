const { doubleCsrf } = require('csrf-csrf');

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'coda_csrf_secret_key_1234567890_super_secure',
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
  getSessionIdentifier: (req) => req.cookies?.coda_sid || req.ip || 'anon',
});

module.exports = {
  generateCsrfToken,
  csrfProtection: doubleCsrfProtection,
};
