const express = require('express');
const router = express.Router();
const reconciliation = require('../modules/reconciliation');
const { requireAuth, requireBusiness } = require('../auth');

router.use(requireAuth, requireBusiness);

router.get('/pending', (req, res) => {
  try {
    const transactions = reconciliation.getUnreconciled(req.businessId);
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', (req, res) => {
  try {
    const summary = reconciliation.getSummary(req.businessId);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/match', (req, res) => {
  try {
    const { bankTxId, journalEntryId, newTransaction } = req.body;
    if (!bankTxId) {
      return res.status(400).json({ error: 'bankTxId is required' });
    }
    const result = reconciliation.matchTransaction(req.businessId, req.user.id, bankTxId, {
      journalEntryId,
      newTransaction
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/unreconcile', (req, res) => {
  try {
    const { bankTxId } = req.body;
    if (!bankTxId) {
      return res.status(400).json({ error: 'bankTxId is required' });
    }
    const result = reconciliation.unreconcile(req.businessId, bankTxId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }
    const result = await reconciliation.syncTransactions(req.businessId, accountId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

