import redis from "../database/redis.connection";
import { ISession, SessionModel } from "../models/session.model";
import { GeoLocation } from "../types/global";
import { hashToken } from "../utils/crypto.utils";
import { TIME, SESSION, SESSION_STATUS } from "../config/constants";
import { getGeoLocationFromIp } from "../utils/geo.utils";

/**
 * Creates a new session for a given user.
 * If the user has more than 5 inactive sessions, the oldest inactive sessions
 * are updated to expire within 24 hours or at the 90-day mark.
 * A Redis entry is created to cache session activity for 15 minutes.
 *
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
  const inactiveSessions = await SessionModel.find({
    userId,
    status: SESSION_STATUS.INACTIVE,
  }).sort({ lastActiveAt: -1 });

  /**
   * If the user has more than 5 inactive sessions, the oldest inactive sessions
   * are updated to expire within 24 hours or at the 90-day mark.
   */
  if (inactiveSessions.length > SESSION.MAX_INACTIVE_SESSIONS) {
    const sessionsOverflow = inactiveSessions.slice(4);

    for (const session of sessionsOverflow) {
      const lastActiveAt = session.lastActiveAt;
      const retentionMs = SESSION.INACTIVE_RETENTION_DAYS * TIME.DAY; // 90 days

      const timeSinceLastActive = Date.now() - new Date(lastActiveAt).getTime();

      /**
       * Set expireAt to either 1 day from now or the original retention date, whichever is sooner.
       */
      session.expireAt =
        timeSinceLastActive >= retentionMs
          ? new Date(Date.now() + SESSION.EXPIRE_SOON_DAYS * TIME.DAY)
          : new Date(new Date(lastActiveAt).getTime() + retentionMs);

      await session.save();
      if (session.refreshToken) {
        await redis.del(`refresh:${session.refreshToken}`);
      }
    }
  }

  const refreshTokenHash = hashToken(refreshToken);
  const refreshKey = `refresh:${refreshTokenHash}`;
  const newSession = await SessionModel.create({
    userId,
    userAgent,
    deviceFingerprint,
    ipFirstSeen: ipAddress,
    ipLastSeen: ipAddress,
    ipChangeCount: 0,
    location: geoLocation,
    refreshToken: refreshTokenHash,
    refreshTokenExpiry: new Date(
      Date.now() + SESSION.REFRESH_TOKEN_EXPIRES_DAYS * TIME.DAY
    ),
    status: SESSION_STATUS.ACTIVE,
    is_legacy: isLegacy,
  });

  await redis.set(
    refreshKey,
    JSON.stringify({
      sessionId: newSession._id.toString(),
      deviceFingerprint,
      ipLastSeen: ipAddress,
      ipLastChangedAt: null,
      lastActiveAt: Date.now(),
    }),
    "EX",
    SESSION.REDIS_TTL_SECONDS
  );

  return newSession;
};

/**
 * Retrieves the count of active sessions for a given user.
 * An active session is defined as a session with a status of "active".
 * @param {string} userId - The ID of the user.
 * @returns {Promise<number>} The count of active sessions.
 */
export const getActiveSessionsCount = async (
  userId: string
): Promise<number> => {
  return SessionModel.countDocuments({
    userId,
    status: SESSION_STATUS.ACTIVE,
  });
};

/**
 * Verifies a refresh token and synchronizes session activity across Redis and MongoDB.
 *
 * - Uses `refresh:{hashedRefreshToken}` as the Redis key for fast validation and activity tracking.
 * - Redis TTL is treated as the primary authority for refresh token validity.
 * - Falls back to MongoDB lookup only when Redis cache is missing.
 * - Refreshes Redis activity using a sliding TTL capped by the remaining refresh
 *   token lifetime to prevent token resurrection.
 * - MongoDB is updated only when required (IP change or stale activity window).
 * - If the refresh token is expired, the session is marked INACTIVE in MongoDB
 *   and the Redis entry is deleted.
 *
 * @param {string} refreshToken - Hashed refresh token identifying the session.
 * @param {string} currentIp - Current client IP address.
 * @returns {Promise<boolean>} Resolves to true if the refresh token is valid and active,
 * false if the token or session is invalid or expired.
 */
export const verifyAndUpdateSessionActivity = async (
  refreshToken: string,
  currentIp: string
): Promise<boolean> => {
  const redisKey = `refresh:${refreshToken}`;
  const now = Date.now();

  // Attempt to resolve session from Redis first; fall back to MongoDB if cache is missing
  const cached = await redis.get(redisKey);
  let session;
  if (!cached) {
    session = await SessionModel.findOne(
      {
        refreshToken,
        status: SESSION_STATUS.ACTIVE,
      },
      {
        sessionId: 1,
        refreshTokenExpiry: 1,
        deviceFingerprint: 1,
        ipLastSeen: 1,
        ipLastChangedAt: 1,
        lastActiveAt: 1,
      }
    ).lean();
  } else {
    session = cached ? JSON.parse(cached) : null;
  }

  // No active session found
  if (!session) {
    return false;
  }

  let shouldUpdateDb = false;
  let ipChanged = false;

  // Determine whether MongoDB requires an update
  ipChanged = session.ipLastSeen !== currentIp;

  if (
    !session.lastActiveAt ||
    now - session.lastActiveAt > SESSION.ACTIVITY_DB_UPDATE_INTERVAL_MS
  ) {
    shouldUpdateDb = true;
  }

  // Calculate remaining refresh token lifetime
  const remainingSeconds = Math.floor(
    (new Date(session.refreshTokenExpiry).getTime() - now) / 1000
  );

  // Refresh token expired: revoke session in both Redis and MongoDB
  if (remainingSeconds <= 0) {
    await redis.del(redisKey);
    await SessionModel.findByIdAndUpdate(session.sessionId, {
      status: SESSION_STATUS.INACTIVE,
    });
    return false;
  }

  // Compute sliding Redis TTL, capped by refresh token expiry
  const ttlSeconds = Math.min(SESSION.REDIS_TTL_SECONDS, remainingSeconds);

  // Refresh Redis activity snapshot
  await redis.set(
    redisKey,
    JSON.stringify({
      sessionId: session.sessionId,
      deviceFingerprint: session.deviceFingerprint,
      ipLastSeen: currentIp,
      ipLastChangedAt: ipChanged ? now : (session.ipLastChangedAt ?? null),
      lastActiveAt: now,
    }),
    "EX",
    ttlSeconds
  );

  // Skip MongoDB update if no persistence-relevant changes occurred
  if (!shouldUpdateDb && !ipChanged) {
    return true;
  }

  const update: any = {
    lastActiveAt: new Date(now),
  };

  // Persist IP change and related metadata when applicable
  if (ipChanged) {
    const geoLocation = await getGeoLocationFromIp(currentIp);

    update.ipLastSeen = currentIp;
    update.ipLastChangedAt = new Date(now);
    update.$inc = { ipChangeCount: 1 };
    update.location = {
      city: geoLocation.city,
      country: geoLocation.country,
      latitude: geoLocation.latitude,
      longitude: geoLocation.longitude,
    };
  }

  await SessionModel.findByIdAndUpdate(session.sessionId, update);

  return true;
};
