import { Request } from "express";

/**
 * Extracts the client's IP address from the given Express Request object.
 * First, it checks the "X-Forwarded-For" header and returns the first IP address in the list.
 * If that header is not present, it checks the "X-Real-IP" header and returns the IP address.
 * If neither of those headers are present, it returns the IP address from the Request object itself.
 * If none of the above methods return a valid IP address, it returns "0.0.0.0" by default.
 * @param {Request} request - The Express Request object.
 * @returns {string} The client's IP address.
 */
export const extractClientIpAddress = (request: Request): string => {
  const xForwardedFor = request.headers["x-forwarded-for"];
  const xRealIp = request.headers["x-real-ip"];

  const forwardedIp = Array.isArray(xForwardedFor)
    ? xForwardedFor[0]
    : typeof xForwardedFor === "string"
    ? xForwardedFor.split(",")[0]?.trim()
    : undefined;

  const realIp = typeof xRealIp === "string" ? xRealIp : undefined;
  const socketIp = request.ip;

  return forwardedIp || realIp || socketIp || "0.0.0.0";
};