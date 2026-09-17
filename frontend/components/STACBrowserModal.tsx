'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Calendar,
  Cloud,
  X,
  Search,
  CheckCircle2,
  ExternalLink,
  Satellite,
  Compass,
  Database,
  ArrowRight,
  Info,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';

export interface STACScene {
  id: string;
  collection: string;
  platform: string;
  datetime?: string;
  acquisition_datetime?: string;
  date?: string;
  cloud_cover: number | null;
  resolution_m: number;
  bands?: string[];
  bounds?: number[][];
  thumbnail_url?: string;
  properties?: Record<string, any>;
}

interface STACBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  aoiCoords: number[][] | null;
  startDate: string;
  endDate: string;
  apiBase?: string;
  onApplySceneSettings?: (startDate: string, endDate: string, sensor: string) => void;
}

const AVAILABLE_COLLECTIONS = [
  { id: 'sentinel-2', name: 'Sentinel-2 MSI', org: 'Copernicus / ESA', res: '10m', type: 'optical', badge: '#306840' },
  { id: 'landsat-8', name: 'Landsat 8 OLI/TIRS', org: 'USGS / NASA', res: '30m', type: 'optical', badge: '#2980b9' },
  { id: 'landsat-9', name: 'Landsat 9 OLI-2', org: 'USGS / NASA', res: '30m', type: 'optical', badge: '#16a085' },
  { id: 'sentinel-1', name: 'Sentinel-1 C-SAR', org: 'Copernicus / ESA', res: '10m', type: 'radar', badge: '#8e44ad' }
];

