import mongoose from 'mongoose';

const appliedCouponSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    scope: { type: String, enum: ['product', 'shipping'], required: true },
  },
  { _id: false },
);

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    sessionId: { type: String, unique: true, sparse: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    appliedCoupons: { type: [appliedCouponSchema], default: [] },
  },
  { timestamps: true },
);

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
