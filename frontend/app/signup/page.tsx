'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Shield, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
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
    <div className="min-h-screen bg-[#07100D] text-[#F1F3EF] selection:bg-[#B7F36B] selection:text-[#07100D] font-sans flex flex-col justify-between relative">
      
      {/* Header */}
      <header className="relative z-10 px-6 py-6 max-w-[1240px] mx-auto w-full flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-[#A5B2AB] hover:text-[#F1F3EF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO OVERVIEW</span>
        </Link>
        <div className="font-mono text-[11px] text-[#69766F] hidden sm:block">
          NEW USER PROVISIONING
        </div>
      </header>

      {/* Main Signup Card */}
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
              <span>REQUEST CONSOLE ACCESS</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A5B2AB]">
                Full Name
              </label>
              <input 
                type="text" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Elena Vance"
                className="w-full bg-[#07100D] border border-[#26332E] focus:border-[#B7F36B] rounded-[4px] px-3.5 py-2.5 text-sm text-[#F1F3EF] placeholder-[#69766F] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A5B2AB]">
                Work / Academic Email
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena@institute.gov"
                className="w-full bg-[#07100D] border border-[#26332E] focus:border-[#B7F36B] rounded-[4px] px-3.5 py-2.5 text-sm text-[#F1F3EF] placeholder-[#69766F] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-[#A5B2AB]">
                Primary Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#07100D] border border-[#26332E] focus:border-[#B7F36B] rounded-[4px] px-3.5 py-2.5 text-sm text-[#F1F3EF] outline-none transition-colors cursor-pointer"
              >
                <option value="remote_sensing_analyst">Remote Sensing / GIS Analyst</option>
                <option value="environmental_scientist">Environmental Scientist / Forestry</option>
                <option value="urban_planner">Urban Planner / Infrastructure Engineer</option>
                <option value="agronomist">Agronomist / Farm Manager</option>
                <option value="academic_researcher">Academic / University Researcher</option>
                <option value="executive">Executive / Policy Decision-Maker</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 bg-[#B7F36B] hover:bg-[#C8FF82] text-[#07100D] font-semibold text-sm py-2.5 rounded-[4px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Initializing Console...' : 'Activate Free Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-xs text-[#69766F]">
            Already have an active console key?{' '}
            <Link href="/login" className="text-[#B7F36B] hover:underline font-medium">
              Sign in
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs font-mono text-[#69766F]">
        GEOCLASS · SATELLITE MACHINE INTELLIGENCE
      </footer>
    </div>
  );
}
