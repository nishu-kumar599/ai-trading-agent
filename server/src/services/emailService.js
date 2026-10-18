/**
 * Institutional Email Dispatch Service
 * Handles transactional emails (password reset, security notifications) via Nodemailer.
 * Supports SMTP (AWS SES, SendGrid SMTP, Postmark, Resend, Gmail)
 * Keeps sensitive tokens strictly out of logs and client responses.
 */

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

function getTransporter() {
  if (!nodemailer) return null;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
}

/**
 * Send password reset verification code
 * @param {string} recipientEmail 
 * @param {string} verificationCode 
 * @returns {Promise<{success: boolean, delivered: boolean, error?: string}>}
 */
async function sendPasswordResetEmail(recipientEmail, verificationCode) {
  const cleanEmail = (recipientEmail || '').trim().toLowerCase();
  const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'AlphaTrade AI Security <no-reply@alphatrade.ai>';
  const transporter = getTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 [EmailService] SMTP credentials not configured in production. Password reset email cannot be delivered.');
      return {
        success: false,
        delivered: false,
        error: 'Email delivery service is currently not configured by server administrators.'
      };
    }

    // In local development / test environment:
    console.log(`ℹ️ [EmailService] Local simulation: Password reset dispatched to ${cleanEmail} (SMTP not configured).`);
    return {
      success: true,
      delivered: false,
      simulated: true
    };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your AlphaTrade AI Password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f3f4f6; margin: 0; padding: 30px; }
        .card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .brand { font-size: 20px; font-weight: 700; color: #3b82f6; letter-spacing: -0.5px; margin-bottom: 20px; }
        .code-box { background: #1f2937; border: 1px dashed #3b82f6; border-radius: 8px; font-size: 32px; font-weight: 800; letter-spacing: 6px; text-align: center; padding: 18px; margin: 24px 0; color: #60a5fa; font-family: monospace; }
        .footer { font-size: 12px; color: #6b7280; margin-top: 28px; line-height: 1.5; border-top: 1px solid #1f2937; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">⚡ AlphaTrade AI Security</div>
        <h2>Password Reset Verification Code</h2>
        <p>You recently requested to reset your password for your AlphaTrade AI account. Use the 6-digit verification code below to complete your reset request:</p>
        <div class="code-box">${verificationCode}</div>
        <p>This verification code is valid for <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email; your account remains secure.</p>
        <div class="footer">
          This is an automated security dispatch from AlphaTrade AI. Please do not reply to this email.<br>
          For security, never share your verification code with anyone.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
AlphaTrade AI - Password Reset Code
====================================
Your 6-digit verification code is: ${verificationCode}

This code expires in 15 minutes.
If you did not request this reset, please ignore this email.
`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: cleanEmail,
      subject: 'Your AlphaTrade AI Password Reset Code',
      text: textContent,
      html: htmlContent
    });

    console.log(`📧 [EmailService] Password reset verification email successfully dispatched to ${cleanEmail}. MessageId: ${info.messageId}`);
    return {
      success: true,
      delivered: true,
      messageId: info.messageId
    };
  } catch (err) {
    console.error(`🚨 [EmailService] Failed to deliver reset email to ${cleanEmail}:`, err.message);
    return {
      success: false,
      delivered: false,
      error: 'Failed to deliver verification email. Please try again later or contact support.'
    };
  }
}

module.exports = {
  sendPasswordResetEmail,
  isEmailConfigured: () => Boolean(getTransporter())
};
