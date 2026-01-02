import { client } from "./client";

export interface LoginPayload {
  email: string;
  password: string;
  otp?: string; // Optional, used in Step 2
}

export interface AuthResponse {
  user?: {
    id: string;
    email: string;
    role: "user" | "admin";
  };
  requireOtp?: boolean; // The signal from backend
  message?: string;
}

export const authApi = {
/**
 * Authenticates an existing user using password and optional OTP.
 * 
 * @param {LoginPayload} data - Contains email and password, with optional OTP.
 * @returns {Promise<AuthResponse>} JSON response from the backend.
 * @throws {Error} On invalid credentials, expired session, or other errors.
 */
  login: async (data: LoginPayload) => {
    const response = await client.post<AuthResponse>("/user/auth/login", data);
    return response.data;
  },

/**
 * Registers a new user, hashes their password, and sends an email OTP for verification.
 * @param {Omit<LoginPayload, "otp">} data - Contains email and password, without OTP.
 * @returns {Promise<AuthResponse>} JSON response from the backend.
 */
  register: async (data: Omit<LoginPayload, "otp">) => {
    const response = await client.post<AuthResponse>(
      "/user/auth/register",
      data
    );
    return response.data;
  },
};
