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
    <div className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121410] border border-[#2E3429] rounded-xl w-full max-w-5xl h-[88vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden text-[#F9FAFB] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#1A1D17] border-b border-[#2E3429]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#22261E] border border-[#3D4537] flex items-center justify-center text-[#E0DCD3]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-[#F9FAFB]">STAC Catalog Browser</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E3429] text-[#E0DCD3] font-mono border border-[#3D4537]">
                  Earth Engine Open EO
                </span>
              </div>
              <p className="text-[11px] text-[#A0A59A]">
                Query and inspect Sentinel-2, Landsat 8/9, and Sentinel-1 granules over your AOI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8B8C7F] hover:text-white hover:bg-[#22261E] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-5 py-3 bg-[#161813] border-b border-[#2E3429] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Collections Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#8B8C7F] text-[11px] mr-1 flex items-center gap-1 font-medium">
              <Satellite className="w-3.5 h-3.5" /> Constellations:
            </span>
            {AVAILABLE_COLLECTIONS.map(col => {
              const active = selectedCollections.includes(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => handleCollectionToggle(col.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-[#22261E] border-[#4B6445] text-[#E0DCD3] shadow-sm'
                      : 'bg-[#1A1D17] border-[#2E3429] text-[#8B8C7F] hover:text-[#D0D0D0]'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: active ? col.badge : '#555' }}
                  />
                  {col.name} ({col.res})
                </button>
              );
            })}
          </div>

          {/* Date range & Cloud controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[#1A1D17] px-2.5 py-1 rounded-md border border-[#2E3429]">
              <Calendar className="w-3.5 h-3.5 text-[#8B8C7F]" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-[11px] text-[#F9FAFB] focus:outline-none cursor-pointer"
              />
              <span className="text-[#8B8C7F] text-[10px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-[11px] text-[#F9FAFB] focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#1A1D17] px-2.5 py-1 rounded-md border border-[#2E3429]">
              <Cloud className="w-3.5 h-3.5 text-[#8B8C7F]" />
              <span className="text-[11px] text-[#A0A59A]">Cloud:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={maxCloud}
                onChange={e => setMaxCloud(Number(e.target.value))}
                className="w-10 bg-transparent text-[11px] text-right text-[#F9FAFB] focus:outline-none"
              />
              <span className="text-[10px] text-[#8B8C7F]">%</span>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-3.5 py-1 rounded-md bg-[#306840] hover:bg-[#3d8352] text-[#F9FAFB] font-medium text-[11px] flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" /> Search Catalog
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Side: Scene List */}
          <div className="w-7/12 border-r border-[#2E3429] flex flex-col bg-[#121410]">
            {/* Filter Sub-bar */}
            <div className="px-4 py-2 bg-[#1A1D17] border-b border-[#2E3429] flex items-center justify-between text-[11px]">
              <span className="text-[#A0A59A]">
                {loading ? 'Searching catalog...' : `${filteredScenes.length} granules available`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                    filterType === 'all' ? 'bg-[#2E3429] text-[#E0DCD3]' : 'text-[#8B8C7F] hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('optical')}
                  className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                    filterType === 'optical' ? 'bg-[#2E3429] text-[#E0DCD3]' : 'text-[#8B8C7F] hover:text-white'
                  }`}
                >
                  Optical
                </button>
                <button
                  onClick={() => setFilterType('radar')}
                  className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                    filterType === 'radar' ? 'bg-[#2E3429] text-[#E0DCD3]' : 'text-[#8B8C7F] hover:text-white'
                  }`}
                >
                  Radar
                </button>
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="m-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-200">
                {error}
              </div>
            )}

            {/* Empty or loading state */}
            {!loading && filteredScenes.length === 0 && !error && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#8B8C7F]">
                <Satellite className="w-10 h-10 mb-2 opacity-30 text-[#E0DCD3]" />
                <p className="text-xs font-medium text-[#D0D0D0]">No granules found for the specified criteria.</p>
                <p className="text-[11px] mt-1 max-w-xs text-[#8B8C7F]">
                  Try expanding the date range, increasing maximum cloud cover, or selecting more constellations.
                </p>
              </div>
            )}

            {/* Scene Scroll List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#1F241C] p-2 space-y-1">
              {filteredScenes.map((scene) => {
                const isSelected = selectedScene?.id === scene.id;
                const isRadar = (scene.collection || '').includes('sentinel-1');
                const isLandsat = (scene.collection || '').includes('landsat');
                const bandsList = scene.bands || [];

                return (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedScene(scene)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-[#1E251B] border-[#4B6445] shadow-md'
                        : 'bg-[#161813]/80 border-[#22261E] hover:bg-[#1A1D17] hover:border-[#2E3429]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isRadar
                              ? 'bg-[#8e44ad]/20 border-[#8e44ad]/40 text-[#d2a3ea]'
                              : isLandsat
                              ? 'bg-[#2980b9]/20 border-[#2980b9]/40 text-[#9cd2f6]'
                              : 'bg-[#306840]/20 border-[#306840]/40 text-[#9cd8b0]'
                          }`}
                        >
                          {scene.platform}
                        </span>
                        <span className="text-[10px] text-[#A0A59A] font-mono">
                          {scene.resolution_m}m GSD
                        </span>
                      </div>
                      <span className="text-[11px] text-[#E0DCD3] font-mono font-medium">
                        {getSceneDisplayDate(scene)}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-[#D0D0D0] mt-1.5 truncate">
                      {scene.id}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#22261E] text-[10px]">
                      <div className="flex items-center gap-3">
                        {scene.cloud_cover !== null && scene.cloud_cover !== undefined ? (
                          <span className="flex items-center gap-1 text-[#A0A59A]">
                            <Cloud className="w-3 h-3" />
                            {scene.cloud_cover.toFixed(1)}% cloud
                          </span>
                        ) : (
                          <span className="text-[#8e44ad]">Cloud-Penetrating SAR</span>
                        )}
                        <span className="text-[#8B8C7F]">
                          {bandsList.length} bands
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyScene(scene);
                        }}
                        className="px-2 py-0.5 rounded bg-[#2E3429] hover:bg-[#306840] text-[#E0DCD3] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
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
          <div className="w-5/12 bg-[#161813] flex flex-col p-5 overflow-y-auto">
            {selectedScene ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-[#2E3429]">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B8C7F]">
                      Granule Details
                    </span>
                    <h4 className="text-sm font-semibold text-[#F9FAFB] mt-0.5">
                      {selectedScene.platform}
                    </h4>
                    <p className="text-[11px] font-mono text-[#A0A59A] truncate max-w-[280px]">
                      {selectedScene.id}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-[#22261E] border border-[#3D4537] text-[11px] font-mono text-[#E0DCD3]">
                    {selectedScene.resolution_m}m
                  </span>
                </div>

                {/* Granule Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                    <span className="text-[10px] text-[#8B8C7F] block">Acquisition Date</span>
                    <span className="text-[12px] font-mono text-[#F9FAFB] mt-0.5 block">
                      {getSceneFullDatetime(selectedScene)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                    <span className="text-[10px] text-[#8B8C7F] block">Collection Asset</span>
                    <span className="text-[12px] font-mono text-[#F9FAFB] mt-0.5 block truncate">
                      {selectedScene.collection}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                    <span className="text-[10px] text-[#8B8C7F] block">Cloud Screening</span>
                    <span className="text-[12px] font-mono text-[#F9FAFB] mt-0.5 block">
                      {selectedScene.cloud_cover !== null && selectedScene.cloud_cover !== undefined
                        ? `${selectedScene.cloud_cover.toFixed(2)}%`
                        : 'N/A (SAR Microwave)'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#1A1D17] border border-[#2E3429]">
                    <span className="text-[10px] text-[#8B8C7F] block">Spectral Bands</span>
                    <span className="text-[12px] font-mono text-[#F9FAFB] mt-0.5 block">
                      {(selectedScene.bands || []).length} available
                    </span>
                  </div>
                </div>

                {/* Available Spectral Channels */}
                <div>
                  <span className="text-[11px] font-medium text-[#E0DCD3] block mb-1.5">
                    Available Sensor Channels
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(selectedScene.bands || []).map(b => (
                      <span
                        key={b}
                        className="px-2 py-0.5 rounded bg-[#1A1D17] border border-[#2E3429] text-[10px] font-mono text-[#A0A59A]"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Additional Properties Table */}
                {selectedScene.properties && Object.keys(selectedScene.properties).length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-[#E0DCD3] block mb-1.5">
                      Metadata Attributes
                    </span>
                    <div className="rounded-lg bg-[#1A1D17] border border-[#2E3429] p-2.5 divide-y divide-[#22261E] text-[10px] font-mono">
                      {Object.entries(selectedScene.properties).map(([k, v]) => (
                        <div key={k} className="py-1 flex justify-between gap-2">
                          <span className="text-[#8B8C7F] truncate">{k}:</span>
                          <span className="text-[#D0D0D0] truncate text-right">
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
                    className="w-full py-2.5 rounded-lg bg-[#306840] hover:bg-[#3d8352] text-[#F9FAFB] font-medium text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#E0DCD3]" />
                    Apply Scene to Classification Workflow
                  </button>
                  <p className="text-[10px] text-center text-[#8B8C7F] mt-1.5">
                    Sets active sensor ({(selectedScene.collection || '').includes('landsat') ? 'Landsat 8/9' : 'Sentinel-2'}) and composite acquisition window.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#8B8C7F]">
                <Info className="w-8 h-8 mb-2 opacity-30 text-[#E0DCD3]" />
                <p className="text-xs text-[#D0D0D0]">Select a scene from the list to view telemetry and band properties.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
