import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true, trim: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    sessionId: { type: String, index: true, default: null },
    path: { type: String, default: '', trim: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

analyticsEventSchema.index({ eventName: 1, createdAt: -1 });
analyticsEventSchema.index({ sessionId: 1, createdAt: -1 });
analyticsEventSchema.index({ user: 1, createdAt: -1 });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
export default AnalyticsEvent;
