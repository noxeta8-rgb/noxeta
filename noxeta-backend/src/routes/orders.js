const express = require('express');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// ── POST /api/orders ──────────────────────────
// Place a new order
router.post('/', protect, async (req, res, next) => {
  try {
    const { items, shipping, paymentMethod } = req.body;

    if (!items?.length) return res.status(400).json({ error: 'Cart is empty' });
    if (!shipping)      return res.status(400).json({ error: 'Shipping address required' });

    // Validate items + calculate totals server-side
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ error: `Product ${item.name} is no longer available` });
      }

      // Check stock
      const variant = product.variants.find(v => v.size === item.size);
      if (variant && variant.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name} (${item.size})` });
      }

      orderItems.push({
        product:  product._id,
        name:     product.name,
        image:    product.images[0]?.url || '',
        price:    product.price,          // server price (not client)
        size:     item.size,
        quantity: item.quantity,
      });
      subtotal += product.price * item.quantity;
    }

    const shippingCharge = subtotal >= 999 ? 0 : 99;
    const total = subtotal + shippingCharge;

    const order = await Order.create({
      user:     req.user._id,
      items:    orderItems,
      shipping,
      payment: {
        method: 'razorpay',
        status: 'pending',
      },
      subtotal,
      shippingCharge,
      total,
      status: 'placed',
    });

    // Decrement stock (async)
    for (const item of items) {
      await Product.findOneAndUpdate(
        { _id: item.productId, 'variants.size': item.size },
        { $inc: { 'variants.$.stock': -item.quantity, soldCount: item.quantity } }
      ).catch(console.error);
    }

    // Send confirmation email
    sendEmail({
      to: req.user.email,
      subject: `Noxeta — Order Confirmed #${order.orderId}`,
      template: 'orderConfirm',
      data: {
        name:    req.user.name,
        orderId: order.orderId,
        items:   orderItems,
        total,
        shipping,
      },
    }).then(() => {
      Order.findByIdAndUpdate(order._id, { emailSentAt: new Date() }).exec();
    }).catch(console.error);

    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders/my ────────────────────────
router.get('/my', protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort('-createdAt')
      .populate('items.product', 'name slug images');

    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders/:orderId ──────────────────
router.get('/:orderId', protect, async (req, res, next) => {
  try {
    const query = { orderId: req.params.orderId };
    if (req.user.role !== 'admin') query.user = req.user._id;

    const order = await Order.findOne(query).populate('user', 'name email');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

// ── Admin: GET all orders ─────────────────────
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};

    const orders = await Order.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('user', 'name email');

    const total = await Order.countDocuments(filter);
    res.json({ success: true, orders, total });
  } catch (err) {
    next(err);
  }
});

// ── Admin: Update order status ────────────────
router.patch('/:orderId/status', protect, adminOnly, async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
