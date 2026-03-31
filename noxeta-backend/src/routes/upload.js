const express = require('express');
const { upload, cloudinary } = require('../config/cloudinary');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/upload/product/:productId ───────
// Upload 1–10 images for a product
// Field name: "images" (multipart/form-data)
router.post('/product/:productId',
  protect, adminOnly,
  upload.array('images', 10),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const images = req.files.map((file, i) => ({
        url:      file.path,             // Cloudinary URL
        thumbnail: file.path.replace('/upload/', '/upload/w_400,h_533,c_fill/'),
        publicId:  file.filename,
        alt:       req.body.alt || '',
        order:     Number(req.body.startOrder || 0) + i,
      }));

      res.json({
        success: true,
        images,
        message: `${images.length} image(s) uploaded successfully`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/upload/single ───────────────────
// Upload single image (for misc use — avatar etc)
router.post('/single', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/upload/:publicId ──────────────
// Delete image from Cloudinary by publicId
router.delete('/:publicId(*)', protect, adminOnly, async (req, res, next) => {
  try {
    const result = await cloudinary.uploader.destroy(req.params.publicId);
    if (result.result !== 'ok') {
      return res.status(400).json({ error: 'Failed to delete image' });
    }
    res.json({ success: true, message: 'Image deleted from Cloudinary' });
  } catch (err) {
    next(err);
  }
});


// ── GET /api/upload/usage ─────────────────────
// Get Cloudinary storage usage
router.get('/usage', protect, async (req, res) => {
  try {
    const result = await cloudinary.api.usage()
    const usedBytes = result.storage?.used_bytes || result.used_bytes || 0
    const limitBytes = result.storage?.limit || result.limit || (25 * 1024 * 1024 * 1024)
    res.json({
      used_bytes: usedBytes,
      limit:      limitBytes,
      used_gb:    (usedBytes / 1024 / 1024 / 1024).toFixed(3),
      limit_gb:   (limitBytes / 1024 / 1024 / 1024).toFixed(0),
      resources:  result.resources || result.derived_resources || 0,
    })
  } catch (err) {
    // If Cloudinary API fails, return safe defaults so admin panel still works
    console.error('Cloudinary usage error:', err.message)
    res.json({
      used_bytes: 0,
      limit:      25 * 1024 * 1024 * 1024,
      used_gb:    '0.000',
      limit_gb:   '25',
      resources:  0,
      error:      err.message,
    })
  }
})

module.exports = router;