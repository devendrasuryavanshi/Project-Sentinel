interface ImpossibleTravelActivityEmailParams {
  userEmail: string;
  previousIp: string;
  currentIp: string;
  previousLocation: string;
  currentLocation: string;
  deviceName: string;
  previousActivityTime: Date;
  currentActivityTime: Date;
  distanceKm: number;
  travelSpeedKmPerHour: number;
}

/**
 * Builds an email notifying the user about a suspicious activity–based
 * impossible travel event.
 *
 * The email explains:
 * - The detection is based on activity timestamps, not logins
 * - Why the behavior is suspicious
 * - Clear next steps if the activity was not initiated by the user
 *
 * @param params - Impossible travel activity context
 * @returns Email subject and HTML body
 */
export const buildImpossibleTravelActivityEmail = ({
  userEmail,
  previousIp,
  currentIp,
  previousLocation,
  currentLocation,
  deviceName,
  previousActivityTime,
  currentActivityTime,
  distanceKm,
  travelSpeedKmPerHour,
}: ImpossibleTravelActivityEmailParams) => {
  const subject = "Security Alert: Suspicious Activity Detected";

  const prevTime = previousActivityTime.toUTCString();
  const currTime = currentActivityTime.toUTCString();

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color: #d93025;">Suspicious Account Activity Detected</h2>

    <p>
      We detected unusual activity on your account that appears to be
      physically impossible based on recent usage patterns.
    </p>

    <p><strong>What happened:</strong></p>
    <ul>
      <li>Account activity occurred from two distant locations in a short time.</li>
      <li>The implied travel speed was ${travelSpeedKmPerHour.toFixed(
        2
      )} km/h, which exceeds safe limits.</li>
      <li>This may indicate unauthorized access or session misuse.</li>
    </ul>

    <p><strong>Activity details:</strong></p>
    <table style="border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Email:</td>
        <td style="padding: 4px 8px;">${userEmail}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Previous Activity:</td>
        <td style="padding: 4px 8px;">
          ${previousLocation} (${previousIp})<br/>
          ${prevTime}
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Current Activity:</td>
        <td style="padding: 4px 8px;">
          ${currentLocation} (${currentIp})<br/>
          ${currTime}
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Device:</td>
        <td style="padding: 4px 8px;">${deviceName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; font-weight: bold;">Distance:</td>
        <td style="padding: 4px 8px;">${distanceKm.toFixed(2)} km</td>
      </tr>
    </table>

    <p>
      <strong>If this was not you:</strong>
      <ul>
        <li>Change your password immediately</li>
        <li>Sign out of all devices</li>
        <li>Review recent account activity</li>
      </ul>
    </p>

    <p>
      If you recognize this activity, no action is required.
      We continuously monitor your account to keep it secure.
    </p>

    <p style="margin-top: 20px;">
      Stay secure,<br />
      Sentinel Security Team
    </p>
  </div>
  `;

  return { subject, html };
};
