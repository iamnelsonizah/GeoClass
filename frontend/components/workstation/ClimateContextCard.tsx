'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export interface ClimateContextData {
  mean_temperature_c: number;
  total_precipitation_mm: number;
  mean_soil_moisture: number;
  climate_classification: string;
  aridity_index: number;
  temperature_tile_url?: string;
  precipitation_tile_url?: string;
  soil_moisture_tile_url?: string;
  monthly_time_series: Array<{
    month: string;
    temp_c: number | null;
    precip_mm: number | null;
    soil_moisture: number | null;
  }>;
}

interface ClimateContextCardProps {
  data: ClimateContextData | null;
  loading: boolean;
  onAnalyzeClimate: () => void;
  activeClimateOverlay: 'temp' | 'precip' | 'soil' | null;
  onToggleClimateOverlay: (overlay: 'temp' | 'precip' | 'soil' | null) => void;
}

export default function ClimateContextCard({
  data,
  loading,
  onAnalyzeClimate,
  activeClimateOverlay,
  onToggleClimateOverlay,
}: ClimateContextCardProps) {
  if (!data) {
    return (
      <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-4 rounded space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
            <h4 className="text-xs font-bold text-[#1A1D23] uppercase tracking-wider">
              ECMWF ERA5-Land Climate Context
            </h4>
          </div>
          <button
            onClick={onAnalyzeClimate}
            disabled={loading}
            className="px-3 py-1 text-xs font-semibold rounded bg-[#3B82F6] text-white hover:bg-[#2563EB] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Querying ERA5...' : 'Analyze Climate Context'}
          </button>
        </div>
        <p className="text-[11.5px] text-[#69706A]">
          Extract monthly surface temperature, cumulative precipitation, and root-zone soil moisture reanalysis from the ECMWF ERA5-Land constellation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-4 rounded space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D5CA] pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
            <span className="text-xs font-bold text-[#1A1D23] uppercase tracking-wider">
              ECMWF ERA5-Land Reanalysis
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E4E9DF] text-[#6F8060] border border-[#6F8060]/40 font-mono">
              {data.climate_classification} (De Martonne {data.aridity_index})
            </span>
          </div>
          <p className="text-[11.5px] text-[#69706A] mt-0.5">
            Atmospheric & hydrologic reanalysis context over the observation timeframe.
          </p>
        </div>

        {/* Map Layer Overlay Selector */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-[#69706A] text-[10px] uppercase font-bold mr-1">Overlay:</span>
          <button
            onClick={() => onToggleClimateOverlay(activeClimateOverlay === 'temp' ? null : 'temp')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activeClimateOverlay === 'temp'
                ? 'bg-[#EF4444] text-white border-[#EF4444]'
                : 'bg-[#FAF9F5] text-[#69706A] border-[#D8D5CA] hover:bg-[#F4F1E8]'
            }`}
          >
            Temp Heatmap
          </button>
          <button
            onClick={() => onToggleClimateOverlay(activeClimateOverlay === 'precip' ? null : 'precip')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activeClimateOverlay === 'precip'
                ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                : 'bg-[#FAF9F5] text-[#69706A] border-[#D8D5CA] hover:bg-[#F4F1E8]'
            }`}
          >
            Rainfall
          </button>
          <button
            onClick={() => onToggleClimateOverlay(activeClimateOverlay === 'soil' ? null : 'soil')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activeClimateOverlay === 'soil'
                ? 'bg-[#10B981] text-white border-[#10B981]'
                : 'bg-[#FAF9F5] text-[#69706A] border-[#D8D5CA] hover:bg-[#F4F1E8]'
            }`}
          >
            Soil Moisture
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2.5 rounded">
          <div className="text-[10.5px] text-[#69706A] uppercase font-semibold">Mean Air Temp</div>
          <div className="text-base font-bold text-[#1A1D23] font-mono mt-1">
            {data.mean_temperature_c}°C
          </div>
          <div className="text-[10px] text-[#69706A]">2m Reanalysis</div>
        </div>

        <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2.5 rounded">
          <div className="text-[10.5px] text-[#69706A] uppercase font-semibold">Total Precipitation</div>
          <div className="text-base font-bold text-[#3B82F6] font-mono mt-1">
            {data.total_precipitation_mm.toLocaleString()} mm
          </div>
          <div className="text-[10px] text-[#69706A]">Cumulative Period Sum</div>
        </div>

        <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2.5 rounded">
          <div className="text-[10.5px] text-[#69706A] uppercase font-semibold">Soil Moisture</div>
          <div className="text-base font-bold text-[#10B981] font-mono mt-1">
            {data.mean_soil_moisture} m³/m³
          </div>
          <div className="text-[10px] text-[#69706A]">Layer 1 (0-7cm)</div>
        </div>

        <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2.5 rounded">
          <div className="text-[10.5px] text-[#69706A] uppercase font-semibold">Aridity Index</div>
          <div className="text-base font-bold text-[#D9622B] font-mono mt-1">
            {data.aridity_index}
          </div>
          <div className="text-[10px] text-[#69706A]">{data.climate_classification}</div>
        </div>
      </div>

      {/* Monthly Dual-Axis Time Series Chart */}
      {data.monthly_time_series && data.monthly_time_series.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-[#454B46] uppercase tracking-wider">
            Monthly Climate Climatograph (Temperature vs Precipitation)
          </div>
          <div className="h-48 border border-[#D8D5CA] rounded bg-[#FAF9F5] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data.monthly_time_series}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E9E6DC" />
                <XAxis dataKey="month" tick={{ fill: '#69706A', fontSize: 10 }} />
                {/* Left Axis: Precipitation (mm) */}
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#3B82F6', fontSize: 10 }}
                  unit="mm"
                />
                {/* Right Axis: Temperature (°C) */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#EF4444', fontSize: 10 }}
                  unit="°C"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FAF9F5',
                    border: '1px solid #D8D5CA',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: 'IBM Plex Sans, sans-serif' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="precip_mm"
                  name="Precipitation (mm)"
                  fill="#93C5FD"
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="temp_c"
                  name="Temperature (°C)"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#EF4444' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
