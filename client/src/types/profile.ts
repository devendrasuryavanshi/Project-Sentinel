export interface UserDetails {
  _id: string;
  email: string;
  role: string;
  riskScore: number;
  isVerified: boolean;
  createdAt: string;
}

export interface SessionData {
  _id: string;
  deviceName?: string;
  ipLastSeen: string;
  userAgent: string;
  location: {
    city: string;
    country: string;
  };
  lastActiveAt: string;
  createdAt: string;
  status: "active" | "inactive" | "revoked";
  isCurrent?: boolean;
}

export interface ProfileResponse {
  user: UserDetails;
  currentSession: SessionData;
  otherSessions: SessionData[];
}
