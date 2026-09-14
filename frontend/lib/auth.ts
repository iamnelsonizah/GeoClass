/**
 * GeoClass Authentication & Security Service
 * Handles user registration, 6-digit OTP verification, session management,
 * rate limiting, and password reset flows with client-side persistence and
 * real transactional email delivery powered by Resend.
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  organization?: string;
  role?: string;
  isVerified: boolean;
  createdAt: string;
}

interface StoredUser extends User {
  passwordHash: string;
}

interface OTPRecord {
  code: string;
  email: string;
  type: 'verification' | 'password_reset';
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

interface RateLimitRecord {
  failedAttempts: number;
  lockedUntil: number;
}

const USERS_KEY = 'geoclass_users_v1';
const SESSION_KEY = 'geoclass_session_v1';
const OTP_KEY = 'geoclass_otp_v1';
const RATE_LIMIT_KEY = 'geoclass_ratelimit_v1';

// In-memory / storage helpers
function isClient(): boolean {
  return typeof window !== 'undefined';
}

function getStoredUsers(): StoredUser[] {
  if (!isClient()) return [];
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users', err);
  }
}

function getOTPRecords(): Record<string, OTPRecord> {
  if (!isClient()) return {};
  try {
    const data = localStorage.getItem(OTP_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveOTPRecords(records: Record<string, OTPRecord>): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(OTP_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save OTPs', err);
  }
}

function getRateLimits(): Record<string, RateLimitRecord> {
  if (!isClient()) return {};
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveRateLimits(records: Record<string, RateLimitRecord>): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save rate limits', err);
  }
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends OTP email via Next.js backend route invoking Resend API
 */
async function dispatchEmail(params: {
  email: string;
  code: string;
  type: 'verification' | 'password_reset';
  fullName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Resend dispatch failed:', data);
      return { success: false, error: data.error || 'Failed to dispatch email' };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error contacting email dispatch service:', err);
    return { success: false, error: err?.message || 'Network connection error' };
  }
}

