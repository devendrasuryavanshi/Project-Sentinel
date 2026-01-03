import { client } from "./client";

export const userApi = {

  revokeAllOtherSessions: async () => {
    const response = await client.delete("/user/sessions/others");
    return response.data;
  },
};
