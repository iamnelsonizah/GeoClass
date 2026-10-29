'use client';

import React from 'react';
import { Compass, Save, Folder, Maximize2, Minimize2, LayoutGrid, Layers, Share2, Database, CloudSun } from 'lucide-react';
import { calculateAOIArea, MAX_AOI_HA } from './utils';

interface TelemetryBarProps {
  geeConnected: boolean | null;
  loadingMapId: boolean;
  loadingClassify: boolean;
  coords: number[][];
  startDate: string;
  endDate: string;
  cloudCover: number;
  readyLayersCount: number;
  totalLayersCount: number;
  processingTime: number | null;
  savedWorkspacesCount: number;
  isFullscreen: boolean;
  rightRailCollapsed: boolean;
  analyticsExpanded: boolean;
  customTrainingCount?: number;
  onOpenStudyMap: () => void;
  onOpenSaveModal: () => void;
  onOpenSavedLibrary: () => void;
  onOpenCustomTraining?: () => void;
  onOpenCloudShare?: () => void;
  onOpenClimate?: () => void;
  onToggleFullscreen: () => void;
  onToggleAnalyticsDrawer: () => void;
  onToggleLayersRail: () => void;
}

export function TelemetryBar({
  geeConnected,
  loadingMapId,
  loadingClassify,
  coords,
  startDate,
  endDate,
  cloudCover,
  readyLayersCount,
  totalLayersCount,
  processingTime,
  savedWorkspacesCount,
  isFullscreen,
  rightRailCollapsed,
  analyticsExpanded,
  customTrainingCount = 0,
  onOpenStudyMap,
  onOpenSaveModal,
  onOpenSavedLibrary,
  onOpenCustomTraining,
  onOpenCloudShare,
  onOpenClimate,
  onToggleFullscreen,
  onToggleAnalyticsDrawer,
  onToggleLayersRail,
}: TelemetryBarProps) {
  const aoiArea = calculateAOIArea(coords);
  const isOverLimit = aoiArea > MAX_AOI_HA;

  return (
    <div className="flex items-center justify-between px-3 sm:px-5 py-1.5 sm:py-2 bg-[#FAF9F5] border-b border-[#D8D5CA] text-xs select-none overflow-x-auto scrollbar-none">
      {/* Telemetry Metrics */}
      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto py-0.5 flex-shrink-0">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#8A908A] font-mono leading-tight">STATUS</div>
          <div className="flex items-center gap-1.5 font-medium text-[#1A1D23]">
            <span className={`w-2 h-2 rounded-full ${geeConnected === false ? 'bg-[#A84E42]' : 'bg-[#D9622B]'}`}></span>
            <span>{loadingMapId ? 'Preparing imagery' : loadingClassify ? 'Classifying' : geeConnected === false ? 'Disconnected' : 'Ready'}</span>
          </div>
        </div>

        {coords.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#8A908A] font-mono leading-tight">AOI AREA</div>
            <div className="font-mono text-[#1A1D23] font-medium flex items-center gap-1.5">
              <span className={isOverLimit ? 'text-[#C56A5A] font-bold' : ''}>
                {aoiArea.toFixed(1)} ha
              </span>
              {isOverLimit && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C56A5A]/20 text-[#C56A5A] uppercase font-bold tracking-tight">
                  EXCEEDS 50K HA LIMIT
                </span>
              )}
            </div>
          </div>
        )}

        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#8A908A] font-mono leading-tight">DATE WINDOW</div>
          <div className="font-mono text-[#1A1D23] font-medium">{startDate} → {endDate}</div>
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#8A908A] font-mono leading-tight">CLOUD COVER</div>
          <div className="font-mono text-[#1A1D23] font-medium">{cloudCover}% Max</div>
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#8A908A] font-mono leading-tight">ACTIVE LAYERS</div>
          <div className="font-mono text-[#1A1D23] font-medium">{readyLayersCount > 0 ? readyLayersCount : 6} / {totalLayersCount}</div>
        </div>

        {processingTime !== null && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#8A908A] font-mono leading-tight">EXEC TIME</div>
            <div className="font-mono text-[#1A1D23] font-medium">{processingTime}s</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pl-2">
        {/* Study Area Map Generator */}
        <button 
          type="button"
          onClick={onOpenStudyMap}
          className="px-2 sm:px-2.5 py-1 rounded border border-[#D8D5CA] bg-[#FAF9F5] hover:bg-[#F4F1E8] text-[#1A1D23] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium shadow-2xs"
          title="Generate Publication-Ready Study Area Map"
        >
          <Compass className="w-3.5 h-3.5 text-[#D9622B]" />
          <span className="hidden sm:inline">Study Map</span>
        </button>

        {/* User Custom Training Field Samples */}
        {onOpenCustomTraining && (
          <button 
            type="button"
            onClick={onOpenCustomTraining}
            className={`px-2 sm:px-2.5 py-1 rounded border transition cursor-pointer flex items-center gap-1.5 text-xs font-medium shadow-2xs ${
              customTrainingCount > 0
                ? 'bg-[#E4E9DF] text-[#6F8060] border-[#6F8060]/40 font-bold'
                : 'bg-[#FAF9F5] text-[#1A1D23] border-[#D8D5CA] hover:bg-[#F4F1E8]'
            }`}
            title="Upload or manage custom ground-truth training points/polygons"
          >
            <Database className="w-3.5 h-3.5 text-[#D9622B]" />
            <span className="hidden sm:inline">
              {customTrainingCount > 0 ? `Field Data (${customTrainingCount})` : 'Field Data'}
            </span>
          </button>
        )}

        {/* ERA5 Climate Context */}
        {onOpenClimate && (
          <button 
            type="button"
            onClick={onOpenClimate}
            className="px-2 sm:px-2.5 py-1 rounded border border-[#D8D5CA] bg-[#FAF9F5] hover:bg-[#F4F1E8] text-[#1A1D23] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium shadow-2xs"
            title="Analyze ECMWF ERA5 Climate and Weather Context"
          >
            <CloudSun className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span className="hidden sm:inline">ERA5 Climate</span>
          </button>
        )}

        {/* Cloud-Saved Projects & Share Permalink */}
        {onOpenCloudShare && (
          <button 
            type="button"
            onClick={onOpenCloudShare}
            disabled={coords.length === 0}
            className={`px-2 sm:px-2.5 py-1 rounded border transition cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
              coords.length > 0 
                ? 'bg-[#D9622B] text-white border-[#D9622B] hover:bg-[#B84E1C] shadow-2xs' 
                : 'text-[#8A908A] border-[#E5E5E0] cursor-not-allowed opacity-60'
            }`}
            title="Save to Cloud & Generate Shareable Permalink"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {/* Save Analysis State */}
        <button 
          type="button"
          onClick={onOpenSaveModal}
          disabled={coords.length === 0}
          className={`px-2 sm:px-2.5 py-1 rounded border transition cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
            coords.length > 0 
              ? 'bg-[#FAF9F5] text-[#1A1D23] border-[#D8D5CA] hover:bg-[#F4F1E8] shadow-2xs' 
              : 'text-[#8A908A] border-[#E5E5E0] cursor-not-allowed opacity-60'
          }`}
          title={coords.length > 0 ? "Save Current Analysis State" : "Select an AOI to save analysis"}
        >
          <Save className="w-3.5 h-3.5 text-[#D9622B]" />
          <span className="hidden sm:inline">Save</span>
        </button>

        {/* Saved Analyses Library */}
        <button 
          type="button"
          onClick={onOpenSavedLibrary}
          className="px-2 sm:px-2.5 py-1 rounded border border-[#D8D5CA] bg-transparent text-[#69706A] hover:text-[#1A1D23] hover:bg-[#F4F1E8] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          title="Open Saved Analyses Library"
        >
          <Folder className="w-3.5 h-3.5 text-[#69706A]" />
          <span className="hidden md:inline">Saved ({savedWorkspacesCount})</span>
        </button>

        {/* Toggle Analytics Drawer */}
        <button 
          type="button"
          onClick={onToggleAnalyticsDrawer}
          className="p-1 hover:bg-[#F4F1E8] rounded text-[#69706A] hover:text-[#1A1D23] transition cursor-pointer"
          title="Toggle Analytics Drawer"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* Toggle Layers Rail */}
        <button 
          type="button"
          onClick={onToggleLayersRail}
          className={`px-2 sm:px-2.5 py-1 rounded border transition cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
            !rightRailCollapsed 
              ? 'bg-[#FAF9F5] text-[#D9622B] border-[#D9622B]/40 shadow-xs' 
              : 'bg-transparent text-[#69706A] border-[#D8D5CA] hover:text-[#1A1D23] hover:bg-[#F4F1E8]'
          }`}
          title={rightRailCollapsed ? "Open Layers & Tools" : "Collapse Layers & Tools"}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Layers &amp; Tools</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1 rounded border border-[#D8D5CA] text-[#69706A] hover:text-[#1A1D23] hover:bg-[#F4F1E8] transition cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Workspace"}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
