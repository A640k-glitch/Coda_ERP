const axios = require('axios');

/**
 * Mono API Integration (Open Banking)
 * API Key Documentation: https://mono.co/docs
 */
class MonoIntegration {
  constructor() {
    const apiKey = process.env.MONO_SECRET_KEY;
    if (process.env.NODE_ENV === 'production' && !apiKey) {
      console.warn('Missing MONO_SECRET_KEY in production');
    }

    this.client = axios.create({
      baseURL: 'https://api.withmono.com',
      headers: {
        'mono-sec-key': apiKey || 'test_mono_key',
        'Content-Type': 'application/json'
      }
    });
  }

  async syncBankStatement(accountId, period) {
    if (process.env.NODE_ENV !== 'production' && !process.env.MONO_SECRET_KEY) {
      // Return simulated success
      return {
        success: true,
        data: {
          accountId,
          period,
          transactions: [
            { id: 'txn_1', amount: 500000, type: 'credit', narration: 'Invoice payment', date: new Date().toISOString() },
            { id: 'txn_2', amount: 15000, type: 'debit', narration: 'Office supplies', date: new Date().toISOString() }
          ],
          balance: 1500000,
          currency: 'NGN'
        }
      };
    }
    
    // Real API call
    const response = await this.client.get(`/accounts/${accountId}/statement?period=${period}`);
    return response.data;
  }
}

module.exports = new MonoIntegration();
