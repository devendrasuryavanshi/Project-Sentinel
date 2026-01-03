import { Request, Response } from "express";
import mongoose from "mongoose";
import { UserModel } from "../models/user.model";
import { SessionModel } from "../models/session.model";
import redis from "../database/redis.connection";
import { logger } from "../utils/logger";
import { SESSION_STATUS } from "../config/constants";

export class UserController {
  /**
   * Returns user data for authentication purposes.
   * @param {Request} request - Express request object containing user data.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} A promise that resolves with the user data, or rejects with a 500 status code and an error message.
   */
  static async getUserForAuth(
    request: Request,
    response: Response
  ): Promise<Response> {
    try {
      return response.json({
        email: request.user?.email,
        role: request.user?.role,
      });
    } catch (error) {
      return response
        .status(500)
        .json({ message: "Failed to fetch user data" });
    }
  }

  /**
   * Retrieves a user's profile data, including their active sessions and other relevant information.
   * @param {Request} request - Express request object containing the user's email and session ID.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} A promise that resolves with the user's profile data, or rejects with a 404 status code and an error message if the user is not found, or a 500 status code and an error message if there is an internal server error.
   */
  static async getProfile(request: Request, response: Response) {
    try {
      const email = request.user?.email;
      const currentSessionId = request.sessionId;

      /**
       * Aggregates the user's data, including their active sessions, and returns it as a response
       */
      const data = await UserModel.aggregate([
        { $match: { email } },
        {
          $lookup: {
            from: "sessions",
            let: { uid: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$uid"] },
                      { $eq: ["$status", "active"] },
                    ],
                  },
                },
              },
              { $sort: { lastActiveAt: -1 } },
            ],
            as: "activeSessions",
          },
        },
        {
          $project: {
            email: 1,
            role: 1,
            isVerified: 1,
            riskScore: 1,
            createdAt: 1,
            activeSessions: 1,
          },
        },
      ]);

      if (!data.length) {
        return response.status(404).json({ message: "User not found" });
      }

      const userProfile = data[0];

      const sessions = userProfile.activeSessions.map((session: any) => ({
        ...session,
        isCurrent: session._id.toString() === currentSessionId,
      }));

      const currentSession = sessions.find((s: any) => s.isCurrent);
      const otherSessions = sessions.filter((s: any) => !s.isCurrent);

      delete userProfile.activeSessions;

      return response.status(200).json({
        user: userProfile,
        currentSession,
        otherSessions,
      });
    } catch (error) {
      logger.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Gets the session history for a given user.
   * The history is sorted by last active date in descending order.
   * The limit is 100 sessions.
   * The response will contain an array of sessions with the following properties:
   * - deviceName: string
   * - ipLastSeen: string
   * - location: string
   * - lastActiveAt: Date
   * - status: string
   * - userAgent: string
   * @param {Request} request - Express request object containing the user data.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { history }
   */
  static async getSessionHistory(request: Request, response: Response) {
    try {
      const email = request.user?.email;
      const limit = 100;
      logger.info("Getting session history");
      logger.info("Email: " + email);

      const user = await UserModel.findOne({ email }).select("_id");
      if (!user) {
        return response.status(404).json({ message: "User not found" });
      }

      /**
       * Retrieves the session history for a given user, sorted by last active date in descending order
       * and limited to 100 sessions
       */
      const history = await SessionModel.find({
        userId: user._id,
        status: { $in: ["inactive", "revoked"] },
      })
        .sort({ lastActiveAt: -1 })
        .limit(limit)
        .select("deviceName ipLastSeen location lastActiveAt status userAgent");

      return response.status(200).json({ history });
    } catch (error) {
      logger.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Revokes a user session based on the provided session ID.
   * @param {Request} request - Express request object containing the session ID.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { message }
   * @throws {Response} 404 - User not found
   * @throws {Response} 404 - Session not found
   * @throws {Response} 500 - Internal server error
   */
  static async revokeSession(request: Request, response: Response) {
    try {
      const { sessionId } = request.body;
      const email = request.user?.email;

      const user = await UserModel.findOne({ email }).select("_id");
      if (!user) {
        return response.status(404).json({ message: "User not found" });
      }

      const session = await SessionModel.findOne({
        _id: sessionId,
        userId: user._id,
      });

      if (!session) {
        return response.status(404).json({ message: "Session not found" });
      }

      session.status = SESSION_STATUS.REVOKED;
      await Promise.all([
        session.save(),
        redis.del(`refresh:${session.refreshToken}`),
      ]);

      return response
        .status(200)
        .json({ message: "Session revoked successfully" });
    } catch (error) {
      logger.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Revokes all other active sessions for a user, excluding the current session.
   * @param {Request} request - Express request object containing the user's email and session ID.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { message }
   * @throws {Response} 404 - User not found
   * @throws {Response} 500 - Internal server error
   */
  static async revokeAllOtherSessions(request: Request, response: Response) {
    try {
      const email = request.user?.email;
      const currentSessionId = request.sessionId;
      logger.info("Revoking other sessions");

      const user = await UserModel.findOne({ email }).select("_id");
      if (!user) {
        return response.status(404).json({ message: "User not found" });
      }
      logger.info("User found");

      const sessionsToRevoke = await SessionModel.find({
        userId: user._id,
        _id: { $ne: currentSessionId },
        status: "active",
      });

      if (sessionsToRevoke.length === 0) {
        return response.status(200).json({
          message: "No other active sessions found.",
        });
      }

      const sessionIds = sessionsToRevoke.map((s) => s._id);
      const redisKeys = sessionsToRevoke.map(
        (s) => `refresh:${s.refreshToken}`
      );

      /**
       * Revokes all other active sessions for a user, excluding the current session
       * and deletes the corresponding refresh tokens from Redis
       */
      await Promise.all([
        SessionModel.updateMany(
          { _id: { $in: sessionIds } },
          { $set: { status: "revoked" } }
        ),
        redis.del(redisKeys),
      ]);

      return response.status(200).json({
        message: `Successfully revoked ${sessionsToRevoke.length} other sessions.`,
      });
    } catch (error) {
      logger.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }
}
