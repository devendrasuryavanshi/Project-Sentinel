import dotenv from 'dotenv';
dotenv.config();

export class EnvConfig {
  public static readonly PORT = process.env.PORT || 5000;
  public static readonly MONGO_URI = process.env.MONGO_URI as string;
  public static readonly REDIS_URL = process.env.REDIS_URL as string;
  public static readonly JWT_SECRET = process.env.JWT_SECRET as string;
  public static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
  public static readonly SALT = process.env.SALT as string;
  public static readonly EMAIL_USER = process.env.EMAIL_USER as string;
  public static readonly EMAIL_PASS = process.env.EMAIL_PASS as string;
  public static readonly CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
  public static readonly API_URL = process.env.API_URL || 'http://localhost:5000';
  public static readonly SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "devendrasooryavanshee@gmail.com";
  public static readonly NODE_ENV = process.env.NODE_ENV || 'development';
}