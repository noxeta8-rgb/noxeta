const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage config — uploads to noxeta/products/<product_id>/
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `noxeta/products/${req.params.productId || 'new'}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 1600, crop: 'limit', quality: 'auto:best' },
    ],
    public_id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

module.exports = { cloudinary, upload };
