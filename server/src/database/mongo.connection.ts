import mongoose from "mongoose";
import { EnvConfig } from "../config/env.config";
import { logger } from "../utils/logger";

export const connectToMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(EnvConfig.MONGO_URI);
    logger.info("✅ MongoDB Connected");
  } catch (error) {
    logger.error("❌ MongoDB Connection Error: " + error);
    process.exit(1);
  }
};