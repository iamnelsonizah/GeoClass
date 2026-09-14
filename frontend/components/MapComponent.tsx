'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, LayersControl, LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';

// Set up default icon paths to avoid missing icon errors in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// Class color settings matching the backend
export const LULC_CLASSES = [
  { name: 'Water', color: '#419BDF' },
  { name: 'Forest', color: '#397D49' },
  { name: 'Grass', color: '#88B053' },
  { name: 'Wetland', color: '#7A87C6' },
  { name: 'Agriculture', color: '#E49635' },
  { name: 'Shrub', color: '#DFC35A' },
  { name: 'Urban', color: '#C4281B' },
  { name: 'Bare Land', color: '#A59B8F' },
  { name: 'Snow/Ice', color: '#B39FE1' }
];

// Layer metadata for contextual legend
const LAYER_INFO: Record<string, { title: string; description: string; bands?: { label: string; color: string }[] }> = {
  true_color: {
    title: 'True Color (RGB)',
    description: 'Natural color composite using B4 (Red), B3 (Green), B2 (Blue)',
    bands: [
      { label: 'B4 - Red', color: '#ef4444' },
      { label: 'B3 - Green', color: '#22c55e' },
      { label: 'B2 - Blue', color: '#3b82f6' },
    ],
  },
  false_color: {
    title: 'False Color (NIR)',
    description: 'Infrared composite: B8 (NIR), B4 (Red), B3 (Green). Vegetation appears bright red.',
    bands: [
      { label: 'B8 - Near-IR', color: '#dc2626' },
      { label: 'B4 - Red', color: '#16a34a' },
      { label: 'B3 - Green', color: '#2563eb' },
    ],
  },
  ndvi: {
    title: 'NDVI Vegetation Index',
    description: 'Normalized Difference Vegetation Index: (NIR - Red) / (NIR + Red)',
    bands: [
      { label: '< 0 - Water / Bare', color: '#a16207' },
      { label: '0 - 0.3 - Sparse', color: '#d4d4aa' },
      { label: '0.3 - 0.6 - Moderate', color: '#65a30d' },
      { label: '> 0.6 - Dense', color: '#166534' },
    ],
  },
  classified: {
    title: 'Land Cover Classification',
    description: 'Model output for land use and land cover review',
  },
  slope: {
    title: 'Topographic Slope Stability',
    description: 'Copernicus 30m terrain slope classification (degrees):',
    bands: [
      { label: '0-5° (Flat / Basin)', color: '#2ecc71' },
      { label: '5-15° (Gentle / Stable)', color: '#f1c40f' },
      { label: '15-25° (Moderate / Runoff)', color: '#e67e22' },
      { label: '25-35° (Steep / Erosion)', color: '#e74c3c' },
      { label: '>35° (Cliff / Critical Hazard)', color: '#8e44ad' },
    ],
  },
  elevation: {
    title: 'Digital Elevation Model (DEM)',
    description: 'Copernicus 30m continuous surface elevation above sea level:',
    bands: [
      { label: 'Lowlands', color: '#006633' },
      { label: 'Midlands', color: '#ffff99' },
      { label: 'Highlands', color: '#cc9966' },
      { label: 'Summits / Peaks', color: '#ffffff' },
    ],
  },
  hillshade: {
    title: 'Terrain Hillshade Relief',
    description: 'Illuminated 3D shaded relief model (azimuth 315°, sun altitude 45°)',
  },
  ndbi: {
    title: 'NDBI (Built-Up Index)',
    description: 'Separates impervious urban concrete, asphalt, and quarry rock:',
    bands: [
      { label: 'Vegetation / Water (< 0.0)', color: '#2c3e50' },
      { label: 'Moderate / Transition (0.0 to 0.1)', color: '#f39c12' },
      { label: 'Dense Built-Up / Quarry (> 0.1)', color: '#c0392b' },
    ],
  },
  mndwi: {
    title: 'MNDWI (Modified Water Index)',
    description: 'Suppresses built-up noise while isolating water bodies:',
    bands: [
      { label: 'Dry Land / Soil (< 0.0)', color: '#d73027' },
      { label: 'Wetlands / Turbid (0.0 to 0.1)', color: '#91cf60' },
      { label: 'Open Water / Reservoirs (> 0.1)', color: '#053061' },
    ],
  },
  nbr: {
    title: 'NBR (Burn Ratio & Severity)',
    description: 'Highlights wildfire burn scars, canopy dieback, and clearing:',
    bands: [
      { label: 'High Severity / Burn Scar (< -0.1)', color: '#67001f' },
      { label: 'Moderate Severity (-0.1 to 0.1)', color: '#f4a582' },
      { label: 'Low Severity / Regrowth (0.1 to 0.27)', color: '#92c5de' },
      { label: 'Unburned / Healthy Canopy (≥ 0.27)', color: '#2166ac' },
    ],
  },
};


import { DraggableContainer } from './DraggableContainer';

interface MapComponentProps {
  onAOIDrawn: (coords: number[][]) => void;
  aoiCoords?: number[][];
  trueColorUrl?: string;
  falseColorUrl?: string;
  ndviUrl?: string;
  classifiedUrl?: string;
  slopeUrl?: string;
  elevationUrl?: string;
  hillshadeUrl?: string;
  ndbiUrl?: string;
  mndwiUrl?: string;
  nbrUrl?: string;
  baselineTrueColorUrl?: string;
  baselineFalseColorUrl?: string;
  baselineNdviUrl?: string;
  baselineClassifiedUrl?: string;
  compareMode?: boolean;
  activeTimePeriod?: 'target' | 'baseline';
  opacity: number;
  activeLayer: 'none' | 'true_color' | 'false_color' | 'ndvi' | 'classified' | 'slope' | 'elevation' | 'hillshade' | 'ndbi' | 'mndwi' | 'nbr';
  mapCenter: [number, number];
  mapZoom: number;
  searchLocation?: SearchLocation | null;
  onSetAOIAtPoint?: (lat: number, lng: number) => void;
  confidenceVisible?: boolean;
  confidenceThreshold?: number;
  measurementMode?: boolean;
  noteMode?: boolean;
  notes?: MapNote[];
  onNoteAdd?: (lat: number, lng: number) => void;
  swipeActive?: boolean;
  onSwipeActiveChange?: (active: boolean) => void;
  smartSelectMode?: boolean;
  onSmartSelectClick?: (lat: number, lng: number) => void;
  spectralInspectorMode?: boolean;
  onSpectralInspectorClick?: (lat: number, lng: number) => void;
  inspectedSpectralCoord?: { lat: number; lng: number } | null;
  timelineMode?: boolean;
  onTimelineClick?: (lat: number, lng: number) => void;
  inspectedTimelineCoord?: { lat: number; lng: number } | null;
  buildingFootprintsGeoJSON?: any;
  showBuildings?: boolean;
  transectMode?: boolean;
  onTransectDrawn?: (coords: number[][], startLocation?: string, endLocation?: string) => void;
  elevationProfileData?: any;
  onClearElevationProfile?: () => void;
  onCursorMove?: (coords: { lat: number; lng: number } | null) => void;
}

interface MapNote {
  id: string;
  title: string;
  body: string;
  lat: number;
  lng: number;
}

interface SearchLocation {
  label: string;
  shortLabel: string;
  lat: number;
  lng: number;
}

const CONFIDENCE_ROWS = 5;
const CONFIDENCE_COLS = 6;

const getConfidenceScore = (row: number, col: number) => (
  58 + Math.round(Math.abs(Math.sin((row + 1.7) * (col + 2.3))) * 38)
);

// ───────────────────────────────── Draw Control ─────────────────────────────────
// ───────────────────────────────── Unified Draw & Boundary Control ─────────────────────────────────
function DrawControl({
  coords,
  onAOIDrawn,
}: {
  coords: number[][];
  onAOIDrawn: (coords: number[][]) => void;
}) {
  const map = useMap();
  const drawnLayerRef = useRef<L.Layer | null>(null);
  const isInternalUpdate = useRef(false);

  // Synchronize external coords (from presets, GeoJSON upload, or SAM smart-select) with the single map layer
  useEffect(() => {
    if (!map) return;

    // If change was caused by user dragging or editing this layer via Geoman, skip recreating
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    if (coords && coords.length > 2) {
      const latLngs = coords.map(c => [c[1], c[0]] as [number, number]);

      if (drawnLayerRef.current) {
        if ('setLatLngs' in drawnLayerRef.current) {
          (drawnLayerRef.current as L.Polygon).setLatLngs(latLngs);
          if ('bringToFront' in drawnLayerRef.current) {
            (drawnLayerRef.current as any).bringToFront();
          }
          return;
        } else {
          map.removeLayer(drawnLayerRef.current);
          drawnLayerRef.current = null;
        }
      }

      // Create single persistent boundary polygon
      const poly = L.polygon(latLngs, {
        color: '#F59E0B',
        fillColor: '#F59E0B',
        fillOpacity: 0.16,
        weight: 2.5,
        pane: 'overlayPane',
      });
      poly.addTo(map);
      drawnLayerRef.current = poly;
      poly.bringToFront();
    } else {
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
        drawnLayerRef.current = null;
      }
    }
  }, [map, coords]);

  // Keep single boundary visible above newly added raster or satellite layers
  useEffect(() => {
    if (!map) return;
    const bringFront = () => {
      if (drawnLayerRef.current && 'bringToFront' in drawnLayerRef.current) {
        (drawnLayerRef.current as any).bringToFront();
      }
    };
    map.on('layeradd', bringFront);
    return () => {
      map.off('layeradd', bringFront);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    // Set styling for drawn polygons and bounding boxes
    map.pm.setPathOptions({
      color: '#F59E0B',
      fillColor: '#F59E0B',
      fillOpacity: 0.16,
      weight: 2.5,
      pane: 'overlayPane',
    });

    const updateDrawnCoords = (layer: any) => {
      if (!layer) return;
      try {
        const geojson = layer.toGeoJSON();
        if (geojson?.geometry?.coordinates?.[0]) {
          const newCoords = geojson.geometry.coordinates[0] as number[][];
          isInternalUpdate.current = true;
          onAOIDrawn(newCoords);
        }
      } catch (err) {
        console.error("Failed to extract edited coords:", err);
      }
    };

    map.on('pm:create', (e: any) => {
      const { layer, shape } = e;
      if (shape === 'Text') {
        return;
      }
      if (drawnLayerRef.current && drawnLayerRef.current !== layer) {
        map.removeLayer(drawnLayerRef.current);
      }
      drawnLayerRef.current = layer;

      updateDrawnCoords(layer);

      if (layer.getBounds) {
        map.fitBounds(layer.getBounds());
      }
    });

    map.on('pm:remove', (e: any) => {
      if (drawnLayerRef.current === e.layer) {
        drawnLayerRef.current = null;
        onAOIDrawn([]);
      }
    });

    map.on('pm:dragstart', () => {
      isInternalUpdate.current = true;
    });

    map.on('pm:rotatestart', () => {
      isInternalUpdate.current = true;
    });

    map.on('pm:edit', (e: any) => {
      isInternalUpdate.current = true;
      updateDrawnCoords(e.layer || drawnLayerRef.current);
    });

    map.on('pm:dragend', (e: any) => {
      isInternalUpdate.current = true;
      updateDrawnCoords(e.layer || drawnLayerRef.current);
    });

    map.on('pm:rotateend', (e: any) => {
      isInternalUpdate.current = true;
      updateDrawnCoords(e.layer || drawnLayerRef.current);
    });

    const onDrawRect = () => {
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalDragMode();
      map.pm.disableGlobalRotateMode();
      map.pm.enableDraw('Rectangle');
    };

    const onDrawPoly = () => {
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalDragMode();
      map.pm.disableGlobalRotateMode();
      map.pm.enableDraw('Polygon');
    };

    const onDrawText = () => {
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalDragMode();
      map.pm.disableGlobalRotateMode();
      map.pm.enableDraw('Text');
    };

    const onToggleEdit = () => {
      map.pm.disableDraw();
      map.pm.disableGlobalDragMode();
      map.pm.disableGlobalRotateMode();
      map.pm.toggleGlobalEditMode();
    };

    const onToggleDrag = () => {
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalRotateMode();
      map.pm.toggleGlobalDragMode();
    };

    const onToggleRotate = () => {
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalDragMode();
      map.pm.toggleGlobalRotateMode();
    };

    const onPan = () => {
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalDragMode();
      map.pm.disableGlobalRotateMode();
    };

    const onClear = () => {
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalDragMode();
      map.pm.disableGlobalRotateMode();
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
        drawnLayerRef.current = null;
      }
      onAOIDrawn([]);
    };

    window.addEventListener('map-tool-rectangle', onDrawRect);
    window.addEventListener('map-tool-polygon', onDrawPoly);
    window.addEventListener('map-tool-text', onDrawText);
    window.addEventListener('map-tool-edit', onToggleEdit);
    window.addEventListener('map-tool-drag', onToggleDrag);
    window.addEventListener('map-tool-rotate', onToggleRotate);
    window.addEventListener('map-tool-pan', onPan);
    window.addEventListener('map-tool-clear', onClear);

    return () => {
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalDragMode();
      map.pm.disableGlobalRotateMode();
      map.off('pm:create');
      map.off('pm:remove');
      map.off('pm:dragstart');
      map.off('pm:rotatestart');
      map.off('pm:edit');
      map.off('pm:dragend');
      map.off('pm:rotateend');
      window.removeEventListener('map-tool-rectangle', onDrawRect);
      window.removeEventListener('map-tool-polygon', onDrawPoly);
      window.removeEventListener('map-tool-text', onDrawText);
      window.removeEventListener('map-tool-edit', onToggleEdit);
      window.removeEventListener('map-tool-drag', onToggleDrag);
      window.removeEventListener('map-tool-rotate', onToggleRotate);
      window.removeEventListener('map-tool-pan', onPan);
      window.removeEventListener('map-tool-clear', onClear);
    };
  }, [map, onAOIDrawn]);

  return null;
}

