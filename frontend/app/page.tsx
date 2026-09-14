'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Layers, 
  Download, 
  Cpu, 
  PenTool, 
  Upload, 
  BarChart2, 
  ChevronDown, 
  ExternalLink
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#07100D] text-[#F1F3EF] selection:bg-[#B7F36B] selection:text-[#07100D] font-sans relative">
      
      {/* ────────────────────────────────── Header Navigation ────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#07100D] border-b border-[#26332E]">
        <div className="max-w-[1240px] mx-auto px-6 h-17 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 cursor-pointer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/geoclass-logo.png" 
                alt="GeoClass" 
                className="h-7 w-auto object-contain brightness-110 contrast-125"
              />
            </Link>
            <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-[0.12em] text-[#69766F] border-l border-[#26332E] pl-4">
              Earth Observation
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#A5B2AB]" aria-label="Main Navigation">
            <a href="#platform" className="hover:text-[#F1F3EF] transition-colors">Platform</a>
            <a href="#workflow" className="hover:text-[#F1F3EF] transition-colors">Workflow</a>
            <a href="#tools" className="hover:text-[#F1F3EF] transition-colors">Tools</a>
            <a href="#use-cases" className="hover:text-[#F1F3EF] transition-colors">Use cases</a>
            <Link href="/methods" className="hover:text-[#B7F36B] transition-colors">Methods &amp; API</Link>
          </nav>

          <div className="flex items-center gap-5">
            <Link 
              href="/login" 
              className="text-[14px] font-medium text-[#A5B2AB] hover:text-[#F1F3EF] transition-colors hidden sm:inline-block"
            >
              Log in
            </Link>
            <Link 
              href="/app" 
              className="inline-flex items-center gap-2 bg-[#B7F36B] hover:bg-[#C8FF82] text-[#07100D] font-semibold text-[13.5px] px-4 py-2 rounded-[4px] transition-colors"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>

        {/* ────────────────────────────────── Hero Section ────────────────────────────────── */}
        <section className="pt-16 pb-20 lg:pt-22 lg:pb-24">
          <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-5 space-y-6">
              <div className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#B7F36B]">
                SATELLITE ANALYTICS FOR REAL WORLD DECISIONS
              </div>

              {/* Exact Hero Typography: font-size 64px, line-height 1.02, font-weight 400, letter-spacing -0.04em */}
              <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-normal leading-[1.02] tracking-[-0.04em] text-[#F1F3EF]">
                Satellite analysis,<br />
                <span className="font-medium text-[#B7F36B]">without the GIS</span><br />
                overhead.
              </h1>

              {/* Exact Hero Description: font-size 18px, line-height 1.6, font-weight 400, color #A5B2AB */}
              <p className="text-[17px] sm:text-[18px] leading-[1.6] font-normal text-[#A5B2AB] max-w-lg">
                GeoClass turns Earth observation data into maps and results you can actually use. Define an area, choose your imagery, run an analysis. No complex setup, no GIS software.
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                {/* Primary Button: #B7F36B, #07100D, 4px radius, font-weight 600 */}
                <Link 
                  href="/app" 
                  className="inline-flex items-center justify-center gap-2 bg-[#B7F36B] hover:bg-[#C8FF82] text-[#07100D] font-semibold text-[14.5px] px-5 py-2.5 rounded-[4px] transition-colors"
                >
                  <span>Start classifying free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {/* Secondary link */}
                <a 
                  href="#workflow" 
                  className="text-[14.5px] font-medium text-[#F1F3EF] hover:text-[#B7F36B] underline underline-offset-4 decoration-[#26332E] hover:decoration-[#B7F36B] transition-colors"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Right Hero Product Window Mockup (Using actual Earth-observation imagery) */}
            <div className="lg:col-span-7">
              <div className="bg-[#101C18] border border-[#26332E] rounded-[4px] overflow-hidden flex flex-col relative">
                
                {/* Window Chrome Bar */}
                <div className="bg-[#07100D] border-b border-[#26332E] px-4 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/geoclass-emblem.png" alt="" className="h-4 w-auto brightness-110" />
                      <span className="font-serif font-bold tracking-tight text-[#F1F3EF] text-[13px]">GeoClass</span>
                    </div>
                    <span className="text-[#26332E]">|</span>
                    <button type="button" className="flex items-center gap-1.5 text-[#A5B2AB] font-mono text-[11px]">
                      <span>Gold Prospectivity — Yagba West</span>
                      <ChevronDown className="w-3 h-3 text-[#69766F]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#B7F36B]" />
                    <div className="w-6 h-6 rounded-[2px] bg-[#101C18] border border-[#26332E] flex items-center justify-center text-[10px] font-mono text-[#F1F3EF]">
                      NI
                    </div>
                  </div>
                </div>

                {/* Real Satellite Map Canvas */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#07100D]">
                  
                  {/* Actual GeoClass Satellite Capture */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/geoclass-map-satellite.jpg" 
                    alt="GeoClass Satellite Map" 
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />

                  {/* Vector AOI Boundary & Classification Heatmap */}
                  <div className="absolute inset-0 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 600 380" preserveAspectRatio="none">
                      <defs>
                        <radialGradient id="prospectivityHeat" cx="65%" cy="50%" r="55%">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.88" />
                          <stop offset="25%" stopColor="#E7B84B" stopOpacity="0.85" />
                          <stop offset="60%" stopColor="#B7F36B" stopOpacity="0.80" />
                          <stop offset="90%" stopColor="#4CAF6A" stopOpacity="0.75" />
                          <stop offset="100%" stopColor="#101C18" stopOpacity="0.65" />
                        </radialGradient>
                        <clipPath id="heroAoiClip">
                          <polygon points="370,90 460,135 470,265 385,325 330,230 370,90" />
                        </clipPath>
                      </defs>

                      {/* Heatmap clipped inside AOI */}
                      <g clipPath="url(#heroAoiClip)">
                        <rect x="300" y="70" width="200" height="270" fill="url(#prospectivityHeat)" />
                        <path d="M340,120 Q390,160 420,130 T460,200" stroke="#E7B84B" strokeWidth="2.5" fill="none" opacity="0.6" />
                        <path d="M350,220 Q400,200 430,250 T460,280" stroke="#EF4444" strokeWidth="3" fill="none" opacity="0.5" />
                      </g>

                      {/* Map Selection Boundary: Lime #B7F36B */}
                      <polygon 
                        points="370,90 460,135 470,265 385,325 330,230" 
                        fill="none" 
                        stroke="#B7F36B" 
                        strokeWidth="1.8" 
                        strokeDasharray="4 3" 
                      />
                      <circle cx="370" cy="90" r="3.5" fill="#B7F36B" />
                      <circle cx="460" cy="135" r="3.5" fill="#B7F36B" />
                      <circle cx="470" cy="265" r="3.5" fill="#B7F36B" />
                      <circle cx="385" cy="325" r="3.5" fill="#B7F36B" />
                      <circle cx="330" cy="230" r="3.5" fill="#B7F36B" />
                    </svg>
                  </div>

                  {/* Left Floating Mini Toolstrip */}
                  <div className="absolute top-4 left-4 bg-[#07100D] border border-[#26332E] rounded-[4px] p-1 flex flex-col gap-1 z-20">
                    <button type="button" className="p-2 rounded-[2px] bg-[#101C18] border border-[#B7F36B] text-[#B7F36B] flex flex-col items-center gap-0.5">
                      <PenTool className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-mono">Draw</span>
                    </button>
                    <button type="button" className="p-2 rounded-[2px] text-[#A5B2AB] hover:text-[#F1F3EF] flex flex-col items-center gap-0.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-mono">Upload</span>
                    </button>
                    <button type="button" className="p-2 rounded-[2px] text-[#A5B2AB] hover:text-[#F1F3EF] flex flex-col items-center gap-0.5 transition-colors">
                      <Layers className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-mono">Imagery</span>
                    </button>
                    <button type="button" className="p-2 rounded-[2px] text-[#A5B2AB] hover:text-[#F1F3EF] flex flex-col items-center gap-0.5 transition-colors">
                      <Cpu className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-mono">Analysis</span>
                    </button>
                    <button type="button" className="p-2 rounded-[2px] text-[#A5B2AB] hover:text-[#F1F3EF] flex flex-col items-center gap-0.5 transition-colors">
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-mono">Results</span>
                    </button>
                  </div>

                  {/* Right Floating Classification Card */}
                  <div className="absolute top-4 right-4 bg-[#07100D] border border-[#26332E] rounded-[4px] p-3.5 w-44 z-20 space-y-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#A5B2AB] mb-1.5 font-medium">
                        Classification
                      </div>
                      <div className="space-y-1 text-[11px] font-medium">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                            <span className="text-[#F1F3EF]">High potential</span>
                          </div>
                          <span className="font-mono text-[#A5B2AB]">8.7%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#E7B84B]" />
                            <span className="text-[#F1F3EF]">Moderate</span>
                          </div>
                          <span className="font-mono text-[#A5B2AB]">21.4%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#4CAF6A]" />
                            <span className="text-[#F1F3EF]">Low</span>
                          </div>
                          <span className="font-mono text-[#A5B2AB]">34.2%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#26332E]" />
                            <span className="text-[#A5B2AB]">Non-prospective</span>
                          </div>
                          <span className="font-mono text-[#A5B2AB]">35.7%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#26332E]">
                      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#A5B2AB] mb-1 font-medium">
                        Layers
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <label className="flex items-center gap-2 text-[#F1F3EF]">
                          <span className="w-3 h-3 rounded-[2px] bg-[#B7F36B] text-[#07100D] flex items-center justify-center text-[9px] font-bold">✓</span>
                          <span>Sentinel-2 (RGB)</span>
                        </label>
                        <label className="flex items-center gap-2 text-[#F1F3EF]">
                          <span className="w-3 h-3 rounded-[2px] bg-[#B7F36B] text-[#07100D] flex items-center justify-center text-[9px] font-bold">✓</span>
                          <span>Classified result</span>
                        </label>
                        <label className="flex items-center gap-2 text-[#69766F]">
                          <span className="w-3 h-3 rounded-[2px] border border-[#26332E]" />
                          <span>Faults</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Left Scale & Coordinates Bar in IBM Plex Mono */}
                  <div className="absolute bottom-4 left-4 bg-[#07100D] border border-[#26332E] px-3 py-1.5 rounded-[2px] font-mono text-[10.5px] text-[#A5B2AB] z-20 flex items-center gap-4">
                    <div>Lat 7.3156° &nbsp;Lon 6.6892°</div>
                    <div className="border-l border-[#26332E] pl-3 flex items-center gap-1 text-[9.5px]">
                      <span>0</span>
                      <span className="w-8 h-[1px] bg-[#A5B2AB] inline-block" />
                      <span>10 km</span>
                    </div>
                  </div>

                  {/* Bottom Right Inset Minimap */}
                  <div className="absolute bottom-4 right-4 w-20 h-16 bg-[#07100D] border border-[#26332E] rounded-[2px] overflow-hidden z-20 hidden sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/layer-thumbnails/base_map.png" alt="" className="w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-2 border border-[#B7F36B] bg-[#B7F36B]/15" />
                  </div>

                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 2: How It Works ────────────────────────────────── */}
        <section id="workflow" className="py-20 bg-[#0B1713] border-t border-[#26332E]">
          <div className="max-w-[1240px] mx-auto px-6">
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#B7F36B] mb-12">
              HOW IT WORKS
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              
              {/* Step 01 */}
              <div className="space-y-3">
                <div className="font-mono text-sm text-[#B7F36B] font-medium">01</div>
                <h3 className="text-xl font-semibold text-[#F1F3EF]">
                  Define your area
                </h3>
                <p className="text-[15px] font-normal text-[#A5B2AB] leading-relaxed">
                  Draw or upload your boundary. Set your region and time range.
                </p>
              </div>

              {/* Step 02 */}
              <div className="space-y-3">
                <div className="font-mono text-sm text-[#B7F36B] font-medium">02</div>
                <h3 className="text-xl font-semibold text-[#F1F3EF]">
                  Choose your data
                </h3>
                <p className="text-[15px] font-normal text-[#A5B2AB] leading-relaxed">
                  Use Sentinel, SAR, DEM and more. Pick from built-in analysis methods or bring your own data.
                </p>
              </div>

              {/* Step 03 */}
              <div className="space-y-3">
                <div className="font-mono text-sm text-[#B7F36B] font-medium">03</div>
                <h3 className="text-xl font-semibold text-[#F1F3EF]">
                  Run classification
                </h3>
                <p className="text-[15px] font-normal text-[#A5B2AB] leading-relaxed">
                  Our ML models process your data in the cloud. No setup, no coding.
                </p>
              </div>

              {/* Step 04 */}
              <div className="space-y-3">
                <div className="font-mono text-sm text-[#B7F36B] font-medium">04</div>
                <h3 className="text-xl font-semibold text-[#F1F3EF]">
                  Get results
                </h3>
                <p className="text-[15px] font-normal text-[#A5B2AB] leading-relaxed">
                  View your land cover map, explore analytics and export your report or data.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ────────────────────────────────── Section 3: Built for Real-World Applications ────────────────────────────────── */}
        <section id="use-cases" className="py-24 bg-[#07100D] border-t border-[#26332E]">
          <div className="max-w-[1240px] mx-auto px-6">
            
            <div className="max-w-2xl mb-14">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#B7F36B] block mb-3">
                BUILT FOR REAL-WORLD APPLICATIONS
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[48px] font-normal leading-[1.05] tracking-[-0.03em] text-[#F1F3EF]">
                From land cover to <span className="text-[#B7F36B] font-medium">mineral potential</span>
              </h2>
              <p className="text-[16px] text-[#A5B2AB] mt-4 leading-[1.6]">
                Whether monitoring agricultural cooperatives, auditing municipal urban spread, or running mineral prospectivity exploration, GeoClass delivers verifiable geospatial proof.
              </p>
            </div>

            {/* Showcase Application Grid with ACTUAL GeoClass Visuals */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Actual GeoClass Full Workspace Screenshot */}
              <div className="lg:col-span-8 bg-[#101C18] border border-[#26332E] rounded-[4px] p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-[#26332E] pb-3">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#B7F36B] font-medium">
                      WORKSTATION VIEW
                    </span>
                    <h3 className="text-lg font-semibold text-[#F1F3EF] mt-0.5">
                      Unified Remote Sensing Command Center
                    </h3>
                  </div>
                  <Link 
                    href="/app" 
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B7F36B] hover:underline"
                  >
                    <span>Open Live Engine</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Actual GeoClass Screenshot on Disk */}
                <div className="relative rounded-[2px] overflow-hidden border border-[#26332E] aspect-[16/9] bg-[#07100D]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/geoclass-app-workspace.jpg" 
                    alt="GeoClass Full Application Workspace" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                <p className="text-sm text-[#A5B2AB] leading-relaxed">
                  Interactive multi-temporal AOI delineation over Yagba West with 12 layered spectral products, Dynamic World classification consensus, and instant biophysical telemetry.
                </p>
              </div>

              {/* Right Side: Specialized Domain Cards */}
              <div className="lg:col-span-4 flex flex-col gap-5">
                
                {/* Domain Card 1 */}
                <div className="bg-[#101C18] border border-[#26332E] rounded-[4px] p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/layer-thumbnails/land_cover.png" alt="" className="w-5 h-5 rounded-[2px]" />
                      <span className="font-mono text-[11px] font-medium text-[#F1F3EF]">AI LAND CLASSIFICATION</span>
                    </div>
                    <h4 className="text-base font-semibold text-[#F1F3EF]">
                      Spatial Contextual U-Net
                    </h4>
                    <p className="text-xs text-[#A5B2AB] mt-1 leading-relaxed">
                      9-class land use separation: water, trees, grass, crops, flooded vegetation, built area, and bare ground with pixel probability curves.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#26332E] flex items-center justify-between text-[11px] font-mono text-[#69766F]">
                    <span>Resolution: 10m</span>
                    <span className="text-[#4CAF6A] font-medium">Ready</span>
                  </div>
                </div>

                {/* Domain Card 2 */}
                <div className="bg-[#101C18] border border-[#26332E] rounded-[4px] p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/layer-thumbnails/vegetation.png" alt="" className="w-5 h-5 rounded-[2px]" />
                      <span className="font-mono text-[11px] font-medium text-[#F1F3EF]">BIOPHYSICAL INDICES</span>
                    </div>
                    <h4 className="text-base font-semibold text-[#F1F3EF]">
                      Canopy Vigor &amp; Moisture Tracking
                    </h4>
                    <p className="text-xs text-[#A5B2AB] mt-1 leading-relaxed">
                      Instant NDVI, NDRE red-edge chlorophyll, and NDWI water content to identify localized crop stress or vegetation disturbance.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#26332E] flex items-center justify-between text-[11px] font-mono text-[#69766F]">
                    <span>Multi-Sensor: S2 + Landsat</span>
                    <span className="text-[#4CAF6A] font-medium">Active</span>
                  </div>
                </div>

                {/* Domain Card 3 */}
                <div className="bg-[#101C18] border border-[#26332E] rounded-[4px] p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/layer-thumbnails/sar_radar.png" alt="" className="w-5 h-5 rounded-[2px]" />
                      <span className="font-mono text-[11px] font-medium text-[#F1F3EF]">MICROWAVE RADAR</span>
                    </div>
                    <h4 className="text-base font-semibold text-[#F1F3EF]">
                      Sentinel-1 SAR Penetration
                    </h4>
                    <p className="text-xs text-[#A5B2AB] mt-1 leading-relaxed">
                      C-band active radar reveals surface roughness and soil moisture through heavy cloud cover and monsoon atmospheric haze.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#26332E] flex items-center justify-between text-[11px] font-mono text-[#69766F]">
                    <span>Polarization: VV + VH</span>
                    <span className="text-[#4CAF6A] font-medium">Active</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 4: Authentic Layer Gallery ────────────────────────────────── */}
        <section id="platform" className="py-24 bg-[#0B1713] border-t border-[#26332E]">
          <div className="max-w-[1240px] mx-auto px-6">
            
            <div className="max-w-xl mb-14">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#B7F36B] block mb-3">
                LAYER REGISTRY
              </span>
              <h2 className="text-3xl sm:text-4xl font-normal leading-[1.1] tracking-[-0.03em] text-[#F1F3EF]">
                Authentic satellite layers ready on click
              </h2>
              <p className="text-[#A5B2AB] text-[16px] mt-3 leading-relaxed">
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
                  className="bg-[#101C18] border border-[#26332E] hover:border-[#B7F36B] rounded-[4px] p-3 transition-colors flex flex-col justify-between"
                >
                  <div className="aspect-video w-full rounded-[2px] overflow-hidden mb-2.5 bg-[#07100D] border border-[#26332E]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={layer.img} 
                      alt={layer.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#F1F3EF] leading-tight">
                      {layer.name}
                    </div>
                    <div className="text-[11px] font-mono text-[#69766F] mt-1">
                      {layer.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 5: Field Tools & Deliverables ────────────────────────────────── */}
        <section id="tools" className="py-24 bg-[#07100D] border-t border-[#26332E]">
          <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#B7F36B] block">
                DIAGNOSTIC TOOLS
              </span>
              <h2 className="text-3xl sm:text-4xl font-normal leading-[1.1] tracking-[-0.03em] text-[#F1F3EF]">
                Inspect pixels, curves, and time series
              </h2>
              <p className="text-[#A5B2AB] text-[16px] leading-[1.6]">
                GeoClass is engineered for analysts who need to verify ground truth with physics-based diagnostics before publishing conclusions.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-[4px] border border-[#26332E] bg-[#101C18] flex gap-3">
                  <div className="font-mono text-xs text-[#B7F36B] font-medium w-24 flex-shrink-0 pt-0.5">10-BAND</div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#F1F3EF]">Full Spectral Signature Graph</h4>
                    <p className="text-xs text-[#A5B2AB] mt-1">Click any pixel on Earth to graph its exact 10-band surface reflectance profile from coastal blue to SWIR-2.</p>
                  </div>
                </div>

                <div className="p-4 rounded-[4px] border border-[#26332E] bg-[#101C18] flex gap-3">
                  <div className="font-mono text-xs text-[#B7F36B] font-medium w-24 flex-shrink-0 pt-0.5">5-YEAR</div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#F1F3EF]">Pixel Trajectory &amp; LandTrendr</h4>
                    <p className="text-xs text-[#A5B2AB] mt-1">Segment multi-year Sentinel-2 medians from 2018 to 2025 to separate permanent land conversion from seasonal phenology.</p>
                  </div>
                </div>

                <div className="p-4 rounded-[4px] border border-[#26332E] bg-[#101C18] flex gap-3">
                  <div className="font-mono text-xs text-[#B7F36B] font-medium w-24 flex-shrink-0 pt-0.5">SWIPE</div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#F1F3EF]">Split-Screen Comparison Curtain</h4>
                    <p className="text-xs text-[#A5B2AB] mt-1">Drag an interactive vertical curtain to immediately detect what changed between two satellite passes or between RGB and classified masks.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Deliverables Card Preview */}
            <div className="lg:col-span-6 bg-[#101C18] border border-[#26332E] rounded-[4px] p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[#26332E] pb-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#B7F36B] font-medium">EXPORT SUITE</span>
                <span className="font-mono text-[11px] text-[#A5B2AB]">FIELD &amp; GIS READY</span>
              </div>
              <h3 className="text-2xl font-semibold text-[#F1F3EF]">
                Every result exports in publication formats
              </h3>
              <p className="text-sm text-[#A5B2AB] leading-relaxed">
                Take classified layers directly into QGIS, ArcGIS, Google Earth, or send executive summary dossiers to leadership.
              </p>
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs text-[#F1F3EF]">
                <div className="bg-[#07100D] p-2.5 rounded-[2px] border border-[#26332E] flex items-center gap-2">
                  <span className="text-[#B7F36B]">●</span> GeoTIFF (32-bit Float)
                </div>
                <div className="bg-[#07100D] p-2.5 rounded-[2px] border border-[#26332E] flex items-center gap-2">
                  <span className="text-[#B7F36B]">●</span> GeoJSON Vector
                </div>
                <div className="bg-[#07100D] p-2.5 rounded-[2px] border border-[#26332E] flex items-center gap-2">
                  <span className="text-[#B7F36B]">●</span> KMZ Google Earth
                </div>
                <div className="bg-[#07100D] p-2.5 rounded-[2px] border border-[#26332E] flex items-center gap-2">
                  <span className="text-[#B7F36B]">●</span> Executive PDF Dossier
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 6: Final CTA Band ────────────────────────────────── */}
        <section className="py-24 text-center bg-[#0B1713] border-t border-[#26332E]">
          <div className="max-w-2xl mx-auto px-6 space-y-6">
            <h2 className="text-3xl sm:text-5xl font-normal leading-[1.05] tracking-[-0.03em] text-[#F1F3EF]">
              Start your first <span className="font-medium text-[#B7F36B]">classification</span>.
            </h2>
            <p className="text-[#A5B2AB] text-base sm:text-lg leading-relaxed">
              Launch the workspace, pick any coordinate on Earth, and receive instant land cover intelligence.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              <Link 
                href="/app" 
                className="inline-flex items-center justify-center gap-2 bg-[#B7F36B] hover:bg-[#C8FF82] text-[#07100D] font-semibold text-[15px] px-6 py-3 rounded-[4px] transition-colors"
              >
                <span>Launch Workspace Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center border border-[#26332E] hover:border-[#A5B2AB] text-[#F1F3EF] font-medium text-[15px] px-6 py-3 rounded-[4px] transition-colors bg-[#07100D]"
              >
                <span>Sign in</span>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ────────────────────────────────── Footer ────────────────────────────────── */}
      <footer className="border-t border-[#26332E] bg-[#07100D] py-12">
        <div className="max-w-[1240px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/geoclass-logo.png" 
              alt="GeoClass" 
              className="h-6 w-auto object-contain brightness-110 contrast-125"
            />
            <span className="text-[12px] text-[#69766F]">
              © {new Date().getFullYear()} GeoClass Geospatial Systems.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[13.5px] text-[#A5B2AB]">
            <a href="#platform" className="hover:text-[#F1F3EF] transition-colors">Platform</a>
            <a href="#workflow" className="hover:text-[#F1F3EF] transition-colors">Workflow</a>
            <a href="#tools" className="hover:text-[#F1F3EF] transition-colors">Tools</a>
            <a href="#use-cases" className="hover:text-[#F1F3EF] transition-colors">Use cases</a>
            <Link href="/methods" className="hover:text-[#B7F36B] transition-colors">Methods &amp; API</Link>
            <Link href="/login" className="hover:text-[#F1F3EF] transition-colors">Log in</Link>
          </div>

          <div className="font-mono text-[11px] text-[#69766F]">
            Sentinel-2 MSI · Sentinel-1 SAR · Copernicus 30m DEM
          </div>
        </div>
      </footer>

    </div>
  );
}
