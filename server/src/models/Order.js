import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: null, min: 0 },
    priceSource: { type: String, enum: ['regular', 'flash_sale'], default: 'regular' },
    flashSaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'FlashSale', default: null },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderCouponSnapshotSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    scope: { type: String, enum: ['product', 'shipping'], required: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const installmentSchema = new mongoose.Schema(
  {
    provider: { type: String, default: '', trim: true },
    planMonths: { type: Number, default: null, min: 1 },
    downPaymentRate: { type: Number, default: null, min: 0, max: 100 },
    downPaymentAmount: { type: Number, default: 0, min: 0 },
    financedAmount: { type: Number, default: 0, min: 0 },
    monthlyAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    note: { type: String, default: '', trim: true },
    requestedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    sessionId: { type: String, index: true },
    items: { type: [orderItemSchema], required: true, default: [] },
    idempotencyKey: { type: String, default: null, index: true },
    subtotal: { type: Number, required: true, min: 0 },
    productDiscountTotal: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 30000, min: 0 },
    shippingDiscountTotal: { type: Number, default: 0, min: 0 },
    couponDiscountTotal: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    coupons: { type: [orderCouponSnapshotSchema], default: [] },
    paymentMethod: { type: String, enum: ['cod', 'installment', 'vnpay'], default: 'cod' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'await_pickup',
        'picked',
        'shipping',
        'completed',
        'delivery_failed',
        'returned',
        'cancelled',
      ],
      default: 'pending',
    },
    supportStatus: {
      type: String,
      enum: ['none', 'customer_contacted', 'awaiting_response', 'resolved'],
      default: 'none',
      index: true,
    },
    cancelRequestStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
      index: true,
    },
    cancelRequestNote: { type: String, default: '', trim: true },
    cancelRequestedAt: { type: Date, default: null },
    cancelResolvedAt: { type: Date, default: null },
    installment: { type: installmentSchema, default: () => ({ status: 'draft' }) },
    shippingInfo: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, default: '', trim: true },
      province: { type: String, default: '', trim: true },
      district: { type: String, default: '', trim: true },
      ward: { type: String, default: '', trim: true },
      address: { type: String, required: true, trim: true },
      note: { type: String, default: '', trim: true },
    },
    shipment: {
      provider: { type: String, default: null, trim: true },
      labelId: { type: String, default: '', trim: true },
      partnerId: { type: String, default: '', trim: true },
      ghtkStatusId: { type: Number, default: null },
      fee: { type: Number, default: null, min: 0 },
      weight: { type: Number, default: null, min: 0 },
      submittedAt: { type: Date, default: null },
      lastWebhookAt: { type: Date, default: null },
      retryCount: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ sessionId: 1, createdAt: -1 });
orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
orderSchema.index({ sessionId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
