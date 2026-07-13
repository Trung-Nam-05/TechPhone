import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, default: '', trim: true, maxlength: 200 },
    unreadByCustomer: { type: Number, default: 0, min: 0 },
    unreadByAdmin: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

conversationSchema.index({ customer: 1, status: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
