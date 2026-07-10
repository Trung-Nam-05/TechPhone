import mongoose from 'mongoose';

const flashSaleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    flashPrice: { type: Number, required: true, min: 0 },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    quota: { type: Number, required: true, min: 1 },
    soldCount: { type: Number, default: 0, min: 0 },
    maxPerOrderQty: { type: Number, default: 5, min: 1 },
    perUserLimit: { type: Number, default: null, min: 1 },
    isEnabled: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true },
);

flashSaleSchema.index({ product: 1, startsAt: 1, endsAt: 1 });
flashSaleSchema.index({ isEnabled: 1, isDeleted: 1, startsAt: 1, endsAt: 1 });
flashSaleSchema.index({ product: 1, isEnabled: 1, isDeleted: 1 });

const FlashSale = mongoose.model('FlashSale', flashSaleSchema);
export default FlashSale;
