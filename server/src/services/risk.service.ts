import { RISK } from "../config/constants";
import redis from "../database/redis.connection";
import { buildSuspiciousLoginEmail } from "../helpers/email-templates/suspicious-login.template";
import { SessionModel } from "../models/session.model";
import {
  calculateTravelMetrics,
  getGeoLocationFromIp,
} from "../utils/geo.utils";
import { sendEmail } from "./email.service";

export interface RiskResult {
  score: number;
  requiresOtp: boolean;
}

/**
 * Evaluate the risk of a login attempt.
 * Risk scoring rules:
 * - IP velocity: +80 if IP is seen more than 5 times in 10 minutes
 * - New device: +30 if device fingerprint not seen before
 * - Geo-jump: +50 if country changes
 * - Impossible travel: +100 if speed exceeds 800 km/h
 * - OTP required if score > 40
 *
 * @param {string} userId - The ID of the user
 * @param {string} userEmail - The email of the user
 * @param {string} ip - The IP address of the login attempt
 * @param {string} fingerprint - The device fingerprint of the login attempt
 * @param {string} userAgent - The User-Agent of the login attempt
 *
 * @returns {Promise<RiskResult>}
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
  if (count === 1) {
    await redis.expire(key, RISK.IP_VELOCITY_WINDOW_SECONDS);
  }
  if (count > RISK.IP_VELOCITY_THRESHOLD) {
    score += RISK.SCORE_IP_VELOCITY;
  }

  // new device
  const hasDevice = await SessionModel.findOne({
    userId,
    fingerprint,
  });
  if (!hasDevice) {
    score += RISK.SCORE_NEW_DEVICE;
  }

  // geo-jump
  const last = await SessionModel.findOne({ userId }).sort({
    lastActiveAt: -1,
  });
  if (last && last.ipLastSeen !== ip) {
    if (last.location.country !== geo.country) {
      score += RISK.SCORE_GEO_JUMP;
    }

    const metrics = calculateTravelMetrics(
      last.location.latitude,
      last.location.longitude,
      geo.latitude,
      geo.longitude,
      last.lastActiveAt,
      new Date()
    );

    if (metrics.travelSpeedKilometersPerHour >= RISK.MAX_TRAVEL_SPEED_KMPH) {
      score += RISK.SCORE_IMPOSSIBLE_TRAVEL;
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

  return { score, requiresOtp: score > RISK.OTP_SCORE_THRESHOLD };
};
