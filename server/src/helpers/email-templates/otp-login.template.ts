interface OtpLoginEmailParams {
  email: string;
  otp: string;
}

export const buildLoginOtpEmailContent = ({
  email,
  otp
}: OtpLoginEmailParams) => {
  const subject = "Verify Your Sentinel Login";

  const html = `
  <div style="width:100%; background:#f5f5f5; padding:32px; font-family:Arial, Helvetica, sans-serif; color:#202124;">
    <div style="max-width:480px; margin:auto; background:#ffffff; padding:32px; border-radius:10px; border:1px solid #e0e0e0;">
      
      <div style="text-align:center; margin-bottom:24px;">
        <div style="font-size:22px; font-weight:600; color:#1a73e8;">Sentinel Security</div>
      </div>

      <p style="font-size:14px; margin:0 0 12px;">Hello, <strong>${email}</strong></p>
      <p style="font-size:14px; margin:0 0 24px; line-height:20px;">
        Someone is attempting to sign in to your Sentinel account. To continue, enter the verification code below:
      </p>

      <div style="text-align:center; margin:28px 0;">
        <div style="
          display:inline-block;
          font-size:28px;
          font-weight:700;
          letter-spacing:4px;
          color:#1a73e8;
          background:#e8f0fe;
          padding:12px 32px;
          border-radius:8px;
          border:1px solid #d2e3fc;
        ">
          ${otp}
        </div>
      </div>

      <p style="font-size:13px; color:#5f6368; margin:0 0 16px;">
        This code will expire in <strong>5 minutes</strong>.
      </p>

      <p style="font-size:13px; color:#5f6368; margin:0 0 24px;">
        If you did not request this login, you can safely ignore this email. Someone might have entered your email address by mistake.
      </p>

      <p style="font-size:11px; color:#9aa0a6; text-align:center;">
        This is an automated message — please do not reply.
      </p>

    </div>
  </div>
  `;

  return { subject, html };
};
