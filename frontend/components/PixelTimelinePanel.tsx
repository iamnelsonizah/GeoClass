'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import {
  History,
  X,
  Download,
  Crosshair,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Calendar
} from 'lucide-react';
import { DraggableContainer } from './DraggableContainer';

export interface TimelineDataPoint {
  period: string;
  start_date: string;
  end_date: string;
  ndvi: number | null;
  mndwi: number | null;
  nbr: number | null;
  ndbi: number | null;
  has_data: boolean;
  interpolated?: boolean;
}

export interface DisturbanceEvent {
  period: string;
  date: string;
  type: string;
  severity: 'High' | 'Moderate' | 'Positive';
  badge_color: string;
  delta: number;
  primary_index: string;
  description: string;
}

export interface PixelTimelineData {
  coordinates: {
    lat: number;
    lng: number;
  };
  timeframe: {
    start_year: number;
    end_year: number;
    interval: string;
    total_intervals: number;
  };
  points: TimelineDataPoint[];
  disturbances: DisturbanceEvent[];
  trajectory: {
    trend: string;
    badge: string;
    badge_color: string;
    slope: number;
    net_change_ndvi: number;
    baseline_ndvi: number;
    latest_ndvi: number;
    disturbance_count: number;
  };
  summary: string;
}

interface PixelTimelinePanelProps {
  data: PixelTimelineData | null;
  loading?: boolean;
  onClose: () => void;
}

