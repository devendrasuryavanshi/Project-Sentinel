import { Request, Response } from "express";
import { UserModel } from "../models/user.model";
import {
  comparePassword,
  generateDeviceFingerprint,
  hashPassword,
} from "../utils/crypto.utils";
import { extractClientIpAddress } from "../utils/network.utils";
import {
  generateAndStoreOtp,
  generateAuthTokens,
  verifyOneTimePassword,
} from "../services/auth.service";
import { buildLoginOtpEmailContent } from "../helpers/email-templates/otp-login.template";
import { sendEmail } from "../services/email.service";
import { evaluateLoginRisk } from "../services/risk.service";
import { getGeoLocationFromIp } from "../utils/geo.utils";
import {
  createUserSession,
  getActiveSessionsCount,
} from "../services/session.service";
import { logger } from "../utils/logger";
import { AUTH } from "../config/constants";

export class AuthController {
  /**
   * Registers a new user, hashes their password, and sends an email OTP for verification.
   *
   * @route POST /api/auth/register
   * @param {Request} request - Express request object containing registration data.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { message, userId, requireOtp }
   */
  static async register(
    request: Request,
    response: Response
  ): Promise<Response> {
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
      clientIpAddress
    );

    const emailContent = buildLoginOtpEmailContent({
      email: createdUser.email,
      otp: generatedOtp,
    });

    await sendEmail(createdUser.email, emailContent.subject, emailContent.html);

    return response.status(200).json({
      message: "Verification OTP sent",
      userId: createdUser._id,
      requireOtp: true,
    });
  }

  /**
   * Authenticates an existing user using password and optional OTP.
   * If OTP is missing, a risk-based evaluation is performed to determine if MFA is required.
   * After passing checks, a session is created, tokens are generated, and cookies are set.
   *
   * @route POST /api/auth/login
   * @param {Request} request - Express request object containing login credentials & optional OTP.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { user } with cookies set (accessToken, refreshToken)
   */
  static async login(request: Request, response: Response): Promise<Response> {
    const { email, password, otp: providedOtp } = request.body;

    if (!email || !password) {
      return response
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const foundUser = await UserModel.findOne({ email });
    if (!foundUser || !(await comparePassword(password, foundUser.password))) {
      return response.status(401).json({ message: "Invalid credentials" });
    }

    const totalActiveSessionCounts = await getActiveSessionsCount(
      foundUser._id.toString()
    );

    if (totalActiveSessionCounts >= AUTH.MAX_ACTIVE_SESSIONS) {
      return response.status(403).json({
        message:
          "Maximum active sessions reached. Please logout from other devices to continue.",
      });
    }

    const clientIpAddress = extractClientIpAddress(request);
    const deviceFingerprint = generateDeviceFingerprint(request);

    // OTP-first branch: verifies MFA challenge if user supplied OTP
    if (providedOtp) {
      const otpVerification = await verifyOneTimePassword(
        foundUser._id.toString(),
        clientIpAddress,
        providedOtp
      );

      if (!otpVerification.success) {
        return response.status(400).json({
          success: false,
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
        deviceFingerprint,
        userAgentHeader
      );

      if (riskEvaluation.requiresOtp || !foundUser.isVerified) {
        const generatedOtp = await generateAndStoreOtp(
          foundUser._id.toString(),
          clientIpAddress
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
    logger.info("geo location for user login: " + JSON.stringify(geoLocation));
    const temporaryTokenPlaceholder = generateAuthTokens(
      foundUser,
      AUTH.TEMP_SESSION_ID
    ).refreshToken;

    const createdSession = await createUserSession(
      foundUser._id.toString(),
      clientIpAddress,
      request.headers["user-agent"]?.toString() ?? AUTH.UNKNOWN_USER_AGENT,
      deviceFingerprint,
      geoLocation,
      temporaryTokenPlaceholder
    );

    const finalAuthTokens = generateAuthTokens(
      foundUser,
      createdSession._id.toString()
    );

    response.cookie("accessToken", finalAuthTokens.accessToken, {
      httpOnly: true,
      secure: false,
      maxAge: AUTH.ACCESS_TOKEN_TTL_MS,
    });

    response.cookie("refreshToken", finalAuthTokens.refreshToken, {
      httpOnly: true,
      secure: false,
      path: "/api/auth/refresh",
      maxAge: AUTH.REFRESH_TOKEN_TTL_MS,
    });

    foundUser.isVerified = true;
    await foundUser.save();

    return response.json({
      user: {
        id: foundUser._id,
        email: foundUser.email,
        role: foundUser.role,
      },
    });
  }
}
