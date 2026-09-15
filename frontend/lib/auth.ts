/**
 * GeoClass Authentication & Security Service
 * Handles user registration, 6-digit OTP verification, session management,
 * rate limiting, and password reset flows with dual client/server persistence and
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
  validCodes: string[];
  signature?: string;
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
 * Sends OTP email via Next.js route invoking Resend API
 */
async function dispatchEmail(params: {
  email: string;
  code: string;
  type: 'verification' | 'password_reset';
  fullName?: string;
}): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error('Resend dispatch error:', data);
      return { success: false, error: data.error || data.message || 'Failed to dispatch email' };
    }
    return { success: true, signature: data.signature };
  } catch (err: any) {
    console.error('Error contacting email dispatch service:', err);
    return { success: false, error: err?.message || 'Network connection error' };
  }
}

/**
 * Verifies code against server endpoint
 */
async function verifyWithServer(params: {
  email: string;
  code: string;
  type?: string;
  signature?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return { success: res.ok && data.success, message: data.message };
  } catch {
    return { success: false };
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
    // Lockout has ended - auto-reset limits for this key
    if (record.lockedUntil > 0) {
      delete limits[key.toLowerCase()];
      saveRateLimits(limits);
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

    // Send real email via Resend
    const sendResult = await dispatchEmail({
      email,
      code: otpCode,
      type: 'verification',
      fullName: params.fullName.trim(),
    });

    if (!sendResult.success) {
      return {
        success: false,
        message: `Failed to dispatch email: ${sendResult.error || 'Email service error'}. Please check your email address.`,
      };
    }

    // Store OTP with 10-minute expiry and multi-code history
    const otps = getOTPRecords();
    const existing = otps[email];
    const prevValidCodes = existing && existing.expiresAt > now ? existing.validCodes || [existing.code] : [];
    const validCodes = Array.from(new Set([...prevValidCodes, otpCode]));

    otps[email] = {
      code: otpCode,
      validCodes,
      signature: sendResult.signature,
      email,
      type: 'verification',
      expiresAt: now + 10 * 60 * 1000,
      attempts: existing ? existing.attempts : 0,
      lastSentAt: now,
    };
    saveOTPRecords(otps);

    // Save pending user record
    const filteredUsers = users.filter((u) => u.email !== email);
    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      fullName: params.fullName.trim(),
      role: params.role || 'remote_sensing_analyst',
      organization: params.organization?.trim() || 'Independent / Research',
      isVerified: false,
      createdAt: new Date().toISOString(),
      passwordHash: btoa(params.password),
    };

    filteredUsers.push(newUser);
    saveStoredUsers(filteredUsers);

    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to ${email}`,
      otpCode,
    };
  },

  /**
   * Verify 6-digit code for account activation or login
   * Combines client storage and server verification for maximum reliability
   */
  async verifyOTP(email: string, code: string): Promise<{ success: boolean; message: string; user?: User; lockoutSeconds?: number }> {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const rate = this.checkRateLimit(`otp_${normalizedEmail}`);
    if (rate.isLocked) {
      return {
        success: false,
        lockoutSeconds: rate.remainingSeconds,
        message: `Too many attempts. Verification locked for ${rate.remainingSeconds}s.`,
      };
    }

    const otps = getOTPRecords();
    const record = otps[normalizedEmail];

    // Check 1: Client record matches
    let isValid = false;
    if (record) {
      const isExpired = Date.now() > record.expiresAt;
      if (!isExpired) {
        if (record.code === cleanCode || (record.validCodes && record.validCodes.includes(cleanCode))) {
          isValid = true;
        }
      }
    }

    // Check 2: Server-side validation check (cross-device, multi-tab, or production)
    if (!isValid) {
      const serverCheck = await verifyWithServer({
        email: normalizedEmail,
        code: cleanCode,
        type: 'verification',
        signature: record?.signature,
      });
      if (serverCheck.success) {
        isValid = true;
      }
    }

    if (!isValid) {
      if (record) {
        record.attempts += 1;
        otps[normalizedEmail] = record;
        saveOTPRecords(otps);
      }

      const fail = this.recordFailedAttempt(`otp_${normalizedEmail}`, 5, 60);
      if (fail.locked) {
        return {
          success: false,
          lockoutSeconds: 60,
          message: 'Too many incorrect attempts. Verification locked for 60s.',
        };
      }
      return {
        success: false,
        message: `Incorrect code. ${fail.remainingAttempts} attempts remaining.`,
      };
    }

    // Success: activate user
    const users = getStoredUsers();
    let userIndex = users.findIndex((u) => u.email === normalizedEmail);
    if (userIndex === -1) {
      // In case user registered on another device or tab, create user entry
      const newUser: StoredUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: normalizedEmail,
        fullName: normalizedEmail.split('@')[0],
        role: 'remote_sensing_analyst',
        organization: 'Independent / Research',
        isVerified: true,
        createdAt: new Date().toISOString(),
        passwordHash: '',
      };
      users.push(newUser);
      userIndex = users.length - 1;
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
   * Resend 6-digit OTP code with 30s cooldown and real Resend dispatch
   */
  async resendOTP(email: string): Promise<{ success: boolean; message: string; otpCode?: string; cooldownSeconds?: number }> {
    const normalizedEmail = email.trim().toLowerCase();
    const otps = getOTPRecords();
    const record = otps[normalizedEmail];

    const now = Date.now();
    // 30-second cooldown with 2s grace period to prevent timer drift edge cases
    if (record && now - record.lastSentAt < 28 * 1000) {
      const remaining = Math.ceil((30 * 1000 - (now - record.lastSentAt)) / 1000);
      return {
        success: false,
        message: `Please wait ${remaining}s before requesting another code.`,
        cooldownSeconds: remaining,
      };
    }

    const otpCode = generateOTP();
    const otpType = record?.type || 'verification';
    const users = getStoredUsers();
    const user = users.find((u) => u.email === normalizedEmail);

    // Send real email via Resend
    const sendResult = await dispatchEmail({
      email: normalizedEmail,
      code: otpCode,
      type: otpType,
      fullName: user?.fullName,
    });

    if (!sendResult.success) {
      return {
        success: false,
        message: `Failed to dispatch email: ${sendResult.error || 'Email service error'}`,
      };
    }

    const prevValidCodes = record && record.expiresAt > now ? record.validCodes || [record.code] : [];
    const validCodes = Array.from(new Set([...prevValidCodes, otpCode]));

    otps[normalizedEmail] = {
      code: otpCode,
      validCodes,
      signature: sendResult.signature,
      email: normalizedEmail,
      type: otpType,
      expiresAt: now + 10 * 60 * 1000,
      attempts: record ? record.attempts : 0,
      lastSentAt: now,
    };
    saveOTPRecords(otps);

    return {
      success: true,
      message: `A new 6-digit verification code has been dispatched to ${normalizedEmail}.`,
      otpCode,
      cooldownSeconds: 30,
    };
  },

  /**
   * Login with email & password
   */
  login(params: {
    email: string;
    password: string;
  }): { success: boolean; message: string; user?: User; requiresVerification?: boolean; otpCode?: string; lockoutSeconds?: number } {
    const email = params.email.trim().toLowerCase();
    const rate = this.checkRateLimit(`login_${email}`);
    if (rate.isLocked) {
      return {
        success: false,
        lockoutSeconds: rate.remainingSeconds,
        message: `Account temporarily locked due to repeated failed logins. Please wait ${rate.remainingSeconds}s.`,
      };
    }

    const users = getStoredUsers();
    const user = users.find((u) => u.email === email);

    if (!user || user.passwordHash !== btoa(params.password)) {
      const fail = this.recordFailedAttempt(`login_${email}`, 5, 60);
      if (fail.locked) {
        return {
          success: false,
          lockoutSeconds: 60,
          message: 'Account temporarily locked due to repeated failed logins. Please wait 60s.',
        };
      }
      return {
        success: false,
        message: `Invalid email or password. ${fail.remainingAttempts} attempts remaining.`,
      };
    }

    if (!user.isVerified) {
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

    // Send real email via Resend
    const sendResult = await dispatchEmail({
      email: normalizedEmail,
      code: otpCode,
      type: 'password_reset',
      fullName: user.fullName,
    });

    if (!sendResult.success) {
      return {
        success: false,
        message: `Failed to dispatch email: ${sendResult.error || 'Email service error'}`,
      };
    }

    const otps = getOTPRecords();
    const existing = otps[normalizedEmail];
    const prevValidCodes = existing && existing.expiresAt > now ? existing.validCodes || [existing.code] : [];
    const validCodes = Array.from(new Set([...prevValidCodes, otpCode]));

    otps[normalizedEmail] = {
      code: otpCode,
      validCodes,
      signature: sendResult.signature,
      email: normalizedEmail,
      type: 'password_reset',
      expiresAt: now + 10 * 60 * 1000,
      attempts: existing ? existing.attempts : 0,
      lastSentAt: now,
    };
    saveOTPRecords(otps);

    return {
      success: true,
      message: `A 6-digit password reset code has been dispatched to ${normalizedEmail}`,
      otpCode,
    };
  },

  /**
   * Complete password reset with 6-digit code
   */
  async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; message: string; lockoutSeconds?: number }> {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const rate = this.checkRateLimit(`reset_attempt_${normalizedEmail}`);
    if (rate.isLocked) {
      return {
        success: false,
        lockoutSeconds: rate.remainingSeconds,
        message: `Too many reset attempts. Locked for ${rate.remainingSeconds}s.`,
      };
    }

    const otps = getOTPRecords();
    const record = otps[normalizedEmail];

    let isValid = false;
    if (record && record.type === 'password_reset') {
      if (Date.now() <= record.expiresAt) {
        if (record.code === cleanCode || (record.validCodes && record.validCodes.includes(cleanCode))) {
          isValid = true;
        }
      }
    }

    // Check 2: Server-side check
    if (!isValid) {
      const serverCheck = await verifyWithServer({
        email: normalizedEmail,
        code: cleanCode,
        type: 'password_reset',
        signature: record?.signature,
      });
      if (serverCheck.success) {
        isValid = true;
      }
    }

    if (!isValid) {
      const fail = this.recordFailedAttempt(`reset_attempt_${normalizedEmail}`, 5, 60);
      if (fail.locked) {
        return {
          success: false,
          lockoutSeconds: 60,
          message: 'Too many reset attempts. Locked for 60s.',
        };
      }
      return {
        success: false,
        message: `Incorrect reset code. ${fail.remainingAttempts} attempts remaining.`,
      };
    }

    // Update password
    const users = getStoredUsers();
    const userIndex = users.findIndex((u) => u.email === normalizedEmail);
    if (userIndex !== -1) {
      users[userIndex].passwordHash = btoa(newPassword);
      saveStoredUsers(users);
    }

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
