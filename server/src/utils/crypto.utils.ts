import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Request } from "express";
import { EnvConfig } from "../config/env.config";

/**
 * Hash a plain text password using bcrypt.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, EnvConfig.SALT);
};

/**
 * Compare a plain text password with a hash.
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate a device fingerprint based on User-Agent and Language.
 */
export const generateDeviceFingerprint = (request: Request): string => {
  const userAgent = request.headers["user-agent"] || "";
  const acceptLanguage = request.headers["accept-language"] || "";
  return crypto.createHash("sha256").update(`${userAgent}${acceptLanguage}`).digest("hex");
};

/**
 * Generate a random hex string (used for Refresh Tokens).
 */
export const generateRandomToken = (length = 32): string => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Create a SHA256 hash of a token (for database storage).
 */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Generate a numeric One Time Password (OTP).
 */
export const generateNumericOtp = (length: number = 6): string => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max).toString();
};