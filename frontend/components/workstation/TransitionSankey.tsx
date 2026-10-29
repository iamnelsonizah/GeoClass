'use client';

import React, { useState, useMemo } from 'react';
import { LULC_COLORS } from './types';

export interface TransitionFlow {
  from_class: string;
  to_class: string;
  area_ha: number;
  pct_of_source: number;
  trajectory: string;
}

interface TransitionSankeyProps {
  matrix: TransitionFlow[];
  fromPeriod?: string;
  toPeriod?: string;
  height?: number;
}

export default function TransitionSankey({
  matrix,
  fromPeriod = 'Baseline',
  toPeriod = 'Target',
  height = 360,
}: TransitionSankeyProps) {
  const [selectedTrajectory, setSelectedTrajectory] = useState<string>('all');
  const [hoveredFlow, setHoveredFlow] = useState<TransitionFlow | null>(null);

  // Available unique trajectories for filter buttons
  const availableTrajectories = useMemo(() => {
    const set = new Set<string>();
    matrix.forEach((f) => {
      if (f.trajectory && f.trajectory !== 'stable') {
        set.add(f.trajectory);
      }
    });
    return Array.from(set);
  }, [matrix]);

  // Filter flows
  const filteredFlows = useMemo(() => {
    if (selectedTrajectory === 'all') {
      // Filter out negligible flows to keep diagram crisp
      return matrix.filter((f) => f.area_ha > 0.05);
    }
    if (selectedTrajectory === 'transitions_only') {
      return matrix.filter((f) => f.from_class !== f.to_class && f.area_ha > 0.05);
    }
    return matrix.filter((f) => f.trajectory === selectedTrajectory && f.area_ha > 0.05);
  }, [matrix, selectedTrajectory]);

  // Compute node totals and positions
  const { sourceNodes, targetNodes, ribbons, totalArea } = useMemo(() => {
    const srcTotals: Record<string, number> = {};
    const tgtTotals: Record<string, number> = {};
    let total = 0;

    filteredFlows.forEach((f) => {
      srcTotals[f.from_class] = (srcTotals[f.from_class] || 0) + f.area_ha;
      tgtTotals[f.to_class] = (tgtTotals[f.to_class] || 0) + f.area_ha;
      total += f.area_ha;
    });

    const width = 640;
    const svgHeight = height;
    const paddingY = 24;
    const nodeWidth = 14;
    const availableHeight = svgHeight - paddingY * 2;
    const gap = 12;

    const srcKeys = Object.keys(srcTotals).sort((a, b) => srcTotals[b] - srcTotals[a]);
    const tgtKeys = Object.keys(tgtTotals).sort((a, b) => tgtTotals[b] - tgtTotals[a]);

    const numSrcGaps = Math.max(0, srcKeys.length - 1);
    const numTgtGaps = Math.max(0, tgtKeys.length - 1);

    const effectiveSrcHeight = Math.max(20, availableHeight - numSrcGaps * gap);
    const effectiveTgtHeight = Math.max(20, availableHeight - numTgtGaps * gap);

    // Compute Source Node Rectangles
    let currSrcY = paddingY;
    const srcMap: Record<string, { x: number; y: number; h: number; area: number }> = {};
    srcKeys.forEach((key) => {
      const h = total > 0 ? Math.max(8, (srcTotals[key] / total) * effectiveSrcHeight) : 10;
      srcMap[key] = { x: 50, y: currSrcY, h, area: srcTotals[key] };
      currSrcY += h + gap;
    });

    // Compute Target Node Rectangles
    let currTgtY = paddingY;
    const tgtMap: Record<string, { x: number; y: number; h: number; area: number }> = {};
    tgtKeys.forEach((key) => {
      const h = total > 0 ? Math.max(8, (tgtTotals[key] / total) * effectiveTgtHeight) : 10;
      tgtMap[key] = { x: width - 50 - nodeWidth, y: currTgtY, h, area: tgtTotals[key] };
      currTgtY += h + gap;
    });

    // Offsets for ribbon stacking
    const srcOffsets: Record<string, number> = {};
    const tgtOffsets: Record<string, number> = {};
    Object.keys(srcMap).forEach((k) => (srcOffsets[k] = 0));
    Object.keys(tgtMap).forEach((k) => (tgtOffsets[k] = 0));

    // Sort flows so larger flows render cleanly
    const sortedFlows = [...filteredFlows].sort((a, b) => b.area_ha - a.area_ha);

    const ribbonList = sortedFlows.map((flow, index) => {
      const srcNode = srcMap[flow.from_class];
      const tgtNode = tgtMap[flow.to_class];
      if (!srcNode || !tgtNode) return null;

      const srcFraction = srcNode.area > 0 ? flow.area_ha / srcNode.area : 0;
      const tgtFraction = tgtNode.area > 0 ? flow.area_ha / tgtNode.area : 0;

      const ribbonSrcH = Math.max(1, srcFraction * srcNode.h);
      const ribbonTgtH = Math.max(1, tgtFraction * tgtNode.h);

      const y0 = srcNode.y + srcOffsets[flow.from_class];
      const y1 = tgtNode.y + tgtOffsets[flow.to_class];

      srcOffsets[flow.from_class] += ribbonSrcH;
      tgtOffsets[flow.to_class] += ribbonTgtH;

      const x0 = srcNode.x + nodeWidth;
      const x1 = tgtNode.x;
      const dx = (x1 - x0) * 0.45;

      // Cubic Bezier Ribbon Path
      const pathD = `
        M ${x0} ${y0}
        C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}
        L ${x1} ${y1 + ribbonTgtH}
        C ${x1 - dx} ${y1 + ribbonTgtH}, ${x0 + dx} ${y0 + ribbonSrcH}, ${x0} ${y0 + ribbonSrcH}
        Z
      `;

      return {
        id: `ribbon-${index}`,
        flow,
        pathD,
        srcColor: LULC_COLORS[flow.from_class] || '#8CA0AA',
        tgtColor: LULC_COLORS[flow.to_class] || '#8CA0AA',
      };
    }).filter((r): r is {
      id: string;
      flow: TransitionFlow;
      pathD: string;
      srcColor: string;
      tgtColor: string;
    } => r !== null);

    return {
      sourceNodes: Object.entries(srcMap).map(([name, data]) => ({ name, ...data })),
      targetNodes: Object.entries(tgtMap).map(([name, data]) => ({ name, ...data })),
      ribbons: ribbonList,
      totalArea: total,
    };
  }, [filteredFlows, height]);

  if (matrix.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-[#69706A] font-mono">
        No transition matrix available for the selected comparison periods.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header and Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8D5CA] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D9622B]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#1A1D23]">
            LULC Transition Dynamics (Sankey Matrix)
          </span>
          <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-[#F4F1E8] border border-[#D8D5CA] text-[#69706A]">
            {fromPeriod} → {toPeriod}
          </span>
        </div>

        {/* Trajectory Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono">
          <button
            onClick={() => setSelectedTrajectory('all')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              selectedTrajectory === 'all'
                ? 'bg-[#1A1D23] text-white border-[#1A1D23]'
                : 'bg-[#FAF9F5] text-[#69706A] border-[#D8D5CA] hover:bg-[#F4F1E8]'
            }`}
          >
            All Flows
          </button>
          <button
            onClick={() => setSelectedTrajectory('transitions_only')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              selectedTrajectory === 'transitions_only'
                ? 'bg-[#D9622B] text-white border-[#D9622B]'
                : 'bg-[#FAF9F5] text-[#D9622B] border-[#D8D5CA] hover:bg-[#F3DFD3]'
            }`}
          >
            Changes Only
          </button>
          {availableTrajectories.map((traj) => (
            <button
              key={traj}
              onClick={() => setSelectedTrajectory(traj)}
              className={`px-2 py-0.5 rounded border capitalize transition-colors ${
                selectedTrajectory === traj
                  ? 'bg-[#D9622B] text-white border-[#D9622B]'
                  : 'bg-[#FAF9F5] text-[#69706A] border-[#D8D5CA] hover:bg-[#F4F1E8]'
              }`}
            >
              {traj}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Diagram Canvas */}
      <div className="relative border border-[#D8D5CA] rounded bg-[#FAF9F5] overflow-hidden">
        {/* Floating Tooltip */}
        {hoveredFlow && (
          <div className="absolute top-2 right-2 pointer-events-none z-10 bg-[#1A1D23]/95 text-white p-2 rounded shadow-md text-xs font-mono space-y-1 border border-white/10 max-w-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: LULC_COLORS[hoveredFlow.from_class] || '#8CA0AA' }}
              />
              <span>{hoveredFlow.from_class}</span>
              <span className="text-white/60">→</span>
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: LULC_COLORS[hoveredFlow.to_class] || '#8CA0AA' }}
              />
              <span>{hoveredFlow.to_class}</span>
            </div>
            <div className="flex justify-between gap-4 text-[11px] text-[#FAF9F5]/80">
              <span>Transitioned Area:</span>
              <span className="text-white font-bold">{hoveredFlow.area_ha.toLocaleString()} ha</span>
            </div>
            <div className="flex justify-between gap-4 text-[11px] text-[#FAF9F5]/80">
              <span>Share of {hoveredFlow.from_class}:</span>
              <span className="text-white font-bold">{hoveredFlow.pct_of_source}%</span>
            </div>
            <div className="text-[10px] text-[#D9622B] uppercase tracking-wider pt-0.5">
              Trajectory: {hoveredFlow.trajectory}
            </div>
          </div>
        )}

        {/* Labels for Baseline and Target Columns */}
        <div className="flex justify-between px-12 pt-2 text-[10px] uppercase font-bold text-[#69706A] tracking-wider">
          <span>{fromPeriod} (Baseline Origin)</span>
          <span>{toPeriod} (Target Destination)</span>
        </div>

        <svg
          viewBox={`0 0 640 ${height}`}
          className="w-full h-auto block select-none"
          style={{ maxHeight: height }}
        >
          <defs>
            {ribbons.map((r, i) => (
              <linearGradient
                key={`grad-${i}`}
                id={`grad-${i}`}
                gradientUnits="userSpaceOnUse"
                x1="64"
                y1="0"
                x2="576"
                y2="0"
              >
                <stop offset="0%" stopColor={r.srcColor} stopOpacity={0.7} />
                <stop offset="100%" stopColor={r.tgtColor} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>

          {/* Ribbons */}
          <g>
            {ribbons.map((r, i) => {
              const isHovered = hoveredFlow === r.flow;
              return (
                <path
                  key={r.id}
                  d={r.pathD}
                  fill={`url(#grad-${i})`}
                  opacity={hoveredFlow ? (isHovered ? 0.95 : 0.15) : 0.65}
                  stroke={isHovered ? '#1A1D23' : 'none'}
                  strokeWidth={isHovered ? 1.5 : 0}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredFlow(r.flow)}
                  onMouseLeave={() => setHoveredFlow(null)}
                />
              );
            })}
          </g>

          {/* Source Nodes (Left Column) */}
          <g>
            {sourceNodes.map((node) => (
              <g key={`src-${node.name}`}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={14}
                  height={node.h}
                  rx={2}
                  fill={LULC_COLORS[node.name] || '#8CA0AA'}
                  stroke="#1A1D23"
                  strokeWidth={1}
                />
                <text
                  x={node.x - 6}
                  y={node.y + node.h / 2 + 3}
                  textAnchor="end"
                  fontSize={9.5}
                  fontFamily="IBM Plex Sans, sans-serif"
                  fontWeight={600}
                  fill="#1A1D23"
                >
                  {node.name}
                </text>
              </g>
            ))}
          </g>

          {/* Target Nodes (Right Column) */}
          <g>
            {targetNodes.map((node) => (
              <g key={`tgt-${node.name}`}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={14}
                  height={node.h}
                  rx={2}
                  fill={LULC_COLORS[node.name] || '#8CA0AA'}
                  stroke="#1A1D23"
                  strokeWidth={1}
                />
                <text
                  x={node.x + 14 + 6}
                  y={node.y + node.h / 2 + 3}
                  textAnchor="start"
                  fontSize={9.5}
                  fontFamily="IBM Plex Sans, sans-serif"
                  fontWeight={600}
                  fill="#1A1D23"
                >
                  {node.name}
                </text>
              </g>
            ))}
          </g>
        </svg>

        <div className="px-4 py-2 bg-[#F4F1E8] border-t border-[#D8D5CA] flex items-center justify-between text-[11px] text-[#69706A] font-mono">
          <span>Active Flow Volume: {totalArea.toLocaleString()} ha</span>
          <span>Hover ribbon to inspect exact trajectory metrics</span>
        </div>
      </div>
    </div>
  );
}
