'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/apiBase';
import {
  ArrowRight,
  Code2, 
  Check, 
  Copy, 
  ExternalLink,
  Activity,
  Terminal,
  Flame,
  Droplets,
  Building,
  Trees,
} from 'lucide-react';

export default function MethodsPage() {
  const [activeTab, setActiveTab] = useState<'methods' | 'sar' | 'indices' | 'change' | 'api' | 'citations'>('methods');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSnippet(id);
      setTimeout(() => setCopiedSnippet(null), 2500);
    });
  };

  const pythonSnippet = `import requests

# GeoClass Developer API v1 Client
API_BASE = "https://geoclass.fastapicloud.dev"

# 1. Check Service Health
health = requests.get(f"{API_BASE}/api/v1/health").json()
print("Cluster Status:", health["status"])

# 2. Run Classification with Sentinel-1 SAR Fusion
payload = {
    "coords": [
        [-122.35, 37.75],
        [-122.30, 37.75],
        [-122.30, 37.80],
        [-122.35, 37.80],
        [-122.35, 37.75]
    ],
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "cloud_cover": 20.0,
    "num_trees": 100,
    "sample_points": 150,
    "model_type": "random_forest",
    "use_sar_fusion": True
}

response = requests.post(f"{API_BASE}/api/v1/classify", json=payload)
data = response.json()

print("Tile URL:", data["tile_url"])
print("Total Area:", data["total_area_ha"], "ha")
for class_name, metrics in data["statistics"].items():
    print(f"  {class_name}: {metrics['percentage']}% ({metrics['area_ha']} ha)")
`;

  const curlSnippet = `curl -X POST "https://geoclass.fastapicloud.dev/api/v1/classify" \\
  -H "Content-Type: application/json" \\
  -d '{
    "coords": [
      [-122.35, 37.75],
      [-122.30, 37.75],
      [-122.30, 37.80],
      [-122.35, 37.80],
      [-122.35, 37.75]
    ],
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "cloud_cover": 20.0,
    "num_trees": 100,
    "sample_points": 150,
    "model_type": "random_forest",
    "use_sar_fusion": true
  }'`;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1F231E] antialiased selection:bg-[#E8C9A8] overflow-x-hidden">
      {/* ─────────── Header ─────────── */}
      <header className="sticky top-0 z-50 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E3E0D5]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10.25" stroke="#1F231E" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="6" stroke="#1F231E" strokeWidth="1.5" strokeOpacity="0.7" />
              <circle cx="14.2" cy="10" r="2.4" fill="#C96B3C" />
            </svg>
            <span className="font-display text-[17px] font-medium tracking-[-0.02em]">GeoClass</span>
            <span className="hidden sm:inline text-[13px] text-[#8A908A] border-l border-[#D8D5CA] pl-3 ml-1">Methods</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[14px] text-[#5B6159]" aria-label="Main">
            <Link href="/#workspace" className="hover:text-[#1F231E] transition-colors">Workspace</Link>
            <Link href="/#layers" className="hover:text-[#1F231E] transition-colors">Layers</Link>
            <Link href="/#tools" className="hover:text-[#1F231E] transition-colors">Tools</Link>
            <Link href="/#exports" className="hover:text-[#1F231E] transition-colors">Exports</Link>
          </nav>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F231E] hover:bg-[#33392F] text-[#FAF9F5] px-3.5 py-2 text-[13.5px] font-medium transition-colors whitespace-nowrap"
          >
            Open workspace <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ─────────── Intro ─────────── */}
      <div className="px-5 sm:px-8 pt-14 sm:pt-20 pb-12">
        <div className="max-w-[1240px] mx-auto">
          <p className="text-[14px] font-medium text-[#AD5630] mb-4">Methods &amp; API</p>
          <h1 className="font-display text-[clamp(34px,5vw,60px)] font-medium leading-[1.02] tracking-[-0.04em] max-w-[900px]">
            How GeoClass turns satellite pixels into land cover maps.
          </h1>
          <p className="mt-6 text-[17px] text-[#5B6159] max-w-[720px] leading-[1.6]">
            GeoClass combines Sentinel-2 optical reflectance with Sentinel-1 radar backscatter, trains a classifier on
            Google Dynamic World labels, and runs it over your area on Google Earth Engine. This page documents each
            step, the band math behind every index, and the REST API.
          </p>

          <dl className="mt-12 grid grid-cols-2 lg:grid-cols-4 border-t border-[#E3E0D5]">
            {[
              { k: 'Ground resolution', v: '10 m per pixel', s: 'Sentinel-2 and Sentinel-1' },
              { k: 'Optical bands', v: '10 bands', s: 'Visible to shortwave infrared' },
              { k: 'Radar', v: 'C-band', s: '5.405 GHz · sees through cloud' },
              { k: 'Land cover classes', v: '9 classes', s: 'Dynamic World taxonomy' },
            ].map((d, i) => (
              <div key={d.k} className={`py-5 pr-4 border-b border-[#E3E0D5] ${i % 2 === 1 ? 'pl-4 border-l lg:border-l' : 'lg:pl-4'} ${i > 0 ? 'lg:border-l' : ''}`}>
                <dt className="text-[13px] text-[#8A908A]">{d.k}</dt>
                <dd className="mt-1 font-display text-[22px] tracking-[-0.02em]">{d.v}</dd>
                <dd className="text-[13px] text-[#5B6159]">{d.s}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ─────────── Section tabs ─────────── */}
      <div className="sticky top-14 z-40 bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#E3E0D5]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 flex items-center gap-6 overflow-x-auto [scrollbar-width:none]" role="tablist">
          {[
            { id: 'methods', label: 'Pipeline' },
            { id: 'sar', label: 'Radar (SAR)' },
            { id: 'indices', label: 'Spectral indices' },
            { id: 'change', label: 'Change over time' },
            { id: 'api', label: 'REST API' },
            { id: 'citations', label: 'References' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`relative py-3.5 text-[14px] whitespace-nowrap transition-colors cursor-pointer ${
                  active ? 'text-[#1F231E] font-medium' : 'text-[#8A908A] hover:text-[#1F231E]'
                }`}
              >
                {tab.label}
                {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#C96B3C]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────── Main Documentation Content ────────────────────────────────── */}
      <main className="max-w-[1240px] mx-auto px-5 sm:px-8 py-12 sm:py-16 space-y-12">
        
        {/* TAB 1: PIPELINE OVERVIEW */}
        {activeTab === 'methods' && (
          <section className="space-y-8">
            <div>
              <span className="text-[13px] font-medium text-[#AD5630] block mb-2">
                System architecture
              </span>
              <h2 className="font-display text-[28px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.1] mb-4">
                End-to-End Remote Sensing Architecture
              </h2>
              <p className="text-[16px] text-[#5B6159] leading-[1.65] max-w-[760px]">
                GeoClass executes all heavy computation serverless-side on Google Earth Engine supercomputing clusters. Client requests specify an Area of Interest (AOI) polygon, a temporal observation window, cloud cover thresholds, and masking preferences.
              </p>
            </div>

            {/* Pipeline Stage Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F231E]">
                  <span className="w-5 h-5 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] text-[#AD5630] flex items-center justify-center text-[11px] font-mono">1</span>
                  <span>Atmospheric Correction and Quality Screening</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6]">
                  Raw Sentinel-2 Level-2A surface reflectance granules undergo rigorous masking using both the Scene Classification Layer (SCL) and QA60 opaque cloud and cirrus bitmasks. Cloud shadows (SCL 2), defective pixels, and saturated artifacts are eliminated prior to temporal compositing.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F231E]">
                  <span className="w-5 h-5 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] text-[#AD5630] flex items-center justify-center text-[11px] font-mono">2</span>
                  <span>Temporal Median Reducer &amp; Seasonal Compositing</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6]">
                  Pixels are aggregated over the specified date window using a median reducer. This rejects intermittent cloud fringes, sensor anomalies, and transient haze while preserving persistent land cover reflectance signatures. Optional seasonal partitioning isolates dry or wet phenological cycles.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F231E]">
                  <span className="w-5 h-5 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] text-[#AD5630] flex items-center justify-center text-[11px] font-mono">3</span>
                  <span>Feature Extraction: Spectral Indices &amp; SAR Fusion</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6]">
                  On top of 10 optical surface reflectance bands (B2, B3, B4, B5, B6, B7, B8, B8A, B11, B12), mathematical diagnostic indices (NDVI, MNDWI, NDBI, NBR) are computed and added. When enabled, dual-polarized Sentinel-1 C-band SAR backscatter features (VV, VH, and VV/VH cross-polarization ratio) are fused directly into the feature stack.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F231E]">
                  <span className="w-5 h-5 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] text-[#AD5630] flex items-center justify-center text-[11px] font-mono">4</span>
                  <span>Supervised Machine Learning Training &amp; Inference</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6]">
                  Ground truth pixels are sampled stratified across 9 Land Use / Land Cover classes using Dynamic World modal predictions. A Random Forest ensemble of decision trees is trained on the fly on Earth Engine, classifying every pixel within the AOI at 10-meter spatial resolution.
                </p>
              </div>
            </div>

            {/* Harmonized 9-Class LULC Taxonomy */}
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-[#1F231E] mb-3">Harmonized 9-Class LULC Taxonomy</h3>
              <div className="overflow-x-auto rounded-lg border border-[#E3E0D5]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F4F1E8] border-b border-[#E3E0D5] text-[#1F231E] font-mono">
                      <th className="p-3">Class ID</th>
                      <th className="p-3">Class Name</th>
                      <th className="p-3">Color Value</th>
                      <th className="p-3">Diagnostic Spectral &amp; SAR Characteristics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E0D5] text-[#5B6159] bg-white">
                    <tr>
                      <td className="p-3 font-mono text-[#AD5630]">0</td>
                      <td className="p-3 font-medium text-[#1F231E]">Water</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded-md bg-[#419BDF] align-middle mr-2" />#419BDF</td>
                      <td className="p-3">High NIR absorption, high MNDWI (&gt;0.1), specular microwave reflection (very low VV/VH backscatter).</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[#AD5630]">1</td>
                      <td className="p-3 font-medium text-[#1F231E]">Trees / Forest</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded-md bg-[#397D49] align-middle mr-2" />#397D49</td>
                      <td className="p-3">High red edge and NIR reflectance (NDVI &gt;0.6), high cross-polarized VH microwave volume scattering.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[#AD5630]">2</td>
                      <td className="p-3 font-medium text-[#1F231E]">Grass</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded-md bg-[#88B053] align-middle mr-2" />#88B053</td>
                      <td className="p-3">Moderate NDVI (0.3 to 0.6), low surface roughness, lower VH return than mature forest canopy.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[#AD5630]">3</td>
                      <td className="p-3 font-medium text-[#1F231E]">Flooded Vegetation</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded-md bg-[#7A87C6] align-middle mr-2" />#7A87C6</td>
                      <td className="p-3">Mixed water/canopy response, double-bounce microwave scattering between water surface and emergent stalks.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[#AD5630]">4</td>
                      <td className="p-3 font-medium text-[#1F231E]">Crops</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded-md bg-[#E49635] align-middle mr-2" />#E49635</td>
                      <td className="p-3">Periodic phenological variations in NDVI, geometric field parcel structures, moderate SAR backscatter.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[#AD5630]">5</td>
                      <td className="p-3 font-medium text-[#1F231E]">Shrub &amp; Scrub</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded-md bg-[#DFC35A] align-middle mr-2" />#DFC35A</td>
                      <td className="p-3">Low-stature woody vegetation, intermediate NIR reflectance between grass and closed canopy.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[#AD5630]">6</td>
                      <td className="p-3 font-medium text-[#1F231E]">Built-Up / Urban</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded-md bg-[#C4281B] align-middle mr-2" />#C4281B</td>
                      <td className="p-3">High NDBI (&gt;0.05), high SWIR reflectance, corner-reflector dihedral microwave bounce (intense VV return).</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[#AD5630]">7</td>
                      <td className="p-3 font-medium text-[#1F231E]">Bare Ground</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded-md bg-[#A59B8F] align-middle mr-2" />#A59B8F</td>
                      <td className="p-3">Flat spectral response across visible to NIR, low NDVI (&lt;0.1), surface roughness driven SAR response.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[#AD5630]">8</td>
                      <td className="p-3 font-medium text-[#1F231E]">Snow &amp; Ice</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded-md bg-[#B39FE1] align-middle mr-2" />#B39FE1</td>
                      <td className="p-3">Extremely high visible reflectance, sharp absorption in SWIR bands B11 and B12.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Multi-Mission Sensor Comparison */}
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-[#1F231E] mb-2">Multi-Mission Earth Observation Constellations</h3>
              <p className="text-[14px] text-[#5B6159] leading-[1.6] mb-4">
                GeoClass bridges European Space Agency (Copernicus) and NASA / USGS constellations. Through our STAC catalog integration and Earth Engine bindings, users can dynamically switch optical baselines between Sentinel-2 and Landsat 8/9, or fuse Sentinel-1 synthetic aperture radar.
              </p>
              <div className="overflow-x-auto rounded-lg border border-[#E3E0D5]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F4F1E8] border-b border-[#E3E0D5] text-[#1F231E] font-mono">
                      <th className="p-3">Constellation</th>
                      <th className="p-3">Operator</th>
                      <th className="p-3">Sensor Type</th>
                      <th className="p-3">Spatial Resolution</th>
                      <th className="p-3">Temporal Revisit</th>
                      <th className="p-3">Atmospheric Resilience</th>
                      <th className="p-3">Primary Role in GeoClass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E0D5] text-[#5B6159] bg-white">
                    <tr>
                      <td className="p-3 font-semibold text-[#1F231E]">Copernicus Sentinel-2</td>
                      <td className="p-3">ESA / European Union</td>
                      <td className="p-3">MSI (Multi-Spectral 13 Bands)</td>
                      <td className="p-3 font-mono text-[#AD5630]">10m / 20m</td>
                      <td className="p-3">5 days (Constellation 2A + 2B)</td>
                      <td className="p-3 text-[#8A6A1F]">SCL &amp; QA60 Cloud Screening</td>
                      <td className="p-3">High-resolution optical classification, 10m spectral indices (NDVI, NDRE)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#1F231E]">USGS / NASA Landsat 8 &amp; 9</td>
                      <td className="p-3">USGS / NASA</td>
                      <td className="p-3">OLI / OLI-2 + TIRS (11 Bands)</td>
                      <td className="p-3 font-mono text-[#AD5630]">30m (Optical) / 100m (Thermal)</td>
                      <td className="p-3">8 days (Combined 8 + 9)</td>
                      <td className="p-3 text-[#8A6A1F]">QA_PIXEL Bitmask Screening</td>
                      <td className="p-3">Decadal historical continuity, 30m Level-2 Tier-1 surface reflectance cross-validation</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#1F231E]">Copernicus Sentinel-1</td>
                      <td className="p-3">ESA / European Union</td>
                      <td className="p-3">C-SAR (Active Microwave 5.405 GHz)</td>
                      <td className="p-3 font-mono text-[#AD5630]">10m (IW Ground Range Detected)</td>
                      <td className="p-3">6-12 days</td>
                      <td className="p-3 text-[#AD5630] font-semibold">100% Cloud-Penetrating (All-Weather)</td>
                      <td className="p-3">Cloud-penetrating radar backscatter fusion (VV, VH), canopy moisture and structural roughness</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: SENTINEL-1 SAR PHYSICS */}
        {activeTab === 'sar' && (
          <section className="space-y-8">
            <div>
              <span className="text-[13px] font-medium text-[#AD5630] block mb-2">
                Active microwave remote sensing
              </span>
              <h2 className="font-display text-[28px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.1] mb-4">
                Sentinel-1 C-Band Synthetic Aperture Radar (SAR)
              </h2>
              <p className="text-[16px] text-[#5B6159] leading-[1.65] max-w-[760px]">
                Optical sensors such as Sentinel-2 rely on solar illumination in the visible, near-infrared, and shortwave infrared spectrum (0.4 to 2.2 micrometers). Consequently, persistent cloud cover, haze, smog, and monsoons frequently obstruct optical observations. Sentinel-1 operates an active C-band radar at 5.405 GHz (wavelength of 5.55 cm), transmitting microwave pulses that penetrate atmospheric hydrometeors unimpeded.
              </p>
            </div>

            {/* Physics Concept Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F231E] mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  <span>VV Co-Polarization (Vertical Transmit, Vertical Receive)</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6] mb-3">
                  VV polarization measures microwave backscatter with minimal polarization rotation. It is sensitive to surface roughness, vertical structure (such as stalks and building facades), and soil moisture dielectric properties.
                </p>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] font-mono text-xs text-[#AD5630]">
                  Value Range: -20.0 dB to 0.0 dB
                </div>
              </div>

              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F231E] mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#4CAF6A]" />
                  <span>VH Cross-Polarization (Vertical Transmit, Horizontal Receive)</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6] mb-3">
                  VH backscatter arises when transmitted vertical waves experience multiple internal reflections inside a 3D volumetric medium, depolarizing into horizontal return waves. Dense vegetation canopies generate high VH returns.
                </p>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] font-mono text-xs text-[#AD5630]">
                  Value Range: -25.0 dB to -5.0 dB
                </div>
              </div>

              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F231E] mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                  <span>VV / VH Cross-Polarization Ratio</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6] mb-3">
                  In decibel scale, the cross ratio is computed as VV minus VH. This metric isolates volume scatterers from specular planar surfaces. Water bodies absorb or reflect away both polarizations, yielding very high ratio contrast.
                </p>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] font-mono text-xs text-[#AD5630]">
                  Ratio Equation: VV_VH_ratio = VV - VH (dB)
                </div>
              </div>

              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F231E] mb-2">
                  <Activity className="w-3.5 h-3.5 text-[#AD5630]" />
                  <span>Optical-SAR Multi-Sensor Fusion Rationale</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6] mb-3">
                  Combining optical spectral reflectance with SAR microwave backscatter eliminates spectral confusion between spectrally similar classes with different structural geometry, such as dark asphalt vs calm water, or bare soil vs dry crops.
                </p>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] font-mono text-xs text-[#AD5630]">
                  Multi-Sensor Depth: 13 Total Input Features
                </div>
              </div>
            </div>

            {/* SAR False Color Composite Spec */}
            <div className="p-5 rounded-lg bg-white border border-[#E3E0D5]">
              <h3 className="text-sm font-semibold text-[#1F231E] mb-2">False-Color SAR Backscatter RGB Representation</h3>
              <p className="text-[14px] text-[#5B6159] leading-[1.6] mb-4">
                When rendering the Sentinel-1 SAR layer, GeoClass maps backscatter bands into an informative RGB composite:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5]">
                  <span className="font-semibold text-[#EF4444]">Red Channel:</span> VV Co-polarization (-20 to 0 dB). Highlights building corners and rough terrain.
                </div>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5]">
                  <span className="font-semibold text-[#4CAF6A]">Green Channel:</span> VH Cross-polarization (-25 to -5 dB). Highlights tree canopies and biomass.
                </div>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5]">
                  <span className="font-semibold text-[#416B73]">Blue Channel:</span> VV/VH Ratio (0 to 15 dB). Highlights specular water contrast and planar surfaces.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: SPECTRAL BAND MATH */}
        {activeTab === 'indices' && (
          <section className="space-y-8">
            <div>
              <span className="text-[13px] font-medium text-[#AD5630] block mb-2">
                Optical band mathematics
              </span>
              <h2 className="font-display text-[28px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.1] mb-4">
                Spectral Indices &amp; Biophysical Band Math
              </h2>
              <p className="text-[16px] text-[#5B6159] leading-[1.65] max-w-[760px]">
                Sentinel-2 MultiSpectral Instrument (MSI) captures 13 spectral bands from 443 nm to 2190 nm. GeoClass utilizes 10 surface reflectance bands to compute publication-standard biophysical diagnostic indices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NDVI */}
              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trees className="w-4 h-4 text-[#4CAF6A]" />
                    <span className="text-sm font-semibold text-[#1F231E]">NDVI: Normalized Difference Vegetation</span>
                  </div>
                  <span className="text-xs font-mono text-[#5B6159]">Rouse et al., 1974</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6]">
                  Exploits strong chlorophyll absorption in red wavelengths (Band 4, 665 nm) and vigorous mesophyll scattering in the near-infrared spectrum (Band 8, 842 nm). Evaluates photosynthetic capacity, biomass density, and canopy vigor.
                </p>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] font-mono text-xs text-[#AD5630]">
                  Formula: NDVI = (B8 - B4) / (B8 + B4)
                </div>
              </div>

              {/* MNDWI */}
              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-[#419BDF]" />
                    <span className="text-sm font-semibold text-[#1F231E]">MNDWI: Modified Normalized Difference Water</span>
                  </div>
                  <span className="text-xs font-mono text-[#5B6159]">Xu, 2006</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6]">
                  Replaces near-infrared with shortwave infrared (Band 11, 1610 nm) to significantly suppress noise from built-up urban features and dry soils while maximizing open water body delineations.
                </p>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] font-mono text-xs text-[#AD5630]">
                  Formula: MNDWI = (B3 - B11) / (B3 + B11)
                </div>
              </div>

              {/* NDBI */}
              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#EF4444]" />
                    <span className="text-sm font-semibold text-[#1F231E]">NDBI: Normalized Difference Built-Up</span>
                  </div>
                  <span className="text-xs font-mono text-[#5B6159]">Zha et al., 2003</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6]">
                  Capitalizes on higher SWIR reflectance compared to NIR for impervious man-made materials, concrete, asphalt, and quarry rocks, delineating urban boundaries and built infrastructure footprints.
                </p>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] font-mono text-xs text-[#AD5630]">
                  Formula: NDBI = (B11 - B8) / (B11 + B8)
                </div>
              </div>

              {/* NBR */}
              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#E7B84B]" />
                    <span className="text-sm font-semibold text-[#1F231E]">NBR: Normalized Burn Ratio</span>
                  </div>
                  <span className="text-xs font-mono text-[#5B6159]">Key &amp; Benson, 2006</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6]">
                  Combines near-infrared (Band 8) with deep shortwave infrared (Band 12, 2190 nm) to highlight wildfire burn scars, charcoal deposition, soil exposure, and post-fire canopy mortality.
                </p>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] font-mono text-xs text-[#AD5630]">
                  Formula: NBR = (B8 - B12) / (B8 + B12)
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: TEMPORAL TREND BREAKS */}
        {activeTab === 'change' && (
          <section className="space-y-8">
            <div>
              <span className="text-[13px] font-medium text-[#AD5630] block mb-2">
                Longitudinal time series
              </span>
              <h2 className="font-display text-[28px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.1] mb-4">
                Multi-Temporal Trajectory Segmentation &amp; Trend Breaks
              </h2>
              <p className="text-[16px] text-[#5B6159] leading-[1.65] max-w-[760px]">
                Single-date or bitemporal satellite comparisons often confuse seasonal phenological shifts or brief agricultural harvests with permanent land degradation. GeoClass implements continuous annual trajectory segmentation based on the LandTrendr framework (Kennedy et al., 2010), tracking vegetation and built-up trends across annual Sentinel-2 median composites from 2018 to 2025.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F231E] mb-2">
                  <Trees className="w-4 h-4 text-[#4CAF6A]" />
                  <span>Canopy Disturbance &amp; Deforestation (NBR)</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6] mb-3">
                  Normalized Burn Ratio (NBR) is highly sensitive to canopy moisture and structural density. A sharp drop in annual median NBR represents acute disturbance: timber clear-cutting, wildfire mortality, or infrastructure clearing.
                </p>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] font-mono text-xs text-[#AD5630]">
                  Onset: Year of Maximum Negative Deviation (Delta &gt; 0.15)
                </div>
              </div>

              <div className="p-5 rounded-lg bg-white border border-[#E3E0D5]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F231E] mb-2">
                  <Building className="w-4 h-4 text-[#EF4444]" />
                  <span>Urban Sprawl &amp; Impervious Expansion (NDBI)</span>
                </div>
                <p className="text-[14px] text-[#5B6159] leading-[1.6] mb-3">
                  Normalized Difference Built-Up Index (NDBI) tracks replacement of natural vegetation with asphalt, concrete, and industrial roofscapes. A sustained positive jump indicates permanent urban expansion.
                </p>
                <div className="p-3 rounded-md bg-[#F4F1E8] border border-[#E3E0D5] font-mono text-xs text-[#AD5630]">
                  Onset: Year of Persistent Positive Built-Up Jump (Delta &gt; 0.12)
                </div>
              </div>
            </div>

            {/* LandTrendr Algorithm Steps */}
            <div className="p-5 rounded-lg bg-white border border-[#E3E0D5] space-y-3">
              <h3 className="text-sm font-semibold text-[#1F231E]">LandTrendr Server-Side Earth Engine Process</h3>
              <ol className="list-decimal list-inside text-xs text-[#5B6159] space-y-2 leading-relaxed">
                <li><strong className="text-[#1F231E]">Annual Cloud-Free Compositing:</strong> For every year, Sentinel-2 granules are filtered during the optimal vegetative season and masked for clouds/shadows via SCL and QA60.</li>
                <li><strong className="text-[#1F231E]">Baseline Anchoring:</strong> The initial year defines the undisturbed pre-event spectral baseline.</li>
                <li><strong className="text-[#1F231E]">Trajectory Delta &amp; Break Detection:</strong> Pixel-wise differences are computed across consecutive years. Pixels exceeding the user sensitivity threshold are tagged as disturbed.</li>
                <li><strong className="text-[#1F231E]">Onset Year Assignment:</strong> The exact calendar year exhibiting the steepest trajectory break is recorded into the Onset Year raster band.</li>
                <li><strong className="text-[#1F231E]">Post-Disturbance Regrowth Modeling:</strong> Consecutive years following the onset year are analyzed to identify vegetative recovery slopes vs permanent non-forest conversion.</li>
              </ol>
            </div>
          </section>
        )}

        {/* TAB 5: DEVELOPER REST API */}
        {activeTab === 'api' && (
          <section className="space-y-8">
            <div>
              <span className="text-[13px] font-medium text-[#AD5630] block mb-2">
                Programmatic integration
              </span>
              <h2 className="font-display text-[28px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.1] mb-4">
                Developer REST API v1 &amp; Python SDK
              </h2>
              <p className="text-[16px] text-[#5B6159] leading-[1.65] max-w-[760px]">
                Every request below can be tried live in the{' '}
                <a href={`${API_BASE}/docs`} target="_blank" rel="noopener noreferrer" className="text-[#AD5630] underline underline-offset-2 hover:text-[#C96B3C]">interactive API docs</a>.{' '}
                GeoClass provides programmatically accessible REST endpoints allowing researchers, data scientists, and autonomous pipelines to trigger land cover classification, extract SAR radar composites, and query spectral time-series.
              </p>
            </div>

            {/* Endpoints Table */}
            <div className="overflow-x-auto rounded-lg border border-[#E3E0D5]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F4F1E8] border-b border-[#E3E0D5] text-[#1F231E] font-mono">
                    <th className="p-3">HTTP Method</th>
                    <th className="p-3">Endpoint</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Key Parameters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E0D5] text-[#5B6159] bg-white">
                  <tr>
                    <td className="p-3 font-mono font-semibold text-[#AD5630]">GET</td>
                    <td className="p-3 font-mono text-[#1F231E]">/api/v1/health</td>
                    <td className="p-3">Checks Earth Engine cluster connection and system health.</td>
                    <td className="p-3 font-mono text-[#5B6159]">None</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-[#416B73]">POST</td>
                    <td className="p-3 font-mono text-[#1F231E]">/api/v1/classify</td>
                    <td className="p-3">Runs Random Forest or Deep Learning classification on GeoJSON AOI.</td>
                    <td className="p-3 font-mono text-[11px] text-[#AD5630]">coords, start_date, end_date, use_sar_fusion</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-[#416B73]">POST</td>
                    <td className="p-3 font-mono text-[#1F231E]">/api/v1/sar-composite</td>
                    <td className="p-3">Generates cloud-penetrating Sentinel-1 SAR dual-polarization composite.</td>
                    <td className="p-3 font-mono text-[11px] text-[#AD5630]">coords, start_date, end_date</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-[#416B73]">POST</td>
                    <td className="p-3 font-mono text-[#1F231E]">/api/v1/spectral</td>
                    <td className="p-3">Computes zonal multi-index spectral analysis (NDBI, MNDWI, NBR).</td>
                    <td className="p-3 font-mono text-[11px] text-[#AD5630]">coords, start_date, end_date</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-[#416B73]">POST</td>
                    <td className="p-3 font-mono text-[#1F231E]">/api/v1/timeseries</td>
                    <td className="p-3">Extracts multi-year pixel trajectory history with anomaly detection.</td>
                    <td className="p-3 font-mono text-[11px] text-[#AD5630]">lat, lng, start_year, end_year</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-[#416B73]">POST</td>
                    <td className="p-3 font-mono text-[#1F231E]">/api/v1/change-detection</td>
                    <td className="p-3">Runs multi-temporal LandTrendr disturbance onset and trajectory segmentation.</td>
                    <td className="p-3 font-mono text-[11px] text-[#AD5630]">coords, start_year, end_year, index_name, sensitivity</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-[#416B73]">POST</td>
                    <td className="p-3 font-mono text-[#1F231E]">/api/v1/stac/search</td>
                    <td className="p-3">Queries STAC-compliant scenes for Sentinel-2, Landsat 8/9, and Sentinel-1.</td>
                    <td className="p-3 font-mono text-[11px] text-[#AD5630]">coords, start_date, end_date, collections, max_cloud_cover</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-[#416B73]">POST</td>
                    <td className="p-3 font-mono text-[#1F231E]">/api/v1/landsat-composite</td>
                    <td className="p-3">Generates Landsat 8/9 Collection 2 Tier 1 Surface Reflectance composites &amp; tiles.</td>
                    <td className="p-3 font-mono text-[11px] text-[#AD5630]">coords, start_date, end_date, cloud_percentage</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Code Snippet: Python */}
            <div className="rounded-lg border border-[#2E3429] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#2A3027] border-b border-[#2E3429]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#E9C79F]" />
                  <span className="text-xs font-medium text-[#E9E6DC]">Python 3 SDK Example</span>
                </div>
                <button
                  onClick={() => copyToClipboard(pythonSnippet, 'python')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#4A5245] hover:border-[#E9C79F] text-[#E9E6DC] text-xs transition cursor-pointer"
                >
                  {copiedSnippet === 'python' ? <Check className="w-3 h-3 text-[#E9C79F]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet === 'python' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-[12.5px] font-mono text-[#E9E6DC] overflow-x-auto leading-relaxed bg-[#1F241D]">
                <code>{pythonSnippet}</code>
              </pre>
            </div>

            {/* Code Snippet: cURL */}
            <div className="rounded-lg border border-[#2E3429] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#2A3027] border-b border-[#2E3429]">
                <div className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-[#E9C79F]" />
                  <span className="text-xs font-medium text-[#E9E6DC]">cURL Command Line Example</span>
                </div>
                <button
                  onClick={() => copyToClipboard(curlSnippet, 'curl')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#4A5245] hover:border-[#E9C79F] text-[#E9E6DC] text-xs transition cursor-pointer"
                >
                  {copiedSnippet === 'curl' ? <Check className="w-3 h-3 text-[#E9C79F]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet === 'curl' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-[12.5px] font-mono text-[#E9E6DC] overflow-x-auto leading-relaxed bg-[#1F241D]">
                <code>{curlSnippet}</code>
              </pre>
            </div>
          </section>
        )}

        {/* TAB 6: CITATIONS */}
        {activeTab === 'citations' && (
          <section className="space-y-8">
            <div>
              <span className="text-[13px] font-medium text-[#AD5630] block mb-2">
                Scientific foundations
              </span>
              <h2 className="font-display text-[28px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.1] mb-4">
                Academic &amp; Literature Citations
              </h2>
              <p className="text-[16px] text-[#5B6159] leading-[1.65] max-w-[760px]">
                GeoClass builds upon foundational remote sensing algorithms, machine learning literature, and European Space Agency (ESA) Copernicus mission technical specifications.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  author: "Brown, C. F., Brumby, S. P., Guzder-Williams, B., et al.",
                  year: "2022",
                  title: "Dynamic World, Near real-time global 10 m land use land cover mapping.",
                  journal: "Scientific Data, 9(1), 251.",
                  doi: "https://doi.org/10.1038/s41597-022-01307-4"
                },
                {
                  author: "Kennedy, R. E., Yang, Z., & Cohen, W. B.",
                  year: "2010",
                  title: "Detecting trends in forest disturbance and recovery using metric trajectories.",
                  journal: "Remote Sensing of Environment, 114(12), 2897-2910.",
                  doi: "https://doi.org/10.1016/j.rse.2010.07.008"
                },
                {
                  author: "Breiman, L.",
                  year: "2001",
                  title: "Random Forests.",
                  journal: "Machine Learning, 45(1), 5-32.",
                  doi: "https://doi.org/10.1023/A:1010933404324"
                },
                {
                  author: "Torres, R., Snoeij, P., Geudtner, D., et al.",
                  year: "2012",
                  title: "GMES Sentinel-1 mission.",
                  journal: "Remote Sensing of Environment, 120, 9-24.",
                  doi: "https://doi.org/10.1016/j.rse.2011.05.028"
                },
                {
                  author: "Drusch, M., Del Bello, U., Carlier, S., et al.",
                  year: "2012",
                  title: "Sentinel-2: ESA's optical high-resolution mission for GMES operational services.",
                  journal: "Remote Sensing of Environment, 120, 25-36.",
                  doi: "https://doi.org/10.1016/j.rse.2011.11.026"
                },
                {
                  author: "Rouse, J. W., Haas, R. H., Schell, J. A., & Deering, D. W.",
                  year: "1974",
                  title: "Monitoring vegetation systems in the Great Plains with ERTS.",
                  journal: "Third Earth Resources Technology Satellite-1 Symposium, NASA SP-351, 309-317.",
                  doi: null
                },
                {
                  author: "Xu, H.",
                  year: "2006",
                  title: "Modification of normalised difference water index (NDWI) to enhance open water features in remotely sensed imagery.",
                  journal: "International Journal of Remote Sensing, 27(14), 3025-3033.",
                  doi: "https://doi.org/10.1080/01431160600589179"
                },
                {
                  author: "Zha, Y., Gao, J., & Ni, S.",
                  year: "2003",
                  title: "Use of normalized difference built-up index in automatically mapping urban areas from TM imagery.",
                  journal: "International Journal of Remote Sensing, 24(3), 583-594.",
                  doi: "https://doi.org/10.1080/01431160304987"
                },
                {
                  author: "Key, C. H., & Benson, N. C.",
                  year: "2006",
                  title: "Landscape Assessment (LA): Sampling and Analysis Methods.",
                  journal: "FIREMON: Fire Effects Monitoring and Inventory System. USDA Forest Service RMRS-GTR-164-CD.",
                  doi: null
                },
                {
                  author: "Gorelick, N., Hancher, M., Dixon, M., Ilyushchenko, S., Thau, D., & Moore, R.",
                  year: "2017",
                  title: "Google Earth Engine: Planetary-scale geospatial analysis for everyone.",
                  journal: "Remote Sensing of Environment, 202, 18-27.",
                  doi: "https://doi.org/10.1016/j.rse.2017.06.031"
                }
              ].map((citation, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-white border border-[#E3E0D5] text-xs">
                  <div className="font-semibold text-[#1F231E]">
                    {citation.author} ({citation.year})
                  </div>
                  <div className="text-[#5B6159] mt-1 italic">
                    &ldquo;{citation.title}&rdquo;
                  </div>
                  <div className="text-[#5B6159] mt-1">
                    {citation.journal}
                  </div>
                  {citation.doi && (
                    <a
                      href={citation.doi}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#AD5630] hover:underline transition mt-2 font-mono"
                    >
                      <span>{citation.doi}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* ─────────── Footer ─────────── */}
      <footer className="border-t border-[#E3E0D5] bg-[#F4F1E8] px-5 sm:px-8 py-10">
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 text-[14px] text-[#5B6159]">
          <span>© {new Date().getFullYear()} GeoClass</span>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            <Link href="/" className="hover:text-[#1F231E]">Home</Link>
            <Link href="/app" className="hover:text-[#1F231E]">Workspace</Link>
            <a href={`${API_BASE}/docs`} target="_blank" rel="noopener noreferrer" className="hover:text-[#1F231E]">Interactive API docs</a>
          </nav>
          <span className="text-[13px] text-[#8A908A]">Sentinel-2 · Sentinel-1 · Landsat 8/9 · Copernicus DEM</span>
        </div>
      </footer>
    </div>
  );
}
