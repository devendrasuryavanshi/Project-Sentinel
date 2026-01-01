import Redis from "ioredis";
import { EnvConfig } from "../config/env.config";

export class RedisConnection {
  private static instance: Redis;
  
  public static getInstance(): Redis {
    if (!this.instance) {
      this.instance = new Redis(EnvConfig.REDIS_URL);
      this.instance.on("connect", () => console.log("✅ Redis Connected"));
      this.instance.on("error", (err) => console.error("❌ Redis Error: ", err));
    }
    return this.instance;
  }
}
