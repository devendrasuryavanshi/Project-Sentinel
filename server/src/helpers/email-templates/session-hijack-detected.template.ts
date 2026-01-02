export interface SessionHijackDetectedEmailParams {
  userEmail: string;
  ipAddress: string;
  deviceName: string;
  detectedAt: Date;
}

/**
 * Builds a security alert email notifying the user that a session
 * hijacking attempt was detected and automatically blocked.
 *
 * The email clearly explains:
 * - What suspicious behavior was detected
 * - What automatic action was taken
 * - What the user should do if this was not them
 *
 * @param params - Session hijack detection context
 * @returns Email subject and HTML body
 */
export const buildSessionHijackDetectedEmail = ({
  userEmail,
  ipAddress,
  deviceName,
  detectedAt,
}: SessionHijackDetectedEmailParams) => {
  const subject = "Security Alert: Suspicious Session Blocked";

  const formattedTime = detectedAt.toUTCString();

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color: #d93025;">Suspicious Session Activity Blocked</h2>

    <p>
      We detected activity on your account that did not match the device
      previously used to sign in.
    </p>

    <p>
      To protect your account, the session was immediately signed out.
    </p>

    <p><strong>Details:</strong></p>
    <table style="border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Account:</td>
        <td style="padding: 4px 8px;">${userEmail}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">IP Address:</td>
        <td style="padding: 4px 8px;">${ipAddress}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Device:</td>
        <td style="padding: 4px 8px;">${deviceName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Time:</td>
        <td style="padding: 4px 8px;">${formattedTime}</td>
      </tr>
    </table>

    <p>
      <strong>If this was not you:</strong>
      <ul>
        <li>Review your recent account activity</li>
        <li>Sign out of all devices</li>
      </ul>
    </p>

    <p>
      If you recognize this activity, no further action is required.
      We automatically blocked the session to keep your account secure.
    </p>

    <p style="margin-top: 20px;">
      Stay secure,<br />
      Sentinel Security Team
    </p>
  </div>
  `;

  return { subject, html };
};
