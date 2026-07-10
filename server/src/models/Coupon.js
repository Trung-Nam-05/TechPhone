import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: '', trim: true },
    scope: { type: String, enum: ['product', 'shipping'], required: true, index: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscountValue: { type: Number, default: null, min: 0 },
    startsAt: { type: Date, default: null, index: true },
    endsAt: { type: Date, default: null, index: true },
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

couponSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });
couponSchema.index({ scope: 1, isActive: 1, startsAt: 1, endsAt: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
