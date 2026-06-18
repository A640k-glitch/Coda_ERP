const nodemailer = require('nodemailer');

let transporter = null;

async function initTransporter() {
  if (transporter) return transporter;

  // If real SMTP credentials are provided, use them
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[EMAIL] Using production SMTP transport.');
  } else {
    // Fall back to Ethereal for local testing
    console.log('[EMAIL] No SMTP credentials found. Creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('[EMAIL] Ethereal test account created: ' + testAccount.user);
  }

  return transporter;
}

/**
 * Sends a password reset email
 * @param {string} toEmail 
 * @param {string} resetUrl 
 */
async function sendPasswordResetEmail(toEmail, resetUrl) {
  try {
    const mailer = await initTransporter();
    const fromAddress = process.env.SMTP_FROM || '"Coda System" <noreply@coda.ng>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #10b981;">Password Reset Request</h2>
        <p>You recently requested to reset your password for your Coda account.</p>
        <p>Please click the button below to set a new password. This link will expire in 1 hour.</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 13px; color: #666; word-break: break-all;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `;

    const info = await mailer.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: 'Reset your Coda password',
      html: htmlContent,
    });

    console.log(`[EMAIL] Password reset sent to ${toEmail}. Message ID: ${info.messageId}`);
    
    // If using ethereal, log the preview URL
    if (info.messageId && !process.env.SMTP_HOST) {
      console.log(`[EMAIL PREVIEW] View email here: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail
};