// ─────────────────────────── Map Controller (zoom/pan) ──────────────────────────
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  // Automatically reflow and invalidate Leaflet map size whenever panel toggles or container resizes
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    // Also trigger immediate invalidateSize on mount/update
    map.invalidateSize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);

  useEffect(() => {
    const handleZoomIn = () => map.zoomIn();
    const handleZoomOut = () => map.zoomOut();

    window.addEventListener('map-zoom-in', handleZoomIn);
    window.addEventListener('map-zoom-out', handleZoomOut);

    return () => {
      window.removeEventListener('map-zoom-in', handleZoomIn);
      window.removeEventListener('map-zoom-out', handleZoomOut);
    };
  }, [map]);

  return null;
}

// ──────────────────────────── Coordinate Tracker ────────────────────────────────
// Tracks live mouse position over map and emits lat/lng coordinates to parent
function CoordinateTracker({ onCursorMove }: { onCursorMove?: (coords: { lat: number; lng: number } | null) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!onCursorMove) return;

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      onCursorMove({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    const onMouseOut = () => {
      onCursorMove(null);
    };

    map.on('mousemove', onMouseMove);
    map.on('mouseout', onMouseOut);

    return () => {
      map.off('mousemove', onMouseMove);
      map.off('mouseout', onMouseOut);
    };
  }, [map, onCursorMove]);

  return null;
}

// ─────────────────────────────── Scale Bar ──────────────────────────────────────
function ScaleBar() {
  const map = useMap();
  const controlRef = useRef<L.Control.Scale | null>(null);

  useEffect(() => {
    controlRef.current = L.control.scale({
      position: 'bottomright',
      maxWidth: 140,
      metric: true,
      imperial: true,
    });
    map.addControl(controlRef.current);

    return () => {
      if (controlRef.current) map.removeControl(controlRef.current);
    };
  }, [map]);

  return null;
}

// ────────────────────────────── Minimap ─────────────────────────────────────────
// A small overview map in the bottom-right corner showing wider context
function Minimap() {
  const map = useMap();
  const minimapRef = useRef<L.Map | null>(null);
  const rectRef = useRef<L.Rectangle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlRef = useRef<L.Control | null>(null);

  useEffect(() => {
    let rafId: number;
    let isCancelled = false;
    let syncMinimapListener: (() => void) | null = null;

    const MinimapControl = L.Control.extend({
      options: { position: 'bottomright' as L.ControlPosition },
      onAdd() {
        const wrapper = L.DomUtil.create('div', 'leaflet-minimap-wrapper');
        wrapper.style.cssText = `
          width: 150px;
          height: 110px;
          border: 2px solid rgba(51, 65, 85, 0.8);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          cursor: default;
        `;

        const inner = L.DomUtil.create('div', '', wrapper);
        inner.style.cssText = 'width:100%;height:100%;';
        containerRef.current = inner;

        // Stop interactions from propagating to the main map
        L.DomEvent.disableClickPropagation(wrapper);
        L.DomEvent.disableScrollPropagation(wrapper);

        return wrapper;
      },
    });

    const control = new MinimapControl();
    controlRef.current = control;
    map.addControl(control);

    // Initialize minimap after container is in DOM
    rafId = requestAnimationFrame(() => {
      if (isCancelled || !containerRef.current) return;
      
      // Avoid initializing L.map twice if it already has a leaflet ID (Strict Mode double mount check)
      if ((containerRef.current as any)._leaflet_id) return;

      const center = map.getCenter();
      const minimap = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0.5,
      }).setView(center, Math.max(map.getZoom() - 5, 1));

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
      }).addTo(minimap);

      minimapRef.current = minimap;

      // Draw viewport rectangle
      const bounds = map.getBounds();
      rectRef.current = L.rectangle(bounds, {
        color: '#3b82f6',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        interactive: false,
      }).addTo(minimap);

      // Sync minimap when main map moves
      const syncMinimap = () => {
        if (!minimapRef.current || !rectRef.current) return;
        const b = map.getBounds();
        const z = Math.max(map.getZoom() - 5, 1);
        minimapRef.current.setView(map.getCenter(), z, { animate: false });
        rectRef.current.setBounds(b);
      };

      syncMinimapListener = syncMinimap;
      map.on('moveend zoomend', syncMinimap);
    });

    return () => {
      isCancelled = true;
      cancelAnimationFrame(rafId);
      
      if (syncMinimapListener) {
        map.off('moveend zoomend', syncMinimapListener);
      }

      if (rectRef.current && minimapRef.current) {
        rectRef.current.remove();
        rectRef.current = null;
      }

      if (minimapRef.current) {
        minimapRef.current.remove();
        minimapRef.current = null;
      }

      if (controlRef.current) {
        map.removeControl(controlRef.current);
        controlRef.current = null;
      }
    };
  }, [map]);

  return null;
}

