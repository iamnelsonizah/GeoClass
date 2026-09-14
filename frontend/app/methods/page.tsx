'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  ArrowLeft, 
  Satellite, 
  Cpu, 
  Database, 
  BookOpen, 
  Code2, 
  Check, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  Activity,
  Terminal,
  Zap,
  Flame,
  Droplets,
  Building,
  Trees,
  History,
  TrendingDown
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
API_BASE = "https://geoclass.onrender.com"  # Replace with your backend URL

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

  const curlSnippet = `curl -X POST "https://geoclass.onrender.com/api/v1/classify" \\
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
    <div className="min-h-screen bg-[#121410] text-[#E0DCD3] font-sans antialiased selection:bg-[#306840] selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-[#2E3429] bg-[#121410]/90 backdrop-blur-md px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-xs text-[#E0DCD3] hover:text-white transition px-2.5 py-1.5 rounded-md bg-[#1A1D17] border border-[#2E3429]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#306840]" />
            <span>Return to Map Engine</span>
          </Link>
          <div className="h-4 w-px bg-[#2E3429] hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="bg-[#306840]/20 border border-[#306840]/40 rounded-lg p-1.5 text-[#E0DCD3]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                GeoClass Scientific Methods & API
              </h1>
              <p className="text-[11px] text-neutral-400">Earth Observation Remote Sensing Physics & Architecture</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1D17] border border-[#2E3429] text-xs font-medium text-[#E0DCD3] hover:text-white hover:border-[#306840] transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#306840]" />
            <span>Interactive OpenAPI Docs</span>
          </a>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="border-b border-[#2E3429] bg-gradient-to-b from-[#1A1D17] to-[#121410] px-4 lg:px-8 py-10 lg:py-14">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#306840]/20 border border-[#306840]/40 text-[#E0DCD3] text-xs font-medium mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-[#306840]" />
            <span>Peer-Reviewed Earth Observation Methodology</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-3">
            Algorithmic Pipeline, Sensor Physics, and Machine Learning Specifications
          </h2>
          <p className="text-sm lg:text-base text-neutral-300 max-w-3xl leading-relaxed">
            GeoClass integrates multi-spectral optical surface reflectance from Copernicus Sentinel-2 MSI with dual-polarization C-band microwave backscatter from Sentinel-1 SAR. Ground truth labels derive from Dynamic World near-real-time global land cover predictions, classified via an on-the-fly Random Forest or Spatial Contextual architecture.
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            <div className="p-3.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
              <div className="text-[11px] text-neutral-400">Spatial Ground Resolution</div>
              <div className="text-base font-semibold text-white mt-1">10 meters / pixel</div>
              <div className="text-[10px] text-[#4B6445] mt-0.5">Sentinel-2 & Sentinel-1</div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
              <div className="text-[11px] text-neutral-400">Optical Band Coverage</div>
              <div className="text-base font-semibold text-white mt-1">10 Diagnostic Bands</div>
              <div className="text-[10px] text-[#4B6445] mt-0.5">VNIR to Shortwave Infrared</div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
              <div className="text-[11px] text-neutral-400">SAR Radar Frequency</div>
              <div className="text-base font-semibold text-white mt-1">5.405 GHz C-Band</div>
              <div className="text-[10px] text-[#4B6445] mt-0.5">All-weather cloud penetrating</div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
              <div className="text-[11px] text-neutral-400">Classification Topology</div>
              <div className="text-base font-semibold text-white mt-1">9 LULC Classes</div>
              <div className="text-[10px] text-[#4B6445] mt-0.5">Dynamic World Harmonized</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#2E3429] bg-[#161912] px-4 lg:px-8">
        <div className="max-w-5xl mx-auto flex items-center gap-1 overflow-x-auto py-2">
          {[
            { id: 'methods', label: '1. Pipeline Overview', icon: Cpu },
            { id: 'sar', label: '2. Sentinel-1 SAR Physics', icon: Satellite },
            { id: 'indices', label: '3. Spectral Band Math', icon: Zap },
            { id: 'change', label: '4. Temporal Trend Breaks', icon: History },
            { id: 'api', label: '5. Developer REST API', icon: Code2 },
            { id: 'citations', label: '6. Academic Citations', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#22261E] text-white border border-[#306840]/60 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-[#1A1D17]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#306840]' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 lg:px-8 py-10 space-y-12">
        
        {/* TAB 1: PIPELINE OVERVIEW */}
        {activeTab === 'methods' && (
          <section className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">End-to-End Remote Sensing Architecture</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                GeoClass executes all heavy computation serverless-side on Google Earth Engine supercomputing clusters. Client requests specify an Area of Interest (AOI) polygon, a temporal observation window, cloud cover thresholds, and masking preferences.
              </p>
            </div>

            {/* Pipeline Stage Cards */}
            <div className="space-y-4">
              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E0DCD3] mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#306840]/30 text-[#E0DCD3] flex items-center justify-center text-[11px] font-mono">1</span>
                  <span>Atmospheric Correction and Quality Screening</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Raw Sentinel-2 Level-2A surface reflectance granules undergo rigorous masking using both the Scene Classification Layer (SCL) and QA60 opaque cloud and cirrus bitmasks. Cloud shadows (SCL 2), defective pixels, and saturated artifacts are eliminated prior to temporal compositing.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E0DCD3] mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#306840]/30 text-[#E0DCD3] flex items-center justify-center text-[11px] font-mono">2</span>
                  <span>Temporal Median Reducer & Seasonal Compositing</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Pixels are aggregated over the specified date window using a median reducer. This rejects intermittent cloud fringes, sensor anomalies, and transient haze while preserving persistent land cover reflectance signatures. Optional seasonal partitioning isolates dry or wet phenological cycles.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E0DCD3] mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#306840]/30 text-[#E0DCD3] flex items-center justify-center text-[11px] font-mono">3</span>
                  <span>Feature Extraction: Spectral Indices & SAR Fusion</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  On top of 10 optical surface reflectance bands (B2, B3, B4, B5, B6, B7, B8, B8A, B11, B12), mathematical diagnostic indices (NDVI, MNDWI, NDBI, NBR) are computed and added. When enabled, dual-polarized Sentinel-1 C-band SAR backscatter features (VV, VH, and VV/VH cross-polarization ratio) are fused directly into the feature stack.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E0DCD3] mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#306840]/30 text-[#E0DCD3] flex items-center justify-center text-[11px] font-mono">4</span>
                  <span>Supervised Machine Learning Training & Inference</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Ground truth pixels are sampled stratified across 9 Land Use / Land Cover classes using Dynamic World modal predictions. A Random Forest ensemble of decision trees is trained on the fly on Earth Engine, classifying every pixel within the AOI at 10-meter spatial resolution.
                </p>
              </div>
            </div>

            {/* Land Cover Classification Scheme Table */}
            <div className="mt-8">
              <h4 className="text-sm font-semibold text-white mb-3">Harmonized 9-Class LULC Taxonomy</h4>
              <div className="overflow-x-auto rounded-lg border border-[#2E3429]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#1A1D17] border-b border-[#2E3429] text-neutral-400 font-mono">
                      <th className="p-3">Class ID</th>
                      <th className="p-3">Class Name</th>
                      <th className="p-3">Palette Color</th>
                      <th className="p-3">Diagnostic Spectral & SAR Characteristics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2E3429] text-neutral-300">
                    <tr>
                      <td className="p-3 font-mono">0</td>
                      <td className="p-3 font-medium text-white">Water</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded bg-[#419BDF] border border-black/40 align-middle mr-2" />#419BDF</td>
                      <td className="p-3">High NIR absorption, high MNDWI (&gt;0.1), specular microwave reflection (very low VV/VH backscatter).</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">1</td>
                      <td className="p-3 font-medium text-white">Trees / Forest</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded bg-[#397D49] border border-black/40 align-middle mr-2" />#397D49</td>
                      <td className="p-3">High red edge and NIR reflectance (NDVI &gt;0.6), high cross-polarized VH microwave volume scattering.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">2</td>
                      <td className="p-3 font-medium text-white">Grass</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded bg-[#88B053] border border-black/40 align-middle mr-2" />#88B053</td>
                      <td className="p-3">Moderate NDVI (0.3 to 0.6), low surface roughness, lower VH return than mature forest canopy.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">3</td>
                      <td className="p-3 font-medium text-white">Flooded Vegetation</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded bg-[#7A87C6] border border-black/40 align-middle mr-2" />#7A87C6</td>
                      <td className="p-3">Mixed water/canopy response, double-bounce microwave scattering between water surface and emergent stalks.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">4</td>
                      <td className="p-3 font-medium text-white">Crops</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded bg-[#E49635] border border-black/40 align-middle mr-2" />#E49635</td>
                      <td className="p-3">Periodic phenological variations in NDVI, geometric field parcel structures, moderate SAR backscatter.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">5</td>
                      <td className="p-3 font-medium text-white">Shrub & Scrub</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded bg-[#DFC35A] border border-black/40 align-middle mr-2" />#DFC35A</td>
                      <td className="p-3">Low-stature woody vegetation, intermediate NIR reflectance between grass and closed canopy.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">6</td>
                      <td className="p-3 font-medium text-white">Built-Up / Urban</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded bg-[#C4281B] border border-black/40 align-middle mr-2" />#C4281B</td>
                      <td className="p-3">High NDBI (&gt;0.05), high SWIR reflectance, corner-reflector dihedral microwave bounce (intense VV return).</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">7</td>
                      <td className="p-3 font-medium text-white">Bare Ground</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded bg-[#A59B8F] border border-black/40 align-middle mr-2" />#A59B8F</td>
                      <td className="p-3">Flat spectral response across visible to NIR, low NDVI (&lt;0.1), surface roughness driven SAR response.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">8</td>
                      <td className="p-3 font-medium text-white">Snow & Ice</td>
                      <td className="p-3"><span className="inline-block w-3.5 h-3.5 rounded bg-[#B39FE1] border border-black/40 align-middle mr-2" />#B39FE1</td>
                      <td className="p-3">Extremely high visible reflectance, sharp absorption in SWIR bands B11 and B12.</td>
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
              <h3 className="text-xl font-bold text-white mb-2">Sentinel-1 C-Band Synthetic Aperture Radar (SAR)</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Optical sensors such as Sentinel-2 rely on solar illumination in the visible, near-infrared, and shortwave infrared spectrum (0.4 to 2.2 micrometers). Consequently, persistent cloud cover, haze, smog, and monsoons frequently obstruct optical observations. Sentinel-1 operates an active C-band radar at 5.405 GHz (wavelength of 5.55 cm), transmitting microwave pulses that penetrate atmospheric hydrometeors unimpeded.
              </p>
            </div>

            {/* Physics Concept Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <span>VV Co-Polarization (Vertical Transmit, Vertical Receive)</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  VV polarization measures microwave backscatter with minimal polarization rotation. It is sensitive to surface roughness, vertical structure (such as stalks and building facades), and soil moisture dielectric properties.
                </p>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429] font-mono text-xs text-[#E0DCD3]">
                  Value Range: -20.0 dB to 0.0 dB
                </div>
              </div>

              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span>VH Cross-Polarization (Vertical Transmit, Horizontal Receive)</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  VH backscatter arises when transmitted vertical waves experience multiple internal reflections inside a 3D volumetric medium, depolarizing into horizontal return waves. Dense vegetation canopies generate high VH returns.
                </p>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429] font-mono text-xs text-[#E0DCD3]">
                  Value Range: -25.0 dB to -5.0 dB
                </div>
              </div>

              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                  <span>VV / VH Cross-Polarization Ratio</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  In decibel scale, the cross ratio is computed as VV minus VH. This metric isolates volume scatterers from specular planar surfaces. Water bodies absorb or reflect away both polarizations, yielding very high ratio contrast.
                </p>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429] font-mono text-xs text-[#E0DCD3]">
                  Ratio Equation: VV_VH_ratio = VV - VH (dB)
                </div>
              </div>

              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                  <Activity className="w-3.5 h-3.5 text-[#306840]" />
                  <span>Optical-SAR Multi-Sensor Fusion Rationale</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  Combining optical spectral reflectance with SAR microwave backscatter eliminates spectral confusion between spectrally similar classes with different structural geometry, such as dark asphalt vs calm water, or bare soil vs dry crops.
                </p>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429] font-mono text-xs text-[#E0DCD3]">
                  Multi-Sensor Depth: 13 Total Input Features
                </div>
              </div>
            </div>

            {/* SAR False Color Composite Spec */}
            <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
              <h4 className="text-sm font-semibold text-white mb-2">False-Color SAR Backscatter RGB Representation</h4>
              <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                When rendering the Sentinel-1 SAR layer, GeoClass maps backscatter bands into an informative RGB composite:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429]">
                  <span className="font-semibold text-[#ef4444]">Red Channel:</span> VV Co-polarization (-20 to 0 dB). Highlights building corners and rough terrain.
                </div>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429]">
                  <span className="font-semibold text-[#22c55e]">Green Channel:</span> VH Cross-polarization (-25 to -5 dB). Highlights tree canopies and biomass.
                </div>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429]">
                  <span className="font-semibold text-[#3b82f6]">Blue Channel:</span> VV/VH Ratio (0 to 15 dB). Highlights specular water contrast and planar surfaces.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: SPECTRAL BAND MATH */}
        {activeTab === 'indices' && (
          <section className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Spectral Indices & Biophysical Band Math</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Sentinel-2 MultiSpectral Instrument (MSI) captures 13 spectral bands from 443 nm to 2190 nm. GeoClass utilizes 10 surface reflectance bands to compute publication-standard biophysical diagnostic indices.
              </p>
            </div>

            <div className="space-y-4">
              {/* NDVI */}
              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trees className="w-4 h-4 text-[#397D49]" />
                    <span className="text-sm font-semibold text-white">NDVI: Normalized Difference Vegetation Index</span>
                  </div>
                  <span className="text-xs font-mono text-[#E0DCD3]">Rouse et al., 1974</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  Exploits strong chlorophyll absorption in red wavelengths (Band 4, 665 nm) and vigorous mesophyll scattering in the near-infrared spectrum (Band 8, 842 nm). Evaluates photosynthetic capacity, biomass density, and canopy vigor.
                </p>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429] font-mono text-xs text-[#E0DCD3]">
                  Formula: NDVI = (B8 - B4) / (B8 + B4)
                </div>
              </div>

              {/* MNDWI */}
              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-[#419BDF]" />
                    <span className="text-sm font-semibold text-white">MNDWI: Modified Normalized Difference Water Index</span>
                  </div>
                  <span className="text-xs font-mono text-[#E0DCD3]">Xu, 2006</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  Replaces near-infrared with shortwave infrared (Band 11, 1610 nm) to significantly suppress noise from built-up urban features and dry soils while maximizing open water body delineations.
                </p>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429] font-mono text-xs text-[#E0DCD3]">
                  Formula: MNDWI = (B3 - B11) / (B3 + B11)
                </div>
              </div>

              {/* NDBI */}
              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#C4281B]" />
                    <span className="text-sm font-semibold text-white">NDBI: Normalized Difference Built-Up Index</span>
                  </div>
                  <span className="text-xs font-mono text-[#E0DCD3]">Zha et al., 2003</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  Capitalizes on higher SWIR reflectance compared to NIR for impervious man-made materials, concrete, asphalt, and quarry rocks, delineating urban boundaries and built infrastructure footprints.
                </p>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429] font-mono text-xs text-[#E0DCD3]">
                  Formula: NDBI = (B11 - B8) / (B11 + B8)
                </div>
              </div>

              {/* NBR */}
              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#E49635]" />
                    <span className="text-sm font-semibold text-white">NBR: Normalized Burn Ratio</span>
                  </div>
                  <span className="text-xs font-mono text-[#E0DCD3]">Key & Benson, 2006</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  Combines near-infrared (Band 8) with deep shortwave infrared (Band 12, 2190 nm) to highlight wildfire burn scars, charcoal deposition, soil exposure, and post-fire canopy mortality.
                </p>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429] font-mono text-xs text-[#E0DCD3]">
                  Formula: NBR = (B8 - B12) / (B8 + B12)
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: TEMPORAL TREND BREAKS & LANDTRENDR */}
        {activeTab === 'change' && (
          <section className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Multi-Temporal Trajectory Segmentation & Trend Breaks</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Single-date or bitemporal satellite comparisons often confuse seasonal phenological shifts or brief agricultural harvests with permanent land degradation. GeoClass implements continuous annual trajectory segmentation based on the LandTrendr framework (Kennedy et al., 2010), tracking vegetation and built-up trends across annual Sentinel-2 median composites from 2018 to 2025.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                  <Trees className="w-4 h-4 text-emerald-400" />
                  <span>Canopy Disturbance & Deforestation (NBR)</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  Normalized Burn Ratio (NBR) is highly sensitive to canopy moisture and structural density. A sharp drop in annual median NBR represents acute disturbance: timber clear-cutting, wildfire mortality, or infrastructure clearing.
                </p>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429] font-mono text-xs text-[#E0DCD3]">
                  Onset: Year of Maximum Negative Deviation (Delta &gt; 0.15)
                </div>
              </div>

              <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                  <Building className="w-4 h-4 text-[#ef4444]" />
                  <span>Urban Sprawl & Impervious Expansion (NDBI)</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  Normalized Difference Built-Up Index (NDBI) tracks replacement of natural vegetation with asphalt, concrete, and industrial roofscapes. A sustained positive jump indicates permanent urban expansion.
                </p>
                <div className="p-3 rounded bg-[#121410] border border-[#2E3429] font-mono text-xs text-[#E0DCD3]">
                  Onset: Year of Persistent Positive Built-Up Jump (Delta &gt; 0.12)
                </div>
              </div>
            </div>

            {/* LandTrendr Algorithm Steps */}
            <div className="p-5 rounded-lg bg-[#1A1D17] border border-[#2E3429] space-y-3">
              <h4 className="text-sm font-semibold text-white">LandTrendr Server-Side Earth Engine Process</h4>
              <ol className="list-decimal list-inside text-xs text-neutral-300 space-y-2 leading-relaxed">
                <li><strong className="text-white">Annual Cloud-Free Compositing:</strong> For every year $t$, Sentinel-2 granules are filtered during the optimal vegetative season and masked for clouds/shadows via SCL and QA60.</li>
                <li><strong className="text-white">Baseline Anchoring:</strong> The initial year defines the undisturbed pre-event spectral baseline.</li>
                <li><strong className="text-white">Trajectory Delta & Break Detection:</strong> Pixel-wise differences are computed across consecutive years. Pixels exceeding the user sensitivity threshold are tagged as disturbed.</li>
                <li><strong className="text-white">Onset Year Assignment:</strong> The exact calendar year exhibiting the steepest trajectory break is recorded into the Onset Year raster band.</li>
                <li><strong className="text-white">Post-Disturbance Regrowth Modeling:</strong> Consecutive years following the onset year are analyzed to identify vegetative recovery slopes vs permanent non-forest conversion.</li>
              </ol>
            </div>
          </section>
        )}

        {/* TAB 5: DEVELOPER REST API */}
        {activeTab === 'api' && (
          <section className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Developer REST API v1 & Python SDK</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                GeoClass provides programmatically accessible REST endpoints allowing researchers, data scientists, and autonomous pipelines to trigger land cover classification, extract SAR radar composites, and query spectral time-series.
              </p>
            </div>

            {/* Endpoints Table */}
            <div className="overflow-x-auto rounded-lg border border-[#2E3429]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1A1D17] border-b border-[#2E3429] text-neutral-400 font-mono">
                    <th className="p-3">HTTP Method</th>
                    <th className="p-3">Endpoint</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Key Parameters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2E3429] text-neutral-300">
                  <tr>
                    <td className="p-3 font-mono font-semibold text-emerald-400">GET</td>
                    <td className="p-3 font-mono text-white">/api/v1/health</td>
                    <td className="p-3">Checks Earth Engine cluster connection and system health.</td>
                    <td className="p-3 text-neutral-400">None</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-sky-400">POST</td>
                    <td className="p-3 font-mono text-white">/api/v1/classify</td>
                    <td className="p-3">Runs Random Forest or Deep Learning classification on GeoJSON AOI.</td>
                    <td className="p-3 font-mono text-[11px]">coords, start_date, end_date, use_sar_fusion</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-sky-400">POST</td>
                    <td className="p-3 font-mono text-white">/api/v1/sar-composite</td>
                    <td className="p-3">Generates cloud-penetrating Sentinel-1 SAR dual-polarization composite.</td>
                    <td className="p-3 font-mono text-[11px]">coords, start_date, end_date</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-sky-400">POST</td>
                    <td className="p-3 font-mono text-white">/api/v1/spectral</td>
                    <td className="p-3">Computes zonal multi-index spectral analysis (NDBI, MNDWI, NBR).</td>
                    <td className="p-3 font-mono text-[11px]">coords, start_date, end_date</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-sky-400">POST</td>
                    <td className="p-3 font-mono text-white">/api/v1/timeseries</td>
                    <td className="p-3">Extracts multi-year pixel trajectory history with anomaly detection.</td>
                    <td className="p-3 font-mono text-[11px]">lat, lng, start_year, end_year</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-sky-400">POST</td>
                    <td className="p-3 font-mono text-white">/api/v1/change-detection</td>
                    <td className="p-3">Runs multi-temporal LandTrendr disturbance onset and trajectory segmentation.</td>
                    <td className="p-3 font-mono text-[11px]">coords, start_year, end_year, index_name, sensitivity</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Code Snippet: Python */}
            <div className="rounded-lg bg-[#1A1D17] border border-[#2E3429] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#161912] border-b border-[#2E3429]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#306840]" />
                  <span className="text-xs font-semibold text-white font-mono">Python 3 SDK Example</span>
                </div>
                <button
                  onClick={() => copyToClipboard(pythonSnippet, 'python')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#22261E] border border-[#2E3429] text-neutral-300 hover:text-white text-xs transition cursor-pointer"
                >
                  {copiedSnippet === 'python' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet === 'python' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-neutral-200 overflow-x-auto leading-relaxed">
                <code>{pythonSnippet}</code>
              </pre>
            </div>

            {/* Code Snippet: cURL */}
            <div className="rounded-lg bg-[#1A1D17] border border-[#2E3429] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#161912] border-b border-[#2E3429]">
                <div className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-[#306840]" />
                  <span className="text-xs font-semibold text-white font-mono">cURL Command Line Example</span>
                </div>
                <button
                  onClick={() => copyToClipboard(curlSnippet, 'curl')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#22261E] border border-[#2E3429] text-neutral-300 hover:text-white text-xs transition cursor-pointer"
                >
                  {copiedSnippet === 'curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet === 'curl' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-neutral-200 overflow-x-auto leading-relaxed">
                <code>{curlSnippet}</code>
              </pre>
            </div>
          </section>
        )}

        {/* TAB 5: CITATIONS */}
        {activeTab === 'citations' && (
          <section className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Academic & Literature Citations</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
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
                <div key={idx} className="p-4 rounded-lg bg-[#1A1D17] border border-[#2E3429] text-xs">
                  <div className="font-semibold text-white">
                    {citation.author} ({citation.year})
                  </div>
                  <div className="text-neutral-300 mt-1 italic">
                    "{citation.title}"
                  </div>
                  <div className="text-neutral-400 mt-1">
                    {citation.journal}
                  </div>
                  {citation.doi && (
                    <a
                      href={citation.doi}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#4B6445] hover:text-[#E0DCD3] transition mt-2 font-mono"
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

      {/* Footer */}
      <footer className="border-t border-[#2E3429] bg-[#121410] px-4 lg:px-8 py-8 text-center text-xs text-neutral-400">
        <p>GeoClass &middot; Earth Observation & Remote Sensing Analytics Engine</p>
        <p className="mt-1 text-[11px] text-neutral-500">
          Powered by Google Earth Engine, Copernicus Sentinel-1/Sentinel-2, Dynamic World, and FastAPI.
        </p>
      </footer>
    </div>
  );
}
