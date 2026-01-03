import jwt from "jsonwebtoken";
import { EnvConfig } from "../config/env.config";
import { IUser, UserModel } from "../models/user.model";
import redis from "../database/redis.connection";
import {
  generateNumericOtp,
  generateRandomToken,
  hashOTP,
} from "../utils/crypto.utils";
import { JWT, OTP, OtpVerificationResultReason } from "../config/constants";

/**
 * Generates a One-Time Password (OTP) and stores it in Redis.
 * The OTP is stored with the user's identifier and the client's IP address.
 * The entry is set to expire in 5 minutes.
 * @param {string} identifier - User identifier.
 * @param {string} ipAddress - Client IP address.
 * @returns {Promise<string>} The generated OTP.
 */
export const generateAndStoreOtp = async (
  identifier: string,
  ipAddress: string
): Promise<string> => {
  const oneTimePassword = generateNumericOtp(OTP.LENGTH);

  const otpPayload = JSON.stringify({
    otp: hashOTP(oneTimePassword),
    ipAddress,
    createdAt: Date.now(),
  });

  // Expire in 5 minutes
  await redis.set(`otp:${identifier}`, otpPayload, "EX", OTP.TTL_SECONDS);
  return oneTimePassword;
};

/**
 * Verifies a One-Time Password (OTP) against a stored value in Redis.
 * Returns an object with a success flag and a reason code (OtpVerificationResultReason).
 * If the OTP is verified successfully, the stored value is removed from Redis.
 * @param {string} identifier - User identifier.
 * @param {string} ipAddress - Client IP address.
 * @param {string} providedOtp - OTP provided by the user.
 * @returns {Promise<{ success: boolean; reason: OtpVerificationResultReason }>} Verification result.
 */
export const verifyOneTimePassword = async (
  identifier: string,
  ipAddress: string,
  providedOtp: string
): Promise<{
  success: boolean;
  reason: OtpVerificationResultReason;
}> => {
  const rawData = await redis.get(`otp:${identifier}`);

  if (!rawData) {
    return {
      success: false,
      reason: OtpVerificationResultReason.OTP_EXPIRED_OR_NOT_FOUND,
    };
  }

  const { otp, ipAddress: storedIp } = JSON.parse(rawData);

  if (storedIp !== ipAddress) {
    return {
      success: false,
      reason: OtpVerificationResultReason.OTP_IP_MISMATCH,
    };
  }

  if (otp !== hashOTP(providedOtp)) {
    return {
      success: false,
      reason: OtpVerificationResultReason.OTP_INCORRECT,
    };
  }

  // OTP verified successfully, remove it, reset risk score
  await Promise.all([
    redis.del(`otp:${identifier}`),
    UserModel.updateOne({ _id: identifier }, { $set: { riskScore: 0 } }),
  ]);

  return {
    success: true,
    reason: OtpVerificationResultReason.OTP_VALID,
  };
};

/**
 * Generates a pair of access and refresh tokens based on the provided user and session identifier.
 * Access tokens are signed with the JWT secret and expire in 15 minutes.
 * Refresh tokens are randomly generated hex strings.
 * @param {IUser} user - The user object.
 * @param {string} sessionId - The session identifier.
 * @returns {Promise<{ accessToken: string; refreshToken: string }>} A promise containing the access and refresh tokens.
 */
export const generateAccessToken = (user: IUser, sessionId: string) => {
  const accessToken = jwt.sign(
    { userEmail: user.email, role: user.role, sessionId },
    EnvConfig.JWT_SECRET,
    { expiresIn: JWT.ACCESS_TOKEN_EXPIRES_IN }
  );

  return accessToken;
};

export const generateRefreshToken = (): string => {
  return generateRandomToken();
};