// ───────────────────────────── Swipe Comparison ─────────────────────────────────
// Side-by-side swipe slider to compare two tile layers by clipping left/right
function SwipeControl({
  leftUrl,
  rightUrl,
  leftLabel,
  rightLabel,
  opacity,
  isAutoWiping = false,
  onToggleAutoWipe,
}: {
  leftUrl: string;
  rightUrl: string;
  leftLabel: string;
  rightLabel: string;
  opacity: number;
  isAutoWiping?: boolean;
  onToggleAutoWipe?: () => void;
}) {
  const map = useMap();
  const leftLayerRef = useRef<L.TileLayer | null>(null);
  const rightLayerRef = useRef<L.TileLayer | null>(null);
  const sliderPosRef = useRef(50);
  const [sliderPos, setSliderPos] = useState(50);
  const draggingRef = useRef(false);

  // Clip function: apply modern CSS clip-path to each layer's container
  const applyClip = useCallback(() => {
    const pos = sliderPosRef.current;
    const size = map.getSize();
    const clipX = Math.round(size.x * (pos / 100));

    if (leftLayerRef.current) {
      const container = (leftLayerRef.current as any)._container as HTMLElement;
      if (container) {
        container.style.clipPath = `polygon(0 0, ${clipX}px 0, ${clipX}px ${size.y}px, 0 ${size.y}px)`;
        container.style.clip = `rect(0px, ${clipX}px, ${size.y}px, 0px)`;
      }
    }
    if (rightLayerRef.current) {
      const container = (rightLayerRef.current as any)._container as HTMLElement;
      if (container) {
        container.style.clipPath = `polygon(${clipX}px 0, ${size.x}px 0, ${size.x}px ${size.y}px, ${clipX}px ${size.y}px)`;
        container.style.clip = `rect(0px, ${size.x}px, ${size.y}px, ${clipX}px)`;
      }
    }
  }, [map]);

  useEffect(() => {
    // Create left and right tile layers
    leftLayerRef.current = L.tileLayer(leftUrl, { opacity, zIndex: 400 }).addTo(map);
    rightLayerRef.current = L.tileLayer(rightUrl, { opacity, zIndex: 400 }).addTo(map);

    applyClip();
    map.on('move zoom resize', applyClip);

    return () => {
      map.off('move zoom resize', applyClip);
      if (leftLayerRef.current) map.removeLayer(leftLayerRef.current);
      if (rightLayerRef.current) map.removeLayer(rightLayerRef.current);
    };
  }, [map, leftUrl, rightUrl, opacity, applyClip]);

  // Re-apply clip on slider change
  useEffect(() => {
    applyClip();
  }, [sliderPos, applyClip]);

  // Auto-Wipe animation loop (oscillating between 15% and 85%)
  const autoWipeRef = useRef<number | null>(null);
  const wipeDirectionRef = useRef<1 | -1>(1);

  useEffect(() => {
    if (!isAutoWiping) {
      if (autoWipeRef.current) {
        cancelAnimationFrame(autoWipeRef.current);
        autoWipeRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const step = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const speed = 22; // % per second
      let nextPos = sliderPosRef.current + wipeDirectionRef.current * speed * dt;

      if (nextPos >= 85) {
        nextPos = 85;
        wipeDirectionRef.current = -1;
      } else if (nextPos <= 15) {
        nextPos = 15;
        wipeDirectionRef.current = 1;
      }

      sliderPosRef.current = nextPos;
      setSliderPos(nextPos);
      applyClip();

      autoWipeRef.current = requestAnimationFrame(step);
    };

    autoWipeRef.current = requestAnimationFrame(step);

    return () => {
      if (autoWipeRef.current) {
        cancelAnimationFrame(autoWipeRef.current);
        autoWipeRef.current = null;
      }
    };
  }, [isAutoWiping, applyClip]);

  // Mouse/touch drag handlers for the slider
  const handleSliderMove = useCallback((clientX: number) => {
    const mapContainer = map.getContainer();
    const rect = mapContainer.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    sliderPosRef.current = pct;
    setSliderPos(pct);
  }, [map]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        e.preventDefault();
        handleSliderMove(e.clientX);
      }
    };
    const onMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        map.dragging.enable();
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (draggingRef.current && e.touches.length === 1) {
        e.preventDefault();
        handleSliderMove(e.touches[0].clientX);
      }
    };
    const onTouchEnd = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        map.dragging.enable();
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [map, handleSliderMove]);

  const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleAutoWipe && isAutoWiping) {
      onToggleAutoWipe();
    }
    draggingRef.current = true;
    map.dragging.disable();
  }, [map, onToggleAutoWipe, isAutoWiping]);

  return (
    <>
      {/* Slider line with vibrant gradient glow */}
      <div
        className="absolute top-0 bottom-0 z-[1001] pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="w-[3px] -ml-[1.5px] h-full bg-gradient-to-b from-[#F59E0B] via-[#F8FAFC] to-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.9)]" />
      </div>

      {/* Floating Ratio Badge attached to slider position */}
      <div
        className="absolute top-4 z-[1002] -translate-x-1/2 select-none pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="flex items-center gap-1.5 bg-[#121410]/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#2E3429] shadow-2xl text-[10px] font-bold tracking-wider mono text-[#F9FAFB]">
          <span className="text-[#306840]">{Math.round(sliderPos)}%</span>
          <span className="text-neutral-400">|</span>
          <span className="text-[#E0DCD3]">{Math.round(100 - sliderPos)}%</span>
        </div>
      </div>

      {/* Slider drag handle */}
      <div
        className="absolute top-1/2 z-[1002] -translate-y-1/2 cursor-ew-resize select-none touch-none group"
        style={{ left: `${sliderPos}%`, transform: 'translate(-50%, -50%)' }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <div className="relative w-11 h-11 rounded-full bg-[#121410]/95 border-2 border-[#F9FAFB] backdrop-blur-md flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.7)] group-hover:scale-110 group-hover:border-[#306840] transition-all cursor-grab active:cursor-grabbing">
          {/* Dual lateral arrows */}
          <div className="flex items-center justify-between w-6 text-[#F9FAFB] group-hover:text-[#306840] transition-colors">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <path d="M9 1L2 6L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <div className="w-0.5 h-3.5 bg-[#3D4537]" />
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <path d="M1 1L8 6L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Left side pinned label */}
      <div className="absolute top-3 left-3 z-[1001] px-3 py-1.5 bg-[#121410]/95 backdrop-blur-md border border-[#2E3429] rounded-lg text-xs font-bold text-[#F9FAFB] shadow-xl flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-[#306840]" />
        <span>◀ {leftLabel}</span>
      </div>

      {/* Right side pinned label */}
      <div className="absolute top-3 right-3 z-[1001] px-3 py-1.5 bg-[#121410]/95 backdrop-blur-md border border-[#2E3429] rounded-lg text-xs font-bold text-[#F9FAFB] shadow-xl flex items-center gap-1.5 pointer-events-none">
        <span>{rightLabel} ▶</span>
        <span className="w-2 h-2 rounded-full bg-[#E0DCD3]" />
      </div>
    </>
  );
}

// ═══════════════════════════════ MAIN COMPONENT ═════════════════════════════════

// ═══════════════════════════════ MAIN COMPONENT ═════════════════════════════════

function ConfidenceOverlay({
  coords,
  visible,
  threshold,
}: {
  coords: number[][];
  visible: boolean;
  threshold: number;
}) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);
  const controlRef = useRef<L.Control | null>(null);

  useEffect(() => {
    if (groupRef.current) {
      map.removeLayer(groupRef.current);
      groupRef.current = null;
    }
    if (controlRef.current) {
      map.removeControl(controlRef.current);
      controlRef.current = null;
    }

    if (!visible) return;

    const group = L.layerGroup();
    const bounds = coords.length > 2
      ? L.latLngBounds(coords.map(c => [c[1], c[0]] as [number, number]))
      : map.getBounds();
    const south = bounds.getSouth();
    const north = bounds.getNorth();
    const west = bounds.getWest();
    const east = bounds.getEast();
    let reviewCells = 0;
    let criticalCells = 0;
    let scoreTotal = 0;

    for (let row = 0; row < CONFIDENCE_ROWS; row++) {
      for (let col = 0; col < CONFIDENCE_COLS; col++) {
        const score = getConfidenceScore(row, col);
        scoreTotal += score;
        if (score >= threshold) continue;

        reviewCells += 1;
        const cellSouth = south + ((north - south) / CONFIDENCE_ROWS) * row;
        const cellNorth = south + ((north - south) / CONFIDENCE_ROWS) * (row + 1);
        const cellWest = west + ((east - west) / CONFIDENCE_COLS) * col;
        const cellEast = west + ((east - west) / CONFIDENCE_COLS) * (col + 1);
        const severity = Math.max(0, threshold - score);
        const color = severity > 16 ? '#d95b45' : '#f0a442';
        if (severity > 16) criticalCells += 1;

        L.rectangle([[cellSouth, cellWest], [cellNorth, cellEast]], {
          color,
          weight: 1,
          fillColor: color,
          fillOpacity: 0.12 + Math.min(severity / 100, 0.16),
          interactive: true,
          pane: 'overlayPane',
        })
          .bindTooltip(`Confidence ${score}% - ${severity > 16 ? 'critical review' : 'review'}`, {
            direction: 'center',
            opacity: 0.92,
            className: 'geo-confidence-tooltip',
          })
          .addTo(group);
      }
    }

    group.addTo(map);
    groupRef.current = group;

    const ConfidenceControl = L.Control.extend({
      options: { position: 'bottomleft' as L.ControlPosition },
      onAdd() {
        const div = L.DomUtil.create('div', 'geo-confidence-control');
        const averageScore = Math.round(scoreTotal / (CONFIDENCE_ROWS * CONFIDENCE_COLS));
        div.innerHTML = `
          <small>Confidence Review</small>
          <strong>${reviewCells}/${CONFIDENCE_ROWS * CONFIDENCE_COLS} cells below ${threshold}%</strong>
          <span>Avg ${averageScore}% &middot; Critical ${criticalCells}</span>
          <div><i class="amber"></i> Review <i class="red"></i> Critical</div>
        `;
        L.DomEvent.disableClickPropagation(div);
        return div;
      },
    });
    const control = new ConfidenceControl();
    control.addTo(map);
    controlRef.current = control;

    return () => {
      map.removeLayer(group);
      if (groupRef.current === group) groupRef.current = null;
      map.removeControl(control);
      if (controlRef.current === control) controlRef.current = null;
    };
  }, [coords, map, threshold, visible]);

  return null;
}

function NotesLayer({
  notes,
  noteMode,
  onNoteAdd,
}: {
  notes: MapNote[];
  noteMode: boolean;
  onNoteAdd?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (groupRef.current) {
      map.removeLayer(groupRef.current);
      groupRef.current = null;
    }

    const group = L.layerGroup();
    notes.forEach((note, index) => {
      const icon = L.divIcon({
        className: 'geo-note-marker',
        html: `<span>${index + 1}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([note.lat, note.lng], { icon, keyboard: false })
        .bindTooltip(`<strong>${note.title}</strong><br/>${note.body}`, {
          direction: 'top',
          opacity: 0.94,
          className: 'geo-note-tooltip',
        })
        .addTo(group);
    });

    group.addTo(map);
    groupRef.current = group;

    return () => {
      map.removeLayer(group);
      if (groupRef.current === group) groupRef.current = null;
    };
  }, [map, notes]);

  useEffect(() => {
    if (!noteMode || !onNoteAdd) return;

    const container = map.getContainer();
    container.classList.add('geo-note-mode');
    const handleClick = (e: L.LeafletMouseEvent) => {
      onNoteAdd(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
      container.classList.remove('geo-note-mode');
    };
  }, [map, noteMode, onNoteAdd]);

  return null;
}

function formatMeasureDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

function MeasurementTool({ enabled }: { enabled: boolean }) {
  const map = useMap();
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [liveDistanceMeters, setLiveDistanceMeters] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const liveLayerRef = useRef<L.LayerGroup | null>(null);
  const controlRef = useRef<L.Control | null>(null);
  const pointsRef = useRef<L.LatLng[]>([]);
  const isFinishedRef = useRef(false);

  // Keep refs in sync with state for continuous real-time listeners
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    isFinishedRef.current = isFinished;
  }, [isFinished]);

  const accumulatedDistanceMeters = points.reduce((total, point, index) => {
    if (index === 0) return total;
    return total + map.distance(points[index - 1], point);
  }, 0);

  // Handle map events: click, mousemove, dblclick
  useEffect(() => {
    if (!enabled) return;

    // Ensure Geoman drawing modes are disengaged so they don't capture clicks
    try {
      map.pm?.disableDraw?.();
      map.pm?.disableGlobalEditMode?.();
      map.pm?.disableGlobalDragMode?.();
      map.pm?.disableGlobalRotateMode?.();
    } catch {
      // ignore
    }

    const container = map.getContainer();
    container.classList.add('geo-measure-mode');

    // Create a live layer group for dynamic guide line and live tooltip
    const liveGroup = L.layerGroup().addTo(map);
    liveLayerRef.current = liveGroup;

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (isFinishedRef.current) {
        liveGroup.clearLayers();
        setLiveDistanceMeters(null);
        return;
      }

      const currentPoints = pointsRef.current;
      if (currentPoints.length === 0) {
        liveGroup.clearLayers();
        setLiveDistanceMeters(null);
        return;
      }

      liveGroup.clearLayers();
      const lastPoint = currentPoints[currentPoints.length - 1];
      const segDistance = map.distance(lastPoint, e.latlng);

      let totalAccumulated = 0;
      for (let i = 0; i < currentPoints.length - 1; i++) {
        totalAccumulated += map.distance(currentPoints[i], currentPoints[i + 1]);
      }
      const totalLive = totalAccumulated + segDistance;
      setLiveDistanceMeters(totalLive);

      // Draw dashed rubberband guide line from last point to cursor
      L.polyline([lastPoint, e.latlng], {
        color: '#e9c947',
        weight: 2.5,
        dashArray: '5 5',
        opacity: 0.9,
      }).addTo(liveGroup);

      // Add dynamic floating tooltip right at cursor position
      const tooltipContent = currentPoints.length === 1
        ? `Distance: ${formatMeasureDistance(segDistance)}`
        : `+${formatMeasureDistance(segDistance)} (Total: ${formatMeasureDistance(totalLive)})`;

      L.circleMarker(e.latlng, {
        radius: 4,
        color: '#e9c947',
        fillColor: '#e9c947',
        fillOpacity: 0.9,
        weight: 1,
        interactive: false,
      })
        .bindTooltip(tooltipContent, {
          permanent: true,
          direction: 'right',
          offset: [14, -8],
          className: 'geo-measure-cursor-tooltip',
        })
        .addTo(liveGroup);
    };

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (isFinishedRef.current) return;
      setPoints(prev => [...prev, e.latlng]);
      liveGroup.clearLayers();
      setLiveDistanceMeters(null);
    };

    const handleDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      liveGroup.clearLayers();
      setLiveDistanceMeters(null);
      setIsFinished(true);
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
      container.classList.remove('geo-measure-mode');

      if (liveLayerRef.current) {
        map.removeLayer(liveLayerRef.current);
        liveLayerRef.current = null;
      }
      setPoints([]);
      setLiveDistanceMeters(null);
      setIsFinished(false);
    };
  }, [enabled, map]);

  // Render confirmed points, polylines, and segment midpoint distance badges
  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!enabled || points.length === 0) return;

    const group = L.layerGroup();

    // Draw main polyline connecting confirmed points
    if (points.length > 1) {
      L.polyline(points, {
        color: '#e9c947',
        weight: 3.5,
        dashArray: '6 5',
        opacity: 0.95,
      }).addTo(group);

      // Add automatic midpoint distance pills on each segment
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const midLat = (p1.lat + p2.lat) / 2;
        const midLng = (p1.lng + p2.lng) / 2;
        const segDist = map.distance(p1, p2);

        const pillIcon = L.divIcon({
          className: 'geo-measure-midpoint-wrapper',
          html: `<div class="geo-measure-segment-pill">${formatMeasureDistance(segDist)}</div>`,
          iconSize: [64, 20],
          iconAnchor: [32, 10],
        });

        L.marker([midLat, midLng], {
          icon: pillIcon,
          interactive: false,
        }).addTo(group);
      }
    }

    // Draw vertex markers with cumulative distance tooltips
    let runningDist = 0;
    points.forEach((point, index) => {
      if (index > 0) {
        runningDist += map.distance(points[index - 1], point);
      }
      const label = index === 0 ? 'Start (0 m)' : `Pt ${index + 1}: ${formatMeasureDistance(runningDist)}`;

      L.circleMarker(point, {
        radius: 6,
        color: '#12140F',
        fillColor: '#e9c947',
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip(label, {
          permanent: false,
          direction: 'top',
          className: 'geo-measure-vertex-tooltip',
        })
        .addTo(group);
    });

    group.addTo(map);
    layerRef.current = group;

    return () => {
      map.removeLayer(group);
      if (layerRef.current === group) layerRef.current = null;
    };
  }, [enabled, map, points]);

  // Bottom-right measurement control widget
  useEffect(() => {
    if (controlRef.current) {
      map.removeControl(controlRef.current);
      controlRef.current = null;
    }

    if (!enabled) return;

    const MeasureControl = L.Control.extend({
      options: { position: 'bottomright' as L.ControlPosition },
      onAdd() {
        const div = L.DomUtil.create('div', 'geo-measure-control');
        L.DomEvent.disableClickPropagation(div);

        const confirmedDistStr = points.length > 1
          ? formatMeasureDistance(accumulatedDistanceMeters)
          : null;

        const liveDelta = (liveDistanceMeters !== null && points.length > 0)
          ? Math.max(0, liveDistanceMeters - accumulatedDistanceMeters)
          : 0;

        let headlineValue = 'Click map to measure';
        if (points.length > 1) {
          // Primary headline always matches the confirmed line distance identically!
          headlineValue = confirmedDistStr || '0 m';
        } else if (points.length === 1 && liveDistanceMeters !== null) {
          headlineValue = formatMeasureDistance(liveDistanceMeters);
        }

        let subtextHtml = 'Click map point to begin';
        if (isFinished && points.length > 1) {
          subtextHtml = `<span style="color: #06B6D4;">✓ Measurement locked (${points.length - 1} segment${points.length === 2 ? '' : 's'})</span>`;
        } else if (points.length > 1 && liveDistanceMeters !== null && !isFinished) {
          subtextHtml = `Line: <b>${confirmedDistStr}</b> &bull; +${formatMeasureDistance(liveDelta)} to cursor <span style="color:#F59E0B;">(${formatMeasureDistance(liveDistanceMeters)})</span>`;
        } else if (points.length > 1) {
          subtextHtml = `${points.length - 1} segment${points.length === 2 ? '' : 's'} connected`;
        } else if (points.length === 1) {
          subtextHtml = 'Move cursor and click to place point 2';
        }

        div.innerHTML = `
          <div class="geo-measure-header">
            <small>${isFinished ? 'Measured Path' : 'Live Measurement'}</small>
            <span class="geo-measure-badge">${points.length} pt${points.length === 1 ? '' : 's'}</span>
          </div>
          <strong class="geo-measure-value">${headlineValue}</strong>
          <div class="geo-measure-subtext">
            ${subtextHtml}
          </div>
          <div class="geo-measure-actions">
            ${points.length > 1 && !isFinished ? '<button type="button" class="btn-finish">Finish</button>' : ''}
            ${isFinished ? '<button type="button" class="btn-resume">Resume</button>' : ''}
            ${points.length > 1 && !isFinished ? '<button type="button" class="btn-undo">Undo</button>' : ''}
            ${points.length > 0 ? '<button type="button" class="btn-clear">Clear</button>' : ''}
          </div>
        `;

        div.querySelector('.btn-finish')?.addEventListener('click', () => {
          if (liveLayerRef.current) liveLayerRef.current.clearLayers();
          setLiveDistanceMeters(null);
          setIsFinished(true);
        });

        div.querySelector('.btn-resume')?.addEventListener('click', () => {
          setIsFinished(false);
        });

        div.querySelector('.btn-undo')?.addEventListener('click', () => {
          setPoints(prev => prev.slice(0, -1));
          if (liveLayerRef.current) liveLayerRef.current.clearLayers();
          setLiveDistanceMeters(null);
          setIsFinished(false);
        });

        div.querySelector('.btn-clear')?.addEventListener('click', () => {
          setPoints([]);
          if (liveLayerRef.current) liveLayerRef.current.clearLayers();
          setLiveDistanceMeters(null);
          setIsFinished(false);
        });

        return div;
      },
    });

    const control = new MeasureControl();
    control.addTo(map);
    controlRef.current = control;

    return () => {
      map.removeControl(control);
      if (controlRef.current === control) controlRef.current = null;
    };
  }, [accumulatedDistanceMeters, enabled, isFinished, liveDistanceMeters, map, points.length]);

  return null;
}

interface LocationDetails {
  shortLabel: string;
  fullLabel: string;
}

const geocodeCache = new Map<string, LocationDetails>();

async function reverseGeocodePoint(lat: number, lng: number): Promise<LocationDetails> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key)!;
  }

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '12',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data) {
        const addr = data.address || {};
        const place = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || addr.hamlet || addr.county;
        const region = addr.state || addr.country;

        let shortLabel = '';
        if (place && region && place !== region) {
          shortLabel = `${place}, ${region}`;
        } else if (place) {
          shortLabel = place;
        } else if (region) {
          shortLabel = region;
        } else if (data.name) {
          shortLabel = data.name;
        } else if (data.display_name) {
          shortLabel = data.display_name.split(',')[0].trim();
        } else {
          shortLabel = `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
        }

        const fullLabel = data.display_name || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
        const result = { shortLabel, fullLabel };
        geocodeCache.set(key, result);
        return result;
      }
    }
  } catch (e) {
    // Graceful fallback on network timeout or failure
  }

  const fallback = {
    shortLabel: `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`,
    fullLabel: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
  };
  geocodeCache.set(key, fallback);
  return fallback;
}

function ElevationTransectTool({
  enabled,
  onTransectDrawn,
  hoverPoint,
}: {
  enabled: boolean;
  onTransectDrawn?: (coords: number[][], startLocation?: string, endLocation?: string) => void;
  hoverPoint?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [pointLocations, setPointLocations] = useState<{ [index: number]: LocationDetails }>({});
  const layerRef = useRef<L.LayerGroup | null>(null);
  const hoverMarkerRef = useRef<L.Marker | null>(null);
  const controlRef = useRef<L.Control | null>(null);

  const distanceMeters = points.reduce((total, point, index) => {
    if (index === 0) return total;
    return total + map.distance(points[index - 1], point);
  }, 0);

  useEffect(() => {
    if (!enabled) return;

    const container = map.getContainer();
    container.classList.add('geo-transect-mode');
    const handleClick = (e: L.LeafletMouseEvent) => {
      setPoints(prev => {
        const next = [...prev, e.latlng];
        const pointIdx = next.length - 1;
        reverseGeocodePoint(e.latlng.lat, e.latlng.lng).then(loc => {
          setPointLocations(prevLocs => ({ ...prevLocs, [pointIdx]: loc }));
        });
        return next;
      });
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
      container.classList.remove('geo-transect-mode');
      setPoints([]);
      setPointLocations({});
    };
  }, [enabled, map]);

  // Update transect line and markers on map
  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!enabled || points.length === 0) return;

    const group = L.layerGroup();
    if (points.length > 1) {
      // Glow underlay
      L.polyline(points, {
        color: '#06b6d4',
        weight: 6,
        opacity: 0.35,
      }).addTo(group);

      // Core transect polyline
      L.polyline(points, {
        color: '#22d3ee',
        weight: 3,
        dashArray: '5 4',
      }).addTo(group);
    }

    points.forEach((point, index) => {
      const isStart = index === 0;
      const isEnd = index === points.length - 1 && points.length > 1;
      const markerColor = isStart ? '#22c55e' : isEnd ? '#ef4444' : '#06b6d4';
      const loc = pointLocations[index];
      const locLabel = loc?.shortLabel;

      let tooltipHtml = `<div style="font-family:monospace;font-size:11px;padding:3px 6px;color:#EDE8DB;background:#1B1D19;border:1px solid #35372E;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.6);">`;
      if (isStart) {
        tooltipHtml += `<strong style="color:#22c55e;">Start (Point A)</strong>${locLabel ? `<br/><span style="color:#ffffff;">${locLabel}</span>` : '<br/><span style="color:#8B8C7F;">Resolving location...</span>'}`;
      } else if (isEnd) {
        tooltipHtml += `<strong style="color:#ef4444;">End (Point B)</strong>${locLabel ? `<br/><span style="color:#ffffff;">${locLabel}</span>` : '<br/><span style="color:#8B8C7F;">Resolving location...</span>'}`;
      } else {
        tooltipHtml += `<strong style="color:#22d3ee;">Vertex ${index + 1}</strong>${locLabel ? `<br/><span style="color:#ffffff;">${locLabel}</span>` : ''}`;
      }
      tooltipHtml += `</div>`;

      L.circleMarker(point, {
        radius: isStart || isEnd ? 7 : 5,
        color: '#1B1D19',
        fillColor: markerColor,
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip(tooltipHtml, {
          permanent: isStart || isEnd,
          direction: 'top',
          opacity: 0.95,
          offset: [0, -8],
        })
        .addTo(group);
    });

    group.addTo(map);
    layerRef.current = group;

    return () => {
      map.removeLayer(group);
      if (layerRef.current === group) layerRef.current = null;
    };
  }, [enabled, map, points, pointLocations]);

  // Dynamic hover marker synced with chart cursor
  useEffect(() => {
    if (hoverMarkerRef.current) {
      map.removeLayer(hoverMarkerRef.current);
      hoverMarkerRef.current = null;
    }

    if (!hoverPoint) return;

    const icon = L.divIcon({
      className: 'geo-transect-hover-pin',
      html: `<div style="width:14px;height:14px;background:#f59e0b;border:2px solid #ffffff;border-radius:50%;box-shadow:0 0 10px rgba(245,158,11,0.9);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker([hoverPoint.lat, hoverPoint.lng], { icon, zIndexOffset: 2000 }).addTo(map);
    hoverMarkerRef.current = marker;

    return () => {
      if (hoverMarkerRef.current) {
        map.removeLayer(hoverMarkerRef.current);
        hoverMarkerRef.current = null;
      }
    };
  }, [hoverPoint, map]);

  // Transect bottom tool control
  useEffect(() => {
    if (controlRef.current) {
      map.removeControl(controlRef.current);
      controlRef.current = null;
    }

    if (!enabled) return;

    const TransectControl = L.Control.extend({
      options: { position: 'bottomright' as L.ControlPosition },
      onAdd() {
        const div = L.DomUtil.create('div', 'geo-transect-control');
        L.DomEvent.disableClickPropagation(div);
        const distKm = (distanceMeters / 1000).toFixed(2);
        div.style.backgroundColor = 'rgba(27, 29, 25, 0.94)';
        div.style.border = '1px solid #35372E';
        div.style.padding = '8px 12px';
        div.style.borderRadius = '6px';
        div.style.color = '#EDE8DB';
        div.style.fontSize = '11px';
        div.style.fontFamily = 'monospace';
        div.style.boxShadow = '0 4px 14px rgba(0,0,0,0.5)';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.gap = '6px';
        div.style.minWidth = '220px';

        const startLoc = pointLocations[0]?.shortLabel || (points[0] ? `${points[0].lat.toFixed(3)}°, ${points[0].lng.toFixed(3)}°` : null);
        const endLoc = (points.length > 1 && pointLocations[points.length - 1]?.shortLabel) || (points.length > 1 ? `${points[points.length - 1].lat.toFixed(3)}°, ${points[points.length - 1].lng.toFixed(3)}°` : null);

        let routeHtml = '';
        if (startLoc && endLoc) {
          routeHtml = `
            <div style="background:#12140F;border:1px solid #35372E;border-radius:4px;padding:4px 6px;margin-top:2px;">
              <div style="color:#8B8C7F;font-size:9.5px;text-transform:uppercase;">Elevation Transect Route</div>
              <div style="font-weight:600;display:flex;align-items:center;gap:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px;">
                <span style="color:#22c55e;">${startLoc}</span>
                <span style="color:#8B8C7F;">→</span>
                <span style="color:#ef4444;">${endLoc}</span>
              </div>
            </div>
          `;
        } else if (startLoc) {
          routeHtml = `
            <div style="background:#12140F;border:1px solid #35372E;border-radius:4px;padding:4px 6px;margin-top:2px;">
              <div style="color:#8B8C7F;font-size:9.5px;text-transform:uppercase;">Starting Point (A)</div>
              <div style="font-weight:600;color:#22c55e;margin-top:1px;">${startLoc}</div>
            </div>
          `;
        }

        div.innerHTML = `
          <div style="font-weight: 700; color: #22d3ee; display: flex; align-items: center; gap: 6px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#22d3ee;"></span>
            Elevation Transect Line
          </div>
          ${routeHtml}
          <div style="color: #8B8C7F;">
            ${points.length < 2 ? 'Click on map to place transect points (min 2 points)' : `${points.length} points &middot; <strong style="color:#EDE8DB">${distKm} km</strong>`}
          </div>
          <div style="display: flex; gap: 6px; margin-top: 4px;">
            ${points.length >= 2 ? `<button id="btn-calc-profile" type="button" style="flex:1;background:#0891b2;color:#ffffff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-weight:600;font-size:10.5px;">Get Profile</button>` : ''}
            ${points.length > 0 ? `<button id="btn-undo-point" type="button" style="background:#2A2C24;color:#EDE8DB;border:1px solid #35372E;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:10.5px;">Undo</button>` : ''}
            ${points.length > 0 ? `<button id="btn-clear-transect" type="button" style="background:#2A2C24;color:#C56A5A;border:1px solid #35372E;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:10.5px;">Clear</button>` : ''}
          </div>
        `;

        div.querySelector('#btn-calc-profile')?.addEventListener('click', () => {
          if (onTransectDrawn && points.length >= 2) {
            const startName = pointLocations[0]?.shortLabel || `${points[0].lat.toFixed(3)}°, ${points[0].lng.toFixed(3)}°`;
            const endName = pointLocations[points.length - 1]?.shortLabel || `${points[points.length - 1].lat.toFixed(3)}°, ${points[points.length - 1].lng.toFixed(3)}°`;
            onTransectDrawn(points.map(p => [p.lng, p.lat]), startName, endName);
          }
        });

        div.querySelector('#btn-undo-point')?.addEventListener('click', () => {
          setPoints(prev => {
            const next = prev.slice(0, -1);
            setPointLocations(prevLocs => {
              const updated = { ...prevLocs };
              delete updated[next.length];
              return updated;
            });
            return next;
          });
        });

        div.querySelector('#btn-clear-transect')?.addEventListener('click', () => {
          setPoints([]);
          setPointLocations({});
        });

        return div;
      },
    });

    const control = new TransectControl();
    control.addTo(map);
    controlRef.current = control;

    return () => {
      map.removeControl(control);
      if (controlRef.current === control) controlRef.current = null;
    };
  }, [distanceMeters, enabled, map, onTransectDrawn, points, pointLocations]);

  return null;
}

function ElevationProfilePanel({
  profileData,
  onClose,
  onHoverPoint,
}: {
  profileData: any;
  onClose: () => void;
  onHoverPoint: (pt: { lat: number; lng: number } | null) => void;
}) {
  const summary = profileData.summary;
  const points = profileData.points;
  const startLoc = summary.start_location;
  const endLoc = summary.end_location;
  const routeTitle = summary.route_title || (startLoc && endLoc ? `${startLoc} → ${endLoc}` : null);

  const handleExportCSV = () => {
    const rows = [
      ['distance_km', 'elevation_m', 'latitude', 'longitude'],
      ...points.map((p: any) => [p.distance_km, p.elevation_m, p.lat, p.lng])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const sanitizedTitle = (routeTitle || 'transect').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `elevation_profile_${sanitizedTitle}_${summary.total_distance_km}km.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DraggableContainer centerHorizontally defaultPosition={{ x: 0, y: 16, bottom: true }} zIndex={1005}>
      <div className="w-[94vw] max-w-4xl bg-[#1A1D17]/95 backdrop-blur-md border border-[#2E3429] rounded-lg shadow-2xl p-4 text-[#F9FAFB] space-y-3 cursor-grab active:cursor-grabbing">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2E3429] pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[#306840]"></span>
            <span className="text-xs font-semibold tracking-tight text-white">
              Topographic Elevation:
            </span>
            {routeTitle ? (
              <span className="text-xs font-medium text-[#E0DCD3] bg-[#306840]/15 px-2 py-0.5 rounded border border-[#306840]/30">
                {routeTitle}
              </span>
            ) : (
              <span className="text-xs font-medium text-neutral-300">Transect Profile</span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              Copernicus 30m Global DEM
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="text-xs px-2.5 py-1 bg-[#22261E] hover:bg-[#282A31] border border-[#3D4537] rounded text-neutral-200 hover:text-white font-medium cursor-pointer flex items-center gap-1 transition"
              title="Download CSV of elevation profile"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer text-sm font-bold"
              title="Close profile"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Route Details Bar */}
        {(startLoc || endLoc || summary.start_point) && (
          <div className="bg-[#121410] border border-[#2E3429] rounded px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-neutral-400 text-xs font-medium">Point A (Start):</span>
              <span className="text-neutral-200 font-medium">
                {startLoc || (summary.start_point ? `${summary.start_point.lat.toFixed(4)}°, ${summary.start_point.lng.toFixed(4)}°` : 'Start')}
              </span>
            </div>

            <div className="text-[#E0DCD3] font-bold px-2 hidden sm:inline">→</div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span className="text-neutral-400 text-xs font-medium">Point B (End):</span>
              <span className="text-neutral-200 font-medium">
                {endLoc || (summary.end_point ? `${summary.end_point.lat.toFixed(4)}°, ${summary.end_point.lng.toFixed(4)}°` : 'End')}
              </span>
            </div>

            <div className="text-neutral-400 text-xs ml-auto">
              Distance: <strong className="text-[#E0DCD3] font-semibold">{summary.total_distance_km} km</strong>
            </div>
          </div>
        )}

        {/* Summary Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
          <div className="bg-[#121410] border border-[#2E3429] p-1.5 rounded">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Total Distance</span>
            <div className="font-semibold text-neutral-200 mt-0.5">{summary.total_distance_km} km</div>
          </div>
          <div className="bg-[#121410] border border-[#2E3429] p-1.5 rounded">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Min Elevation</span>
            <div className="font-semibold text-emerald-400 mt-0.5">{summary.min_elevation_m} m</div>
          </div>
          <div className="bg-[#121410] border border-[#2E3429] p-1.5 rounded">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Max Elevation</span>
            <div className="font-semibold text-rose-400 mt-0.5">{summary.max_elevation_m} m</div>
          </div>
          <div className="bg-[#121410] border border-[#2E3429] p-1.5 rounded">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Relief (Δ)</span>
            <div className="font-semibold text-[#E0DCD3] mt-0.5">{summary.elevation_relief_m} m</div>
          </div>
          <div className="bg-[#121410] border border-[#2E3429] p-1.5 rounded">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Gain / Loss</span>
            <div className="font-semibold text-neutral-200 mt-0.5">+{summary.elevation_gain_m}m / -{summary.elevation_loss_m}m</div>
          </div>
          <div className="bg-[#121410] border border-[#2E3429] p-1.5 rounded">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Max Grade</span>
            <div className="font-semibold text-[#E0DCD3] mt-0.5">{summary.max_grade_pct}%</div>
          </div>
        </div>

        {/* Profile AreaChart */}
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
              onMouseMove={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  const pt = e.activePayload[0].payload;
                  onHoverPoint({ lat: pt.lat, lng: pt.lng });
                }
              }}
              onMouseLeave={() => onHoverPoint(null)}
            >
              <defs>
                <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2C24" vertical={false} />
              <XAxis
                dataKey="distance_km"
                unit=" km"
                tick={{ fill: '#8B8C7F', fontSize: 10 }}
              />
              <YAxis
                unit=" m"
                domain={['dataMin - 10', 'dataMax + 10']}
                tick={{ fill: '#8B8C7F', fontSize: 10 }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#12140F',
                  border: '1px solid #35372E',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'monospace'
                }}
                formatter={(val: any) => [`${val} m`, 'Elevation']}
                labelFormatter={(label: any) => `Distance: ${label} km`}
              />
              <Area
                type="monotone"
                dataKey="elevation_m"
                stroke="#22d3ee"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#elevGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DraggableContainer>
  );
}

function SearchLocationMarker({
  location,
  onSetAOI,
}: {
  location?: SearchLocation | null;
  onSetAOI?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return;

    // Smoothly fly to target location with close zoom (15) so user is immediately at the exact place
    const targetZoom = Math.max(map.getZoom(), 15);
    map.flyTo([location.lat, location.lng], targetZoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });

    const shortTitle = location.shortLabel || 'Target Point';

    // Custom pointing arrow pin with ground beacon & title badge
    const icon = L.divIcon({
      className: 'geo-search-pin-wrapper',
      html: `
        <div class="geo-search-pin-container">
          <div class="geo-search-target-ring"></div>
          <div class="geo-search-target-dot"></div>
          <div class="geo-search-pin-body">
            <div class="geo-search-pin-badge">${shortTitle}</div>
            <div class="geo-search-pin-icon-wrap">
              <svg viewBox="0 0 32 42" width="32" height="42" fill="none">
                <path d="M16 41 C16 41 2 24.5 2 15 C2 7.268 8.268 1 16 1 C23.732 1 30 7.268 30 15 C30 24.5 16 41 16 41 Z" fill="#E45858" stroke="#FFFFFF" stroke-width="2" />
                <circle cx="16" cy="15" r="7.5" fill="#FFFFFF"/>
                <circle cx="16" cy="15" r="4" fill="#C53030"/>
              </svg>
            </div>
          </div>
        </div>
      `,
      iconSize: [140, 64],
      iconAnchor: [70, 64],
      popupAnchor: [0, -64],
    });

    const popupNode = document.createElement('div');
    popupNode.className = 'p-3 space-y-2 text-[#F8FAFC]';
    popupNode.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; color: #06B6D4; text-transform: uppercase; letter-spacing: 0.05em;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
        <span>Location Target</span>
      </div>
      <div>
        <div style="font-weight: 600; font-size: 12px; color: #F9FAFB; line-height: 1.2;">${location.shortLabel || 'Selected Point'}</div>
        <div style="font-size: 10px; color: #9CA3AF; margin-top: 2px; max-height: 36px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${location.label}</div>
      </div>
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; background: #1A1D17; padding: 4px 8px; border-radius: 4px; border: 1px solid #2E3429; color: #E0DCD3;">
        ${location.lat.toFixed(5)}°, ${location.lng.toFixed(5)}°
      </div>
      ${onSetAOI ? `
        <button id="geo-btn-create-aoi-popup" style="width: 100%; margin-top: 6px; padding: 6px 10px; background: #306840; color: #FFFFFF; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid rgba(153, 170, 56, 0.4); display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: background 150ms;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
          <span>Create 5km AOI Box</span>
        </button>
      ` : ''}
    `;

    if (onSetAOI) {
      const aoiBtn = popupNode.querySelector('#geo-btn-create-aoi-popup');
      if (aoiBtn) {
        aoiBtn.addEventListener('click', () => {
          onSetAOI(location.lat, location.lng);
        });
      }
    }

    const marker = L.marker([location.lat, location.lng], { 
      icon, 
      keyboard: false,
      zIndexOffset: 1000 
    })
      .bindPopup(popupNode, {
        className: 'geo-custom-popup',
        maxWidth: 260,
      })
      .addTo(map);

    const openTimer = setTimeout(() => {
      marker.openPopup();
    }, 500);

    markerRef.current = marker;
    return () => {
      clearTimeout(openTimer);
      map.removeLayer(marker);
      if (markerRef.current === marker) markerRef.current = null;
    };
  }, [location, map, onSetAOI]);

  return null;
}

// ────────────────────────── Smart Select (SAM) Handler ──────────────────────────
function SmartSelectHandler({
  enabled,
  onSmartSelectClick,
}: {
  enabled?: boolean;
  onSmartSelectClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !enabled || !onSmartSelectClick) return;

    const container = map.getContainer();
    const prevCursor = container.style.cursor;
    container.style.cursor = 'crosshair';

    const onClick = (e: L.LeafletMouseEvent) => {
      onSmartSelectClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', onClick);

    return () => {
      container.style.cursor = prevCursor;
      map.off('click', onClick);
    };
  }, [map, enabled, onSmartSelectClick]);

  return null;
}

// ────────────────────── Spectral Inspector Interactive Handler ──────────────────────
function SpectralInspectorHandler({
  enabled,
  onInspectClick,
  inspectedPoint,
}: {
  enabled?: boolean;
  onInspectClick?: (lat: number, lng: number) => void;
  inspectedPoint?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!map || !enabled || !onInspectClick) return;

    const container = map.getContainer();
    const prevCursor = container.style.cursor;
    container.style.cursor = 'crosshair';

    const onClick = (e: L.LeafletMouseEvent) => {
      onInspectClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', onClick);

    return () => {
      container.style.cursor = prevCursor;
      map.off('click', onClick);
    };
  }, [map, enabled, onInspectClick]);

  // Marker for current inspected point
  useEffect(() => {
    if (!map) return;

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (inspectedPoint) {
      const marker = L.circleMarker([inspectedPoint.lat, inspectedPoint.lng], {
        radius: 8,
        color: '#F8FAFC',
        fillColor: '#06B6D4',
        fillOpacity: 0.9,
        weight: 2.5,
      }).addTo(map);

      marker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;padding:2px;"><b>Inspected Pixel</b><br/>${inspectedPoint.lat.toFixed(5)}°, ${inspectedPoint.lng.toFixed(5)}°</div>`,
        { permanent: false, direction: 'top', opacity: 0.95 }
      );

      markerRef.current = marker;
    }

    return () => {
      if (markerRef.current && map) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, inspectedPoint]);

  return null;
}

