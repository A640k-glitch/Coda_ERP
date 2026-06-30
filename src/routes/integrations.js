const express = require('express');
const router = express.Router();
const cac = require('../integrations/cac');
const cbn = require('../integrations/cbn');
const firs = require('../integrations/firs');
const notifications = require('../integrations/notifications');
const mono = require('../integrations/mono');

// Middleware to check API key
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing x-api-key header' });
  }
  const { db } = require('../db');
const TenantDB = require('../tenant-db');
  const user = (new TenantDB(req.user.business_id || req.businessId)).prepare('SELECT id, business_id FROM users WHERE api_key = ?').get(apiKey);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API key' });
  }
  req.userId = user.id;
  req.businessId = user.business_id;
  next();
};

// 1. Verify CAC Registration
router.post('/cac/verify', requireApiKey, async (req, res) => {
  try {
    const { rcNumber, companyName } = req.body;
    if (!rcNumber) return res.status(400).json({ success: false, error: 'rcNumber is required' });
    
    const result = await cac.verifyBusiness(rcNumber, companyName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Sync Bank Statement (Mono)
router.post('/bank/sync', requireApiKey, async (req, res) => {
  try {
    const { accountId, period } = req.body;
    if (!accountId) return res.status(400).json({ success: false, error: 'accountId is required' });
    
    const result = await mono.syncBankStatement(accountId, period || 'last30days');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Tax API (FIRS Simulation)
router.post('/tax/file', requireApiKey, async (req, res) => {
  try {
    const { tin, period, amount } = req.body;
    if (!tin || !amount) return res.status(400).json({ success: false, error: 'tin and amount are required' });
    
    const result = await firs.fileVAT(tin, period, amount);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. FX Rates (CBN)
router.get('/fx/rates', requireApiKey, async (req, res) => {
  try {
    const result = await cbn.getLatestRates();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Send Termii SMS
router.post('/notifications/sms', requireApiKey, async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ success: false, error: 'to and message are required' });
    
    const result = await notifications.sendSMS(to, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
