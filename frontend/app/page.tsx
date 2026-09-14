'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { 
  ArrowRight, 
  ExternalLink,
  LogOut,
  User as UserIcon
} from 'lucide-react';

export default function LandingPage() {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#0D1316] text-[#FFFFFF] selection:bg-[#B7E89F] selection:text-[#0D1316] font-sans relative overflow-x-hidden">
      
      {/* ────────────────────────────────── Header Navigation ────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0D1316] border-b border-[#1B2428]">
        <div className="max-w-[1240px] mx-auto px-6 h-17 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
              <svg width="24" height="20" viewBox="0 0 28 22" fill="none" className="flex-shrink-0">
                <path d="M14 2L2 19H26L14 2Z" stroke="#B7E89F" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M8 14L14 7L20 14" stroke="#B7E89F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 19C8 16 10.5 16 14 19C17.5 16 20 16 23 19" stroke="#B7E89F" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span style={{ color: '#FFFFFF' }} className="font-sans text-[18px] font-bold tracking-[-0.02em] !text-white">
                GeoClass
              </span>
            </Link>
            <span style={{ color: '#E2E8F0' }} className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-[0.12em] border-l border-[#222E33] pl-4 !text-slate-200">
              Earth Observation
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium" aria-label="Main Navigation">
            <a href="#platform" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Platform</a>
            <a href="#workflow" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Workflow</a>
            <a href="#tools" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Tools</a>
            <a href="#use-cases" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Use cases</a>
            <Link href="/methods" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Methods &amp; API</Link>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span style={{ color: '#E2E8F0' }} className="text-xs font-mono hidden md:inline">
                  {user?.fullName}
                </span>
                <Link 
                  href="/app" 
                  style={{ backgroundColor: '#B7E89F', color: '#0D1316' }}
                  className="inline-flex items-center gap-2 font-semibold text-[13.5px] px-4 py-2 rounded-[4px] transition-colors hover:brightness-105 cursor-pointer"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  style={{ color: '#94A3B8' }}
                  className="hover:!text-white text-xs cursor-pointer p-1"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <Link 
                  href="/login" 
                  style={{ color: '#FFFFFF' }}
                  className="text-[14px] font-medium !text-white hover:!text-[#B7E89F] transition-colors hidden sm:inline-block"
                >
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  style={{ backgroundColor: '#B7E89F', color: '#0D1316' }}
                  className="inline-flex items-center gap-2 font-semibold text-[13.5px] px-4 py-2 rounded-[4px] transition-colors hover:brightness-105 cursor-pointer"
                >
                  <span>Launch Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>

        {/* ────────────────────────────────── Hero Section (Same #0D1316 Background) ────────────────────────────────── */}
        <section className="pt-16 pb-20 lg:pt-20 lg:pb-24 bg-[#0D1316]">
          <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-5 space-y-6">
              <div style={{ color: '#B7E89F' }} className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] !text-[#B7E89F]">
                SATELLITE ANALYTICS FOR REAL WORLD DECISIONS
              </div>

              {/* Exact Hero Headline: Explicit Pure White #FFFFFF with inline style and !text-white */}
              <h1 
                style={{ color: '#FFFFFF' }}
                className="text-4xl sm:text-5xl lg:text-[54px] font-normal leading-[1.05] tracking-[-0.035em] !text-white"
              >
                Satellite analysis,<br />
                without the GIS<br />
                overhead.
              </h1>

              {/* Hero Description: Crisp, clear, highly legible pure white #FFFFFF */}
              <p 
                style={{ color: '#F1F5F9' }}
                className="text-[17px] sm:text-[18px] leading-[1.6] font-normal !text-slate-100 max-w-lg"
              >
                GeoClass turns Earth observation data into maps and results you can actually use. Define an area, choose your imagery, run an analysis. No complex setup, no GIS software.
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <Link 
                  href={isAuthenticated ? "/app" : "/signup"} 
                  style={{ backgroundColor: '#B7E89F', color: '#0D1316' }}
                  className="inline-flex items-center justify-center gap-2 font-semibold text-[14.5px] px-5 py-2.5 rounded-[4px] transition-colors hover:brightness-105 cursor-pointer"
                >
                  <span>Start classifying free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a 
                  href="#workflow" 
                  style={{ color: '#FFFFFF' }}
                  className="text-[14.5px] font-medium !text-white hover:!text-[#B7E89F] underline underline-offset-4 decoration-[#222E33] hover:decoration-[#B7E89F] transition-colors cursor-pointer"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Right Hero Product Window: Exact Mockup from Image 1 */}
            <div className="lg:col-span-7">
              <div className="rounded-[4px] overflow-hidden border border-[#1F2C33] bg-[#0D1316] shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/geoclass-hero-mockup.png" 
                  alt="GeoClass Workstation — Gold Prospectivity Yagba West" 
                  className="w-full h-auto object-cover block"
                />
              </div>
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 2: How It Works ────────────────────────────────── */}
        <section id="workflow" className="py-20 bg-[#0D1316] border-t border-[#1B2428]">
          <div className="max-w-[1240px] mx-auto px-6">
            <div style={{ color: '#B7E89F' }} className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] !text-[#B7E89F] mb-12">
              HOW IT WORKS
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              
              {/* Step 01 */}
              <div className="space-y-3">
                <div style={{ color: '#B7E89F' }} className="font-mono text-sm font-medium !text-[#B7E89F]">01</div>
                <h3 style={{ color: '#FFFFFF' }} className="text-xl font-semibold !text-white">
                  Define your area
                </h3>
                <p style={{ color: '#F1F5F9' }} className="text-[15px] font-normal leading-relaxed !text-slate-100">
                  Draw or upload your boundary. Set your region and time range.
                </p>
              </div>

              {/* Step 02 */}
              <div className="space-y-3">
                <div style={{ color: '#B7E89F' }} className="font-mono text-sm font-medium !text-[#B7E89F]">02</div>
                <h3 style={{ color: '#FFFFFF' }} className="text-xl font-semibold !text-white">
                  Choose your data
                </h3>
                <p style={{ color: '#F1F5F9' }} className="text-[15px] font-normal leading-relaxed !text-slate-100">
                  Use Sentinel, SAR, DEM and more. Pick from built-in analysis methods or bring your own data.
                </p>
              </div>

              {/* Step 03 */}
              <div className="space-y-3">
                <div style={{ color: '#B7E89F' }} className="font-mono text-sm font-medium !text-[#B7E89F]">03</div>
                <h3 style={{ color: '#FFFFFF' }} className="text-xl font-semibold !text-white">
                  Run classification
                </h3>
                <p style={{ color: '#F1F5F9' }} className="text-[15px] font-normal leading-relaxed !text-slate-100">
                  Our ML models process your data in the cloud. No setup, no coding.
                </p>
              </div>

              {/* Step 04 */}
              <div className="space-y-3">
                <div style={{ color: '#B7E89F' }} className="font-mono text-sm font-medium !text-[#B7E89F]">04</div>
                <h3 style={{ color: '#FFFFFF' }} className="text-xl font-semibold !text-white">
                  Get results
                </h3>
                <p style={{ color: '#F1F5F9' }} className="text-[15px] font-normal leading-relaxed !text-slate-100">
                  View your land cover map, explore analytics and export your report or data.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ────────────────────────────────── Section 3: Built for Real-World Applications ────────────────────────────────── */}
        <section id="use-cases" className="py-24 bg-[#FFFFFF] text-[#1A1D23] border-t border-[#E5E5E0]">
          <div className="max-w-[1240px] mx-auto px-6">
            
            <div className="max-w-2xl mb-14">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2E7D32] block mb-3">
                BUILT FOR REAL-WORLD APPLICATIONS
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#1A1D23]">
                From land cover to mineral potential
              </h2>
              <p className="text-[16px] text-[#555A54] mt-4 leading-[1.6]">
                Whether monitoring agricultural cooperatives, auditing municipal urban spread, or running mineral prospectivity exploration, GeoClass delivers verifiable geospatial proof.
              </p>
            </div>

            {/* Showcase Application Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Actual GeoClass Full Workspace Screenshot */}
              <div className="lg:col-span-8 bg-[#F9F8F5] border border-[#D8D5CA] rounded-[4px] p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E9E6DC] pb-3">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#2E7D32] font-semibold">
                      WORKSTATION VIEW
                    </span>
                    <h3 className="text-lg font-bold text-[#1A1D23] mt-0.5">
                      Unified Remote Sensing Command Center
                    </h3>
                  </div>
                  <Link 
                    href="/app" 
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E7D32] hover:underline"
                  >
                    <span>Open Live Engine</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="relative rounded-[2px] overflow-hidden border border-[#D8D5CA] aspect-[16/9] bg-[#0D1316]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/geoclass-app-workspace.jpg" 
                    alt="GeoClass Full Application Workspace" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                <p className="text-sm text-[#555A54] leading-relaxed">
                  Interactive multi-temporal AOI delineation over Yagba West with 12 layered spectral products, Dynamic World classification consensus, and instant biophysical telemetry.
                </p>
              </div>

              {/* Right Side: Specialized Domain Cards */}
              <div className="lg:col-span-4 flex flex-col gap-5">
                
                {/* Domain Card 1 */}
                <div className="bg-[#F9F8F5] border border-[#D8D5CA] rounded-[4px] p-5 space-y-3 flex-1 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/layer-thumbnails/land_cover.png" alt="" className="w-5 h-5 rounded-[2px]" />
                      <span className="font-mono text-[11px] font-semibold text-[#1A1D23]">AI LAND CLASSIFICATION</span>
                    </div>
                    <h4 className="text-base font-bold text-[#1A1D23]">
                      Spatial Contextual U-Net
                    </h4>
                    <p className="text-xs text-[#555A54] mt-1 leading-relaxed">
                      9-class land use separation: water, trees, grass, crops, flooded vegetation, built area, and bare ground with pixel probability curves.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E9E6DC] flex items-center justify-between text-[11px] font-mono text-[#555A54]">
                    <span>Resolution: 10m</span>
                    <span className="text-[#2E7D32] font-semibold">Ready</span>
                  </div>
                </div>

                {/* Domain Card 2 */}
                <div className="bg-[#F9F8F5] border border-[#D8D5CA] rounded-[4px] p-5 space-y-3 flex-1 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/layer-thumbnails/vegetation.png" alt="" className="w-5 h-5 rounded-[2px]" />
                      <span className="font-mono text-[11px] font-semibold text-[#1A1D23]">BIOPHYSICAL INDICES</span>
                    </div>
                    <h4 className="text-base font-bold text-[#1A1D23]">
                      Canopy Vigor &amp; Moisture Tracking
                    </h4>
                    <p className="text-xs text-[#555A54] mt-1 leading-relaxed">
                      Instant NDVI, NDRE red-edge chlorophyll, and NDWI water content to identify localized crop stress or vegetation disturbance.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E9E6DC] flex items-center justify-between text-[11px] font-mono text-[#555A54]">
                    <span>Multi-Sensor: S2 + Landsat</span>
                    <span className="text-[#2E7D32] font-semibold">Active</span>
                  </div>
                </div>

                {/* Domain Card 3 */}
                <div className="bg-[#F9F8F5] border border-[#D8D5CA] rounded-[4px] p-5 space-y-3 flex-1 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/layer-thumbnails/sar_radar.png" alt="" className="w-5 h-5 rounded-[2px]" />
                      <span className="font-mono text-[11px] font-semibold text-[#1A1D23]">MICROWAVE RADAR</span>
                    </div>
                    <h4 className="text-base font-bold text-[#1A1D23]">
                      Sentinel-1 SAR Penetration
                    </h4>
                    <p className="text-xs text-[#555A54] mt-1 leading-relaxed">
                      C-band active radar reveals surface roughness and soil moisture through heavy cloud cover and monsoon atmospheric haze.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E9E6DC] flex items-center justify-between text-[11px] font-mono text-[#555A54]">
                    <span>Polarization: VV + VH</span>
                    <span className="text-[#2E7D32] font-semibold">Active</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 4: Authentic Layer Gallery ────────────────────────────────── */}
        <section id="platform" className="py-24 bg-[#0D1316] border-t border-[#1B2428]">
          <div className="max-w-[1240px] mx-auto px-6">
            
            <div className="max-w-xl mb-14">
              <span style={{ color: '#B7E89F' }} className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] !text-[#B7E89F] block mb-3">
                LAYER REGISTRY
              </span>
              <h2 style={{ color: '#FFFFFF' }} className="text-3xl sm:text-4xl font-normal leading-[1.1] tracking-[-0.03em] !text-white">
                Authentic satellite layers ready on click
              </h2>
              <p style={{ color: '#F1F5F9' }} className="text-[16px] mt-3 leading-relaxed !text-slate-100">
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
                  className="bg-[#131C20] border border-[#1F2A30] hover:border-[#B7E89F] rounded-[4px] p-3 transition-colors flex flex-col justify-between"
                >
                  <div className="aspect-video w-full rounded-[2px] overflow-hidden mb-2.5 bg-[#0D1316] border border-[#1F2A30]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={layer.img} 
                      alt={layer.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div style={{ color: '#FFFFFF' }} className="text-[13px] font-semibold !text-white leading-tight">
                      {layer.name}
                    </div>
                    <div style={{ color: '#E2E8F0' }} className="text-[11px] font-mono !text-slate-200 mt-1">
                      {layer.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 5: Field Tools & Deliverables ────────────────────────────────── */}
        <section id="tools" className="py-24 bg-[#0D1316] border-t border-[#1B2428]">
          <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span style={{ color: '#B7E89F' }} className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] !text-[#B7E89F] block">
                DIAGNOSTIC TOOLS
              </span>
              <h2 style={{ color: '#FFFFFF' }} className="text-3xl sm:text-4xl font-normal leading-[1.1] tracking-[-0.03em] !text-white">
                Inspect pixels, curves, and time series
              </h2>
              <p style={{ color: '#F1F5F9' }} className="text-[16px] leading-[1.6] !text-slate-100">
                GeoClass is engineered for analysts who need to verify ground truth with physics-based diagnostics before publishing conclusions.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-[4px] border border-[#1F2A30] bg-[#131C20] flex gap-3">
                  <div style={{ color: '#B7E89F' }} className="font-mono text-xs font-medium w-24 flex-shrink-0 pt-0.5 !text-[#B7E89F]">10-BAND</div>
                  <div>
                    <h4 style={{ color: '#FFFFFF' }} className="text-sm font-semibold !text-white">Full Spectral Signature Graph</h4>
                    <p style={{ color: '#F1F5F9' }} className="text-xs !text-slate-100 mt-1">Click any pixel on Earth to graph its exact 10-band surface reflectance profile from coastal blue to SWIR-2.</p>
                  </div>
                </div>

                <div className="p-4 rounded-[4px] border border-[#1F2A30] bg-[#131C20] flex gap-3">
                  <div style={{ color: '#B7E89F' }} className="font-mono text-xs font-medium w-24 flex-shrink-0 pt-0.5 !text-[#B7E89F]">5-YEAR</div>
                  <div>
                    <h4 style={{ color: '#FFFFFF' }} className="text-sm font-semibold !text-white">Pixel Trajectory &amp; LandTrendr</h4>
                    <p style={{ color: '#F1F5F9' }} className="text-xs !text-slate-100 mt-1">Segment multi-year Sentinel-2 medians from 2018 to 2025 to separate permanent land conversion from seasonal phenology.</p>
                  </div>
                </div>

                <div className="p-4 rounded-[4px] border border-[#1F2A30] bg-[#131C20] flex gap-3">
                  <div style={{ color: '#B7E89F' }} className="font-mono text-xs font-medium w-24 flex-shrink-0 pt-0.5 !text-[#B7E89F]">SWIPE</div>
                  <div>
                    <h4 style={{ color: '#FFFFFF' }} className="text-sm font-semibold !text-white">Split-Screen Comparison Curtain</h4>
                    <p style={{ color: '#F1F5F9' }} className="text-xs !text-slate-100 mt-1">Drag an interactive vertical curtain to immediately detect what changed between two satellite passes or between RGB and classified masks.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Deliverables Card Preview */}
            <div className="lg:col-span-6 bg-[#131C20] border border-[#1F2A30] rounded-[4px] p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[#1F2A30] pb-4">
                <span style={{ color: '#B7E89F' }} className="font-mono text-[11px] uppercase tracking-[0.12em] font-medium !text-[#B7E89F]">EXPORT SUITE</span>
                <span style={{ color: '#FFFFFF' }} className="font-mono text-[11px] !text-white">FIELD &amp; GIS READY</span>
              </div>
              <h3 style={{ color: '#FFFFFF' }} className="text-2xl font-semibold !text-white">
                Every result exports in publication formats
              </h3>
              <p style={{ color: '#F1F5F9' }} className="text-sm !text-slate-100 leading-relaxed">
                Take classified layers directly into QGIS, ArcGIS, Google Earth, or send executive summary dossiers to leadership.
              </p>
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <div style={{ color: '#FFFFFF' }} className="bg-[#0D1316] p-2.5 rounded-[2px] border border-[#1F2A30] flex items-center gap-2 !text-white">
                  <span style={{ color: '#B7E89F' }}>●</span> GeoTIFF (32-bit Float)
                </div>
                <div style={{ color: '#FFFFFF' }} className="bg-[#0D1316] p-2.5 rounded-[2px] border border-[#1F2A30] flex items-center gap-2 !text-white">
                  <span style={{ color: '#B7E89F' }}>●</span> GeoJSON Vector
                </div>
                <div style={{ color: '#FFFFFF' }} className="bg-[#0D1316] p-2.5 rounded-[2px] border border-[#1F2A30] flex items-center gap-2 !text-white">
                  <span style={{ color: '#B7E89F' }}>●</span> KMZ Google Earth
                </div>
                <div style={{ color: '#FFFFFF' }} className="bg-[#0D1316] p-2.5 rounded-[2px] border border-[#1F2A30] flex items-center gap-2 !text-white">
                  <span style={{ color: '#B7E89F' }}>●</span> Executive PDF Dossier
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section 6: Final CTA Band ────────────────────────────────── */}
        <section className="py-24 text-center bg-[#0D1316] border-t border-[#1B2428]">
          <div className="max-w-2xl mx-auto px-6 space-y-6">
            <h2 style={{ color: '#FFFFFF' }} className="text-3xl sm:text-5xl font-normal leading-[1.05] tracking-[-0.03em] !text-white">
              Start your first classification.
            </h2>
            <p style={{ color: '#F1F5F9' }} className="text-base sm:text-lg leading-relaxed !text-slate-100">
              Launch the workspace, pick any coordinate on Earth, and receive instant land cover intelligence.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              <Link 
                href={isAuthenticated ? "/app" : "/signup"} 
                style={{ backgroundColor: '#B7E89F', color: '#0D1316' }}
                className="inline-flex items-center justify-center gap-2 font-semibold text-[15px] px-6 py-3 rounded-[4px] transition-colors hover:brightness-105 cursor-pointer"
              >
                <span>Launch Workspace Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/login" 
                style={{ color: '#FFFFFF' }}
                className="inline-flex items-center justify-center border border-[#1F2A30] hover:border-[#FFFFFF] !text-white font-medium text-[15px] px-6 py-3 rounded-[4px] transition-colors bg-[#131C20] cursor-pointer"
              >
                <span>Sign in</span>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ────────────────────────────────── Footer ────────────────────────────────── */}
      <footer className="border-t border-[#1B2428] bg-[#0D1316] py-12">
        <div className="max-w-[1240px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <svg width="22" height="18" viewBox="0 0 28 22" fill="none">
              <path d="M14 2L2 19H26L14 2Z" stroke="#B7E89F" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M8 14L14 7L20 14" stroke="#B7E89F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 19C8 16 10.5 16 14 19C17.5 16 20 16 23 19" stroke="#B7E89F" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span style={{ color: '#FFFFFF' }} className="font-sans text-[16px] font-bold !text-white">GeoClass</span>
            <span style={{ color: '#E2E8F0' }} className="text-[12px] ml-2 !text-slate-200">
              © {new Date().getFullYear()} GeoClass Geospatial Systems.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[13.5px]">
            <a href="#platform" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Platform</a>
            <a href="#workflow" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Workflow</a>
            <a href="#tools" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Tools</a>
            <a href="#use-cases" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Use cases</a>
            <Link href="/methods" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Methods &amp; API</Link>
            <Link href="/login" style={{ color: '#FFFFFF' }} className="!text-white hover:!text-[#B7E89F] transition-colors">Log in</Link>
          </div>

          <div style={{ color: '#E2E8F0' }} className="font-mono text-[11px] !text-slate-200">
            Sentinel-2 MSI · Sentinel-1 SAR · Copernicus 30m DEM
          </div>
        </div>
      </footer>

    </div>
  );
}
