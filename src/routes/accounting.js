// Accounting routes
const express = require('express');
const router = express.Router();
const accounting = require('../modules/accounting');
const { requireAuth, requireBusiness } = require('../auth');

router.use(requireAuth, requireBusiness);

router.get('/accounts', (req, res) => {
  res.json({ accounts: accounting.listAccounts(req.businessId) });
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
  const tx = accounting.recordTransaction(req.businessId, req.user.id, req.body);
  res.status(201).json({ transaction: tx });
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
