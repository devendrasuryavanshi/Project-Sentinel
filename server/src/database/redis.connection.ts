import Redis from "ioredis";
import { EnvConfig } from "../config/env.config";
import { logger } from "../utils/logger";

const redis = new Redis(EnvConfig.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("connect", () => logger.info("✅ Redis Connected"));
redis.on("error", (err) => logger.error("❌ Redis Error: " + err));

export default redis;
