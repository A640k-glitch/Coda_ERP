// Accounting module — real double-entry ledger, financial reports
const { db } = require('../db');
const { generateId } = require('../utils');

function accountByCode(businessId, code) {
  return db.prepare('SELECT * FROM accounts WHERE business_id = ? AND code = ?').get(businessId, code);
}

function listAccounts(businessId) {
  return db.prepare('SELECT * FROM accounts WHERE business_id = ? ORDER BY code').all(businessId);
}

function getAccountBalance(businessId, accountId, asOf = null, from = null) {
  const params = [accountId];
  let dateClause = '';
  if (from) {
    dateClause += 'AND je.date >= ? ';
    params.push(from);
  }
  if (asOf) {
    dateClause += 'AND je.date <= ?';
    params.push(asOf);
  }
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(jl.debit), 0)  AS dr,
         COALESCE(SUM(jl.credit), 0) AS cr
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       WHERE jl.account_id = ? AND je.business_id = ? ${dateClause}`
    )
    .get(accountId, businessId, ...params.slice(1));
  return { debit: row.dr, credit: row.cr };
}

// Generic account-type balances
function balancesByType(businessId, type, asOf = null, from = null) {
  const accounts = db
    .prepare('SELECT * FROM accounts WHERE business_id = ? AND type = ? ORDER BY code')
    .all(businessId, type);
  return accounts.map(a => {
    const { debit, credit } = getAccountBalance(businessId, a.id, asOf, from);
    return { ...a, debit, credit, balance: debit - credit };
  });
}

function recordTransaction(businessId, userId, { date, description, reference, lines }) {
  if (!lines || !Array.isArray(lines) || lines.length < 2) {
    throw new Error('A transaction needs at least two journal lines');
  }
  // Resolve accounts by code
  const resolved = lines.map(l => {
    if (!l.account) throw new Error('Each line needs an account code');
    const acct = accountByCode(businessId, l.account);
    if (!acct) throw new Error(`Unknown account: ${l.account}`);
    const debit = Number(l.debit || 0);
    const credit = Number(l.credit || 0);
    if (debit < 0 || credit < 0) throw new Error('Debit/credit must be non-negative');
    if (debit > 0 && credit > 0) throw new Error('A line cannot have both debit and credit');
    if (debit === 0 && credit === 0) throw new Error('A line must have a debit or credit');
    return { accountId: acct.id, accountCode: acct.code, accountName: acct.name, debit, credit };
  });
  const totalDr = resolved.reduce((s, l) => s + l.debit, 0);
  const totalCr = resolved.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDr - totalCr) > 0.005) {
    throw new Error(`Unbalanced entry: debit ${totalDr} ≠ credit ${totalCr}`);
  }

  const entryId = generateId('je');
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO journal_entries (id, business_id, date, description, reference, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(entryId, businessId, date || new Date().toISOString(), description || null, reference || null, userId || null);
    const lineStmt = db.prepare(
      'INSERT INTO journal_lines (entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)'
    );
    for (const l of resolved) {
      lineStmt.run(entryId, l.accountId, l.debit, l.credit);
    }
  });
  tx();

  return {
    id: entryId,
    date: date || new Date().toISOString(),
    description,
    reference,
    lines: resolved,
    totalDebit: totalDr,
    totalCredit: totalCr,
  };
}

function listTransactions(businessId, { limit = 50, offset = 0, from, to } = {}) {
  const where = ['je.business_id = ?'];
  const params = [businessId];
  if (from) { where.push('je.date >= ?'); params.push(from); }
  if (to)   { where.push('je.date <= ?'); params.push(to); }
  const rows = db
    .prepare(
      `SELECT je.* FROM journal_entries je
       WHERE ${where.join(' AND ')}
       ORDER BY je.date DESC, je.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const lineStmt = db
    .prepare(
      `SELECT jl.*, a.code AS account_code, a.name AS account_name
       FROM journal_lines jl
       JOIN accounts a ON a.id = jl.account_id
       WHERE jl.entry_id IN (${placeholders})
       ORDER BY jl.id`
    )
    .all(...ids);
  const byEntry = new Map();
  for (const l of lineStmt) {
    if (!byEntry.has(l.entry_id)) byEntry.set(l.entry_id, []);
    byEntry.get(l.entry_id).push(l);
  }
  return rows.map(r => ({ ...r, lines: byEntry.get(r.id) || [] }));
}

