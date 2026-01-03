import { create } from "zustand";
import { authApi } from "../api/auth";

interface User {
  email: string;
  role: "user" | "admin";
  riskScore?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  login: (user: User) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,

  /**
   * Hydrates the auth store by making a request to the /me endpoint.
   * If the request is successful, the user data is stored in the store and
   * isAuthenticated is set to true.
   * If the request fails, the attempts counter is incremented and the request
   * is retried up to a maximum of 2 attempts.
   * If all attempts fail, the user data is set to null and isAuthenticated is set to false.
   * @returns {Promise<void>} A promise that resolves when the store has been hydrated.
   */
  hydrate: async () => {
    if (get().user) return;

    let attempts = 0;

    while (attempts < 2) {
      try {
        const data = await authApi.me();
        set({ user: data, isAuthenticated: true });
        return;
      } catch {
        attempts++;
      }
    }

    set({ user: null, isAuthenticated: false });
  },

  login: (user: User) => {
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null, isAuthenticated: false });
  },
}));
