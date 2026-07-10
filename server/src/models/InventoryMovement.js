import mongoose from 'mongoose';

const inventoryMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: { type: String, enum: ['import', 'export', 'adjustment', 'order'], required: true, index: true },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true, min: 0 },
    nextStock: { type: Number, required: true, min: 0 },
    note: { type: String, default: '', trim: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true },
);

inventoryMovementSchema.index({ product: 1, createdAt: -1 });
inventoryMovementSchema.index({ type: 1, createdAt: -1 });

const InventoryMovement = mongoose.model('InventoryMovement', inventoryMovementSchema);
export default InventoryMovement;
