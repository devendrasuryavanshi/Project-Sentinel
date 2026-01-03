import { Request, Response } from "express";
import { UserModel } from "../models/user.model";
import {
  comparePassword,
  generateDeviceFingerprint,
  hashPassword,
} from "../utils/crypto.utils";
import { extractClientIpAddress } from "../utils/network.utils";
import {
  generateAccessToken,
  generateAndStoreOtp,
  generateRefreshToken,
  verifyOneTimePassword,
} from "../services/auth.service";
import { buildLoginOtpEmailContent } from "../helpers/email-templates/otp-login.template";
import { sendEmail } from "../services/email.service";
import { evaluateLoginRisk } from "../services/risk.service";
import { getGeoLocationFromIp } from "../utils/geo.utils";
import {
  createUserSession,
  getActiveSessionsCount,
  deactivateUserSession,
} from "../services/session.service";
import { logger } from "../utils/logger";
import { AUTH, OtpVerificationResultReason } from "../config/constants";
import { EnvConfig } from "../config/env.config";
import { buildOtpFingerprintMismatchEmail } from "../helpers/email-templates/otp-fingerprint-mismatch.template";
import { SessionModel } from "../models/session.model";
import { buildSessionLimitEmail } from "../helpers/email-templates/session-limit.template";
import jwt from "jsonwebtoken";
import redis from "../database/redis.connection";

