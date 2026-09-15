import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { recordServerOTP } from '@/lib/serverOtpStore';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS || 'noreply@tryagrochain.com';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'GeoClass';
const HMAC_SECRET = RESEND_API_KEY || 'geoclass_secure_otp_token_secret';

export async function POST(req: NextRequest) {
  try {
    const { email, code, type, fullName } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set in environment variables');
      return NextResponse.json(
        { 
          success: false, 
          error: 'RESEND_API_KEY is not configured in environment variables. Please add it to your hosting (Vercel) dashboard.' 
        },
        { status: 500 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // Record OTP in server store
    recordServerOTP(normalizedEmail, cleanCode);

    // Create signature hash for stateless verification: sha256(email + code + HMAC_SECRET)
    const signature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(`${normalizedEmail}:${cleanCode}:${type || 'verification'}`)
      .digest('hex');

    const isReset = type === 'password_reset';
    const subject = isReset
      ? `${cleanCode} is your GeoClass password reset code`
      : `${cleanCode} is your GeoClass verification code`;

    const titleText = isReset
      ? 'Password Reset Request'
      : 'Verify Your Email Address';

    const introText = isReset
      ? 'You recently requested to reset your password for the GeoClass Earth Observation platform. Use the verification code below to set a new password:'
      : 'Welcome to GeoClass! Please use the following 6-digit verification code to confirm your email and activate your scientific workspace:';

    const greeting = fullName ? `Hello ${fullName},` : 'Hello,';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090D0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #090D0F; width: 100%; min-height: 100vh; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; width: 100%; background-color: #131C20; border: 1px solid #1F2A30; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 32px 36px 24px; border-bottom: 1px solid #1B2428; text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <svg width="26" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2L2 19H26L14 2Z" stroke="#B7E89F" stroke-width="2.2" stroke-linejoin="round" />
                      <path d="M8 14L14 7L20 14" stroke="#B7E89F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M5 19C8 16 10.5 16 14 19C17.5 16 20 16 23 19" stroke="#B7E89F" stroke-width="2" stroke-linecap="round" />
                    </svg>
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 19px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.02em; display: inline-block;">GeoClass</span>
                    <span style="display: inline-block; font-size: 10px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.12em; color: #B7E89F; margin-left: 10px; padding-left: 10px; border-left: 1px solid #26332E;">Earth Observation</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h1 style="font-size: 22px; font-weight: 600; color: #FFFFFF; margin: 0 0 16px; letter-spacing: -0.02em;">
                ${titleText}
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #E2E8F0; margin: 0 0 16px;">
                ${greeting}
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 0 0 28px;">
                ${introText}
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 28px;">
                <tr>
                  <td style="background-color: #0D1316; border: 1px solid #222E33; border-radius: 6px; padding: 24px; text-align: center;">
                    <div style="font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.16em; color: #A5B2AB; margin-bottom: 8px;">
                      Verification Security Code
                    </div>
                    <div style="font-size: 36px; font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-weight: 700; letter-spacing: 0.28em; color: #B7E89F; padding: 4px 0;">
                      ${cleanCode}
                    </div>
                    <div style="font-size: 12px; color: #94A3B8; margin-top: 8px;">
                      ⏱ This code expires in <strong>10 minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.5; color: #94A3B8; margin: 0 0 8px;">
                Please do not share this security code with anyone. GeoClass personnel will never ask for your verification code.
              </p>
              <p style="font-size: 12px; line-height: 1.5; color: #64748B; margin: 0;">
                If you did not initiate this request, you can safely ignore this email or review your account credentials.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #0D1316; border-top: 1px solid #1B2428; text-align: center;">
              <p style="font-size: 11px; font-family: monospace; color: #69766F; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">
                GeoClass · Sentinel-1 SAR &amp; Sentinel-2 MSI Multi-Sensor Intelligence
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    // Send email using Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${MAIL_FROM_NAME} <${MAIL_FROM_ADDRESS}>`,
        to: [normalizedEmail],
        subject,
        html: htmlContent,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to dispatch email via Resend' },
        { status: resendResponse.status }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Email dispatched successfully',
      id: data.id,
      signature,
    });

    // Also attach HTTP-only cookie containing signature
    response.cookies.set('geoclass_otp_sig', signature, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error: any) {
    console.error('Error in send-otp route:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