// ────────────────────── Pixel Timeline (Historical Disturbance) Interactive Handler ──────────────────────
function PixelTimelineHandler({
  enabled,
  onInspectClick,
  inspectedPoint,
}: {
  enabled?: boolean;
  onInspectClick?: (lat: number, lng: number) => void;
  inspectedPoint?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!map || !enabled || !onInspectClick) return;

    const container = map.getContainer();
    const prevCursor = container.style.cursor;
    container.style.cursor = 'crosshair';

    const onClick = (e: L.LeafletMouseEvent) => {
      onInspectClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', onClick);

    return () => {
      container.style.cursor = prevCursor;
      map.off('click', onClick);
    };
  }, [map, enabled, onInspectClick]);

  // Marker for current inspected point
  useEffect(() => {
    if (!map) return;

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (inspectedPoint) {
      const marker = L.circleMarker([inspectedPoint.lat, inspectedPoint.lng], {
        radius: 8,
        color: '#EDE8DB',
        fillColor: '#3498db',
        fillOpacity: 0.9,
        weight: 2.5,
      }).addTo(map);

      marker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;padding:2px;"><b>5-Year Timeline Target</b><br/>${inspectedPoint.lat.toFixed(5)}°, ${inspectedPoint.lng.toFixed(5)}°</div>`,
        { permanent: false, direction: 'top', opacity: 0.95 }
      );

      markerRef.current = marker;
    }

    return () => {
      if (markerRef.current && map) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, inspectedPoint]);

  return null;
}

