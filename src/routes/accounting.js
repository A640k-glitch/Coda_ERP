// Accounting routes
const express = require('express');
const router = express.Router();
const accounting = require('../modules/accounting');
const { db } = require('../db');
const { requireAuth, requireBusiness, logAudit } = require('../auth');

router.use(requireAuth, requireBusiness);

router.get('/accounts', (req, res) => {
  res.json({ accounts: accounting.listAccounts(req.businessId) });
});

router.get('/accounts-with-balances', (req, res) => {
  const accounts = accounting.listAccounts(req.businessId);
  const result = accounts.map(a => {
    const { debit, credit } = accounting.getAccountBalance(req.businessId, a.id);
    let balance = debit - credit;
    if (a.type === 'liability' || a.type === 'equity' || a.type === 'revenue') {
      balance = credit - debit;
    }
    return { ...a, debit, credit, balance };
  });
  res.json({ accounts: result });
});

router.get('/transactions', (req, res) => {
  const { limit, offset, from, to } = req.query;
  const txs = accounting.listTransactions(req.businessId, {
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0,
    from: from || undefined,
    to: to || undefined,
  });
  res.json({ transactions: txs });
});

router.get('/transactions/:id', (req, res) => {
  const tx = accounting.getTransaction(req.businessId, req.params.id);
  if (!tx) return res.status(404).json({ error: 'Not found' });
  res.json({ transaction: tx });
});

router.post('/transactions', (req, res) => {
  try {
    const tx = accounting.recordTransaction(req.businessId, req.user.id, req.body);
    logAudit(req.businessId, req.user.id, 'transaction.create', { description: tx.description, id: tx.id });
    res.status(201).json({ transaction: tx });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/transactions/:id', (req, res) => {
  try {
    const tx = accounting.updateTransaction(req.businessId, req.params.id, req.body);
    logAudit(req.businessId, req.user.id, 'transaction.update', { id: req.params.id });
    res.json({ transaction: tx });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/transactions/:id', (req, res) => {
  try {
    accounting.deleteTransaction(req.businessId, req.params.id);
    logAudit(req.businessId, req.user.id, 'transaction.delete', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/accounts', (req, res) => {
  try {
    const acct = accounting.createAccount(req.businessId, req.body);
    logAudit(req.businessId, req.user.id, 'account.create', { code: acct.code, name: acct.name });
    res.status(201).json({ account: acct });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/accounts/:id', (req, res) => {
  try {
    const acct = accounting.updateAccount(req.businessId, req.params.id, req.body);
    logAudit(req.businessId, req.user.id, 'account.update', { id: req.params.id });
    res.json({ account: acct });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/accounts/:id', (req, res) => {
  try {
    accounting.deleteAccount(req.businessId, req.params.id);
    logAudit(req.businessId, req.user.id, 'account.delete', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/transactions/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM journal_entries WHERE id IN (${placeholders}) AND business_id = ?`).run(...ids, req.businessId);
  logAudit(req.businessId, req.user.id, 'transaction.batch_delete', { count: result.changes });
  res.json({ deleted: result.changes });
});

router.post('/accounts/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
  // Check none of the accounts have journal lines
  const idPlaceholders = ids.map(() => '?').join(',');
  const blocked = db.prepare(`SELECT COUNT(*) AS cnt FROM journal_lines WHERE account_id IN (${idPlaceholders})`).get(...ids);
  if (blocked.cnt > 0) return res.status(400).json({ error: 'One or more accounts have journal lines. Remove transactions first.' });
  const result = db.prepare(`DELETE FROM accounts WHERE id IN (${idPlaceholders}) AND business_id = ?`).run(...ids, req.businessId);
  logAudit(req.businessId, req.user.id, 'account.batch_delete', { count: result.changes });
  res.json({ deleted: result.changes });
});

router.get('/reports/balance-sheet', (req, res) => {
  res.json({ report: accounting.balanceSheet(req.businessId, req.query.asOf) });
});

router.get('/reports/income-statement', (req, res) => {
  res.json({ report: accounting.incomeStatement(req.businessId, { from: req.query.from, to: req.query.to }) });
});

router.get('/reports/cash-flow', (req, res) => {
  res.json({ report: accounting.cashFlow(req.businessId, { from: req.query.from, to: req.query.to }) });
});

module.exports = router;