export function PixelTimelinePanel({
  data,
  loading = false,
  onClose,
}: PixelTimelinePanelProps) {
  const [visibleIndices, setVisibleIndices] = useState({
    ndvi: true,
    mndwi: true,
    nbr: true,
    ndbi: false,
  });

  if (!data && !loading) return null;

  const toggleIndex = (key: keyof typeof visibleIndices) => {
    setVisibleIndices((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExportCSV = () => {
    if (!data) return;
    const headers = 'Period,Start_Date,End_Date,NDVI,MNDWI,NBR,NDBI,Interpolated\n';
    const rows = data.points
      .map(
        (p) =>
          `${p.period},${p.start_date},${p.end_date},${p.ndvi ?? ''},${p.mndwi ?? ''},${p.nbr ?? ''},${p.ndbi ?? ''},${p.interpolated ? 'true' : 'false'}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel-timeline-${data.coordinates.lat.toFixed(4)}_${data.coordinates.lng.toFixed(4)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Map of periods that have disturbances for reference line & tooltip lookup
  const disturbanceMap = React.useMemo(() => {
    const map = new Map<string, DisturbanceEvent>();
    if (data?.disturbances) {
      data.disturbances.forEach((d) => map.set(d.period, d));
    }
    return map;
  }, [data?.disturbances]);

  return (
    <DraggableContainer
      defaultPosition={{ x: 28, y: 72 }}
      className="w-[540px] max-w-[calc(100vw-32px)] bg-[#121410]/95 backdrop-blur-md border border-[#2E3429] shadow-2xl rounded-lg overflow-hidden text-[#F9FAFB] z-[1200] select-none"
    >
      {/* Header / Drag handle */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#1A1D17] border-b border-[#2E3429] cursor-move">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#22261E] flex items-center justify-center border border-[#3D4537]">
            <History className="w-3.5 h-3.5 text-[#E0DCD3]" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wide flex items-center gap-2">
              <span>Pixel Historical Timeline</span>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#22261E] text-neutral-400 mono">
                5-Year S2 Series
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {data && (
            <button
              onClick={handleExportCSV}
              title="Export 5-Year Time Series as CSV"
              className="p-1 hover:bg-[#22261E] rounded text-neutral-400 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#22261E] rounded text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3.5 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-2.5">
            <div className="w-7 h-7 border-2 border-[#306840] border-t-transparent rounded-full animate-spin" />
            <div className="text-xs font-medium text-[#F9FAFB]">Extracting 5-year multi-index satellite series...</div>
            <div className="text-[10px] text-neutral-400">Sampling cloud-masked Sentinel-2 surface reflectance</div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Top Coordinate & Trajectory Badge */}
            <div className="bg-[#1A1D17] border border-[#2E3429] p-2.5 rounded flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[9.5px] text-neutral-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-[#E0DCD3]" />
                  <span>Inspected Pixel</span>
                </div>
                <div className="text-xs mono font-bold text-[#F9FAFB]">
                  {data.coordinates.lat.toFixed(5)}° N, {data.coordinates.lng.toFixed(5)}° E
                </div>
              </div>

              <div className="text-right">
                <div className="text-[9.5px] text-neutral-400 uppercase tracking-wider font-semibold">
                  5-Year Trajectory
                </div>
                <div
                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded mt-0.5"
                  style={{
                    backgroundColor: `${data.trajectory.badge_color}22`,
                    color: data.trajectory.badge_color,
                    border: `1px solid ${data.trajectory.badge_color}55`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: data.trajectory.badge_color }}
                  />
                  <span>{data.trajectory.badge}</span>
                </div>
              </div>
            </div>

            {/* Quick KPI Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#1A1D17] border border-[#2E3429] p-2 rounded">
                <div className="text-[9px] text-neutral-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 text-[#E0DCD3]" />
                  <span>Net NDVI Δ</span>
                </div>
                <div
                  className="text-xs mono font-bold mt-0.5"
                  style={{
                    color:
                      data.trajectory.net_change_ndvi > 0.05
                        ? '#10B981'
                        : data.trajectory.net_change_ndvi < -0.05
                        ? '#F43F5E'
                        : '#E0DCD3',
                  }}
                >
                  {data.trajectory.net_change_ndvi > 0 ? '+' : ''}
                  {data.trajectory.net_change_ndvi.toFixed(2)}
                </div>
                <div className="text-[8.5px] text-neutral-400">
                  {data.trajectory.baseline_ndvi.toFixed(2)} → {data.trajectory.latest_ndvi.toFixed(2)}
                </div>
              </div>

              <div className="bg-[#1A1D17] border border-[#2E3429] p-2 rounded">
                <div className="text-[9px] text-neutral-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 text-[#F59E0B]" />
                  <span>Disturbances</span>
                </div>
                <div
                  className="text-xs mono font-bold mt-0.5"
                  style={{
                    color: data.trajectory.disturbance_count > 0 ? '#F43F5E' : '#10B981',
                  }}
                >
                  {data.trajectory.disturbance_count} event
                  {data.trajectory.disturbance_count === 1 ? '' : 's'}
                </div>
                <div className="text-[8.5px] text-neutral-400">Automated Anomaly Filter</div>
              </div>

              <div className="bg-[#1A1D17] border border-[#2E3429] p-2 rounded">
                <div className="text-[9px] text-neutral-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5 text-[#E0DCD3]" />
                  <span>Time Span</span>
                </div>
                <div className="text-xs mono font-bold text-[#F9FAFB] mt-0.5">
                  {data.timeframe.start_year} to {data.timeframe.end_year}
                </div>
                <div className="text-[8.5px] text-neutral-400">
                  {data.points.length} Seasonal Composites
                </div>
              </div>
            </div>

            {/* Time-Series Chart Box */}
            <div className="bg-[#1A1D17] border border-[#2E3429] p-2.5 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10.5px] font-semibold text-[#F9FAFB] flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[#E0DCD3]" />
                  <span>Multi-Spectral Index Time-Series</span>
                </div>

                {/* Index Toggle Pills */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleIndex('ndvi')}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all ${
                      visibleIndices.ndvi
                        ? 'bg-[#2ecc71]/20 text-[#2ecc71] border border-[#2ecc71]/50'
                        : 'bg-[#2A2C24] text-[#6E7065] border border-transparent'
                    }`}
                  >
                    NDVI
                  </button>
                  <button
                    onClick={() => toggleIndex('mndwi')}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all ${
                      visibleIndices.mndwi
                        ? 'bg-[#2980b9]/20 text-[#2980b9] border border-[#2980b9]/50'
                        : 'bg-[#2A2C24] text-[#6E7065] border border-transparent'
                    }`}
                  >
                    MNDWI
                  </button>
                  <button
                    onClick={() => toggleIndex('nbr')}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all ${
                      visibleIndices.nbr
                        ? 'bg-[#e67e22]/20 text-[#e67e22] border border-[#e67e22]/50'
                        : 'bg-[#2A2C24] text-[#6E7065] border border-transparent'
                    }`}
                  >
                    NBR
                  </button>
                  <button
                    onClick={() => toggleIndex('ndbi')}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all ${
                      visibleIndices.ndbi
                        ? 'bg-[#e74c3c]/20 text-[#e74c3c] border border-[#e74c3c]/50'
                        : 'bg-[#2A2C24] text-[#6E7065] border border-transparent'
                    }`}
                  >
                    NDBI
                  </button>
                </div>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data.points}
                    margin={{ top: 8, right: 12, left: -22, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3429" vertical={false} />
                    <XAxis
                      dataKey="period"
                      stroke="#3D4537"
                      fontSize={9}
                      tickLine={false}
                      tick={{ fill: '#9CA3AF' }}
                      interval={Math.ceil(data.points.length / 8)}
                    />
                    <YAxis
                      stroke="#3D4537"
                      fontSize={9}
                      tickLine={false}
                      tick={{ fill: '#9CA3AF' }}
                      domain={[-0.8, 1.0]}
                      ticks={[-0.6, -0.2, 0.2, 0.6, 1.0]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const pt = payload[0]?.payload as TimelineDataPoint;
                        const dist = disturbanceMap.get(pt.period);

                        return (
                          <div className="bg-[#121410] border border-[#2E3429] p-2.5 rounded shadow-xl text-xs space-y-1.5 max-w-[240px]">
                            <div className="flex items-center justify-between border-b border-[#2E3429] pb-1">
                              <span className="font-bold text-[#F9FAFB] mono">{pt.period}</span>
                              <span className="text-[9px] text-neutral-400">{pt.start_date}</span>
                            </div>

                            <div className="space-y-1">
                              {visibleIndices.ndvi && (
                                <div className="flex justify-between items-center text-[10.5px]">
                                  <span className="text-[#10B981] font-medium">NDVI:</span>
                                  <span className="mono font-bold text-[#F8FAFC]">
                                    {pt.ndvi !== null ? pt.ndvi.toFixed(3) : 'N/A'}
                                  </span>
                                </div>
                              )}
                              {visibleIndices.mndwi && (
                                <div className="flex justify-between items-center text-[10.5px]">
                                  <span className="text-[#06B6D4] font-medium">MNDWI:</span>
                                  <span className="mono font-bold text-[#F8FAFC]">
                                    {pt.mndwi !== null ? pt.mndwi.toFixed(3) : 'N/A'}
                                  </span>
                                </div>
                              )}
                              {visibleIndices.nbr && (
                                <div className="flex justify-between items-center text-[10.5px]">
                                  <span className="text-[#F59E0B] font-medium">NBR:</span>
                                  <span className="mono font-bold text-[#F8FAFC]">
                                    {pt.nbr !== null ? pt.nbr.toFixed(3) : 'N/A'}
                                  </span>
                                </div>
                              )}
                              {visibleIndices.ndbi && (
                                <div className="flex justify-between items-center text-[10.5px]">
                                  <span className="text-[#F43F5E] font-medium">NDBI:</span>
                                  <span className="mono font-bold text-[#F8FAFC]">
                                    {pt.ndbi !== null ? pt.ndbi.toFixed(3) : 'N/A'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {dist && (
                              <div
                                className="text-[9.5px] p-1.5 rounded mt-1.5 border"
                                style={{
                                  backgroundColor: `${dist.badge_color}22`,
                                  borderColor: `${dist.badge_color}66`,
                                  color: dist.badge_color,
                                }}
                              >
                                <div className="font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{dist.type}</span>
                                </div>
                                <div className="text-[8.5px] text-[#F8FAFC] mt-0.5">
                                  Δ: {dist.delta > 0 ? '+' : ''}{dist.delta.toFixed(2)} ({dist.severity} Impact)
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />

                    {/* Reference lines for detected disturbances */}
                    {data.disturbances.map((dist, idx) => (
                      <ReferenceLine
                        key={idx}
                        x={dist.period}
                        stroke={dist.badge_color}
                        strokeDasharray="3 3"
                        strokeWidth={1.5}
                      />
                    ))}

                    {visibleIndices.ndvi && (
                      <Line
                        type="monotone"
                        dataKey="ndvi"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: '#10B981' }}
                        activeDot={{ r: 5, fill: '#10B981' }}
                        name="NDVI"
                      />
                    )}
                    {visibleIndices.mndwi && (
                      <Line
                        type="monotone"
                        dataKey="mndwi"
                        stroke="#06B6D4"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#06B6D4' }}
                        activeDot={{ r: 4, fill: '#06B6D4' }}
                        name="MNDWI"
                      />
                    )}
                    {visibleIndices.nbr && (
                      <Line
                        type="monotone"
                        dataKey="nbr"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#F59E0B' }}
                        activeDot={{ r: 4, fill: '#F59E0B' }}
                        name="NBR"
                      />
                    )}
                    {visibleIndices.ndbi && (
                      <Line
                        type="monotone"
                        dataKey="ndbi"
                        stroke="#F43F5E"
                        strokeWidth={1.5}
                        dot={{ r: 2, fill: '#F43F5E', stroke: '#121410', strokeWidth: 1 }}
                        activeDot={{ r: 4.5, fill: '#F9FAFB', stroke: '#F43F5E', strokeWidth: 2 }}
                        name="NDBI (Built)"
                        connectNulls
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-[#2E3429] text-[9.5px]">
                <div className="flex items-center gap-3 text-neutral-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-0.5 bg-[#10B981] inline-block" /> NDVI
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-0.5 bg-[#0EA5E9] inline-block" /> NDWI
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-0.5 bg-[#EAB308] inline-block" /> NBR
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-0.5 bg-[#F43F5E] inline-block" /> NDBI
                  </span>
                </div>
                <div className="text-neutral-500 font-mono">Quarterly Composites</div>
              </div>
            </div>

            {/* Disturbance Events Feed */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider flex items-center justify-between">
                <span>Disturbance & Anomaly Log</span>
                <span>{data.disturbances.length} Detected</span>
              </div>

              {data.disturbances.length === 0 ? (
                <div className="bg-[#1A1D17]/60 border border-[#2E3429] p-2.5 rounded flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <div className="text-[10.5px] text-neutral-300 leading-relaxed">
                    No abrupt land cover disturbances detected over the 5-year observation span. Canopy and surface index variations remain within baseline seasonal equilibrium.
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {data.disturbances.map((event, idx) => (
                    <div
                      key={idx}
                      className="bg-[#1A1D17] border border-[#2E3429] p-2 rounded hover:border-[#3D4537] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded mono"
                            style={{
                              backgroundColor: `${event.badge_color}22`,
                              color: event.badge_color,
                              border: `1px solid ${event.badge_color}55`,
                            }}
                          >
                            {event.period}
                          </span>
                          <span className="text-xs font-semibold text-[#F9FAFB]">
                            {event.type}
                          </span>
                        </div>
                        <span
                          className="text-[9.5px] font-bold px-1.5 py-0.2 rounded"
                          style={{
                            color: event.badge_color,
                          }}
                        >
                          {event.severity} Impact
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-300 leading-relaxed">
                        {event.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trajectory Summary Note */}
            <div className="text-[10px] text-neutral-400 bg-[#1A1D17]/60 p-2 rounded border border-[#2E3429] leading-relaxed">
              {data.summary}
            </div>
          </>
        )}
      </div>
    </DraggableContainer>
  );
}