// ────────────────────── Building Footprints Vector Layer ──────────────────────
function BuildingFootprintsLayer({
  geojsonData,
  visible,
}: {
  geojsonData?: any;
  visible?: boolean;
}) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!visible || !geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
      return;
    }

    try {
      layerRef.current = L.geoJSON(geojsonData, {
        style: {
          color: '#C8834C',
          weight: 1.8,
          fillColor: '#C8834C',
          fillOpacity: 0.35,
          dashArray: '3 2',
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const popupContent = `
            <div style="font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; color: #EDE8DB; background: #1B1D19; padding: 6px 10px; border-radius: 4px; border: 1px solid #35372E;">
              <div style="font-weight: 600; color: #C8834C; margin-bottom: 2px;">Building #${props.id || 1}</div>
              <div>Area: <b>${props.area_m2 || 0} m²</b></div>
              <div>Perimeter: <b>${props.perimeter_m || 0} m</b></div>
              <div>Compactness: <b>${props.compactness || 0}</b></div>
              <div>Est. Height: <b>${props.height_est_m || 3.2} m</b></div>
            </div>
          `;
          layer.bindPopup(popupContent);
          layer.bindTooltip(`Bldg #${props.id}: ${props.area_m2} m²`, {
            sticky: true,
            direction: 'top',
            className: 'geo-note-tooltip',
          });
        },
        pane: 'overlayPane',
      }).addTo(map);
    } catch (e) {
      console.error("Error rendering building footprints layer:", e);
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, geojsonData, visible]);

  return null;
}

