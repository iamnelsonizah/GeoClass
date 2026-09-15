import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyServerOTP } from '@/lib/serverOtpStore';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const HMAC_SECRET = RESEND_API_KEY || 'geoclass_secure_otp_token_secret';

export async function POST(req: NextRequest) {
  try {
    const { email, code, type, signature } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'Email and code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // Check 1: In-memory server store
    const serverResult = verifyServerOTP(normalizedEmail, cleanCode);
    if (serverResult.valid) {
      return NextResponse.json({ success: true, message: 'Code verified successfully' });
    }

    // Check 2: Cryptographic HMAC signature check (works across independent serverless lambdas)
    const candidateSig = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(`${normalizedEmail}:${cleanCode}:${type || 'verification'}`)
      .digest('hex');

    const cookieSig = req.cookies.get('geoclass_otp_sig')?.value;
    const providedSig = signature || cookieSig;

    if (providedSig && (providedSig === candidateSig)) {
      return NextResponse.json({ success: true, message: 'Code verified successfully via signature' });
    }

    return NextResponse.json(
      { success: false, message: 'Incorrect verification code.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in verify-otp route:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error verifying code' },
      { status: 500 }
    );
  }
}
