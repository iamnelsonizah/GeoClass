'use client';

import React from 'react';
import Link from 'next/link';
import { LogOut, ChevronDown } from 'lucide-react';
import { User } from '@/lib/auth';

interface WorkstationHeaderProps {
  user: User | null;
  isAuthenticated: boolean;
  userDropdownOpen: boolean;
  setUserDropdownOpen: (open: boolean) => void;
  onNavigateTab: (tab: 'projects' | 'imagery' | 'classification' | 'analytics') => void;
  onLogout: () => void;
}

export function WorkstationHeader({
  user,
  isAuthenticated,
  userDropdownOpen,
  setUserDropdownOpen,
  onNavigateTab,
  onLogout,
}: WorkstationHeaderProps) {
  return (
    <header className="topbar relative bg-[#FAF9F5] border-b border-[#D8D5CA] px-5 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer group" title="Return to Overview">
            <svg width="24" height="20" viewBox="0 0 28 22" fill="none" className="flex-shrink-0">
              <path d="M14 2L2 19H26L14 2Z" stroke="#2D4A34" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M8 14L14 7L20 14" stroke="#2D4A34" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 19C8 16 10.5 16 14 19C17.5 16 20 16 23 19" stroke="#2D4A34" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-sans text-[18px] font-bold tracking-[-0.02em] text-[#1A1D23]">
              GeoClass
            </span>
            <span className="hidden xl:inline-block text-xs font-mono uppercase tracking-[0.1em] text-[#69706A] border-l border-[#D8D5CA] pl-3 ml-2 group-hover:text-[#1A1D23] transition">
              Earth Observation
            </span>
          </Link>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-8 text-xs font-medium absolute left-1/2 -translate-x-1/2" aria-label="Main Navigation">
        <button 
          type="button"
          onClick={() => onNavigateTab('projects')}
          className="pb-1 border-b-2 border-[#D9622B] text-[#D9622B] font-semibold cursor-pointer transition"
        >
          Projects
        </button>
        <button 
          type="button"
          onClick={() => onNavigateTab('imagery')}
          className="pb-1 border-b-2 border-transparent text-[#454B46] hover:text-[#1A1D23] cursor-pointer transition"
        >
          Imagery
        </button>
        <button 
          type="button"
          onClick={() => onNavigateTab('classification')}
          className="pb-1 border-b-2 border-transparent text-[#454B46] hover:text-[#1A1D23] cursor-pointer transition"
        >
          Classification
        </button>
        <button 
          type="button"
          onClick={() => onNavigateTab('analytics')}
          className="pb-1 border-b-2 border-transparent text-[#454B46] hover:text-[#1A1D23] cursor-pointer transition"
        >
          Analytics
        </button>
      </nav>

      {/* Right Header Controls */}
      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 pl-2 cursor-pointer select-none group"
            >
              <div className="w-7 h-7 rounded-full bg-[#2D4A34] text-[#B7E89F] border border-[#306840] flex items-center justify-center text-[11px] font-bold">
                {user?.fullName 
                  ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                  : 'OP'}
              </div>
              <span className="text-xs font-semibold text-[#1A1D23] hidden md:inline">
                {user?.fullName || 'Operator'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#69706A] transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#FAF9F5] border border-[#D8D5CA] rounded-[6px] shadow-xl p-3 space-y-2 z-50 text-xs">
                <div className="border-b border-[#E3E0D5] pb-2">
                  <div className="font-semibold text-[#1A1D23]">
                    {user?.fullName || 'Operator'}
                  </div>
                  <div className="text-[11px] text-[#676E7D] truncate">
                    {user?.email || 'analyst@organization.org'}
                  </div>
                  <div className="inline-block mt-1.5 font-mono text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E4E9DF] text-[#2D4A34] font-medium">
                    {user?.role?.replace(/_/g, ' ') || 'Remote Sensing Analyst'}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-xs font-medium text-[#A84E42] hover:bg-[#FCECE4] transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out / Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