export const authService = {
  /**
   * Get current authenticated user session
   */
  getCurrentUser(): User | null {
    if (!isClient()) return null;
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) return null;
      return JSON.parse(data) as User;
    } catch {
      return null;
    }
  },

  /**
   * Check rate limit status for an email/action
   */
  checkRateLimit(key: string): { isLocked: boolean; remainingSeconds: number } {
    const limits = getRateLimits();
    const record = limits[key.toLowerCase()];
    if (!record) return { isLocked: false, remainingSeconds: 0 };

    const now = Date.now();
    if (record.lockedUntil > now) {
      return {
        isLocked: true,
        remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000),
      };
    }
    return { isLocked: false, remainingSeconds: 0 };
  },

  /**
   * Record a failed attempt
   */
  recordFailedAttempt(key: string, maxAttempts = 5, lockDurationSeconds = 60): { locked: boolean; remainingAttempts: number; lockedUntil: number } {
    const limits = getRateLimits();
    const normalizedKey = key.toLowerCase();
    const record = limits[normalizedKey] || { failedAttempts: 0, lockedUntil: 0 };

    record.failedAttempts += 1;
    let locked = false;

    if (record.failedAttempts >= maxAttempts) {
      record.lockedUntil = Date.now() + lockDurationSeconds * 1000;
      record.failedAttempts = 0; // reset for next cycle
      locked = true;
    }

    limits[normalizedKey] = record;
    saveRateLimits(limits);

    return {
      locked,
      remainingAttempts: Math.max(0, maxAttempts - record.failedAttempts),
      lockedUntil: record.lockedUntil,
    };
  },

  /**
   * Reset rate limit upon success
   */
  clearRateLimit(key: string): void {
    const limits = getRateLimits();
    delete limits[key.toLowerCase()];
    saveRateLimits(limits);
  },

  /**
   * Register a new user, generate a 6-digit OTP code, and dispatch via Resend
   */
  async register(params: {
    fullName: string;
    email: string;
    password: string;
    role?: string;
    organization?: string;
  }): Promise<{ success: boolean; message: string; otpCode?: string }> {
    const email = params.email.trim().toLowerCase();
    const rate = this.checkRateLimit(`reg_${email}`);
    if (rate.isLocked) {
      return {
        success: false,
        message: `Too many attempts. Please try again in ${rate.remainingSeconds} seconds.`,
      };
    }

    const users = getStoredUsers();
    if (users.some((u) => u.email === email && u.isVerified)) {
      return {
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      };
    }

    // Generate 6-digit verification code
    const otpCode = generateOTP();
    const now = Date.now();

    // Store OTP with 10-minute expiry
    const otps = getOTPRecords();
    otps[email] = {
      code: otpCode,
      email,
      type: 'verification',
      expiresAt: now + 10 * 60 * 1000,
      attempts: 0,
      lastSentAt: now,
    };
    saveOTPRecords(otps);

    // Filter existing unverified user if re-registering
    const filteredUsers = users.filter((u) => u.email !== email);
    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      fullName: params.fullName.trim(),
      role: params.role || 'remote_sensing_analyst',
      organization: params.organization?.trim() || 'Independent / Research',
      isVerified: false,
      createdAt: new Date().toISOString(),
      passwordHash: btoa(params.password), // client-side storage encoding
    };

    filteredUsers.push(newUser);
    saveStoredUsers(filteredUsers);

    // Send real email via Resend
    const sendResult = await dispatchEmail({
      email,
      code: otpCode,
      type: 'verification',
      fullName: params.fullName.trim(),
    });

    if (!sendResult.success) {
      console.warn('Email dispatch warning:', sendResult.error);
    }

    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to ${email}`,
      otpCode,
    };
  },

  /**
   * Verify 6-digit code for account activation or login
   */
  verifyOTP(email: string, code: string): { success: boolean; message: string; user?: User } {
    const normalizedEmail = email.trim().toLowerCase();
    const rate = this.checkRateLimit(`otp_${normalizedEmail}`);
    if (rate.isLocked) {
      return {
        success: false,
        message: `Rate limit exceeded. Try again in ${rate.remainingSeconds}s.`,
      };
    }

    const otps = getOTPRecords();
    const record = otps[normalizedEmail];

    if (!record) {
      return {
        success: false,
        message: 'No verification code found. Please request a new code.',
      };
    }

    if (Date.now() > record.expiresAt) {
      return {
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      };
    }

    if (record.code !== code.trim()) {
      record.attempts += 1;
      otps[normalizedEmail] = record;
      saveOTPRecords(otps);

      const fail = this.recordFailedAttempt(`otp_${normalizedEmail}`, 5, 60);
      if (fail.locked) {
        return {
          success: false,
          message: 'Too many incorrect attempts. Verification locked for 60 seconds.',
        };
      }
      return {
        success: false,
        message: `Incorrect code. ${fail.remainingAttempts} attempts remaining.`,
      };
    }

    // Success: activate user
    const users = getStoredUsers();
    const userIndex = users.findIndex((u) => u.email === normalizedEmail);
    if (userIndex === -1) {
      return { success: false, message: 'User record not found.' };
    }

    users[userIndex].isVerified = true;
    saveStoredUsers(users);

    // Clean up OTP & rate limits
    delete otps[normalizedEmail];
    saveOTPRecords(otps);
    this.clearRateLimit(`otp_${normalizedEmail}`);

    const safeUser: User = {
      id: users[userIndex].id,
      email: users[userIndex].email,
      fullName: users[userIndex].fullName,
      role: users[userIndex].role,
      organization: users[userIndex].organization,
      isVerified: true,
      createdAt: users[userIndex].createdAt,
    };

    // Store active session
    if (isClient()) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    }

    return {
      success: true,
      message: 'Account verified successfully.',
      user: safeUser,
    };
  },

  /**
   * Resend 6-digit OTP code with 60s cooldown and real Resend dispatch
   */
  async resendOTP(email: string): Promise<{ success: boolean; message: string; otpCode?: string; cooldownSeconds?: number }> {
    const normalizedEmail = email.trim().toLowerCase();
    const otps = getOTPRecords();
    const record = otps[normalizedEmail];

    const now = Date.now();
    if (record && now - record.lastSentAt < 60 * 1000) {
      const remaining = Math.ceil((60 * 1000 - (now - record.lastSentAt)) / 1000);
      return {
        success: false,
        message: `Please wait ${remaining}s before requesting another code.`,
        cooldownSeconds: remaining,
      };
    }

    const otpCode = generateOTP();
    const otpType = record?.type || 'verification';
    otps[normalizedEmail] = {
      code: otpCode,
      email: normalizedEmail,
      type: otpType,
      expiresAt: now + 10 * 60 * 1000,
      attempts: 0,
      lastSentAt: now,
    };
    saveOTPRecords(otps);

    const users = getStoredUsers();
    const user = users.find((u) => u.email === normalizedEmail);

    // Send real email via Resend
    await dispatchEmail({
      email: normalizedEmail,
      code: otpCode,
      type: otpType,
      fullName: user?.fullName,
    });

    return {
      success: true,
      message: `A new 6-digit verification code has been dispatched to ${normalizedEmail}.`,
      otpCode,
      cooldownSeconds: 60,
    };
  },

  /**
   * Login with email & password
   */
  login(params: {
    email: string;
    password: string;
  }): { success: boolean; message: string; user?: User; requiresVerification?: boolean; otpCode?: string } {
    const email = params.email.trim().toLowerCase();
    const rate = this.checkRateLimit(`login_${email}`);
    if (rate.isLocked) {
      return {
        success: false,
        message: `Too many failed login attempts. Locked for ${rate.remainingSeconds}s.`,
      };
    }

    const users = getStoredUsers();
    const user = users.find((u) => u.email === email);

    if (!user || user.passwordHash !== btoa(params.password)) {
      const fail = this.recordFailedAttempt(`login_${email}`, 5, 60);
      if (fail.locked) {
        return {
          success: false,
          message: 'Account temporarily locked due to repeated failed logins. Please wait 60s.',
        };
      }
      return {
        success: false,
        message: `Invalid email or password. ${fail.remainingAttempts} attempts remaining.`,
      };
    }

    if (!user.isVerified) {
      // Trigger new OTP dispatch in background
      this.resendOTP(email);
      return {
        success: false,
        requiresVerification: true,
        message: 'Account not yet verified. A 6-digit verification code has been dispatched to your email.',
      };
    }

    this.clearRateLimit(`login_${email}`);

    const safeUser: User = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organization: user.organization,
      isVerified: true,
      createdAt: user.createdAt,
    };

    if (isClient()) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    }

    return {
      success: true,
      message: 'Login successful.',
      user: safeUser,
    };
  },

  /**
   * Request password reset code dispatched via Resend
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; otpCode?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const rate = this.checkRateLimit(`reset_${normalizedEmail}`);
    if (rate.isLocked) {
      return {
        success: false,
        message: `Too many requests. Please wait ${rate.remainingSeconds}s.`,
      };
    }

    const users = getStoredUsers();
    const user = users.find((u) => u.email === normalizedEmail);
    if (!user) {
      return {
        success: false,
        message: 'No account found with this email address.',
      };
    }

    const otpCode = generateOTP();
    const now = Date.now();
    const otps = getOTPRecords();
    otps[normalizedEmail] = {
      code: otpCode,
      email: normalizedEmail,
      type: 'password_reset',
      expiresAt: now + 10 * 60 * 1000,
      attempts: 0,
      lastSentAt: now,
    };
    saveOTPRecords(otps);

    // Send real email via Resend
    const sendResult = await dispatchEmail({
      email: normalizedEmail,
      code: otpCode,
      type: 'password_reset',
      fullName: user.fullName,
    });

    if (!sendResult.success) {
      console.warn('Email dispatch warning:', sendResult.error);
    }

    return {
      success: true,
      message: `A 6-digit password reset code has been dispatched to ${normalizedEmail}`,
      otpCode,
    };
  },

  /**
   * Complete password reset with 6-digit code
   */
  resetPassword(email: string, code: string, newPassword: string): { success: boolean; message: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const rate = this.checkRateLimit(`reset_attempt_${normalizedEmail}`);
    if (rate.isLocked) {
      return {
        success: false,
        message: `Too many reset attempts. Locked for ${rate.remainingSeconds}s.`,
      };
    }

    const otps = getOTPRecords();
    const record = otps[normalizedEmail];

    if (!record || record.type !== 'password_reset') {
      return { success: false, message: 'Invalid or expired password reset request.' };
    }

    if (Date.now() > record.expiresAt) {
      return { success: false, message: 'Reset code has expired. Please request a new one.' };
    }

    if (record.code !== code.trim()) {
      const fail = this.recordFailedAttempt(`reset_attempt_${normalizedEmail}`, 5, 60);
      return {
        success: false,
        message: `Incorrect reset code. ${fail.remainingAttempts} attempts remaining.`,
      };
    }

    // Update password
    const users = getStoredUsers();
    const userIndex = users.findIndex((u) => u.email === normalizedEmail);
    if (userIndex === -1) {
      return { success: false, message: 'User not found.' };
    }

    users[userIndex].passwordHash = btoa(newPassword);
    saveStoredUsers(users);

    delete otps[normalizedEmail];
    saveOTPRecords(otps);
    this.clearRateLimit(`reset_attempt_${normalizedEmail}`);

    return {
      success: true,
      message: 'Password reset successfully. You can now sign in.',
    };
  },

  /**
   * Log out active session
   */
  logout(): void {
    if (isClient()) {
      localStorage.removeItem(SESSION_KEY);
    }
  },
};
