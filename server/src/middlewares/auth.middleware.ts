import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { EnvConfig } from "../config/env.config";
import { AUTH, RISK } from "../config/constants";
import { IUser, UserModel } from "../models/user.model";
import { ISession } from "../models/session.model";
import { logger } from "../utils/logger";
import { extractClientIpAddress } from "../utils/network.utils";
import { generateDeviceFingerprint, hashToken } from "../utils/crypto.utils";
import {
  calculateTravelMetrics,
  getGeoLocationFromIp,
} from "../utils/geo.utils";
import {
  createUserSession,
  revokeUserSession,
  verifyAndUpdateUserSessionActivity,
} from "../services/session.service";
import { sendEmail } from "../services/email.service";
import { buildImpossibleTravelActivityEmail } from "../helpers/email-templates/impossible-travel.template";
import { generateAccessToken, generateRefreshToken } from "../services/auth.service";
import { log } from "node:console";
import { buildSessionHijackDetectedEmail } from "../helpers/email-templates/session-hijack-detected.template";

/**
 * Authenticates a user using an access token and refresh token.
 * If the access token is invalid or missing, returns a 401 error.
 * If the refresh token is invalid or missing, returns a 401 error.
 * If the session ID is missing, but the access token is valid, we treat this as a legacy token scenario and create a new session.
 * Detects session hijacking by comparing device fingerprints and revokes the session if a mismatch is detected.
 * Detects impossible travel by comparing IP/geolocation changes and sends an alert email to the user if detected.
 * @param {Request} request - Express request object containing the access token and refresh token.
 * @param {Response} response - Express response object.
 * @param {NextFunction} next - Express next function.
 * @returns {Promise<void>} A promise that resolves when the middleware has finished executing.
 */
export const authenticate = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const accessToken = request.cookies.accessToken;
    const refreshToken = request.cookies.refreshToken;
    const clientIp = extractClientIpAddress(request);
    const deviceFingerprint = generateDeviceFingerprint(request);

    logger.info(`Authenticating request from IP: ${clientIp}`);
    logger.info(`Device fingerprint: ${deviceFingerprint}`);
    logger.info(`Access token: ${accessToken}`);
    logger.info(`Refresh token: ${refreshToken}`);

    if (!accessToken) {
      return response
        .status(401)
        .json({ message: "Authentication required. Please log in." });
    }

    const decodedAccessToken: any = jwt.verify(
      accessToken,
      EnvConfig.JWT_SECRET
    );

    logger.info(`Decoded access token: ${JSON.stringify(decodedAccessToken)}`);

    const user: IUser | null = await UserModel.findById(
      decodedAccessToken.userId
    ).select("-password");

    if (!user) {
      return response
        .status(401)
        .json({ message: "User no longer exists." });
    }

    /**
     * If the session ID is missing, but the access token is valid,
     * we treat this as a legacy token scenario and create a new session
     */
    if (!decodedAccessToken.sessionId) {
      logger.warn(
        `Legacy token detected for user ${decodedAccessToken.userId}. Migrating session.`
      );

      const geoLocation = await getGeoLocationFromIp(clientIp);
      const newRefreshToken = generateRefreshToken();

      const [newSession] = await Promise.all([
        createUserSession(
          user._id.toString(),
          clientIp,
          request.headers["user-agent"] || "Legacy Client",
          deviceFingerprint,
          geoLocation,
          newRefreshToken,
          true
        ),
        UserModel.updateOne(
          { _id: user._id },
          { $inc: { riskScore: 20 } }
        ),
      ]);

      // new access token tied to the new session
      const newAccessToken = generateAccessToken(
        user,
        newSession._id.toString()
      );

      request.user = { id: user._id.toString(), role: user.role };
      request.sessionId = newSession._id.toString();
        response.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: EnvConfig.NODE_ENV === "production",
        maxAge: AUTH.ACCESS_TOKEN_TTL_MS_FOR_LEGACY,
      });

      response.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: EnvConfig.NODE_ENV === "production",
        path: "/api/auth/refresh",
        maxAge: AUTH.REFRESH_TOKEN_TTL_MS_FOR_LEGACY,
      });

      return next();
    }

    if (!refreshToken) {
      return response
        .status(401)
        .json({ message: "Authentication required. Please log in." });
    }

    const sessionId = decodedAccessToken.sessionId;
    const refreshTokenHash = hashToken(refreshToken);
    logger.info(`Session ID: ${sessionId}`);
    logger.info(`Refresh token hash: ${refreshTokenHash}`);

    /**
     * Verify the refresh token and update session activity
     * If valid, returns the session data; otherwise, null
     */
    const sessionData: ISession | null =
      await verifyAndUpdateUserSessionActivity(
        refreshTokenHash,
        clientIp
      );

    logger.info(`Session data: ${JSON.stringify(sessionData)}`);

    if (!sessionData) {
      return response
        .status(401)
        .json({
          message: "Session invalid or expired. Please log in again.",
        });
    }

    /**
     * Detect session hijacking by comparing device fingerprints
     * If mismatch, revoke session and alert user
     */
    if (sessionData.deviceFingerprint !== deviceFingerprint) {
      logger.error(`Session hijack detected for session ${sessionId}`);
      const content = buildSessionHijackDetectedEmail({
        userEmail: user.email,
        ipAddress: clientIp,
        deviceName: request.headers["user-agent"] || "Unknown Device",
        detectedAt: new Date(),
      });

      await Promise.all([
        sendEmail(user.email, content.subject, content.html),
        revokeUserSession(sessionId),
      ]);

      return response
        .status(401)
        .json({
          message: "Session invalid or expired. Please log in again.",
        });
    }

    /**
     * Impossible travel detection based on IP/geolocation changes
     * If detected, send alert email to user
     */
    if (sessionData.ipLastSeen !== clientIp) {
      const currentGeo = await getGeoLocationFromIp(clientIp);

      const metrics = calculateTravelMetrics(
        sessionData.location.latitude,
        sessionData.location.longitude,
        currentGeo.latitude,
        currentGeo.longitude,
        sessionData.lastActiveAt,
        new Date()
      );

      if (
        metrics.travelSpeedKilometersPerHour >=
        RISK.MAX_TRAVEL_SPEED_KMPH
      ) {
        const content = buildImpossibleTravelActivityEmail({
          userEmail: user.email,
          previousIp: sessionData.ipLastSeen,
          currentIp: clientIp,
          previousLocation: `${sessionData.location.city}, ${sessionData.location.country}`,
          currentLocation: `${currentGeo.city}, ${currentGeo.country}`,
          deviceName:
            request.headers["user-agent"] || "Unknown Device",
          previousActivityTime: sessionData.lastActiveAt,
          currentActivityTime: new Date(),
          distanceKm: metrics.distanceInKilometers,
          travelSpeedKmPerHour:
            metrics.travelSpeedKilometersPerHour,
        });

        await Promise.all([
          sendEmail(
            user.email,
            content.subject,
            content.html
          ),
          UserModel.updateOne(
            { _id: user._id },
            { $inc: { riskScore: 40 } }
          ),
        ]);
      }
    }

    request.user = { id: user._id.toString(), role: user.role };
    request.sessionId = sessionId;

    next();
  } catch (error) {
    logger.error(
      "Authentication error: " + (error as Error).message
    );

    return response
      .status(401)
      .json({
        message: "Authentication failed. Please log in.",
      });
  }
};
