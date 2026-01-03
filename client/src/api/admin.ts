import { client } from "./client";

export const adminApi = {
  getAllUsers: async (page = 1, search = "") => {
    const response = await client.get(
      `/admin/users?page=${page}&limit=20&search=${search}`
    );
    return response.data;
  },

  getUserSessions: async (
    userId: string,
    type: "active" | "history" = "active"
  ) => {
    const response = await client.get(
      `/admin/users/${userId}/sessions?type=${type}`
    );
    return response.data;
  },

  updateUserRole: async (userId: string, role: "user" | "admin") => {
    const response = await client.patch(`/admin/users/${userId}/role`, {
      role,
    });
    return response.data;
  },

  revokeSession: async (sessionId: string) => {
    const response = await client.delete(`/admin/sessions/${sessionId}`);
    return response.data;
  },

  revokeAllUserSessions: async (userId: string) => {
    const response = await client.delete(`/admin/users/${userId}/sessions`);
    return response.data;
  },
};
