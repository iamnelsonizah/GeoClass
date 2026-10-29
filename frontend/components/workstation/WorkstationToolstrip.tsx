'use client';

import React from 'react';
import {
  MousePointer,
  Square,
  Pentagon,
  Ruler,
  Activity,
  Type,
  Info,
  MapPin,
  Crosshair,
  Layers,
  SplitSquareVertical,
  Plus,
  Minus,
  Compass,
  Maximize2,
  Minimize2,
  Trash2,
} from 'lucide-react';
import { DraggableContainer } from '../DraggableContainer';

interface WorkstationToolstripProps {
  toolstripCollapsed: boolean;
  activeTool: string;
  measurementMode: boolean;
  transectMode: boolean;
  smartSelectMode: boolean;
  noteMode: boolean;
  spectralInspectorMode: boolean;
  swipeActive: boolean;
  isFullscreen: boolean;
  coords: number[][];
  selectedLocation: any;
  triggerTool: (tool: any) => void;
  setMapZoom: React.Dispatch<React.SetStateAction<number>>;
  setMapCenter: (center: [number, number]) => void;
  toggleMapFullscreen: () => void;
}

export function WorkstationToolstrip({
  toolstripCollapsed,
  activeTool,
  measurementMode,
  transectMode,
  smartSelectMode,
  noteMode,
  spectralInspectorMode,
  swipeActive,
  isFullscreen,
  coords,
  selectedLocation,
  triggerTool,
  setMapZoom,
  setMapCenter,
  toggleMapFullscreen,
}: WorkstationToolstripProps) {
  if (toolstripCollapsed) return null;

  return (
    <DraggableContainer defaultPosition={{ x: 14, y: 14 }} zIndex={1000} className="pointer-events-auto">
      <div className="toolstrip">
        {/* Drag Grip Handle */}
        <div 
          className="flex flex-col gap-0.5 px-1 py-1 cursor-grab active:cursor-grabbing select-none opacity-40 hover:opacity-90 transition-opacity"
          title="Drag toolbar"
        >
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-[#8A908A]" />
            <div className="w-1 h-1 rounded-full bg-[#8A908A]" />
          </div>
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-[#8A908A]" />
            <div className="w-1 h-1 rounded-full bg-[#8A908A]" />
          </div>
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-[#8A908A]" />
            <div className="w-1 h-1 rounded-full bg-[#8A908A]" />
          </div>
        </div>

        <div className="divider" />

        {/* 1. Pan / Pointer */}
        <button
          type="button"
          onClick={() => triggerTool('pan')}
          className={`t ${activeTool === 'pan' ? 'active' : ''}`}
          aria-label="Select & Pan"
        >
          <MousePointer className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Select & Pan</span>
              <span className="tool-tip-badge">NAV</span>
            </div>
            <div className="tool-tip-desc">Explore satellite imagery and navigate freely without drawing geometry.</div>
          </div>
        </button>

        {/* 2. Rectangle */}
        <button
          type="button"
          onClick={() => triggerTool('rect')}
          className={`t ${activeTool === 'rect' ? 'active' : ''}`}
          aria-label="Draw Rectangle"
        >
          <Square className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Draw Rectangle</span>
              <span className="tool-tip-badge">AOI</span>
            </div>
            <div className="tool-tip-desc">Click and drag on the map to define a rectangular Area of Interest.</div>
          </div>
        </button>

        {/* 3. Polygon */}
        <button
          type="button"
          onClick={() => triggerTool('poly')}
          className={`t ${activeTool === 'poly' ? 'active' : ''}`}
          aria-label="Draw Polygon"
        >
          <Pentagon className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Draw Polygon</span>
              <span className="tool-tip-badge">AOI</span>
            </div>
            <div className="tool-tip-desc">Click to plot custom polygon vertices around your target boundary.</div>
          </div>
        </button>

        {/* 4. Measure Distance (Ruler) */}
        <button
          type="button"
          onClick={() => triggerTool('measure')}
          className={`t ${measurementMode ? 'active' : ''}`}
          aria-label="Measure Distance"
        >
          <Ruler className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Measure Distance</span>
              <span className="tool-tip-badge">RULER</span>
            </div>
            <div className="tool-tip-desc">Click sequential points on the map to calculate linear distance in kilometers.</div>
          </div>
        </button>

        {/* 5. Elevation Transect */}
        <button
          type="button"
          onClick={() => triggerTool('transect')}
          className={`t ${transectMode ? 'active' : ''}`}
          aria-label="Elevation Transect"
        >
          <Activity className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Elevation Transect</span>
              <span className="tool-tip-badge">DEM</span>
            </div>
            <div className="tool-tip-desc">Draw a cross-sectional line across terrain to slice a 3D elevation profile.</div>
          </div>
        </button>

        {/* 6. Text Annotation */}
        <button
          type="button"
          onClick={() => triggerTool('text')}
          className={`t ${activeTool === 'text' ? 'active' : ''}`}
          aria-label="Text Annotation"
        >
          <Type className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Text Annotation</span>
              <span className="tool-tip-badge">TEXT</span>
            </div>
            <div className="tool-tip-desc">Click anywhere on the map to type and place custom notes or field labels.</div>
          </div>
        </button>

        {/* 7. Info / Smart Select */}
        <button
          type="button"
          onClick={() => triggerTool('smart')}
          className={`t ${smartSelectMode ? 'active' : ''}`}
          aria-label="Smart Select & Inspect"
        >
          <Info className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Smart Select & Inspect</span>
              <span className="tool-tip-badge">AI GEO</span>
            </div>
            <div className="tool-tip-desc">Click any pixel to automatically segment features or inspect pixel attributes.</div>
          </div>
        </button>

        {/* 8. MapPin / Notes */}
        <button
          type="button"
          onClick={() => triggerTool('notes')}
          className={`t ${noteMode ? 'active' : ''}`}
          aria-label="Field Note Pin"
        >
          <MapPin className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Field Note Pin</span>
              <span className="tool-tip-badge">NOTE</span>
            </div>
            <div className="tool-tip-desc">Click anywhere to place geo-referenced notes and field observations.</div>
          </div>
        </button>

        <div className="divider" />

        {/* 9. Crosshair (Center on AOI) */}
        <button
          type="button"
          onClick={() => {
            if (coords.length > 0) {
              const latSum = coords.reduce((acc, c) => acc + c[0], 0);
              const lngSum = coords.reduce((acc, c) => acc + c[1], 0);
              setMapCenter([latSum / coords.length, lngSum / coords.length]);
            } else if (selectedLocation) {
              setMapCenter([selectedLocation.lat, selectedLocation.lng]);
            } else {
              setMapCenter([37.7749, -122.4194]);
            }
          }}
          className="t"
          aria-label="Center on Target"
        >
          <Crosshair className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Center on Target</span>
              <span className="tool-tip-badge">VIEW</span>
            </div>
            <div className="tool-tip-desc">Center view directly on the active Area of Interest.</div>
          </div>
        </button>

        {/* 10. Layers / Spectral Inspector */}
        <button
          type="button"
          onClick={() => triggerTool('spectral')}
          className={`t ${spectralInspectorMode ? 'active' : ''}`}
          aria-label="Spectral Inspector"
        >
          <Layers className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Spectral Inspector</span>
              <span className="tool-tip-badge">10-BAND</span>
            </div>
            <div className="tool-tip-desc">Click any pixel to extract its 10-band Sentinel-2 reflectance curve.</div>
          </div>
        </button>

        {/* 11. Swipe Split */}
        <button
          type="button"
          onClick={() => triggerTool('swipe')}
          className={`t ${swipeActive ? 'active' : ''}`}
          aria-label="Split Comparison"
        >
          <SplitSquareVertical className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Split Comparison</span>
              <span className="tool-tip-badge">SWIPE</span>
            </div>
            <div className="tool-tip-desc">Draggable curtain slider to visually wipe between dates or modalities.</div>
          </div>
        </button>

        <div className="divider" />

        {/* 12. Zoom In */}
        <button
          type="button"
          onClick={() => {
            setMapZoom((z) => Math.min(18, z + 1));
            window.dispatchEvent(new CustomEvent('map-zoom-in'));
          }}
          className="t"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Zoom In</span>
              <span className="tool-tip-badge">+</span>
            </div>
            <div className="tool-tip-desc">Increase map magnification level.</div>
          </div>
        </button>

        {/* 13. Zoom Out */}
        <button
          type="button"
          onClick={() => {
            setMapZoom((z) => Math.max(3, z - 1));
            window.dispatchEvent(new CustomEvent('map-zoom-out'));
          }}
          className="t"
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Zoom Out</span>
              <span className="tool-tip-badge">-</span>
            </div>
            <div className="tool-tip-desc">Decrease map magnification level.</div>
          </div>
        </button>

        {/* 14. Compass */}
        <button
          type="button"
          onClick={() => {
            setMapZoom(11);
            if (coords.length > 0) {
              const latSum = coords.reduce((acc, c) => acc + c[0], 0);
              const lngSum = coords.reduce((acc, c) => acc + c[1], 0);
              setMapCenter([latSum / coords.length, lngSum / coords.length]);
            } else if (selectedLocation) {
              setMapCenter([selectedLocation.lat, selectedLocation.lng]);
            } else {
              setMapCenter([37.7749, -122.4194]);
            }
          }}
          className="t"
          aria-label="Reset North & Extent"
        >
          <Compass className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Reset Extent</span>
              <span className="tool-tip-badge">NORTH</span>
            </div>
            <div className="tool-tip-desc">Reset orientation and zoom to the default project coordinates.</div>
          </div>
        </button>

        {/* 15. Expand / Fullscreen Mode */}
        <button
          type="button"
          onClick={toggleMapFullscreen}
          className={`t ${isFullscreen ? 'active' : ''}`}
          aria-label={isFullscreen ? "Exit Fullscreen" : "View Map in Full Mode"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>{isFullscreen ? "Exit Fullscreen" : "Full Map Mode"}</span>
              <span className="tool-tip-badge">VIEW</span>
            </div>
            <div className="tool-tip-desc">Expand map canvas to full screen for unobstructed geospatial analysis.</div>
          </div>
        </button>

        <div className="divider" />

        {/* 16. Clear / Delete Boundary */}
        <button
          type="button"
          onClick={() => triggerTool('clear')}
          className="t hover:text-[#C24E43]"
          aria-label="Clear Boundary"
        >
          <Trash2 className="w-4 h-4" />
          <div className="tool-tip">
            <div className="tool-tip-title">
              <span>Clear Boundary</span>
              <span className="tool-tip-badge">RESET</span>
            </div>
            <div className="tool-tip-desc">Erase the active boundary geometry from the map and reset drawing tools.</div>
          </div>
        </button>
      </div>
    </DraggableContainer>
  );
}
