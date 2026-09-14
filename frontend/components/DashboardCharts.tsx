'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
} from 'recharts';

/* ─── Interfaces ─────────────────────────────────────────────── */

interface ClassData {
  id: number;
  area_ha: number;
  pixel_count: number;
  percentage: number;
}

interface BuildingStats {
  building_count: number;
  total_footprint_ha: number;
  total_footprint_m2: number;
  mean_building_area_m2: number;
  coverage_percentage: number;
  regularization_applied: boolean;
}

interface AIQualityMetrics {
  overall_quality_score: number;
  rating: string;
  usable_pixels_percentage: number;
  haze_index: number;
  shadow_free_percentage: number;
  sensor_health: string;
}

interface TransitionFlow {
  from_class: string;
  to_class: string;
  area_ha: number;
  pct_of_source: number;
  trajectory: string;
}

interface TransitionData {
  total_area_ha: number;
  total_transitioned_ha: number;
  transition_rate_percentage: number;
  net_changes: {
    forest_ha: number;
    urban_ha: number;
    water_ha: number;
  };
  trajectories: Record<string, { label: string; area_ha: number; flows: string[] }>;
  matrix: TransitionFlow[];
}

interface SuperResData {
  status: string;
  aoi_area_ha: number;
  native_resolution_m: number;
  super_resolution_m: number;
  upscaling_factor: string;
  metrics: {
    sharpness_improvement_pct: number;
    contrast_enhancement_pct: number;
    estimated_psnr_db: number;
    structural_similarity_ssim: number;
    model_architecture: string;
  };
  optimized_for_small_aoi: boolean;
  warning?: string | null;
}

interface WaterDynamicsData {
  status: string;
  aoi_area_ha: number;
  mean_water_extent_ha: number;
  max_water_extent_ha: number;
  min_water_extent_ha: number;
  permanent_water_ha: number;
  seasonal_water_ha: number;
  seasonal_fluctuation_pct: number;
  monthly_series: Array<{
    month: string;
    season: string;
    water_area_ha: number;
    mndwi_mean: number;
  }>;
  flood_risk: {
    score: number;
    rating: string;
  };
  drought_vulnerability: {
    score: number;
    rating: string;
  };
}

interface CanopyHeightData {
  status: string;
  forest_area_ha: number;
  mean_canopy_height_m: number;
  median_canopy_height_m: number;
  max_canopy_height_m: number;
  old_growth_area_ha: number;
  young_canopy_area_ha: number;
  height_strata_distribution: Array<{
    stratum: string;
    min_m: number;
    max_m: number;
    percentage: number;
    area_ha: number;
  }>;
  biomass_and_carbon: {
    biomass_density_mg_ha: number;
    total_biomass_tonnes: number;
    carbon_stock_tonnes_co2e: number;
  };
  model_used: string;
}

export interface TerrainData {
  status: string;
  source: string;
  aoi_area_ha: number;
  elevation: {
    min_m: number;
    max_m: number;
    mean_m: number;
    relief_m: number;
  };
  slope: {
    mean_deg: number;
    max_deg: number;
    steep_slopes_pct: number;
    steep_slopes_ha: number;
  };
  slope_distribution: Array<{
    id: number;
    name: string;
    min: number;
    max: number;
    area_ha: number;
    percentage: number;
    color: string;
    hazard: string;
  }>;
  aspect_distribution: Array<{
    cardinal: string;
    degrees: string;
    area_ha: number;
    percentage: number;
  }>;
  hazard_cross_matrix: {
    vulnerability_score: number;
    vulnerability_rating: string;
    high_erosion_bare_ground_ha: number;
    urban_slope_risk_ha: number;
    flat_inundation_basin_ha: number;
    geotechnical_notes: string[];
  };
  tile_urls: {
    slope?: string | null;
    elevation?: string | null;
    hillshade?: string | null;
  };
}

export interface SpectralData {
  total_area_ha: number;
  ndbi: {
    mean: number;
    min: number;
    max: number;
    std_dev: number;
    built_area_ha: number;
    built_percentage: number;
    tile_url?: string | null;
  };
  mndwi: {
    mean: number;
    min: number;
    max: number;
    std_dev: number;
    water_area_ha: number;
    water_percentage: number;
    tile_url?: string | null;
  };
  nbr: {
    mean: number;
    min: number;
    max: number;
    std_dev: number;
    burn_severity_breakdown: Array<{
      tier: string;
      range: string;
      count: number;
      percentage: number;
      color: string;
      description: string;
    }>;
    tile_url?: string | null;
  };
}

interface DashboardChartsProps {
  statistics?: Record<string, ClassData>;
  totalArea?: number;
  buildingStats?: BuildingStats | null;
  aiQualityMetrics?: AIQualityMetrics | null;
  transitionData?: TransitionData | null;
  superResData?: SuperResData | null;
  waterDynamicsData?: WaterDynamicsData | null;
  canopyHeightData?: CanopyHeightData | null;
  terrainData?: TerrainData | null;
  spectralData?: SpectralData | null;
  loadingSuperRes?: boolean;
  loadingWaterDynamics?: boolean;
  loadingCanopyHeight?: boolean;
  loadingTerrain?: boolean;
  loadingSpectral?: boolean;
  onExtractBuildings?: () => void;
  extractingBuildings?: boolean;
  onTriggerSuperRes?: () => void;
  onTriggerWaterDynamics?: () => void;
  onTriggerCanopyHeight?: () => void;
  onTriggerTerrain?: () => void;
  onTriggerSpectral?: () => void;
  onSelectLayer?: (layer: string) => void;
}

/* ─── Colour Palette ─────────────────────────────────────────── */

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

/* ─── Animated Counter Hook ──────────────────────────────────── */

