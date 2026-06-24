const axios = require('axios');

/**
 * CBN FX Rates Integration via OpenExchangeRates (or direct CBN API)
 * Documentation: https://openexchangerates.org
 */
class CBNIntegration {
  constructor() {
    const apiKey = process.env.OXR_APP_ID;
    if (process.env.NODE_ENV === 'production' && !apiKey) {
      console.warn('Missing OXR_APP_ID in production');
    }

    this.client = axios.create({
      baseURL: 'https://openexchangerates.org/api',
      headers: {
        'Authorization': `Token ${apiKey || 'mock_oxr_key'}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getLatestRates() {
    if (process.env.NODE_ENV !== 'production' && !process.env.OXR_APP_ID) {
      return {
        success: true,
        rates: {
          USD: 1,
          NGN: 1550.50, // Mock current rate
          GBP: 0.78,
          EUR: 0.92
        },
        base: 'USD',
        timestamp: Date.now()
      };
    }

    const response = await this.client.get('/latest.json');
    return {
      success: true,
      rates: response.data.rates,
      base: response.data.base,
      timestamp: response.data.timestamp
    };
  }
}

module.exports = new CBNIntegration();
