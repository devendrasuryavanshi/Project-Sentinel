import { RISK } from "../config/constants";
import redis from "../database/redis.connection";
import { buildSuspiciousLoginEmail } from "../helpers/email-templates/suspicious-login.template";
import { SessionModel } from "../models/session.model";
import { UserModel } from "../models/user.model";
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
  const ipRiskKey = `risk:ip:${ip}`;
  const ipRisk = await redis.incr(ipRiskKey);
  if (ipRisk === 1) {
    await redis.expire(ipRiskKey, RISK.IP_VELOCITY_WINDOW_SECONDS);
  }
  if (ipRisk > RISK.IP_VELOCITY_THRESHOLD) {
    score += RISK.SCORE_IP_VELOCITY;
  }

  // fingerprint velocity
  const fingerprintRiskKey = `risk:fingerprint:${fingerprint}`;
  const fingerprintRisk = await redis.incr(fingerprintRiskKey);
  if (fingerprintRisk === 1) {
    await redis.expire(fingerprintRiskKey, RISK.NEW_DEVICE_WINDOW_SECONDS);
  }
  if (fingerprintRisk > RISK.NEW_DEVICE_THRESHOLD) {
    score += RISK.SCORE_FINGERPRINT_VELOCITY;
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
  const lastSession = await SessionModel.findOne({ userId })
    .sort({ lastActiveAt: -1 })
    .select("ipLastSeen location lastActiveAt");
  if (lastSession && lastSession.ipLastSeen !== ip) {
    if (lastSession.location.country !== geo.country) {
      score += RISK.SCORE_GEO_JUMP;
    }

    const metrics = calculateTravelMetrics(
      lastSession.location.latitude,
      lastSession.location.longitude,
      geo.latitude,
      geo.longitude,
      lastSession.lastActiveAt,
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
  const user = await UserModel.findById(userId).select("riskScore");
  if (user && user.riskScore > RISK.USER_RISK_SCORE_MAX) {
    score += RISK.SCORE_USER_RISK;
  }

  return { score, requiresOtp: score > RISK.OTP_SCORE_THRESHOLD };
};
