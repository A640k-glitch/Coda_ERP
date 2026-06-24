const express = require('express');
const router = express.Router();
const config = require('../config');

// Public platform config — no auth required
router.get('/', (req, res) => {
  res.json({
    taxRates: {
      defaultRate: config.taxRates.wht.companies * 100,
      vat: config.taxRates.vat * 100,
      cit: config.taxRates.cit * 100
    },
    platformFees: {
      processingFee: 1.5
    },
    reserveTarget: 20,
    subscriptionTiers: Object.entries(config.subscriptionTiers).map(([key, tier]) => ({
      id: key,
      name: tier.name,
      price: tier.price,
      annualPrice: tier.annualPrice,
      features: tier.features
    }))
  });
});

module.exports = router;
