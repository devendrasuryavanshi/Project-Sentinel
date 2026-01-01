import app from "./app";
import { EnvConfig } from "./config/env.config";
import { MongoConnection } from "./database/mongo.connection";
import { RedisConnection } from "./database/redis.connection";

const start = async () => {
  try {
    await MongoConnection.connect();
    RedisConnection.getInstance();// redis init
    app.listen(EnvConfig.PORT, () => {
      console.log(`Server running on port ${EnvConfig.PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
};

start();
