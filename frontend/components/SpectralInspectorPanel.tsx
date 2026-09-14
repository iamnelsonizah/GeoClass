'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { Activity, X, Download, Crosshair, HelpCircle, Layers } from 'lucide-react';
import { DraggableContainer } from './DraggableContainer';

export interface SpectralBandPoint {
  band: string;
  name: string;
  center_nm: number;
  reflectance: number;
  color: string;
  desc: string;
}

export interface SpectralPixelData {
  coordinate: {
    lat: number;
    lng: number;
  };
  profile: {
    signature: string;
    type: string;
    badge_color: string;
    description: string;
  };
  curve: SpectralBandPoint[];
  indices: {
    ndvi: number;
    ndbi: number;
    mndwi: number;
    nbr: number;
    ndre: number;
    bsi: number;
  };
  bands: Record<string, number>;
}

interface SpectralInspectorPanelProps {
  data: SpectralPixelData | null;
  loading?: boolean;
  onClose: () => void;
}

export function SpectralInspectorPanel({
  data,
  loading = false,
  onClose,
}: SpectralInspectorPanelProps) {
  if (!data && !loading) return null;

  const handleExportCSV = () => {
    if (!data) return;
    const headers = 'Band,Name,Wavelength_nm,Reflectance,Description\n';
    const rows = data.curve
      .map((p) => `${p.band},${p.name},${p.center_nm},${p.reflectance},"${p.desc}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spectral-curve-${data.coordinate.lat.toFixed(4)}_${data.coordinate.lng.toFixed(4)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const indexCards = data
    ? [
        {
          key: 'NDVI',
          name: 'Normalized Difference Veg',
          val: data.indices.ndvi,
          color: data.indices.ndvi > 0.4 ? '#6F8060' : '#8A908A',
          note: 'Chlorophyll Vigor',
        },
        {
          key: 'NDBI',
          name: 'Built-Up Index',
          val: data.indices.ndbi,
          color: data.indices.ndbi > 0.0 ? '#C96B3C' : '#8A908A',
          note: 'Urban / Impervious',
        },
        {
          key: 'MNDWI',
          name: 'Mod Water Index',
          val: data.indices.mndwi,
          color: data.indices.mndwi > 0.0 ? '#416B73' : '#8A908A',
          note: 'Water Inundation',
        },
        {
          key: 'NBR',
          name: 'Burn Ratio',
          val: data.indices.nbr,
          color: data.indices.nbr < 0.0 ? '#A84E42' : '#6F8060',
          note: 'Burn / Clearing',
        },
        {
          key: 'NDRE',
          name: 'Red Edge NDVI',
          val: data.indices.ndre,
          color: data.indices.ndre > 0.2 ? '#6F8060' : '#8A908A',
          note: 'Canopy Density',
        },
        {
          key: 'BSI',
          name: 'Bare Soil Index',
          val: data.indices.bsi,
          color: data.indices.bsi > 0.0 ? '#AD5630' : '#8A908A',
          note: 'Exposed Soil/Rock',
        },
      ]
    : [];

  return (
    <DraggableContainer
      defaultPosition={{ x: 20, y: 80 }}
      className="w-[490px] max-w-[calc(100vw-32px)] bg-[#FAF9F5] border border-[#D8D5CA] shadow-xl rounded overflow-hidden text-[#202522] z-[1200] select-none"
    >
      {/* Header / Drag handle */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F4F1E8] border-b border-[#D8D5CA] cursor-move">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#FAF9F5] flex items-center justify-center border border-[#D8D5CA]">
            <Activity className="w-3.5 h-3.5 text-[#C96B3C]" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wide flex items-center gap-2 text-[#202522]">
              <span>Spectral Band Inspector</span>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#FAF9F5] text-[#69706A] border border-[#D8D5CA] font-mono">
                Sentinel-2 SR
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {data && (
            <button
              onClick={handleExportCSV}
              title="Export Spectral Curve as CSV"
              className="p-1 hover:bg-[#E9E6DC] rounded text-[#69706A] hover:text-[#202522] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#E9E6DC] rounded text-[#69706A] hover:text-[#202522] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3.5 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="w-6 h-6 border-2 border-[#C96B3C] border-t-transparent rounded-full animate-spin" />
            <div className="text-xs text-[#69706A]">Sampling 10-band spectral profile...</div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Coordinate & Signature Classification Bar */}
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2.5 rounded flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[9.5px] text-[#69706A] uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-[#C96B3C]" />
                  <span>Inspected Coordinate</span>
                </div>
                <div className="text-xs font-mono font-bold text-[#202522]">
                  {data.coordinate.lat.toFixed(5)}° N, {data.coordinate.lng.toFixed(5)}° E
                </div>
              </div>

              <div className="text-right">
                <div className="text-[9.5px] text-[#69706A] uppercase tracking-wider font-semibold">
                  Surface Archetype
                </div>
                <div
                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded mt-0.5"
                  style={{
                    backgroundColor: `${data.profile.badge_color}18`,
                    color: data.profile.badge_color,
                    border: `1px solid ${data.profile.badge_color}40`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: data.profile.badge_color }}
                  />
                  <span>{data.profile.signature}</span>
                </div>
              </div>
            </div>

            {/* Signature Description */}
            <div className="text-[10.5px] text-[#454B46] bg-[#F4F1E8]/70 px-2.5 py-1.5 rounded border border-[#D8D5CA] leading-relaxed">
              {data.profile.description}
            </div>

            {/* Spectral Reflectance Curve Chart */}
            <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-2.5 rounded">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10.5px] font-semibold text-[#202522] flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[#C96B3C]" />
                  <span>Spectral Reflectance Curve (B2 to B12)</span>
                </div>
                <div className="text-[9px] text-[#69706A] font-mono">λ: 490nm to 2190nm</div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.curve}
                    margin={{ top: 8, right: 12, left: -22, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9E6DC" />
                    <XAxis
                      dataKey="center_nm"
                      stroke="#BCB8AA"
                      tick={{ fontSize: 9, fill: '#69706A' }}
                      tickFormatter={(v) => `${v}nm`}
                    />
                    <YAxis
                      stroke="#BCB8AA"
                      domain={[0, (dataMax: number) => Math.max(0.4, Math.ceil(dataMax * 12) / 10)]}
                      tick={{ fontSize: 9, fill: '#69706A' }}
                      tickFormatter={(v) => v.toFixed(2)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const pt: SpectralBandPoint = payload[0].payload;
                          return (
                            <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-2 rounded shadow-md text-xs space-y-1 text-[#202522]">
                              <div className="font-bold flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: pt.color }}
                                />
                                <span className="text-[#202522]">
                                  {pt.band} ({pt.name}) • {pt.center_nm} nm
                                </span>
                              </div>
                              <div className="text-[#454B46] font-mono">
                                Reflectance: <span className="font-bold text-[#202522]">{(pt.reflectance * 100).toFixed(2)}%</span> ({pt.reflectance.toFixed(4)})
                              </div>
                              <div className="text-[10px] text-[#69706A] max-w-56">{pt.desc}</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={0.0} stroke="#D8D5CA" />
                    <Line
                      type="monotone"
                      dataKey="reflectance"
                      stroke="#416B73"
                      strokeWidth={2}
                      dot={{
                        r: 3.5,
                        fill: '#416B73',
                        stroke: '#FAF9F5',
                        strokeWidth: 1.5,
                      }}
                      activeDot={{
                        r: 5,
                        fill: '#C96B3C',
                        stroke: '#FAF9F5',
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 6 Diagnostic Indices Grid */}
            <div>
              <div className="text-[10px] font-semibold text-[#69706A] uppercase tracking-wider mb-1.5">
                On-The-Fly Diagnostic Multispectral Indices
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {indexCards.map((c) => (
                  <div
                    key={c.key}
                    className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded hover:border-[#BCB8AA] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#202522]">{c.key}</span>
                      <span className="text-[9px] text-[#69706A] font-mono">{c.note}</span>
                    </div>
                    <div
                      className="text-sm font-bold font-mono mt-0.5 tabular-nums"
                      style={{ color: c.color }}
                    >
                      {c.val > 0 ? `+${c.val.toFixed(4)}` : c.val.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Click instruction note */}
            <div className="text-[9.5px] text-[#8A908A] flex items-center justify-between pt-1">
              <span>Click anywhere on the map to inspect another pixel.</span>
              <span className="font-mono">Scale: 10m Ground Res</span>
            </div>
          </>
        )}
      </div>
    </DraggableContainer>
  );
}
