const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const validator = require('validator');

const addressSchema = new mongoose.Schema({
  label:   { type: String, default: 'Home' },
  name:    { type: String, required: true },
  phone:   { type: String, required: true },
  line1:   { type: String, required: true },
  line2:   { type: String },
  city:    { type: String, required: true },
  state:   { type: String, required: true },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String, required: [true, 'Name is required'],
    trim: true, maxlength: [60, 'Name too long'],
  },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true,
    validate: [validator.isEmail, 'Invalid email'],
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 chars'],
    select: false, // never return in queries
  },
  phone:   { type: String },
  avatar:  { type: String, default: '' },
  role:    { type: String, enum: ['user', 'admin'], default: 'user' },
  addresses: [addressSchema],

  // OAuth
  googleId:    { type: String },
  provider:    { type: String, default: 'local' },

  // Account state
  isVerified:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  wishlist:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  // Password reset
  resetToken:        { type: String, select: false },
  resetTokenExpires: { type: Date, select: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Generate JWT
userSchema.methods.generateToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Remove sensitive fields from JSON output
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
