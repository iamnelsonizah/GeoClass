'use client';

import React, { useState, useEffect } from 'react';
import { LULC_COLORS, LULC_CLASS_NAMES } from './types';

interface CustomTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeData: any | null;
  onApplyTrainingData: (data: any | null) => void;
}

const CLASS_NAME_MAP: Record<string, string> = {
  water: 'Water',
  lake: 'Water',
  river: 'Water',
  forest: 'Forest',
  trees: 'Forest',
  woodland: 'Forest',
  grass: 'Grass',
  vegetation: 'Grass',
  wetland: 'Wetland',
  swamp: 'Wetland',
  crops: 'Agriculture',
  cropland: 'Agriculture',
  agriculture: 'Agriculture',
  shrub: 'Shrub',
  scrub: 'Shrub',
  built: 'Urban',
  'built-up': 'Urban',
  building: 'Urban',
  urban: 'Urban',
  bare: 'Bare Land',
  'bare land': 'Bare Land',
  sand: 'Bare Land',
  ice: 'Snow/Ice',
  snow: 'Snow/Ice',
};

export default function CustomTrainingModal({
  isOpen,
  onClose,
  activeData,
  onApplyTrainingData,
}: CustomTrainingModalProps) {
  const [parsedData, setParsedData] = useState<any | null>(activeData);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const parseGeoJSONContent = (content: string, name: string) => {
    try {
      const json = JSON.parse(content);
      const features = json.type === 'FeatureCollection' ? json.features : json.type === 'Feature' ? [json] : [];
      if (!features || features.length === 0) {
        setErrorMsg('No valid GeoJSON features found in file.');
        return;
      }

      setParsedData(json);
      setFileName(name);
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg(`Failed to parse JSON: ${e.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      parseGeoJSONContent(evt.target?.result as string, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        parseGeoJSONContent(evt.target?.result as string, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Inspect summary of parsed data
  const summary = (() => {
    if (!parsedData) return null;
    const features = parsedData.type === 'FeatureCollection' ? parsedData.features : [parsedData];
    const classCounts: Record<string, number> = {};
    let pointCount = 0;
    let polyCount = 0;

    features.forEach((f: any) => {
      const geomType = f?.geometry?.type;
      if (geomType === 'Point') pointCount++;
      else if (geomType === 'Polygon' || geomType === 'MultiPolygon') polyCount++;

      const props = f?.properties || {};
      let label = props.label ?? props.class_id ?? props.class ?? props.target ?? props.class_name;
      let standardName = 'Unknown';

      if (typeof label === 'number' && label >= 0 && label < LULC_CLASS_NAMES.length) {
        standardName = LULC_CLASS_NAMES[label];
      } else if (typeof label === 'string') {
        const clean = label.toLowerCase().trim();
        standardName = CLASS_NAME_MAP[clean] || (clean.charAt(0).toUpperCase() + clean.slice(1));
      }

      classCounts[standardName] = (classCounts[standardName] || 0) + 1;
    });

    return {
      total: features.length,
      points: pointCount,
      polygons: polyCount,
      classCounts,
    };
  })();

  const handleSave = () => {
    onApplyTrainingData(parsedData);
    onClose();
  };

  const handleClear = () => {
    setParsedData(null);
    setFileName('');
    onApplyTrainingData(null);
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-[#FAF9F5] border border-[#D8D5CA] rounded-md shadow-2xl overflow-hidden flex flex-col font-sans relative z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#F4F1E8] border-b border-[#D8D5CA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9622B]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1D23]">
              User Custom Training Ground-Truth
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#69706A] hover:text-[#1A1D23] font-mono text-sm px-1.5 py-0.5 rounded hover:bg-[#E9E6DC]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-[#69706A] leading-relaxed">
            Upload custom ground-truth field points or delineated polygons (GeoJSON).
            These samples will directly train the Google Earth Engine Random Forest / SVM classifiers
            with your field-verified ground truth instead of automated Dynamic World labels.
          </p>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded p-5 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-[#D9622B] bg-[#F3DFD3]/50'
                : 'border-[#D8D5CA] bg-[#FAF9F5] hover:bg-[#F4F1E8]'
            }`}
          >
            <input
              type="file"
              accept=".geojson,.json"
              onChange={handleFileUpload}
              className="hidden"
              id="custom-training-input"
            />
            <label htmlFor="custom-training-input" className="cursor-pointer block space-y-1">
              <div className="text-xs font-semibold text-[#1A1D23]">
                Drop .geojson / .json file here, or <span className="text-[#D9622B] underline">browse</span>
              </div>
              <div className="text-[11px] text-[#8A908A]">
                Supports Points, Polygons, and MultiPolygons with class attributes
              </div>
            </label>
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 bg-[#FBEBEA] border border-[#A84E42]/30 rounded text-xs text-[#A84E42]">
              {errorMsg}
            </div>
          )}

          {/* Summary Preview */}
          {summary && (
            <div className="bg-[#F4F1E8] border border-[#D8D5CA] rounded p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1A1D23] border-b border-[#D8D5CA] pb-2">
                <span>Dataset Overview {fileName && `(${fileName})`}</span>
                <span className="font-mono text-[#D9622B] font-bold">{summary.total} Total Samples</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#FAF9F5] p-2 rounded border border-[#D8D5CA]">
                  <span className="text-[#69706A] block text-[10px] uppercase">Point Observations</span>
                  <span className="text-[#1A1D23] font-bold text-sm">{summary.points}</span>
                </div>
                <div className="bg-[#FAF9F5] p-2 rounded border border-[#D8D5CA]">
                  <span className="text-[#69706A] block text-[10px] uppercase">Field Polygons</span>
                  <span className="text-[#1A1D23] font-bold text-sm">{summary.polygons}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="text-[10.5px] uppercase font-bold text-[#69706A] tracking-wider">
                  Class Composition:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(summary.classCounts).map(([cls, count]) => (
                    <div
                      key={cls}
                      className="flex items-center justify-between p-1.5 bg-[#FAF9F5] border border-[#D8D5CA] rounded text-xs"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: LULC_COLORS[cls] || '#8CA0AA' }}
                        />
                        <span className="truncate text-[#1A1D23] font-medium">{cls}</span>
                      </div>
                      <span className="font-mono font-bold text-[#69706A] ml-1">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Format Guide */}
          <div className="text-[11px] text-[#69706A] bg-[#FAF9F5] border border-[#D8D5CA] p-3 rounded space-y-1">
            <span className="font-bold text-[#1A1D23] block">GeoJSON Schema Reference:</span>
            <p>
              Each feature must have either a numeric <code className="bg-[#E9E6DC] px-1 rounded">label</code> (0-8)
              or string <code className="bg-[#E9E6DC] px-1 rounded">class_name</code> (e.g. &quot;Water&quot;, &quot;Forest&quot;, &quot;Urban&quot;, &quot;Agriculture&quot;)
              in its properties.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#F4F1E8] border-t border-[#D8D5CA] flex items-center justify-between">
          <div>
            {parsedData && (
              <button
                onClick={handleClear}
                className="text-xs text-[#A84E42] hover:underline font-mono"
              >
                Clear Data
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#69706A] hover:bg-[#E9E6DC] rounded border border-[#D8D5CA]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!parsedData}
              className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
                parsedData
                  ? 'bg-[#D9622B] text-white hover:bg-[#B84E1C]'
                  : 'bg-[#D8D5CA] text-[#8A908A] cursor-not-allowed'
              }`}
            >
              Apply Ground-Truth
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
