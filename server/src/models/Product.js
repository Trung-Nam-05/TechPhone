import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, index: true, sparse: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: {
      key: { type: String, required: true, trim: true },
      label: { type: String, required: true, trim: true },
    },
    brand: { type: String, default: '', trim: true },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, default: null, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 100, min: 0 },
    image: { type: String, default: '' },
    images: [{ type: String }],
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

productSchema.index({ 'category.key': 1, isActive: 1 });
productSchema.index({ 'category.key': 1, brand: 1, price: 1, isActive: 1 });
productSchema.index({ name: 'text', brand: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;
