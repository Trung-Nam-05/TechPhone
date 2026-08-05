import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    contactEmail: { type: String, default: '', lowercase: true, trim: true },
    contactEmailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, default: null, index: true },
    emailVerifyExpires: { type: Date, default: null },
    resetPasswordTokenHash: { type: String, default: null, index: true },
    resetPasswordExpires: { type: Date, default: null },
    phone: { type: String, default: '', trim: true },
    avatar: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);
export default User;
