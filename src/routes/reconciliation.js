// Bank Reconciliation API routes
const express = require('express');
const router = express.Router();
const reconciliation = require('../modules/reconciliation');
const { requireAuth, requireBusiness } = require('../auth');

router.use(requireAuth, requireBusiness);

// 1. Simulate pulling transactions from a bank feed
router.post('/import', (req, res) => {
  try {
    const count = reconciliation.importMockFeed(req.businessId);
    res.json({ success: true, imported: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Fetch unreconciled transactions and suggested ledger matches
router.get('/pending', (req, res) => {
  try {
    const transactions = reconciliation.getUnreconciled(req.businessId);
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Confirm a match or create a new ledger entry from a bank line
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

module.exports = router;
