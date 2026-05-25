'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';

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
      { label: 'B4 — Red', color: '#ef4444' },
      { label: 'B3 — Green', color: '#22c55e' },
      { label: 'B2 — Blue', color: '#3b82f6' },
    ],
  },
  false_color: {
    title: 'False Color (NIR)',
    description: 'Infrared composite: B8 (NIR), B4 (Red), B3 (Green). Vegetation appears bright red.',
    bands: [
      { label: 'B8 — Near-IR', color: '#dc2626' },
      { label: 'B4 — Red', color: '#16a34a' },
      { label: 'B3 — Green', color: '#2563eb' },
    ],
  },
  ndvi: {
    title: 'NDVI Vegetation Index',
    description: 'Normalized Difference Vegetation Index: (NIR − Red) / (NIR + Red)',
    bands: [
      { label: '< 0 — Water / Bare', color: '#a16207' },
      { label: '0 – 0.3 — Sparse', color: '#d4d4aa' },
      { label: '0.3 – 0.6 — Moderate', color: '#65a30d' },
      { label: '> 0.6 — Dense', color: '#166534' },
    ],
  },
  classified: {
    title: 'Land Cover Classification',
    description: 'Model output for land use and land cover review',
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
  baselineTrueColorUrl?: string;
  baselineFalseColorUrl?: string;
  baselineNdviUrl?: string;
  baselineClassifiedUrl?: string;
  compareMode?: boolean;
  activeTimePeriod?: 'target' | 'baseline';
  opacity: number;
  activeLayer: 'none' | 'true_color' | 'false_color' | 'ndvi' | 'classified';
  mapCenter: [number, number];
  mapZoom: number;
  searchLocation?: SearchLocation | null;
  confidenceVisible?: boolean;
  confidenceThreshold?: number;
  measurementMode?: boolean;
  noteMode?: boolean;
  notes?: MapNote[];
  onNoteAdd?: (lat: number, lng: number) => void;
  onSwipeActiveChange?: (active: boolean) => void;
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
function DrawControl({ onAOIDrawn }: { onAOIDrawn: (coords: number[][]) => void }) {
  const map = useMap();
  const drawnLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map) return;

    map.pm.addControls({
      position: 'topleft',
      drawPolygon: true,
      drawRectangle: true,
      drawCircle: false,
      drawMarker: false,
      drawPolyline: false,
      drawCircleMarker: false,
      editMode: true,
      dragMode: true,
      removalMode: true,
      cutPolygon: false,
    });

    map.pm.setPathOptions({
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      weight: 2,
    });

    map.on('pm:create', (e: any) => {
      const { layer } = e;
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
      }
      drawnLayerRef.current = layer;

      const geojson = layer.toGeoJSON();
      const coords = geojson.geometry.coordinates[0] as number[][];
      onAOIDrawn(coords);

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

    return () => {
      map.pm.removeControls();
      map.off('pm:create');
      map.off('pm:remove');
    };
  }, [map, onAOIDrawn]);

  return null;
}

// ───────────────────────────── AOI Boundary Outline ─────────────────────────────
// Persistent highlighted border around the drawn AOI, always visible above overlays
function AOIBoundary({ coords }: { coords: number[][] }) {
  const map = useMap();
  const borderRef = useRef<L.Polygon | null>(null);

  useEffect(() => {
    if (borderRef.current) {
      map.removeLayer(borderRef.current);
      borderRef.current = null;
    }

    if (coords.length > 2) {
      // coords come as [lng, lat], Leaflet needs [lat, lng]
      const latLngs = coords.map(c => [c[1], c[0]] as [number, number]);

      borderRef.current = L.polygon(latLngs, {
        color: '#f59e0b',
        weight: 3,
        dashArray: '8 4',
        fill: false,
        interactive: false,
        pane: 'overlayPane', // ensures it's drawn on top
      }).addTo(map);

      // Bring to front to stay above tile layers
      borderRef.current.bringToFront();
    }

    return () => {
      if (borderRef.current) {
        map.removeLayer(borderRef.current);
        borderRef.current = null;
      }
    };
  }, [map, coords]);

  // Re-bring to front when map layers change
  useEffect(() => {
    const bringFront = () => {
      if (borderRef.current) borderRef.current.bringToFront();
    };
    map.on('layeradd', bringFront);
    return () => { map.off('layeradd', bringFront); };
  }, [map]);

  return null;
}

// ─────────────────────────── Map Controller (zoom/pan) ──────────────────────────
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

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

