import mongoose from 'mongoose';

const orderEventSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    fromStatus: { type: String, default: '', trim: true },
    toStatus: { type: String, required: true, trim: true, index: true },
    note: { type: String, default: '', trim: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true },
);

orderEventSchema.index({ order: 1, createdAt: -1 });

const OrderEvent = mongoose.model('OrderEvent', orderEventSchema);
export default OrderEvent;
