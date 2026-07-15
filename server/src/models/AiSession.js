import mongoose from 'mongoose';

const aiSessionSchema = new mongoose.Schema(
  {
    sessionKey: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    title: { type: String, default: '', trim: true, maxlength: 200 },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

const AiSession = mongoose.model('AiSession', aiSessionSchema);
export default AiSession;
