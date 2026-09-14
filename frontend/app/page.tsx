'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronRight, Layers, Compass, Play, Sparkles, Shield, Cpu, BarChart3, Download, ExternalLink, Globe } from 'lucide-react';

export default function LandingPage() {
  const [activeBand, setActiveBand] = useState<'true_color' | 'land_cover' | 'ndvi' | 'sar'>('land_cover');

  return (
    <div className="min-h-screen bg-[#0A1310] text-[#EAF3EC] selection:bg-[#A3F25E] selection:text-[#0A1C0C] font-sans relative overflow-x-hidden">
      {/* Background Cartographic Grid Texture */}
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

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#0A1310]/85 backdrop-blur-md border-b border-[rgba(234,243,236,0.10)] transition-all">
        <div className="max-w-[1200px] mx-auto px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/geoclass-logo.png" 
              alt="GeoClass Logo" 
              className="h-7 w-auto object-contain brightness-110 contrast-125"
            />
            <span className="hidden sm:inline-block font-mono text-[10.5px] uppercase tracking-widest text-[#93AB9F] border-l border-[rgba(234,243,236,0.12)] pl-3">
              Earth Observation
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-[14px] font-medium text-[#93AB9F]" aria-label="Main Navigation">
            <a href="#platform" className="hover:text-[#EAF3EC] transition">Platform</a>
            <a href="#workflow" className="hover:text-[#EAF3EC] transition">Workflow</a>
            <a href="#tools" className="hover:text-[#EAF3EC] transition">Tools</a>
            <a href="#use-cases" className="hover:text-[#EAF3EC] transition">Use cases</a>
            <Link href="/methods" className="hover:text-[#A3F25E] transition flex items-center gap-1">
              <span>Methods &amp; API</span>
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-[14px] text-[#93AB9F] hover:text-[#EAF3EC] transition font-medium hidden sm:inline-block"
            >
              Log in
            </Link>
            <Link 
              href="/app" 
              className="inline-flex items-center gap-2 bg-[#A3F25E] hover:bg-[#B4F775] text-[#0A1C0C] font-semibold text-[13.5px] px-4 py-2 rounded-[2px] transition duration-150 shadow-[0_0_20px_rgba(163,242,94,0.2)] hover:shadow-[0_0_25px_rgba(163,242,94,0.35)]"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="pt-20 pb-20 lg:pt-28 lg:pb-28">
          <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 font-mono text-[12px] text-[#A3F25E] bg-[rgba(163,242,94,0.06)] border border-[rgba(163,242,94,0.3)] px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A3F25E] animate-pulse" />
                <span>Sentinel-2 MSI · Sentinel-1 SAR · Google Earth Engine</span>
              </div>

              <h1 className="font-['Space_Grotesk'] text-4xl sm:text-5xl lg:text-[52px] font-bold leading-[1.1] tracking-[-0.02em] text-[#EAF3EC]">
                Draw a boundary.<br />
                Get a <span className="text-[#A3F25E]">land cover map</span><br />
                back in minutes.
              </h1>

              <p className="text-[17px] text-[#93AB9F] leading-relaxed max-w-xl font-normal">
                GeoClass turns raw satellite imagery into classified land cover, deep spectral analytics, and export-ready reports — without opening a GIS desktop app or writing a single line of code.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link 
                  href="/app" 
                  className="inline-flex items-center justify-center gap-2.5 bg-[#A3F25E] hover:bg-[#B4F775] text-[#0A1C0C] font-semibold text-[15px] px-6 py-3 rounded-[2px] transition duration-150 shadow-[0_0_24px_rgba(163,242,94,0.25)]"
                >
                  <span>Start classifying free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a 
                  href="#workflow" 
                  className="inline-flex items-center justify-center gap-2 border border-[rgba(234,243,236,0.15)] hover:border-[#EAF3EC] text-[#EAF3EC] font-medium text-[15px] px-6 py-3 rounded-[2px] transition duration-150 bg-[rgba(16,32,26,0.5)]"
                >
                  <span>See how it works</span>
                </a>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[rgba(234,243,236,0.10)] max-w-lg">
                <div>
                  <div className="font-['Space_Grotesk'] text-2xl font-bold text-[#EAF3EC] mono">10m</div>
                  <div className="text-[12px] text-[#5F766A] mt-1 uppercase tracking-wider font-mono">Ground resolution</div>
                </div>
                <div>
                  <div className="font-['Space_Grotesk'] text-2xl font-bold text-[#EAF3EC] mono">3</div>
                  <div className="text-[12px] text-[#5F766A] mt-1 uppercase tracking-wider font-mono">Classifier engines</div>
                </div>
                <div>
                  <div className="font-['Space_Grotesk'] text-2xl font-bold text-[#EAF3EC] mono">9+</div>
                  <div className="text-[12px] text-[#5F766A] mt-1 uppercase tracking-wider font-mono">Spectral &amp; DEM layers</div>
                </div>
              </div>
            </div>

            {/* Right Hero Interactive Panel */}
            <div className="lg:col-span-6">
              <div className="bg-[#10201A] border border-[rgba(234,243,236,0.12)] rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] aspect-square max-w-[500px] mx-auto flex flex-col relative group">
                
                {/* Panel Header */}
                <div className="bg-[#0D1A15] border-b border-[rgba(234,243,236,0.10)] px-4 py-2.5 flex items-center justify-between font-mono text-[11.5px] text-[#5F766A]">
                  <span className="text-[#93AB9F]">AOI_DISTRICT_07.geojson</span>
                  <div className="flex items-center gap-1.5 text-[#A3F25E]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A3F25E] animate-pulse" />
                    <span>CLASSIFICATION COMPLETE</span>
                  </div>
                </div>

                {/* Map Canvas with dynamic background based on activeBand */}
                <div className="relative flex-1 overflow-hidden transition-all duration-500">
                  {/* Visual background layers */}
                  <div 
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      activeBand === 'land_cover' ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      background: `
                        radial-gradient(circle at 35% 30%, #1c4a2a 0%, transparent 45%),
                        radial-gradient(circle at 75% 75%, #18443b 0%, transparent 50%),
                        radial-gradient(circle at 50% 60%, #305828 0%, transparent 40%),
                        linear-gradient(160deg, #123222 0%, #0e2318 45%, #0a1a1f 100%)
                      `
                    }}
                  />
                  <div 
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      activeBand === 'true_color' ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      background: `
                        radial-gradient(circle at 40% 30%, #2a3c26 0%, transparent 50%),
                        radial-gradient(circle at 70% 70%, #173347 0%, transparent 55%),
                        linear-gradient(150deg, #192b1b 0%, #142217 50%, #0d1e29 100%)
                      `
                    }}
                  />
                  <div 
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      activeBand === 'ndvi' ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      background: `
                        radial-gradient(circle at 35% 30%, #2cb44e 0%, transparent 50%),
                        radial-gradient(circle at 70% 70%, #c49920 0%, transparent 55%),
                        linear-gradient(150deg, #093414 0%, #134e20 50%, #2b390b 100%)
                      `
                    }}
                  />
                  <div 
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      activeBand === 'sar' ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      background: `
                        radial-gradient(circle at 40% 30%, #5d3877 0%, transparent 50%),
                        radial-gradient(circle at 70% 70%, #1c5270 0%, transparent 55%),
                        linear-gradient(150deg, #1a0f26 0%, #09212f 50%, #1b362c 100%)
                      `
                    }}
                  />

                  {/* Vector AOI Contour SVG */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="none">
                    <polygon 
                      points="90,60 300,90 330,260 140,320 60,220" 
                      fill="rgba(217, 98, 43, 0.12)" 
                      stroke="#D9622B" 
                      strokeWidth="2" 
                      strokeDasharray="5 5" 
                    />
                    <circle cx="90" cy="60" r="3.5" fill="#D9622B" />
                    <circle cx="300" cy="90" r="3.5" fill="#D9622B" />
                    <circle cx="330" cy="260" r="3.5" fill="#D9622B" />
                    <circle cx="140" cy="320" r="3.5" fill="#D9622B" />
                    <circle cx="60" cy="220" r="3.5" fill="#D9622B" />

                    {/* Contours & Water drainage */}
                    <path d="M0,180 C60,150 110,210 170,190 S260,140 400,175" stroke="#5DB8E8" strokeWidth="2" fill="none" opacity="0.4" />
                    <path d="M0,230 C80,260 140,205 210,235 S320,270 400,240" stroke="#5DB8E8" strokeWidth="2" fill="none" opacity="0.3" />
                    <ellipse cx="220" cy="160" rx="55" ry="34" fill="#A3F25E" opacity="0.12" />
                    <ellipse cx="140" cy="240" rx="48" ry="30" fill="#A3F25E" opacity="0.15" />
                  </svg>

                  {/* Animated Radar Scanning Line */}
                  <div 
                    className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#A3F25E] to-transparent shadow-[0_0_12px_2px_rgba(163,242,94,0.6)] pointer-events-none"
                    style={{
                      animation: 'radarScan 4.5s linear infinite',
                    }}
                  />

                  {/* Interactive Band Switcher Chips */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
                    {[
                      { id: 'true_color', label: 'TRUE COLOR' },
                      { id: 'land_cover', label: 'LAND COVER' },
                      { id: 'ndvi', label: 'NDVI' },
                      { id: 'sar', label: 'SAR RADAR' },
                    ].map((band) => (
                      <button
                        key={band.id}
                        type="button"
                        onClick={() => setActiveBand(band.id as any)}
                        className={`font-mono text-[10px] px-2.5 py-1 rounded-[3px] border transition cursor-pointer text-left ${
                          activeBand === band.id
                            ? 'bg-[#A3F25E]/15 border-[#A3F25E] text-[#A3F25E] font-semibold shadow-sm'
                            : 'bg-[#0A1310]/70 border-[rgba(234,243,236,0.12)] text-[#5F766A] hover:text-[#EAF3EC]'
                        }`}
                      >
                        {band.label}
                      </button>
                    ))}
                  </div>

                  {/* Bottom Coordinates & Metadata Chip */}
                  <div className="absolute bottom-3 left-3 bg-[#0A1310]/80 border border-[rgba(234,243,236,0.12)] px-3 py-1.5 rounded-[3px] font-mono text-[11px] text-[#93AB9F] leading-tight">
                    <div>LAT 37.7749° &nbsp;LNG -122.4194°</div>
                    <div className="text-[10px] text-[#5F766A] mt-0.5">GSD 10m/px · Sentinel-2 MSI + DEM</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* WORKFLOW SECTION */}
        <section id="workflow" className="py-24 bg-[#0D1A15] border-y border-[rgba(234,243,236,0.10)]">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-xl mb-16">
              <span className="font-mono text-[12px] text-[#A3F25E] uppercase tracking-wider block mb-3">The Workflow</span>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#EAF3EC] tracking-tight">
                Four steps from raw pixels to a finished map
              </h2>
              <p className="text-[#93AB9F] text-[16px] mt-4 leading-relaxed">
                Everything happens in one unified mapping workstation — set a boundary, fetch imagery, run a model, and inspect the biophysical results.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-l border-[rgba(234,243,236,0.10)]">
              
              {/* Step 1 */}
              <div className="p-8 border-r border-b border-[rgba(234,243,236,0.10)] bg-[#0A1310]/40 relative group hover:bg-[#10201A]/60 transition">
                <div className="font-mono text-[13px] text-[#A3F25E]">01</div>
                <h3 className="font-['Space_Grotesk'] text-xl font-semibold text-[#EAF3EC] mt-4">Set your boundary</h3>
                <p className="text-[#93AB9F] text-[14.5px] mt-2.5 leading-relaxed font-normal">
                  Draw a polygon or bounding box over your district, farm, or site — or upload your existing GeoJSON or Shapefile boundary.
                </p>
                <div className="mt-6 font-mono text-[11px] text-[#5F766A] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#D9622B]" />
                  <span>Interactive Geoman tools</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-8 border-r border-b border-[rgba(234,243,236,0.10)] bg-[#0A1310]/40 relative group hover:bg-[#10201A]/60 transition">
                <div className="font-mono text-[13px] text-[#A3F25E]">02</div>
                <h3 className="font-['Space_Grotesk'] text-xl font-semibold text-[#EAF3EC] mt-4">Fetch imagery</h3>
                <p className="text-[#93AB9F] text-[14.5px] mt-2.5 leading-relaxed font-normal">
                  Query Sentinel-2, Sentinel-1 SAR, or Landsat archives for any observation window, filtered by cloud cover and QA60 masking.
                </p>
                <div className="mt-6 font-mono text-[11px] text-[#5F766A] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#5DB8E8]" />
                  <span>STAC Catalog + GEE Hub</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-8 border-r border-b border-[rgba(234,243,236,0.10)] bg-[#0A1310]/40 relative group hover:bg-[#10201A]/60 transition">
                <div className="font-mono text-[13px] text-[#A3F25E]">03</div>
                <h3 className="font-['Space_Grotesk'] text-xl font-semibold text-[#EAF3EC] mt-4">Run classification</h3>
                <p className="text-[#93AB9F] text-[14.5px] mt-2.5 leading-relaxed font-normal">
                  Trigger a Spatial U-Net deep learning model, on-the-fly Random Forest, or near-real-time Dynamic World consensus predictions.
                </p>
                <div className="mt-6 font-mono text-[11px] text-[#5F766A] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#A3F25E]" />
                  <span>Serverless GPU &amp; Cloud RF</span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-8 border-r border-b border-[rgba(234,243,236,0.10)] bg-[#0A1310]/40 relative group hover:bg-[#10201A]/60 transition">
                <div className="font-mono text-[13px] text-[#A3F25E]">04</div>
                <h3 className="font-['Space_Grotesk'] text-xl font-semibold text-[#EAF3EC] mt-4">Read analytics &amp; export</h3>
                <p className="text-[#93AB9F] text-[14.5px] mt-2.5 leading-relaxed font-normal">
                  Inspect class area percentages, extract 5-year NDVI trends, click spectral curves, and download an Executive Briefing PDF.
                </p>
                <div className="mt-6 font-mono text-[11px] text-[#5F766A] flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-[#FF8A5C]" />
                  <span>GeoTIFF, GeoJSON, KMZ, PDF</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* PLATFORM / FEATURES GRID */}
        <section id="platform" className="py-24">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-xl mb-16">
              <span className="font-mono text-[12px] text-[#A3F25E] uppercase tracking-wider block mb-3">What You Get</span>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#EAF3EC] tracking-tight">
                A full remote sensing workstation, not just a classifier
              </h2>
              <p className="text-[#93AB9F] text-[16px] mt-4 leading-relaxed">
                GeoClass layers terrain, hydrology, vegetative health, and microwave SAR backscatter over every run, giving you complete environmental ground truth.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-[rgba(234,243,236,0.10)]">
              
              {/* Feature 1 */}
              <div className="p-8 border-r border-b border-[rgba(234,243,236,0.10)] bg-[#10201A]/40 hover:bg-[#10201A]/80 transition">
                <span className="font-mono text-[11px] text-[#A3F25E] border border-[rgba(163,242,94,0.3)] bg-[rgba(163,242,94,0.06)] px-2 py-0.5 rounded-[2px] inline-block mb-4">
                  MODEL
                </span>
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#EAF3EC]">Deep Learning Land Cover</h3>
                <p className="text-[#93AB9F] text-[14px] mt-2 leading-relaxed">
                  Spatial Contextual U-Net trained on Sentinel-2 optical bands alongside Random Forest and Dynamic World 9-class probability outputs.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 border-r border-b border-[rgba(234,243,236,0.10)] bg-[#10201A]/40 hover:bg-[#10201A]/80 transition">
                <span className="font-mono text-[11px] text-[#A3F25E] border border-[rgba(163,242,94,0.3)] bg-[rgba(163,242,94,0.06)] px-2 py-0.5 rounded-[2px] inline-block mb-4">
                  NDVI
                </span>
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#EAF3EC]">Vegetation Canopy Health</h3>
                <p className="text-[#93AB9F] text-[14px] mt-2 leading-relaxed">
                  Normalized Difference Vegetation Index isolating photosynthetic vitality to detect agricultural anomalies and canopy stress.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 border-r border-b border-[rgba(234,243,236,0.10)] bg-[#10201A]/40 hover:bg-[#10201A]/80 transition">
                <span className="font-mono text-[11px] text-[#5DB8E8] border border-[rgba(93,184,232,0.3)] bg-[rgba(93,184,232,0.06)] px-2 py-0.5 rounded-[2px] inline-block mb-4">
                  MNDWI
                </span>
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#EAF3EC]">Water &amp; Wetland Delineation</h3>
                <p className="text-[#93AB9F] text-[14px] mt-2 leading-relaxed">
                  Modified Normalized Difference Water Index suppressing built-up noise to accurately map reservoirs, floodwaters, and marshes.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-8 border-r border-b border-[rgba(234,243,236,0.10)] bg-[#10201A]/40 hover:bg-[#10201A]/80 transition">
                <span className="font-mono text-[11px] text-[#FF8A5C] border border-[rgba(255,138,92,0.3)] bg-[rgba(255,138,92,0.06)] px-2 py-0.5 rounded-[2px] inline-block mb-4">
                  NBR
                </span>
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#EAF3EC]">Normalized Burn Ratio</h3>
                <p className="text-[#93AB9F] text-[14px] mt-2 leading-relaxed">
                  Deep infrared NIR/SWIR analysis evaluating post-fire burn severity, scar boundaries, and vegetative regeneration trajectories.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-8 border-r border-b border-[rgba(234,243,236,0.10)] bg-[#10201A]/40 hover:bg-[#10201A]/80 transition">
                <span className="font-mono text-[11px] text-[#D9622B] border border-[rgba(217,98,43,0.3)] bg-[rgba(217,98,43,0.06)] px-2 py-0.5 rounded-[2px] inline-block mb-4">
                  SAR
                </span>
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#EAF3EC]">Sentinel-1 C-Band Microwave</h3>
                <p className="text-[#93AB9F] text-[14px] mt-2 leading-relaxed">
                  Synthetic Aperture Radar penetration that pierces persistent tropical cloud decks and reveals soil structure through VV/VH backscatter.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-8 border-r border-b border-[rgba(234,243,236,0.10)] bg-[#10201A]/40 hover:bg-[#10201A]/80 transition">
                <span className="font-mono text-[11px] text-[#93AB9F] border border-[rgba(147,171,159,0.3)] bg-[rgba(147,171,159,0.06)] px-2 py-0.5 rounded-[2px] inline-block mb-4">
                  DEM
                </span>
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#EAF3EC]">Copernicus 30m Terrain &amp; Slope</h3>
                <p className="text-[#93AB9F] text-[14px] mt-2 leading-relaxed">
                  Digital Elevation Model with shaded relief and a geotechnical 5-tier slope stability grade for hazard screening and watershed routing.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* TOOLS SHOWCASE */}
        <section id="tools" className="py-24 bg-[#0D1A15] border-t border-[rgba(234,243,236,0.10)]">
          <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="font-mono text-[12px] text-[#A3F25E] uppercase tracking-wider block">Field Tools</span>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#EAF3EC] tracking-tight">
                Inspect the physics, not just the output
              </h2>
              <p className="text-[#93AB9F] text-[16px] leading-relaxed">
                Point-and-click diagnostic tools for the scientific questions an automated classification alone cannot resolve.
              </p>

              <div className="space-y-4 pt-2">
                
                <div className="flex gap-4 p-4 rounded-md border border-[rgba(234,243,236,0.08)] bg-[#10201A]/60">
                  <div className="font-mono text-[11px] text-[#A3F25E] w-20 flex-shrink-0 pt-0.5">SEGMENT</div>
                  <div>
                    <h4 className="font-['Space_Grotesk'] text-base font-semibold text-[#EAF3EC]">Smart AOI Selection</h4>
                    <p className="text-sm text-[#93AB9F] mt-1">Click any pixel on the map to automatically segment and extract the parcel or water body outline.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-md border border-[rgba(234,243,236,0.08)] bg-[#10201A]/60">
                  <div className="font-mono text-[11px] text-[#A3F25E] w-20 flex-shrink-0 pt-0.5">10-BAND</div>
                  <div>
                    <h4 className="font-['Space_Grotesk'] text-base font-semibold text-[#EAF3EC]">Spectral Signature Inspector</h4>
                    <p className="text-sm text-[#93AB9F] mt-1">Tap any point to graph its exact 10-band optical reflectance curve from coastal blue (443nm) to SWIR-2 (2190nm).</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-md border border-[rgba(234,243,236,0.08)] bg-[#10201A]/60">
                  <div className="font-mono text-[11px] text-[#A3F25E] w-20 flex-shrink-0 pt-0.5">5-YEAR</div>
                  <div>
                    <h4 className="font-['Space_Grotesk'] text-base font-semibold text-[#EAF3EC]">Multi-Year Pixel Timeline</h4>
                    <p className="text-sm text-[#93AB9F] mt-1">Plot monthly NDVI and backscatter timeseries from 2019 to present to spot gradual deforestation or seasonal cycles.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-md border border-[rgba(234,243,236,0.08)] bg-[#10201A]/60">
                  <div className="font-mono text-[11px] text-[#A3F25E] w-20 flex-shrink-0 pt-0.5">SWIPE</div>
                  <div>
                    <h4 className="font-['Space_Grotesk'] text-base font-semibold text-[#EAF3EC]">Split-Screen Comparison Curtain</h4>
                    <p className="text-sm text-[#93AB9F] mt-1">Drag an interactive vertical curtain across your AOI to verify raw satellite reflectance against classified masks.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Layer Status Matrix Visual */}
            <div className="lg:col-span-6">
              <div className="bg-[#10201A] border border-[rgba(234,243,236,0.12)] rounded-lg p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[rgba(234,243,236,0.10)] pb-3 font-mono text-[11.5px] text-[#5F766A]">
                  <span>LAYER REGISTRY</span>
                  <span>ENGINE STATUS</span>
                </div>

                {[
                  { name: 'Satellite Base Imagery', swatch: '#3B82F6', status: 'VISIBLE', ready: true },
                  { name: 'True Color — Sentinel-2 MSI RGB', swatch: '#A3F25E', status: 'READY', ready: true },
                  { name: 'False Color — NIR Vegetation Composite', swatch: '#FF8A5C', status: 'READY', ready: true },
                  { name: 'Vegetation Health — NDVI Index', swatch: '#6DDC4F', status: 'READY', ready: true },
                  { name: 'Land Cover — Spatial U-Net Output', swatch: '#D9622B', status: 'ACTIVE', ready: true },
                  { name: 'Sentinel-1 SAR — Dual-Pol Backscatter', swatch: '#9333EA', status: 'READY', ready: true },
                  { name: 'Elevation & Slope — Copernicus 30m', swatch: '#8A8F8C', status: 'AVAILABLE', ready: true },
                  { name: 'Surface Hydrology — MNDWI', swatch: '#5DB8E8', status: 'AVAILABLE', ready: true },
                ].map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-[rgba(234,243,236,0.06)] text-[13.5px]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: row.swatch }} />
                      <span className="text-[#EAF3EC] font-medium">{row.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#A3F25E] font-semibold bg-[rgba(163,242,94,0.08)] px-2 py-0.5 rounded-[2px]">
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* USE CASES */}
        <section id="use-cases" className="py-24">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-xl mb-16">
              <span className="font-mono text-[12px] text-[#A3F25E] uppercase tracking-wider block mb-3">Who It Is For</span>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#EAF3EC] tracking-tight">
                One workspace, four enterprise domains
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[rgba(234,243,236,0.10)] border border-[rgba(234,243,236,0.10)]">
              
              <div className="bg-[#0A1310] p-8 space-y-3">
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#EAF3EC]">Agriculture</h3>
                <p className="text-[14px] text-[#93AB9F] leading-relaxed">
                  Monitor crop vigor, delineate cultivated fields, evaluate drought impact, and plan variable nitrogen application over large farm cooperatives.
                </p>
              </div>

              <div className="bg-[#0A1310] p-8 space-y-3">
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#EAF3EC]">Urban Planning</h3>
                <p className="text-[14px] text-[#93AB9F] leading-relaxed">
                  Audit built-up encroachment, track impervious surface expansion against zoning regulations, and measure urban green canopy quotas.
                </p>
              </div>

              <div className="bg-[#0A1310] p-8 space-y-3">
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#EAF3EC]">Environmental Monitoring</h3>
                <p className="text-[14px] text-[#93AB9F] leading-relaxed">
                  Detect illegal land clearing, quantify wetland loss, verify carbon credit reforestation parcels, and monitor watershed resilience.
                </p>
              </div>

              <div className="bg-[#0A1310] p-8 space-y-3">
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#EAF3EC]">Disaster &amp; Risk Assessment</h3>
                <p className="text-[14px] text-[#93AB9F] leading-relaxed">
                  Screen slope landslide risks, delineate post-event flood inundation extents, and calculate wildfire burn scar severity.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* DELIVERABLES SECTION */}
        <section className="py-24 bg-[#0D1A15] border-y border-[rgba(234,243,236,0.10)]">
          <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="font-mono text-[12px] text-[#A3F25E] uppercase tracking-wider block">Deliverables</span>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-[#EAF3EC] tracking-tight">
                Leave with intelligence you can actually distribute
              </h2>
              <p className="text-[#93AB9F] text-[16px] leading-relaxed">
                Every analysis run exports cleanly into standard GIS formats for data engineers, or compiles into a publication-ready PDF for stakeholders who will never open a shapefile.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-2">
                {['GeoTIFF Raster', 'GeoJSON Vector', 'KMZ Google Earth', 'KML File', 'PNG Georeferenced Map', 'Executive Briefing PDF'].map((fmt, i) => (
                  <span 
                    key={i} 
                    className="font-mono text-[12px] text-[#93AB9F] border border-[rgba(234,243,236,0.12)] bg-[#10201A] px-3.5 py-1.5 rounded-full"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-[#10201A] border border-[rgba(234,243,236,0.12)] rounded-lg p-8 text-center space-y-4">
                <div className="font-mono text-[12px] text-[#A3F25E] flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#A3F25E]" />
                  <span>PUBLICATION GRADE REPORTING</span>
                </div>
                <h3 className="font-['Space_Grotesk'] text-2xl font-bold text-[#EAF3EC]">
                  GeoClass Executive Briefing Engine
                </h3>
                <p className="text-[#93AB9F] text-sm max-w-md mx-auto leading-relaxed">
                  Generates automated PDF dossiers complete with acreage summaries, spectral index bar charts, sensor metadata, and high-contrast land cover map renderings.
                </p>
                <div className="pt-2">
                  <Link 
                    href="/app" 
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#A3F25E] hover:underline"
                  >
                    <span>Generate your first briefing in workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* FINAL CTA BAND */}
        <section className="py-28 text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto px-6 space-y-6">
            <h2 className="font-['Space_Grotesk'] text-4xl sm:text-5xl font-bold text-[#EAF3EC] tracking-tight">
              Your first classification is free to run.
            </h2>
            <p className="text-[#93AB9F] text-lg leading-relaxed">
              Launch the workspace, draw a boundary over any location on Earth, and receive your land cover intelligence within minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link 
                href="/app" 
                className="inline-flex items-center justify-center gap-2.5 bg-[#A3F25E] hover:bg-[#B4F775] text-[#0A1C0C] font-semibold text-[15.5px] px-7 py-3.5 rounded-[2px] transition duration-150 shadow-[0_0_30px_rgba(163,242,94,0.3)]"
              >
                <span>Launch Mapping Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center border border-[rgba(234,243,236,0.15)] hover:border-[#EAF3EC] text-[#EAF3EC] font-medium text-[15.5px] px-7 py-3.5 rounded-[2px] transition duration-150 bg-[#10201A]"
              >
                <span>Sign In</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(234,243,236,0.10)] bg-[#070D0B] py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
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
            <Link href="/methods" className="hover:text-[#A3F25E] transition">Methods &amp; Citations</Link>
            <Link href="/login" className="hover:text-[#EAF3EC] transition">Log in</Link>
          </div>

          <div className="font-mono text-[11px] text-[#5F766A]">
            Sentinel-2 MSI · Sentinel-1 SAR · Copernicus 30m DEM
          </div>
        </div>
      </footer>

      {/* Embedded style for the radar animation */}
      <style jsx global>{`
        @keyframes radarScan {
          0% { top: 0%; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
