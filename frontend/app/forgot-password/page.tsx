'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Shield, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RotateCcw,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestPasswordReset, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1 = enter email, 2 = enter 6-digit code & new password

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const res = requestPasswordReset(email);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSimulatedCode(res.otpCode || null);
    setCooldown(60);
    setStep(2);
    setSuccessMsg(`A 6-digit password reset code has been dispatched to ${email}.`);
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

  const handleAutoFill = () => {
    if (!simulatedCode) return;
    setOtpDigits(simulatedCode.slice(0, 6).split(''));
    inputRefs.current[5]?.focus();
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
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

    const res = resetPassword(email, fullCode, newPassword);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg('Password reset successfully! Redirecting to sign in...');
    setTimeout(() => {
      router.push('/login');
    }, 1200);
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    setErrorMsg(null);
    const res = requestPasswordReset(email);

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSimulatedCode(res.otpCode || null);
    setCooldown(60);
    setSuccessMsg('A new 6-digit reset code has been dispatched.');
    setOtpDigits(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-[#0D1316] text-[#FFFFFF] selection:bg-[#B7E89F] selection:text-[#0D1316] font-sans flex flex-col justify-between relative">
      
      {/* Top Bar */}
      <header className="relative z-10 border-b border-[#1B2428] bg-[#0D1316]">
        <div className="max-w-[1240px] mx-auto px-6 h-17 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
              <svg width="24" height="20" viewBox="0 0 28 22" fill="none" className="flex-shrink-0">
                <path d="M14 2L2 19H26L14 2Z" stroke="#B7E89F" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M8 14L14 7L20 14" stroke="#B7E89F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 19C8 16 10.5 16 14 19C17.5 16 20 16 23 19" stroke="#B7E89F" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-sans text-[18px] font-bold tracking-[-0.02em] text-[#FFFFFF]">
                GeoClass
              </span>
            </Link>
            <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-[0.12em] text-[#D1D7D3] border-l border-[#222E33] pl-4">
              Password Recovery
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-xs font-mono text-[#FFFFFF] hover:text-[#B7E89F] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO LOGIN</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-lg bg-[#131C20] border border-[#1F2A30] rounded-[6px] p-8 sm:p-9 space-y-6 shadow-2xl">
          
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#B7E89F]">
              <KeyRound className="w-3.5 h-3.5 text-[#B7E89F]" />
              <span>ACCOUNT CREDENTIAL RECOVERY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#FFFFFF]">
              {step === 1 ? 'Reset your password' : 'Enter 6-digit recovery code'}
            </h2>
            <p className="text-xs sm:text-sm text-[#E2E8F0] leading-relaxed max-w-sm mx-auto">
              {step === 1 
                ? 'Enter your registered email address to receive a secure 6-digit reset code' 
                : `Enter the 6-digit code sent to ${email} and choose a new password`}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-[4px] bg-[#2A1517] border border-[#EF4444]/40 text-[#FCA5A5] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-[4px] bg-[#112419] border border-[#4CAF6A]/40 text-[#A7F3D0] text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#4CAF6A] flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          {step === 2 && simulatedCode && (
            <div className="p-3 rounded-[4px] bg-[#0D1316] border border-[#1F2A30] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#B7E89F]" />
                <span className="text-[#94A3B8] font-mono">Recovery Code:</span>
                <span className="font-mono font-bold text-[#B7E89F] tracking-widest text-sm">{simulatedCode}</span>
              </div>
              <button
                type="button"
                onClick={handleAutoFill}
                className="text-xs font-semibold text-[#B7E89F] hover:underline cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#FFFFFF]">
                  Registered Email Address
                </label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@organization.org"
                  className="w-full bg-[#0D1316] border border-[#1F2A30] focus:border-[#B7E89F] rounded-[4px] px-3.5 py-2.5 text-sm text-[#FFFFFF] placeholder-[#94A3B8] outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#B7E89F] hover:bg-[#C8FFB2] text-[#0D1316] font-semibold text-sm py-2.5 rounded-[4px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? 'Sending Security Code...' : 'Send 6-Digit Reset Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleReset} className="space-y-5 pt-1">
              <div className="space-y-2">
                <label className="block text-center text-xs font-mono uppercase tracking-[0.12em] text-[#FFFFFF]">
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
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-13 sm:h-15 bg-[#0D1316] border border-[#1F2A30] focus:border-[#B7E89F] rounded-[6px] text-center text-xl sm:text-2xl font-mono font-bold text-[#FFFFFF] outline-none transition-colors shadow-inner"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#FFFFFF]">
                    New Password
                  </label>
                  <input 
                    type="password" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-[#0D1316] border border-[#1F2A30] focus:border-[#B7E89F] rounded-[4px] px-3.5 py-2.5 text-sm text-[#FFFFFF] placeholder-[#94A3B8] outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#FFFFFF]">
                    Confirm New Password
                  </label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-[#0D1316] border border-[#1F2A30] focus:border-[#B7E89F] rounded-[4px] px-3.5 py-2.5 text-sm text-[#FFFFFF] placeholder-[#94A3B8] outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#B7E89F] hover:bg-[#C8FFB2] text-[#0D1316] font-semibold text-sm py-2.5 rounded-[4px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? 'Resetting Password...' : 'Save New Password & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[#94A3B8] hover:text-[#FFFFFF] transition-colors cursor-pointer"
                >
                  Change Email
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className={`inline-flex items-center gap-1 font-mono transition-colors cursor-pointer ${
                    cooldown > 0 ? 'text-[#94A3B8] cursor-not-allowed' : 'text-[#B7E89F] hover:underline'
                  }`}
                >
                  <RotateCcw className={`w-3 h-3 ${cooldown > 0 ? '' : 'text-[#B7E89F]'}`} />
                  <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="text-center text-xs text-[#E2E8F0] pt-2 border-t border-[#1F2A30]">
            Remember your password?{' '}
            <Link href="/login" className="text-[#B7E89F] hover:underline font-medium">
              Sign in
            </Link>
          </div>

        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs font-mono text-[#94A3B8] border-t border-[#1B2428]">
        GEOCLASS · CRYPTOGRAPHIC CREDENTIAL RECOVERY SYSTEM
      </footer>
    </div>
  );
}
