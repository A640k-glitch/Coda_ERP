const axios = require('axios');

/**
 * CAC Verification API Integration
 * Typical providers: QoreID, VerifyMe, Sandbox
 * Documentation: https://docs.qoreid.com/docs/corporate-identity
 */
class CACIntegration {
  constructor() {
    const apiKey = process.env.QOREID_SECRET_KEY;
    if (process.env.NODE_ENV === 'production' && !apiKey) {
      console.warn('Missing QOREID_SECRET_KEY in production');
    }

    this.client = axios.create({
      baseURL: 'https://api.qoreid.com/v1/ng',
      headers: {
        Authorization: `Bearer ${apiKey || 'mock_key'}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async verifyBusiness(rcNumber, companyName) {
    if (process.env.NODE_ENV !== 'production' && !process.env.QOREID_SECRET_KEY) {
      // Simulate validation
      const isValidFormat = /^(RC|BN)\d{6,8}$/i.test(rcNumber);
      return {
        success: isValidFormat,
        data: isValidFormat ? {
          rc_number: rcNumber.toUpperCase(),
          company_name: companyName || 'Simulated Company Ltd',
          status: 'ACTIVE',
          registration_date: '2015-06-12',
          address: '123 Fake Street, Lagos, Nigeria'
        } : null,
        message: isValidFormat ? 'Verification successful' : 'Invalid CAC Number format'
      };
    }

    const response = await this.client.post('/identities/company', {
      rcNumber,
      companyName
    });
    return response.data;
  }
}

module.exports = new CACIntegration();
