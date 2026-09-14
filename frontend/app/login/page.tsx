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
    setTimeout(() => {
      router.push('/app');
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[#07100D] text-[#F1F3EF] selection:bg-[#B7F36B] selection:text-[#07100D] font-sans flex flex-col justify-between relative">
      
      {/* Header with return link */}
      <header className="relative z-10 px-6 py-6 max-w-[1240px] mx-auto w-full flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-[#A5B2AB] hover:text-[#F1F3EF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO OVERVIEW</span>
        </Link>
        <div className="font-mono text-[11px] text-[#69766F] hidden sm:block">
          GEOSPATIAL ACCESS NODE · v2.4
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#101C18] border border-[#26332E] rounded-[4px] p-8 space-y-6">
          
          <div className="text-center space-y-3">
            <Link href="/" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/geoclass-logo.png" 
                alt="GeoClass" 
                className="h-8 w-auto mx-auto object-contain brightness-110 contrast-125"
              />
            </Link>
            <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#B7F36B]">
              <Shield className="w-3 h-3 text-[#B7F36B]" />
              <span>EARTH OBSERVATION CONSOLE</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A5B2AB]">
                Corporate / Academic Email
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@organization.org"
                className="w-full bg-[#07100D] border border-[#26332E] focus:border-[#B7F36B] rounded-[4px] px-3.5 py-2.5 text-sm text-[#F1F3EF] placeholder-[#69766F] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A5B2AB]">
                  Password
                </label>
                <span className="text-[11px] text-[#69766F] hover:text-[#A5B2AB] cursor-pointer">Forgot?</span>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#07100D] border border-[#26332E] focus:border-[#B7F36B] rounded-[4px] px-3.5 py-2.5 text-sm text-[#F1F3EF] placeholder-[#69766F] outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#B7F36B] hover:bg-[#C8FF82] text-[#07100D] font-semibold text-sm py-2.5 rounded-[4px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign in to Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Guest / Demo Access Button */}
          <div className="pt-2 border-t border-[#26332E]">
            <Link
              href="/app"
              className="w-full border border-[#26332E] hover:border-[#A5B2AB] bg-[#07100D] hover:bg-[#0B1713] text-[#F1F3EF] font-medium text-xs py-2.5 rounded-[4px] transition-colors flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#B7F36B]" />
              <span>Instant Guest Access (Launch Workspace)</span>
            </Link>
          </div>

          <div className="text-center text-xs text-[#69766F]">
            Don&apos;t have an enterprise account?{' '}
            <Link href="/signup" className="text-[#B7F36B] hover:underline font-medium">
              Create an account
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs font-mono text-[#69766F]">
        GEOCLASS · SECURE SATELLITE TELEMETRY &amp; GEE COMPUTE
      </footer>
    </div>
  );
}
