const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

sessionSchema.index({ userId: 1 });
sessionSchema.index({ token: 1 });

const session = mongoose.model('Session', sessionSchema);
module.exports=session;