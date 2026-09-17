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
    <div className="min-h-screen bg-[#13140e] text-[#f4f3e8] selection:bg-[#ebfc72] selection:text-[#13140e] font-sans flex flex-col justify-between relative">
      
      {/* ────────────────────────────────── Master Top Bar ────────────────────────────────── */}
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
              TERMINAL AUTHENTICATION
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-xs font-mono text-[#f4f3e8] hover:text-[#ebfc72] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO OVERVIEW</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ────────────────────────────────── Main Login Card ────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 my-10">
        <div className="w-full max-w-md bg-[#181a13] border border-[#404040] rounded-[3.6px] p-8 sm:p-9 space-y-6">
          
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#ebfc72]">
              <Shield className="w-3.5 h-3.5 text-[#ebfc72]" />
              <span>EARTH OBSERVATION CONSOLE</span>
            </div>
            <h2 className="text-2xl font-normal tracking-[-0.03em] text-[#f4f3e8]">
              Sign in to GeoClass
            </h2>
            <p className="text-xs text-[#84837b] leading-relaxed font-mono">
              Enter credentials to access the remote sensing compute workspace
            </p>
          </div>

          {/* Live Lockout Countdown Alert */}
          {lockoutSeconds > 0 && (
            <div className="p-3.5 rounded-[3.6px] bg-[#2A1517] border border-[#EF4444]/40 text-[#FCA5A5] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed flex-1">
                <div className="font-semibold text-[#f4f3e8] flex items-center justify-between">
                  <span>Account Temporarily Locked</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[#EF4444]">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-sm font-bold">{lockoutSeconds}s</span>
                  </span>
                </div>
                <div className="text-[#FCA5A5]">
                  Repeated failed logins detected. Lockout automatically resets in{' '}
                  <strong className="font-mono text-[#f4f3e8]">{lockoutSeconds}s</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Standard Error Alert (when not locked out) */}
          {errorMsg && lockoutSeconds <= 0 && (
            <div className="p-3.5 rounded-[3.6px] bg-[#2A1517] border border-[#EF4444]/40 text-[#FCA5A5] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Success / Recovery Alert */}
          {successMsg && (
            <div className="p-3.5 rounded-[3.6px] bg-[#112419] border border-[#4CAF6A]/40 text-[#A7F3D0] text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#4CAF6A] flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#f4f3e8]">
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
                className="w-full bg-[#13140e] border border-[#404040] focus:border-[#ebfc72] rounded-[3.6px] px-3.5 py-2.5 text-sm text-[#f4f3e8] placeholder-[#84837b] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#f4f3e8]">
                  Password
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-[11px] text-[#ebfc72] hover:underline cursor-pointer"
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
                className="w-full bg-[#13140e] border border-[#404040] focus:border-[#ebfc72] rounded-[3.6px] px-3.5 py-2.5 text-sm text-[#f4f3e8] placeholder-[#84837b] outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className={`w-full mt-2 font-semibold text-sm py-2.5 rounded-[3.6px] transition-colors flex items-center justify-center gap-2 ${
                lockoutSeconds > 0
                  ? 'bg-[#182328] text-[#84837b] border border-[#404040] cursor-not-allowed'
                  : 'bg-[#ebfc72] hover:bg-[#f4fd91] text-[#13140e] cursor-pointer'
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

          <div className="text-center text-xs text-[#84837b] pt-2 border-t border-[#404040]">
            Don&apos;t have an authenticated account?{' '}
            <Link href="/signup" className="text-[#ebfc72] hover:underline font-medium">
              Create an account
            </Link>
          </div>

        </div>
      </main>

      {/* ────────────────────────────────── Footer ────────────────────────────────── */}
      <footer className="relative z-10 py-6 text-center text-xs font-mono text-[#84837b] border-t border-[#404040]">
        GEOCLASS · SECURE SATELLITE TELEMETRY &amp; GEE COMPUTE CLUSTER
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#13140e] text-[#f4f3e8] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#404040] border-t-[#ebfc72] animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
