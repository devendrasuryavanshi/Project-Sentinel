import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  riskScore: number;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  riskScore: { type: Number, default: 0 },
}, { timestamps: true });

// INDEXES
// Optimization for Admin Dashboard sorting (High Risk first, then Newest)
UserSchema.index({ riskScore: -1, createdAt: -1 });

export const UserModel = mongoose.model<IUser>('User', UserSchema);