function getTransaction(businessId, id) {
  const entry = db
    .prepare('SELECT * FROM journal_entries WHERE id = ? AND business_id = ?')
    .get(id, businessId);
  if (!entry) return null;
  const lines = db
    .prepare(
      `SELECT jl.*, a.code AS account_code, a.name AS account_name
       FROM journal_lines jl
       JOIN accounts a ON a.id = jl.account_id
       WHERE jl.entry_id = ?`
    )
    .all(id);
  return { ...entry, lines };
}

function balanceSheet(businessId, asOf = null) {
  const asOfIso = asOf || new Date().toISOString();
  const assets = balancesByType(businessId, 'asset', asOfIso);
  const liabilities = balancesByType(businessId, 'liability', asOfIso);
  const equity = balancesByType(businessId, 'equity', asOfIso);
  const sumBalances = items => items.reduce((s, i) => s + i.balance, 0);
  // For assets, debit - credit; for liabilities & equity, credit - debit
  const totalAssets = sumBalances(assets);
  const totalLiabilities = -sumBalances(liabilities);
  const totalEquity = -sumBalances(equity);
  return {
    asOf: asOfIso,
    assets: {
      current: assets.filter(a => ['1000', '1100', '1200', '1300'].includes(a.code)).map(a => ({ code: a.code, name: a.name, balance: a.balance })),
      nonCurrent: assets.filter(a => !['1000', '1100', '1200', '1300'].includes(a.code)).map(a => ({ code: a.code, name: a.name, balance: a.balance })),
      total: totalAssets,
    },
    liabilities: {
      current: liabilities.filter(l => l.code !== '2400').map(l => ({ code: l.code, name: l.name, balance: -l.balance })),
      nonCurrent: liabilities.filter(l => l.code === '2400').map(l => ({ code: l.code, name: l.name, balance: -l.balance })),
      total: totalLiabilities,
    },
    equity: {
      items: equity.map(e => ({ code: e.code, name: e.name, balance: -e.balance })),
      total: totalEquity,
    },
    currency: 'NGN',
    standard: 'Nigerian GAAP / IFRS',
  };
}

function incomeStatement(businessId, { from, to } = {}) {
  const fromIso = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const toIso = to || new Date().toISOString();
  const revenue = balancesByType(businessId, 'revenue', toIso, fromIso);
  const expenses = balancesByType(businessId, 'expense', toIso, fromIso);
  // For revenue & expense, credit - debit (revenue up via credit; expense up via debit)
  const totalRevenue = -revenue.reduce((s, r) => s + r.balance, 0);
  const cogsItem = expenses.find(e => e.code === '5000');
  const otherExpenses = expenses.filter(e => e.code !== '5000');
  const totalCogs = cogsItem ? cogsItem.balance : 0;
  const totalOperatingExpenses = otherExpenses.reduce((s, e) => s + e.balance, 0);
  const grossProfit = totalRevenue - totalCogs;
  const netProfit = grossProfit - totalOperatingExpenses;
  return {
    period: { from: fromIso, to: toIso },
    revenue: totalRevenue,
    costOfGoodsSold: totalCogs,
    grossProfit,
    operatingExpenses: totalOperatingExpenses,
    netProfit,
    breakdown: {
      revenue: revenue.map(r => ({ code: r.code, name: r.name, amount: -r.balance })),
      expenses: expenses.map(e => ({ code: e.code, name: e.name, amount: e.balance })),
    },
    currency: 'NGN',
  };
}