export class AuthController {
  /**
   * Registers a new user, hashes their password, and sends an email OTP for verification.
   *
   * @route POST /api/auth/register
   * @param {Request} request - Express request object containing registration data.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { message, userEmail, requireOtp }
   */
  static async register(
    request: Request,
    response: Response
  ): Promise<Response> {
    try {
      const { email, password } = request.body;

      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return response.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const createdUser = await UserModel.create({
        email,
        password: hashedPassword,
        role: "user",
        isVerified: false,
        riskScore: 0,
      });

      const clientIpAddress = extractClientIpAddress(request);
      const generatedOtp = await generateAndStoreOtp(
        createdUser._id.toString(),
        clientIpAddress,
        request.fingerprint
      );

      const emailContent = buildLoginOtpEmailContent({
        email: createdUser.email,
        otp: generatedOtp,
      });

      await sendEmail(
        createdUser.email,
        emailContent.subject,
        emailContent.html
      );

      return response.status(200).json({
        message: "Verification OTP sent",
        userEmail: createdUser.email,
        requireOtp: true,
      });
    } catch (error) {
      logger.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Authenticates a user using email and password with optional OTP-based MFA.
   *
   * This endpoint performs a multi-step, risk-aware authentication flow:
   * - Validates credentials (email + password)
   * - Enforces a maximum number of active sessions
   * - Supports OTP-first verification when an OTP is provided
   * - Performs adaptive risk evaluation when OTP is not provided
   * - Sends security notification emails on suspicious activity
   * - Issues access and refresh tokens upon successful authentication
   *
   * Behavior overview:
   * - If credentials are invalid, returns 401
   * - If active session limit is exceeded, sends a session-revocation email and returns 403
   * - If OTP is required or user is unverified, sends OTP email and returns `{ requireOtp: true }`
   * - If OTP verification fails, returns 400 (with security notification if fingerprint mismatch)
   * - On success, creates a new session, sets auth cookies, and returns user info
   * @param {Request} request - Express request object containing:
   *   - body.email {string} User email
   *   - body.password {string} User password
   *   - body.otp {string} [optional] One-time password for MFA
   *   - fingerprint {string} Device fingerprint injected by middleware
   *
   * @param {Response} response - Express response object
   * @security
   * - Enforces per-user active session limits
   * - Uses device fingerprinting to bind OTP verification
   * - Detects and blocks cross-device OTP usage
   * - Automatically notifies users of suspicious login attempts
   */
  static async login(request: Request, response: Response): Promise<Response> {
    try {
      const { email, password, otp: providedOtp } = request.body;

      if (!email || !password) {
        return response
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const foundUser = await UserModel.findOne({ email });
      if (
        !foundUser ||
        !(await comparePassword(password, foundUser.password))
      ) {
        return response.status(401).json({ message: "Invalid credentials" });
      }

      const totalActiveSessionCounts = await getActiveSessionsCount(
        foundUser._id.toString()
      );

      if (totalActiveSessionCounts >= AUTH.MAX_ACTIVE_SESSIONS) {
        const activeSessions = await SessionModel.find({
          userId: foundUser._id,
          status: "active",
        }).sort({ lastActiveAt: -1 });
        const sessionDataForEmail = activeSessions.map((sessions) => {
          const revokeToken = jwt.sign(
            {
              sessionId: sessions._id,
              userId: foundUser._id,
              scope: "EMAIL_REVOKE",
            },
            EnvConfig.JWT_SECRET,
            { expiresIn: "2m" } // STRICT 2 Minute Limit
          );
          return {
            deviceName: sessions.deviceName || "Unknown Device",
            ip: sessions.ipLastSeen,
            location: `${sessions.location.city}, ${sessions.location.country}`,
            lastActive: new Date(sessions.lastActiveAt).toLocaleString(),
            revokeToken,
          };
        });

        const emailContent = buildSessionLimitEmail(sessionDataForEmail);
        await sendEmail(
          foundUser.email,
          emailContent.subject,
          emailContent.html
        );
        return response.status(403).json({
          message:
            "Maximum active sessions reached. Please logout from other devices to continue.",
        });
      }

      const clientIpAddress = extractClientIpAddress(request);

      // OTP-first branch: verifies MFA challenge if user supplied OTP
      if (providedOtp) {
        const otpVerification = await verifyOneTimePassword(
          foundUser._id.toString(),
          clientIpAddress,
          request.fingerprint,
          providedOtp
        );

        if (!otpVerification.success) {
          if (
            otpVerification.reason ===
            OtpVerificationResultReason.OTP_FINGERPRINT_MISMATCH
          ) {
            logger.warn(
              `OTP fingerprint mismatch for user: ${foundUser.email}`
            );
            const emailContent = buildOtpFingerprintMismatchEmail({
              userEmail: foundUser.email,
              ipAddress: clientIpAddress,
              deviceName:
                request.headers["user-agent"]?.toString() ??
                AUTH.UNKNOWN_DEVICE,
              detectedAt: new Date(),
            });

            await sendEmail(
              foundUser.email,
              emailContent.subject,
              emailContent.html
            );

            return response.status(400).json({
              message:
                "OTP verification failed. Please check your email for further instructions.",
            });
          }
          return response.status(400).json({
            message: otpVerification.reason,
          });
        }
      }
      // MFA not supplied, will run automated risk-based decision engine
      else {
        logger.info("login risk for user: " + foundUser.email);
        const userAgentHeader =
          request.headers["user-agent"]?.toString() ?? AUTH.UNKNOWN_DEVICE;

        const riskEvaluation = await evaluateLoginRisk(
          foundUser._id.toString(),
          foundUser.email,
          clientIpAddress,
          request.fingerprint,
          userAgentHeader
        );

        if (riskEvaluation.requiresOtp || !foundUser.isVerified) {
          const generatedOtp = await generateAndStoreOtp(
            foundUser._id.toString(),
            clientIpAddress,
            request.fingerprint
          );

          const emailContent = buildLoginOtpEmailContent({
            email: foundUser.email,
            otp: generatedOtp,
          });

          await sendEmail(
            foundUser.email,
            emailContent.subject,
            emailContent.html
          );

          return response.status(200).json({
            requireOtp: true,
            message: "Additional verification required. OTP sent to email.",
          });
        }
      }

      const geoLocation = await getGeoLocationFromIp(clientIpAddress);
      logger.info(
        "geo location for user login: " + JSON.stringify(geoLocation)
      );
      const refreshToken = generateRefreshToken();
      console.log("Generated refresh token: " + refreshToken);

      const createdSession = await createUserSession(
        foundUser._id.toString(),
        clientIpAddress,
        request.headers["user-agent"]?.toString() ?? AUTH.UNKNOWN_USER_AGENT,
        request.fingerprint,
        geoLocation,
        refreshToken
      );

      const accessToken = generateAccessToken(
        foundUser,
        createdSession._id.toString()
      );

      response.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: EnvConfig.NODE_ENV === "production",
        maxAge: AUTH.ACCESS_TOKEN_TTL_MS,
      });

      response.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: EnvConfig.NODE_ENV === "production",
        maxAge: AUTH.REFRESH_TOKEN_TTL_MS,
      });

      foundUser.isVerified = true;
      await foundUser.save();

      return response.json({
        user: {
          email: foundUser.email,
          role: foundUser.role,
        },
      });
    } catch (error) {
      return response.status(500).json({ message: "Login failed" });
    }
  }

  static async logout(request: Request, response: Response): Promise<Response> {
    logger.info("Logging out user");
    try {
      const sessionId = request.sessionId;
      if (!sessionId) {
        return response
          .status(400)
          .json({ message: "No active session found" });
      }

      await deactivateUserSession(sessionId);
      response.clearCookie("accessToken");
      response.clearCookie("refreshToken");
      return response.json({ message: "Logout successful" });
    } catch (error) {
      return response.status(500).json({ message: "Logout failed" });
    }
  }

  /**
   * Revokes a user session via an email link.
   *
   * @param {Request} request - Express request object containing the token.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { message }
   *
   * @example
   * GET /api/auth/revoke-via-email?token=123456
   * @exampleResponse
   * {
   *   "message": "Session revoked successfully"
   * }
   */
  static async revokeViaEmail(request: Request, response: Response) {
    const { token } = request.query;
    if (!token || typeof token !== "string") {
      return response.status(400).json({ message: "Invalid token" });
    }

    try {
      const decoded: any = jwt.verify(token, EnvConfig.JWT_SECRET);
      if (decoded.scope !== "EMAIL_REVOKE") {
        return response.status(400).json({ message: "Invalid token" });
      }

      const session = await SessionModel.findById(decoded.sessionId).select(
        "_id refreshToken"
      );
      if (!session) {
        return response.status(404).json({ message: "Session not found" });
      }

      await Promise.all([
        SessionModel.updateOne(
          { _id: decoded.sessionId },
          { status: "revoked" }
        ),
        redis.del(`refresh:${session.refreshToken}`),
      ]);
      return response
        .status(200)
        .json({ message: "Session revoked successfully" });
    } catch (error) {
      logger.error(error);
      return response
        .status(400)
        .json({ message: "Invalid token or session not found" });
    }
  }
}
