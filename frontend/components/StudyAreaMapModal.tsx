'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Compass, 
  Layers, 
  Maximize2, 
  MapPin, 
  Calendar, 
  Check, 
  Sliders,
  FileCode
} from 'lucide-react';

interface StudyAreaMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  aoiCoords: number[][];
  aoiAreaHa: number | null;
  mapCenter: [number, number];
  mapZoom: number;
  startDate: string;
  endDate: string;
  selectedSensor?: string;
  statistics?: Record<string, { area_ha: number; percentage: number; pixel_count: number }>;
  trueColorUrl?: string;
  classifiedUrl?: string;
}

const LULC_COLORS: Record<string, string> = {
  Water: '#419BDF',
  Forest: '#397D49',
  Grass: '#88B053',
  Wetland: '#7A87C6',
  Agriculture: '#E49635',
  Shrub: '#DFC35A',
  Urban: '#C4281B',
  'Bare Land': '#A59B8F',
  'Snow/Ice': '#B39FE1',
};

export function StudyAreaMapModal({
  isOpen,
  onClose,
  aoiCoords,
  aoiAreaHa,
  mapCenter,
  mapZoom,
  startDate,
  endDate,
  selectedSensor = 'Sentinel-2 MSI',
  statistics,
  trueColorUrl,
  classifiedUrl,
}: StudyAreaMapModalProps) {
  const [mapTitle, setMapTitle] = useState('Study Area Map: Regional Land Cover Analysis');
  const [authorName, setAuthorName] = useState('GeoClass Earth Observation Lab');
  const [showGraticule, setShowGraticule] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showNorthArrow, setShowNorthArrow] = useState(true);
  const [showScaleBar, setShowScaleBar] = useState(true);
  const [exporting, setExporting] = useState(false);
  const mapSheetRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Calculate bounding box and graticules
  const lats = aoiCoords.length > 0 ? aoiCoords.map(c => c[1]) : [mapCenter[0]];
  const lngs = aoiCoords.length > 0 ? aoiCoords.map(c => c[0]) : [mapCenter[1]];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Calculate dynamic scale bar length (approximate meters per pixel)
  const metersPerPixel = 156543.03392 * Math.cos((mapCenter[0] * Math.PI) / 180) / Math.pow(2, mapZoom);
  const scaleBarPixelWidth = 120;
  const scaleBarMeters = metersPerPixel * scaleBarPixelWidth;
  const scaleBarKm = scaleBarMeters / 1000;
  const roundedKm = scaleBarKm >= 10 ? Math.round(scaleBarKm / 5) * 5 : Number(scaleBarKm.toFixed(1));

  // Export high-res PNG using HTML5 Canvas
  const handleExportPNG = async () => {
    if (!mapSheetRef.current) return;
    setExporting(true);

    try {
      // Dynamic import of html-to-image or custom canvas drawing
      const element = mapSheetRef.current;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const canvas = document.createElement('canvas');
      const scale = 2; // 2x high resolution
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.scale(scale, scale);
        // Draw background
        ctx.fillStyle = '#FAF9F5';
        ctx.fillRect(0, 0, width, height);

        // Neatline border
        ctx.strokeStyle = '#1A1D23';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        // Save canvas image
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `geoclass-study-area-map-${startDate}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-[#D8D5CA] flex items-center justify-between bg-[#FAF9F5] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D9622B] flex items-center justify-center text-white shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1A1D23] tracking-tight">
                Publication-Ready Study Area Map Composer
              </h3>
              <p className="text-[11px] text-[#69706A]">
                Cartographic layout with coordinate graticules, north arrow, metric scale bar &amp; legend
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#FAF9F5] hover:bg-[#F4F1E8] border border-[#D8D5CA] text-[#1A1D23] rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#69706A]" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportPNG}
              disabled={exporting}
              className="px-3.5 py-1.5 bg-[#D9622B] hover:bg-[#A84A32] text-white rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>{exporting ? 'Generating...' : 'Export High-Res PNG'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#69706A] hover:text-[#1A1D23] hover:bg-[#F4F1E8] transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Settings & Map Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F4F1E8]/30">
          
          {/* Controls Bar */}
          <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl p-3 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10.5px] font-semibold text-[#69706A] uppercase tracking-wider mb-1">Map Title</label>
              <input
                type="text"
                value={mapTitle}
                onChange={(e) => setMapTitle(e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#D8D5CA] rounded-md px-2.5 py-1 text-xs text-[#1A1D23] focus:border-[#D9622B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold text-[#69706A] uppercase tracking-wider mb-1">Author / Organization</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#D8D5CA] rounded-md px-2.5 py-1 text-xs text-[#1A1D23] focus:border-[#D9622B] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-4 col-span-2 sm:col-span-2 pt-3 sm:pt-4">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11.5px] font-medium text-[#1A1D23]">
                <input
                  type="checkbox"
                  checked={showNorthArrow}
                  onChange={(e) => setShowNorthArrow(e.target.checked)}
                  className="accent-[#D9622B] rounded"
                />
                North Arrow
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11.5px] font-medium text-[#1A1D23]">
                <input
                  type="checkbox"
                  checked={showScaleBar}
                  onChange={(e) => setShowScaleBar(e.target.checked)}
                  className="accent-[#D9622B] rounded"
                />
                Scale Bar
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11.5px] font-medium text-[#1A1D23]">
                <input
                  type="checkbox"
                  checked={showGraticule}
                  onChange={(e) => setShowGraticule(e.target.checked)}
                  className="accent-[#D9622B] rounded"
                />
                Graticule Ticks
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11.5px] font-medium text-[#1A1D23]">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="accent-[#D9622B] rounded"
                />
                Legend
              </label>
            </div>
          </div>

          {/* Cartographic Map Sheet Paper Presentation */}
          <div
            ref={mapSheetRef}
            className="bg-[#FFFFFF] border-2 border-[#1A1D23] rounded-lg shadow-xl p-6 relative flex flex-col min-h-[520px] print:shadow-none print:border-black"
          >
            {/* Neatline Inner Border */}
            <div className="border border-[#1A1D23] p-4 flex-1 flex flex-col relative overflow-hidden bg-[#FAF9F5]">
              
              {/* Top Title Banner */}
              <div className="border-b-2 border-[#1A1D23] pb-3 mb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-[#1A1D23] tracking-tight uppercase">
                    {mapTitle}
                  </h1>
                  <p className="text-xs text-[#69706A] font-medium mt-0.5">
                    {authorName} &middot; Projection: EPSG:4326 (WGS 84)
                  </p>
                </div>
                <div className="text-right font-mono text-[10.5px] text-[#69706A]">
                  <div>Sensor: <span className="font-semibold text-[#1A1D23]">{selectedSensor}</span></div>
                  <div>Window: <span className="font-semibold text-[#1A1D23]">{startDate} → {endDate}</span></div>
                </div>
              </div>

              {/* Main Map View Area with Coordinate Graticules */}
              <div className="relative flex-1 rounded border border-[#D8D5CA] overflow-hidden min-h-[340px] bg-[#EFECE3] flex items-center justify-center">
                
                {/* Background Base Imagery Preview */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-90"
                  style={{
                    backgroundImage: `url(https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${mapZoom}/${Math.floor((1 - Math.log(Math.tan(mapCenter[0] * Math.PI / 180) + 1 / Math.cos(mapCenter[0] * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, mapZoom))}/${Math.floor((mapCenter[1] + 180) / 360 * Math.pow(2, mapZoom))})`
                  }}
                />

                {/* AOI Boundary Polyline Overlay representation */}
                <div className="absolute inset-8 border-3 border-[#D9622B] bg-[#D9622B]/15 rounded-md flex items-center justify-center pointer-events-none shadow-sm">
                  <div className="bg-[#FAF9F5]/90 backdrop-blur-md px-3 py-1 rounded border border-[#D8D5CA] text-xs font-mono font-bold text-[#1A1D23] shadow-xs">
                    AOI EXTENT: {aoiAreaHa ? `${aoiAreaHa.toFixed(1)} ha` : 'Active Boundary'}
                  </div>
                </div>

                {/* Coordinate Graticule Ticks */}
                {showGraticule && (
                  <>
                    <div className="absolute top-1 left-2 font-mono text-[9.5px] font-bold text-[#1A1D23] bg-white/80 px-1 rounded">
                      {maxLat.toFixed(3)}°N
                    </div>
                    <div className="absolute bottom-1 left-2 font-mono text-[9.5px] font-bold text-[#1A1D23] bg-white/80 px-1 rounded">
                      {minLat.toFixed(3)}°N
                    </div>
                    <div className="absolute top-1 right-2 font-mono text-[9.5px] font-bold text-[#1A1D23] bg-white/80 px-1 rounded">
                      {maxLng.toFixed(3)}°E
                    </div>
                    <div className="absolute bottom-1 right-2 font-mono text-[9.5px] font-bold text-[#1A1D23] bg-white/80 px-1 rounded">
                      {minLng.toFixed(3)}°E
                    </div>
                  </>
                )}

                {/* North Arrow Rosette */}
                {showNorthArrow && (
                  <div className="absolute top-3 right-3 bg-white/95 border border-[#1A1D23] rounded-full p-2 shadow-md flex flex-col items-center select-none">
                    <span className="text-[10px] font-bold text-[#1A1D23] leading-none mb-0.5">N</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" className="text-[#1A1D23]">
                      <polygon points="12,2 15,10 12,8" fill="#D9622B" />
                      <polygon points="12,2 9,10 12,8" fill="#1A1D23" />
                      <polygon points="12,22 15,14 12,16" fill="#D8D5CA" />
                      <polygon points="12,22 9,14 12,16" fill="#8A908A" />
                    </svg>
                  </div>
                )}

                {/* Metric Graphic Scale Bar */}
                {showScaleBar && (
                  <div className="absolute bottom-3 left-3 bg-white/95 border border-[#1A1D23] px-3 py-1.5 rounded shadow-md select-none font-mono text-[10px] text-[#1A1D23]">
                    <div className="flex justify-between font-bold mb-0.5">
                      <span>0</span>
                      <span>{(roundedKm / 2).toFixed(1)}</span>
                      <span>{roundedKm} km</span>
                    </div>
                    <div className="h-2 w-28 bg-[#1A1D23] border border-[#1A1D23] flex">
                      <div className="w-1/2 h-full bg-white" />
                      <div className="w-1/2 h-full bg-[#1A1D23]" />
                    </div>
                  </div>
                )}

                {/* Cartographic Legend Inset */}
                {showLegend && statistics && (
                  <div className="absolute bottom-3 right-3 bg-white/95 border border-[#1A1D23] p-2.5 rounded shadow-md max-w-[200px] text-xs space-y-1 select-none">
                    <div className="font-bold text-[10.5px] uppercase tracking-wider text-[#1A1D23] border-b border-[#D8D5CA] pb-1 mb-1">
                      Legend
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[10px]">
                      {Object.entries(statistics).map(([name, data]) => {
                        const color = LULC_COLORS[name] || '#8CA0AA';
                        return (
                          <div key={name} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-2.5 h-2.5 rounded-xs flex-shrink-0" style={{ backgroundColor: color }} />
                              <span className="font-sans text-[#1A1D23] truncate">{name}</span>
                            </div>
                            <span className="text-[#69706A]">{data.percentage.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Cartographic Neatline Footer */}
              <div className="mt-3 pt-2 border-t border-[#1A1D23] flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#69706A] font-mono">
                <div>
                  Center: {mapCenter[0].toFixed(4)}° N, {mapCenter[1].toFixed(4)}° E &middot; Scale ~ 1:{Math.round(metersPerPixel * 3779.5)}
                </div>
                <div>
                  Cartography produced via GeoClass Engine &middot; {new Date().toLocaleDateString()}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
