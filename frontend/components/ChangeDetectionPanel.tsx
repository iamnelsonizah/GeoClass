'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';
import { 
  History, 
  TrendingDown, 
  Layers, 
  X, 
  Loader2, 
  ShieldAlert, 
  Play, 
  CheckCircle,
  Trees,
  Building,
  Activity,
  Flame
} from 'lucide-react';
import { DraggableContainer } from './DraggableContainer';

export interface ChangeDetectionData {
  status: string;
  index_used: string;
  timeframe: {
    start_year: number;
    end_year: number;
    years_evaluated: number[];
  };
  sensitivity: string;
  magnitude_threshold: number;
  total_aoi_ha: number;
  total_disturbed_ha: number;
  disturbed_percentage: number;
  recovered_ha: number;
  net_loss_ha: number;
  annual_breakdown: Record<string, {
    year: number;
    disturbed_ha: number;
    percentage_of_aoi: number;
  }>;
  tile_urls: {
    onset_year?: string;
    magnitude?: string;
  };
  color_ramp: Record<string, string>;
}

interface ChangeDetectionPanelProps {
  data: ChangeDetectionData | null;
  loading: boolean;
  onClose: () => void;
  onAnalyze: (indexName: string, sensitivity: string, startYear: number, endYear: number) => void;
  onSelectLayer?: (layerKey: 'change_year' | 'change_magnitude') => void;
  activeLayer?: string;
}