function cashFlow(businessId, { from, to } = {}) {
  const fromIso = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const toIso = to || new Date().toISOString();
  // Simplified: cash flow = sum of all lines touching cash + bank accounts
  const cashAccounts = db
    .prepare("SELECT id FROM accounts WHERE business_id = ? AND code IN ('1000','1100')")
    .all(businessId)
    .map(a => a.id);
  if (!cashAccounts.length) {
    return { period: { from: fromIso, to: toIso }, operating: 0, investing: 0, financing: 0, netCashFlow: 0 };
  }
  const placeholders = cashAccounts.map(() => '?').join(',');
  const op = db
    .prepare(
      `SELECT COALESCE(SUM(jl.debit - jl.credit), 0) AS total
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       WHERE jl.account_id IN (${placeholders}) AND je.business_id = ?
         AND je.date >= ? AND je.date <= ?
         AND jl.account_id IN (
           SELECT id FROM accounts WHERE business_id = ? AND type IN ('asset','liability','equity','revenue','expense')
         )`
    )
    .get(...cashAccounts, businessId, fromIso, toIso, businessId);
  // Simplified: lump everything as "operating" — this is MVP
  return {
    period: { from: fromIso, to: toIso },
    operating: op.total,
    investing: 0,
    financing: 0,
    netCashFlow: op.total,
    currency: 'NGN',
  };
}

function updateTransaction(businessId, id, { date, description, reference }) {
  const existing = db.prepare('SELECT * FROM journal_entries WHERE id = ? AND business_id = ?').get(id, businessId);
  if (!existing) throw new Error('Transaction not found');
  db.prepare(
    'UPDATE journal_entries SET date = ?, description = ?, reference = ? WHERE id = ? AND business_id = ?'
  ).run(
    date || existing.date,
    description !== undefined ? description : existing.description,
    reference !== undefined ? reference : existing.reference,
    id, businessId
  );
  return { id, date: date || existing.date, description: description !== undefined ? description : existing.description };
}

function deleteTransaction(businessId, id) {
  const existing = db.prepare('SELECT * FROM journal_entries WHERE id = ? AND business_id = ?').get(id, businessId);
  if (!existing) throw new Error('Transaction not found');
  db.prepare('DELETE FROM journal_entries WHERE id = ? AND business_id = ?').run(id, businessId);
  // journal_lines are cascade-deleted
  return { success: true };
}

function createAccount(businessId, { code, name, type }) {
  if (!code || !name || !type) throw new Error('code, name, and type are required');
  const existing = db.prepare('SELECT id FROM accounts WHERE business_id = ? AND code = ?').get(businessId, code);
  if (existing) throw new Error('Account code already exists');
  const allowedTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
  if (!allowedTypes.includes(type)) throw new Error('Invalid account type');
  const info = db.prepare(
    'INSERT INTO accounts (business_id, code, name, type) VALUES (?, ?, ?, ?)'
  ).run(businessId, code, name, type);
  return { id: info.lastInsertRowid, code, name, type };
}

function updateAccount(businessId, id, { code, name, type }) {
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND business_id = ?').get(id, businessId);
  if (!existing) throw new Error('Account not found');
  if (type) {
    const allowedTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    if (!allowedTypes.includes(type)) throw new Error('Invalid account type');
  }
  db.prepare(
    'UPDATE accounts SET code = ?, name = ?, type = ? WHERE id = ? AND business_id = ?'
  ).run(
    code || existing.code,
    name || existing.name,
    type || existing.type,
    id, businessId
  );
  return { id: Number(id), code: code || existing.code, name: name || existing.name, type: type || existing.type };
}

function deleteAccount(businessId, id) {
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND business_id = ?').get(id, businessId);
  if (!existing) throw new Error('Account not found');
  const lineCount = db.prepare(
    'SELECT COUNT(*) AS cnt FROM journal_lines WHERE account_id = ?'
  ).get(id);
  if (lineCount.cnt > 0) throw new Error('Cannot delete account with journal lines. Remove or re-assign transactions first.');
  db.prepare('DELETE FROM accounts WHERE id = ? AND business_id = ?').run(id, businessId);
  return { success: true };
}

module.exports = {
  accountByCode,
  listAccounts,
  getAccountBalance,
  recordTransaction,
  updateTransaction,
  deleteTransaction,
  listTransactions,
  getTransaction,
  createAccount,
  updateAccount,
  deleteAccount,
  balanceSheet,
  incomeStatement,
  cashFlow,
};
