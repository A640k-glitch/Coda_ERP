const axios = require('axios');

/**
 * PenCom / PFA Integration (Pensions)
 * API Documentation: Assumes standardized PFA REST APIs.
 */
class PencomIntegration {
  constructor() {
    const apiKey = process.env.PFA_API_KEY;
    if (process.env.NODE_ENV === 'production' && !apiKey) {
      console.warn('Missing PFA_API_KEY in production');
    }

    this.client = axios.create({
      baseURL: 'https://api.pfa-gateway.com.ng/v1',
      headers: {
        'Authorization': `Bearer ${apiKey || 'mock_pfa_key'}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async remitPension(employerId, schedule) {
    if (process.env.NODE_ENV !== 'production' && !process.env.PFA_API_KEY) {
      return {
        success: true,
        data: {
          batchId: `PEN-${Date.now()}`,
          status: 'PROCESSED',
          totalAmount: schedule.reduce((acc, emp) => acc + emp.amount, 0),
          employeesProcessed: schedule.length
        }
      };
    }

    const response = await this.client.post('/remittances', {
      employer_id: employerId,
      schedule
    });
    return response.data;
  }
}

module.exports = new PencomIntegration();