export function ChangeDetectionPanel({
  data,
  loading,
  onClose,
  onAnalyze,
  onSelectLayer,
  activeLayer,
}: ChangeDetectionPanelProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<'nbr' | 'ndvi' | 'ndbi'>('nbr');
  const [selectedSensitivity, setSelectedSensitivity] = React.useState<'low' | 'moderate' | 'high'>('moderate');
  const [startYear, setStartYear] = React.useState<number>(2020);
  const [endYear, setEndYear] = React.useState<number>(2024);

  // Format chart data from annual_breakdown
  const chartData = data
    ? Object.values(data.annual_breakdown).map((entry) => ({
        year: entry.year.toString(),
        disturbed_ha: entry.disturbed_ha,
        percentage: entry.percentage_of_aoi,
        color: data.color_ramp[entry.year.toString()] || '#E49635',
      }))
    : [];

  return (
    <DraggableContainer
      defaultPosition={{ x: 380, y: 70 }}
      className="w-[360px] sm:w-[440px] bg-[#161912] border border-[#2E3429] rounded-xl shadow-2xl overflow-hidden z-[45] font-sans text-[#E0DCD3]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A1D17] border-b border-[#2E3429] cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#306840]/20 border border-[#306840]/40 text-[#E0DCD3]">
            <History className="w-4 h-4 text-[#306840]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>Disturbance & Trend Breaks</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#22261E] text-[#4B6445] border border-[#2E3429]">
                LandTrendr
              </span>
            </h3>
            <p className="text-[10px] text-neutral-400">Multi-Temporal Trajectory Segmentation</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-[#22261E] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
        {/* Controls Bar */}
        <div className="space-y-2.5 p-3 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-neutral-400 mb-1 block">Diagnostic Index</label>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 rounded bg-[#22261E] border border-[#2E3429] text-white focus:outline-none focus:border-[#306840]"
              >
                <option value="nbr">NBR (Canopy Loss & Fire)</option>
                <option value="ndvi">NDVI (Vegetation Decline)</option>
                <option value="ndbi">NDBI (Urban Sprawl)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-neutral-400 mb-1 block">Sensitivity</label>
              <select
                value={selectedSensitivity}
                onChange={(e) => setSelectedSensitivity(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 rounded bg-[#22261E] border border-[#2E3429] text-white focus:outline-none focus:border-[#306840]"
              >
                <option value="low">Low (Significant Events)</option>
                <option value="moderate">Moderate (Balanced)</option>
                <option value="high">High (Subtle Breaks)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-neutral-400 mb-1 block">Baseline Year</label>
              <select
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 rounded bg-[#22261E] border border-[#2E3429] text-white focus:outline-none focus:border-[#306840]"
              >
                {[2018, 2019, 2020, 2021].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-neutral-400 mb-1 block">Monitoring End Year</label>
              <select
                value={endYear}
                onChange={(e) => setEndYear(parseInt(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 rounded bg-[#22261E] border border-[#2E3429] text-white focus:outline-none focus:border-[#306840]"
              >
                {[2022, 2023, 2024, 2025].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAnalyze(selectedIndex, selectedSensitivity, startYear, endYear)}
            disabled={loading}
            className="w-full mt-1 py-2 px-3 rounded-lg bg-[#306840] hover:bg-[#4B6445] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Segmenting Multi-Year Trajectories...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Disturbance Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Results Overview */}
        {data && (
          <>
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="text-[10px] text-neutral-400">Total Disturbed</div>
                <div className="text-sm font-semibold text-[#ef4444] mt-0.5">
                  {data.total_disturbed_ha} ha
                </div>
                <div className="text-[9px] text-neutral-500 font-mono mt-0.5">
                  {data.disturbed_percentage}% of AOI
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="text-[10px] text-neutral-400">Regrowth / Gain</div>
                <div className="text-sm font-semibold text-emerald-400 mt-0.5">
                  {data.recovered_ha} ha
                </div>
                <div className="text-[9px] text-neutral-500 font-mono mt-0.5">
                  Recovery post-loss
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                <div className="text-[10px] text-neutral-400">Net Canopy Loss</div>
                <div className="text-sm font-semibold text-amber-400 mt-0.5">
                  {data.net_loss_ha} ha
                </div>
                <div className="text-[9px] text-neutral-500 font-mono mt-0.5">
                  Net balance
                </div>
              </div>
            </div>

            {/* Annual Disturbance Bar Chart */}
            <div className="p-3 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-[#306840]" />
                  <span>Annual Disturbance Inception (Hectares)</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {data.timeframe.start_year}-{data.timeframe.end_year}
                </span>
              </div>

              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3429" vertical={false} />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fill: '#8B8C7F', fontSize: 10 }} 
                      axisLine={{ stroke: '#2E3429' }}
                      tickLine={{ stroke: '#2E3429' }}
                    />
                    <YAxis 
                      tick={{ fill: '#8B8C7F', fontSize: 9 }} 
                      axisLine={{ stroke: '#2E3429' }}
                      tickLine={{ stroke: '#2E3429' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="p-2 rounded bg-[#121410] border border-[#2E3429] text-xs shadow-lg font-mono">
                              <div className="text-white font-semibold">{item.year} Disturbance</div>
                              <div className="text-[#ef4444] mt-0.5">{item.disturbed_ha} hectares</div>
                              <div className="text-neutral-400 text-[10px]">{item.percentage}% of AOI</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="disturbed_ha" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LandTrendr Onset Year Color Ramp Legend */}
            <div className="p-3 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
              <div className="text-xs font-semibold text-white mb-2 flex items-center justify-between">
                <span>Disturbance Onset Year Legend</span>
                <span className="text-[10px] text-neutral-400 font-mono">Earliest Break Year</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {Object.entries(data.color_ramp).map(([year, hex]) => (
                  <div key={year} className="flex items-center gap-1.5 text-xs p-1 rounded bg-[#121410] border border-[#2E3429]">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                    <span className="text-white font-mono text-[11px]">{year}</span>
                    <span className="text-neutral-500 text-[10px] ml-auto font-mono">
                      {data.annual_breakdown[year]?.disturbed_ha || 0} ha
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Layer Switchers */}
            {onSelectLayer && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectLayer('change_year')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    activeLayer === 'change_year'
                      ? 'bg-[#306840] text-white border-[#4B6445] shadow-md'
                      : 'bg-[#1A1D17] text-[#E0DCD3] hover:text-white border-[#2E3429] hover:bg-[#22261E]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-[#E0DCD3]" />
                  <span>Onset Year Heatmap</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectLayer('change_magnitude')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    activeLayer === 'change_magnitude'
                      ? 'bg-[#306840] text-white border-[#4B6445] shadow-md'
                      : 'bg-[#1A1D17] text-[#E0DCD3] hover:text-white border-[#2E3429] hover:bg-[#22261E]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-[#E0DCD3]" />
                  <span>Disturbance Severity</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DraggableContainer>
  );
}
