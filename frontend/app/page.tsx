'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import SatelliteBackdrop from '@/components/landing/SatelliteBackdrop';

/* ───────────────────────────── Content ───────────────────────────── */

const NAV = [
  { href: '#workspace', label: 'Workspace' },
  { href: '#layers', label: 'Layers' },
  { href: '#tools', label: 'Tools' },
  { href: '#exports', label: 'Exports' },
  { href: '/methods', label: 'Methods' },
];

const STEPS = [
  {
    n: '01',
    title: 'Draw your area',
    body: 'Sketch a boundary on the map, search a place, or drop in a shapefile, KML or GeoJSON.',
  },
  {
    n: '02',
    title: 'Pull clean imagery',
    body: 'Cloud-masked Sentinel-2, Landsat and Sentinel-1 radar composites for the dates you choose.',
  },
  {
    n: '03',
    title: 'Classify and export',
    body: 'Land cover, vegetation and change maps — out as GeoTIFF, GeoJSON or a PDF report.',
  },
];

const LAYERS = [
  { name: 'True colour', source: 'Sentinel-2 · 10 m', note: 'What the eye would see, minus the clouds.', img: '/layer-thumbnails/true_color.png' },
  { name: 'False colour', source: 'Sentinel-2 · NIR', note: 'Healthy vegetation glows red; bare ground stays grey.', img: '/layer-thumbnails/false_color.png' },
  { name: 'Land cover', source: 'Classifier output', note: 'Nine classes, from water and cropland to built-up.', img: '/layer-thumbnails/land_cover.png' },
  { name: 'Vegetation (NDVI)', source: 'Sentinel-2 · B8/B4', note: 'Canopy vigour, from stressed to dense growth.', img: '/layer-thumbnails/vegetation.png' },
  { name: 'Water (MNDWI)', source: 'Sentinel-2 · B3/B11', note: 'Open water and seasonal flooding.', img: '/layer-thumbnails/water.png' },
  { name: 'Built-up (NDBI)', source: 'Sentinel-2 · B11/B8', note: 'Roofs, roads and other impervious surfaces.', img: '/layer-thumbnails/built_up.png' },
  { name: 'Burn ratio (NBR)', source: 'Sentinel-2 · B8/B12', note: 'Fire scars and burn severity.', img: '/layer-thumbnails/burn_ratio.png' },
  { name: 'Radar backscatter', source: 'Sentinel-1 · VV/VH', note: 'Sees through cloud and smoke, day or night.', img: '/layer-thumbnails/sar_radar.png' },
  { name: 'Elevation', source: 'Copernicus DEM · 30 m', note: 'Height above sea level.', img: '/layer-thumbnails/digital_elevation.png' },
  { name: 'Slope', source: 'Derived from DEM', note: 'Gradient in degrees, for stability and runoff.', img: '/layer-thumbnails/slope_stability.png' },
  { name: 'Hillshade', source: 'Derived from DEM', note: 'Relief shading lit from the north-west.', img: '/layer-thumbnails/terrain_hillshade.png' },
  { name: 'Landsat true colour', source: 'Landsat 8/9 · 30 m', note: 'A longer archive for older baselines.', img: '/layer-thumbnails/landsat_rgb.png' },
];

const TOOLS = [
  {
    n: '01',
    title: 'Spectral inspector',
    body: 'Click any pixel to read its surface reflectance across ten Sentinel-2 bands, from coastal blue to shortwave infrared.',
    meta: 'B2 – B12',
  },
  {
    n: '02',
    title: 'Pixel timeline',
    body: 'Plot NDVI, water and burn indices for a single point across years, with breaks flagged where the ground actually changed.',
    meta: '2018 – present',
  },
  {
    n: '03',
    title: 'Change detection',
    body: 'Compare a baseline year with a target year and see which land cover moved where, in hectares.',
    meta: 'Baseline vs target',
  },
];

const EXPORTS = [
  { fmt: 'GeoTIFF', what: 'Classified rasters and index layers', ext: '.tif' },
  { fmt: 'GeoJSON', what: 'Your area and vectorised classes', ext: '.geojson' },
  { fmt: 'KMZ', what: 'Ground overlays for Google Earth', ext: '.kmz' },
  { fmt: 'PDF report', what: 'Maps, area tables and accuracy figures', ext: '.pdf' },
  { fmt: 'Notebook', what: 'Reproducible Earth Engine Python', ext: '.ipynb' },
];

