import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi } from "../api/auth";

interface User {
  id: string;
  email: string;
  role: "user" | "admin";
  riskScore?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await authApi.logout();
          set({ user: null, isAuthenticated: false });
          localStorage.removeItem("auth-storage");
        } catch (error) {
          console.error("Logout failed at server level:", error);
          throw error;
        }
      },
    }),
    {
      name: "auth-storage", // unique name in localStorage
      storage: createJSONStorage(() => localStorage), // uses localStorage
    }
  )
);
