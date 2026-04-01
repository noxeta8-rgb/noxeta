const mongoose = require('mongoose');

// Each image has a URL + optional thumbnail
const imageSchema = new mongoose.Schema({
  url:       { type: String, required: true },
  thumbnail: { type: String },            // auto-generated smaller version
  publicId:  { type: String },            // Cloudinary public_id for deletion
  alt:       { type: String, default: '' },
  order:     { type: Number, default: 0 }, // sort order for slider
}, { _id: true });

const variantSchema = new mongoose.Schema({
  size:      { type: String, required: true }, // S, M, L, XL, XXL
  stock:     { type: Number, default: 0 },
  sku:       { type: String },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, unique: true, lowercase: true },
  description: { type: String, required: true },
  shortDesc:   { type: String, maxlength: 200 },

  category: {
    type: String,
    required: true,
    enum: ['Track Pants', 'Tees', 'Acid Wash Tees',
           'Co-ord Sets', 'Waffle T-Shirts', 'Tank Tops'],
  },

  // ── IMAGES (the key feature — supports multiple for slider) ──
  images: {
    type: [imageSchema],
    default: [],
  },

  price:         { type: Number, required: true, min: 0 },
  originalPrice: { type: Number },            // for showing strikethrough
  discount:      { type: Number, default: 0 }, // percentage

  variants: [variantSchema],   // sizes with stock

  badge: {
    type: String,
    enum: ['New', 'Hot', 'Limited', 'Collab', 'Bestseller', 'Sale', null],
    default: null,
  },

  colors:    [{ type: String }],  // hex codes
  tags:      [{ type: String }],  // searchable tags
  material:  { type: String },
  fit:       { type: String, enum: ['Oversized', 'Regular', 'Slim', 'Wide Leg'] },
  gsm:       { type: Number },    // fabric weight

  isActive:  { type: Boolean, default: true },
  isFeatured:{ type: Boolean, default: false },

  // Stats
  views:     { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
  rating:    { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:{ type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Auto-generate slug from name
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  // Auto-calc discount
  if (this.originalPrice && this.price) {
    this.discount = Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100
    );
  }
  next();
});

// Virtual: total stock across all sizes
productSchema.virtual('totalStock').get(function() {
  return (this.variants || []).reduce((sum, v) => sum + v.stock, 0);
});

// Virtual: primary image URL (first image)
productSchema.virtual('primaryImage').get(function() {
  return this.images?.[0]?.url || '';
});

// Index for search + filtering
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1, isFeatured: 1 });
productSchema.index({ price: 1 });
// slug index is already created by unique:true in the schema field definition above

module.exports = mongoose.model('Product', productSchema);
