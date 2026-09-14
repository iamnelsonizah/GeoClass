'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  CheckCircle2, 
  Compass, 
  Layers, 
  Download, 
  Cpu, 
  Globe, 
  PenTool, 
  Upload, 
  BarChart2, 
  Sliders, 
  ChevronDown, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Maximize2
} from 'lucide-react';

export default function LandingPage() {
  const [selectedLayer, setSelectedLayer] = useState<'classified' | 'rgb' | 'sar'>('classified');
  const [activeTab, setActiveTab] = useState<'agriculture' | 'geology' | 'urban' | 'disaster'>('geology');

  return (
    <div className="min-h-screen bg-[#0C120F] text-[#EAF3EC] selection:bg-[#A3F25E] selection:text-[#0A1C0C] font-sans relative overflow-x-hidden">
      
      {/* Background Cartographic Subtle Grid */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(rgba(234,243,236,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(234,243,236,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 95% 65% at 50% 0%, black 40%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 95% 65% at 50% 0%, black 40%, transparent 85%)'
        }}
      />

      {/* ────────────────────────────────── Header Navigation ────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0C120F]/90 backdrop-blur-md border-b border-[rgba(234,243,236,0.08)] transition-all">
        <div className="max-w-[1280px] mx-auto px-6 h-18 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group cursor-pointer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/geoclass-logo.png" 
                alt="GeoClass" 
                className="h-7 w-auto object-contain brightness-110 contrast-125"
              />
            </Link>
            <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-[#93AB9F] border-l border-[rgba(234,243,236,0.12)] pl-4">
              Earth Observation
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#93AB9F]" aria-label="Main Navigation">
            <a href="#platform" className="hover:text-[#EAF3EC] transition">Platform</a>
            <a href="#workflow" className="hover:text-[#EAF3EC] transition">Workflow</a>
            <a href="#tools" className="hover:text-[#EAF3EC] transition">Tools</a>
            <a href="#use-cases" className="hover:text-[#EAF3EC] transition">Use cases</a>
            <Link href="/methods" className="hover:text-[#A3F25E] transition">Methods &amp; API</Link>
          </nav>

          <div className="flex items-center gap-5">
            <Link 
              href="/login" 
              className="text-[14px] text-[#93AB9F] hover:text-[#EAF3EC] transition font-medium hidden sm:inline-block"
            >
              Log in
            </Link>
            <Link 
              href="/app" 
              className="inline-flex items-center gap-2 bg-[#A3F25E] hover:bg-[#B4F775] text-[#0A1C0C] font-semibold text-[13.5px] px-4 py-2 rounded-[4px] transition duration-150 shadow-[0_0_20px_rgba(163,242,94,0.2)] hover:shadow-[0_0_25px_rgba(163,242,94,0.35)]"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">

        {/* ────────────────────────────────── Hero Section ────────────────────────────────── */}
        <section className="pt-16 pb-20 lg:pt-24 lg:pb-24">
          <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-5 space-y-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#A3F25E] font-medium">
                SATELLITE ANALYTICS FOR REAL WORLD DECISIONS
              </div>

              <h1 className="font-['Space_Grotesk'] text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.08] tracking-[-0.03em] text-[#EAF3EC]">
                Satellite analysis,<br />
                without the GIS<br />
                overhead.
              </h1>

              <p className="text-[16px] sm:text-[17px] text-[#93AB9F] leading-relaxed font-normal max-w-lg">
                GeoClass turns Earth observation data into maps and results you can actually use. Define an area, choose your imagery, run an analysis. No complex setup, no GIS software.
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <Link 
                  href="/app" 
                  className="inline-flex items-center justify-center gap-2 bg-[#A3F25E] hover:bg-[#B4F775] text-[#0A1C0C] font-semibold text-[14.5px] px-5 py-2.5 rounded-[4px] transition duration-150 shadow-[0_0_22px_rgba(163,242,94,0.22)] cursor-pointer"
                >
                  <span>Start classifying free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a 
                  href="#workflow" 
                  className="text-[14.5px] font-medium text-[#EAF3EC] hover:text-[#A3F25E] underline underline-offset-4 decoration-[rgba(234,243,236,0.3)] transition"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Right Hero Product Window Mockup (Faithful to media_1789425341174) */}
            <div className="lg:col-span-7">
              <div className="bg-[#111A16] border border-[rgba(234,243,236,0.14)] rounded-lg overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col relative group">
                
                {/* Mockup Header Bar */}
                <div className="bg-[#09100D] border-b border-[rgba(234,243,236,0.10)] px-4 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/geoclass-emblem.png" alt="" className="h-4 w-auto brightness-110" />
                      <span className="font-serif font-bold tracking-tight text-white text-[13px]">GeoClass</span>
                    </div>
                    <span className="text-[rgba(234,243,236,0.2)]">|</span>
                    <button type="button" className="flex items-center gap-1.5 text-[#93AB9F] hover:text-white font-mono text-[11px] transition">
                      <span>Gold Prospectivity — Yagba West</span>
                      <ChevronDown className="w-3 h-3 text-[#5F766A]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#A3F25E] animate-pulse" />
                    <div className="w-6 h-6 rounded-full bg-[#1A2620] border border-[rgba(234,243,236,0.15)] flex items-center justify-center text-[10px] font-mono text-[#EAF3EC]">
                      NI
                    </div>
                  </div>
                </div>

                {/* Main Mockup Canvas */}
                <div className="relative aspect-[16/10] sm:aspect-[16/9.5] overflow-hidden bg-[#0A120E]">
                  
                  {/* Real Satellite Imagery Base (using the actual GeoClass satellite capture) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/geoclass-map-satellite.jpg" 
                    alt="GeoClass Satellite Map" 
                    className="absolute inset-0 w-full h-full object-cover object-center filter saturate-110 contrast-105"
                  />

                  {/* Classification Heatmap & Vector AOI Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 600 380" preserveAspectRatio="none">
                      <defs>
                        {/* Mineral / Land cover heat gradient */}
                        <radialGradient id="heatGradient" cx="65%" cy="50%" r="55%">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.85" />
                          <stop offset="25%" stopColor="#F97316" stopOpacity="0.82" />
                          <stop offset="55%" stopColor="#EAB308" stopOpacity="0.80" />
                          <stop offset="85%" stopColor="#22C55E" stopOpacity="0.75" />
                          <stop offset="100%" stopColor="#15803D" stopOpacity="0.70" />
                        </radialGradient>
                        <clipPath id="aoiClip">
                          <polygon points="370,90 460,135 470,265 385,325 330,230 370,90" />
                        </clipPath>
                      </defs>

                      {/* Heatmap clipped strictly to AOI */}
                      <g clipPath="url(#aoiClip)">
                        <rect x="300" y="70" width="200" height="270" fill="url(#heatGradient)" />
                        {/* Internal contour / textural noise */}
                        <path d="M340,120 Q390,160 420,130 T460,200" stroke="#FDE047" strokeWidth="3" fill="none" opacity="0.6" />
                        <path d="M350,220 Q400,200 430,250 T460,280" stroke="#DC2626" strokeWidth="4" fill="none" opacity="0.5" />
                      </g>

                      {/* White Polygon Boundary with nodes */}
                      <polygon 
                        points="370,90 460,135 470,265 385,325 330,230" 
                        fill="none" 
                        stroke="#FFFFFF" 
                        strokeWidth="1.8" 
                        strokeDasharray="4 3" 
                      />
                      <circle cx="370" cy="90" r="3.5" fill="#FFFFFF" />
                      <circle cx="460" cy="135" r="3.5" fill="#FFFFFF" />
                      <circle cx="470" cy="265" r="3.5" fill="#FFFFFF" />
                      <circle cx="385" cy="325" r="3.5" fill="#FFFFFF" />
                      <circle cx="330" cy="230" r="3.5" fill="#FFFFFF" />
                    </svg>
                  </div>

                  {/* Left Floating Mini Toolstrip (identical to media_1789425341174) */}
                  <div className="absolute top-4 left-4 bg-[#09100D]/90 backdrop-blur-md border border-[rgba(234,243,236,0.12)] rounded p-1 flex flex-col gap-1 z-20 shadow-lg">
                    <button type="button" className="p-2 rounded bg-[#A3F25E]/15 border border-[#A3F25E] text-[#A3F25E] flex flex-col items-center gap-0.5">
                      <PenTool className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-mono">Draw</span>
                    </button>
                    <button type="button" className="p-2 rounded hover:bg-[#1A2620] text-[#93AB9F] hover:text-white flex flex-col items-center gap-0.5 transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-mono">Upload</span>
                    </button>
                    <button type="button" className="p-2 rounded hover:bg-[#1A2620] text-[#93AB9F] hover:text-white flex flex-col items-center gap-0.5 transition">
                      <Layers className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-mono">Imagery</span>
                    </button>
                    <button type="button" className="p-2 rounded hover:bg-[#1A2620] text-[#93AB9F] hover:text-white flex flex-col items-center gap-0.5 transition">
                      <Cpu className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-mono">Analysis</span>
                    </button>
                    <button type="button" className="p-2 rounded hover:bg-[#1A2620] text-[#93AB9F] hover:text-white flex flex-col items-center gap-0.5 transition">
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-mono">Results</span>
                    </button>
                  </div>

                  {/* Right Floating Classification & Layers Card */}
                  <div className="absolute top-4 right-4 bg-[#09100D]/95 backdrop-blur-md border border-[rgba(234,243,236,0.12)] rounded-md p-3.5 w-44 z-20 space-y-3 shadow-xl">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#93AB9F] mb-1.5 font-semibold">
                        Classification
                      </div>
                      <div className="space-y-1 text-[11px] font-medium">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                            <span className="text-[#EAF3EC]">High potential</span>
                          </div>
                          <span className="font-mono text-[#93AB9F]">8.7%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                            <span className="text-[#EAF3EC]">Moderate</span>
                          </div>
                          <span className="font-mono text-[#93AB9F]">21.4%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
                            <span className="text-[#EAF3EC]">Low</span>
                          </div>
                          <span className="font-mono text-[#93AB9F]">34.2%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                            <span className="text-[#EAF3EC]">Non-prospective</span>
                          </div>
                          <span className="font-mono text-[#93AB9F]">35.7%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[rgba(234,243,236,0.10)]">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#93AB9F] mb-1 font-semibold">
                        Layers
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <label className="flex items-center gap-2 cursor-pointer text-[#EAF3EC]">
                          <span className="w-3 h-3 rounded bg-[#A3F25E] text-[#0A1C0C] flex items-center justify-center text-[9px] font-bold">✓</span>
                          <span>Sentinel-2 (RGB)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-[#EAF3EC]">
                          <span className="w-3 h-3 rounded bg-[#A3F25E] text-[#0A1C0C] flex items-center justify-center text-[9px] font-bold">✓</span>
                          <span>Classified result</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-[#5F766A]">
                          <span className="w-3 h-3 rounded border border-[#5F766A]" />
                          <span>Faults</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Left Scale & Coordinates Bar */}
                  <div className="absolute bottom-4 left-4 bg-[#09100D]/85 backdrop-blur-sm border border-[rgba(234,243,236,0.10)] px-3 py-1.5 rounded font-mono text-[10.5px] text-[#93AB9F] z-20 flex items-center gap-4">
                    <div>Lat 7.3156° &nbsp;Lon 6.6892°</div>
                    <div className="border-l border-[rgba(234,243,236,0.15)] pl-3 flex items-center gap-1 text-[9.5px]">
                      <span>0</span>
                      <span className="w-8 h-[2px] bg-[#93AB9F] inline-block" />
                      <span>10 km</span>
                    </div>
                  </div>

                  {/* Bottom Right Inset Minimap */}
                  <div className="absolute bottom-4 right-4 w-20 h-16 bg-[#09100D]/90 border border-[rgba(234,243,236,0.15)] rounded overflow-hidden z-20 hidden sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/layer-thumbnails/base_map.png" alt="" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-2 border border-[#D9622B] bg-[#D9622B]/20" />
                  </div>

                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 2: How It Works (4 Columns) ────────────────────────────────── */}
        <section id="workflow" className="py-20 bg-[#09100D] border-t border-[rgba(234,243,236,0.08)]">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#A3F25E] font-medium mb-12">
              HOW IT WORKS
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              
              {/* Step 01 */}
              <div className="space-y-3">
                <div className="font-mono text-sm text-[#A3F25E] font-semibold">01</div>
                <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#EAF3EC]">
                  Define your area
                </h3>
                <p className="text-[14.5px] text-[#93AB9F] leading-relaxed">
                  Draw or upload your boundary. Set your region and time range.
                </p>
              </div>

              {/* Step 02 */}
              <div className="space-y-3">
                <div className="font-mono text-sm text-[#A3F25E] font-semibold">02</div>
                <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#EAF3EC]">
                  Choose your data
                </h3>
                <p className="text-[14.5px] text-[#93AB9F] leading-relaxed">
                  Use Sentinel, SAR, DEM and more. Pick from built-in analysis methods or bring your own data.
                </p>
              </div>

              {/* Step 03 */}
              <div className="space-y-3">
                <div className="font-mono text-sm text-[#A3F25E] font-semibold">03</div>
                <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#EAF3EC]">
                  Run classification
                </h3>
                <p className="text-[14.5px] text-[#93AB9F] leading-relaxed">
                  Our ML models process your data in the cloud. No setup, no coding.
                </p>
              </div>

              {/* Step 04 */}
              <div className="space-y-3">
                <div className="font-mono text-sm text-[#A3F25E] font-semibold">04</div>
                <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#EAF3EC]">
                  Get results
                </h3>
                <p className="text-[14.5px] text-[#93AB9F] leading-relaxed">
                  View your land cover map, explore analytics and export your report or data.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ────────────────────────────────── Section 3: Built for Real-World Applications (Light Mode Section) ────────────────────────────────── */}
        <section id="use-cases" className="py-24 bg-[#F8F7F4] text-[#1A1D23] transition-colors">
          <div className="max-w-[1280px] mx-auto px-6">
            
            <div className="max-w-2xl mb-14">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#D9622B] font-semibold block mb-3">
                BUILT FOR REAL-WORLD APPLICATIONS
              </span>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#1A1D23] leading-tight tracking-tight">
                From land cover to mineral potential
              </h2>
              <p className="text-[16px] text-[#69706A] mt-4 leading-relaxed">
                Whether monitoring agricultural cooperatives, auditing municipal urban spread, or running mineral prospectivity exploration, GeoClass delivers verifiable geospatial proof.
              </p>
            </div>

            {/* Showcase Application Grid with ACTUAL GeoClass Visuals */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Big Feature: Actual GeoClass Full Workspace */}
              <div className="lg:col-span-8 bg-white border border-[#D8D5CA] rounded-lg p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-[#E9E6DC] pb-3">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#D9622B] font-semibold">
                      WORKSTATION VIEW
                    </span>
                    <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#1A1D23] mt-0.5">
                      Unified Remote Sensing Command Center
                    </h3>
                  </div>
                  <Link 
                    href="/app" 
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D9622B] hover:underline"
                  >
                    <span>Open Live Engine</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Actual GeoClass Workspace Screenshot */}
                <div className="relative rounded overflow-hidden border border-[#D8D5CA] shadow-inner aspect-[16/9]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/geoclass-app-workspace.jpg" 
                    alt="GeoClass Full Application Workspace" 
                    className="w-full h-full object-cover object-top hover:scale-[1.01] transition duration-300"
                  />
                </div>

                <p className="text-sm text-[#69706A] leading-relaxed">
                  Interactive multi-temporal AOI delineation over Yagba West with 12 layered spectral products, Dynamic World classification consensus, and instant biophysical telemetry.
                </p>
              </div>

              {/* Right Side: Specialized Domain Cards */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Domain Card 1 */}
                <div className="bg-white border border-[#D8D5CA] rounded-lg p-5 shadow-sm space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/layer-thumbnails/land_cover.png" alt="" className="w-5 h-5 rounded" />
                      <span className="font-mono text-[11px] font-semibold text-[#1A1D23]">AI LAND CLASSIFICATION</span>
                    </div>
                    <h4 className="font-['Space_Grotesk'] text-base font-bold text-[#1A1D23]">
                      Spatial Contextual U-Net
                    </h4>
                    <p className="text-xs text-[#69706A] mt-1 leading-relaxed">
                      9-class land use separation: water, trees, grass, crops, flooded vegetation, built area, and bare ground with pixel probability curves.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E9E6DC] flex items-center justify-between text-[11px] font-mono text-[#69706A]">
                    <span>Resolution: 10m</span>
                    <span className="text-[#306840] font-semibold">Ready</span>
                  </div>
                </div>

                {/* Domain Card 2 */}
                <div className="bg-white border border-[#D8D5CA] rounded-lg p-5 shadow-sm space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/layer-thumbnails/vegetation.png" alt="" className="w-5 h-5 rounded" />
                      <span className="font-mono text-[11px] font-semibold text-[#1A1D23]">BIOPHYSICAL INDICES</span>
                    </div>
                    <h4 className="font-['Space_Grotesk'] text-base font-bold text-[#1A1D23]">
                      Canopy Vigor &amp; Moisture Tracking
                    </h4>
                    <p className="text-xs text-[#69706A] mt-1 leading-relaxed">
                      Instant NDVI, NDRE red-edge chlorophyll, and NDWI water content to identify localized crop stress or vegetation disturbance.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E9E6DC] flex items-center justify-between text-[11px] font-mono text-[#69706A]">
                    <span>Multi-Sensor: S2 + Landsat</span>
                    <span className="text-[#306840] font-semibold">Active</span>
                  </div>
                </div>

                {/* Domain Card 3 */}
                <div className="bg-white border border-[#D8D5CA] rounded-lg p-5 shadow-sm space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/layer-thumbnails/sar_radar.png" alt="" className="w-5 h-5 rounded" />
                      <span className="font-mono text-[11px] font-semibold text-[#1A1D23]">MICROWAVE RADAR</span>
                    </div>
                    <h4 className="font-['Space_Grotesk'] text-base font-bold text-[#1A1D23]">
                      Sentinel-1 SAR Penetration
                    </h4>
                    <p className="text-xs text-[#69706A] mt-1 leading-relaxed">
                      C-band active radar reveals surface roughness and soil moisture through heavy cloud cover and monsoon atmospheric haze.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E9E6DC] flex items-center justify-between text-[11px] font-mono text-[#69706A]">
                    <span>Polarization: VV + VH</span>
                    <span className="text-[#306840] font-semibold">Active</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 4: Platform & Layer Gallery ────────────────────────────────── */}
        <section id="platform" className="py-24 bg-[#0C120F] border-t border-[rgba(234,243,236,0.08)]">
          <div className="max-w-[1280px] mx-auto px-6">
            
            <div className="max-w-xl mb-14">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#A3F25E] font-medium block mb-3">
                LAYER REGISTRY
              </span>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#EAF3EC] tracking-tight">
                Authentic satellite layers ready on click
              </h2>
              <p className="text-[#93AB9F] text-[16px] mt-3 leading-relaxed">
                Explore the exact earth observation layers computed on Google Earth Engine supercomputing clusters inside GeoClass.
              </p>
            </div>

            {/* Grid of ACTUAL layer thumbnails */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: 'True Color RGB', img: '/layer-thumbnails/true_color.png', desc: 'Sentinel-2 (10m)' },
                { name: 'False Color NIR', img: '/layer-thumbnails/false_color.png', desc: 'Infrared vegetation' },
                { name: 'Land Cover AI', img: '/layer-thumbnails/land_cover.png', desc: 'U-Net 9-class' },
                { name: 'Vegetation NDVI', img: '/layer-thumbnails/vegetation.png', desc: 'Canopy vitality' },
                { name: 'SAR Radar C-Band', img: '/layer-thumbnails/sar_radar.png', desc: 'Cloud penetration' },
                { name: 'Water (MNDWI)', img: '/layer-thumbnails/water.png', desc: 'Surface hydrology' },
                { name: 'Burn Ratio (NBR)', img: '/layer-thumbnails/burn_ratio.png', desc: 'Fire damage index' },
                { name: 'Built-up (NDBI)', img: '/layer-thumbnails/built_up.png', desc: 'Urban fabric' },
                { name: 'Digital Elevation', img: '/layer-thumbnails/digital_elevation.png', desc: 'Copernicus 30m' },
                { name: 'Slope Stability', img: '/layer-thumbnails/slope_stability.png', desc: 'Geotechnical grades' },
                { name: 'Terrain Hillshade', img: '/layer-thumbnails/terrain_hillshade.png', desc: '3D shaded relief' },
                { name: 'Landsat 8/9 RGB', img: '/layer-thumbnails/landsat_rgb.png', desc: 'USGS/NASA baseline' },
              ].map((layer, idx) => (
                <div 
                  key={idx}
                  className="bg-[#111A16] border border-[rgba(234,243,236,0.10)] hover:border-[#A3F25E] rounded-md p-3 transition group flex flex-col justify-between"
                >
                  <div className="aspect-video w-full rounded overflow-hidden mb-2.5 bg-[#09100D] border border-[rgba(234,243,236,0.06)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={layer.img} 
                      alt={layer.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#EAF3EC] leading-tight group-hover:text-[#A3F25E] transition">
                      {layer.name}
                    </div>
                    <div className="text-[11px] font-mono text-[#5F766A] mt-1">
                      {layer.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 5: Field Tools Showcase ────────────────────────────────── */}
        <section id="tools" className="py-24 bg-[#09100D] border-t border-[rgba(234,243,236,0.08)]">
          <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#A3F25E] font-medium block">
                DIAGNOSTIC TOOLS
              </span>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#EAF3EC] tracking-tight">
                Inspect pixels, curves, and time series
              </h2>
              <p className="text-[#93AB9F] text-[16px] leading-relaxed">
                GeoClass is engineered for analysts who need to verify ground truth with physics-based diagnostics before publishing conclusions.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded border border-[rgba(234,243,236,0.08)] bg-[#111A16] flex gap-3">
                  <div className="font-mono text-xs text-[#A3F25E] font-semibold w-24 flex-shrink-0 pt-0.5">10-BAND</div>
                  <div>
                    <h4 className="font-['Space_Grotesk'] text-sm font-bold text-[#EAF3EC]">Full Spectral Signature Graph</h4>
                    <p className="text-xs text-[#93AB9F] mt-1">Click any pixel on Earth to graph its exact 10-band surface reflectance profile from coastal blue to SWIR-2.</p>
                  </div>
                </div>

                <div className="p-4 rounded border border-[rgba(234,243,236,0.08)] bg-[#111A16] flex gap-3">
                  <div className="font-mono text-xs text-[#A3F25E] font-semibold w-24 flex-shrink-0 pt-0.5">5-YEAR</div>
                  <div>
                    <h4 className="font-['Space_Grotesk'] text-sm font-bold text-[#EAF3EC]">Pixel Trajectory &amp; LandTrendr</h4>
                    <p className="text-xs text-[#93AB9F] mt-1">Segment multi-year Sentinel-2 medians from 2018 to 2025 to separate permanent land conversion from seasonal phenology.</p>
                  </div>
                </div>

                <div className="p-4 rounded border border-[rgba(234,243,236,0.08)] bg-[#111A16] flex gap-3">
                  <div className="font-mono text-xs text-[#A3F25E] font-semibold w-24 flex-shrink-0 pt-0.5">SWIPE</div>
                  <div>
                    <h4 className="font-['Space_Grotesk'] text-sm font-bold text-[#EAF3EC]">Split-Screen Comparison Curtain</h4>
                    <p className="text-xs text-[#93AB9F] mt-1">Drag an interactive vertical curtain to immediately detect what changed between two satellite passes or between RGB and classified masks.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Deliverables Card Preview */}
            <div className="lg:col-span-6 bg-[#111A16] border border-[rgba(234,243,236,0.12)] rounded-lg p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[rgba(234,243,236,0.08)] pb-4">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#A3F25E]">EXPORT SUITE</span>
                <span className="font-mono text-[11px] text-[#93AB9F]">FIELD &amp; GIS READY</span>
              </div>
              <h3 className="font-['Space_Grotesk'] text-2xl font-bold text-[#EAF3EC]">
                Every result exports in publication formats
              </h3>
              <p className="text-sm text-[#93AB9F] leading-relaxed">
                Take classified layers directly into QGIS, ArcGIS, Google Earth, or send executive summary dossiers to leadership.
              </p>
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs text-[#EAF3EC]">
                <div className="bg-[#09100D] p-2.5 rounded border border-[rgba(234,243,236,0.08)] flex items-center gap-2">
                  <span className="text-[#A3F25E]">●</span> GeoTIFF (32-bit Float)
                </div>
                <div className="bg-[#09100D] p-2.5 rounded border border-[rgba(234,243,236,0.08)] flex items-center gap-2">
                  <span className="text-[#A3F25E]">●</span> GeoJSON Vector
                </div>
                <div className="bg-[#09100D] p-2.5 rounded border border-[rgba(234,243,236,0.08)] flex items-center gap-2">
                  <span className="text-[#A3F25E]">●</span> KMZ Google Earth
                </div>
                <div className="bg-[#09100D] p-2.5 rounded border border-[rgba(234,243,236,0.08)] flex items-center gap-2">
                  <span className="text-[#A3F25E]">●</span> Executive PDF Dossier
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 6: Final CTA Band ────────────────────────────────── */}
        <section className="py-24 text-center bg-[#0C120F] border-t border-[rgba(234,243,236,0.08)]">
          <div className="max-w-2xl mx-auto px-6 space-y-6">
            <h2 className="font-['Space_Grotesk'] text-3xl sm:text-5xl font-bold text-[#EAF3EC] tracking-tight">
              Start your first classification.
            </h2>
            <p className="text-[#93AB9F] text-base sm:text-lg leading-relaxed">
              Launch the workspace, pick any coordinate on Earth, and receive instant land cover intelligence.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              <Link 
                href="/app" 
                className="inline-flex items-center justify-center gap-2 bg-[#A3F25E] hover:bg-[#B4F775] text-[#0A1C0C] font-semibold text-[15px] px-6 py-3 rounded-[4px] transition duration-150 shadow-[0_0_25px_rgba(163,242,94,0.25)]"
              >
                <span>Launch Workspace Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center border border-[rgba(234,243,236,0.15)] hover:border-[#EAF3EC] text-[#EAF3EC] font-medium text-[15px] px-6 py-3 rounded-[4px] transition duration-150 bg-[#111A16]"
              >
                <span>Sign in</span>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ────────────────────────────────── Footer ────────────────────────────────── */}
      <footer className="border-t border-[rgba(234,243,236,0.08)] bg-[#070B09] py-12">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/geoclass-logo.png" 
              alt="GeoClass" 
              className="h-6 w-auto object-contain brightness-110 contrast-125"
            />
            <span className="text-[12px] text-[#5F766A]">
              © {new Date().getFullYear()} GeoClass Geospatial Systems.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[13.5px] text-[#93AB9F]">
            <a href="#platform" className="hover:text-[#EAF3EC] transition">Platform</a>
            <a href="#workflow" className="hover:text-[#EAF3EC] transition">Workflow</a>
            <a href="#tools" className="hover:text-[#EAF3EC] transition">Tools</a>
            <a href="#use-cases" className="hover:text-[#EAF3EC] transition">Use cases</a>
            <Link href="/methods" className="hover:text-[#A3F25E] transition">Methods &amp; API</Link>
            <Link href="/login" className="hover:text-[#EAF3EC] transition">Log in</Link>
          </div>

          <div className="font-mono text-[11px] text-[#5F766A]">
            Sentinel-2 MSI · Sentinel-1 SAR · Copernicus 30m DEM
          </div>
        </div>
      </footer>

    </div>
  );
}
