const express = require('express');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');

const router = express.Router();

// ── GET /api/products ─────────────────────────
// Query: ?category=&featured=&page=&limit=&sort=&search=&minPrice=&maxPrice=
router.get('/', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const {
      category, featured, page = 1, limit = 12,
      sort = '-createdAt', search, minPrice, maxPrice, badge,
    } = req.query;

    const filter = { isActive: true };
    if (category)  filter.category  = category;
    if (featured === 'true') filter.isFeatured = true;
    if (badge)     filter.badge     = badge;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/:slug ───────────────────
router.get('/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Increment view count (non-blocking)
    Product.findByIdAndUpdate(product._id, { $inc: { views: 1 } }).exec();

    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/products — Admin: Create product ─
router.post('/', protect, adminOnly, async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ error: msg });
    }
    next(err);
  }
});

// ── PUT /api/products/:id — Admin: Update product ─
router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/products/:productId/images ──────
// Admin: Add images to existing product (supports multiple)
router.post('/:productId/images', protect, adminOnly, async (req, res, next) => {
  try {
    // req.body.images = [{ url, publicId, alt, order }]
    // These are already uploaded via /api/upload — just register URLs here
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const newImages = req.body.images.map((img, i) => ({
      url:      img.url,
      thumbnail: img.thumbnail || img.url,
      publicId:  img.publicId || '',
      alt:       img.alt || product.name,
      order:     product.images.length + i,
    }));

    product.images.push(...newImages);
    await product.save();

    res.json({ success: true, images: product.images, message: `${newImages.length} image(s) added` });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/products/:productId/images/:imageId ─
// Admin: Remove a specific image from product
router.delete('/:productId/images/:imageId', protect, adminOnly, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const img = product.images.id(req.params.imageId);
    if (!img) return res.status(404).json({ error: 'Image not found' });

    // Delete from Cloudinary
    if (img.publicId) {
      await cloudinary.uploader.destroy(img.publicId).catch(console.error);
    }

    product.images.pull(req.params.imageId);
    await product.save();

    res.json({ success: true, message: 'Image removed' });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/products/:productId/images/reorder ─
// Admin: Update image order (for slider sequence)
router.put('/:productId/images/reorder', protect, adminOnly, async (req, res, next) => {
  try {
    // req.body.order = [{ imageId, order }]
    const product = await Product.findById(req.params.productId);
    req.body.order.forEach(({ imageId, order }) => {
      const img = product.images.id(imageId);
      if (img) img.order = order;
    });
    product.images.sort((a, b) => a.order - b.order);
    await product.save();
    res.json({ success: true, images: product.images });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/products/:id — Admin: Soft delete ─
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    next(err);
  }
});


// ── PUT /api/products/:productId/images/replace ──
// Replace ALL images for a product (used by admin panel after Cloudinary upload)
router.put('/:productId/images/replace', protect, adminOnly, async (req, res, next) => {
  try {
    const pid = req.params.productId
    const mongoose = require('mongoose')

    // Try finding by ObjectId first, then by slug, then by name
    let product = null
    if (mongoose.Types.ObjectId.isValid(pid)) {
      product = await Product.findById(pid)
    }
    if (!product) {
      product = await Product.findOne({ slug: pid })
    }

    if (!product) {
      // Product not in MongoDB — still return success so frontend saves locally
      return res.json({ success: true, message: 'Product not in DB, saved locally only' })
    }

    const { images } = req.body
    if (!Array.isArray(images)) {
      return res.status(400).json({ error: 'images must be an array' })
    }

    product.images = images.map((img, i) => ({
      url:      typeof img === 'string' ? img : img.url,
      alt:      img.alt || `Product image ${i + 1}`,
      order:    img.order ?? i,
      publicId: img.publicId || '',
    }))

    await product.save()
    console.log(`✅ Saved ${product.images.length} images for: ${product.name}`)
    res.json({ success: true, images: product.images, productName: product.name })
  } catch (err) {
    next(err)
  }
})

module.exports = router;
