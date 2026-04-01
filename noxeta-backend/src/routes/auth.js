const express  = require('express');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const User     = require('../models/User');
const Otp      = require('../models/Otp');
const { protect } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// Helper: create & send token response
const sendToken = (user, statusCode, res) => {
  const token = user.generateToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: user.toSafeObject(),
  });
};

// ── POST /api/auth/send-otp ───────────────────
router.post('/send-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    // Delete any old OTPs for this email quickly
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Generate 6 digit code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.create({ email: email.toLowerCase(), otp: otpCode });

    // Send the email realistically
    await sendEmail({
      to: email,
      subject: 'Your Noxeta Verification Code',
      text: `Your confirmation code is: ${otpCode}. It expires in 5 minutes.`,
      html: `<h2>Verification Code</h2><p>Your Noxeta signup code is: <strong>${otpCode}</strong>. It expires in 5 minutes.</p>`,
    });

    res.json({ success: true, message: 'OTP Sent' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/verify-otp ─────────────────
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const record = await Otp.findOne({ email: email.toLowerCase(), otp });
    
    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Since they will `/register` next, we can clean up the OTP so it can't be reused
    await Otp.deleteOne({ _id: record._id });

    res.json({ success: true, message: 'OTP Verified' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/register ───────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({ name, email, password, phone });

    // Send welcome email (non-blocking)
    sendEmail({
      to: email,
      subject: 'Welcome to Noxeta 🖤',
      template: 'welcome',
      data: { name },
    }).catch(console.error);

    sendToken(user, 201, res);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ error: msg });
    }
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account deactivated. Contact support.' });
    }

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

// ── POST /api/auth/forgot-password ───────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    if (!user) {
      // Return success even if user not found (security)
      return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken        = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Noxeta — Password Reset',
      template: 'resetPassword',
      data: { name: user.name, resetUrl },
    });

    res.json({ success: true, message: 'Password reset email sent.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/reset-password/:token ─────
router.post('/reset-password/:token', async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpires: { $gt: Date.now() },
    }).select('+resetToken +resetTokenExpires');

    if (!user) {
      return res.status(400).json({ error: 'Token is invalid or has expired.' });
    }

    user.password           = req.body.password;
    user.resetToken         = undefined;
    user.resetTokenExpires  = undefined;
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/auth/change-password ────────────
router.put('/change-password', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const { currentPassword, newPassword } = req.body;

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
