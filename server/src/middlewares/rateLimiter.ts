import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import crypto from "crypto";
import { extractClientIpAddress } from "../utils/network.utils";
import { AUTH, RATE_LIMIT } from "../config/constants";

/**
 * Rate limiter middleware for API endpoints.
 * 
 * Enforces rate limiting based on a combination of client IP address, user agent,
 * and accept-language headers to create a unique identifier for each client.
 * 
 * @remarks
 * - Uses SHA256 hashing to create a consistent identifier from multiple request headers
 * - Returns a 429 (Too Many Requests) status when the rate limit is exceeded
 * - Configured via RATE_LIMIT constants for window duration and max requests
 * 
 * @returns {import('express-rate-limit').RateLimitRequestHandler} Express middleware function
 */
export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT.API_WINDOW_MS,
  max: RATE_LIMIT.API_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request: Request) => {
    const clientIpAddress = extractClientIpAddress(request);

    const userAgentHeader =
      request.headers["user-agent"] ?? AUTH.UNKNOWN_USER_AGENT;

    const acceptLanguageHeader =
      request.headers["accept-language"] ?? AUTH.UNKNOWN_ACCEPT_LANGUAGE;

    const rateLimitIdentitySource = [
      clientIpAddress,
      userAgentHeader,
      acceptLanguageHeader,
    ].join("|");

    return crypto
      .createHash("sha256")
      .update(rateLimitIdentitySource)
      .digest("hex");
  },
  handler: (_request: Request, response: Response) => {
    response.status(429).json({
      message: "Too many requests. Try again later.",
    });
  },
});
