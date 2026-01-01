interface SuspiciousLoginEmailParams {
  userEmail: string;
  ipAddress: string;
  city: string;
  country: string;
  deviceName: string;
  loginTime: Date;
  distanceKm: number;
  travelSpeedKmPerHour: number;
}

export const buildSuspiciousLoginEmail = ({
  userEmail,
  ipAddress,
  city,
  country,
  deviceName,
  loginTime,
  distanceKm,
  travelSpeedKmPerHour,
}: SuspiciousLoginEmailParams) => {
  const subject = "Security Alert: Suspicious Sign-In Detected";

  const formattedLoginTime = loginTime.toUTCString();

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color: #d93025;">Suspicious Login Attempt Blocked</h2>
    <p>We detected an attempt to access your account that appears unusual.</p>

    <p><strong>What happened:</strong></p>
    <ul>
      <li>A login request occurred from a new location.</li>
      <li>The travel speed between your last session and this request exceeded safe limits (${travelSpeedKmPerHour.toFixed(
        2
      )} km/h).</li>
      <li>The request was automatically blocked to protect your account.</li>
    </ul>

    <p><strong>Details of the blocked attempt:</strong></p>
    <table style="border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Email:</td>
        <td style="padding: 4px 8px;">${userEmail}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">IP Address:</td>
        <td style="padding: 4px 8px;">${ipAddress}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Location:</td>
        <td style="padding: 4px 8px;">${city}, ${country}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Device:</td>
        <td style="padding: 4px 8px;">${deviceName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Time:</td>
        <td style="padding: 4px 8px;">${formattedLoginTime}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Distance from last known session:</td>
        <td style="padding: 4px 8px;">${distanceKm.toFixed(2)} km</td>
      </tr>
    </table>

    <p>
      If this was <strong>not you</strong>, we strongly recommend:
      <ul>
        <li>Reviewing your active sessions</li>
      </ul>
    </p>

    <p>
      If this <strong>was you</strong>, you can safely ignore this email.
      We sent another email with one time password (OTP) to complete your login.  
      Your account remains protected and the login was blocked for security.
    </p>

    <p style="margin-top: 20px;">Stay safe,<br />Sentinel Security Team</p>
  </div>
  `;

  return { subject, html };
};
