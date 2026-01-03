import { EnvConfig } from "../../config/env.config";

interface SessionInfo {
  deviceName: string;
  ip: string;
  location: string;
  lastActive: string;
  revokeToken: string;
}

export const buildSessionLimitEmail = (sessions: SessionInfo[]) => {
  const sessionListHtml = sessions
    .map(
      (s) => `
    <div style="
      border: 1px solid #e0e0e0;
      background: #ffffff;
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 8px;
    ">
      <div style="
        color: #202124;
        font-weight: 500;
        font-size: 15px;
        margin-bottom: 4px;
      ">
        ${s.deviceName}
      </div>

      <div style="
        color: #5f6368;
        font-size: 12px;
        margin-bottom: 12px;
      ">
        ${s.location} • ${s.ip} • Active ${s.lastActive}
      </div>

      <a href="${EnvConfig.API_URL}/user/auth/revoke-via-email?token=${s.revokeToken}"
         style="
           background: #d93025;
           color: #ffffff;
           text-decoration: none;
           padding: 8px 14px;
           border-radius: 4px;
           font-size: 12px;
           font-weight: 500;
           display: inline-block;
         ">
        Revoke Session
      </a>
    </div>
  `
    )
    .join("");

  return {
    subject: "Action Required: Session Limit Reached",
    html: `
      <div style="
        font-family: Arial, Helvetica, sans-serif;
        background: #f8f9fa;
        color: #202124;
        padding: 24px;
      ">
        <div style="
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        ">
          <h2 style="color: #1a73e8; margin-top: 0;">
            Device Limit Reached
          </h2>

          <p style="font-size: 14px; color: #3c4043;">
            You tried to sign in, but you’ve reached the maximum number of active sessions.
          </p>

          <p style="font-size: 14px; color: #3c4043;">
            To continue, please revoke one of your existing sessions below.
          </p>

          <p style="color: #d93025; font-size: 12px; margin-top: 8px;">
            These links expire in 2 minutes for security reasons.
          </p>

          <div style="margin-top: 24px;">
            ${sessionListHtml}
          </div>

          <p style="
            margin-top: 24px;
            font-size: 12px;
            color: #5f6368;
          ">
            If you don’t recognize any of these sessions, revoke them immediately
            and consider changing your password.
          </p>
        </div>
      </div>
    `,
  };
};
