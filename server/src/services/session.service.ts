import redis from "../database/redis.connection";
import { SessionModel } from "../models/session.model";
import { GeoLocation } from "../types/global";
import { hashToken } from "../utils/crypto.utils";

/**
 * Creates a new session for a given user.
 * If the user has more than 5 inactive sessions, the oldest inactive sessions are updated to expire within 24 hours or at the 90-day mark.
 * The new session is inserted into the database with a TTL of 15 minutes.
 * A Redis entry is created to cache the session ID for 15 minutes.
 * @param {string} userId - The ID of the user.
 * @param {string} ipAddress - The IP address of the user.
 * @param {string} userAgent - The User-Agent of the user.
 * @param {string} deviceFingerprint - The device fingerprint of the user.
 * @param {GeoLocation} geoLocation - The geo location of the user.
 * @param {string} refreshToken - The refresh token of the user.
 * @param {boolean} isLegacy - Whether the session is a legacy session.
 * @returns {Promise<ISession>} The newly created session.
 */
export const createUserSession = async (
  userId: string,
  ipAddress: string,
  userAgent: string,
  deviceFingerprint: string,
  geoLocation: GeoLocation,
  refreshToken: string,
  isLegacy: boolean = false
) => {
  const inactiveSessions = await SessionModel.find({ userId, status: "inactive" })
    .sort({ lastActiveAt: -1 });

  if (inactiveSessions.length > 5) {
    const sessionsOverflow = inactiveSessions.slice(4); 

    for (const session of sessionsOverflow) {
      const lastActiveAt = session.lastActiveAt;
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
      const timeSinceLastActive = Date.now() - new Date(lastActiveAt).getTime();

      if (timeSinceLastActive >= ninetyDaysMs) {
        // last active more than 90 days ago, delete it within 24h
        session.expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else {
        // within 90 days, TTL delete automatically at 90-day mark
        session.expireAt = new Date(new Date(lastActiveAt).getTime() + ninetyDaysMs);
      }

      await session.save();

      await redis.del(`session:${session._id}`);
    }
  }

  const newSession = await SessionModel.create({
    userId,
    ipAddress,
    userAgent,
    deviceFingerprint,
    location: geoLocation,
    refreshToken: hashToken(refreshToken),
    status: "active",
    is_legacy: isLegacy
  });

  await redis.set(`session:${newSession._id}`, "valid", "EX", 900);

  return newSession;
};

export const getActiveSessionsCount = async (userId: string): Promise<number> => {
  const count = await SessionModel.countDocuments({ userId, status: "active" });
  return count;
}