// ──────────────────────────── Coordinate Display ────────────────────────────────
// Floating lat/lng readout that follows the mouse cursor position
function CoordinateDisplay() {
  const map = useMap();
  const controlRef = useRef<L.Control | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const CoordControl = L.Control.extend({
      options: { position: 'bottomleft' as L.ControlPosition },
      onAdd() {
        const div = L.DomUtil.create('div', 'leaflet-coord-display');
        div.innerHTML = `<span style="opacity:0.5">Move cursor over map</span>`;
        div.style.cssText = `
          background: rgba(2, 6, 23, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(51, 65, 85, 0.6);
          border-radius: 8px;
          padding: 5px 10px;
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
          font-size: 11px;
          color: #94a3b8;
          pointer-events: none;
          user-select: none;
          min-width: 200px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        containerRef.current = div;
        return div;
      },
    });

    controlRef.current = new CoordControl();
    map.addControl(controlRef.current);

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (containerRef.current) {
        const { lat, lng } = e.latlng;
        containerRef.current.innerHTML = `
          <span style="color:#60a5fa">Lat</span> ${lat.toFixed(6)}° &nbsp;
          <span style="color:#60a5fa">Lng</span> ${lng.toFixed(6)}°
        `;
      }
    };

    const onMouseOut = () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = `<span style="opacity:0.5">Move cursor over map</span>`;
      }
    };

    map.on('mousemove', onMouseMove);
    map.on('mouseout', onMouseOut);

    return () => {
      map.off('mousemove', onMouseMove);
      map.off('mouseout', onMouseOut);
      if (controlRef.current) map.removeControl(controlRef.current);
    };
  }, [map]);

  return null;
}

// ─────────────────────────────── Scale Bar ──────────────────────────────────────
function ScaleBar() {
  const map = useMap();
  const controlRef = useRef<L.Control.Scale | null>(null);

  useEffect(() => {
    controlRef.current = L.control.scale({
      position: 'bottomleft',
      maxWidth: 150,
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

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
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
}: {
  leftUrl: string;
  rightUrl: string;
  leftLabel: string;
  rightLabel: string;
  opacity: number;
}) {
  const map = useMap();
  const leftLayerRef = useRef<L.TileLayer | null>(null);
  const rightLayerRef = useRef<L.TileLayer | null>(null);
  const sliderPosRef = useRef(50);
  const [sliderPos, setSliderPos] = useState(50);
  const draggingRef = useRef(false);

  // Clip function: apply CSS clip-path to each layer's container
  const applyClip = useCallback(() => {
    const pos = sliderPosRef.current;
    const size = map.getSize();
    const clipX = Math.round(size.x * (pos / 100));

    if (leftLayerRef.current) {
      const container = (leftLayerRef.current as any)._container as HTMLElement;
      if (container) {
        container.style.clip = `rect(0px, ${clipX}px, ${size.y}px, 0px)`;
      }
    }
    if (rightLayerRef.current) {
      const container = (rightLayerRef.current as any)._container as HTMLElement;
      if (container) {
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
    draggingRef.current = true;
    map.dragging.disable();
  }, [map]);

  return (
    <>
      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 z-[1001] pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="w-0.5 h-full bg-white/80 shadow-lg shadow-black/40" />
      </div>

      {/* Slider drag handle */}
      <div
        className="absolute top-1/2 z-[1002] -translate-y-1/2 cursor-ew-resize select-none touch-none"
        style={{ left: `${sliderPos}%`, transform: 'translate(-50%, -50%)' }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <div className="w-10 h-10 rounded-full bg-slate-900/90 border-2 border-white/70 backdrop-blur-md flex items-center justify-center shadow-xl shadow-black/40 hover:scale-110 transition-transform">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 5l-4 7 4 7" />
            <path d="M16 5l4 7-4 7" />
          </svg>
        </div>
      </div>

      {/* Left label */}
      <div className="absolute top-3 left-3 z-[1001] px-2.5 py-1 bg-slate-900/85 backdrop-blur-md border border-slate-700 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">
        {leftLabel}
      </div>

      {/* Right label */}
      <div className="absolute top-3 right-3 z-[1001] px-2.5 py-1 bg-slate-900/85 backdrop-blur-md border border-slate-700 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">
        {rightLabel}
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

function MeasurementTool({ enabled }: { enabled: boolean }) {
  const map = useMap();
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const controlRef = useRef<L.Control | null>(null);

  const distanceMeters = points.reduce((total, point, index) => {
    if (index === 0) return total;
    return total + map.distance(points[index - 1], point);
  }, 0);

  useEffect(() => {
    if (!enabled) {
      setPoints([]);
      return;
    }

    const container = map.getContainer();
    container.classList.add('geo-measure-mode');
    const handleClick = (e: L.LeafletMouseEvent) => {
      setPoints(prev => [...prev, e.latlng]);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
      container.classList.remove('geo-measure-mode');
    };
  }, [enabled, map]);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!enabled || points.length === 0) return;

    const group = L.layerGroup();
    if (points.length > 1) {
      L.polyline(points, {
        color: '#e9c947',
        weight: 3,
        dashArray: '6 5',
      }).addTo(group);
    }
    points.forEach((point, index) => {
      L.circleMarker(point, {
        radius: 5,
        color: '#233f35',
        fillColor: '#e9c947',
        fillOpacity: 1,
        weight: 2,
      }).bindTooltip(index === 0 ? 'Start' : `${index + 1}`).addTo(group);
    });

    group.addTo(map);
    layerRef.current = group;

    return () => {
      map.removeLayer(group);
      if (layerRef.current === group) layerRef.current = null;
    };
  }, [enabled, map, points]);

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
        div.innerHTML = `
          <small>Measurement</small>
          <strong>${points.length < 2 ? 'Click map points' : `${(distanceMeters / 1000).toFixed(2)} km`}</strong>
          <button type="button">Clear</button>
        `;
        div.querySelector('button')?.addEventListener('click', () => setPoints([]));
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
  }, [distanceMeters, enabled, map, points.length]);

  return null;
}

function SearchLocationMarker({ location }: { location?: SearchLocation | null }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (!location) return;

    const icon = L.divIcon({
      className: 'geo-search-location-marker',
      html: '<span></span>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const marker = L.marker([location.lat, location.lng], { icon, keyboard: false })
      .bindTooltip(`<strong>${location.shortLabel}</strong><br/>${location.label}`, {
        direction: 'top',
        opacity: 0.95,
        className: 'geo-note-tooltip',
      })
      .addTo(map);

    markerRef.current = marker;
    return () => {
      map.removeLayer(marker);
      if (markerRef.current === marker) markerRef.current = null;
    };
  }, [location, map]);

  return null;
}

export default function MapComponent({
  onAOIDrawn,
  aoiCoords: externalAoiCoords = [],
  trueColorUrl,
  falseColorUrl,
  ndviUrl,
  classifiedUrl,
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
  confidenceVisible = false,
  confidenceThreshold = 72,
  measurementMode = false,
  noteMode = false,
  notes = [],
  onNoteAdd,
  onSwipeActiveChange,
}: MapComponentProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [swipeActive, setSwipeActive] = useState(false);
  const [swipeLeft, setSwipeLeft] = useState<string>('true_color');
  const [swipeRight, setSwipeRight] = useState<string>('classified');
  const [aoiCoords, setAoiCoords] = useState<number[][]>(externalAoiCoords);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAoiCoords(externalAoiCoords);
  }, [externalAoiCoords]);

  // Sync initial swipe layers when compareMode changes
  useEffect(() => {
    setSwipeActive(false);
    if (onSwipeActiveChange) {
      onSwipeActiveChange(false);
    }
    if (compareMode) {
      setSwipeLeft('target_classified');
      setSwipeRight('baseline_classified');
    } else {
      setSwipeLeft('true_color');
      setSwipeRight('classified');
    }
  }, [compareMode, onSwipeActiveChange]);

  // Wrap onAOIDrawn to also track coords locally for the AOI boundary
  const handleAOIDrawn = useCallback((coords: number[][]) => {
    setAoiCoords(coords);
    onAOIDrawn(coords);
  }, [onAOIDrawn]);

  // Handle toggle of swipe comparing
  const handleToggleSwipe = () => {
    const nextVal = !swipeActive;
    setSwipeActive(nextVal);
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
      }
    : {
        true_color: trueColorUrl,
        false_color: falseColorUrl,
        ndvi: ndviUrl,
        classified: classifiedUrl,
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
      true_color: 'True Color',
      false_color: 'False Color',
      ndvi: 'NDVI',
      classified: 'Classification',
      target_classified: 'Target Classified',
      baseline_classified: 'Baseline Classified',
      target_true_color: 'Target True Color',
      baseline_true_color: 'Baseline True Color',
      target_false_color: 'Target False Color',
      baseline_false_color: 'Baseline False Color',
      target_ndvi: 'Target NDVI',
      baseline_ndvi: 'Baseline NDVI',
    };
    return labels[key] || key;
  };

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
      className={`geo-map-shell relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl ${isFullscreen ? 'bg-slate-950' : ''}`}
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
          <LayersControl.BaseLayer name="Night Streets">
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Standard Streets">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Dynamic GEE Imagery Overlays — only shown when swipe is NOT active */}
        {!swipeActive && activeLayer === 'true_color' && currentTrueColorUrl && (
          <TileLayer key="true_color" url={currentTrueColorUrl} opacity={opacity} zIndex={400} attribution="Google Earth Engine Sentinel-2" />
        )}
        {!swipeActive && activeLayer === 'false_color' && currentFalseColorUrl && (
          <TileLayer key="false_color" url={currentFalseColorUrl} opacity={opacity} zIndex={400} attribution="Google Earth Engine Sentinel-2 False Color" />
        )}
        {!swipeActive && activeLayer === 'ndvi' && currentNdviUrl && (
          <TileLayer key="ndvi" url={currentNdviUrl} opacity={opacity} zIndex={400} attribution="Google Earth Engine Sentinel-2 NDVI" />
        )}
        {!swipeActive && activeLayer === 'classified' && currentClassifiedUrl && (
          <TileLayer key="classified" url={currentClassifiedUrl} opacity={opacity} zIndex={400} attribution="Google Earth Engine Classifier" />
        )}

        {/* AOI Boundary Outline — always on top */}
        <AOIBoundary coords={aoiCoords} />

        <SearchLocationMarker location={searchLocation} />

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

        {/* Drawing Controls */}
        <DrawControl onAOIDrawn={handleAOIDrawn} />

        {/* Coordinate Readout */}
        <CoordinateDisplay />

        {/* Scale Bar */}
        <ScaleBar />

        {/* Minimap Overview */}
        <Minimap />

        {/* Swipe comparison — managed inside the map context */}
        {swipeActive && swipeLeftUrl && swipeRightUrl && (
          <SwipeControl
            leftUrl={swipeLeftUrl}
            rightUrl={swipeRightUrl}
            leftLabel={layerLabel(swipeLeft)}
            rightLabel={layerLabel(swipeRight)}
            opacity={opacity}
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
        </div>
      </DraggableContainer>

      {/* ── Fullscreen Toggle (top-right, below layer control) ── */}
      <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
        <button
          onClick={toggleFullscreen}
          className="w-9 h-9 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center justify-center shadow-lg cursor-pointer"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3" />
              <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
              <path d="M3 16h3a2 2 0 0 1 2 2v3" />
              <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Draggable Swipe Comparison Toggle (top-center) ── */}
      {canSwipe && (
        <DraggableContainer centerHorizontally defaultPosition={{ x: 0, y: 12 }} zIndex={1003}>
          <div className="flex items-center gap-2 bg-slate-950/92 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-2xl cursor-grab active:cursor-grabbing">
            {/* Grip handle */}
            <div className="flex flex-col gap-0.5 justify-center opacity-40 hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing select-none mr-1">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-slate-400" />
                <div className="w-1 h-1 rounded-full bg-slate-400" />
              </div>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-slate-400" />
                <div className="w-1 h-1 rounded-full bg-slate-400" />
              </div>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-slate-400" />
                <div className="w-1 h-1 rounded-full bg-slate-400" />
              </div>
            </div>
            {swipeActive && (
              <div className="flex items-center gap-1.5 mr-1">
                <select
                  value={swipeLeft}
                  onChange={(e) => setSwipeLeft(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-md text-[10px] text-slate-200 font-semibold px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {availableLayers.map(([key]) => (
                    <option key={key} value={key}>{layerLabel(key)}</option>
                  ))}
                </select>
                <span className="text-slate-500 text-[10px] font-bold">vs</span>
                <select
                  value={swipeRight}
                  onChange={(e) => setSwipeRight(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-md text-[10px] text-slate-200 font-semibold px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {availableLayers.map(([key]) => (
                    <option key={key} value={key}>{layerLabel(key)}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleToggleSwipe}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                swipeActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 3v18" />
                <path d="M8 7l-4 5 4 5" />
                <path d="M16 7l4 5-4 5" />
              </svg>
              {swipeActive ? 'Exit Compare' : 'Swipe Compare'}
            </button>
          </div>
        </DraggableContainer>
      )}

      {/* ── Draggable Collapsible Legend ── */}
      {hasOverlays && (
        <DraggableContainer defaultPosition={{ x: 16, y: 16, right: true, bottom: true }} zIndex={1002}>
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
                  {/* Classified layer legend — show LULC classes */}
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

                  {/* Non-classified layer legend — show band/index info */}
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

                  {/* Swipe mode — show both layer names */}
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
                      <span className="w-4 h-0 border-t-2 border-dashed border-amber-400 flex-shrink-0" />
                      <span className="text-[10px] text-slate-500 font-medium">AOI Boundary</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DraggableContainer>
      )}
    </div>
  );
}