/* ───────────────────────────── Page ───────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#1F231E] antialiased selection:bg-[#E8C9A8] selection:text-[#1F231E]">
      {/* ─────────── Hero ─────────── */}
      <section className="relative text-white min-h-[100svh] lg:min-h-[680px] lg:h-[100svh] lg:max-h-[1100px] flex flex-col overflow-hidden">
        {/* Niger–Benue confluence, Lokoja — Esri World Imagery */}
        <SatelliteBackdrop z={12} x0={2120} y0={1956} cols={10} rows={6} focusX={0.55} focusY={0.5} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(14,18,12,0.55) 0%, rgba(14,18,12,0.05) 28%, rgba(14,18,12,0.1) 55%, rgba(14,18,12,0.78) 100%), linear-gradient(90deg, rgba(14,18,12,0.55) 0%, rgba(14,18,12,0) 60%)',
          }}
        />

        {/* Nav */}
        <header className="relative z-10 px-5 sm:px-10 lg:px-14 pt-6 sm:pt-8 grid grid-cols-[1fr_auto] md:grid-cols-3 items-start gap-6">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <LogoMark />
            <span className="font-display text-[19px] font-medium tracking-[-0.02em]">GeoClass</span>
          </Link>

          <p className="hidden md:block justify-self-center text-center text-[13px] leading-snug text-white/75">
            Niger–Benue confluence, Lokoja
            <br />
            <span className="font-mono text-[11.5px] text-white/55">7.80° N · 6.74° E</span>
          </p>

          <div className="justify-self-end flex items-start gap-8">
            <nav className="hidden md:flex flex-col items-end gap-0.5 font-display text-[17px] leading-[1.35]" aria-label="Main">
              {NAV.map((item) =>
                item.href.startsWith('/') ? (
                  <Link key={item.href} href={item.href} className="text-white/85 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.href} href={item.href} className="text-white/85 hover:text-white transition-colors">
                    {item.label}
                  </a>
                ),
              )}
            </nav>
            <Link
              href="/app"
              className="md:hidden inline-flex items-center gap-1.5 rounded-full bg-white/12 border border-white/25 backdrop-blur-sm px-3.5 py-1.5 text-[13px] font-medium"
            >
              Open app <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Headline + steps */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-5 sm:px-10 lg:px-14 pt-20 lg:pt-0 pb-10 sm:pb-12">
          <div className="max-w-[1100px]">
            <h1 className="font-display font-medium tracking-[-0.045em] leading-[0.95] text-[clamp(44px,8.2vw,124px)]">
              Satellite <span className="text-[#E9C79F]">analysis,</span>
              <br />
              <span className="text-[#E9C79F]">without the GIS</span> overhead.
            </h1>
            <p className="mt-6 sm:mt-8 max-w-[440px] text-[17px] sm:text-[19px] leading-[1.45] text-white/85">
              Map land cover, vegetation and water for any place on Earth — right in your browser.
            </p>
          </div>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 xl:grid-cols-[auto_1fr] items-end gap-10">
            <div className="flex flex-wrap items-center gap-3 order-2 xl:order-1">
              <Link
                href="/app"
                className="group inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#E9C79F] hover:bg-[#F1D5B4] text-[#1F231E] px-5 py-3 text-[15px] font-medium transition-colors"
              >
                Open the workspace
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/app?example=lokoja"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/35 hover:border-white/70 hover:bg-white/5 px-5 py-3 text-[15px] text-white/90 transition-colors"
              >
                See it on Lokoja
              </Link>
            </div>

            <ol className="order-1 xl:order-2 xl:justify-self-end grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 lg:max-w-[880px]">
              {STEPS.map((s) => (
                <li key={s.n} className="max-w-[260px]">
                  <div className="font-display text-[28px] sm:text-[34px] font-normal tracking-[-0.03em] leading-none">{s.n}</div>
                  <h2 className="mt-3 sm:mt-4 font-display text-[19px] sm:text-[22px] font-normal tracking-[-0.02em] leading-[1.15]">
                    {s.title}
                  </h2>
                  <p className="mt-2 sm:mt-3 text-[13.5px] leading-[1.5] text-white/72">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <p className="absolute z-10 bottom-2 right-3 text-[10px] text-white/45">Imagery © Esri, Maxar, Earthstar Geographics</p>
      </section>

      <main>
        {/* ─────────── Workspace ─────────── */}
        <section id="workspace" className="px-5 sm:px-10 lg:px-14 pt-24 sm:pt-32 pb-20 bg-[#F4F1E8]">
          <div className="max-w-[1320px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
              <h2 className="lg:col-span-7 font-display text-[clamp(34px,4.6vw,64px)] font-medium tracking-[-0.04em] leading-[1.02]">
                One screen, built around the map.
              </h2>
              <p className="lg:col-span-5 text-[17px] leading-[1.6] text-[#5B6159] max-w-[480px]">
                The workflow sits on the left, layers and tools on the right, and the map takes everything in between.
                Results open underneath only when there is something to read.
              </p>
            </div>

            <figure className="mt-12 sm:mt-16">
              <div className="rounded-xl overflow-hidden border border-[#D8D5CA] bg-[#E9E6DC] shadow-[0_30px_60px_-30px_rgba(31,35,30,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/geoclass-workspace-real.jpg"
                  alt="The GeoClass workspace: workflow panel on the left, satellite map in the centre, layer list on the right"
                  className="block w-full h-auto"
                  loading="lazy"
                />
              </div>
              <figcaption className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-[14.5px] leading-[1.55] text-[#5B6159]">
                <div>
                  <span className="block text-[#1F231E] font-medium mb-1">Workflow</span>
                  Area, imagery, classifier and accuracy settings — in the order you use them.
                </div>
                <div>
                  <span className="block text-[#1F231E] font-medium mb-1">Map</span>
                  Draw, measure, annotate and swipe between years directly on the imagery.
                </div>
                <div>
                  <span className="block text-[#1F231E] font-medium mb-1">Layers &amp; tools</span>
                  Twelve layers to toggle and blend, plus pixel-level inspection.
                </div>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ─────────── Layers ─────────── */}
        <section id="layers" className="px-5 sm:px-10 lg:px-14 py-24 sm:py-32 bg-[#FAF9F5] border-t border-[#E3E0D5]">
          <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-12">
                <h2 className="font-display text-[clamp(34px,4.2vw,56px)] font-medium tracking-[-0.04em] leading-[1.02]">
                  Twelve ways to read the same ground.
                </h2>
                <p className="mt-6 text-[17px] leading-[1.6] text-[#5B6159] max-w-[400px]">
                  Every layer is computed on Google Earth Engine for your area and dates — nothing is pre-rendered or
                  cached from somewhere else.
                </p>
              </div>
            </div>

            <ul className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              {LAYERS.map((l) => (
                <li key={l.name} className="flex gap-4 py-5 border-t border-[#E3E0D5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.img} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" loading="lazy" />
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-medium text-[16px] tracking-[-0.01em]">{l.name}</h3>
                      <span className="font-mono text-[11px] text-[#8A908A] whitespace-nowrap">{l.source}</span>
                    </div>
                    <p className="mt-1 text-[14px] leading-[1.5] text-[#5B6159]">{l.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─────────── Tools ─────────── */}
        <section id="tools" className="px-5 sm:px-10 lg:px-14 py-24 sm:py-32 bg-[#1F241D] text-[#F1EEE4]">
          <div className="max-w-[1320px] mx-auto">
            <h2 className="font-display text-[clamp(34px,4.6vw,64px)] font-medium tracking-[-0.04em] leading-[1.02] max-w-[820px]">
              Look closer than a map lets you.
            </h2>
            <p className="mt-6 text-[17px] leading-[1.6] text-[#B9B6AA] max-w-[560px]">
              When a colour on the map raises a question, these answer it — straight from the underlying reflectance,
              backscatter and elevation values.
            </p>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
              {TOOLS.map((t) => (
                <article key={t.n} className="border-t border-white/15 pt-6">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-[30px] tracking-[-0.03em] text-[#E9C79F]">{t.n}</span>
                    <span className="font-mono text-[11px] text-[#8E8B80]">{t.meta}</span>
                  </div>
                  <h3 className="mt-5 font-display text-[24px] tracking-[-0.02em]">{t.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-[#B9B6AA]">{t.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────── Exports ─────────── */}
        <section id="exports" className="px-5 sm:px-10 lg:px-14 py-24 sm:py-32 bg-[#F4F1E8]">
          <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <h2 className="font-display text-[clamp(34px,4.2vw,56px)] font-medium tracking-[-0.04em] leading-[1.02]">
                Take it into QGIS, ArcGIS or a board meeting.
              </h2>
              <p className="mt-6 text-[17px] leading-[1.6] text-[#5B6159] max-w-[440px]">
                Results leave GeoClass in standard formats, in WGS 84, ready to drop into whatever comes next.
              </p>
            </div>

            <div className="lg:col-span-7">
              <table className="w-full text-left">
                <tbody>
                  {EXPORTS.map((e) => (
                    <tr key={e.fmt} className="border-t border-[#D8D5CA] last:border-b">
                      <td className="py-5 pr-4 font-display text-[20px] sm:text-[22px] tracking-[-0.02em] whitespace-nowrap align-top">
                        {e.fmt}
                      </td>
                      <td className="py-5 pr-4 text-[15px] text-[#5B6159] align-top pt-[23px]">{e.what}</td>
                      <td className="py-5 font-mono text-[12px] text-[#8A908A] text-right align-top pt-[25px] hidden sm:table-cell">
                        {e.ext}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─────────── Closing ─────────── */}
        <section className="relative overflow-hidden text-white min-h-[520px] flex items-end">
          {/* Kainji Lake, Niger State — Esri World Imagery */}
          <SatelliteBackdrop z={11} x0={1046} y0={963} cols={8} rows={5} focusX={0.5} focusY={0.45} lazy />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, rgba(14,18,12,0.82) 0%, rgba(14,18,12,0.35) 60%, rgba(14,18,12,0.15) 100%)' }}
          />
          <div className="relative z-10 w-full px-5 sm:px-10 lg:px-14 py-20 sm:py-24">
            <div className="max-w-[1320px] mx-auto flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
              <div>
                <h2 className="font-display text-[clamp(38px,5.4vw,80px)] font-medium tracking-[-0.045em] leading-[0.98]">
                  Pick a place.
                  <br />
                  <span className="text-[#E9C79F]">See what changed.</span>
                </h2>
                <p className="mt-6 text-[17px] leading-[1.55] text-white/80 max-w-[460px]">
                  No install and no sign-up to start. Draw an area and the imagery comes to you.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/app"
                  className="group inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#E9C79F] hover:bg-[#F1D5B4] text-[#1F231E] px-5 py-3 text-[15px] font-medium transition-colors"
                >
                  Open the workspace
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/methods"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 hover:border-white/60 px-5 py-3 text-[15px] text-white/90 transition-colors"
                >
                  Read the methods <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
          <p className="absolute z-10 bottom-2 right-3 text-[10px] text-white/45">
            Kainji Lake, Niger State · Imagery © Esri, Maxar, Earthstar Geographics
          </p>
        </section>
      </main>

      {/* ─────────── Footer ─────────── */}
      <footer className="px-5 sm:px-10 lg:px-14 py-12 bg-[#F4F1E8] border-t border-[#E3E0D5]">
        <div className="max-w-[1320px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <LogoMark dark />
            <span className="font-display text-[17px] font-medium tracking-[-0.02em]">GeoClass</span>
            <span className="text-[13px] text-[#8A908A] ml-3">© {new Date().getFullYear()}</span>
          </div>
          <nav className="flex flex-wrap gap-x-7 gap-y-2 text-[14px] text-[#5B6159]" aria-label="Footer">
            <Link href="/app" className="hover:text-[#1F231E]">Workspace</Link>
            <a href="#layers" className="hover:text-[#1F231E]">Layers</a>
            <a href="#exports" className="hover:text-[#1F231E]">Exports</a>
            <Link href="/methods" className="hover:text-[#1F231E]">Methods &amp; API</Link>
          </nav>
          <p className="text-[12.5px] text-[#8A908A] max-w-[360px] md:text-right">
            Data: ESA Copernicus Sentinel-1/2, USGS Landsat 8/9, Copernicus DEM, Google Dynamic World.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* A simple contour-ring mark: concentric survey rings with an offset pin. */
function LogoMark({ dark = false }: { dark?: boolean }) {
  const ink = dark ? '#1F231E' : '#FFFFFF';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.25" stroke={ink} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" stroke={ink} strokeWidth="1.5" strokeOpacity="0.7" />
      <circle cx="14.2" cy="10" r="2.4" fill="#C96B3C" />
    </svg>
  );
}
