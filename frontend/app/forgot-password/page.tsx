'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RotateCcw,
  Mail,
  KeyRound
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestPasswordReset, resetPassword, checkRateLimit, clearRateLimit } = useAuth();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1 = enter email, 2 = enter 6-digit code & new password

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Lockout live countdown timer with auto-reset on 0
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          if (email) {
            clearRateLimit(`reset_attempt_${email.trim().toLowerCase()}`);
          }
          setErrorMsg(null);
          setSuccessMsg('Security lockout expired. You can now enter your recovery code.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds, email, clearRateLimit]);

  // Check rate limit on email change or step switch
  useEffect(() => {
    if (!email || step !== 2) return;
    const rate = checkRateLimit(`reset_attempt_${email.trim().toLowerCase()}`);
    if (rate.isLocked && rate.remainingSeconds > 0) {
      setLockoutSeconds(rate.remainingSeconds);
    }
  }, [email, step, checkRateLimit]);

  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const res = await requestPasswordReset(email);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setCooldown(30);
    setStep(2);
    setSuccessMsg(`A 6-digit password reset code has been dispatched to ${email}. Please check your inbox.`);
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');
    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pasted.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setErrorMsg('Please enter the full 6-digit reset code.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    const res = await resetPassword(email, fullCode, newPassword);
    setLoading(false);

    if (!res.success) {
      if (res.lockoutSeconds && res.lockoutSeconds > 0) {
        setLockoutSeconds(res.lockoutSeconds);
        setErrorMsg(null);
        return;
      }
      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg('Password reset successfully! Redirecting to sign in...');
    setTimeout(() => {
      router.push('/login');
    }, 1200);
  };

  const [resending, setResending] = useState(false);
  const handleResend = async () => {
    if (cooldown > 0 || resending || lockoutSeconds > 0) return;
    setErrorMsg(null);
    setResending(true);
    const res = await requestPasswordReset(email);
    setResending(false);

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setCooldown(30);
    setSuccessMsg(`A new 6-digit reset code has been dispatched to ${email}.`);
    setOtpDigits(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-[#13140e] text-[#f4f3e8] selection:bg-[#ebfc72] selection:text-[#13140e] font-sans flex flex-col justify-between relative">
      
      {/* Top Bar */}
      <header className="relative z-10 border-b border-[#404040] bg-[#13140e]">
        <div className="max-w-[1240px] mx-auto px-6 h-15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="font-mono text-sm text-[#ebfc72] font-bold">▲</span>
              <span className="font-sans text-[16px] font-bold tracking-[-0.02em] text-[#f4f3e8] uppercase">
                GEOCLASS
              </span>
            </Link>
            <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-[0.06em] text-[#84837b] border-l border-[#404040] pl-3">
              PASSWORD RECOVERY
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-xs font-mono text-[#f4f3e8] hover:text-[#ebfc72] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO LOGIN</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Recovery Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-md bg-[#181a13] border border-[#404040] rounded-[3.6px] p-8 sm:p-9 space-y-6">
          
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#ebfc72]">
              <KeyRound className="w-3.5 h-3.5 text-[#ebfc72]" />
              <span>ACCOUNT CREDENTIAL RECOVERY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#f4f3e8]">
              {step === 1 ? 'Reset your password' : 'Enter 6-digit recovery code'}
            </h2>
            <p className="text-xs sm:text-sm text-[#84837b] leading-relaxed max-w-sm mx-auto">
              {step === 1 
                ? 'Enter your registered email address to receive a secure 6-digit reset code' 
                : `Enter the 6-digit code sent to ${email} and choose a new password`}
            </p>
          </div>

          {/* Live Lockout Alert */}
          {lockoutSeconds > 0 && (
            <div className="p-3.5 rounded-[3.6px] bg-[#2A1517] border border-[#EF4444]/40 text-[#FCA5A5] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed flex-1">
                <div className="font-semibold text-[#f4f3e8] flex items-center justify-between">
                  <span>Recovery Locked</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[#EF4444]">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-sm font-bold">{lockoutSeconds}s</span>
                  </span>
                </div>
                <div className="text-[#FCA5A5]">
                  Too many reset attempts. Lockout automatically resets in{' '}
                  <strong className="font-mono text-[#f4f3e8]">{lockoutSeconds}s</strong>.
                </div>
              </div>
            </div>
          )}

          {errorMsg && lockoutSeconds <= 0 && (
            <div className="p-3.5 rounded-[3.6px] bg-[#2A1517] border border-[#EF4444]/40 text-[#FCA5A5] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-[3.6px] bg-[#112419] border border-[#4CAF6A]/40 text-[#A7F3D0] text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#4CAF6A] flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#f4f3e8]">
                  Registered Email Address
                </label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@organization.org"
                  className="w-full bg-[#13140e] border border-[#404040] focus:border-[#ebfc72] rounded-[3.6px] px-3.5 py-2.5 text-sm text-[#f4f3e8] placeholder-[#84837b] outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#ebfc72] hover:bg-[#f4fd91] text-[#13140e] font-semibold text-sm py-2.5 rounded-[3.6px] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <span>{loading ? 'Dispatching Recovery Code...' : 'Send 6-Digit Reset Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleReset} className="space-y-5 pt-1">
              
              {/* Notice that code was sent to their email */}
              <div className="p-3 rounded-[3.6px] bg-[#13140e] border border-[#404040] flex items-center gap-3 text-xs text-[#CBD5E1]">
                <Mail className="w-4 h-4 text-[#ebfc72] flex-shrink-0" />
                <span>Recovery code sent to <strong className="text-[#f4f3e8]">{email}</strong>. Please check your inbox and spam folder.</span>
              </div>

              <div className="space-y-2">
                <label className="block text-center text-xs font-mono uppercase tracking-[0.12em] text-[#f4f3e8]">
                  6-Digit Recovery Code
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      disabled={lockoutSeconds > 0}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`w-11 h-13 sm:w-13 sm:h-15 bg-[#13140e] border rounded-[3.6px] text-center text-xl sm:text-2xl font-mono font-bold outline-none transition-colors shadow-inner ${
                        lockoutSeconds > 0 
                          ? 'border-[#EF4444]/40 text-[#69766F] cursor-not-allowed' 
                          : 'border-[#404040] focus:border-[#ebfc72] text-[#f4f3e8]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#f4f3e8]">
                    New Password
                  </label>
                  <input 
                    type="password" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-[#13140e] border border-[#404040] focus:border-[#ebfc72] rounded-[3.6px] px-3.5 py-2.5 text-sm text-[#f4f3e8] placeholder-[#84837b] outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#f4f3e8]">
                    Confirm New Password
                  </label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-[#13140e] border border-[#404040] focus:border-[#ebfc72] rounded-[3.6px] px-3.5 py-2.5 text-sm text-[#f4f3e8] placeholder-[#84837b] outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || lockoutSeconds > 0}
                className={`w-full font-semibold text-sm py-2.5 rounded-[3.6px] transition-colors flex items-center justify-center gap-2 ${
                  lockoutSeconds > 0
                    ? 'bg-[#182328] text-[#84837b] border border-[#404040] cursor-not-allowed'
                    : 'bg-[#ebfc72] hover:bg-[#f4fd91] text-[#13140e] cursor-pointer'
                }`}
              >
                <span>
                  {loading 
                    ? 'Resetting Password...' 
                    : lockoutSeconds > 0 
                      ? `Locked · Resets in ${lockoutSeconds}s` 
                      : 'Save New Password & Sign In'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[#84837b] hover:text-[#f4f3e8] transition-colors cursor-pointer"
                >
                  Change Email
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || loading || resending || lockoutSeconds > 0}
                  className={`inline-flex items-center gap-1 font-mono transition-colors cursor-pointer ${
                    cooldown > 0 || loading || resending || lockoutSeconds > 0 ? 'text-[#84837b] cursor-not-allowed' : 'text-[#ebfc72] hover:underline'
                  }`}
                >
                  <RotateCcw className={`w-3 h-3 ${cooldown > 0 || loading || resending || lockoutSeconds > 0 ? '' : 'text-[#ebfc72]'} ${resending ? 'animate-spin' : ''}`} />
                  <span>{resending ? 'Dispatching New Code...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code via Email'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="text-center text-xs text-[#84837b] pt-2 border-t border-[#404040]">
            Remember your password?{' '}
            <Link href="/login" className="text-[#ebfc72] hover:underline font-medium">
              Sign in
            </Link>
          </div>

        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs font-mono text-[#84837b] border-t border-[#404040]">
        GEOCLASS · CRYPTOGRAPHIC CREDENTIAL RECOVERY SYSTEM
      </footer>
    </div>
  );
}
