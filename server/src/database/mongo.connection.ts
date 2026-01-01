import mongoose from 'mongoose';
import { EnvConfig } from '../config/env.config';

export class MongoConnection {
  public static async connect(): Promise<void> {
    try {
      await mongoose.connect(EnvConfig.MONGO_URI);
      console.log('✅ MongoDB Connected');
    } catch (error) {
      console.error('❌ MongoDB Connection Error:', error);
      process.exit(1);
    }
  }
}