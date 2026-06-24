const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config');

// In-memory cache for macro data
let macroCache = { data: null, timestamp: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (macroCache.data && (now - macroCache.timestamp) < CACHE_TTL) {
      return res.json(macroCache.data);
    }

    const result = {
      inflation: null,
      interestRate: null,
      gdpGrowth: null,
      ngnUsd: null,
      sources: {},
      fetchedAt: new Date().toISOString()
    };

    // Fetch NGN/USD from er-api.com (free, no key)
    try {
      const fxRes = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 5000 });
      if (fxRes.data && fxRes.data.rates && fxRes.data.rates.NGN) {
        result.ngnUsd = fxRes.data.rates.NGN;
        result.sources.ngnUsd = 'open.er-api.com';
      }
    } catch (e) {
      console.warn('Macro: Failed to fetch NGN/USD rate', e.message);
    }

    // Fetch Nigerian macro indicators from World Bank API (free, no key)
    const worldBankIndicators = [
      { key: 'inflation', indicator: 'FP.CPI.TOTL.ZG', label: 'Inflation Rate' },
      { key: 'interestRate', indicator: 'FR.INR.LNDP', label: 'Base Interest Rate' },
      { key: 'gdpGrowth', indicator: 'NY.GDP.MKTP.KD.ZG', label: 'GDP Growth' }
    ];

    for (const item of worldBankIndicators) {
      try {
        const wbRes = await axios.get(
          `https://api.worldbank.org/v2/country/NGA/indicator/${item.indicator}?format=json&per_page=1&mrv=1`,
          { timeout: 5000 }
        );
        if (wbRes.data && Array.isArray(wbRes.data) && wbRes.data.length > 1) {
          const latest = wbRes.data[1]?.[0];
          if (latest && latest.value != null) {
            result[item.key] = {
              value: Number(latest.value.toFixed(1)),
              label: item.label,
              year: latest.date,
              unit: '%'
            };
            result.sources[item.key] = 'World Bank';
          }
        }
      } catch (e) {
        console.warn(`Macro: Failed to fetch ${item.label}`, e.message);
      }
    }

    macroCache = { data: result, timestamp: now };
    res.json(result);
  } catch (err) {
    console.error('Macro data endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch macro data' });
  }
});

module.exports = router;