function useAnimatedNumber(target: number, duration = 1200, decimals = 0): string {
  const [display, setDisplay] = useState('0');
  const prevTarget = useRef(0);

  useEffect(() => {
    const from = prevTarget.current;
    const to = target;
    prevTarget.current = target;
    if (to === 0) {
      setDisplay(to.toFixed(decimals));
      return;
    }
    const start = performance.now();
    let raf: number;

    const step = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const current = from + (to - from) * eased;
      setDisplay(
        decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString(),
      );
      if (elapsed < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, decimals]);

  return display;
}

/* ─── Stat Card ──────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  suffix,
  icon,
  accentClass,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-3.5 rounded flex items-center gap-3.5 print:border-slate-300 print:bg-white transition-all duration-200 hover:border-[#BCB8AA] shadow-xs">
      <div className={`p-2.5 rounded border ${accentClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10.5px] text-[#69706A] uppercase tracking-wider font-semibold print:text-slate-600 truncate">
          {label}
        </p>
        <p className="text-lg font-bold text-[#1A1D23] mt-0.5 print:text-slate-900 font-mono tabular-nums">
          {value}
          {suffix && <span className="text-xs font-medium text-[#69706A] ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  );
}

/* ─── Custom Treemap Content ─────────────────────────────────── */

const TreemapContent = (props: any) => {
  const { x, y, width, height, name, color, value } = props;
  if (width < 30 || height < 24) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={3}
        ry={3}
        style={{
          fill: color,
          stroke: '#D8D5CA',
          strokeWidth: 1.5,
          opacity: 0.9,
        }}
      />
      {width > 50 && height > 36 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize: Math.min(12, width / 6),
              fill: '#FFFFFF',
              fontWeight: 600,
              fontFamily: 'IBM Plex Sans, sans-serif',
              textShadow: '0 1px 2px rgba(0,0,0,.6)',
            }}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize: Math.min(10, width / 8),
              fill: '#FFFFFF',
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono, monospace',
              textShadow: '0 1px 2px rgba(0,0,0,.6)',
            }}
          >
            {value}%
          </text>
        </>
      )}
    </g>
  );
};

/* ─── Custom Pie Label ───────────────────────────────────────── */

const renderPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  name,
  value,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (value < 3) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#454B46"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-[10px] font-mono print:fill-slate-700"
    >
      {name} {value}%
    </text>
  );
};

