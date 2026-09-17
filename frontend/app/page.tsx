'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { 
  ArrowRight, 
  LogOut,
  Crosshair,
  Layers,
  Activity
} from 'lucide-react';

export default function LandingPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#13140e] text-[#f4f3e8] selection:bg-[#ebfc72] selection:text-[#13140e] font-sans relative overflow-x-hidden antialiased">
      
      {/* ────────────────────────────────── Top Navigation Bar ────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#13140e]/95 backdrop-blur-md border-b border-[#404040]">
        <div className="max-w-[1240px] mx-auto px-6 h-15 flex items-center justify-between gap-4">
          
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="font-mono text-sm text-[#ebfc72] font-bold">▲</span>
              <span className="font-sans text-[16px] font-bold tracking-[-0.02em] text-[#f4f3e8] uppercase">
                GEOCLASS
              </span>
            </Link>
            <span className="hidden xl:inline-block font-mono text-[11px] text-[#84837b] border-l border-[#404040] pl-3 uppercase tracking-[0.06em] whitespace-nowrap">
              EO-TERMINAL // 08°29&apos;N 05°31&apos;E
            </span>
          </div>

          {/* Navigation Links — JetBrains Mono */}
          <nav className="hidden md:flex items-center gap-6 font-mono text-[12.5px] text-[#f4f3e8] shrink-0" aria-label="Terminal Navigation">
            <a href="#workflow" className="hover:text-[#ebfc72] transition-colors whitespace-nowrap">01 // WORKFLOW</a>
            <a href="#platform" className="hover:text-[#ebfc72] transition-colors whitespace-nowrap">02 // SENSORS</a>
            <a href="#tools" className="hover:text-[#ebfc72] transition-colors whitespace-nowrap">03 // DIAGNOSTICS</a>
            <a href="#deliverables" className="hover:text-[#ebfc72] transition-colors whitespace-nowrap">04 // EXPORTS</a>
            <Link href="/methods" className="hover:text-[#ebfc72] transition-colors whitespace-nowrap">05 // METHODS [API]</Link>
          </nav>

          {/* Right Actions: Perfectly Linear Auth Cluster */}
          <div className="flex items-center gap-4 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-[#84837b] hidden lg:inline whitespace-nowrap">
                  USR // {user?.fullName?.toUpperCase() || 'OPERATOR'}
                </span>
                <Link 
                  href="/app" 
                  className="inversa-btn-lime h-9 px-3.5 text-[12px] inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>WORKSPACE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="text-[#84837b] hover:text-[#f4f3e8] p-1.5 transition-colors cursor-pointer"
                  title="Disconnect terminal"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link 
                  href="/login" 
                  className="font-mono text-[12.5px] text-[#f4f3e8] hover:text-[#ebfc72] transition-colors whitespace-nowrap uppercase tracking-wider py-1.5"
                >
                  SIGN IN
                </Link>
                <Link 
                  href="/signup" 
                  className="inversa-btn-lime h-9 px-3.5 text-[12px] inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>LAUNCH TERMINAL</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Mobile Menu trigger */}
            <button 
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center gap-2 font-mono text-[12px] text-[#f4f3e8] border border-[#404040] px-2.5 py-1 rounded-[3.6px]"
              aria-label="Toggle Navigation Menu"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#ebfc72]"></span>
              <span>MENU</span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#404040] bg-[#13140e] px-6 py-4 space-y-3 font-mono text-[13px]">
            <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#f4f3e8] hover:text-[#ebfc72]">01 // WORKFLOW</a>
            <a href="#platform" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#f4f3e8] hover:text-[#ebfc72]">02 // SENSORS</a>
            <a href="#tools" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#f4f3e8] hover:text-[#ebfc72]">03 // DIAGNOSTICS</a>
            <a href="#deliverables" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#f4f3e8] hover:text-[#ebfc72]">04 // EXPORTS</a>
            <Link href="/methods" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#f4f3e8] hover:text-[#ebfc72]">05 // METHODS &amp; API</Link>
          </div>
        )}
      </header>

      <main>

        {/* ────────────────────────────────── Hero Section: Side-by-Side 2-Column ────────────────────────────────── */}
        <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 border-b border-[#404040] overflow-hidden bg-[#13140e]">
          <div className="max-w-[1240px] mx-auto px-6">
            
            {/* Top Telemetry Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-2 mb-10 border-b border-[#404040]/80 font-mono text-[11px] sm:text-[12px] text-[#84837b]">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#ebfc72] animate-pulse"></span>
                <span className="text-[#f4f3e8]">SENTINEL-2 MSI // 10M L2A</span>
                <span className="text-[#404040]">|</span>
                <span>WGS 84 / UTM 31N</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#ebfc72]">TERMINAL ENGINE // ONLINE</span>
              </div>
            </div>

            {/* 2-Column Grid: Copy Left, App Dashboard Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              
              {/* Left Column: Editorial Narrative & Linear CTAs */}
              <div className="lg:col-span-5 space-y-6">
                
                <div className="flex items-center gap-2.5">
                  <span className="inversa-tag !text-[11px]">
                    MISSION 01 // EO FIELD WORKSTATION
                  </span>
                  <span className="inversa-tag-dark !text-[11px]">
                    RESOLUTION 10M
                  </span>
                </div>

                {/* Editorial Display Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-normal leading-[0.98] tracking-[-0.035em] text-[#f4f3e8]">
                  Satellite analysis,<br />
                  without the GIS<br />
                  overhead.
                </h1>

                {/* Body Copy */}
                <p className="inversa-body text-[#84837b] text-[16px] sm:text-[17px] leading-[1.6]">
                  GeoClass turns multi-spectral Earth observation data into verifiable land cover classifications, canopy vitality indices, and microwave radar diagnostics. Define your boundary, compute in the cloud, and extract actionable spatial proof.
                </p>

                {/* Linear Action Cluster */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link 
                    href={isAuthenticated ? "/app" : "/signup"} 
                    className="inversa-btn-lime h-11 px-5 !text-[13px] inline-flex items-center gap-2 shrink-0"
                  >
                    <span>START CLASSIFYING FREE</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a 
                    href="#workflow" 
                    className="inversa-btn-ghost h-11 px-5 !text-[13px] inline-flex items-center shrink-0"
                  >
                    <span>SEE HOW IT WORKS</span>
                  </a>
                </div>

                {/* Telemetry Coordinate Readout */}
                <div className="pt-4 border-t border-[#404040]/70 flex items-center gap-6 font-mono text-[11px] text-[#84837b]">
                  <div>
                    <span className="text-[#404040] block text-[9px] uppercase tracking-wider">PRIMARY TARGET</span>
                    <span className="text-[#f4f3e8]">YAGBA WEST // NIGERIA</span>
                  </div>
                  <div className="border-l border-[#404040] pl-6">
                    <span className="text-[#404040] block text-[9px] uppercase tracking-wider">COORDINATES</span>
                    <span className="text-[#f4f3e8]">08°29&apos;14&quot;N 05°31&apos;42&quot;E</span>
                  </div>
                  <div className="border-l border-[#404040] pl-6 hidden sm:block">
                    <span className="text-[#404040] block text-[9px] uppercase tracking-wider">ENGINE</span>
                    <span className="text-[#ebfc72]">GEE SUPERCOMPUTE</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Framed Dashboard Mockup (/app) by the side */}
              <div className="lg:col-span-7">
                <div className="border border-[#404040] bg-[#13140e] rounded-[3.6px] overflow-hidden">
                  
                  {/* Terminal Header Chrome */}
                  <div className="px-4 py-2.5 bg-[#13140e] border-b border-[#404040] flex items-center justify-between font-mono text-[11px] text-[#84837b]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#ebfc72]"></span>
                      <span className="text-[#f4f3e8] font-medium tracking-wide">GEOCLASS WORKSTATION // LIVE APP VIEW</span>
                    </div>
                    <span className="text-[#84837b] hidden sm:inline">12 SPECTRAL PRODUCTS</span>
                  </div>

                  {/* App Workspace Screenshot */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#0D1316]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src="/geoclass-hero-mockup.png" 
                      alt="GeoClass Workstation — Gold Prospectivity Yagba West" 
                      className="w-full h-full object-cover object-top block"
                    />
                  </div>

                  {/* Terminal Footer Strip */}
                  <div className="px-4 py-2 bg-[#13140e] border-t border-[#404040] flex items-center justify-between font-mono text-[10.5px] text-[#84837b]">
                    <span>AOI: YAGBA WEST LGA (7.3187°N, 6.9231°E)</span>
                    <span className="text-[#ebfc72]">DYNAMIC WORLD CONSENSUS</span>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section: Operational Workflow ────────────────────────────────── */}
        <section id="workflow" className="py-24 bg-[#13140e]">
          <div className="max-w-[1240px] mx-auto px-6">
            
            {/* Section Tag & Heading */}
            <div className="space-y-4 mb-16">
              <span className="inversa-tag">
                SEQUENCE 01 // OPERATIONAL DIRECTIVE
              </span>
              <h2 className="inversa-heading">
                From coordinates to classified truth.
              </h2>
              <p className="inversa-body text-[#84837b] max-w-xl">
                Four execution steps engineered for zero-friction spatial discovery. No desktop GIS installation, no dependency management, no satellite data harvesting required.
              </p>
            </div>

            {/* 4-Step Utilitarian Sequence */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              
              {/* Step 01 */}
              <div className="space-y-4 border-t border-[#404040] pt-6">
                <div className="font-mono text-xl text-[#ebfc72] font-semibold">01 // BOUNDARY</div>
                <h3 className="text-xl font-normal text-[#f4f3e8] tracking-[-0.03em]">
                  Define study area
                </h3>
                <p className="inversa-body text-[#84837b] !text-[15px]">
                  Draw freeform polygons directly on satellite feeds or import shapefiles, KML, and GeoJSON vectors up to 2,500 km².
                </p>
                <div className="font-mono text-[11px] text-[#84837b] pt-2">
                  TAG // AOI-VECTOR-DELINEATION
                </div>
              </div>

              {/* Step 02 */}
              <div className="space-y-4 border-t border-[#404040] pt-6">
                <div className="font-mono text-xl text-[#ebfc72] font-semibold">02 // HARMONIZE</div>
                <h3 className="text-xl font-normal text-[#f4f3e8] tracking-[-0.03em]">
                  Select sensor array
                </h3>
                <p className="inversa-body text-[#84837b] !text-[15px]">
                  Fuse Sentinel-2 MSI optical bands, Sentinel-1 SAR C-band radar, and Copernicus 30m digital elevation topography.
                </p>
                <div className="font-mono text-[11px] text-[#84837b] pt-2">
                  TAG // MULTI-SPECTRAL-STACK
                </div>
              </div>

              {/* Step 03 */}
              <div className="space-y-4 border-t border-[#404040] pt-6">
                <div className="font-mono text-xl text-[#ebfc72] font-semibold">03 // INFERENCE</div>
                <h3 className="text-xl font-normal text-[#f4f3e8] tracking-[-0.03em]">
                  Run cloud machine learning
                </h3>
                <p className="inversa-body text-[#84837b] !text-[15px]">
                  Execute Random Forest and spatial U-Net contextual models on Google Earth Engine cloud clusters in seconds.
                </p>
                <div className="font-mono text-[11px] text-[#84837b] pt-2">
                  TAG // RANDOM-FOREST-UNET
                </div>
              </div>

              {/* Step 04 */}
              <div className="space-y-4 border-t border-[#404040] pt-6">
                <div className="font-mono text-xl text-[#ebfc72] font-semibold">04 // TELEMETRY</div>
                <h3 className="text-xl font-normal text-[#f4f3e8] tracking-[-0.03em]">
                  Audit and export
                </h3>
                <p className="inversa-body text-[#84837b] !text-[15px]">
                  Inspect confusion matrices, biophysical pixel curves, and export 32-bit GeoTIFF, GeoJSON, or publication dossiers.
                </p>
                <div className="font-mono text-[11px] text-[#84837b] pt-2">
                  TAG // 32BIT-GEOTIFF-EXPORT
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section: Diagnostic Suite ────────────────────────────────── */}
        <section id="tools" className="py-24 bg-[#13140e] border-t border-[#404040]">
          <div className="max-w-[1240px] mx-auto px-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16">
              <div className="lg:col-span-7 space-y-4">
                <span className="inversa-tag">
                  INSTRUMENTATION // DIAGNOSTICS
                </span>
                <h2 className="inversa-heading">
                  Field-calibrated remote sensing physics.
                </h2>
                <p className="inversa-body text-[#84837b]">
                  GeoClass avoids decorative abstractions. Every metric is computed directly from physical electromagnetic reflectance, radar backscatter coefficients, and topographic elevation models.
                </p>
              </div>

              <div className="lg:col-span-5 font-mono text-[13px] text-[#84837b] space-y-3 pt-4 border-l border-[#404040] pl-6">
                <div className="text-[#ebfc72] font-semibold uppercase">ACTIVE INSTRUMENT TELEMETRY</div>
                <div className="flex justify-between border-b border-[#404040] pb-2">
                  <span>OPTICAL RESOLUTION:</span>
                  <span className="text-[#f4f3e8]">10m / PIXEL</span>
                </div>
                <div className="flex justify-between border-b border-[#404040] pb-2">
                  <span>RADAR FREQUENCY:</span>
                  <span className="text-[#f4f3e8]">5.405 GHz (C-BAND)</span>
                </div>
                <div className="flex justify-between border-b border-[#404040] pb-2">
                  <span>SPECTRAL BANDS:</span>
                  <span className="text-[#f4f3e8]">COASTAL TO SWIR-2</span>
                </div>
                <div className="flex justify-between">
                  <span>TEMPORAL REVISIT:</span>
                  <span className="text-[#f4f3e8]">5 DAYS (S2A + S2B)</span>
                </div>
              </div>
            </div>

            {/* Diagnostic Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Module 1 */}
              <div className="border border-[#404040] p-6 space-y-4 bg-[#13140e]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#ebfc72]">DIAGNOSTIC 01</span>
                  <Crosshair className="w-4 h-4 text-[#84837b]" />
                </div>
                <h3 className="text-xl font-normal text-[#f4f3e8] tracking-[-0.03em]">
                  10-Band Spectral Reflectance Graph
                </h3>
                <p className="text-[15px] text-[#84837b] leading-relaxed">
                  Click any coordinate to sample calibrated bottom-of-atmosphere surface reflectance from Coastal Blue (443nm) through Red Edge to SWIR-2 (2190nm). Distinguish iron oxide signatures from healthy chlorophyll.
                </p>
                <div className="pt-2 border-t border-[#404040] font-mono text-[11px] text-[#84837b] flex justify-between">
                  <span>CHANNELS: B2-B12</span>
                  <span className="text-[#ebfc72]">LIVE INSPECT</span>
                </div>
              </div>

              {/* Module 2 */}
              <div className="border border-[#404040] p-6 space-y-4 bg-[#13140e]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#ebfc72]">DIAGNOSTIC 02</span>
                  <Activity className="w-4 h-4 text-[#84837b]" />
                </div>
                <h3 className="text-xl font-normal text-[#f4f3e8] tracking-[-0.03em]">
                  Multi-Year Pixel Trajectory &amp; LandTrendr
                </h3>
                <p className="text-[15px] text-[#84837b] leading-relaxed">
                  Chart harmonic temporal trajectories across a 5-year satellite record. Separate seasonal crop growth cycles from permanent deforestation, illegal mining expansion, and urban land conversions.
                </p>
                <div className="pt-2 border-t border-[#404040] font-mono text-[11px] text-[#84837b] flex justify-between">
                  <span>SPAN: 2018–2025</span>
                  <span className="text-[#ebfc72]">CHRONO AUDIT</span>
                </div>
              </div>

              {/* Module 3 */}
              <div className="border border-[#404040] p-6 space-y-4 bg-[#13140e]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#ebfc72]">DIAGNOSTIC 03</span>
                  <Layers className="w-4 h-4 text-[#84837b]" />
                </div>
                <h3 className="text-xl font-normal text-[#f4f3e8] tracking-[-0.03em]">
                  Sentinel-1 SAR Cloud Penetration
                </h3>
                <p className="text-[15px] text-[#84837b] leading-relaxed">
                  Active synthetic aperture radar emits microwave pulses that ignore equatorial cloud cover and atmospheric smoke. Monitor surface roughness, soil moisture, and hydrological flooding year-round.
                </p>
                <div className="pt-2 border-t border-[#404040] font-mono text-[11px] text-[#84837b] flex justify-between">
                  <span>POLARIZATION: VV + VH</span>
                  <span className="text-[#ebfc72]">ALL-WEATHER</span>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section: Layer Registry ────────────────────────────────── */}
        <section id="platform" className="py-24 bg-[#13140e] border-t border-[#404040]">
          <div className="max-w-[1240px] mx-auto px-6">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div className="space-y-4 max-w-xl">
                <span className="inversa-tag">
                  SPECTRAL INVENTORY // 12 TILES
                </span>
                <h2 className="inversa-heading">
                  Synchronized satellite layers.
                </h2>
                <p className="inversa-body text-[#84837b]">
                  Authentic raster composites computed on Google Earth Engine supercomputing clusters inside GeoClass.
                </p>
              </div>
              <div className="font-mono text-[12px] text-[#84837b]">
                TOTAL REGISTRY: 12 PRODUCTS // CLOUD MASKED
              </div>
            </div>

            {/* 6-Column Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { name: 'True Color RGB', img: '/layer-thumbnails/true_color.png', spec: 'Sentinel-2 (10m)' },
                { name: 'False Color NIR', img: '/layer-thumbnails/false_color.png', spec: 'Vegetation NIR' },
                { name: 'Land Cover AI', img: '/layer-thumbnails/land_cover.png', spec: 'U-Net 9-Class' },
                { name: 'Vegetation NDVI', img: '/layer-thumbnails/vegetation.png', spec: 'Canopy Vitality' },
                { name: 'SAR Radar C-Band', img: '/layer-thumbnails/sar_radar.png', spec: 'Sentinel-1 GRD' },
                { name: 'Water (MNDWI)', img: '/layer-thumbnails/water.png', spec: 'Surface Hydrology' },
                { name: 'Burn Ratio (NBR)', img: '/layer-thumbnails/burn_ratio.png', spec: 'Fire Severity' },
                { name: 'Built-up (NDBI)', img: '/layer-thumbnails/built_up.png', spec: 'Urban Impervious' },
                { name: 'Digital Elevation', img: '/layer-thumbnails/digital_elevation.png', spec: 'Copernicus 30m' },
                { name: 'Slope Stability', img: '/layer-thumbnails/slope_stability.png', spec: 'Gradient Degrees' },
                { name: 'Terrain Hillshade', img: '/layer-thumbnails/terrain_hillshade.png', spec: 'Sun Azimuth 315°' },
                { name: 'Landsat 8/9 RGB', img: '/layer-thumbnails/landsat_rgb.png', spec: 'USGS Baseline' },
              ].map((layer, idx) => (
                <div 
                  key={idx}
                  className="border border-[#404040] p-2.5 bg-[#13140e] hover:border-[#ebfc72] transition-colors flex flex-col justify-between"
                >
                  <div className="aspect-video w-full overflow-hidden mb-2 bg-[#13140e] border border-[#404040]/70">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={layer.img} 
                      alt={layer.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-[13px] font-normal text-[#f4f3e8] tracking-[-0.02em] leading-snug">
                      {layer.name}
                    </div>
                    <div className="text-[11px] font-mono text-[#84837b] mt-1">
                      {layer.spec}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section: Deliverables & Export Console ────────────────────────────────── */}
        <section id="deliverables" className="py-24 bg-[#13140e] border-t border-[#404040]">
          <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="inversa-tag">
                EXPORT ARCHITECTURE // DOSSIERS
              </span>
              <h2 className="inversa-heading">
                Ready for QGIS, ArcGIS, and executive review.
              </h2>
              <p className="inversa-body text-[#84837b]">
                Every raster layer, classification mask, and statistical chart can be downloaded in standard geospatial formats. Deliver verifiable spatial proofs directly into enterprise GIS workflows.
              </p>

              <div className="flex items-center gap-4 pt-2">
                <Link 
                  href={isAuthenticated ? "/app" : "/signup"} 
                  className="inversa-btn-lime"
                >
                  <span>TEST WITH YOUR REGION</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Utilitarian Formats Terminal Box */}
            <div className="lg:col-span-6 border border-[#404040] p-6 sm:p-8 bg-[#13140e] space-y-6">
              <div className="flex items-center justify-between border-b border-[#404040] pb-4 font-mono text-[12px]">
                <span className="text-[#ebfc72]">GEO-DELIVERABLE MATRIX</span>
                <span className="text-[#84837b]">COMPLIANCE: OGC / ISO 19115</span>
              </div>

              <div className="space-y-3 font-mono text-[13px]">
                <div className="border border-[#404040] p-3 flex items-center justify-between hover:border-[#ebfc72] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-[#ebfc72]">01</span>
                    <span className="text-[#f4f3e8]">GeoTIFF (32-Bit Floating Point)</span>
                  </div>
                  <span className="text-[#84837b] text-xs">UNCOMPRESSED RASTER</span>
                </div>

                <div className="border border-[#404040] p-3 flex items-center justify-between hover:border-[#ebfc72] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-[#ebfc72]">02</span>
                    <span className="text-[#f4f3e8]">GeoJSON Vector Boundaries</span>
                  </div>
                  <span className="text-[#84837b] text-xs">POLYGON FEATURE SET</span>
                </div>

                <div className="border border-[#404040] p-3 flex items-center justify-between hover:border-[#ebfc72] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-[#ebfc72]">03</span>
                    <span className="text-[#f4f3e8]">KMZ Package for Google Earth</span>
                  </div>
                  <span className="text-[#84837b] text-xs">TILED GROUND OVERLAY</span>
                </div>

                <div className="border border-[#404040] p-3 flex items-center justify-between hover:border-[#ebfc72] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-[#ebfc72]">04</span>
                    <span className="text-[#f4f3e8]">Executive Geospatial PDF Dossier</span>
                  </div>
                  <span className="text-[#84837b] text-xs">STATISTICAL AUDIT REPORT</span>
                </div>
              </div>

              <div className="pt-2 font-mono text-[11px] text-[#84837b] flex justify-between items-center border-t border-[#404040]">
                <span>COORDINATE REFERENCE: EPSG:4326 / EPSG:3857</span>
                <span className="text-[#ebfc72]">INSTANT DOWNLOAD</span>
              </div>
            </div>

          </div>
        </section>

        {/* ────────────────────────────────── Section: Terminal Launch CTA ────────────────────────────────── */}
        <section className="py-28 bg-[#13140e] border-t border-[#404040] text-center">
          <div className="max-w-3xl mx-auto px-6 space-y-8">
            <span className="inversa-tag">
              COMMAND INITIALIZATION // ZERO SIGNUP COST
            </span>

            <h2 className="inversa-display text-[#f4f3e8]">
              Initialize your survey terminal.
            </h2>

            <p className="inversa-body text-[#84837b] max-w-xl mx-auto">
              Access real-time Earth observation data for any coordinate on Earth. Launch the workspace now to delineate your study area.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link 
                href={isAuthenticated ? "/app" : "/signup"} 
                className="inversa-btn-lime !text-[15px] !py-3.5 !px-6"
              >
                <span>LAUNCH FIELD WORKSPACE NOW</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/login" 
                className="inversa-btn-ghost !text-[15px] !py-3.5 !px-6"
              >
                <span>SIGN IN WITH CREDENTIALS</span>
              </Link>
            </div>

            <div className="pt-6 font-mono text-[11px] text-[#84837b]">
              SYSTEM ENGINE: GEOCLASS CLOUD KERNEL // v2.4.0 // CONNECTED
            </div>
          </div>
        </section>

      </main>

      {/* ────────────────────────────────── Footer ────────────────────────────────── */}
      <footer className="border-t border-[#404040] bg-[#13140e] pt-[86px] pb-16">
        <div className="max-w-[1240px] mx-auto px-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-16 border-b border-[#404040]">
            
            {/* Column 1: Brand & Coordinates */}
            <div className="space-y-3 font-mono text-[13px]">
              <div className="flex items-center gap-2">
                <span className="text-[#ebfc72] font-bold">▲</span>
                <span className="font-sans font-bold text-[16px] text-[#f4f3e8] uppercase tracking-[-0.02em]">
                  GEOCLASS
                </span>
              </div>
              <p className="text-[#84837b] text-xs leading-relaxed max-w-xs font-mono">
                Topographic Field Terminal &amp; Multi-Spectral Earth Observation Command System.
              </p>
              <div className="text-[12px] text-[#84837b] pt-2">
                LAT 08°29&apos;N · LON 05°31&apos;E · ELEV 382M
              </div>
            </div>

            {/* Column 2: Terminal Links */}
            <div className="space-y-3 font-mono text-[13px]">
              <div className="text-[#84837b] uppercase text-[11px] tracking-wider">
                TERMINAL DIRECTORY
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/app" className="text-[#f4f3e8] hover:text-[#ebfc72] transition-colors">
                    01 // LIVE WORKSPACE
                  </Link>
                </li>
                <li>
                  <a href="#workflow" className="text-[#f4f3e8] hover:text-[#ebfc72] transition-colors">
                    02 // OPERATIONAL WORKFLOW
                  </a>
                </li>
                <li>
                  <a href="#platform" className="text-[#f4f3e8] hover:text-[#ebfc72] transition-colors">
                    03 // SPECTRAL REGISTRY
                  </a>
                </li>
                <li>
                  <a href="#tools" className="text-[#f4f3e8] hover:text-[#ebfc72] transition-colors">
                    04 // DIAGNOSTICS SUITE
                  </a>
                </li>
                <li>
                  <Link href="/methods" className="text-[#f4f3e8] hover:text-[#ebfc72] transition-colors">
                    05 // METHODS &amp; API SPECIFICATION
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Telemetry Constellations */}
            <div className="space-y-3 font-mono text-[13px]">
              <div className="text-[#84837b] uppercase text-[11px] tracking-wider">
                ACTIVE CONSTELLATIONS
              </div>
              <div className="text-[#84837b] text-xs space-y-1.5 leading-relaxed">
                <div>• ESA Sentinel-2A / Sentinel-2B (MSI)</div>
                <div>• ESA Sentinel-1A / Sentinel-1B (SAR C-Band)</div>
                <div>• USGS / NASA Landsat-8 / Landsat-9 (OLI-2/TIRS-2)</div>
                <div>• Copernicus Global 30m DEM (GLO-30)</div>
                <div>• Google Dynamic World Real-Time Consensus</div>
              </div>
            </div>

          </div>

          {/* Sub-Footer Row */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[12px] text-[#84837b]">
            <div>
              © {new Date().getFullYear()} GEOCLASS. ALL COORDINATES RECORDED IN WGS 84.
            </div>
            <div className="flex items-center gap-6">
              <Link href="/login" className="hover:text-[#f4f3e8]">SIGN IN</Link>
              <Link href="/signup" className="hover:text-[#f4f3e8]">NEW ACCOUNT</Link>
              <Link href="/methods" className="hover:text-[#f4f3e8]">DOCUMENTATION</Link>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
