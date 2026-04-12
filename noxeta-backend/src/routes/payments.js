const express  = require('express');
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const { protect } = require('../middleware/auth');
const Order    = require('../models/Order');
const User     = require('../models/User');
const { sendEmail } = require('../utils/email');
const { sendSms }   = require('../utils/sms');

const router = express.Router();

// Lazy init — avoids crash on startup when RAZORPAY keys are not yet in .env
let _razorpay = null;
const getRazorpay = () => {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file');
    }
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
};

// ── POST /api/payments/create-order ──────────
// Creates a Razorpay order → frontend shows payment modal
router.post('/create-order', protect, async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({ orderId, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.payment.method !== 'razorpay') {
      return res.status(400).json({ error: 'This order does not use Razorpay' });
    }

    // Create Razorpay order (amount in paise)
    const rzpOrder = await getRazorpay().orders.create({
      amount:   Math.round(order.total * 100),
      currency: 'INR',
      receipt:  order.orderId,
      notes: {
        noxetaOrderId: order.orderId,
        userId:        req.user._id.toString(),
      },
    });

    // Store Razorpay order ID
    order.payment.razorpayOrderId = rzpOrder.id;
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount:          rzpOrder.amount,
      currency:        rzpOrder.currency,
      keyId:           process.env.RAZORPAY_KEY_ID,
      prefill: {
        name:  req.user.name,
        email: req.user.email,
        contact: req.user.phone || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payments/verify ─────────────────
// Verify Razorpay signature after payment
router.post('/verify', protect, async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Update order
    const order = await Order.findOne({ orderId, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.payment.status            = 'paid';
    order.payment.razorpayPaymentId = razorpay_payment_id;
    order.payment.razorpaySignature = razorpay_signature;
    order.payment.paidAt            = new Date();
    order.status                    = 'confirmed';
    await order.save();

    // Send confirmation email + SMS only after successful payment
    try {
      const user = await User.findById(order.user);
      if (user) {
        const emailData = {
          name:     user.name,
          orderId:  order.orderId,
          items:    order.items,
          total:    order.total,
          shipping: order.shipping,
        };

        await sendEmail({
          to: user.email,
          subject: `Noxeta — Order Confirmed #${order.orderId}`,
          template: 'orderConfirm',
          data: emailData,
        });

        // Send order confirmation SMS if user has a phone number
        const smsPhone = user.phone || order.shipping?.phone;
        if (smsPhone) {
          sendSms({
            to:       smsPhone,
            template: 'orderConfirm',
            data: { name: user.name, orderId: order.orderId, total: order.total },
          }).catch(console.error);
        }

        await Order.findByIdAndUpdate(order._id, { emailSentAt: new Date() });
      }
    } catch (emailErr) {
      console.error('Confirmation email/SMS failed:', emailErr);
      // Don't fail the payment response just because email/SMS failed
    }

    res.json({ success: true, message: 'Payment verified', orderId: order.orderId });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payments/webhook ────────────────
// Razorpay webhook for server-side payment events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSig) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(req.body);

    if (event.event === 'payment.captured') {
      const receipt = event.payload.payment.entity.order_id;
      await Order.findOneAndUpdate(
        { 'payment.razorpayOrderId': receipt },
        { 'payment.status': 'paid', status: 'confirmed' }
      );
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