export function STACBrowserModal({
  isOpen,
  onClose,
  aoiCoords,
  startDate: initialStart,
  endDate: initialEnd,
  apiBase,
  onApplySceneSettings
}: STACBrowserModalProps) {
  const [selectedCollections, setSelectedCollections] = useState<string[]>([
    'sentinel-2',
    'landsat-8',
    'landsat-9',
    'sentinel-1'
  ]);
  const [startDate, setStartDate] = useState(initialStart || '2024-01-01');
  const [endDate, setEndDate] = useState(initialEnd || '2024-12-31');
  const [maxCloud, setMaxCloud] = useState<number>(30);
  const [scenes, setScenes] = useState<STACScene[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<STACScene | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'optical' | 'radar'>('all');

  useEffect(() => {
    if (initialStart) setStartDate(initialStart);
    if (initialEnd) setEndDate(initialEnd);
  }, [initialStart, initialEnd]);

  useEffect(() => {
    if (isOpen && aoiCoords && aoiCoords.length >= 3) {
      handleSearch();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCollectionToggle = (colId: string) => {
    if (selectedCollections.includes(colId)) {
      if (selectedCollections.length > 1) {
        setSelectedCollections(selectedCollections.filter(c => c !== colId));
      }
    } else {
      setSelectedCollections([...selectedCollections, colId]);
    }
  };

  const handleSearch = async () => {
    if (!aoiCoords || aoiCoords.length < 3) {
      setError('Please draw an Area of Interest on the map before searching satellite scenes.');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedScene(null);

    const rawApiBase = (
      apiBase ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:8000'
    ).trim();
    const normalizedApiBase =
      rawApiBase.startsWith('http://') || rawApiBase.startsWith('https://')
        ? rawApiBase
        : `https://${rawApiBase}`;
    const backendUrl = normalizedApiBase.replace(/\/$/, '');

    try {
      const res = await fetch(`${backendUrl}/api/stac/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords: aoiCoords,
          start_date: startDate,
          end_date: endDate,
          collections: selectedCollections,
          max_cloud_cover: maxCloud,
          limit: 30
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Search failed with status ${res.status}`);
      }

      const data = await res.json();
      
      // Defensively extract feature array from all potential response structures
      let parsedScenes: STACScene[] = [];
      if (Array.isArray(data?.features)) {
        parsedScenes = data.features;
      } else if (data?.features && Array.isArray(data.features.features)) {
        parsedScenes = data.features.features;
      } else if (Array.isArray(data)) {
        parsedScenes = data;
      }

      setScenes(parsedScenes);
      if (parsedScenes.length > 0) {
        setSelectedScene(parsedScenes[0]);
      } else {
        setSelectedScene(null);
      }
    } catch (err: any) {
      console.error('STAC query error:', err);
      setError(err.message || 'Failed to query STAC catalog scenes.');
      setScenes([]);
    } finally {
      setLoading(false);
    }
  };

  const safeScenes = Array.isArray(scenes) ? scenes : [];
  const filteredScenes = safeScenes.filter(s => {
    if (!s || !s.collection) return false;
    if (filterType === 'optical') {
      return s.collection.includes('sentinel-2') || s.collection.includes('landsat');
    }
    if (filterType === 'radar') {
      return s.collection.includes('sentinel-1');
    }
    return true;
  });

  const handleApplyScene = (scene: STACScene) => {
    if (!onApplySceneSettings) return;

    // Extract acquisition date safely
    const rawDate = scene.date || scene.datetime || scene.acquisition_datetime;
    const sceneDate = rawDate ? new Date(rawDate) : new Date();
    
    // Determine target date window around scene acquisition date (plus/minus 15 days)
    const startWindow = new Date(sceneDate);
    startWindow.setDate(sceneDate.getDate() - 15);
    const endWindow = new Date(sceneDate);
    endWindow.setDate(sceneDate.getDate() + 15);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const targetSensor = (scene.collection || '').includes('landsat') ? 'landsat' : 'sentinel_2';

    onApplySceneSettings(fmt(startWindow), fmt(endWindow), targetSensor);
    onClose();
  };

  const getSceneDisplayDate = (scene: STACScene): string => {
    if (scene.date) return scene.date;
    if (scene.acquisition_datetime) return scene.acquisition_datetime.split(' ')[0];
    if (scene.datetime) {
      return scene.datetime.includes('T') ? scene.datetime.split('T')[0] : scene.datetime.split(' ')[0];
    }
    return '';
  };

  const getSceneFullDatetime = (scene: STACScene): string => {
    return (scene.acquisition_datetime || scene.datetime || scene.date || '')
      .replace('T', ' ')
      .replace('Z', ' UTC');
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded w-full max-w-5xl h-[92vh] max-h-[850px] shadow-xl flex flex-col overflow-hidden text-[#1A1D23] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 bg-[#F4F1E8] border-b border-[#D8D5CA]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#FAF9F5] border border-[#D8D5CA] flex items-center justify-center text-[#D9622B]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-[#1A1D23]">STAC Catalog Browser</h3>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-[#FAF9F5] text-[#454B46] font-mono border border-[#D8D5CA]">
                  Open EO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#69706A] line-clamp-1">
                Query Sentinel-2, Landsat 8/9 &amp; Sentinel-1 granules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#69706A] hover:text-[#1A1D23] hover:bg-[#FAF9F5] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-3.5 sm:px-5 py-2.5 bg-[#FAF9F5] border-b border-[#D8D5CA] flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Collections Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#69706A] text-[11px] mr-1 flex items-center gap-1 font-medium">
              <Satellite className="w-3.5 h-3.5 text-[#D9622B]" /> Constellations:
            </span>
            {AVAILABLE_COLLECTIONS.map(col => {
              const active = selectedCollections.includes(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => handleCollectionToggle(col.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition border flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-[#F3DFD3] border-[#D9622B] text-[#1A1D23]'
                      : 'bg-[#FAF9F5] border-[#D8D5CA] text-[#69706A] hover:text-[#1A1D23]'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: active ? '#D9622B' : '#8A908A' }}
                  />
                  {col.name} ({col.res})
                </button>
              );
            })}
          </div>

          {/* Date and Cloud Cover Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-[#F4F1E8] border border-[#D8D5CA] rounded px-2 py-1">
              <Calendar className="w-3 h-3 text-[#69706A]" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-[11px] text-[#1A1D23] focus:outline-none w-24 sm:w-auto"
              />
              <span className="text-[#8A908A]">→</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-[11px] text-[#1A1D23] focus:outline-none w-24 sm:w-auto"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#F4F1E8] border border-[#D8D5CA] rounded px-2 py-1">
              <Cloud className="w-3 h-3 text-[#69706A]" />
              <input
                type="number"
                min="0"
                max="100"
                value={maxCloud}
                onChange={e => setMaxCloud(Number(e.target.value))}
                className="w-10 bg-transparent text-[11px] text-right text-[#1A1D23] focus:outline-none"
              />
              <span className="text-[10px] text-[#8A908A]">%</span>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-3.5 py-1 rounded bg-[#D9622B] hover:bg-[#AD5630] text-white font-medium text-[11px] flex items-center gap-1.5 transition shadow-none disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" /> Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Side: Scene List */}
          <div className="w-full md:w-7/12 h-1/2 md:h-auto border-b md:border-b-0 md:border-r border-[#D8D5CA] flex flex-col bg-[#FAF9F5]">
            {/* Filter Sub-bar */}
            <div className="px-4 py-2 bg-[#F4F1E8] border-b border-[#D8D5CA] flex items-center justify-between text-[11px]">
              <span className="text-[#69706A]">
                {loading ? 'Searching catalog...' : `${filteredScenes.length} granules available`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                    filterType === 'all' ? 'bg-[#FAF9F5] border border-[#D8D5CA] text-[#1A1D23] font-semibold' : 'text-[#69706A] hover:text-[#1A1D23]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('optical')}
                  className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                    filterType === 'optical' ? 'bg-[#FAF9F5] border border-[#D8D5CA] text-[#1A1D23] font-semibold' : 'text-[#69706A] hover:text-[#1A1D23]'
                  }`}
                >
                  Optical
                </button>
                <button
                  onClick={() => setFilterType('radar')}
                  className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                    filterType === 'radar' ? 'bg-[#FAF9F5] border border-[#D8D5CA] text-[#1A1D23] font-semibold' : 'text-[#69706A] hover:text-[#1A1D23]'
                  }`}
                >
                  Radar
                </button>
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="m-4 p-3 bg-[#FDF2F0] border border-[#A84E42] rounded text-xs text-[#A84E42]">
                {error}
              </div>
            )}

            {/* Empty or loading state */}
            {!loading && filteredScenes.length === 0 && !error && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#69706A]">
                <Satellite className="w-10 h-10 mb-2 opacity-40 text-[#D9622B]" />
                <p className="text-xs font-medium text-[#1A1D23]">No granules found for the specified criteria.</p>
                <p className="text-[11px] mt-1 max-w-xs text-[#8A908A]">
                  Try expanding the date range, increasing maximum cloud cover, or selecting more constellations.
                </p>
              </div>
            )}

            {/* Scene Scroll List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#D8D5CA] p-2 space-y-1">
              {filteredScenes.map((scene) => {
                const isSelected = selectedScene?.id === scene.id;
                const isRadar = (scene.collection || '').includes('sentinel-1');
                const isLandsat = (scene.collection || '').includes('landsat');
                const bandsList = scene.bands || [];

                return (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedScene(scene)}
                    className={`p-3 rounded cursor-pointer transition border ${
                      isSelected
                        ? 'bg-[#F3DFD3] border-[#D9622B]'
                        : 'bg-[#FAF9F5] border-[#D8D5CA] hover:bg-[#F4F1E8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isRadar
                              ? 'bg-[#FAF9F5] border-[#416B73] text-[#416B73]'
                              : isLandsat
                              ? 'bg-[#FAF9F5] border-[#B68A3A] text-[#B68A3A]'
                              : 'bg-[#E4E9DF] border-[#6F8060] text-[#6F8060]'
                          }`}
                        >
                          {scene.platform}
                        </span>
                        <span className="text-[10px] text-[#69706A] font-mono">
                          {scene.resolution_m}m GSD
                        </span>
                      </div>
                      <span className="text-[11px] text-[#1A1D23] font-mono font-medium">
                        {getSceneDisplayDate(scene)}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-[#454B46] mt-1.5 truncate">
                      {scene.id}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D8D5CA] text-[10px]">
                      <div className="flex items-center gap-3">
                        {scene.cloud_cover !== null && scene.cloud_cover !== undefined ? (
                          <span className="flex items-center gap-1 text-[#69706A]">
                            <Cloud className="w-3 h-3" />
                            {scene.cloud_cover.toFixed(1)}% cloud
                          </span>
                        ) : (
                          <span className="text-[#416B73]">SAR Microwave</span>
                        )}
                        <span className="text-[#8A908A]">
                          {bandsList.length} bands
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyScene(scene);
                        }}
                        className="px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#D8D5CA] hover:bg-[#D9622B] hover:border-[#D9622B] hover:text-white text-[#1A1D23] flex items-center gap-1 transition cursor-pointer"
                      >
                        Load <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Detailed Granule Inspector */}
          <div className="w-full md:w-5/12 h-1/2 md:h-auto bg-[#F4F1E8] flex flex-col p-3 sm:p-5 overflow-y-auto">
            {selectedScene ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-[#D8D5CA]">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A908A]">
                      Granule Details
                    </span>
                    <h4 className="text-sm font-semibold text-[#1A1D23] mt-0.5">
                      {selectedScene.platform}
                    </h4>
                    <p className="text-[11px] font-mono text-[#69706A] truncate max-w-[280px]">
                      {selectedScene.id}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-[#FAF9F5] border border-[#D8D5CA] text-[11px] font-mono text-[#1A1D23]">
                    {selectedScene.resolution_m}m
                  </span>
                </div>

                {/* Granule Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-[#FAF9F5] border border-[#D8D5CA]">
                    <span className="text-[10px] text-[#8A908A] block">Acquisition Date</span>
                    <span className="text-[12px] font-mono text-[#1A1D23] mt-0.5 block">
                      {getSceneFullDatetime(selectedScene)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#FAF9F5] border border-[#D8D5CA]">
                    <span className="text-[10px] text-[#8A908A] block">Collection Asset</span>
                    <span className="text-[12px] font-mono text-[#1A1D23] mt-0.5 block truncate">
                      {selectedScene.collection}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#FAF9F5] border border-[#D8D5CA]">
                    <span className="text-[10px] text-[#8A908A] block">Cloud Screening</span>
                    <span className="text-[12px] font-mono text-[#1A1D23] mt-0.5 block">
                      {selectedScene.cloud_cover !== null && selectedScene.cloud_cover !== undefined
                        ? `${selectedScene.cloud_cover.toFixed(2)}%`
                        : 'N/A (SAR Microwave)'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#FAF9F5] border border-[#D8D5CA]">
                    <span className="text-[10px] text-[#8A908A] block">Spectral Bands</span>
                    <span className="text-[12px] font-mono text-[#1A1D23] mt-0.5 block">
                      {(selectedScene.bands || []).length} available
                    </span>
                  </div>
                </div>

                {/* Available Spectral Channels */}
                <div>
                  <span className="text-[11px] font-medium text-[#1A1D23] block mb-1.5">
                    Available Sensor Channels
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(selectedScene.bands || []).map(b => (
                      <span
                        key={b}
                        className="px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#D8D5CA] text-[10px] font-mono text-[#454B46]"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Additional Properties Table */}
                {selectedScene.properties && Object.keys(selectedScene.properties).length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-[#1A1D23] block mb-1.5">
                      Metadata Attributes
                    </span>
                    <div className="rounded bg-[#FAF9F5] border border-[#D8D5CA] p-2.5 divide-y divide-[#D8D5CA] text-[10px] font-mono">
                      {Object.entries(selectedScene.properties).map(([k, v]) => (
                        <div key={k} className="py-1 flex justify-between gap-2">
                          <span className="text-[#8A908A] truncate">{k}:</span>
                          <span className="text-[#1A1D23] truncate text-right">
                            {typeof v === 'number' ? v.toFixed(2) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleApplyScene(selectedScene)}
                    className="w-full py-2.5 rounded bg-[#D9622B] hover:bg-[#AD5630] text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    Apply Scene to Classification Workflow
                  </button>
                  <p className="text-[10px] text-center text-[#8A908A] mt-1.5">
                    Sets active sensor ({(selectedScene.collection || '').includes('landsat') ? 'Landsat 8/9' : 'Sentinel-2'}) and composite acquisition window.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#8A908A]">
                <Info className="w-8 h-8 mb-2 opacity-40 text-[#D9622B]" />
                <p className="text-xs text-[#69706A]">Select a scene from the list to view telemetry and band properties.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
