import dotenv from 'dotenv';
dotenv.config();

export class EnvConfig {
  public static readonly PORT = process.env.PORT || 5000;
  public static readonly MONGO_URI = process.env.MONGO_URI as string;
  public static readonly CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
}