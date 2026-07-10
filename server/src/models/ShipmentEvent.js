import mongoose from 'mongoose';

const shipmentEventSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    provider: { type: String, default: 'ghtk', trim: true },
    ghtkStatusId: { type: Number, default: null, index: true },
    labelId: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

shipmentEventSchema.index({ order: 1, createdAt: -1 });

const ShipmentEvent = mongoose.model('ShipmentEvent', shipmentEventSchema);
export default ShipmentEvent;
