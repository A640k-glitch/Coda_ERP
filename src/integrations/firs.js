const axios = require('axios');

/**
 * FIRS / TaxPromax Integration
 * API Key Documentation: Provided via FIRS Integration Portal to licensed agents.
 */
class FIRSIntegration {
  constructor() {
    const apiKey = process.env.FIRS_API_KEY;
    if (process.env.NODE_ENV === 'production' && !apiKey) {
      throw new Error('Missing FIRS_API_KEY in production');
    }

    this.client = axios.create({
      baseURL: 'https://api.taxpromax.firs.gov.ng/v1',
      headers: {
        'x-api-key': apiKey || 'mock_firs_key',
        'Content-Type': 'application/json'
      }
    });
  }

  async fileVAT(taxPayerTIN, period, amount) {
    if (process.env.NODE_ENV !== 'production' && !process.env.FIRS_API_KEY) {
      return {
        success: true,
        data: {
          assessment_id: `VAT-${Date.now()}`,
          status: 'FILED',
          amount_due: amount,
          payment_reference: `PRR-${Math.floor(Math.random() * 1000000)}`
        }
      };
    }

    const response = await this.client.post('/returns/vat', {
      tin: taxPayerTIN,
      period,
      total_amount: amount
    });
    return response.data;
  }
}

module.exports = new FIRSIntegration();
