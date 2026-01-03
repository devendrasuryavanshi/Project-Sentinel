import { Request, Response } from "express";

export class UserController {
/**
 * Returns the currently authenticated user's email and role.
 *
 * @param {Request} request - Express request object.
 * @param {Response} response - Express response object.
 * @returns {Promise<Response>} A promise that resolves with the user data.
 * @throws {Error} If there is an error fetching the user data.
 */
  static async getUserForAuth(request: Request, response: Response): Promise<Response> {
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
}
