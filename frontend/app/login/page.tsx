'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Shield, ArrowLeft, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate instant login authorization and redirect to mapping workstation
    setTimeout(() => {
      router.push('/app');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0A1310] text-[#EAF3EC] selection:bg-[#A3F25E] selection:text-[#0A1C0C] font-sans flex flex-col justify-between relative overflow-hidden">
      {/* Background Cartographic Grid */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(234,243,236,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(234,243,236,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, black 40%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, black 40%, transparent 85%)'
        }}
      />

      {/* Header with return link */}
      <header className="relative z-10 px-6 py-6 max-w-[1200px] mx-auto w-full flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-[#93AB9F] hover:text-[#EAF3EC] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO OVERVIEW</span>
        </Link>
        <div className="font-mono text-[11px] text-[#5F766A] hidden sm:block">
          GEOSPATIAL ACCESS NODE · v2.4
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#10201A] border border-[rgba(234,243,236,0.12)] rounded-lg p-8 shadow-2xl space-y-6">
          
          <div className="text-center space-y-3">
            <Link href="/" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/geoclass-logo.png" 
                alt="GeoClass" 
                className="h-8 w-auto mx-auto object-contain brightness-110 contrast-125"
              />
            </Link>
            <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-[#A3F25E] bg-[rgba(163,242,94,0.08)] border border-[rgba(163,242,94,0.2)] px-2.5 py-0.5 rounded-full">
              <Shield className="w-3 h-3 text-[#A3F25E]" />
              <span>EARTH OBSERVATION CONSOLE</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#93AB9F]">
                Corporate / Academic Email
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@organization.org"
                className="w-full bg-[#0A1310] border border-[rgba(234,243,236,0.15)] focus:border-[#A3F25E] rounded-[2px] px-3 py-2.5 text-sm text-[#EAF3EC] placeholder-[#5F766A] outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#93AB9F]">
                  Password
                </label>
                <span className="text-[11px] text-[#5F766A] hover:text-[#93AB9F] cursor-pointer">Forgot?</span>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0A1310] border border-[rgba(234,243,236,0.15)] focus:border-[#A3F25E] rounded-[2px] px-3 py-2.5 text-sm text-[#EAF3EC] placeholder-[#5F766A] outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#A3F25E] hover:bg-[#B4F775] text-[#0A1C0C] font-semibold text-sm py-2.5 rounded-[2px] transition duration-150 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(163,242,94,0.2)] cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign in to Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Guest / Demo Bypass */}
          <div className="pt-2 border-t border-[rgba(234,243,236,0.08)]">
            <Link
              href="/app"
              className="w-full border border-[rgba(234,243,236,0.15)] hover:border-[#A3F25E] bg-[#0A1310]/50 hover:bg-[#152820] text-[#EAF3EC] font-medium text-xs py-2.5 rounded-[2px] transition flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#A3F25E]" />
              <span>Instant Guest Access (Launch Workspace)</span>
            </Link>
          </div>

          <div className="text-center text-xs text-[#5F766A]">
            Don&apos;t have an enterprise account?{' '}
            <Link href="/signup" className="text-[#A3F25E] hover:underline font-medium">
              Create an account
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs font-mono text-[#5F766A]">
        GEOCLASS · SECURE SATELLITE TELEMETRY &amp; GEE COMPUTE
      </footer>
    </div>
  );
}
