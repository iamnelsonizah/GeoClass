'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
  Legend,
  LabelList,
} from 'recharts';

/* ─── Interfaces ─────────────────────────────────────────────── */

interface ClassData {
  id: number;
  area_ha: number;
  pixel_count: number;
  percentage: number;
}

interface DashboardChartsProps {
  statistics?: Record<string, ClassData>;
  totalArea?: number;
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
      // ease-out cubic
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
    <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4 print:border-slate-300 print:bg-white transition-all duration-300 hover:border-slate-700/80">
      <div className={`p-3 rounded-lg border ${accentClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold print:text-slate-600 truncate">
          {label}
        </p>
        <p className="text-xl font-bold text-slate-100 mt-0.5 print:text-slate-900 tabular-nums">
          {value}
          {suffix && <span className="text-sm font-medium text-slate-400 ml-1">{suffix}</span>}
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
        rx={4}
        ry={4}
        style={{
          fill: color,
          stroke: '#0f172a',
          strokeWidth: 2,
          opacity: 0.92,
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
              fill: '#fff',
              fontWeight: 700,
              textShadow: '0 1px 3px rgba(0,0,0,.5)',
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
              fill: 'rgba(255,255,255,.75)',
              fontWeight: 500,
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
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (value < 3) return null; // skip tiny slices

  return (
    <text
      x={x}
      y={y}
      fill="#cbd5e1"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-[10px] font-medium print:fill-slate-700"
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
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl text-slate-200 print:hidden">
        <p className="text-xs font-bold flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: data.color }}
          />
          {data.name}
        </p>
        <p className="text-xs mt-1 text-slate-400">
          Area:{' '}
          <span className="text-slate-100 font-semibold">
            {data.area?.toLocaleString() ?? '—'} ha
          </span>
        </p>
        <p className="text-xs text-slate-400">
          Share:{' '}
          <span className="text-slate-100 font-semibold">{data.value}%</span>
        </p>
        {data.pixelCount != null && (
          <p className="text-xs text-slate-400">
            Pixels:{' '}
            <span className="text-slate-100 font-semibold">
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
          color: LULC_COLORS[name] || '#64748b',
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
  const animPixels = useAnimatedNumber(totalPixels, 1400);

  /* ── Entrance animation ── */
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  /* ── Empty state ── */
  if (!statistics || Object.keys(statistics).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
        <svg
          className="w-16 h-16 mb-4 stroke-slate-700 fill-none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z"
          />
        </svg>
        <p className="text-sm font-medium">No classification data available</p>
        <p className="text-xs text-slate-600 mt-1">
          Draw an AOI and run the classifier
        </p>
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 transition-all duration-700 print:space-y-4 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* ───────────── Summary Stat Cards ───────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
        <StatCard
          label="Total Area"
          value={animArea}
          suffix="ha"
          accentClass="bg-blue-500/10 border-blue-500/20 text-blue-400"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          accentClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          accentClass="bg-amber-500/10 border-amber-500/20 text-amber-400"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          accentClass="bg-purple-500/10 border-purple-500/20 text-purple-400"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* ───────────── Charts Grid (2×2) ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-2 print:gap-3">
        {/* ─ Pie Chart ─ */}
        <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-xl print:border-slate-300 print:bg-white">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 print:text-slate-600">
            Land Use Share (%)
          </h4>
          <div className="h-72 print:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderPieLabel}
                  animationBegin={0}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} stroke="#0f172a" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─ Bar Chart ─ */}
        <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-xl print:border-slate-300 print:bg-white">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 print:text-slate-600">
            Class Coverage Area (ha)
          </h4>
          <div className="h-72 print:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="area"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
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
        <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-xl print:border-slate-300 print:bg-white">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 print:text-slate-600">
            Multi-Class Radar Profile
          </h4>
          <div className="h-72 print:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis
                  dataKey="subject"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 'auto']}
                  stroke="#475569"
                  fontSize={9}
                  tickCount={4}
                />
                <Radar
                  name="Coverage %"
                  dataKey="coverage"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                  itemStyle={{ color: '#38bdf8' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─ Treemap ─ */}
        <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-xl print:border-slate-300 print:bg-white">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 print:text-slate-600">
            Proportional Class Areas (Treemap)
          </h4>
          <div className="h-72 print:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#0f172a"
                animationDuration={1000}
                animationEasing="ease-out"
                content={<TreemapContent />}
              />
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ───────────── Enhanced Data Table ───────────── */}
      <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl overflow-hidden print:border-slate-300 print:bg-white">
        <table className="w-full text-left text-xs border-collapse print:text-[10px]">
          <thead>
            <tr className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 print:bg-slate-100 print:text-slate-600">
              <th className="py-3 px-4">Class</th>
              <th className="py-3 px-4 text-right">Area (ha)</th>
              <th className="py-3 px-4 text-right">Pixels</th>
              <th className="py-3 px-4 text-right w-48">Percentage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
            {chartData.map((row) => (
              <tr
                key={row.name}
                className="hover:bg-slate-800/20 text-slate-300 font-medium transition-colors print:text-slate-800 print:hover:bg-transparent"
              >
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0 ring-1 ring-white/10"
                      style={{ backgroundColor: row.color }}
                    />
                    <span>{row.name}</span>
                  </div>
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  {row.area.toLocaleString()}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums text-slate-400">
                  {row.pixelCount.toLocaleString()}
                </td>
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden print:bg-slate-200 flex-shrink-0">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${row.value}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                    <span className="tabular-nums w-12 text-right">{row.value}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900/60 text-slate-300 font-bold border-t border-slate-700 print:bg-slate-50 print:text-slate-800">
              <td className="py-2.5 px-4">Total</td>
              <td className="py-2.5 px-4 text-right tabular-nums">
                {totalArea?.toLocaleString() ?? '—'}
              </td>
              <td className="py-2.5 px-4 text-right tabular-nums text-slate-400">
                {totalPixels.toLocaleString()}
              </td>
              <td className="py-2.5 px-4 text-right tabular-nums">100%</td>
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
