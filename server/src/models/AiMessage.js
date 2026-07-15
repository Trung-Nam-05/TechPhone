import mongoose from 'mongoose';

const aiMessageSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'AiSession', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    body: { type: String, required: true, trim: true, maxlength: 8000 },
    toolCalls: { type: [String], default: [] },
  },
  { timestamps: true },
);

aiMessageSchema.index({ session: 1, createdAt: 1 });

const AiMessage = mongoose.model('AiMessage', aiMessageSchema);
export default AiMessage;
