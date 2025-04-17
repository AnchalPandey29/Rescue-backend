const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['open', 'in review', 'closed'], default: 'open' }
});

feedbackSchema.index({ user: 1 });
feedbackSchema.index({ type: 1 });
feedbackSchema.index({ timestamp: 1 });

const feedback = mongoose.model('Feedback', feedbackSchema);

module.exports=feedback;