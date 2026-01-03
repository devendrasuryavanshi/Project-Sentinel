import { Request, Response, NextFunction } from "express";
import {
  generateDeviceFingerprint,
  generateFingerprintUsingClientAndDeviceFingerprints,
  generateRandomToken,
  hashToken,
} from "../utils/crypto.utils";
import { EnvConfig } from "../config/env.config";

/**
 * Fingerprint middleware that generates a unique identifier for each client based on
 * client-side information such as browser name, OS name, raw user-agent, accept-language,
 * accept-encoding, viewport-width, time-zone, and x-forwarded-for headers.
 *
 * The middleware sets a cookie named "clientFingerprint" with the generated fingerprint and
 * attaches the fingerprint to the request object.
 *
 * If the clientFingerprint cookie is present, the middleware assumes that the client has
 * already been fingerprinted and skips the generation step.
 *
 * @param request - Express request object
 * @param response - Express response object
 * @param next - Express next function
 * @returns {Promise<void>} A promise that resolves when the middleware has finished executing
 */
export const fingerprintMiddleware = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const clientFingerprint =
    request.cookies.clientFingerprint || hashToken(generateRandomToken(32));
  const deviceFingerprint = generateDeviceFingerprint(request);
  const fingerprint = generateFingerprintUsingClientAndDeviceFingerprints(
    clientFingerprint,
    deviceFingerprint
  );

  request.fingerprint = fingerprint;

  if (request.cookies.clientFingerprint) {
    return next();
  }
  response.cookie("clientFingerprint", clientFingerprint, {
    httpOnly: true,
    secure: EnvConfig.NODE_ENV === "production",
    sameSite: "lax",
  });

  next();
};
