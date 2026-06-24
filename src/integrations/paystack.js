const axios = require('axios');

/**
 * Paystack API Integration (Payments)
 * API Key Documentation: https://paystack.com/docs/api/
 */
class PaystackIntegration {
  constructor() {
    const apiKey = process.env.PAYSTACK_SECRET_KEY;
    if (process.env.NODE_ENV === 'production' && !apiKey) {
      console.warn('Missing PAYSTACK_SECRET_KEY in production');
    }

    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${apiKey || 'sk_test_mock'}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async initializeTransaction(email, amount, reference) {
    if (process.env.NODE_ENV !== 'production' && !process.env.PAYSTACK_SECRET_KEY) {
      // Simulated response
      return {
        success: true,
        data: {
          authorization_url: `https://checkout.paystack.com/mock_${reference}`,
          access_code: `mock_${reference}`,
          reference
        }
      };
    }

    const response = await this.client.post('/transaction/initialize', {
      email,
      amount: amount * 100, // Kobo
      reference
    });
    return response.data;
  }
}

module.exports = new PaystackIntegration();
