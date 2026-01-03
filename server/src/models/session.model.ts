import mongoose, { Schema, Document } from "mongoose";

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  refreshTokenExpiry?: Date;
  fingerprint: string;
  deviceName?: string;
  ipFirstSeen: string;
  ipLastSeen: string;
  ipLastChangedAt?: Date;
  ipChangeCount: number;
  userAgent: string;
  location: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  lastActiveAt: Date;
  status: "active" | "inactive" | "revoked";
  isSuspicious: boolean;
  isLegacy?: boolean;
  expireAt?: Date;
}

const SessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  refreshToken: { type: String, required: true },
  refreshTokenExpiry: { type: Date },
  fingerprint: { type: String, required: true },
  deviceName: { type: String },
  ipFirstSeen: { type: String, required: true },
  ipLastSeen: { type: String, required: true },
  ipLastChangedAt: { type: Date },
  ipChangeCount: { type: Number, default: 0 },
  userAgent: { type: String },
  location: {
    city: String,
    country: String,
    latitude: Number,
    longitude: Number,
  },
  lastActiveAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["active", "inactive", "revoked"],
    default: "active",
  },
  isSuspicious: { type: Boolean, default: false },
  isLegacy: { type: Boolean, default: false },
  expireAt: { type: Date },// for deletion (TTL)
}, { timestamps: true });

// INDEXES

// TTL Auto-Deletion
SessionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// Refresh Token Lookup
SessionSchema.index({ refreshToken: 1 });

// User Session Lookups 
// Optimized for sorting by lastActiveAt descending
SessionSchema.index({ userId: 1, lastActiveAt: -1 });

// Status Filter
SessionSchema.index({ userId: 1, status: 1 });

export const SessionModel = mongoose.model<ISession>("Session", SessionSchema);
