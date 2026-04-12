const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:       { type: String, required: true },  // snapshot at time of order
  image:      { type: String },
  price:      { type: Number, required: true },
  size:       { type: String, required: true },
  quantity:   { type: Number, required: true, min: 1 },
}, { _id: false });

const shippingSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  phone:   { type: String, required: true },
  line1:   { type: String, required: true },
  line2:   { type: String },
  city:    { type: String, required: true },
  state:   { type: String, required: true },
  pincode: { type: String, required: true },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  method:          { type: String, enum: ['razorpay'], required: true },
  status:          { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  razorpayOrderId: { type: String },
  razorpayPaymentId:{ type: String },
  razorpaySignature:{ type: String },
  paidAt:          { type: Date },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId:  { type: String, unique: true },  // NXL20240001 format
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:    { type: [orderItemSchema], required: true },
  shipping: { type: shippingSchema, required: true },
  payment:  { type: paymentSchema, required: true },

  subtotal:       { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  discount:       { type: Number, default: 0 },
  total:          { type: Number, required: true },

  status: {
    type: String,
    enum: ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'placed',
  },

  notes:        { type: String },
  emailSentAt:  { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Auto-generate readable order ID
orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderId = `NXL${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderId: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
