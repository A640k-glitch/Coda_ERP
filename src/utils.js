// Shared utility helpers
const crypto = require('crypto');

function generateId(prefix = '') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
}

function generateApiKey() {
  return 'coda_' + crypto.randomBytes(24).toString('hex');
}

function formatNGN(amount) {
  if (amount == null || isNaN(amount)) return '₦0.00';
  return '₦' + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNairaShort(amount) {
  if (amount == null || isNaN(amount)) return '₦0';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return '₦' + (amount / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return '₦' + (amount / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return '₦' + (amount / 1_000).toFixed(1) + 'K';
  return '₦' + Math.round(amount);
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
}

function monthRange(year, month /* 1-12 */) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCSV(rows, columns) {
  if (!rows || !rows.length) return columns.map(c => c.label).join(',') + '\n';
  const header = columns.map(c => `"${c.label}"`).join(',');
  const body = rows
    .map(r => columns.map(c => csvEscape(c.value(r))).join(','))
    .join('\n');
  return header + '\n' + body + '\n';
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  generateId,
  generateApiKey,
  formatNGN,
  formatNairaShort,
  startOfMonth,
  endOfMonth,
  monthRange,
  csvEscape,
  toCSV,
  asyncHandler,
  escapeHtml,
};
