const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP email to the given address
 */
async function sendOTPEmail(toEmail, otp, name = 'there') {
    const mailOptions = {
        from: `"KampusLegacy" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Your KampusLegacy Verification Code',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#f6f6f8;font-family:'Inter',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(19,91,236,0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#135bec,#1a7ee6);padding:36px 40px;text-align:center;">
                      <div style="display:inline-flex;align-items:center;gap:10px;">
                        <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                          <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="white"/>
                        </svg>
                        <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">KampusLegacy</span>
                      </div>
                      <p style="color:rgba(255,255,255,0.8);margin:12px 0 0;font-size:14px;">Your verification code awaits</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="color:#101622;font-size:22px;font-weight:700;margin:0 0 10px;">Hey ${name}! 👋</h2>
                      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 28px;">
                        Welcome to KampusLegacy! Use the code below to verify your email address and complete your registration. This code expires in <strong>10 minutes</strong>.
                      </p>
                      <!-- OTP Box -->
                      <div style="background:#f0f5ff;border:2px dashed #135bec;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                        <p style="color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Verification Code</p>
                        <div style="font-size:48px;font-weight:900;letter-spacing:0.2em;color:#135bec;font-family:monospace;">${otp}</div>
                      </div>
                      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
                        If you didn't create an account with KampusLegacy, you can safely ignore this email. Do not share this code with anyone.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                      <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 KampusLegacy. Empowering the next generation of professionals.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `,
    };

    await transporter.sendMail(mailOptions);
}

module.exports = { generateOTP, sendOTPEmail };
