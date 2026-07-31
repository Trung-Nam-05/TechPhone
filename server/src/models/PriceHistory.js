import mongoose from 'mongoose';

const priceHistorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, default: '', trim: true },
    oldPrice: { type: Number, default: null, min: 0 },
    newPrice: { type: Number, required: true, min: 0 },
    delta: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ['create', 'product_update', 'manual_adjust'],
      default: 'product_update',
      index: true,
    },
    note: { type: String, default: '', trim: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true },
);

priceHistorySchema.index({ product: 1, createdAt: -1 });
priceHistorySchema.index({ createdAt: -1 });
// Tự xoá bản ghi cũ hơn ~1 năm (phạm vi theo dõi giá)
priceHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 366 * 24 * 60 * 60 });

const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema);
export default PriceHistory;
