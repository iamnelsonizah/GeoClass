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
      defaultPosition={{ x: 14, y: 56 }}
      className="w-[360px] max-w-[calc(100vw-24px)] sm:w-[440px] bg-[#FAF9F5] border border-[#D8D5CA] rounded shadow-xl overflow-hidden z-[45] font-sans text-[#1A1D23]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#D8D5CA] cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#FAF9F5] border border-[#D8D5CA] text-[#D9622B]">
            <History className="w-4 h-4 text-[#D9622B]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#1A1D23] flex items-center gap-1.5">
              <span>Disturbance & Trend Breaks</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF9F5] text-[#D9622B] border border-[#D8D5CA]">
                LandTrendr
              </span>
            </h3>
            <p className="text-[10px] text-[#69706A]">Multi-Temporal Trajectory Segmentation</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-[#69706A] hover:text-[#1A1D23] hover:bg-[#E9E6DC] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(82vh-50px)] overflow-y-auto">
        {/* Controls Bar */}
        <div className="space-y-2.5 p-3 rounded bg-[#F4F1E8] border border-[#D8D5CA]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-[#69706A] mb-1 block">Diagnostic Index</label>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 rounded bg-[#FAF9F5] border border-[#D8D5CA] text-[#1A1D23] focus:outline-none focus:border-[#D9622B]"
              >
                <option value="nbr">NBR (Canopy Loss & Fire)</option>
                <option value="ndvi">NDVI (Vegetation Decline)</option>
                <option value="ndbi">NDBI (Urban Sprawl)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#69706A] mb-1 block">Sensitivity</label>
              <select
                value={selectedSensitivity}
                onChange={(e) => setSelectedSensitivity(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 rounded bg-[#FAF9F5] border border-[#D8D5CA] text-[#1A1D23] focus:outline-none focus:border-[#D9622B]"
              >
                <option value="low">Low (Significant Events)</option>
                <option value="moderate">Moderate (Balanced)</option>
                <option value="high">High (Subtle Breaks)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-[#69706A] mb-1 block">Baseline Year</label>
              <select
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 rounded bg-[#FAF9F5] border border-[#D8D5CA] text-[#1A1D23] focus:outline-none focus:border-[#D9622B]"
              >
                {[2018, 2019, 2020, 2021].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#69706A] mb-1 block">Monitoring End Year</label>
              <select
                value={endYear}
                onChange={(e) => setEndYear(parseInt(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 rounded bg-[#FAF9F5] border border-[#D8D5CA] text-[#1A1D23] focus:outline-none focus:border-[#D9622B]"
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
            className="w-full mt-1 py-2 px-3 rounded bg-[#D9622B] hover:bg-[#AD5630] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm"
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
              <div className="p-2.5 rounded bg-[#F4F1E8] border border-[#D8D5CA]">
                <div className="text-[10px] text-[#69706A]">Total Disturbed</div>
                <div className="text-sm font-semibold text-[#A84E42] mt-0.5 font-mono">
                  {data.total_disturbed_ha} ha
                </div>
                <div className="text-[9px] text-[#69706A] font-mono mt-0.5">
                  {data.disturbed_percentage}% of AOI
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#F4F1E8] border border-[#D8D5CA]">
                <div className="text-[10px] text-[#69706A]">Regrowth / Gain</div>
                <div className="text-sm font-semibold text-[#6F8060] mt-0.5 font-mono">
                  {data.recovered_ha} ha
                </div>
                <div className="text-[9px] text-[#69706A] font-mono mt-0.5">
                  Recovery post-loss
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#F4F1E8] border border-[#D8D5CA]">
                <div className="text-[10px] text-[#69706A]">Net Canopy Loss</div>
                <div className="text-sm font-semibold text-[#B68A3A] mt-0.5 font-mono">
                  {data.net_loss_ha} ha
                </div>
                <div className="text-[9px] text-[#69706A] font-mono mt-0.5">
                  Net balance
                </div>
              </div>
            </div>

            {/* Annual Disturbance Bar Chart */}
            <div className="p-3 rounded bg-[#FAF9F5] border border-[#D8D5CA]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-[#1A1D23] flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-[#D9622B]" />
                  <span>Annual Disturbance Inception (Hectares)</span>
                </div>
                <span className="text-[10px] text-[#69706A] font-mono">
                  {data.timeframe.start_year}-{data.timeframe.end_year}
                </span>
              </div>

              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9E6DC" vertical={false} />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fill: '#69706A', fontSize: 10 }} 
                      axisLine={{ stroke: '#BCB8AA' }}
                      tickLine={{ stroke: '#BCB8AA' }}
                    />
                    <YAxis 
                      tick={{ fill: '#69706A', fontSize: 9 }} 
                      axisLine={{ stroke: '#BCB8AA' }}
                      tickLine={{ stroke: '#BCB8AA' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="p-2 rounded bg-[#FAF9F5] border border-[#D8D5CA] text-xs shadow-md font-mono text-[#1A1D23]">
                              <div className="text-[#1A1D23] font-semibold">{item.year} Disturbance</div>
                              <div className="text-[#A84E42] mt-0.5">{item.disturbed_ha} hectares</div>
                              <div className="text-[#69706A] text-[10px]">{item.percentage}% of AOI</div>
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
            <div className="p-3 rounded bg-[#F4F1E8] border border-[#D8D5CA]">
              <div className="text-xs font-semibold text-[#1A1D23] mb-2 flex items-center justify-between">
                <span>Disturbance Onset Year Legend</span>
                <span className="text-[10px] text-[#69706A] font-mono">Earliest Break Year</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {Object.entries(data.color_ramp).map(([year, hex]) => (
                  <div key={year} className="flex items-center gap-1.5 text-xs p-1 rounded bg-[#FAF9F5] border border-[#D8D5CA]">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                    <span className="text-[#1A1D23] font-mono text-[11px]">{year}</span>
                    <span className="text-[#69706A] text-[10px] ml-auto font-mono">
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
                  className={`py-2 px-2.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    activeLayer === 'change_year'
                      ? 'bg-[#D9622B] text-white border-[#AD5630] shadow-sm'
                      : 'bg-[#F4F1E8] text-[#454B46] hover:text-[#1A1D23] border-[#D8D5CA] hover:bg-[#E9E6DC]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Onset Year Heatmap</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectLayer('change_magnitude')}
                  className={`py-2 px-2.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    activeLayer === 'change_magnitude'
                      ? 'bg-[#D9622B] text-white border-[#AD5630] shadow-sm'
                      : 'bg-[#F4F1E8] text-[#454B46] hover:text-[#1A1D23] border-[#D8D5CA] hover:bg-[#E9E6DC]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
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
