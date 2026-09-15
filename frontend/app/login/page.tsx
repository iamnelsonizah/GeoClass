'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowRight, 
  Shield, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get('redirect') || '/app';

  const { login, checkRateLimit, clearRateLimit, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirectTarget);
    }
  }, [isAuthenticated, redirectTarget, router]);

  // Check rate limit on email change or initial load
  useEffect(() => {
    if (!email) return;
    const normalized = email.trim().toLowerCase();
    const rate = checkRateLimit(`login_${normalized}`);
    if (rate.isLocked && rate.remainingSeconds > 0) {
      setLockoutSeconds(rate.remainingSeconds);
    }
  }, [email, checkRateLimit]);

  // Live countdown timer for lockout that automatically resets when reaching 0
  useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          // Timer reached 0: Automatically reset lockout and clear errors
          if (email) {
            clearRateLimit(`login_${email.trim().toLowerCase()}`);
          }
          setErrorMsg(null);
          setSuccessMsg('Security lockout expired. You can now enter your password and sign in.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds, email, clearRateLimit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const res = await login({ email, password });
    setLoading(false);

    if (!res.success) {
      if (res.requiresVerification) {
        setErrorMsg(res.message);
        setTimeout(() => {
          router.push(`/signup`);
        }, 1500);
        return;
      }

      if (res.lockoutSeconds && res.lockoutSeconds > 0) {
        setLockoutSeconds(res.lockoutSeconds);
        setErrorMsg(null);
        return;
      }

      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg('Authentication confirmed. Accessing mapping engine...');
    setTimeout(() => {
      router.push(redirectTarget);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#0D1316] text-[#FFFFFF] selection:bg-[#B7E89F] selection:text-[#0D1316] font-sans flex flex-col justify-between relative">
      
      {/* ────────────────────────────────── Master Top Bar ────────────────────────────────── */}
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
              Earth Observation
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-xs font-mono text-[#FFFFFF] hover:text-[#B7E89F] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO OVERVIEW</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ────────────────────────────────── Main Login Card ────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 my-10">
        <div className="w-full max-w-md bg-[#131C20] border border-[#1F2A30] rounded-[6px] p-8 sm:p-9 space-y-6 shadow-2xl">
          
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#B7E89F]">
              <Shield className="w-3.5 h-3.5 text-[#B7E89F]" />
              <span>EARTH OBSERVATION CONSOLE</span>
            </div>
            <h2 className="text-2xl font-normal tracking-[-0.03em] text-[#FFFFFF]">
              Sign in to GeoClass
            </h2>
            <p className="text-xs text-[#E2E8F0] leading-relaxed">
              Enter credentials to access the remote sensing compute workspace
            </p>
          </div>

          {/* Live Lockout Countdown Alert */}
          {lockoutSeconds > 0 && (
            <div className="p-3.5 rounded-[4px] bg-[#2A1517] border border-[#EF4444]/40 text-[#FCA5A5] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed flex-1">
                <div className="font-semibold text-[#FFFFFF] flex items-center justify-between">
                  <span>Account Temporarily Locked</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[#EF4444]">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-sm font-bold">{lockoutSeconds}s</span>
                  </span>
                </div>
                <div className="text-[#FCA5A5]">
                  Repeated failed logins detected. Lockout automatically resets in{' '}
                  <strong className="font-mono text-[#FFFFFF]">{lockoutSeconds}s</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Standard Error Alert (when not locked out) */}
          {errorMsg && lockoutSeconds <= 0 && (
            <div className="p-3.5 rounded-[4px] bg-[#2A1517] border border-[#EF4444]/40 text-[#FCA5A5] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Success / Recovery Alert */}
          {successMsg && (
            <div className="p-3.5 rounded-[4px] bg-[#112419] border border-[#4CAF6A]/40 text-[#A7F3D0] text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#4CAF6A] flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#FFFFFF]">
                Work / Academic Email
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="analyst@organization.org"
                className="w-full bg-[#0D1316] border border-[#1F2A30] focus:border-[#B7E89F] rounded-[4px] px-3.5 py-2.5 text-sm text-[#FFFFFF] placeholder-[#94A3B8] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#FFFFFF]">
                  Password
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-[11px] text-[#B7E89F] hover:underline cursor-pointer"
                >
                  Forgot password?
                </Link>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="••••••••••••"
                className="w-full bg-[#0D1316] border border-[#1F2A30] focus:border-[#B7E89F] rounded-[4px] px-3.5 py-2.5 text-sm text-[#FFFFFF] placeholder-[#94A3B8] outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className={`w-full mt-2 font-semibold text-sm py-2.5 rounded-[4px] transition-colors flex items-center justify-center gap-2 ${
                lockoutSeconds > 0
                  ? 'bg-[#182328] text-[#94A3B8] border border-[#222E33] cursor-not-allowed'
                  : 'bg-[#B7E89F] hover:bg-[#C8FFB2] text-[#0D1316] cursor-pointer'
              }`}
            >
              <span>
                {loading 
                  ? 'Authenticating...' 
                  : lockoutSeconds > 0 
                    ? `Locked · Resets in ${lockoutSeconds}s` 
                    : 'Sign in to Workspace'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-xs text-[#E2E8F0] pt-2 border-t border-[#1F2A30]">
            Don&apos;t have an authenticated account?{' '}
            <Link href="/signup" className="text-[#B7E89F] hover:underline font-medium">
              Create an account
            </Link>
          </div>

        </div>
      </main>

      {/* ────────────────────────────────── Footer ────────────────────────────────── */}
      <footer className="relative z-10 py-6 text-center text-xs font-mono text-[#94A3B8] border-t border-[#1B2428]">
        GEOCLASS · SECURE SATELLITE TELEMETRY &amp; GEE COMPUTE CLUSTER
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D1316] text-[#FFFFFF] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1F2A30] border-t-[#B7E89F] animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
