const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─────────────────────────────────────────────
//  Email Templates
// ─────────────────────────────────────────────
const baseLayout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Noxeta</title>
<style>
  body { margin: 0; padding: 0; background: #080808; font-family: Georgia, serif; }
  .wrap { max-width: 600px; margin: 0 auto; background: #0f0f0f; }
  .header { background: #080808; padding: 32px 40px; border-bottom: 1px solid #1a1a1a; }
  .logo { font-family: Arial Black, sans-serif; font-size: 28px; letter-spacing: 6px; color: #f0ece4; }
  .logo span { color: #c9a84c; }
  .body { padding: 48px 40px; }
  .title { font-size: 32px; color: #f0ece4; margin-bottom: 16px; letter-spacing: 2px; }
  .text { font-size: 16px; color: rgba(240,236,228,0.65); line-height: 1.8; margin-bottom: 16px; }
  .divider { border: none; border-top: 1px solid #1a1a1a; margin: 32px 0; }
  .btn { display: inline-block; background: #c9a84c; color: #080808; padding: 14px 32px;
         font-family: monospace; font-size: 12px; letter-spacing: 2px; text-decoration: none;
         text-transform: uppercase; }
  .order-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  .order-table th { background: #161616; color: rgba(240,236,228,0.45); font-size: 10px;
                    letter-spacing: 2px; text-transform: uppercase; padding: 10px 12px; text-align: left; }
  .order-table td { padding: 12px; border-bottom: 1px solid #1a1a1a; color: #f0ece4; font-size: 14px; }
  .total-row td { color: #c9a84c; font-size: 16px; font-weight: bold; border-top: 1px solid #c9a84c; }
  .footer { background: #080808; padding: 24px 40px; text-align: center; }
  .footer-text { font-size: 11px; color: rgba(240,236,228,0.25); letter-spacing: 1px; font-family: monospace; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo">NOX<span>E</span>TA</div>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p class="footer-text">© 2026 NOXETA · WEAR THE DARK · noxeta.in</p>
    <p class="footer-text" style="margin-top:8px">Mumbai, India · support@noxeta.in</p>
  </div>
</div>
</body>
</html>`;

const TEMPLATES = {
  welcome: ({ name }) => baseLayout(`
    <div class="title">WELCOME, ${name.toUpperCase()} 🖤</div>
    <p class="text">You've joined the dark side. Welcome to Noxeta — premium streetwear built for the bold.</p>
    <p class="text">Your account is now active. Browse the latest drops, save your favourites, and track all your orders in one place.</p>
    <hr class="divider">
    <a href="${process.env.FRONTEND_URL}" class="btn">Shop the Collection →</a>
  `),

  orderConfirm: ({ name, orderId, items, total, shipping }) => baseLayout(`
    <div class="title">ORDER CONFIRMED ✦</div>
    <p class="text">Thank you ${name}. Your order <strong style="color:#c9a84c">#${orderId}</strong> has been placed and will be processed soon.</p>
    <table class="order-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Size</th>
          <th>Qty</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(i => `
          <tr>
            <td>${i.name}</td>
            <td style="font-family:monospace;font-size:12px">${i.size}</td>
            <td>${i.quantity}</td>
            <td style="color:#c9a84c;font-family:monospace">₹${(i.price * i.quantity).toLocaleString()}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="3">TOTAL</td>
          <td>₹${total.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
    <hr class="divider">
    <p class="text" style="font-size:13px;font-family:monospace;letter-spacing:1px">
      DELIVERING TO:<br>
      ${shipping.name} · ${shipping.phone}<br>
      ${shipping.line1}${shipping.line2 ? ', ' + shipping.line2 : ''}<br>
      ${shipping.city}, ${shipping.state} — ${shipping.pincode}
    </p>
  `),

  resetPassword: ({ name, resetUrl }) => baseLayout(`
    <div class="title">RESET PASSWORD</div>
    <p class="text">Hey ${name}, we received a request to reset your Noxeta password.</p>
    <p class="text">Click the button below. This link expires in 1 hour.</p>
    <a href="${resetUrl}" class="btn">Reset My Password →</a>
    <hr class="divider">
    <p class="text" style="font-size:13px">If you didn't request this, ignore this email. Your password is safe.</p>
  `),
};

// ─────────────────────────────────────────────
//  Send Email
// ─────────────────────────────────────────────
const sendEmail = async ({ to, subject, template, data, html }) => {
  const htmlContent = html || (TEMPLATES[template] ? TEMPLATES[template](data) : null);
  if (!htmlContent) throw new Error(`Unknown email template: ${template}`);

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject,
    html:    htmlContent,
  });

  console.log(`📧 Email sent: ${subject} → ${to}`);
};

module.exports = { sendEmail };