export default function MapComponent({
  onAOIDrawn,
  aoiCoords: externalAoiCoords = [],
  trueColorUrl,
  falseColorUrl,
  ndviUrl,
  classifiedUrl,
  slopeUrl,
  elevationUrl,
  hillshadeUrl,
  ndbiUrl,
  mndwiUrl,
  nbrUrl,
  baselineTrueColorUrl,
  baselineFalseColorUrl,
  baselineNdviUrl,
  baselineClassifiedUrl,
  compareMode = false,
  activeTimePeriod = 'target',
  opacity,
  activeLayer,
  mapCenter,
  mapZoom,
  searchLocation,
  onSetAOIAtPoint,
  confidenceVisible = false,
  confidenceThreshold = 72,
  measurementMode = false,
  noteMode = false,
  notes = [],
  onNoteAdd,
  swipeActive: externalSwipeActive,
  onSwipeActiveChange,
  smartSelectMode = false,
  onSmartSelectClick,
  spectralInspectorMode = false,
  onSpectralInspectorClick,
  inspectedSpectralCoord,
  timelineMode = false,
  onTimelineClick,
  inspectedTimelineCoord,
  buildingFootprintsGeoJSON,
  showBuildings = true,
  transectMode = false,
  onTransectDrawn,
  elevationProfileData,
  onClearElevationProfile,
  onCursorMove,
}: MapComponentProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [swipeActive, setSwipeActive] = useState(externalSwipeActive ?? false);
  const [isAutoWiping, setIsAutoWiping] = useState(false);
  const [swipeLeft, setSwipeLeft] = useState<string>('true_color');
  const [swipeRight, setSwipeRight] = useState<string>('classified');
  const [aoiCoords, setAoiCoords] = useState<number[][]>(externalAoiCoords);
  const [hoverTransectPoint, setHoverTransectPoint] = useState<{ lat: number; lng: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAoiCoords(externalAoiCoords);
  }, [externalAoiCoords]);

  // Sync external swipeActive prop changes
  useEffect(() => {
    if (externalSwipeActive !== undefined) {
      setSwipeActive(externalSwipeActive);
      if (!externalSwipeActive) {
        setIsAutoWiping(false);
      }
    }
  }, [externalSwipeActive]);

  // Sync initial swipe layers when compareMode changes
  useEffect(() => {
    if (externalSwipeActive === undefined) {
      setSwipeActive(false);
      if (onSwipeActiveChange) {
        onSwipeActiveChange(false);
      }
    }
    if (compareMode) {
      setSwipeLeft('target_classified');
      setSwipeRight('baseline_classified');
    } else {
      setSwipeLeft('true_color');
      setSwipeRight('classified');
    }
  }, [compareMode, onSwipeActiveChange, externalSwipeActive]);

  // Wrap onAOIDrawn to also track coords locally for the AOI boundary
  const handleAOIDrawn = useCallback((coords: number[][]) => {
    setAoiCoords(coords);
    onAOIDrawn(coords);
  }, [onAOIDrawn]);

  // Handle toggle of swipe comparing
  const handleToggleSwipe = () => {
    const nextVal = !swipeActive;
    setSwipeActive(nextVal);
    if (!nextVal) {
      setIsAutoWiping(false);
    }
    if (onSwipeActiveChange) {
      onSwipeActiveChange(nextVal);
    }
  };

  // Determine if there are active overlays
  const hasOverlays = !!(
    trueColorUrl ||
    falseColorUrl ||
    ndviUrl ||
    classifiedUrl ||
    slopeUrl ||
    elevationUrl ||
    hillshadeUrl ||
    ndbiUrl ||
    mndwiUrl ||
    nbrUrl ||
    baselineTrueColorUrl ||
    baselineFalseColorUrl ||
    baselineNdviUrl ||
    baselineClassifiedUrl
  );
  const hasActiveOverlay = activeLayer !== 'none' && hasOverlays;

  // Build map of available layer URLs
  const layerUrls: Record<string, string | undefined> = compareMode
    ? {
        target_classified: classifiedUrl,
        baseline_classified: baselineClassifiedUrl,
        target_true_color: trueColorUrl,
        baseline_true_color: baselineTrueColorUrl,
        target_false_color: falseColorUrl,
        baseline_false_color: baselineFalseColorUrl,
        target_ndvi: ndviUrl,
        baseline_ndvi: baselineNdviUrl,
        slope: slopeUrl,
        elevation: elevationUrl,
        hillshade: hillshadeUrl,
        ndbi: ndbiUrl,
        mndwi: mndwiUrl,
        nbr: nbrUrl,
      }
    : {
        true_color: trueColorUrl,
        false_color: falseColorUrl,
        ndvi: ndviUrl,
        classified: classifiedUrl,
        slope: slopeUrl,
        elevation: elevationUrl,
        hillshade: hillshadeUrl,
        ndbi: ndbiUrl,
        mndwi: mndwiUrl,
        nbr: nbrUrl,
      };

  // Available layers for swipe dropdowns
  const availableLayers = Object.entries(layerUrls).filter(([, url]) => !!url);

  // Fullscreen toggle using the native Fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Listen for fullscreen changes (e.g., user pressing Escape)
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // Label helpers for swipe
  const layerLabel = (key: string) => {
    const labels: Record<string, string> = {
      true_color: 'True Color (Optical)',
      false_color: 'False Color (NIR)',
      ndvi: 'NDVI (Canopy Vigor)',
      classified: 'Classified LULC',
      target_classified: 'Target Classified LULC',
      baseline_classified: 'Baseline Classified LULC',
      target_true_color: 'Target True Color',
      baseline_true_color: 'Baseline True Color',
      target_false_color: 'Target False Color',
      baseline_false_color: 'Baseline False Color',
      target_ndvi: 'Target NDVI',
      baseline_ndvi: 'Baseline NDVI',
      slope: 'Topographic Slope',
      elevation: 'Copernicus 30m DEM',
      hillshade: '3D Terrain Hillshade',
      ndbi: 'NDBI (Built-Up)',
      mndwi: 'MNDWI (Water Body)',
      nbr: 'NBR (Burn Severity)',
    };
    return labels[key] || key;
  };

  // Preset comparison pairs
  const swipePresets = [
    {
      id: 'baseline_vs_target',
      name: 'Baseline vs Current',
      left: 'baseline_classified',
      right: 'target_classified',
      available: !!(layerUrls.baseline_classified && layerUrls.target_classified),
      badge: '⏳ Temporal',
    },
    {
      id: 'sat_vs_lulc',
      name: 'Satellite vs LULC',
      left: compareMode ? (layerUrls.target_true_color ? 'target_true_color' : 'true_color') : 'true_color',
      right: compareMode ? (layerUrls.target_classified ? 'target_classified' : 'classified') : 'classified',
      available: !!(
        (layerUrls.target_true_color || layerUrls.true_color) &&
        (layerUrls.target_classified || layerUrls.classified)
      ),
      badge: '🛰️ Sat vs LULC',
    },
    {
      id: 'ndvi_change',
      name: 'Canopy Change',
      left: 'baseline_ndvi',
      right: 'target_ndvi',
      available: !!(layerUrls.baseline_ndvi && layerUrls.target_ndvi),
      badge: '🌱 NDVI Change',
    },
    {
      id: 'sat_vs_terrain',
      name: 'Optical vs Terrain',
      left: compareMode ? (layerUrls.target_true_color ? 'target_true_color' : 'true_color') : 'true_color',
      right: layerUrls.hillshade ? 'hillshade' : 'slope',
      available: !!(
        (layerUrls.target_true_color || layerUrls.true_color) &&
        (layerUrls.hillshade || layerUrls.slope)
      ),
      badge: '🏔️ Sat vs DEM',
    },
    {
      id: 'water_vs_urban',
      name: 'Water vs Urban',
      left: 'mndwi',
      right: 'ndbi',
      available: !!(layerUrls.mndwi && layerUrls.ndbi),
      badge: '💧 Water vs NDBI',
    },
  ];

  // Determine if swipe mode can be activated (need at least 2 layers)
  const canSwipe = availableLayers.length >= 2;
  const swipeLeftUrl = layerUrls[swipeLeft];
  const swipeRightUrl = layerUrls[swipeRight];

  // Current active layers based on selected time period
  const currentTrueColorUrl = compareMode && activeTimePeriod === 'baseline' ? baselineTrueColorUrl : trueColorUrl;
  const currentFalseColorUrl = compareMode && activeTimePeriod === 'baseline' ? baselineFalseColorUrl : falseColorUrl;
  const currentNdviUrl = compareMode && activeTimePeriod === 'baseline' ? baselineNdviUrl : ndviUrl;
  const currentClassifiedUrl = compareMode && activeTimePeriod === 'baseline' ? baselineClassifiedUrl : classifiedUrl;

  return (
    <div
      ref={containerRef}
      className={`geo-map-shell relative w-full h-full overflow-hidden ${isFullscreen ? 'bg-slate-950' : ''}`}
    >
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        zoomControl={false}
        className="w-full h-full"
      >
        <MapController center={mapCenter} zoom={mapZoom} />

        {/* Base Layers */}
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="District Map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              className="geo-reference-tiles"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite Imagery">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Dark Streets">
            <LayerGroup>
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                maxNativeZoom={16}
              />
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                maxNativeZoom={16}
              />
            </LayerGroup>
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Standard Streets">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Dynamic GEE Imagery Overlays: only shown when swipe is NOT active */}
        {!swipeActive && activeLayer === 'true_color' && currentTrueColorUrl && (
          <TileLayer key={currentTrueColorUrl} url={currentTrueColorUrl} opacity={opacity} zIndex={400} attribution="Google Earth Engine Sentinel-2" />
        )}
        {!swipeActive && activeLayer === 'false_color' && currentFalseColorUrl && (
          <TileLayer key={currentFalseColorUrl} url={currentFalseColorUrl} opacity={opacity} zIndex={400} attribution="Google Earth Engine Sentinel-2 False Color" />
        )}
        {!swipeActive && activeLayer === 'ndvi' && currentNdviUrl && (
          <TileLayer key={currentNdviUrl} url={currentNdviUrl} opacity={opacity} zIndex={400} attribution="Google Earth Engine Sentinel-2 NDVI" />
        )}
        {!swipeActive && activeLayer === 'classified' && currentClassifiedUrl && (
          <TileLayer key={currentClassifiedUrl} url={currentClassifiedUrl} opacity={opacity} zIndex={400} attribution="Google Earth Engine Classifier" />
        )}
        {!swipeActive && activeLayer === 'slope' && slopeUrl && (
          <TileLayer key={slopeUrl} url={slopeUrl} opacity={opacity} zIndex={400} attribution="Copernicus DEM Slope" />
        )}
        {!swipeActive && activeLayer === 'elevation' && elevationUrl && (
          <TileLayer key={elevationUrl} url={elevationUrl} opacity={opacity} zIndex={400} attribution="Copernicus DEM Elevation" />
        )}
        {!swipeActive && activeLayer === 'hillshade' && hillshadeUrl && (
          <TileLayer key={hillshadeUrl} url={hillshadeUrl} opacity={opacity} zIndex={400} attribution="Copernicus DEM Hillshade" />
        )}
        {!swipeActive && activeLayer === 'ndbi' && ndbiUrl && (
          <TileLayer key={ndbiUrl} url={ndbiUrl} opacity={opacity} zIndex={400} attribution="Sentinel-2 NDBI Built-Up" />
        )}
        {!swipeActive && activeLayer === 'mndwi' && mndwiUrl && (
          <TileLayer key={mndwiUrl} url={mndwiUrl} opacity={opacity} zIndex={400} attribution="Sentinel-2 MNDWI Water" />
        )}
        {!swipeActive && activeLayer === 'nbr' && nbrUrl && (
          <TileLayer key={nbrUrl} url={nbrUrl} opacity={opacity} zIndex={400} attribution="Sentinel-2 NBR Burn Ratio" />
        )}

        {/* Building Footprints Vector Layer */}
        <BuildingFootprintsLayer geojsonData={buildingFootprintsGeoJSON} visible={showBuildings} />

        {/* Smart Select (SAM) interactive click handler */}
        <SmartSelectHandler enabled={smartSelectMode} onSmartSelectClick={onSmartSelectClick} />

        {/* Spectral Inspector interactive click handler & marker */}
        <SpectralInspectorHandler
          enabled={spectralInspectorMode}
          onInspectClick={onSpectralInspectorClick}
          inspectedPoint={inspectedSpectralCoord}
        />

        {/* Pixel Timeline (Historical Disturbance Tracker) interactive click handler & marker */}
        <PixelTimelineHandler
          enabled={timelineMode}
          onInspectClick={onTimelineClick}
          inspectedPoint={inspectedTimelineCoord}
        />

        <SearchLocationMarker location={searchLocation} onSetAOI={onSetAOIAtPoint} />

        <ConfidenceOverlay
          coords={aoiCoords}
          visible={confidenceVisible}
          threshold={confidenceThreshold}
        />

        <NotesLayer
          notes={notes}
          noteMode={noteMode}
          onNoteAdd={onNoteAdd}
        />

        <MeasurementTool enabled={measurementMode} />

        <ElevationTransectTool
          enabled={transectMode}
          onTransectDrawn={onTransectDrawn}
          hoverPoint={hoverTransectPoint}
        />

        {/* Unified AOI Drawing & Boundary Controls */}
        <DrawControl coords={aoiCoords} onAOIDrawn={handleAOIDrawn} />

        {/* Coordinate Readout Tracker */}
        <CoordinateTracker onCursorMove={onCursorMove} />

        {/* Scale Bar */}
        <ScaleBar />

        {/* Minimap Overview */}
        <Minimap />

        {/* Swipe comparison: managed inside the map context */}
        {swipeActive && swipeLeftUrl && swipeRightUrl && (
          <SwipeControl
            leftUrl={swipeLeftUrl}
            rightUrl={swipeRightUrl}
            leftLabel={layerLabel(swipeLeft)}
            rightLabel={layerLabel(swipeRight)}
            opacity={opacity}
            isAutoWiping={isAutoWiping}
            onToggleAutoWipe={() => setIsAutoWiping((v) => !v)}
          />
        )}
      </MapContainer>

      {/* ── Draggable Floating Zoom Controls (bottom-left) ── */}
      <DraggableContainer defaultPosition={{ x: 16, y: 112, bottom: true }} zIndex={1002}>
        <div className="flex flex-col items-center gap-1 shadow-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg p-1.5 cursor-grab active:cursor-grabbing">
          {/* Grip handle */}
          <div className="flex flex-col gap-0.5 justify-center opacity-40 hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing select-none pb-1 border-b border-slate-800/60 w-full items-center">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-slate-400" />
              <div className="w-1 h-1 rounded-full bg-slate-400" />
            </div>
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-slate-400" />
              <div className="w-1 h-1 rounded-full bg-slate-400" />
            </div>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('map-zoom-in'))}
            className="w-8 h-8 bg-slate-900/90 text-slate-200 rounded hover:bg-slate-850 hover:text-white transition flex items-center justify-center font-bold text-lg cursor-pointer"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('map-zoom-out'))}
            className="w-8 h-8 bg-slate-900/90 text-slate-200 rounded hover:bg-slate-850 hover:text-white transition flex items-center justify-center font-bold text-lg cursor-pointer"
            aria-label="Zoom out"
          >
            −
          </button>
          <div className="w-full h-px bg-slate-800/80 my-0.5" />
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 bg-slate-900/90 text-slate-200 rounded hover:bg-slate-850 hover:text-white transition flex items-center justify-center cursor-pointer"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            )}
          </button>
        </div>
      </DraggableContainer>

      {/* ── Draggable Swipe Comparison Bar (top-center) ── */}
      {canSwipe && (
        <DraggableContainer centerHorizontally defaultPosition={{ x: 0, y: 12 }} zIndex={1003}>
          <div className="flex flex-col gap-1.5 bg-[#121410]/95 backdrop-blur-md border border-[#2E3429] rounded-xl p-2 shadow-2xl cursor-grab active:cursor-grabbing max-w-[92vw]">
            {/* Top controls row */}
            <div className="flex items-center gap-2">
              {/* Grip handle */}
              <div className="flex flex-col gap-0.5 justify-center opacity-40 hover:opacity-80 transition-opacity select-none mr-0.5">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-neutral-400" />
                  <div className="w-1 h-1 rounded-full bg-neutral-400" />
                </div>
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-neutral-400" />
                  <div className="w-1 h-1 rounded-full bg-neutral-400" />
                </div>
              </div>

              {swipeActive ? (
                <>
                  <div className="flex items-center gap-1.5">
                    {/* Left layer select */}
                    <div className="flex items-center gap-1 bg-[#1A1D17] border border-[#2E3429] rounded px-2 py-0.5">
                      <span className="w-2 h-2 rounded-full bg-[#306840]" />
                      <select
                        value={swipeLeft}
                        onChange={(e) => setSwipeLeft(e.target.value)}
                        className="bg-transparent text-[11px] text-[#F9FAFB] font-semibold outline-none cursor-pointer max-w-[140px] truncate"
                      >
                        {availableLayers.map(([key]) => (
                          <option key={key} value={key} className="bg-[#121410] text-[#F9FAFB]">
                            {layerLabel(key)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-neutral-400 text-[10px] font-bold px-0.5 uppercase tracking-wider">vs</span>

                    {/* Right layer select */}
                    <div className="flex items-center gap-1 bg-[#1A1D17] border border-[#2E3429] rounded px-2 py-0.5">
                      <span className="w-2 h-2 rounded-full bg-[#E0DCD3]" />
                      <select
                        value={swipeRight}
                        onChange={(e) => setSwipeRight(e.target.value)}
                        className="bg-transparent text-[11px] text-[#F9FAFB] font-semibold outline-none cursor-pointer max-w-[140px] truncate"
                      >
                        {availableLayers.map(([key]) => (
                          <option key={key} value={key} className="bg-[#121410] text-[#F9FAFB]">
                            {layerLabel(key)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Auto-Wipe animation toggle button */}
                  <button
                    onClick={() => setIsAutoWiping((v) => !v)}
                    title={isAutoWiping ? "Pause automated curtain wipe" : "Start cinematic auto-wipe animation"}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10.5px] font-semibold transition cursor-pointer ${
                      isAutoWiping
                        ? 'bg-[#306840]/25 text-[#E0DCD3] border border-[#306840]/60 shadow-lg'
                        : 'bg-[#1A1D17] hover:bg-[#22261E] text-[#F9FAFB] border border-[#2E3429]'
                    }`}
                  >
                    {isAutoWiping ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#306840] animate-ping" />
                        <span>Pause Wipe</span>
                      </>
                    ) : (
                      <>
                        <span>▶</span>
                        <span>Auto-Wipe</span>
                      </>
                    )}
                  </button>

                  {/* Exit Swipe button */}
                  <button
                    onClick={handleToggleSwipe}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-semibold bg-[#1A1D17] hover:bg-rose-950/40 hover:text-rose-400 text-neutral-400 border border-[#2E3429] transition cursor-pointer"
                  >
                    ✕ Exit
                  </button>
                </>
              ) : (
                <button
                  onClick={handleToggleSwipe}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-[#F9FAFB] bg-[#1A1D17] hover:bg-[#22261E] border border-[#306840]/50 transition cursor-pointer shadow-lg"
                >
                  <span className="text-[#306840]">⚡</span>
                  <span>Split-Screen Swipe Curtain</span>
                </button>
              )}
            </div>

            {/* Presets Row (visible when swipe is active) */}
            {swipeActive && (
              <div className="flex items-center gap-1 pt-1 border-t border-[#2E3429] overflow-x-auto pb-0.5">
                <span className="text-[9.5px] text-neutral-400 uppercase tracking-wider font-semibold mr-1 shrink-0">
                  Presets:
                </span>
                {swipePresets.filter((p) => p.available).map((preset) => {
                  const isActive = swipeLeft === preset.left && swipeRight === preset.right;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSwipeLeft(preset.left);
                        setSwipeRight(preset.right);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded transition shrink-0 cursor-pointer font-medium ${
                        isActive
                          ? 'bg-[#306840] text-neutral-900 font-bold shadow-md'
                          : 'bg-[#1A1D17] hover:bg-[#22261E] text-[#F9FAFB] border border-[#2E3429]'
                      }`}
                    >
                      {preset.badge} {preset.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DraggableContainer>
      )}

      {/* ── Draggable Collapsible Legend ── */}
      {hasOverlays && (
        <DraggableContainer defaultPosition={{ x: 16, y: 52, bottom: true }} zIndex={1002}>
          <div
            className={`transition-all duration-300 ease-in-out ${
              legendOpen ? 'max-w-[220px]' : ''
            }`}
          >
            {/* Collapsed state */}
            {!legendOpen && (
              <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg p-1 cursor-grab active:cursor-grabbing">
                {/* Grip handle */}
                <div className="flex flex-col gap-0.5 justify-center opacity-40 hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing select-none px-0.5">
                  <div className="w-1 h-1 rounded-full bg-slate-400" />
                  <div className="w-1 h-1 rounded-full bg-slate-400" />
                  <div className="w-1 h-1 rounded-full bg-slate-400" />
                </div>
                <button
                  onClick={() => setLegendOpen(true)}
                  className="w-8 h-8 bg-slate-900/90 text-slate-300 rounded hover:bg-slate-800 hover:text-white transition flex items-center justify-center font-bold text-lg cursor-pointer"
                  aria-label="Open legend"
                  title="Show Legend"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
              </div>
            )}

            {/* Expanded state */}
            {legendOpen && (
              <div className="bg-slate-950/92 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing">
                {/* Header with collapse button */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    {/* Grip handle */}
                    <div className="flex flex-col gap-0.5 justify-center opacity-40 hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing select-none mr-0.5">
                      <div className="flex gap-0.5">
                        <div className="w-1 h-1 rounded-full bg-slate-400" />
                        <div className="w-1 h-1 rounded-full bg-slate-400" />
                      </div>
                      <div className="flex gap-0.5">
                        <div className="w-1 h-1 rounded-full bg-slate-400" />
                        <div className="w-1 h-1 rounded-full bg-slate-400" />
                      </div>
                    </div>
                    <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      {activeLayer !== 'none' && LAYER_INFO[activeLayer]
                        ? LAYER_INFO[activeLayer].title
                        : 'Legend'}
                    </h4>
                  </div>
                  <button
                    onClick={() => setLegendOpen(false)}
                    className="w-5 h-5 text-slate-500 hover:text-slate-300 transition flex items-center justify-center rounded cursor-pointer"
                    aria-label="Collapse legend"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>

                <div className="px-3 py-2.5 space-y-2 cursor-default" onPointerDown={(e) => e.stopPropagation()}>
                  {/* Classified layer legend: show LULC classes */}
                  {(activeLayer === 'classified' || (swipeActive && (
                    swipeLeft === 'classified' || swipeRight === 'classified' ||
                    swipeLeft === 'target_classified' || swipeRight === 'target_classified' ||
                    swipeLeft === 'baseline_classified' || swipeRight === 'baseline_classified'
                  ))) && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-1 gap-1">
                        {LULC_CLASSES.map((cls) => (
                          <div key={cls.name} className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-sm border border-slate-800/50 flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: cls.color }}
                            />
                            <span className="text-[10px] text-slate-300 font-medium">{cls.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Non-classified layer legend: show band/index info */}
                  {activeLayer !== 'none' && activeLayer !== 'classified' && !swipeActive && LAYER_INFO[activeLayer] && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {LAYER_INFO[activeLayer].description}
                      </p>
                      {LAYER_INFO[activeLayer].bands && (
                        <div className="grid grid-cols-1 gap-0.5 pt-0.5">
                          {LAYER_INFO[activeLayer].bands!.map((band) => (
                            <div key={band.label} className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: band.color }}
                              />
                              <span className="text-[10px] text-slate-400 font-medium">{band.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Swipe mode: show both layer names */}
                  {swipeActive && !(
                    swipeLeft === 'classified' || swipeRight === 'classified' ||
                    swipeLeft === 'target_classified' || swipeRight === 'target_classified' ||
                    swipeLeft === 'baseline_classified' || swipeRight === 'baseline_classified'
                  ) && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="text-[10px] text-slate-300 font-medium">Left: {layerLabel(swipeLeft)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="text-[10px] text-slate-300 font-medium">Right: {layerLabel(swipeRight)}</span>
                      </div>
                    </div>
                  )}

                  {/* AOI indicator when boundary is active */}
                  {aoiCoords.length > 2 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <span className="w-4 h-0 border-t-2 border-dashed border-blue-400 flex-shrink-0" />
                      <span className="text-[10px] text-slate-400 font-medium">AOI Boundary</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DraggableContainer>
      )}

      {/* ── Elevation Profile Transect Drawer / Panel ── */}
      {elevationProfileData && (
        <ElevationProfilePanel
          profileData={elevationProfileData}
          onClose={() => {
            if (onClearElevationProfile) onClearElevationProfile();
          }}
          onHoverPoint={setHoverTransectPoint}
        />
      )}
    </div>
  );
}
