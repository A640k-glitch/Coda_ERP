// Tax routes
const express = require('express');
const router = express.Router();
const tax = require('../modules/tax');
const { requireAuth, requireBusiness } = require('../auth');
const { requireTierModule } = require('../entitlements');
const config = require('../config');

router.use(requireAuth, requireBusiness, requireTierModule('tax'));

router.post('/calculate', (req, res) => {
  const { amount, taxType, payerType, annual } = req.body || {};
  if (!amount || !taxType) return res.status(400).json({ error: 'amount and taxType required' });
  let taxAmount;
  switch (taxType) {
    case 'vat':  taxAmount = tax.calculateVAT(amount); break;
    case 'wht':  taxAmount = tax.calculateWHT(amount, payerType || 'companies'); break;
    case 'paye': taxAmount = annual ? tax.calculatePAYE(amount) : tax.calculatePAYE(amount * 12); break;
    default: return res.status(400).json({ error: 'Invalid taxType (vat, wht, paye)' });
  }
  res.json({
    amount: Number(amount),
    taxType,
    payerType: payerType || null,
    taxAmount,
    total: taxType === 'paye' ? Number(amount) - taxAmount : Number(amount) + taxAmount,
    currency: 'NGN',
  });
});

router.get('/report', (req, res) => {
  const report = tax.generateTaxReport(req.businessId, { from: req.query.from, to: req.query.to });
  res.json({ report });
});

router.get('/brackets', (req, res) => {
  res.json({ brackets: config.taxRates.payeBrackets, vat: config.taxRates.vat, wht: config.taxRates.wht, cit: config.taxRates.cit });
});

module.exports = router;
