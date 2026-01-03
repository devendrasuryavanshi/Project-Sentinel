export interface OtpFingerprintMismatchEmailParams {
  userEmail: string;
  ipAddress: string;
  deviceName: string;
  detectedAt: Date;
}

export const buildOtpFingerprintMismatchEmail = ({
  userEmail,
  ipAddress,
  deviceName,
  detectedAt,
}: OtpFingerprintMismatchEmailParams) => {
  const subject = "Security Alert: OTP Verification Blocked";

  const formattedTime = detectedAt.toUTCString();

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color: #d93025;">OTP Verification Blocked</h2>

    <p>
      We detected an attempt to verify a one-time password (OTP) from a device
      different from the one where the OTP was originally requested.
    </p>

    <p>
      For your security, this verification attempt was <strong>blocked automatically</strong>.
      OTPs are device-bound and cannot be used across different devices.
    </p>

    <p><strong>Detection details:</strong></p>
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
        <li>Do not share OTPs with anyone</li>
        <li>Review recent login activity</li>
      </ul>
    </p>

    <p>
      If this was you, please retry the login from the same device
      where the OTP was originally requested.
    </p>

    <p style="margin-top: 20px;">
      Stay secure,<br />
      Sentinel Security Team
    </p>
  </div>
  `;

  return { subject, html };
};
