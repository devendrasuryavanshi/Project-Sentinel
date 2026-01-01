import redis from "../database/redis.connection";
import { buildSuspiciousLoginEmail } from "../helpers/email-templates/suspicious-login.template";
import { SessionModel } from "../models/session.model";
import { calculateTravelMetrics, getGeoLocationFromIp } from "../utils/geo.utils";
import { sendEmail } from "./email.service";

export interface RiskResult {
  score: number;
  requiresOtp: boolean;
}

/**
 * Evaluate the risk of a login attempt.
 * @param {string} userId - The ID of the user.
 * @param {string} userEmail - The email of the user.
 * @param {string} ip - The IP address of the login attempt.
 * @param {string} fingerprint - The device fingerprint of the login attempt.
 * @param {string} userAgent - The User-Agent of the login attempt.
 * @returns {Promise<RiskResult>} - A promise resolving to an object containing the risk score and whether an OTP is required.
 * The risk score is calculated based on the following factors:
 * - IP velocity (80 points if the IP has been seen more than 5 times in the past 10 minutes)
 * - New device (30 points if the device has not been seen before)
 * - Geo-jump (50 points if the login attempt is from a different country than the previous login attempt)
 * - Travel speed (100 points if the travel speed between the previous and current login attempts is greater than 800 km/h)
 * If the risk score is greater than 40, an OTP is required.
 */
export const evaluateLoginRisk = async (
  userId: string,
  userEmail: string,
  ip: string,
  fingerprint: string,
  userAgent: string
): Promise<RiskResult> => {
  let score = 0;
  const geo = await getGeoLocationFromIp(ip);

  // IP velocity
  const key = `risk:ip:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 600);
  if (count > 5) score += 80;

  // new device
  const hasDevice = await SessionModel.findOne({ userId, deviceFingerprint: fingerprint });
  if (!hasDevice) score += 30;

  // geo-jump
  const last = await SessionModel.findOne({ userId }).sort({ lastActiveAt: -1 });
  if (last && last.ipAddress !== ip) {
    if (last.location.country !== geo.country) score += 50;

    const metrics = calculateTravelMetrics(
      last.location.latitude,
      last.location.longitude,
      geo.latitude,
      geo.longitude,
      last.lastActiveAt,
      new Date()
    );

    if (metrics.travelSpeedKilometersPerHour >= 800) {
      score += 100;
      const content = buildSuspiciousLoginEmail({
        userEmail,
        ipAddress: ip,
        city: geo.city,
        country: geo.country,
        deviceName: userAgent,
        loginTime: new Date(),
        distanceKm: metrics.distanceInKilometers,
        travelSpeedKmPerHour: metrics.travelSpeedKilometersPerHour,
      });
      await sendEmail(userEmail, content.subject, content.html);
    }
  }

  return { score, requiresOtp: score > 40 };
};
