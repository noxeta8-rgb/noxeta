const express = require('express');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/users/profile ────────────────────
router.get('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

// ── PUT /api/users/profile ────────────────────
router.put('/profile', protect, async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'avatar'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

// ── POST /api/users/addresses ─────────────────
router.post('/addresses', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (req.body.isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
    }
    user.addresses.push(req.body);
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) { next(err); }
});

// ── DELETE /api/users/addresses/:id ──────────
router.delete('/addresses/:id', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.pull(req.params.id);
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) { next(err); }
});

// ── POST /api/users/wishlist/:productId ───────
router.post('/wishlist/:productId', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const pid  = req.params.productId;
    const idx  = user.wishlist.indexOf(pid);
    if (idx > -1) user.wishlist.splice(idx, 1);
    else          user.wishlist.push(pid);
    await user.save();
    res.json({ success: true, wishlist: user.wishlist, action: idx > -1 ? 'removed' : 'added' });
  } catch (err) { next(err); }
});

// ── Admin: GET all users ──────────────────────
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const users = await User.find()
      .sort('-createdAt').skip((page-1)*limit).limit(Number(limit)).select('-password');
    const total = await User.countDocuments();
    res.json({ success: true, users, total });
  } catch (err) { next(err); }
});

module.exports = router;
