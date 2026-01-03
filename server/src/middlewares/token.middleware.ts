import { Request, Response, NextFunction } from "express";
import { SessionModel } from "../models/session.model";
import { generateAccessToken } from "../services/auth.service";
import { EnvConfig } from "../config/env.config";
import { AUTH } from "../config/constants";
import { logger } from "../utils/logger";
import { hashToken } from "../utils/crypto.utils";

/**
 * Automatically generates an access token if the refresh token is present.
 * If the refresh token is valid, a new access token is generated and set as a cookie.
 * If the user's risk score is high, the request is allowed to continue without generating a new access token, which will be covered by auth middleware.
 * If the session is marked as legacy or suspicious, the request is allowed to continue without generating a new access token becase the auth middleware will handle it.
 * @param {Request} request - Express request object containing the access token and refresh token.
 * @param {Response} response - Express response object.
 * @param {NextFunction} next - Express next function.
 * @returns {Promise<void>} A promise that resolves when the middleware has finished executing.
 */
export const autoGenerateAccessToken = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const accessToken = request.cookies.accessToken;
    const refreshToken = request.cookies.refreshToken;

    logger.info(`Access token: ${accessToken}`);
    logger.info(`Refresh token: ${refreshToken}`);

    /**
     * If the access token is not present, but the refresh token is, generate a new access token and set it as a cookie.
     */
    if (!accessToken && refreshToken) {
      const session: any = await SessionModel.findOne({
        refreshToken: hashToken(refreshToken),
      }).populate("userId", "email role riskScore");

      /**
       * If the session is not found, or the session is marked as legacy or suspicious, the request is send to next which is handled by auth middleware.
       */
      if (!session || session.isLegacy || session.isSuspicious) {
        return next();
      }

      const user = session.userId;

      /**
       * If the user's risk score is high, the request is allowed to continue without generating a new access token, which will be covered by auth middleware.
       */
      if (user.riskScore >= AUTH.MAX_RISK_SCORE) {
        logger.warn("User risk score is high");
        return next();
      }
      const newAccessToken = await generateAccessToken(
        user,
        session._id.toString()
      );

      response.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: EnvConfig.NODE_ENV === "production",
        maxAge: AUTH.ACCESS_TOKEN_TTL_MS,
      });

      request.user = { email: user.email, role: user.role };
      request.sessionId = session._id.toString();
    }

    logger.info(`Access token is valid`);

    return next();
  } catch (error) {
    logger.error(error);
    return response.status(500).json({ message: "Internal server error" });
  }
};
