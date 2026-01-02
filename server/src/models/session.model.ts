import mongoose, { Schema, Document } from "mongoose";

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  refreshTokenExpiry?: Date;
  deviceFingerprint: string;
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
  is_legacy?: boolean;
  expireAt?: Date;
}

const SessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  refreshToken: { type: String, required: true },
  deviceFingerprint: { type: String, required: true },
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
  is_legacy: { type: Boolean, default: false },
  expireAt: { type: Date },// for deletion (TTL)
});

// TTL deletion
SessionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = mongoose.model<ISession>("Session", SessionSchema);
