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

interface DashboardChartsProps {
  statistics?: Record<string, ClassData>;
  totalArea?: number;
  buildingStats?: BuildingStats | null;
  aiQualityMetrics?: AIQualityMetrics | null;
  transitionData?: TransitionData | null;
  superResData?: SuperResData | null;
  waterDynamicsData?: WaterDynamicsData | null;
  canopyHeightData?: CanopyHeightData | null;
  loadingSuperRes?: boolean;
  loadingWaterDynamics?: boolean;
  loadingCanopyHeight?: boolean;
  onExtractBuildings?: () => void;
  extractingBuildings?: boolean;
  onTriggerSuperRes?: () => void;
  onTriggerWaterDynamics?: () => void;
  onTriggerCanopyHeight?: () => void;
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
    <div className="bg-[#22241E] border border-[#35372E] p-3.5 rounded flex items-center gap-3.5 print:border-slate-300 print:bg-white transition-all duration-200 hover:border-[#454737]">
      <div className={`p-2.5 rounded border ${accentClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10.5px] text-[#8B8C7F] uppercase tracking-wider font-semibold print:text-slate-600 truncate">
          {label}
        </p>
        <p className="text-lg font-bold text-[#EDE8DB] mt-0.5 print:text-slate-900 mono tabular-nums">
          {value}
          {suffix && <span className="text-xs font-medium text-[#8B8C7F] ml-1">{suffix}</span>}
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
          stroke: '#1B1D19',
          strokeWidth: 2,
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
              fill: '#EDE8DB',
              fontWeight: 600,
              fontFamily: 'IBM Plex Sans, sans-serif',
              textShadow: '0 1px 3px rgba(0,0,0,.6)',
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
              fill: '#C7C6BA',
              fontWeight: 500,
              fontFamily: 'IBM Plex Mono, monospace',
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
      fill="#C7C6BA"
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
      <div className="bg-[#22241E] border border-[#35372E] p-2.5 rounded shadow-xl text-[#C7C6BA] font-sans print:hidden">
        <p className="text-xs font-semibold flex items-center gap-2 text-[#EDE8DB]">
          <span
            className="w-2.5 h-2.5 rounded-xs"
            style={{ backgroundColor: data.color }}
          />
          {data.name}
        </p>
        <p className="text-[11px] mt-1 text-[#8B8C7F]">
          Area:{' '}
          <span className="text-[#EDE8DB] mono font-medium">
            {data.area?.toLocaleString() ?? '—'} ha
          </span>
        </p>
        <p className="text-[11px] text-[#8B8C7F]">
          Share:{' '}
          <span className="text-[#EDE8DB] mono font-medium">{data.value}%</span>
        </p>
        {data.pixelCount != null && (
          <p className="text-[11px] text-[#8B8C7F]">
            Pixels:{' '}
            <span className="text-[#EDE8DB] mono font-medium">
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
  loadingSuperRes = false,
  loadingWaterDynamics = false,
  loadingCanopyHeight = false,
  onExtractBuildings,
  extractingBuildings = false,
  onTriggerSuperRes,
  onTriggerWaterDynamics,
  onTriggerCanopyHeight,
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
  const dominantClass = chartData[0]?.name ?? '—';
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
          accentClass="bg-[#7FA35C]/10 border-[#7FA35C]/30 text-[#7FA35C]"
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
          accentClass="bg-[#8CA0AA]/10 border-[#8CA0AA]/30 text-[#8CA0AA]"
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
          accentClass="bg-[#C8834C]/10 border-[#C8834C]/30 text-[#C8834C]"
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
          accentClass="bg-[#7FA35C]/10 border-[#7FA35C]/30 text-[#7FA35C]"
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

      {/* ───────────── GeoAI Intelligence & Quality Banner ───────────── */}
      <div className="bg-[#22241E] border border-[#35372E] p-3.5 rounded space-y-3 print:border-slate-300 print:bg-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#7FA35C] animate-pulse"></span>
              <span className="text-xs font-semibold text-[#EDE8DB] uppercase tracking-wider">GeoAI Intelligence Suite</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4E6A3D]/25 text-[#7FA35C] border border-[#7FA35C]/30 mono">
                Hybrid Deep Learning Engine
              </span>
            </div>
            <p className="text-[11.5px] text-[#8B8C7F]">
              Run advanced spatial analyses powered by GeoAI models: building regularization, 4× super-resolution, hydrological dynamics, and canopy carbon estimation.
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#35372E]/60">
          {onExtractBuildings && (
            <button
              type="button"
              onClick={onExtractBuildings}
              disabled={extractingBuildings}
              className="px-2.5 py-1.5 rounded bg-[#C8834C]/15 hover:bg-[#C8834C]/25 text-[#EDE8DB] border border-[#C8834C]/40 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              {extractingBuildings ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-t-[#C8834C] animate-spin"></span>
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
              className="px-2.5 py-1.5 rounded bg-[#419BDF]/15 hover:bg-[#419BDF]/25 text-[#EDE8DB] border border-[#419BDF]/40 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              {loadingSuperRes ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-t-[#419BDF] animate-spin"></span>
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
              className="px-2.5 py-1.5 rounded bg-[#7A87C6]/15 hover:bg-[#7A87C6]/25 text-[#EDE8DB] border border-[#7A87C6]/40 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              {loadingWaterDynamics ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-t-[#7A87C6] animate-spin"></span>
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
              className="px-2.5 py-1.5 rounded bg-[#397D49]/20 hover:bg-[#397D49]/35 text-[#EDE8DB] border border-[#397D49]/50 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              {loadingCanopyHeight ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-t-[#397D49] animate-spin"></span>
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
        </div>
      </div>

      {/* ───────────── Charts Grid (2×2) ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
        {/* ─ Pie Chart ─ */}
        <div className="bg-[#22241E] border border-[#35372E] p-3.5 rounded print:border-slate-300 print:bg-white">
          <h4 className="text-[11px] font-semibold text-[#8B8C7F] uppercase tracking-wider mb-3 print:text-slate-600">
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
                    <Cell key={`cell-${i}`} fill={entry.color} stroke="#1B1D19" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─ Bar Chart ─ */}
        <div className="bg-[#22241E] border border-[#35372E] p-3.5 rounded print:border-slate-300 print:bg-white">
          <h4 className="text-[11px] font-semibold text-[#8B8C7F] uppercase tracking-wider mb-3 print:text-slate-600">
            Class Coverage Area (ha)
          </h4>
          <div className="h-64 print:h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2C24" />
                <XAxis
                  dataKey="name"
                  stroke="#8B8C7F"
                  fontSize={10}
                  fontFamily="IBM Plex Sans, sans-serif"
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={45}
                />
                <YAxis stroke="#8B8C7F" fontSize={10} fontFamily="IBM Plex Mono, monospace" tickLine={false} />
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
        <div className="bg-[#22241E] border border-[#35372E] p-3.5 rounded print:border-slate-300 print:bg-white">
          <h4 className="text-[11px] font-semibold text-[#8B8C7F] uppercase tracking-wider mb-3 print:text-slate-600">
            Multi-Class Radar Profile
          </h4>
          <div className="h-64 print:h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                <PolarGrid stroke="#35372E" />
                <PolarAngleAxis
                  dataKey="subject"
                  stroke="#8B8C7F"
                  fontSize={10}
                  fontFamily="IBM Plex Sans, sans-serif"
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 'auto']}
                  stroke="#454737"
                  fontSize={9}
                  tickCount={4}
                />
                <Radar
                  name="Coverage %"
                  dataKey="coverage"
                  stroke="#7FA35C"
                  fill="#7FA35C"
                  fillOpacity={0.25}
                  strokeWidth={1.5}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#22241E',
                    border: '1px solid #35372E',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'IBM Plex Sans, sans-serif',
                  }}
                  labelStyle={{ color: '#EDE8DB', fontWeight: 600 }}
                  itemStyle={{ color: '#7FA35C' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─ Treemap ─ */}
        <div className="bg-[#22241E] border border-[#35372E] p-3.5 rounded print:border-slate-300 print:bg-white">
          <h4 className="text-[11px] font-semibold text-[#8B8C7F] uppercase tracking-wider mb-3 print:text-slate-600">
            Proportional Class Areas (Treemap)
          </h4>
          <div className="h-64 print:h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#1B1D19"
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
        <div className="bg-[#22241E] border border-[#35372E] p-4 rounded space-y-4 print:border-slate-300 print:bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#35372E] pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#EDE8DB] uppercase tracking-wider">
                  Deep Learning LULC Transition Matrix
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4E6A3D]/30 text-[#7FA35C] border border-[#7FA35C]/40 mono">
                  {transitionData.transition_rate_percentage}% Shifted
                </span>
              </div>
              <p className="text-[11.5px] text-[#8B8C7F] mt-0.5">
                Full class-to-class flow distribution ({transitionData.total_transitioned_ha} ha converted).
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs mono">
              <span className={`px-2 py-0.5 rounded border ${transitionData.net_changes.urban_ha >= 0 ? 'bg-[#C8834C]/10 border-[#C8834C]/30 text-[#C8834C]' : 'bg-[#7FA35C]/10 border-[#7FA35C]/30 text-[#7FA35C]'}`}>
                Urban: {transitionData.net_changes.urban_ha >= 0 ? '+' : ''}{transitionData.net_changes.urban_ha} ha
              </span>
              <span className={`px-2 py-0.5 rounded border ${transitionData.net_changes.forest_ha < 0 ? 'bg-[#C56A5A]/10 border-[#C56A5A]/30 text-[#C56A5A]' : 'bg-[#7FA35C]/10 border-[#7FA35C]/30 text-[#7FA35C]'}`}>
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
                <div key={key} className="bg-[#1B1D19] border border-[#35372E] p-2 rounded">
                  <div className="text-[10px] uppercase font-semibold text-[#8B8C7F] truncate">{traj.label}</div>
                  <div className={`text-sm font-bold mono mt-1 ${isAlert && traj.area_ha > 0 ? 'text-[#C8834C]' : isGood ? 'text-[#7FA35C]' : 'text-[#EDE8DB]'}`}>
                    {traj.area_ha} ha
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Flows Table */}
          <div className="border border-[#35372E] rounded overflow-hidden">
            <div className="bg-[#2A2C24] px-3 py-1.5 text-[11px] font-semibold text-[#8B8C7F] uppercase tracking-wider flex justify-between">
              <span>Class Transition Flows</span>
              <span>Hectares (% Source)</span>
            </div>
            <div className="divide-y divide-[#35372E] max-h-48 overflow-y-auto">
              {transitionData.matrix.slice(0, 8).map((flow, i) => (
                <div key={i} className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#EDE8DB]">{flow.from_class}</span>
                    <span className="text-[#8B8C7F]">→</span>
                    <span className="font-semibold text-[#EDE8DB]">{flow.to_class}</span>
                    <span className={`text-[9.5px] px-1 rounded uppercase mono ${
                      flow.trajectory === 'stable' ? 'bg-[#7FA35C]/10 text-[#7FA35C]' :
                      flow.trajectory === 'urbanization' ? 'bg-[#C8834C]/15 text-[#C8834C]' :
                      flow.trajectory === 'deforestation' ? 'bg-[#C56A5A]/15 text-[#C56A5A]' :
                      'bg-[#35372E] text-[#8B8C7F]'
                    }`}>
                      {flow.trajectory}
                    </span>
                  </div>
                  <div className="mono tabular-nums text-right">
                    <span className="text-[#EDE8DB] font-medium">{flow.area_ha} ha</span>
                    <span className="text-[10.5px] text-[#8B8C7F] ml-1.5">({flow.pct_of_source}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────── Super-Resolution Intelligence Card ───────────── */}
      {superResData && (
        <div className="bg-[#22241E] border border-[#35372E] p-4 rounded space-y-3 print:border-slate-300 print:bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#35372E] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#419BDF] animate-pulse"></span>
              <span className="text-xs font-bold text-[#EDE8DB] uppercase tracking-wider">
                Sentinel-2 4× Super-Resolution ({superResData.super_resolution_m}m Synthetic)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#419BDF]/20 text-[#419BDF] border border-[#419BDF]/40 mono">
                +{superResData.metrics.sharpness_improvement_pct}% Sharpness
              </span>
            </div>
            <span className="text-[11px] text-[#8B8C7F] mono">
              {superResData.metrics.model_architecture}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#1B1D19] border border-[#35372E] p-2.5 rounded">
              <div className="text-[10.5px] text-[#8B8C7F] uppercase font-semibold">Native Resolution</div>
              <div className="text-base font-bold text-[#EDE8DB] mono mt-1">{superResData.native_resolution_m}m / px</div>
              <div className="text-[10px] text-[#8B8C7F]">Sentinel-2 Multispectral</div>
            </div>

            <div className="bg-[#1B1D19] border border-[#419BDF]/30 p-2.5 rounded">
              <div className="text-[10.5px] text-[#419BDF] uppercase font-semibold">Upscaled Resolution</div>
              <div className="text-base font-bold text-[#419BDF] mono mt-1">{superResData.super_resolution_m}m / px</div>
              <div className="text-[10px] text-[#419BDF]/80">4× Sub-pixel diffusion</div>
            </div>

            <div className="bg-[#1B1D19] border border-[#35372E] p-2.5 rounded">
              <div className="text-[10.5px] text-[#8B8C7F] uppercase font-semibold">PSNR Peak Signal</div>
              <div className="text-base font-bold text-[#7FA35C] mono mt-1">{superResData.metrics.estimated_psnr_db} dB</div>
              <div className="text-[10px] text-[#8B8C7F]">High fidelity reconstruction</div>
            </div>

            <div className="bg-[#1B1D19] border border-[#35372E] p-2.5 rounded">
              <div className="text-[10.5px] text-[#8B8C7F] uppercase font-semibold">SSIM Index</div>
              <div className="text-base font-bold text-[#EDE8DB] mono mt-1">{superResData.metrics.structural_similarity_ssim}</div>
              <div className="text-[10px] text-[#8B8C7F]">Structural similarity</div>
            </div>
          </div>

          {superResData.warning && (
            <div className="text-[11px] text-[#C8834C] bg-[#C8834C]/10 border border-[#C8834C]/30 p-2 rounded">
              {superResData.warning}
            </div>
          )}
        </div>
      )}

      {/* ───────────── Seasonal Water Dynamics & Flood Risk Card ───────────── */}
      {waterDynamicsData && (
        <div className="bg-[#22241E] border border-[#35372E] p-4 rounded space-y-4 print:border-slate-300 print:bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#35372E] pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7A87C6] animate-pulse"></span>
                <span className="text-xs font-bold text-[#EDE8DB] uppercase tracking-wider">
                  Hydrological Dynamics & Seasonal Water Extent
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7A87C6]/20 text-[#7A87C6] border border-[#7A87C6]/40 mono">
                  {waterDynamicsData.seasonal_fluctuation_pct}% Fluctuation
                </span>
              </div>
              <p className="text-[11.5px] text-[#8B8C7F] mt-0.5">
                Multi-temporal MNDWI water surface monitoring across dry and wet hydrological regimes.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs mono">
              <span className={`px-2 py-0.5 rounded border ${
                waterDynamicsData.flood_risk.rating === 'High' ? 'bg-[#C56A5A]/15 border-[#C56A5A]/30 text-[#C56A5A]' :
                waterDynamicsData.flood_risk.rating === 'Moderate' ? 'bg-[#C8834C]/15 border-[#C8834C]/30 text-[#C8834C]' :
                'bg-[#7FA35C]/15 border-[#7FA35C]/30 text-[#7FA35C]'
              }`}>
                Flood Risk: {waterDynamicsData.flood_risk.rating} ({waterDynamicsData.flood_risk.score})
              </span>
              <span className={`px-2 py-0.5 rounded border ${
                waterDynamicsData.drought_vulnerability.rating === 'Severe' ? 'bg-[#C56A5A]/15 border-[#C56A5A]/30 text-[#C56A5A]' :
                waterDynamicsData.drought_vulnerability.rating === 'Moderate' ? 'bg-[#C8834C]/15 border-[#C8834C]/30 text-[#C8834C]' :
                'bg-[#7FA35C]/15 border-[#7FA35C]/30 text-[#7FA35C]'
              }`}>
                Drought: {waterDynamicsData.drought_vulnerability.rating} ({waterDynamicsData.drought_vulnerability.score})
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-[#1B1D19] border border-[#35372E] p-2 rounded">
              <span className="text-[10px] text-[#8B8C7F] uppercase font-semibold">Mean Extent</span>
              <div className="text-sm font-bold text-[#EDE8DB] mono mt-0.5">{waterDynamicsData.mean_water_extent_ha} ha</div>
            </div>
            <div className="bg-[#1B1D19] border border-[#35372E] p-2 rounded">
              <span className="text-[10px] text-[#8B8C7F] uppercase font-semibold">Permanent Water</span>
              <div className="text-sm font-bold text-[#419BDF] mono mt-0.5">{waterDynamicsData.permanent_water_ha} ha</div>
            </div>
            <div className="bg-[#1B1D19] border border-[#35372E] p-2 rounded">
              <span className="text-[10px] text-[#8B8C7F] uppercase font-semibold">Seasonal Water</span>
              <div className="text-sm font-bold text-[#7A87C6] mono mt-0.5">{waterDynamicsData.seasonal_water_ha} ha</div>
            </div>
            <div className="bg-[#1B1D19] border border-[#35372E] p-2 rounded">
              <span className="text-[10px] text-[#8B8C7F] uppercase font-semibold">Peak High / Low</span>
              <div className="text-sm font-bold text-[#EDE8DB] mono mt-0.5">{waterDynamicsData.max_water_extent_ha} / {waterDynamicsData.min_water_extent_ha} ha</div>
            </div>
          </div>

          {/* Monthly Area Chart */}
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waterDynamicsData.monthly_series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#419BDF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#419BDF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2C24" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#8B8C7F', fontSize: 10 }} />
                <YAxis tick={{ fill: '#8B8C7F', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1B1D19',
                    border: '1px solid #35372E',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'monospace'
                  }}
                  formatter={(val: any) => [`${val} ha`, 'Water Area']}
                />
                <Area type="monotone" dataKey="water_area_ha" stroke="#419BDF" strokeWidth={2} fillOpacity={1} fill="url(#waterGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ───────────── Forest Canopy Height & Carbon Stock Card ───────────── */}
      {canopyHeightData && (
        <div className="bg-[#22241E] border border-[#35372E] p-4 rounded space-y-4 print:border-slate-300 print:bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#35372E] pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#397D49] animate-pulse"></span>
                <span className="text-xs font-bold text-[#EDE8DB] uppercase tracking-wider">
                  Canopy Height & Above-Ground Biomass Carbon
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#397D49]/20 text-[#7FA35C] border border-[#7FA35C]/40 mono">
                  {canopyHeightData.forest_area_ha} ha Forest
                </span>
              </div>
              <p className="text-[11.5px] text-[#8B8C7F] mt-0.5">
                GEDI spaceborne LiDAR regression model estimating vertical vegetation strata and carbon sinks.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs mono">
              <span className="px-2 py-0.5 rounded border bg-[#7FA35C]/15 border-[#7FA35C]/30 text-[#7FA35C]">
                Mean: {canopyHeightData.mean_canopy_height_m}m
              </span>
              <span className="px-2 py-0.5 rounded border bg-[#C8834C]/15 border-[#C8834C]/30 text-[#C8834C]">
                Old-Growth (&gt;25m): {canopyHeightData.old_growth_area_ha} ha
              </span>
            </div>
          </div>

          {/* Biomass and Carbon KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-[#1B1D19] border border-[#35372E] p-2.5 rounded">
              <div className="text-[10.5px] text-[#8B8C7F] uppercase font-semibold">Biomass Density</div>
              <div className="text-base font-bold text-[#EDE8DB] mono mt-0.5">
                {canopyHeightData.biomass_and_carbon.biomass_density_mg_ha} <span className="text-xs font-normal text-[#8B8C7F]">Mg / ha</span>
              </div>
            </div>

            <div className="bg-[#1B1D19] border border-[#35372E] p-2.5 rounded">
              <div className="text-[10.5px] text-[#8B8C7F] uppercase font-semibold">Total Stand Biomass</div>
              <div className="text-base font-bold text-[#7FA35C] mono mt-0.5">
                {canopyHeightData.biomass_and_carbon.total_biomass_tonnes.toLocaleString()} <span className="text-xs font-normal text-[#8B8C7F]">tonnes</span>
              </div>
            </div>

            <div className="bg-[#1B1D19] border border-[#397D49]/40 p-2.5 rounded col-span-2 sm:col-span-1">
              <div className="text-[10.5px] text-[#7FA35C] uppercase font-semibold">Carbon Stock</div>
              <div className="text-base font-bold text-[#7FA35C] mono mt-0.5">
                {canopyHeightData.biomass_and_carbon.carbon_stock_tonnes_co2e.toLocaleString()} <span className="text-xs font-normal text-[#8B8C7F]">t CO₂e</span>
              </div>
            </div>
          </div>

          {/* Strata Vertical Histogram */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-[#8B8C7F] uppercase tracking-wider">
              Vertical Strata Distribution
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={canopyHeightData.height_strata_distribution} layout="vertical" margin={{ top: 0, right: 20, left: 70, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2C24" horizontal={false} />
                  <XAxis type="number" unit="%" tick={{ fill: '#8B8C7F', fontSize: 10 }} />
                  <YAxis type="category" dataKey="stratum" tick={{ fill: '#EDE8DB', fontSize: 9.5 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1B1D19',
                      border: '1px solid #35372E',
                      borderRadius: 4,
                      fontSize: 11,
                      fontFamily: 'monospace'
                    }}
                    formatter={(val: any, name: any, item: any) => [`${val}% (${item.payload.area_ha} ha)`, 'Coverage']}
                  />
                  <Bar dataKey="percentage" fill="#397D49" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── Enhanced Data Table ───────────── */}
      <div className="bg-[#22241E] border border-[#35372E] rounded overflow-hidden print:border-slate-300 print:bg-white">
        <table className="w-full text-left text-xs border-collapse print:text-[10px]">
          <thead>
            <tr className="bg-[#2A2C24] text-[#8B8C7F] uppercase tracking-wider font-semibold border-b border-[#35372E] print:bg-slate-100 print:text-slate-600">
              <th className="py-2.5 px-3.5">Class</th>
              <th className="py-2.5 px-3.5 text-right">Area (ha)</th>
              <th className="py-2.5 px-3.5 text-right">Pixels</th>
              <th className="py-2.5 px-3.5 text-right w-44">Percentage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#35372E] print:divide-slate-200">
            {chartData.map((row) => (
              <tr
                key={row.name}
                className="hover:bg-white/[0.02] text-[#C7C6BA] font-medium transition-colors print:text-slate-800 print:hover:bg-transparent"
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
                <td className="py-2 px-3.5 text-right mono tabular-nums text-[#EDE8DB]">
                  {row.area.toLocaleString()}
                </td>
                <td className="py-2 px-3.5 text-right mono tabular-nums text-[#8B8C7F]">
                  {row.pixelCount.toLocaleString()}
                </td>
                <td className="py-2 px-3.5">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-24 h-1.5 bg-[#2A2C24] rounded-full overflow-hidden print:bg-slate-200 flex-shrink-0">
                      <div
                        className="h-full rounded-full transition-all duration-800 ease-out"
                        style={{
                          width: `${row.value}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                    <span className="mono tabular-nums w-10 text-right text-[11px] text-[#EDE8DB]">{row.value}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#2A2C24] text-[#EDE8DB] font-semibold border-t border-[#35372E] print:bg-slate-50 print:text-slate-800">
              <td className="py-2.5 px-3.5">Total</td>
              <td className="py-2.5 px-3.5 text-right mono tabular-nums">
                {totalArea?.toLocaleString() ?? '—'}
              </td>
              <td className="py-2.5 px-3.5 text-right mono tabular-nums text-[#8B8C7F]">
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

