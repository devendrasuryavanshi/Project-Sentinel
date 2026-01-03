import { Request, Response } from "express";
import { UserModel } from "../models/user.model";
import { SessionModel } from "../models/session.model";
import { EnvConfig } from "../config/env.config";
import redis from "../database/redis.connection";
import { SESSION_STATUS } from "../config/constants";

export class AdminController {
  /**
   * Retrieves all users from the database, with the ability to search and paginate.
   * The response will contain an array of users with the following properties:
   * - email: string
   * - role: string
   * - riskScore: number
   * - createdAt: Date
   * - isVerified: boolean
   * - activeSessionCount: number
   * The response will also contain pagination information, including the total number of users, the number of pages, and the current page and limit.
   * @param {Request} request - Express request object containing the page, limit, and search query.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { users, pagination: { total, pages, page, limit } }
   */
  static async getAllUsers(request: Request, response: Response) {
    try {
      const page = parseInt(request.query.page as string) || 1;
      const limit = parseInt(request.query.limit as string) || 10;
      const search = (request.query.search as string) || "";
      const skip = (page - 1) * limit;

      const matchStage: any = {};
      if (search) {
        matchStage.email = { $regex: search, $options: "i" };
      }

      /**
       * Fetches all users from the database, with the ability to search and paginate.
       * The response will contain an array of users with the following properties:
       * - email: string
       * - role: string
       * - riskScore: number
       * - createdAt: Date
       * - isVerified: boolean
       * - activeSessionCount: number
       * The response will also contain pagination information, including the total number of users, the number of pages, and the current page and limit.
       */
      const [users, total] = await Promise.all([
        UserModel.aggregate([
          { $match: matchStage },
          {
            $lookup: {
              from: "sessions",
              localField: "_id",
              foreignField: "userId",
              pipeline: [{ $match: { status: "active" } }],
              as: "activeSessions",
            },
          },
          {
            $project: {
              email: 1,
              role: 1,
              riskScore: 1,
              createdAt: 1,
              isVerified: 1,
              activeSessionCount: { $size: "$activeSessions" },
            },
          },
          { $sort: { riskScore: -1, createdAt: -1 } }, // High risk first
          { $skip: skip },
          { $limit: limit },
        ]),
        UserModel.countDocuments(matchStage),
      ]);
      return response.status(200).json({
        users,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page,
          limit,
        },
      });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Retrieves all sessions for a given user, with the ability to filter by active or inactive/revoked sessions.
   * The response will contain an array of sessions with the following properties:
   * - _id: string
   * - userId: string
   * - refreshToken: string
   * - ipLastSeen: string
   * - location: string
   * - lastActiveAt: Date
   * - status: string
   * - userAgent: string
   * @param {Request} request - Express request object containing the user ID and session type.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { sessions }
   */
  static async getUserSessions(request: Request, response: Response) {
    try {
      const { userId } = request.params;
      const { type } = request.query;

      const filter: any = { userId };
      if (type === "active") {
        filter.status = "active";
      } else {
        filter.status = { $in: ["inactive", "revoked"] };
      }

      const sessions = await SessionModel.find(filter)
        .sort({ lastActiveAt: -1 })
        .limit(1000);

      return response.status(200).json({ sessions });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Revokes a user session based on the provided session ID.
   * If the session ID matches the current session, an error is returned.
   * If the session belongs to an admin user, an error is returned.
   * @param {Request} request - Express request object containing the session ID.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { message }
   */
  static async revokeSession(request: Request, response: Response) {
    try {
      const { sessionId } = request.params;
      if (sessionId && sessionId === request.sessionId) {
        return response
          .status(400)
          .json({ message: "You cannot revoke your own session" });
      }

      const session = await SessionModel.findById(sessionId).select(
        "userId refreshToken"
      );
      if (!session) {
        return response.status(404).json({ message: "Session not found" });
      }

      /**
       * if the user is an admin and cannot be revoked
       */
      const user = await UserModel.findById(session.userId);
      if (
        user &&
        (user.email === EnvConfig.SUPER_ADMIN_EMAIL || user?.role === "admin")
      ) {
        return response
          .status(400)
          .json({ message: "Cannot revoke Admin's session" });
      }

      if (user && user.email === request.user?.email) {
        return response
          .status(400)
          .json({ message: "You cannot revoke your own session" });
      }

      /**
       * Revoke the session
       * Delete the refresh token from Redis
       */
      Promise.all([
        SessionModel.updateOne(
          { _id: sessionId },
          {
            status: "revoked",
          }
        ),
        redis.del(`refresh:${session?.refreshToken}`),
      ]);

      return response.status(200).json({ message: "Session revoked by Admin" });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Revokes all active sessions for a given user.
   * If the user is an admin, a 400 status code and an error message are returned.
   * @param {Request} request - Express request object containing the user ID.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { message }
   * @throws {Response} 400 - User is an admin
   */
  static async revokeAllUserSessions(request: Request, response: Response) {
    try {
      const { userId } = request.params;
      const user = await UserModel.findById(userId);
      if (
        user &&
        (user.email === EnvConfig.SUPER_ADMIN_EMAIL || user?.role === "admin")
      ) {
        return response
          .status(400)
          .json({ message: "Cannot revoke Admin's sessions" });
      }

      const sessions = await SessionModel.find({
        userId,
        status: SESSION_STATUS.ACTIVE,
      }).select("_id refreshToken");

      /**
       * Revoke the sessions
       * Delete the refresh tokens from Redis
       */
      await Promise.all([
        SessionModel.updateMany(
          { userId, status: SESSION_STATUS.ACTIVE },
          { $set: { status: SESSION_STATUS.REVOKED } }
        ),

        redis.del(
          sessions
            .filter((s) => s.refreshToken)
            .map((s) => `refresh:${s.refreshToken}`)
        ),
      ]);

      return response
        .status(200)
        .json({ message: "All sessions revoked for user" });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Updates a user's role.
   * Only the Super Admin can call this endpoint.
   * If the user is not found, a 404 error is returned.
   * If the user is the Super Admin, a 400 error is returned.
   * If there is an internal server error, a 500 error is returned.
   * @param {Request} request - Express request object containing the user ID and role.
   * @param {Response} response - Express response object.
   * @returns {Promise<Response>} JSON: { message }
   */
  static async updateUserRole(request: Request, response: Response) {
    try {
      const { userId } = request.params;
      const { role } = request.body;

      const requester = await UserModel.findOne({ email: request.user?.email });

      /**
       * Only the Super Admin can call this endpoint
       */
      if (requester?.email !== EnvConfig.SUPER_ADMIN_EMAIL) {
        return response.status(403).json({ message: "Unauthorized" });
      }

      const targetUser = await UserModel.findById(userId);
      if (!targetUser) {
        return response.status(404).json({ message: "User not found" });
      }

      if (targetUser.email === EnvConfig.SUPER_ADMIN_EMAIL) {
        return response
          .status(400)
          .json({ message: "Cannot change Super Admin's role" });
      }

      targetUser.role = role;
      await targetUser.save();

      return response
        .status(200)
        .json({ message: `User role updated to ${role}` });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }
}
