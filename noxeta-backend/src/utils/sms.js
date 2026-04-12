const twilio = require('twilio');

// Lazy init — avoids crash on startup when Twilio keys are not yet in .env
let _client = null;
const getClient = () => {
  if (!_client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio keys not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM to your .env file');
    }
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
};

/**
 * Format Indian mobile numbers to E.164 (+91XXXXXXXXXX)
 * Accepts: 9876543210  /  +919876543210  /  919876543210
 */
const formatPhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith('091')) return `+91${digits.slice(3)}`;
  return `+${digits}`; // already has country code
};

// ── SMS Templates ─────────────────────────────────────────────────────────────

const SMS_TEMPLATES = {
  otp: ({ otpCode }) =>
    `Your Noxeta verification code is: ${otpCode}. Valid for 5 minutes. Do not share it with anyone.`,

  welcome: ({ name }) =>
    `Hi ${name}! Welcome to Noxeta 🖤 Your account is now active. Shop the latest drops at ${process.env.FRONTEND_URL}`,

  orderConfirm: ({ name, orderId, total }) =>
    `Hi ${name}! Your Noxeta order #${orderId} is confirmed ✦ Total: ₹${total.toLocaleString()}. We'll notify you once it ships. Track at ${process.env.FRONTEND_URL}`,

  resetPassword: ({ resetUrl }) =>
    `Noxeta Password Reset: Click the link to reset your password — ${resetUrl} (expires in 1 hour). Ignore if you didn't request this.`,
};

/**
 * Send an SMS message.
 * @param {Object} opts
 * @param {string}  opts.to        - Recipient phone number
 * @param {string}  opts.template  - Key in SMS_TEMPLATES
 * @param {Object}  opts.data      - Template data object
 * @param {string} [opts.body]     - Raw body override (skips template)
 */
const sendSms = async ({ to, template, data, body }) => {
  const formattedTo = formatPhone(to);
  if (!formattedTo) {
    console.warn('⚠️  SMS skipped: no valid phone number provided');
    return;
  }

  const messageBody = body || (SMS_TEMPLATES[template] ? SMS_TEMPLATES[template](data) : null);
  if (!messageBody) throw new Error(`Unknown SMS template: ${template}`);

  await getClient().messages.create({
    from: process.env.TWILIO_FROM,   // Your Twilio number e.g. +1XXXXXXXXXX
    to:   formattedTo,
    body: messageBody,
  });

  console.log(`📱 SMS sent: [${template}] → ${formattedTo}`);
};

module.exports = { sendSms };
