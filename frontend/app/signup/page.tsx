'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Shield, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('remote_sensing_analyst');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push('/app');
    }, 350);
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

      {/* ────────────────────────────────── Main Signup Card ────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 my-10">
        <div className="w-full max-w-md bg-[#131C20] border border-[#1F2A30] rounded-[4px] p-8 sm:p-9 space-y-6">
          
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#B7E89F]">
              <Shield className="w-3.5 h-3.5 text-[#B7E89F]" />
              <span>REQUEST CONSOLE ACCESS</span>
            </div>
            <h2 className="text-2xl font-normal tracking-[-0.03em] text-[#FFFFFF]">
              Create your account
            </h2>
            <p className="text-xs text-[#E2E8F0] leading-relaxed">
              Activate access to Sentinel-2 MSI and Sentinel-1 SAR classification engines
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#FFFFFF]">
                Full Name
              </label>
              <input 
                type="text" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Elena Vance"
                className="w-full bg-[#0D1316] border border-[#1F2A30] focus:border-[#B7E89F] rounded-[4px] px-3.5 py-2.5 text-sm text-[#FFFFFF] placeholder-[#94A3B8] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#FFFFFF]">
                Work / Academic Email
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena@institute.gov"
                className="w-full bg-[#0D1316] border border-[#1F2A30] focus:border-[#B7E89F] rounded-[4px] px-3.5 py-2.5 text-sm text-[#FFFFFF] placeholder-[#94A3B8] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#FFFFFF]">
                Primary Domain / Specialty
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#0D1316] border border-[#1F2A30] focus:border-[#B7E89F] rounded-[4px] px-3.5 py-2.5 text-sm text-[#FFFFFF] outline-none transition-colors cursor-pointer"
              >
                <option value="remote_sensing_analyst">Remote Sensing / GIS Analyst</option>
                <option value="environmental_scientist">Environmental Scientist / Forestry</option>
                <option value="mineral_exploration">Mineral Exploration &amp; Geology</option>
                <option value="urban_planner">Urban Planner / Infrastructure Engineer</option>
                <option value="agronomist">Agronomist / Precision Agriculture</option>
                <option value="academic_researcher">Academic / University Researcher</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 bg-[#B7E89F] hover:bg-[#C8FFB2] text-[#0D1316] font-semibold text-sm py-2.5 rounded-[4px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Initializing Console...' : 'Activate Free Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-xs text-[#E2E8F0]">
            Already have an active console key?{' '}
            <Link href="/login" className="text-[#B7E89F] hover:underline font-medium">
              Sign in
            </Link>
          </div>

        </div>
      </main>

      {/* ────────────────────────────────── Footer ────────────────────────────────── */}
      <footer className="relative z-10 py-6 text-center text-xs font-mono text-[#94A3B8] border-t border-[#1B2428]">
        GEOCLASS · SATELLITE MACHINE INTELLIGENCE ENGINE
      </footer>
    </div>
  );
}
