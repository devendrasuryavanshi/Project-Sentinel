import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  location: {
    city: string;
    country: string;
    lat: number;
    lon: number;
  };
  lastActiveAt: Date;
  status: 'active' | 'inactive' | 'revoked';
  isSuspicious: boolean;
  expireAt?: Date; // for ttl
}

const SessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  refreshTokenHash: { type: String, required: true },
  deviceFingerprint: { type: String, required: true },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },
  location: {
    city: String,
    country: String,
    lat: Number,
    lon: Number
  },
  lastActiveAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive', 'revoked'], default: 'active' },
  isSuspicious: { type: Boolean, default: false },
  expireAt: { type: Date } 
});

export const SessionModel = mongoose.model<ISession>('Session', SessionSchema);