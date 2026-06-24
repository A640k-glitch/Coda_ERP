const axios = require('axios');

/**
 * Termii & SendGrid Integration
 * Documentation: https://developer.termii.com, https://sendgrid.com/docs/API_Reference/
 */
class NotificationsIntegration {
  constructor() {
    this.termiiClient = axios.create({
      baseURL: 'https://api.ng.termii.com/api',
      headers: { 'Content-Type': 'application/json' }
    });

    const apiKey = process.env.SENDGRID_API_KEY;
    if (process.env.NODE_ENV === 'production' && !apiKey) {
      throw new Error('Missing SENDGRID_API_KEY in production');
    }

    this.sendgridClient = axios.create({
      baseURL: 'https://api.sendgrid.com/v3',
      headers: {
        'Authorization': `Bearer ${apiKey || 'mock_sg_key'}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async sendSMS(to, message) {
    if (process.env.NODE_ENV !== 'production' && !process.env.TERMII_API_KEY) {
      return {
        success: true,
        message_id: `TERMII-${Date.now()}`,
        status: 'Sent'
      };
    }

    const response = await this.termiiClient.post('/sms/send', {
      to,
      from: 'Coda',
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: process.env.TERMII_API_KEY
    });
    return response.data;
  }

  async sendEmail(to, subject, htmlContent) {
    if (process.env.NODE_ENV !== 'production' && !process.env.SENDGRID_API_KEY) {
      return {
        success: true,
        status: 'Accepted'
      };
    }

    const response = await this.sendgridClient.post('/mail/send', {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'noreply@coda.ng' },
      subject,
      content: [{ type: 'text/html', value: htmlContent }]
    });
    return { success: true, status: response.status === 202 ? 'Accepted' : 'Failed' };
  }
}

module.exports = new NotificationsIntegration();
