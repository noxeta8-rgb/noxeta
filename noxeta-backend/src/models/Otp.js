const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true 
  },
  phone: {
    type: String,   // stored so SMS can be resent on resend-OTP requests
    default: null,
  },
  otp: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 300 // Document automatically deletes after 5 minutes
  }
});

module.exports = mongoose.model('Otp', otpSchema);
