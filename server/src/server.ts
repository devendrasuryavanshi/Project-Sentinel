import app from "./app";
import { EnvConfig } from "./config/env.config";
import { connectToMongoDB } from "./database/mongo.connection";
import redis from "./database/redis.connection";
import { logger } from "./utils/logger";
import "./types";

const startServer = async () => {
  try {
    await connectToMongoDB();
    app.listen(EnvConfig.PORT, () => {
      logger.info(`Server started on port ${EnvConfig.PORT}`);
    });
  } catch (error) {
    logger.error("Startup failed: " + error);
    process.exit(1);
  }
};

startServer();
