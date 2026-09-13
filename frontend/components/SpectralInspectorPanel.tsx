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
          color: data.indices.ndvi > 0.4 ? '#2ecc71' : '#8B8C7F',
          note: 'Chlorophyll Vigor',
        },
        {
          key: 'NDBI',
          name: 'Built-Up Index',
          val: data.indices.ndbi,
          color: data.indices.ndbi > 0.0 ? '#e67e22' : '#8B8C7F',
          note: 'Urban / Impervious',
        },
        {
          key: 'MNDWI',
          name: 'Mod Water Index',
          val: data.indices.mndwi,
          color: data.indices.mndwi > 0.0 ? '#2980b9' : '#8B8C7F',
          note: 'Water Inundation',
        },
        {
          key: 'NBR',
          name: 'Burn Ratio',
          val: data.indices.nbr,
          color: data.indices.nbr < 0.0 ? '#c0392b' : '#27ae60',
          note: 'Burn / Clearing',
        },
        {
          key: 'NDRE',
          name: 'Red Edge NDVI',
          val: data.indices.ndre,
          color: data.indices.ndre > 0.2 ? '#1abc9c' : '#8B8C7F',
          note: 'Canopy Density',
        },
        {
          key: 'BSI',
          name: 'Bare Soil Index',
          val: data.indices.bsi,
          color: data.indices.bsi > 0.0 ? '#d35400' : '#8B8C7F',
          note: 'Exposed Soil/Rock',
        },
      ]
    : [];

  return (
    <DraggableContainer
      defaultPosition={{ x: 20, y: 80 }}
      className="w-[490px] max-w-[calc(100vw-32px)] bg-[#121316]/95 backdrop-blur-md border border-[#272930] shadow-2xl rounded-lg overflow-hidden text-[#F9FAFB] z-[1200] select-none"
    >
      {/* Header / Drag handle */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#18191D] border-b border-[#272930] cursor-move">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#202227] flex items-center justify-center border border-[#383B44]">
            <Activity className="w-3.5 h-3.5 text-[#c0d45a]" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wide flex items-center gap-2">
              <span>Spectral Band Inspector</span>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#202227] text-neutral-400 mono">
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
              className="p-1 hover:bg-[#202227] rounded text-neutral-400 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#202227] rounded text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3.5 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="w-6 h-6 border-2 border-[#99aa38] border-t-transparent rounded-full animate-spin" />
            <div className="text-xs text-neutral-400">Sampling 10-band spectral profile...</div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Coordinate & Signature Classification Bar */}
            <div className="bg-[#18191D] border border-[#272930] p-2.5 rounded flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[9.5px] text-neutral-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-[#c0d45a]" />
                  <span>Inspected Coordinate</span>
                </div>
                <div className="text-xs mono font-bold text-[#F9FAFB]">
                  {data.coordinate.lat.toFixed(5)}° N, {data.coordinate.lng.toFixed(5)}° E
                </div>
              </div>

              <div className="text-right">
                <div className="text-[9.5px] text-[#94A3B8] uppercase tracking-wider font-semibold">
                  Surface Archetype
                </div>
                <div
                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded mt-0.5"
                  style={{
                    backgroundColor: `${data.profile.badge_color}22`,
                    color: data.profile.badge_color,
                    border: `1px solid ${data.profile.badge_color}55`,
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
            <div className="text-[10.5px] text-neutral-300 bg-[#18191D]/60 px-2.5 py-1.5 rounded border border-[#272930] leading-relaxed">
              {data.profile.description}
            </div>

            {/* Spectral Reflectance Curve Chart */}
            <div className="bg-[#18191D] border border-[#272930] p-2.5 rounded">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10.5px] font-semibold text-[#F9FAFB] flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[#c0d45a]" />
                  <span>Spectral Reflectance Curve (B2 to B12)</span>
                </div>
                <div className="text-[9px] text-neutral-400 mono">λ: 490nm to 2190nm</div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.curve}
                    margin={{ top: 8, right: 12, left: -22, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#272930" />
                    <XAxis
                      dataKey="center_nm"
                      stroke="#383B44"
                      tick={{ fontSize: 9, fill: '#9CA3AF' }}
                      tickFormatter={(v) => `${v}nm`}
                    />
                    <YAxis
                      stroke="#383B44"
                      domain={[0, (dataMax: number) => Math.max(0.4, Math.ceil(dataMax * 12) / 10)]}
                      tick={{ fontSize: 9, fill: '#9CA3AF' }}
                      tickFormatter={(v) => v.toFixed(2)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const pt: SpectralBandPoint = payload[0].payload;
                          return (
                            <div className="bg-[#121316] border border-[#272930] p-2 rounded shadow-lg text-xs space-y-1">
                              <div className="font-bold flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: pt.color }}
                                />
                                <span className="text-[#F9FAFB]">
                                  {pt.band} ({pt.name}) • {pt.center_nm} nm
                                </span>
                              </div>
                              <div className="text-[#F9FAFB] mono">
                                Reflectance: <span className="font-bold">{(pt.reflectance * 100).toFixed(2)}%</span> ({pt.reflectance.toFixed(4)})
                              </div>
                              <div className="text-[10px] text-neutral-400 max-w-56">{pt.desc}</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={0.0} stroke="#272930" />
                    <Line
                      type="monotone"
                      dataKey="reflectance"
                      stroke="#99aa38"
                      strokeWidth={2.5}
                      dot={{
                        r: 3.5,
                        fill: '#99aa38',
                        stroke: '#121316',
                        strokeWidth: 1.5,
                      }}
                      activeDot={{
                        r: 5.5,
                        fill: '#F9FAFB',
                        stroke: '#c0d45a',
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 6 Diagnostic Indices Grid */}
            <div>
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                On-The-Fly Diagnostic Multispectral Indices
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {indexCards.map((c) => (
                  <div
                    key={c.key}
                    className="bg-[#18191D] border border-[#272930] p-2 rounded hover:border-[#383B44] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#F9FAFB]">{c.key}</span>
                      <span className="text-[9px] text-neutral-400 mono">{c.note}</span>
                    </div>
                    <div
                      className="text-sm font-bold mono mt-0.5 tabular-nums"
                      style={{ color: c.color }}
                    >
                      {c.val > 0 ? `+${c.val.toFixed(4)}` : c.val.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Click instruction note */}
            <div className="text-[9.5px] text-[#64748B] flex items-center justify-between pt-1">
              <span>Click anywhere on the map to inspect another pixel.</span>
              <span className="mono">Scale: 10m Ground Res</span>
            </div>
          </>
        )}
      </div>
    </DraggableContainer>
  );
}