/* ─── Custom Tooltip ─────────────────────────────────────────── */

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-2.5 rounded shadow-xl text-[#1A1D23] font-sans print:hidden">
        <p className="text-xs font-semibold flex items-center gap-2 text-[#1A1D23]">
          <span
            className="w-2.5 h-2.5 rounded-xs"
            style={{ backgroundColor: data.color }}
          />
          {data.name}
        </p>
        <p className="text-[11px] mt-1 text-[#69706A]">
          Area:{' '}
          <span className="text-[#1A1D23] font-mono font-medium">
            {data.area?.toLocaleString() ?? '--'} ha
          </span>
        </p>
        <p className="text-[11px] text-[#69706A]">
          Share:{' '}
          <span className="text-[#1A1D23] font-mono font-medium">{data.value}%</span>
        </p>
        {data.pixelCount != null && (
          <p className="text-[11px] text-[#69706A]">
            Pixels:{' '}
            <span className="text-[#1A1D23] font-mono font-medium">
              {data.pixelCount.toLocaleString()}
            </span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

/* ─── Main Component ─────────────────────────────────────────── */

export default function DashboardCharts({
  statistics,
  totalArea,
  buildingStats,
  aiQualityMetrics,
  transitionData,
  superResData,
  waterDynamicsData,
  canopyHeightData,
  terrainData,
  spectralData,
  loadingSuperRes = false,
  loadingWaterDynamics = false,
  loadingCanopyHeight = false,
  loadingTerrain = false,
  loadingSpectral = false,
  onExtractBuildings,
  extractingBuildings = false,
  onTriggerSuperRes,
  onTriggerWaterDynamics,
  onTriggerCanopyHeight,
  onTriggerTerrain,
  onTriggerSpectral,
  onSelectLayer,
}: DashboardChartsProps) {
  /* ── Derived data ── */
  const chartData = useMemo(
    () =>
      Object.entries(statistics || {})
        .map(([name, data]) => ({
          name,
          value: data.percentage,
          area: data.area_ha,
          pixelCount: data.pixel_count,
          color: LULC_COLORS[name] || '#8CA0AA',
        }))
        .sort((a, b) => b.area - a.area),
    [statistics],
  );

  const radarData = useMemo(
    () =>
      chartData.map((d) => ({
        subject: d.name,
        coverage: d.value,
        fullMark: 100,
      })),
    [chartData],
  );

  const treemapData = useMemo(
    () =>
      chartData.map((d) => ({
        name: d.name,
        size: d.area,
        value: d.value,
        color: d.color,
      })),
    [chartData],
  );

  /* ── Summary metrics ── */
  const totalClasses = chartData.length;
  const dominantClass = chartData[0]?.name ?? '--';
  const dominantPct = chartData[0]?.value ?? 0;

  // Shannon Diversity Index  H = -Σ(p_i * ln(p_i))
  const shannonIndex = useMemo(() => {
    let h = 0;
    for (const d of chartData) {
      const p = d.value / 100;
      if (p > 0) h -= p * Math.log(p);
    }
    return h;
  }, [chartData]);

  const maxShannon = totalClasses > 0 ? Math.log(totalClasses) : 1;
  const evenness = maxShannon > 0 ? shannonIndex / maxShannon : 0;

  const totalPixels = useMemo(
    () => chartData.reduce((sum, d) => sum + d.pixelCount, 0),
    [chartData],
  );

  /* ── Animated values ── */
  const animArea = useAnimatedNumber(totalArea ?? 0, 1400);
  const animClasses = useAnimatedNumber(totalClasses, 800);
  const animShannon = useAnimatedNumber(shannonIndex, 1200, 3);

  /* ── Entrance animation ── */
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  /* ── Empty state ── */
  if (!statistics || Object.keys(statistics).length === 0) {
    return (
      <div className="flex items-center gap-4 py-3">
        <div className="analytics-skeleton">
          <div className="bar" style={{ height: '70%' }}></div>
          <div className="bar" style={{ height: '45%' }}></div>
          <div className="bar" style={{ height: '85%' }}></div>
          <div className="bar" style={{ height: '30%' }}></div>
          <div className="bar" style={{ height: '55%' }}></div>
        </div>
        <div className="analytics-note">
          Class breakdown and area totals appear here once a classification run finishes.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-5 transition-all duration-500 print:space-y-4 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {/* ───────────── Summary Stat Cards ───────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 print:grid-cols-4 print:gap-2">
        <StatCard
          label="Total Area"
          value={animArea}
          suffix="ha"
          accentClass="bg-[#E4E9DF] border-[#6F8060]/40 text-[#6F8060]"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          }
        />
        <StatCard
          label="Classes Found"
          value={animClasses}
          accentClass="bg-[#DDE9EB] border-[#416B73]/40 text-[#416B73]"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          }
        />
        <StatCard
          label="Dominant Class"
          value={`${dominantClass}`}
          suffix={`${dominantPct}%`}
          accentClass="bg-[#F3DFD3] border-[#D9622B]/40 text-[#D9622B]"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
        />
        <StatCard
          label={`Shannon Index (E=${evenness.toFixed(2)})`}
          value={animShannon}
          accentClass="bg-[#E4E9DF] border-[#6F8060]/40 text-[#6F8060]"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
      </div>

      {/* ───────────── Analytical Modeling Suite Banner ───────────── */}
      <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-3.5 rounded space-y-3 print:border-slate-300 print:bg-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D9622B]"></span>
              <span className="text-xs font-semibold text-[#1A1D23] uppercase tracking-wider">Geospatial Analysis Suite</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF9F5] text-[#D9622B] border border-[#D8D5CA] font-mono">
                Multispectral Inference Engine
              </span>
            </div>
            <p className="text-[11.5px] text-[#69706A]">
              Execute precision spatial models: building regularization, 4× super-resolution, hydrological dynamics, and canopy carbon estimation.
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#D8D5CA]">
          {onExtractBuildings && (
            <button
              type="button"
              onClick={onExtractBuildings}
              disabled={extractingBuildings}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                buildingStats
                  ? 'bg-[#F3DFD3] hover:bg-[#E9CBBB] text-[#D9622B] border border-[#D9622B]/50 font-semibold'
                  : 'bg-[#FAF9F5] hover:bg-[#E9E6DC] text-[#1A1D23] border border-[#D8D5CA]'
              }`}
            >
              {extractingBuildings ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-t-[#D9622B] animate-spin"></span>
                  <span>Extracting Footprints...</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
                  </svg>
                  <span>{buildingStats ? `Buildings (${buildingStats.building_count})` : "Extract Buildings"}</span>
                </>
              )}
            </button>
          )}

          {onTriggerSuperRes && (
            <button
              type="button"
              onClick={onTriggerSuperRes}
              disabled={loadingSuperRes}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                superResData
                  ? 'bg-[#DDE9EB] hover:bg-[#CCE0E3] text-[#416B73] border border-[#416B73]/50 font-semibold'
                  : 'bg-[#FAF9F5] hover:bg-[#E9E6DC] text-[#1A1D23] border border-[#D8D5CA]'
              }`}
            >
              {loadingSuperRes ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-t-[#416B73] animate-spin"></span>
                  <span>Enhancing 4×...</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  <span>{superResData ? "Super-Res (2.5m Active)" : "Super-Resolution (4×)"}</span>
                </>
              )}
            </button>
          )}

          {onTriggerWaterDynamics && (
            <button
              type="button"
              onClick={onTriggerWaterDynamics}
              disabled={loadingWaterDynamics}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                waterDynamicsData
                  ? 'bg-[#DDE9EB] hover:bg-[#CCE0E3] text-[#416B73] border border-[#416B73]/50 font-semibold'
                  : 'bg-[#FAF9F5] hover:bg-[#E9E6DC] text-[#1A1D23] border border-[#D8D5CA]'
              }`}
            >
              {loadingWaterDynamics ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-t-[#416B73] animate-spin"></span>
                  <span>Analyzing Water...</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                  <span>{waterDynamicsData ? `Water Dynamics (${waterDynamicsData.seasonal_water_ha} ha)` : "Water Dynamics"}</span>
                </>
              )}
            </button>
          )}

          {onTriggerCanopyHeight && (
            <button
              type="button"
              onClick={onTriggerCanopyHeight}
              disabled={loadingCanopyHeight}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                canopyHeightData
                  ? 'bg-[#E4E9DF] hover:bg-[#D3DDD0] text-[#6F8060] border border-[#6F8060]/50 font-semibold'
                  : 'bg-[#FAF9F5] hover:bg-[#E9E6DC] text-[#1A1D23] border border-[#D8D5CA]'
              }`}
            >
              {loadingCanopyHeight ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-t-[#6F8060] animate-spin"></span>
                  <span>Estimating Canopy...</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L7 10h3v4H6l-4 6h20l-4-6h-4v-4h3L12 2z" />
                  </svg>
                  <span>{canopyHeightData ? `Canopy Height (${canopyHeightData.mean_canopy_height_m}m)` : "Canopy Height & Carbon"}</span>
                </>
              )}
            </button>
          )}

          {onTriggerTerrain && (
            <button
              type="button"
              onClick={onTriggerTerrain}
              disabled={loadingTerrain}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                terrainData
                  ? 'bg-[#F3DFD3] hover:bg-[#E9CBBB] text-[#D9622B] border border-[#D9622B]/50 font-semibold'
                  : 'bg-[#FAF9F5] hover:bg-[#E9E6DC] text-[#1A1D23] border border-[#D8D5CA]'
              }`}
            >
              {loadingTerrain ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-t-[#D9622B] animate-spin"></span>
                  <span>Analyzing Terrain...</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 20h20L15 6 9 14l-4-4z" />
                  </svg>
                  <span>{terrainData ? `Terrain & Slope (${terrainData.elevation.relief_m}m Relief)` : "Analyze Terrain & Slope"}</span>
                </>
              )}
            </button>
          )}

          {onTriggerSpectral && (
            <button
              type="button"
              onClick={onTriggerSpectral}
              disabled={loadingSpectral}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                spectralData
                  ? 'bg-[#DDE9EB] hover:bg-[#CCE0E3] text-[#416B73] border border-[#416B73]/50 font-semibold'
                  : 'bg-[#FAF9F5] hover:bg-[#E9E6DC] text-[#1A1D23] border border-[#D8D5CA]'
              }`}
            >
              {loadingSpectral ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-t-[#416B73] animate-spin"></span>
                  <span>Computing Spectral Indices...</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <span>{spectralData ? "Spectral Indices (NDBI/MNDWI/NBR)" : "Analyze Spectral Indices"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>


      {/* ───────────── Charts Grid (2×2) ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
        {/* ─ Pie Chart ─ */}
        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-3.5 rounded print:border-slate-300 print:bg-white shadow-xs">
          <h4 className="text-[11px] font-semibold text-[#454B46] uppercase tracking-wider mb-3 print:text-slate-600">
            Land Use Share (%)
          </h4>
          <div className="h-64 print:h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderPieLabel}
                  animationBegin={0}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} stroke="#FAF9F5" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─ Bar Chart ─ */}
        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-3.5 rounded print:border-slate-300 print:bg-white shadow-xs">
          <h4 className="text-[11px] font-semibold text-[#454B46] uppercase tracking-wider mb-3 print:text-slate-600">
            Class Coverage Area (ha)
          </h4>
          <div className="h-64 print:h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E9E6DC" />
                <XAxis
                  dataKey="name"
                  stroke="#BCB8AA"
                  fontSize={10}
                  fontFamily="IBM Plex Sans, sans-serif"
                  tick={{ fill: '#69706A' }}
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={45}
                />
                <YAxis stroke="#BCB8AA" fontSize={10} fontFamily="IBM Plex Mono, monospace" tick={{ fill: '#69706A' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="area"
                  radius={[3, 3, 0, 0]}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={`bar-${i}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─ Radar Chart ─ */}
        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-3.5 rounded print:border-slate-300 print:bg-white shadow-xs">
          <h4 className="text-[11px] font-semibold text-[#454B46] uppercase tracking-wider mb-3 print:text-slate-600">
            Multi-Class Radar Profile
          </h4>
          <div className="h-64 print:h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                <PolarGrid stroke="#E9E6DC" />
                <PolarAngleAxis
                  dataKey="subject"
                  stroke="#69706A"
                  fontSize={10}
                  fontFamily="IBM Plex Sans, sans-serif"
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 'auto']}
                  stroke="#BCB8AA"
                  fontSize={9}
                  tickCount={4}
                />
                <Radar
                  name="Coverage %"
                  dataKey="coverage"
                  stroke="#D9622B"
                  fill="#D9622B"
                  fillOpacity={0.2}
                  strokeWidth={1.5}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FAF9F5',
                    border: '1px solid #D8D5CA',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'IBM Plex Sans, sans-serif',
                  }}
                  labelStyle={{ color: '#1A1D23', fontWeight: 600 }}
                  itemStyle={{ color: '#D9622B' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─ Treemap ─ */}
        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-3.5 rounded print:border-slate-300 print:bg-white shadow-xs">
          <h4 className="text-[11px] font-semibold text-[#454B46] uppercase tracking-wider mb-3 print:text-slate-600">
            Proportional Class Areas (Treemap)
          </h4>
          <div className="h-64 print:h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#FAF9F5"
                animationDuration={900}
                animationEasing="ease-out"
                content={<TreemapContent />}
              />
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ───────────── LULC Transition Matrix & Trajectories ───────────── */}
      {transitionData && (
        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-4 rounded space-y-4 print:border-slate-300 print:bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D5CA] pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1A1D23] uppercase tracking-wider">
                  Multispectral LULC Transition Matrix
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E4E9DF] text-[#6F8060] border border-[#6F8060]/40 font-mono">
                  {transitionData.transition_rate_percentage}% Shifted
                </span>
              </div>
              <p className="text-[11.5px] text-[#69706A] mt-0.5">
                Class-to-class flow distribution ({transitionData.total_transitioned_ha} ha converted).
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-2 py-0.5 rounded border ${transitionData.net_changes.urban_ha >= 0 ? 'bg-[#F3DFD3] border-[#D9622B]/40 text-[#D9622B]' : 'bg-[#E4E9DF] border-[#6F8060]/40 text-[#6F8060]'}`}>
                Urban: {transitionData.net_changes.urban_ha >= 0 ? '+' : ''}{transitionData.net_changes.urban_ha} ha
              </span>
              <span className={`px-2 py-0.5 rounded border ${transitionData.net_changes.forest_ha < 0 ? 'bg-[#FBEBEA] border-[#A84E42]/40 text-[#A84E42]' : 'bg-[#E4E9DF] border-[#6F8060]/40 text-[#6F8060]'}`}>
                Forest: {transitionData.net_changes.forest_ha >= 0 ? '+' : ''}{transitionData.net_changes.forest_ha} ha
              </span>
            </div>
          </div>

          {/* Trajectory Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(transitionData.trajectories).map(([key, traj]: [string, any]) => {
              if (traj.area_ha <= 0 && key !== 'urbanization') return null;
              const isAlert = key === 'deforestation' || key === 'urbanization';
              const isGood = key === 'reforestation' || key === 'stable';
              return (
                <div key={key} className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded">
                  <div className="text-[10px] uppercase font-semibold text-[#69706A] truncate">{traj.label}</div>
                  <div className={`text-sm font-bold font-mono mt-1 ${isAlert && traj.area_ha > 0 ? 'text-[#D9622B]' : isGood ? 'text-[#6F8060]' : 'text-[#1A1D23]'}`}>
                    {traj.area_ha} ha
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Flows Table */}
          <div className="border border-[#D8D5CA] rounded overflow-hidden">
            <div className="bg-[#F4F1E8] px-3 py-1.5 text-[11px] font-semibold text-[#454B46] uppercase tracking-wider flex justify-between border-b border-[#D8D5CA]">
              <span>Class Transition Flows</span>
              <span>Hectares (% Source)</span>
            </div>
            <div className="divide-y divide-[#E3E0D5] max-h-48 overflow-y-auto">
              {transitionData.matrix.slice(0, 8).map((flow, i) => (
                <div key={i} className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-[#F4F1E8] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1A1D23]">{flow.from_class}</span>
                    <span className="text-[#8A908A]">→</span>
                    <span className="font-semibold text-[#1A1D23]">{flow.to_class}</span>
                    <span className={`text-[9.5px] px-1 rounded uppercase font-mono ${
                      flow.trajectory === 'stable' ? 'bg-[#E4E9DF] text-[#6F8060]' :
                      flow.trajectory === 'urbanization' ? 'bg-[#F3DFD3] text-[#D9622B]' :
                      flow.trajectory === 'deforestation' ? 'bg-[#FBEBEA] text-[#A84E42]' :
                      'bg-[#E9E6DC] text-[#69706A]'
                    }`}>
                      {flow.trajectory}
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-right">
                    <span className="text-[#1A1D23] font-medium">{flow.area_ha} ha</span>
                    <span className="text-[10.5px] text-[#69706A] ml-1.5">({flow.pct_of_source}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────── Super-Resolution Intelligence Card ───────────── */}
      {superResData && (
        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-4 rounded space-y-3 print:border-slate-300 print:bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D5CA] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#416B73]"></span>
              <span className="text-xs font-bold text-[#1A1D23] uppercase tracking-wider">
                Sentinel-2 4× Super-Resolution ({superResData.super_resolution_m}m Synthetic)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#DDE9EB] text-[#416B73] border border-[#416B73]/40 font-mono">
                +{superResData.metrics.sharpness_improvement_pct}% Sharpness
              </span>
            </div>
            <span className="text-[11px] text-[#69706A] font-mono">
              {superResData.metrics.model_architecture}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2.5 rounded">
              <div className="text-[10.5px] text-[#69706A] uppercase font-semibold">Native Resolution</div>
              <div className="text-base font-bold text-[#1A1D23] font-mono mt-1">{superResData.native_resolution_m}m / px</div>
              <div className="text-[10px] text-[#69706A]">Sentinel-2 Multispectral</div>
            </div>

            <div className="bg-[#F4F1E8] border border-[#416B73]/40 p-2.5 rounded">
              <div className="text-[10.5px] text-[#416B73] uppercase font-semibold">Upscaled Resolution</div>
              <div className="text-base font-bold text-[#416B73] font-mono mt-1">{superResData.super_resolution_m}m / px</div>
              <div className="text-[10px] text-[#416B73]/80">4× Sub-pixel diffusion</div>
            </div>

            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2.5 rounded">
              <div className="text-[10.5px] text-[#69706A] uppercase font-semibold">PSNR Peak Signal</div>
              <div className="text-base font-bold text-[#6F8060] font-mono mt-1">{superResData.metrics.estimated_psnr_db} dB</div>
              <div className="text-[10px] text-[#69706A]">High fidelity reconstruction</div>
            </div>

            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2.5 rounded">
              <div className="text-[10.5px] text-[#69706A] uppercase font-semibold">SSIM Index</div>
              <div className="text-base font-bold text-[#1A1D23] font-mono mt-1">{superResData.metrics.structural_similarity_ssim}</div>
              <div className="text-[10px] text-[#69706A]">Structural similarity</div>
            </div>
          </div>

          {superResData.warning && (
            <div className="text-[11px] text-[#D9622B] bg-[#F3DFD3] border border-[#D9622B]/30 p-2 rounded">
              {superResData.warning}
            </div>
          )}
        </div>
      )}

      {/* ───────────── Seasonal Water Dynamics & Flood Risk Card ───────────── */}
      {waterDynamicsData && (
        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-4 rounded space-y-4 print:border-slate-300 print:bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D5CA] pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#416B73]"></span>
                <span className="text-xs font-bold text-[#1A1D23] uppercase tracking-wider">
                  Hydrological Dynamics & Seasonal Water Extent
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#DDE9EB] text-[#416B73] border border-[#416B73]/40 font-mono">
                  {waterDynamicsData.seasonal_fluctuation_pct}% Fluctuation
                </span>
              </div>
              <p className="text-[11.5px] text-[#69706A] mt-0.5">
                Multi-temporal MNDWI water surface monitoring across dry and wet regimes.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-2 py-0.5 rounded border ${
                waterDynamicsData.flood_risk.rating === 'High' ? 'bg-[#FBEBEA] border-[#A84E42]/40 text-[#A84E42]' :
                waterDynamicsData.flood_risk.rating === 'Moderate' ? 'bg-[#F3DFD3] border-[#D9622B]/40 text-[#D9622B]' :
                'bg-[#E4E9DF] border-[#6F8060]/40 text-[#6F8060]'
              }`}>
                Flood Risk: {waterDynamicsData.flood_risk.rating} ({waterDynamicsData.flood_risk.score})
              </span>
              <span className={`px-2 py-0.5 rounded border ${
                waterDynamicsData.drought_vulnerability.rating === 'Severe' ? 'bg-[#FBEBEA] border-[#A84E42]/40 text-[#A84E42]' :
                waterDynamicsData.drought_vulnerability.rating === 'Moderate' ? 'bg-[#F3DFD3] border-[#D9622B]/40 text-[#D9622B]' :
                'bg-[#E4E9DF] border-[#6F8060]/40 text-[#6F8060]'
              }`}>
                Drought: {waterDynamicsData.drought_vulnerability.rating} ({waterDynamicsData.drought_vulnerability.score})
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded">
              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Mean Extent</span>
              <div className="text-sm font-bold text-[#1A1D23] font-mono mt-0.5">{waterDynamicsData.mean_water_extent_ha} ha</div>
            </div>
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded">
              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Permanent Water</span>
              <div className="text-sm font-bold text-[#416B73] font-mono mt-0.5">{waterDynamicsData.permanent_water_ha} ha</div>
            </div>
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded">
              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Seasonal Water</span>
              <div className="text-sm font-bold text-[#416B73] font-mono mt-0.5">{waterDynamicsData.seasonal_water_ha} ha</div>
            </div>
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded">
              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Peak High / Low</span>
              <div className="text-sm font-bold text-[#1A1D23] font-mono mt-0.5">{waterDynamicsData.max_water_extent_ha} / {waterDynamicsData.min_water_extent_ha} ha</div>
            </div>
          </div>

          {/* Monthly Area Chart */}
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waterDynamicsData.monthly_series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#416B73" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#416B73" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9E6DC" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#69706A', fontSize: 10 }} />
                <YAxis tick={{ fill: '#69706A', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FAF9F5',
                    border: '1px solid #D8D5CA',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'IBM Plex Mono, monospace'
                  }}
                  formatter={(val: any) => [`${val} ha`, 'Water Area']}
                />
                <Area type="monotone" dataKey="water_area_ha" stroke="#416B73" strokeWidth={2} fillOpacity={1} fill="url(#waterGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ───────────── Forest Canopy Height & Carbon Stock Card ───────────── */}
      {canopyHeightData && (
        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-4 rounded space-y-4 print:border-slate-300 print:bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D5CA] pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6F8060]"></span>
                <span className="text-xs font-bold text-[#1A1D23] uppercase tracking-wider">
                  Canopy Height & Above-Ground Biomass Carbon
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E4E9DF] text-[#6F8060] border border-[#6F8060]/40 font-mono">
                  {canopyHeightData.forest_area_ha} ha Forest
                </span>
              </div>
              <p className="text-[11.5px] text-[#69706A] mt-0.5">
                GEDI spaceborne LiDAR regression model estimating vertical vegetation strata and carbon sinks.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded border bg-[#E4E9DF] border-[#6F8060]/40 text-[#6F8060]">
                Mean: {canopyHeightData.mean_canopy_height_m}m
              </span>
              <span className="px-2 py-0.5 rounded border bg-[#F3DFD3] border-[#D9622B]/40 text-[#D9622B]">
                Old-Growth (&gt;25m): {canopyHeightData.old_growth_area_ha} ha
              </span>
            </div>
          </div>

          {/* Biomass and Carbon KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2.5 rounded">
              <div className="text-[10.5px] text-[#69706A] uppercase font-semibold">Biomass Density</div>
              <div className="text-base font-bold text-[#1A1D23] font-mono mt-0.5">
                {canopyHeightData.biomass_and_carbon.biomass_density_mg_ha} <span className="text-xs font-normal text-[#69706A]">Mg / ha</span>
              </div>
            </div>

            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2.5 rounded">
              <div className="text-[10.5px] text-[#69706A] uppercase font-semibold">Total Stand Biomass</div>
              <div className="text-base font-bold text-[#6F8060] font-mono mt-0.5">
                {canopyHeightData.biomass_and_carbon.total_biomass_tonnes.toLocaleString()} <span className="text-xs font-normal text-[#69706A]">tonnes</span>
              </div>
            </div>

            <div className="bg-[#F4F1E8] border border-[#6F8060]/30 p-2.5 rounded col-span-2 sm:col-span-1">
              <div className="text-[10.5px] text-[#6F8060] uppercase font-semibold">Carbon Stock</div>
              <div className="text-base font-bold text-[#6F8060] font-mono mt-0.5">
                {canopyHeightData.biomass_and_carbon.carbon_stock_tonnes_co2e.toLocaleString()} <span className="text-xs font-normal text-[#69706A]">t CO₂e</span>
              </div>
            </div>
          </div>

          {/* Strata Vertical Histogram */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-[#454B46] uppercase tracking-wider">
              Vertical Strata Distribution
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={canopyHeightData.height_strata_distribution} layout="vertical" margin={{ top: 0, right: 20, left: 70, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9E6DC" horizontal={false} />
                  <XAxis type="number" unit="%" tick={{ fill: '#69706A', fontSize: 10 }} />
                  <YAxis type="category" dataKey="stratum" tick={{ fill: '#1A1D23', fontSize: 9.5 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FAF9F5',
                      border: '1px solid #D8D5CA',
                      borderRadius: 4,
                      fontSize: 11,
                      fontFamily: 'IBM Plex Mono, monospace'
                    }}
                    formatter={(val: any, name: any, item: any) => [`${val}% (${item.payload.area_ha} ha)`, 'Coverage']}
                  />
                  <Bar dataKey="percentage" fill="#6F8060" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── Topographic & Slope Stability Engine Card ───────────── */}
      {terrainData && (
        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-4 rounded space-y-4 print:border-slate-300 print:bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D5CA] pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D9622B]"></span>
                <span className="text-xs font-bold text-[#1A1D23] uppercase tracking-wider">
                  Topographic & Slope Stability Engine
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3DFD3] text-[#D9622B] border border-[#D9622B]/40 font-mono">
                  {terrainData.source || "Copernicus 30m GLO-30"}
                </span>
              </div>
              <p className="text-[11.5px] text-[#69706A] mt-0.5">
                Digital Elevation Model (DEM) terrain morphology, 5-tier slope geotechnical breakdown, and erosion hazard cross-analysis.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-2 py-0.5 rounded border ${
                terrainData.hazard_cross_matrix.vulnerability_rating === 'Critical' ? 'bg-[#FBEBEA] border-[#A84E42]/40 text-[#A84E42]' :
                terrainData.hazard_cross_matrix.vulnerability_rating === 'High' ? 'bg-[#FBEBEA] border-[#A84E42]/30 text-[#A84E42]' :
                terrainData.hazard_cross_matrix.vulnerability_rating === 'Moderate' ? 'bg-[#F3DFD3] border-[#D9622B]/30 text-[#D9622B]' :
                'bg-[#E4E9DF] border-[#6F8060]/30 text-[#6F8060]'
              }`}>
                Erosion Hazard: {terrainData.hazard_cross_matrix.vulnerability_rating} ({terrainData.hazard_cross_matrix.vulnerability_score}/100)
              </span>
              <span className="px-2 py-0.5 rounded border bg-[#F4F1E8] border-[#D8D5CA] text-[#1A1D23]">
                Relief: {terrainData.elevation.relief_m}m
              </span>
            </div>
          </div>

          {/* Topographic KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded">
              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Min Elev</span>
              <div className="text-sm font-bold text-[#1A1D23] font-mono mt-0.5">{terrainData.elevation.min_m} m</div>
              <span className="text-[9.5px] text-[#69706A]">Above sea level</span>
            </div>

            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded">
              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Max Elev</span>
              <div className="text-sm font-bold text-[#1A1D23] font-mono mt-0.5">{terrainData.elevation.max_m} m</div>
              <span className="text-[9.5px] text-[#69706A]">Peak summit</span>
            </div>

            <div className="bg-[#F4F1E8] border border-[#D9622B]/30 p-2 rounded">
              <span className="text-[10px] text-[#D9622B] uppercase font-semibold">Relief</span>
              <div className="text-sm font-bold text-[#D9622B] font-mono mt-0.5">{terrainData.elevation.relief_m} m</div>
              <span className="text-[9.5px] text-[#69706A]">Vertical delta</span>
            </div>

            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded">
              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Mean Slope</span>
              <div className="text-sm font-bold text-[#1A1D23] font-mono mt-0.5">{terrainData.slope.mean_deg}°</div>
              <span className="text-[9.5px] text-[#69706A]">Average grade</span>
            </div>

            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded">
              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Max Slope</span>
              <div className="text-sm font-bold text-[#1A1D23] font-mono mt-0.5">{terrainData.slope.max_deg}°</div>
              <span className="text-[9.5px] text-[#69706A]">Steepest grade</span>
            </div>

            <div className="bg-[#F4F1E8] border border-[#A84E42]/30 p-2 rounded">
              <span className="text-[10px] text-[#A84E42] uppercase font-semibold">Steep (&gt;=25°)</span>
              <div className="text-sm font-bold text-[#A84E42] font-mono mt-0.5">{terrainData.slope.steep_slopes_pct}%</div>
              <span className="text-[9.5px] text-[#69706A]">{terrainData.slope.steep_slopes_ha} ha</span>
            </div>
          </div>

          {/* 5-Tier Geotechnical Slope Classification */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#454B46] uppercase tracking-wider">
                Geotechnical Slope Stability Categories
              </span>
              <span className="text-[10.5px] text-[#69706A] font-mono">5 Stability Tiers</span>
            </div>

            <div className="space-y-2">
              {terrainData.slope_distribution.map((tier) => (
                <div key={tier.id} className="bg-[#F4F1E8] border border-[#D8D5CA] p-2 rounded flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: tier.color }}></span>
                      <span className="font-semibold text-[#1A1D23]">{tier.name}</span>
                      <span className="text-[10.5px] text-[#69706A] hidden sm:inline">: {tier.hazard}</span>
                    </div>
                    <div className="font-mono tabular-nums text-right flex items-center gap-3">
                      <span className="text-[#1A1D23] font-medium">{tier.area_ha.toLocaleString()} ha</span>
                      <span className="w-12 text-right text-[#D9622B] font-semibold">{tier.percentage}%</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#E9E6DC] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(tier.percentage, 0.5))}%`,
                        backgroundColor: tier.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aspect & Cross-Hazard Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Solar Aspect Exposure Chart */}
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-3 rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#454B46] uppercase tracking-wider">
                  Terrain Aspect & Solar Exposure
                </span>
                <span className="text-[10px] text-[#69706A] font-mono">8 Cardinal Bearings</span>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={terrainData.aspect_distribution} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9E6DC" vertical={false} />
                    <XAxis dataKey="cardinal" tick={{ fill: '#69706A', fontSize: 10 }} />
                    <YAxis unit="%" tick={{ fill: '#69706A', fontSize: 9.5 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FAF9F5',
                        border: '1px solid #D8D5CA',
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: 'IBM Plex Mono, monospace'
                      }}
                      formatter={(val: any, name: any, item: any) => [`${val}% (${item.payload.area_ha} ha)`, `Facing ${item.payload.degrees}`]}
                    />
                    <Bar dataKey="percentage" fill="#B68A3A" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Geotechnical & Erosion Hazard Matrix */}
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-3 rounded space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#454B46] uppercase tracking-wider">
                  LULC x Slope Hazard Cross-Analysis
                </span>
                <span className="text-[10px] text-[#D9622B] font-mono font-semibold">Geotechnical Insights</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#FAF9F5] border border-[#A84E42]/30 p-2 rounded">
                  <div className="text-[9.5px] text-[#A84E42] uppercase font-semibold">High Erosion Risk</div>
                  <div className="text-sm font-bold text-[#1A1D23] font-mono mt-0.5">
                    {terrainData.hazard_cross_matrix.high_erosion_bare_ground_ha} ha
                  </div>
                  <div className="text-[9px] text-[#69706A]">Bare/Scrub &gt;= 25°</div>
                </div>

                <div className="bg-[#FAF9F5] border border-[#D9622B]/30 p-2 rounded">
                  <div className="text-[9.5px] text-[#D9622B] uppercase font-semibold">Urban Slope Risk</div>
                  <div className="text-sm font-bold text-[#1A1D23] font-mono mt-0.5">
                    {terrainData.hazard_cross_matrix.urban_slope_risk_ha} ha
                  </div>
                  <div className="text-[9px] text-[#69706A]">Built-up &gt;= 15°</div>
                </div>

                <div className="bg-[#FAF9F5] border border-[#416B73]/30 p-2 rounded">
                  <div className="text-[9.5px] text-[#416B73] uppercase font-semibold">Retention Basins</div>
                  <div className="text-sm font-bold text-[#1A1D23] font-mono mt-0.5">
                    {terrainData.hazard_cross_matrix.flat_inundation_basin_ha} ha
                  </div>
                  <div className="text-[9px] text-[#69706A]">Low gradient &lt;= 3°</div>
                </div>
              </div>

              {/* Geotechnical Commentary */}
              <div className="space-y-1 pt-1 border-t border-[#D8D5CA]">
                {terrainData.hazard_cross_matrix.geotechnical_notes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px] text-[#454B46]">
                    <span className="text-[#D9622B] font-bold mt-0.5">•</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── Multispectral Indices Explorer Card ───────────── */}
      {spectralData && (
        <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded p-4 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D5CA] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#416B73]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1A1D23]">
                  Multispectral Indices Explorer (Sentinel-2 Band Math)
                </h3>
              </div>
              <p className="text-[11px] text-[#69706A] mt-0.5">
                Advanced surface discrimination via NDBI (built-up), MNDWI (water), and NBR (burn severity & clearing)
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded border border-[#416B73]/30 bg-[#416B73]/10 text-[#416B73] mono text-[10px] font-semibold">
                S2 SR Band Math (B2–B12)
              </span>
              <span className="px-2 py-0.5 rounded border border-[#D8D5CA] bg-[#F4F1E8] text-[#1A1D23] mono text-[10px]">
                AOI: {spectralData.total_area_ha?.toLocaleString() ?? '--'} ha
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* NDBI Card */}
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-3 rounded space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#D9622B] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#D9622B]" />
                    <span>NDBI (Built-Up Index)</span>
                  </div>
                  {onSelectLayer && (
                    <button
                      type="button"
                      onClick={() => onSelectLayer('ndbi')}
                      className="text-[9.5px] px-2 py-0.5 rounded bg-[#FAF9F5] hover:bg-[#E9E6DC] text-[#1A1D23] border border-[#D8D5CA] transition cursor-pointer font-medium"
                    >
                      View Layer
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-[#69706A] mt-0.5">Formula: (SWIR1 - NIR) / (SWIR1 + NIR)</div>

                <div className="grid grid-cols-2 gap-2 text-center mt-2.5">
                  <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-1.5 rounded">
                    <div className="text-[9px] text-[#69706A] uppercase font-semibold">Mean NDBI</div>
                    <div className="text-sm font-bold text-[#1A1D23] mono mt-0.5">
                      {spectralData.ndbi.mean > 0 ? `+${spectralData.ndbi.mean}` : spectralData.ndbi.mean}
                    </div>
                  </div>
                  <div className="bg-[#FAF9F5] border border-[#D9622B]/30 p-1.5 rounded">
                    <div className="text-[9px] text-[#D9622B] uppercase font-semibold">Built Footprint</div>
                    <div className="text-sm font-bold text-[#1A1D23] mono mt-0.5">
                      {spectralData.ndbi.built_area_ha} ha
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-[#69706A] mb-1">
                  <span>Built-up / Impervious</span>
                  <span className="text-[#1A1D23] mono font-bold">{spectralData.ndbi.built_percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#E9E6DC] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#D9622B]"
                    style={{ width: `${Math.min(100, Math.max(0, spectralData.ndbi.built_percentage))}%` }}
                  />
                </div>
                <div className="text-[9.5px] text-[#69706A] mt-1.5">
                  Separates concrete, asphalt, excavation rock, and quarries from vegetation.
                </div>
              </div>
            </div>

            {/* MNDWI Card */}
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-3 rounded space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#416B73] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#416B73]" />
                    <span>MNDWI (Water Index)</span>
                  </div>
                  {onSelectLayer && (
                    <button
                      type="button"
                      onClick={() => onSelectLayer('mndwi')}
                      className="text-[9.5px] px-2 py-0.5 rounded bg-[#FAF9F5] hover:bg-[#E9E6DC] text-[#1A1D23] border border-[#D8D5CA] transition cursor-pointer font-medium"
                    >
                      View Layer
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-[#69706A] mt-0.5">Formula: (Green - SWIR1) / (Green + SWIR1)</div>

                <div className="grid grid-cols-2 gap-2 text-center mt-2.5">
                  <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-1.5 rounded">
                    <div className="text-[9px] text-[#69706A] uppercase font-semibold">Mean MNDWI</div>
                    <div className="text-sm font-bold text-[#1A1D23] mono mt-0.5">
                      {spectralData.mndwi.mean > 0 ? `+${spectralData.mndwi.mean}` : spectralData.mndwi.mean}
                    </div>
                  </div>
                  <div className="bg-[#FAF9F5] border border-[#416B73]/30 p-1.5 rounded">
                    <div className="text-[9px] text-[#416B73] uppercase font-semibold">Water Extent</div>
                    <div className="text-sm font-bold text-[#1A1D23] mono mt-0.5">
                      {spectralData.mndwi.water_area_ha} ha
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-[#69706A] mb-1">
                  <span>Open Water Bodies</span>
                  <span className="text-[#1A1D23] mono font-bold">{spectralData.mndwi.water_percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#E9E6DC] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#416B73]"
                    style={{ width: `${Math.min(100, Math.max(0, spectralData.mndwi.water_percentage))}%` }}
                  />
                </div>
                <div className="text-[9.5px] text-[#69706A] mt-1.5">
                  Suppresses built-up noise; isolates open reservoirs, retention basins, and tailings.
                </div>
              </div>
            </div>

            {/* NBR Card */}
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] p-3 rounded space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#B68A3A] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#B68A3A]" />
                    <span>NBR (Burn Severity)</span>
                  </div>
                  {onSelectLayer && (
                    <button
                      type="button"
                      onClick={() => onSelectLayer('nbr')}
                      className="text-[9.5px] px-2 py-0.5 rounded bg-[#FAF9F5] hover:bg-[#E9E6DC] text-[#202522] border border-[#D8D5CA] transition cursor-pointer font-medium"
                    >
                      View Layer
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-[#69706A] mt-0.5">Formula: (NIR - SWIR2) / (NIR + SWIR2)</div>

                <div className="grid grid-cols-2 gap-2 text-center mt-2.5">
                  <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-1.5 rounded">
                    <div className="text-[9px] text-[#69706A] uppercase font-semibold">Mean NBR</div>
                    <div className="text-sm font-bold text-[#202522] mono mt-0.5">
                      {spectralData.nbr.mean > 0 ? `+${spectralData.nbr.mean}` : spectralData.nbr.mean}
                    </div>
                  </div>
                  <div className="bg-[#FAF9F5] border border-[#B68A3A]/30 p-1.5 rounded">
                    <div className="text-[9px] text-[#B68A3A] uppercase font-semibold">Burn Scars</div>
                    <div className="text-sm font-bold text-[#202522] mono mt-0.5">
                      {spectralData.nbr.burn_severity_breakdown[0]?.percentage ?? 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Tier Severity Distribution */}
              <div className="space-y-1">
                <div className="text-[9.5px] text-[#69706A] font-semibold uppercase">
                  Burn Severity Classification
                </div>
                <div className="flex h-2 w-full rounded-full overflow-hidden bg-[#E9E6DC]">
                  {spectralData.nbr.burn_severity_breakdown.map((t, i) => (
                    <div
                      key={i}
                      style={{ width: `${t.percentage}%`, backgroundColor: t.color }}
                      title={`${t.tier}: ${t.percentage}%`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-[#69706A] pt-0.5">
                  {spectralData.nbr.burn_severity_breakdown.map((t, i) => (
                    <div key={i} className="flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="truncate">{t.tier.split('/')[0]}:</span>
                      <span className="mono text-[#202522] font-semibold">{t.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── Enhanced Data Table ───────────── */}
      <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded overflow-hidden shadow-xs print:border-slate-300 print:bg-white">
        <table className="w-full text-left text-xs border-collapse print:text-[10px]">
          <thead>
            <tr className="bg-[#F4F1E8] text-[#454B46] uppercase tracking-wider font-semibold border-b border-[#D8D5CA] print:bg-slate-100 print:text-slate-600">
              <th className="py-2.5 px-3.5">Class</th>
              <th className="py-2.5 px-3.5 text-right">Area (ha)</th>
              <th className="py-2.5 px-3.5 text-right">Pixels</th>
              <th className="py-2.5 px-3.5 text-right w-44">Percentage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D5CA] print:divide-slate-200">
            {chartData.map((row) => (
              <tr
                key={row.name}
                className="hover:bg-[#F4F1E8]/60 text-[#202522] font-medium transition-colors print:text-slate-800 print:hover:bg-transparent"
              >
                <td className="py-2 px-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-xs flex-shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span>{row.name}</span>
                  </div>
                </td>
                <td className="py-2 px-3.5 text-right mono tabular-nums text-[#202522]">
                  {row.area.toLocaleString()}
                </td>
                <td className="py-2 px-3.5 text-right mono tabular-nums text-[#69706A]">
                  {row.pixelCount.toLocaleString()}
                </td>
                <td className="py-2 px-3.5">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-24 h-1.5 bg-[#E9E6DC] rounded-full overflow-hidden print:bg-slate-200 flex-shrink-0">
                      <div
                        className="h-full rounded-full transition-all duration-800 ease-out"
                        style={{
                          width: `${row.value}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                    <span className="mono tabular-nums w-10 text-right text-[11px] text-[#202522]">{row.value}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F4F1E8] text-[#202522] font-semibold border-t border-[#D8D5CA] print:bg-slate-50 print:text-slate-800">
              <td className="py-2.5 px-3.5">Total</td>
              <td className="py-2.5 px-3.5 text-right mono tabular-nums">
                {totalArea?.toLocaleString() ?? '--'}
              </td>
              <td className="py-2.5 px-3.5 text-right mono tabular-nums text-[#69706A]">
                {totalPixels.toLocaleString()}
              </td>
              <td className="py-2.5 px-3.5 text-right mono tabular-nums">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ───────────── Print Footer ───────────── */}
      <div className="hidden print:block text-center text-[9px] text-slate-400 pt-2 border-t border-slate-200 mt-4">
        Land Cover Classification Report • Generated{' '}
        {new Date().toLocaleDateString()} • Shannon H′ = {shannonIndex.toFixed(3)} •
        Evenness = {evenness.toFixed(3)}
      </div>
    </div>
  );
}

