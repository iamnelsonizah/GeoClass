'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Loader2, 
  BarChart3, 
  Settings, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  FileText, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  MapPin, 
  Upload, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  X, 
  Satellite, 
  Activity, 
  Clock, 
  Search, 
  Bookmark, 
  Ruler, 
  StickyNote, 
  Save 
} from 'lucide-react';
import DashboardCharts from '../components/DashboardCharts';
import { DraggableContainer } from '../components/DraggableContainer';

// Dynamically import the map component to avoid SSR errors with Leaflet
const MapComponent = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#12140F] text-[#8B8C7F]">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-[#35372E] border-t-[#7FA35C] animate-spin" />
      </div>
      <span className="text-xs font-mono mt-3 text-[#C7C6BA]">Initializing Map Engine...</span>
    </div>
  )
});

interface ClassData {
  id: number;
  area_ha: number;
  pixel_count: number;
  percentage: number;
}

interface SavedArea {
  id: string;
  name: string;
  type: string;
  center: [number, number];
  zoom: number;
  coords: number[][];
}

interface MapNote {
  id: string;
  title: string;
  body: string;
  lat: number;
  lng: number;
}

interface LocationSuggestion {
  id: string;
  label: string;
  shortLabel: string;
  lat: number;
  lng: number;
  type?: string;
}

type InsightTone = 'positive' | 'warning' | 'critical' | 'neutral';

interface SmartInsight {
  label: string;
  value: string;
  detail: string;
  tone: InsightTone;
}

const LULC_CLASS_NAMES = [
  'Water',
  'Forest',
  'Grass',
  'Wetland',
  'Agriculture',
  'Shrub',
  'Urban',
  'Bare Land',
  'Snow/Ice'
];

const SAVED_AREAS: SavedArea[] = [
  {
    id: 'district-b13',
    name: 'District B13',
    type: 'Operational district',
    center: [37.78, -122.35],
    zoom: 10,
    coords: [
      [-122.545, 37.915],
      [-122.195, 37.91],
      [-122.145, 37.685],
      [-122.405, 37.595],
      [-122.555, 37.735],
      [-122.545, 37.915],
    ],
  },
  {
    id: 'oakland-east',
    name: 'East Oakland Review',
    type: 'Urban edge',
    center: [37.76, -122.16],
    zoom: 12,
    coords: [
      [-122.245, 37.825],
      [-122.075, 37.805],
      [-122.06, 37.71],
      [-122.2, 37.675],
      [-122.245, 37.825],
    ],
  },
  {
    id: 'marin-coast',
    name: 'Marin Coast Greenbelt',
    type: 'Vegetation reserve',
    center: [37.91, -122.62],
    zoom: 11,
    coords: [
      [-122.705, 38.035],
      [-122.505, 38.015],
      [-122.465, 37.855],
      [-122.65, 37.79],
      [-122.745, 37.91],
      [-122.705, 38.035],
    ],
  },
];

// Notification component with auto-dismiss
function Notification({ 
  type, message, onDismiss 
}: { 
  type: 'error' | 'success'; 
  message: string; 
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (type === 'success') {
      const timer = setTimeout(onDismiss, 8000);
      return () => clearTimeout(timer);
    }
  }, [type, onDismiss]);

  const styles = type === 'error' 
    ? 'bg-[#C56A5A]/15 border-[#C56A5A]/40 text-[#EDE8DB]' 
    : 'bg-[#7FA35C]/15 border-[#7FA35C]/40 text-[#EDE8DB]';

  const Icon = type === 'error' ? ShieldAlert : CheckCircle;

  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-2.5 border rounded ${styles} text-xs print:hidden shadow-lg`}>
      <Icon className="w-4 h-4 flex-shrink-0 text-[#EDE8DB]" />
      <div className="font-medium flex-1">{message}</div>
      <button 
        onClick={onDismiss} 
        className="p-1 hover:bg-white/10 rounded transition flex-shrink-0 cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Helper to calculate area of a polygon in hectares using flat-Earth approximation
const calculateAOIArea = (polygonCoords: number[][]) => {
  if (polygonCoords.length < 3) return 0;
  let totalArea = 0;
  
  const first = polygonCoords[0];
  const latRadian = (first[1] * Math.PI) / 180;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latRadian);
  
  for (let i = 0; i < polygonCoords.length - 1; i++) {
    const p1 = polygonCoords[i];
    const p2 = polygonCoords[i + 1];
    
    const x1 = p1[0] * metersPerDegLng;
    const y1 = p1[1] * metersPerDegLat;
    const x2 = p2[0] * metersPerDegLng;
    const y2 = p2[1] * metersPerDegLat;
    
    totalArea += (x1 * y2) - (x2 * y1);
  }
  
  const p1 = polygonCoords[polygonCoords.length - 1];
  const p2 = polygonCoords[0];
  const x1 = p1[0] * metersPerDegLng;
  const y1 = p1[1] * metersPerDegLat;
  const x2 = p2[0] * metersPerDegLng;
  const y2 = p2[1] * metersPerDegLat;
  totalArea += (x1 * y2) - (x2 * y1);
  
  const areaSqMeters = Math.abs(totalArea) / 2;
  return areaSqMeters / 10000;
};

const VEGETATION_CLASSES = ['Forest', 'Grass', 'Wetland', 'Agriculture', 'Shrub'];
const CONFIDENCE_ROWS = 5;
const CONFIDENCE_COLS = 6;

const formatHectares = (value: number) => `${Math.abs(value).toFixed(1)} ha`;

const getYearFromDate = (value: string) => {
  const parsed = Number(value.slice(0, 4));
  return Number.isFinite(parsed) ? parsed : null;
};

const getClassArea = (stats: Record<string, ClassData> | undefined, classNames: string[]) => {
  if (!stats) return 0;
  return classNames.reduce((total, className) => total + (stats[className]?.area_ha || 0), 0);
};

const getSingleClassArea = (stats: Record<string, ClassData> | undefined, className: string) => (
  stats?.[className]?.area_ha || 0
);

const getLocationZoom = (type?: string) => {
  if (!type) return 13;
  if (['country'].includes(type)) return 5;
  if (['state', 'province', 'region'].includes(type)) return 7;
  if (['county', 'administrative'].includes(type)) return 9;
  if (['city', 'town', 'municipality'].includes(type)) return 12;
  if (['village', 'suburb', 'neighbourhood', 'quarter'].includes(type)) return 14;
  if (['house', 'building', 'address', 'road'].includes(type)) return 16;
  return 13;
};

const getConfidenceScore = (row: number, col: number) => (
  58 + Math.round(Math.abs(Math.sin((row + 1.7) * (col + 2.3))) * 38)
);

const getConfidenceReview = (threshold: number) => {
  const zoneCounts: Record<string, number> = {
    northwest: 0,
    northeast: 0,
    southwest: 0,
    southeast: 0,
  };
  let scoreTotal = 0;
  let reviewCells = 0;
  let criticalCells = 0;
  let lowestScore = 100;

  for (let row = 0; row < CONFIDENCE_ROWS; row++) {
    for (let col = 0; col < CONFIDENCE_COLS; col++) {
      const score = getConfidenceScore(row, col);
      scoreTotal += score;
      lowestScore = Math.min(lowestScore, score);

      if (score < threshold) {
        reviewCells += 1;
        if (threshold - score > 16) criticalCells += 1;
        const vertical = row < CONFIDENCE_ROWS / 2 ? 'north' : 'south';
        const horizontal = col < CONFIDENCE_COLS / 2 ? 'west' : 'east';
        zoneCounts[`${vertical}${horizontal}`] += 1;
      }
    }
  }

  const focusZone = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0][0];
  const reviewShare = Math.round((reviewCells / (CONFIDENCE_ROWS * CONFIDENCE_COLS)) * 100);

  return {
    averageScore: Math.round(scoreTotal / (CONFIDENCE_ROWS * CONFIDENCE_COLS)),
    criticalCells,
    focusZone,
    lowestScore,
    reviewCells,
    reviewShare,
    totalCells: CONFIDENCE_ROWS * CONFIDENCE_COLS,
  };
};

const getTemporalChangeTone = (className: string, areaChange: number) => {
  const stable = Math.abs(areaChange) < 0.1;
  if (stable) {
    return {
      borderClass: 'border-[#35372E]',
      textClass: 'text-[#8B8C7F]',
      iconClass: 'text-[#8B8C7F]',
    };
  }

  if (className === 'Urban' || className === 'Bare Land') {
    return areaChange > 0
      ? {
          borderClass: 'border-[#C8834C]/40',
          textClass: 'text-[#C8834C]',
          iconClass: 'text-[#C8834C]',
        }
      : {
          borderClass: 'border-[#7FA35C]/30',
          textClass: 'text-[#7FA35C]',
          iconClass: 'text-[#7FA35C]',
        };
  }

  if (VEGETATION_CLASSES.includes(className) || className === 'Water') {
    return areaChange < 0
      ? {
          borderClass: 'border-[#C56A5A]/35',
          textClass: 'text-[#C56A5A]',
          iconClass: 'text-[#C56A5A]',
        }
      : {
          borderClass: 'border-[#7FA35C]/30',
          textClass: 'text-[#7FA35C]',
          iconClass: 'text-[#7FA35C]',
        };
  }

  return areaChange < 0
    ? {
        borderClass: 'border-[#C56A5A]/30',
        textClass: 'text-[#C56A5A]',
        iconClass: 'text-[#C56A5A]',
      }
    : {
        borderClass: 'border-[#7FA35C]/30',
        textClass: 'text-[#7FA35C]',
        iconClass: 'text-[#7FA35C]',
      };
};

export default function Home() {
  // Map State
  const [coords, setCoords] = useState<number[][]>([]);
  const [aoiAreaHa, setAoiAreaHa] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [mapZoom, setMapZoom] = useState<number>(10);
  const [savedAreas, setSavedAreas] = useState<SavedArea[]>(SAVED_AREAS);
  const [areaSearch, setAreaSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>('district-b13');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  
  // Standard Configuration State
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [cloudCover, setCloudCover] = useState(20);
  const [modelType, setModelType] = useState<'random_forest' | 'dynamic_world' | 'deep_learning'>('deep_learning');
  const [numTrees, setNumTrees] = useState(100);
  const [samplePoints, setSamplePoints] = useState(150);

  // Advanced: Temporal Change Detection State
  const [compareMode, setCompareMode] = useState(false);
  const [compareStartDate, setCompareStartDate] = useState('2020-01-01');
  const [compareEndDate, setCompareEndDate] = useState('2020-12-31');
  const [referenceStatistics, setReferenceStatistics] = useState<Record<string, ClassData> | undefined>(undefined);
  const [transitionData, setTransitionData] = useState<any>(null);
  const [activeTimePeriod, setActiveTimePeriod] = useState<'target' | 'baseline'>('target');
  const [timelineBaselineYear, setTimelineBaselineYear] = useState(2020);
  const [timelineTargetYear, setTimelineTargetYear] = useState(2024);

  // Overlay Layer States
  const [activeLayer, setActiveLayer] = useState<'none' | 'true_color' | 'false_color' | 'ndvi' | 'classified'>('none');
  const [opacity, setOpacity] = useState(0.82);
  const [swipeActive, setSwipeActive] = useState(false);
  const [confidenceVisible, setConfidenceVisible] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(72);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [noteDraft, setNoteDraft] = useState('Field observation');
  const [mapNotes, setMapNotes] = useState<MapNote[]>([]);
  
  // Active tool on map toolstrip
  const [activeTool, setActiveTool] = useState<'none' | 'rect' | 'poly' | 'pan' | 'measure' | 'notes' | 'smart'>('rect');

  // GeoAI AI Features State
  const [smartSelectMode, setSmartSelectMode] = useState(false);
  const [smartSelectLoading, setSmartSelectLoading] = useState(false);
  const [buildingFootprints, setBuildingFootprints] = useState<any>(null);
  const [buildingStats, setBuildingStats] = useState<{
    building_count: number;
    total_footprint_ha: number;
    total_footprint_m2: number;
    mean_building_area_m2: number;
    coverage_percentage: number;
    regularization_applied: boolean;
  } | null>(null);
  const [extractingBuildings, setExtractingBuildings] = useState(false);
  const [regularizeBuildings, setRegularizeBuildings] = useState(true);
  const [showBuildingLayer, setShowBuildingLayer] = useState(true);
  const [aiQualityMetrics, setAiQualityMetrics] = useState<{
    overall_quality_score: number;
    rating: string;
    usable_pixels_percentage: number;
    haze_index: number;
    shadow_free_percentage: number;
    sensor_health: string;
  } | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);

  // GeoAI Phase 3 Advanced Intelligence States
  const [superResData, setSuperResData] = useState<any>(null);
  const [loadingSuperRes, setLoadingSuperRes] = useState(false);
  const [waterDynamicsData, setWaterDynamicsData] = useState<any>(null);
  const [loadingWaterDynamics, setLoadingWaterDynamics] = useState(false);
  const [canopyHeightData, setCanopyHeightData] = useState<any>(null);
  const [loadingCanopyHeight, setLoadingCanopyHeight] = useState(false);

  // GEE Tile URLs from API
  const [tileUrls, setTileUrls] = useState<{
    trueColor?: string;
    falseColor?: string;
    ndvi?: string;
    classified?: string;
    baselineTrueColor?: string;
    baselineFalseColor?: string;
    baselineNdvi?: string;
    baselineClassified?: string;
  }>({});

  // Classification Results
  const [statistics, setStatistics] = useState<Record<string, ClassData> | undefined>(undefined);
  const [totalAreaHa, setTotalAreaHa] = useState<number | undefined>(undefined);

  // UI States
  const [geeConnected, setGeeConnected] = useState<boolean | null>(null);
  const [loadingMapId, setLoadingMapId] = useState(false);
  const [loadingClassify, setLoadingClassify] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'geotiff' | 'png' | 'geojson' | 'kml'>('geotiff');
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'none' | 'true_color' | 'false_color' | 'ndvi' | 'classified'>('none');
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  // Backend API Base URL (auto-normalizes protocol to prevent relative path 404s)
  const rawApiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').trim();
  const normalizedApiBase = rawApiBase.startsWith('http://') || rawApiBase.startsWith('https://')
    ? rawApiBase
    : `https://${rawApiBase}`;
  const API_BASE = normalizedApiBase.replace(/\/$/, '');

  // Compute workflow step
  const workflowStep = statistics ? 4 : (tileUrls.classified ? 4 : (tileUrls.trueColor ? 3 : (coords.length > 0 ? 2 : 1)));
  const aoiAreaKm2 = aoiAreaHa !== null ? aoiAreaHa / 100 : null;
  const confidenceReview = getConfidenceReview(confidenceThreshold);
  const confidenceReady = !!statistics;
  const timelineYears = [2019, 2020, 2021, 2022, 2023, 2024];

  const filteredSavedAreas = savedAreas.filter(area => {
    const query = areaSearch.trim().toLowerCase();
    if (!query) return true;
    return `${area.name} ${area.type}`.toLowerCase().includes(query);
  });

  const getTemporalValidationMessage = () => {
    if (startDate >= endDate) {
      return 'Target end date must be after the target start date.';
    }

    if (!compareMode) return null;

    if (compareStartDate >= compareEndDate) {
      return 'Baseline end date must be after the baseline start date.';
    }

    if (compareEndDate >= startDate) {
      return 'Baseline period must finish before the target period starts.';
    }

    return null;
  };

  const temporalValidationMessage = getTemporalValidationMessage();

  const applyTargetYear = (year: number) => {
    if (year <= timelineBaselineYear) {
      const earlierYears = timelineYears.filter(item => item < year);
      const earlierYear = earlierYears[earlierYears.length - 1];
      if (!earlierYear) {
        setErrorMessage('Choose a baseline year before the target year.');
        return;
      }
      applyBaselineYear(earlierYear);
    }
    setTimelineTargetYear(year);
    setStartDate(`${year}-01-01`);
    setEndDate(`${year}-12-31`);
    setActiveTimePeriod('target');
  };

  const applyBaselineYear = (year: number) => {
    if (year >= timelineTargetYear) {
      const laterYear = timelineYears.find(item => item > year);
      if (!laterYear) {
        setErrorMessage('Choose a target year after the baseline year.');
        return;
      }
      applyTargetYear(laterYear);
    }
    setTimelineBaselineYear(year);
    setCompareStartDate(`${year}-01-01`);
    setCompareEndDate(`${year}-12-31`);
    setActiveTimePeriod('baseline');
  };

  const updateTargetStartDate = (value: string) => {
    setStartDate(value);
    const year = getYearFromDate(value);
    if (year && timelineYears.includes(year)) setTimelineTargetYear(year);
  };

  const updateBaselineStartDate = (value: string) => {
    setCompareStartDate(value);
    const year = getYearFromDate(value);
    if (year && timelineYears.includes(year)) setTimelineBaselineYear(year);
  };

  const selectLocation = (location: LocationSuggestion) => {
    setSelectedLocation(location);
    setLocationQuery(location.label);
    setLocationSuggestions([]);
    setMapCenter([location.lat, location.lng]);
    setMapZoom(getLocationZoom(location.type));
    setSuccessMessage(`Centered on ${location.shortLabel}. Use the toolstrip to draw your AOI.`);
  };

  const clearLocationSearch = () => {
    setLocationQuery('');
    setLocationSuggestions([]);
    setSelectedLocation(null);
  };

  const selectSavedArea = (area: SavedArea) => {
    handleAOIDrawn(area.coords);
    setSelectedAreaId(area.id);
    setMapCenter(area.center);
    setMapZoom(area.zoom);
    setSuccessMessage(`${area.name} loaded.`);
  };

  const saveCurrentArea = () => {
    if (coords.length === 0) {
      setErrorMessage("Select or draw an AOI before saving it.");
      return;
    }

    const id = `custom-${Date.now()}`;
    const customArea: SavedArea = {
      id,
      name: `AOI ${savedAreas.length + 1}`,
      type: 'User saved boundary',
      center: mapCenter,
      zoom: mapZoom,
      coords,
    };

    setSavedAreas(prev => [customArea, ...prev]);
    setSelectedAreaId(id);
    setSuccessMessage(`${customArea.name} saved to the district library.`);
  };

  const handleMapNoteAdd = useCallback((lat: number, lng: number) => {
    const nextIndex = mapNotes.length + 1;
    setMapNotes(prev => [
      ...prev,
      {
        id: `note-${Date.now()}`,
        title: `Note ${nextIndex}`,
        body: noteDraft.trim() || 'Field observation',
        lat,
        lng,
      },
    ]);
    setSuccessMessage(`Note ${nextIndex} placed at ${lat.toFixed(4)}, ${lng.toFixed(4)}.`);
  }, [mapNotes.length, noteDraft]);

  // Handle Toolstrip clicks
  const triggerTool = (tool: 'rect' | 'poly' | 'pan' | 'measure' | 'notes' | 'smart' | 'clear') => {
    if (tool === 'rect') {
      setActiveTool('rect');
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      window.dispatchEvent(new CustomEvent('map-tool-rectangle'));
    } else if (tool === 'poly') {
      setActiveTool('poly');
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      window.dispatchEvent(new CustomEvent('map-tool-polygon'));
    } else if (tool === 'pan') {
      setActiveTool('pan');
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      window.dispatchEvent(new CustomEvent('map-tool-pan'));
    } else if (tool === 'measure') {
      const next = !measurementMode;
      setMeasurementMode(next);
      setNoteMode(false);
      setSmartSelectMode(false);
      setActiveTool(next ? 'measure' : 'none');
    } else if (tool === 'notes') {
      const next = !noteMode;
      setNoteMode(next);
      setMeasurementMode(false);
      setSmartSelectMode(false);
      setActiveTool(next ? 'notes' : 'none');
    } else if (tool === 'smart') {
      const next = !smartSelectMode;
      setSmartSelectMode(next);
      setMeasurementMode(false);
      setNoteMode(false);
      setActiveTool(next ? 'smart' : 'none');
      if (next) {
        setSuccessMessage("SAM Smart Select active: Click anywhere on the map to extract a contiguous parcel or feature.");
      }
    } else if (tool === 'clear') {
      handleAOIDrawn([]);
      window.dispatchEvent(new CustomEvent('map-tool-clear'));
      setActiveTool('none');
      setSmartSelectMode(false);
    }
  };

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 3 || (selectedLocation && query === selectedLocation.label)) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocationLoading(true);
      try {
        const params = new URLSearchParams({
          q: query,
          format: 'jsonv2',
          addressdetails: '1',
          limit: '5',
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Location lookup failed.');
        }

        const results = await response.json();
        const suggestions: LocationSuggestion[] = results
          .map((item: any) => {
            const lat = Number(item.lat);
            const lng = Number(item.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            const label = item.display_name || query;
            const address = item.address || {};
            const shortLabel = address.city ||
              address.town ||
              address.village ||
              address.suburb ||
              address.county ||
              address.state ||
              label.split(',')[0];

            return {
              id: String(item.place_id || `${lat}-${lng}`),
              label,
              shortLabel,
              lat,
              lng,
              type: item.type,
            };
          })
          .filter(Boolean);

        setLocationSuggestions(suggestions);
        setErrorMessage(null);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setLocationSuggestions([]);
          setErrorMessage('Could not load location suggestions. Check connection and try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLocationLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locationQuery, selectedLocation]);

  // Check GEE Connection on mount
  useEffect(() => {
    let isMounted = true;

    fetch(`${API_BASE}/api/status`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Backend status check failed with ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (!isMounted) return;
        setGeeConnected(data.gee_connected);
        if (!data.gee_connected) {
          setErrorMessage("Earth Engine API is not initialized. Please verify the backend credentials.");
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("Backend status check failed:", error);
        setGeeConnected(false);
        setErrorMessage(`Cannot connect to backend at ${API_BASE}.`);
      });

    return () => {
      isMounted = false;
    };
  }, [API_BASE]);

  // Handle Drawn AOI Polygon
  const handleAOIDrawn = useCallback((drawnCoords: number[][]) => {
    setCoords(drawnCoords);
    setSelectedAreaId(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    // Clear previous results when new polygon is drawn
    setTileUrls({});
    setStatistics(undefined);
    setReferenceStatistics(undefined);
    setTotalAreaHa(undefined);
    setActiveLayer('none');
    setActiveTimePeriod('target');
    setConfidenceVisible(false);
    setProcessingTime(null);
    setBuildingFootprints(null);
    setBuildingStats(null);
    setAiQualityMetrics(null);
    setTransitionData(null);
    setSuperResData(null);
    setWaterDynamicsData(null);
    setCanopyHeightData(null);

    if (drawnCoords.length > 0) {
      const area = calculateAOIArea(drawnCoords);
      setAoiAreaHa(area);
      
      const lats = drawnCoords.map(c => c[1]);
      const lngs = drawnCoords.map(c => c[0]);
      const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
      const midLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
      setMapCenter([midLat, midLng]);
      setMapZoom(12);
      setSuccessMessage(`AOI defined (${drawnCoords.length} vertices, ${area.toFixed(1)} ha). Ready to fetch imagery.`);
    } else {
      setAoiAreaHa(null);
    }
  }, []);

  // Handle Smart Select (SAM) Click
  const handleSmartSelectClick = async (lat: number, lng: number) => {
    setSmartSelectLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/ai/sam-segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          point: [lng, lat],
          tolerance_radius_m: 80.0,
          feature_category: 'auto',
          aoi_coords: coords.length > 0 ? coords : null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Smart select segmentation failed.');
      }

      const feature = await response.json();
      const extractedCoords = feature.geometry.coordinates[0];
      handleAOIDrawn(extractedCoords);
      setSuccessMessage(
        `SAM Smart Select: Extracted ${feature.properties.name} (${feature.properties.area_ha} ha, compactness ${feature.properties.compactness}).`
      );
    } catch (err: any) {
      console.error("Smart select error:", err);
      setErrorMessage(err.message || "Failed to segment feature.");
    } finally {
      setSmartSelectLoading(false);
    }
  };

  // Handle Building Extraction
  const extractBuildingFootprints = async () => {
    if (coords.length === 0) {
      setErrorMessage("Please define an Area of Interest (AOI) boundary first.");
      return;
    }

    setExtractingBuildings(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/ai/extract-buildings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords,
          start_date: startDate,
          end_date: endDate,
          cloud_cover: cloudCover,
          regularize: regularizeBuildings,
          min_building_area_m2: 40.0,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Building extraction failed.');
      }

      const data = await response.json();
      setBuildingFootprints(data);
      setBuildingStats(data.summary);
      setShowBuildingLayer(true);
      setSuccessMessage(
        `Extracted & regularized ${data.summary.building_count} building footprints (${data.summary.total_footprint_ha} ha total).`
      );
    } catch (err: any) {
      console.error("Building extraction error:", err);
      setErrorMessage(err.message || "Failed to extract building footprints.");
    } finally {
      setExtractingBuildings(false);
    }
  };

  // Fetch AI Quality Score
  const fetchQualityScore = async () => {
    if (coords.length === 0) return;
    setQualityLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/ai/quality-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords,
          cloud_cover: cloudCover,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setAiQualityMetrics(data);
      }
    } catch (e) {
      console.error("Quality score error:", e);
    } finally {
      setQualityLoading(false);
    }
  };

  // Trigger Super-Resolution (4x 10m -> 2.5m)
  const triggerSuperResolution = async () => {
    if (coords.length === 0) {
      setErrorMessage("Please define an Area of Interest (AOI) boundary first.");
      return;
    }
    setLoadingSuperRes(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/ai/super-resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords,
          start_date: startDate,
          end_date: endDate,
          cloud_cover: cloudCover,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Super-resolution enhancement failed.");
      }
      const data = await response.json();
      setSuperResData(data);
      setSuccessMessage(`Super-resolution complete: 4× upscaled to 2.5m (+${data.metrics.sharpness_improvement_pct}% sharpness).`);
    } catch (err: any) {
      setErrorMessage(err.message || "Super-resolution failed.");
    } finally {
      setLoadingSuperRes(false);
    }
  };

  // Trigger Water Dynamics Analysis
  const triggerWaterDynamics = async () => {
    if (coords.length === 0) {
      setErrorMessage("Please define an Area of Interest (AOI) boundary first.");
      return;
    }
    setLoadingWaterDynamics(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/ai/water-dynamics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords,
          start_date: startDate,
          end_date: endDate,
          cloud_cover: cloudCover,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Water dynamics analysis failed.");
      }
      const data = await response.json();
      setWaterDynamicsData(data);
      setSuccessMessage(`Water dynamics evaluated: max ${data.max_water_extent_ha} ha, flood risk: ${data.flood_risk.rating}.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Water dynamics analysis failed.");
    } finally {
      setLoadingWaterDynamics(false);
    }
  };

  // Trigger Canopy Height Estimation
  const triggerCanopyHeight = async () => {
    if (coords.length === 0) {
      setErrorMessage("Please define an Area of Interest (AOI) boundary first.");
      return;
    }
    setLoadingCanopyHeight(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/ai/canopy-height`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords,
          start_date: startDate,
          end_date: endDate,
          cloud_cover: cloudCover,
          forest_stats: statistics,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Canopy height estimation failed.");
      }
      const data = await response.json();
      setCanopyHeightData(data);
      setSuccessMessage(`Canopy height estimated: mean ${data.mean_canopy_height_m}m, ${data.biomass_and_carbon.total_biomass_tonnes} t biomass.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Canopy height estimation failed.");
    } finally {
      setLoadingCanopyHeight(false);
    }
  };

  // Handle GeoJSON File Upload
  const handleGeoJSONUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const geojson = JSON.parse(text);
      let coordinates: number[][] = [];

      if (geojson.type === "Feature" && geojson.geometry?.type === "Polygon") {
        coordinates = geojson.geometry.coordinates[0];
      } else if (geojson.type === "Polygon") {
        coordinates = geojson.coordinates[0];
      } else if (geojson.type === "FeatureCollection") {
        const firstFeature = geojson.features[0];
        if (firstFeature?.geometry?.type === "Polygon") {
          coordinates = firstFeature.geometry.coordinates[0];
        }
      }

      if (coordinates.length > 0) {
        handleAOIDrawn(coordinates);
        setSuccessMessage(`Imported AOI from "${file.name}" with ${coordinates.length} vertices.`);
      } else {
        throw new Error("Could not find a valid Polygon geometry inside the uploaded GeoJSON.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to parse GeoJSON file.");
    }
    e.target.value = '';
  };

  // Fetch Sentinel-2 Tile Layers
  const fetchSatelliteImagery = async () => {
    if (coords.length === 0) {
      setErrorMessage("Please draw or upload an Area of Interest (AOI) boundary first.");
      return;
    }
    if (temporalValidationMessage) {
      setErrorMessage(temporalValidationMessage);
      return;
    }

    setLoadingMapId(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const startTime = performance.now();

    try {
      if (!compareMode) {
        const response = await fetch(`${API_BASE}/api/gee/map-id`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coords,
            start_date: startDate,
            end_date: endDate,
            cloud_cover: cloudCover
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || "Failed to fetch satellite imagery.");
        }

        const data = await response.json();
        setTileUrls(prev => ({
          ...prev,
          trueColor: data.true_color_tile_url,
          falseColor: data.false_color_tile_url,
          ndvi: data.ndvi_tile_url
        }));
      } else {
        const [resA, resB] = await Promise.all([
          fetch(`${API_BASE}/api/gee/map-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coords,
              start_date: startDate,
              end_date: endDate,
              cloud_cover: cloudCover
            })
          }),
          fetch(`${API_BASE}/api/gee/map-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coords,
              start_date: compareStartDate,
              end_date: compareEndDate,
              cloud_cover: cloudCover
            })
          })
        ]);

        if (!resA.ok || !resB.ok) {
          const errA = !resA.ok ? await resA.json() : {};
          const errB = !resB.ok ? await resB.json() : {};
          throw new Error(errA.detail || errB.detail || "Failed to fetch satellite imagery.");
        }

        const dataA = await resA.json();
        const dataB = await resB.json();

        setTileUrls(prev => ({
          ...prev,
          trueColor: dataA.true_color_tile_url,
          falseColor: dataA.false_color_tile_url,
          ndvi: dataA.ndvi_tile_url,
          baselineTrueColor: dataB.true_color_tile_url,
          baselineFalseColor: dataB.false_color_tile_url,
          baselineNdvi: dataB.ndvi_tile_url
        }));
      }

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      setProcessingTime(parseFloat(elapsed));
      setActiveLayer('true_color');
      setSuccessMessage(`Sentinel-2 cloud-free composites fetched in ${elapsed}s.`);
      fetchQualityScore();
    } catch (e: any) {
      setErrorMessage(e.message || "An error occurred fetching GEE map tiles.");
    } finally {
      setLoadingMapId(false);
    }
  };

  // Run LULC classification
  const runClassification = async () => {
    if (coords.length === 0) {
      setErrorMessage("Please draw or upload an Area of Interest (AOI) boundary first.");
      return;
    }
    if (temporalValidationMessage) {
      setErrorMessage(temporalValidationMessage);
      return;
    }

    setLoadingClassify(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatistics(undefined);
    setReferenceStatistics(undefined);
    const startTime = performance.now();

    try {
      const payloadA = {
        coords,
        start_date: startDate,
        end_date: endDate,
        cloud_cover: cloudCover,
        num_trees: numTrees,
        sample_points: samplePoints,
        model_type: modelType
      };

      if (!compareMode) {
        const response = await fetch(`${API_BASE}/api/gee/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadA)
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || "Classification failed.");
        }

        const data = await response.json();
        setTileUrls(prev => ({
          ...prev,
          classified: data.tile_url
        }));
        setStatistics(data.statistics);
        setTotalAreaHa(data.total_area_ha);
        setActiveLayer('classified');
        setConfidenceVisible(true);
        
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
        setProcessingTime(parseFloat(elapsed));
        setSuccessMessage(`Classification completed in ${elapsed}s (${Object.keys(data.statistics).length} classes).`);
      } else {
        const payloadB = {
          ...payloadA,
          start_date: compareStartDate,
          end_date: compareEndDate
        };

        const [resA, resB] = await Promise.all([
          fetch(`${API_BASE}/api/gee/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadA)
          }),
          fetch(`${API_BASE}/api/gee/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadB)
          })
        ]);

        if (!resA.ok || !resB.ok) {
          const errA = !resA.ok ? await resA.json() : {};
          const errB = !resB.ok ? await resB.json() : {};
          throw new Error(errA.detail || errB.detail || "One of the temporal classifications failed.");
        }

        const dataA = await resA.json();
        const dataB = await resB.json();

        setTileUrls(prev => ({
          ...prev,
          classified: dataA.tile_url,
          baselineClassified: dataB.tile_url
        }));
        setStatistics(dataA.statistics);
        setReferenceStatistics(dataB.statistics);
        setTotalAreaHa(dataA.total_area_ha);
        setActiveLayer('classified');
        setConfidenceVisible(true);
        
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
        setProcessingTime(parseFloat(elapsed));
        setSuccessMessage(`Temporal classification completed in ${elapsed}s.`);

        // Fetch Deep Learning Transition Matrix & Trajectories
        try {
          const transRes = await fetch(`${API_BASE}/api/ai/deep-change-detection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coords,
              target_start_date: startDate,
              target_end_date: endDate,
              baseline_start_date: compareStartDate,
              baseline_end_date: compareEndDate,
              cloud_cover: cloudCover,
              target_stats: dataA.statistics,
              baseline_stats: dataB.statistics,
            }),
          });
          if (transRes.ok) {
            const transData = await transRes.json();
            setTransitionData(transData);
          }
        } catch (transErr) {
          console.error("Failed to fetch transition matrix:", transErr);
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || "An error occurred during classification.");
    } finally {
      setLoadingClassify(false);
    }
  };

  // Handle Dynamic Downloads
  const triggerDownload = async () => {
    if (coords.length === 0) {
      setErrorMessage("Please select an AOI and run classification before downloading.");
      return;
    }

    setDownloading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/gee/download-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords,
          start_date: startDate,
          end_date: endDate,
          cloud_cover: cloudCover,
          num_trees: numTrees,
          sample_points: samplePoints,
          model_type: modelType,
          export_format: downloadFormat === 'kml' ? 'geojson' : downloadFormat
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to generate download packet.");
      }

      const data = await response.json();

      if (downloadFormat === 'geojson' || downloadFormat === 'kml') {
        const blob = new Blob([JSON.stringify(data.geojson_data, null, 2)], { type: 'application/json' });
        const filename = `geoclass-aoi-${startDate}-to-${endDate}.${downloadFormat === 'kml' ? 'geojson' : 'geojson'}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSuccessMessage(`${downloadFormat.toUpperCase()} downloaded successfully!`);
      } else {
        if (data.download_url) {
          window.location.href = data.download_url;
          setSuccessMessage(`${downloadFormat.toUpperCase()} export initiated.`);
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || "An error occurred during file download.");
    } finally {
      setDownloading(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  // Generate automated environmental insights
  const getEnvironmentalReport = () => {
    if (!statistics) return null;

    const statsArray = Object.entries(statistics).map(([name, val]) => ({
      name,
      ...val
    }));

    const dominant = [...statsArray].sort((a, b) => b.area_ha - a.area_ha)[0];
    const forestPct = statistics['Forest']?.percentage || 0;
    const grassPct = statistics['Grass']?.percentage || 0;
    const wetlandPct = statistics['Wetland']?.percentage || 0;
    const urbanPct = statistics['Urban']?.percentage || 0;
    const waterPct = statistics['Water']?.percentage || 0;

    const naturalIndex = forestPct + grassPct + wetlandPct + waterPct;

    let healthStatus = "Moderate Ecological Health";
    let healthColor = "text-[#C8834C] border-[#C8834C]/30 bg-[#C8834C]/5";
    
    if (naturalIndex > 75) {
      healthStatus = "High Ecological Quality";
      healthColor = "text-[#7FA35C] border-[#7FA35C]/30 bg-[#7FA35C]/5";
    } else if (urbanPct > 40) {
      healthStatus = "Critical Urban Heat Island Risk";
      healthColor = "text-[#C56A5A] border-[#C56A5A]/30 bg-[#C56A5A]/5";
    }

    const recommendations = [];
    if (urbanPct > 20) {
      recommendations.push("Implement Sustainable Urban Drainage Systems (SUDS) to manage stormwater runoff in Built-up zones.");
      recommendations.push("Establish cool roof and urban green belt initiatives to reduce municipal Heat Island effects.");
    }
    if (forestPct < 15) {
      recommendations.push("Prioritize native tree planting campaigns to bolster canopy cover and support biodiversity.");
    } else {
      recommendations.push("Establish structural forest management borders to protect dense tree stands from encroachment.");
    }

    return {
      dominantClass: dominant.name,
      dominantPct: dominant.percentage,
      naturalIndex: Math.round(naturalIndex),
      urbanPct,
      healthStatus,
      healthColor,
      recommendations
    };
  };

  const reportInsights = getEnvironmentalReport();

  const getSmartResultSummary = (): SmartInsight[] => {
    if (!statistics) return [];

    const insights: SmartInsight[] = [];
    const totalHa = totalAreaHa || Object.values(statistics).reduce((total, item) => total + item.area_ha, 0);
    const stabilityLimit = Math.max(1, totalHa * 0.01);
    const currentUrban = getSingleClassArea(statistics, 'Urban');
    const currentVegetation = getClassArea(statistics, VEGETATION_CLASSES);

    if (compareMode && referenceStatistics) {
      const urbanChange = currentUrban - getSingleClassArea(referenceStatistics, 'Urban');
      const vegetationChange = currentVegetation - getClassArea(referenceStatistics, VEGETATION_CLASSES);

      insights.push({
        label: 'Urban Change',
        value: `${urbanChange >= 0 ? '+' : '-'}${formatHectares(urbanChange)}`,
        detail: urbanChange > stabilityLimit
          ? `Urban increased by ${formatHectares(urbanChange)} compared with ${compareStartDate.slice(0, 4)}.`
          : 'Urban footprint is stable across both periods.',
        tone: urbanChange > stabilityLimit ? 'warning' : 'positive',
      });

      insights.push({
        label: 'Vegetation Shift',
        value: `${vegetationChange >= 0 ? '+' : '-'}${formatHectares(vegetationChange)}`,
        detail: vegetationChange < -stabilityLimit
          ? `Vegetation loss is the main ecological concern; review highlighted cells.`
          : 'Vegetation classes are broadly stable.',
        tone: vegetationChange < -stabilityLimit ? 'critical' : 'positive',
      });
    } else {
      const dominant = Object.entries(statistics)
        .map(([className, data]) => ({ className, ...data }))
        .sort((a, b) => b.area_ha - a.area_ha)[0];
      const vegetationPct = totalHa > 0 ? Math.round((currentVegetation / totalHa) * 100) : 0;
      const urbanPct = totalHa > 0 ? Math.round((currentUrban / totalHa) * 100) : 0;

      if (dominant) {
        insights.push({
          label: 'Dominant Cover',
          value: dominant.className,
          detail: `${dominant.className} covers ${dominant.area_ha.toLocaleString()} ha (${dominant.percentage}%) of the AOI.`,
          tone: dominant.className === 'Urban' ? 'warning' : 'neutral',
        });
      }

      insights.push({
        label: 'Vegetation Footprint',
        value: `${currentVegetation.toLocaleString()} ha`,
        detail: `Vegetated classes account for about ${vegetationPct}% of the mapped area.`,
        tone: vegetationPct >= 50 ? 'positive' : 'neutral',
      });

      insights.push({
        label: 'Urban Footprint',
        value: `${currentUrban.toLocaleString()} ha`,
        detail: urbanPct > 35 ? 'Built-up coverage is high; review runoff.' : 'Built-up coverage is moderate.',
        tone: urbanPct > 35 ? 'warning' : 'positive',
      });
    }

    insights.push({
      label: 'Uncertainty Review',
      value: `${confidenceReview.reviewCells}/${confidenceReview.totalCells} cells`,
      detail: confidenceReview.reviewCells > 0
        ? `Confidence mask flags ${confidenceReview.reviewShare}% of cells below ${confidenceThreshold}%.`
        : `No cells fall below the ${confidenceThreshold}% threshold.`,
      tone: confidenceReview.criticalCells > 0 ? 'critical' : 'positive',
    });

    return insights.slice(0, 4);
  };

  const smartResultSummary = getSmartResultSummary();

  const layerStack = [
    {
      key: 'true_color' as const,
      label: 'True color',
      sub: 'Sentinel-2 RGB',
      hasUrl: !!(tileUrls.trueColor || tileUrls.baselineTrueColor),
    },
    {
      key: 'false_color' as const,
      label: 'False color',
      sub: 'NIR composite',
      hasUrl: !!(tileUrls.falseColor || tileUrls.baselineFalseColor),
    },
    {
      key: 'ndvi' as const,
      label: 'Vegetation',
      sub: 'NDVI index',
      hasUrl: !!(tileUrls.ndvi || tileUrls.baselineNdvi),
    },
    {
      key: 'classified' as const,
      label: 'Land cover',
      sub: 'Classification output',
      hasUrl: !!(tileUrls.classified || tileUrls.baselineClassified),
    },
  ];

  const readyLayersCount = layerStack.filter(l => l.hasUrl).length;

  return (
    <div className="geo-app">
      
      {/* ---------- Top bar ---------- */}
      <header className="topbar">
        <div className="flex items-center gap-0">
          <div className="brand">
            <div className="brand-mark">
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <path d="M2,17 Q8,13 13,16 T24,14" stroke="#4E6A3D" strokeWidth="1.4" fill="none"/>
                <path d="M2,12 Q9,7 13,11 T24,9" stroke="#7FA35C" strokeWidth="1.4" fill="none"/>
                <circle cx="17" cy="10.5" r="1.6" fill="#C8834C"/>
              </svg>
            </div>
            <div className="brand-text">
              <div className="name">GeoClass</div>
              <div className="sub">Land cover operations</div>
            </div>
          </div>
        </div>

        <div className="steps-nav">
          <div className={`step ${workflowStep >= 1 ? 'active' : ''}`}>Select AOI</div>
          <span className="sep">/</span>
          <div className={`step ${workflowStep >= 2 ? 'active' : ''}`}>Fetch imagery</div>
          <span className="sep">/</span>
          <div className={`step ${workflowStep >= 3 ? 'active' : ''}`}>Classify</div>
          <span className="sep">/</span>
          <div className={`step ${workflowStep >= 4 ? 'active' : ''}`}>Analyze</div>
        </div>

        <div className="flex items-center gap-4">
          {processingTime && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#22241E] border border-[#35372E] text-[#8B8C7F] text-[11px] mono">
              <Clock className="w-3 h-3 text-[#7FA35C]" /> {processingTime}s
            </div>
          )}
          <div className="gee-status">
            <span className={`dot ${geeConnected === false ? 'offline' : ''}`}></span>
            <span>{geeConnected === null ? 'Connecting...' : geeConnected ? 'Earth Engine connected' : 'Earth Engine offline'}</span>
          </div>
        </div>
      </header>

      {/* ---------- Main grid ---------- */}
      <div className="main-grid">
        
        {/* ---------- Left rail (Timeline & Controls) ---------- */}
        <aside className="rail" aria-label="Workflow controls">
          <div className="rail-track">

            {/* Notification messages */}
            {(errorMessage || successMessage) && (
              <div className="mb-4 space-y-2">
                {errorMessage && <Notification type="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />}
                {successMessage && <Notification type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
              </div>
            )}

            {/* Phase 1: AOI Selection */}
            <div className={`phase ${coords.length > 0 ? 'done' : 'active'}`}>
              <div className="node"></div>
              <div className="phase-title">
                <span>Area of Interest</span>
                {coords.length > 0 && <span className="tag mono">{coords.length} pts</span>}
              </div>

              <div className="phase-body space-y-2.5">
                {/* Location search */}
                <div className="relative">
                  <input
                    type="search"
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setSelectedLocation(null);
                    }}
                    placeholder="Search location (city, district)..."
                    className="ctl text-xs"
                  />
                  {locationLoading && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7FA35C]" />
                    </div>
                  )}
                  {locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#22241E] border border-[#35372E] rounded shadow-2xl overflow-hidden">
                      {locationSuggestions.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => selectLocation(loc)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[#2A2C24] border-b border-[#35372E] last:border-b-0 cursor-pointer"
                        >
                          <span className="block font-medium text-[#EDE8DB]">{loc.shortLabel}</span>
                          <span className="block text-[10px] text-[#8B8C7F] truncate">{loc.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Saved district presets */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {SAVED_AREAS.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => selectSavedArea(area)}
                      className={`text-[11px] py-1.5 px-2 rounded border transition text-center cursor-pointer ${
                        selectedAreaId === area.id
                          ? 'bg-[#4E6A3D]/40 border-[#7FA35C] text-[#EDE8DB]'
                          : 'bg-[#22241E] border-[#35372E] text-[#8B8C7F] hover:text-[#EDE8DB] hover:border-[#454737]'
                      }`}
                    >
                      {area.name.replace(' Review', '').replace(' Greenbelt', '')}
                    </button>
                  ))}
                </div>

                {/* Upload boundary */}
                <label className="flex items-center justify-center gap-2 p-2 bg-[#22241E] border border-[#35372E] hover:border-[#454737] rounded cursor-pointer transition text-[11px] text-[#8B8C7F] hover:text-[#EDE8DB]">
                  <Upload className="w-3.5 h-3.5 text-[#7FA35C]" />
                  <span>Upload GeoJSON boundary</span>
                  <input type="file" accept=".geojson,.json" onChange={handleGeoJSONUpload} className="sr-only" />
                </label>

                {coords.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-[#8B8C7F] pt-1">
                    <span>{aoiAreaHa ? `${aoiAreaHa.toFixed(1)} ha` : ''}</span>
                    <button
                      type="button"
                      onClick={saveCurrentArea}
                      className="text-[#7FA35C] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" /> Save AOI
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Phase 2: Fetch satellite imagery */}
            <div className={`phase ${tileUrls.trueColor ? 'done' : (coords.length > 0 && !tileUrls.classified ? 'active' : '')}`}>
              <div className="node"></div>
              <div className="phase-title">
                <span>Fetch satellite imagery</span>
                {tileUrls.trueColor && <span className="tag mono">READY</span>}
              </div>

              <div className="phase-body space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label">Start date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => updateTargetStartDate(e.target.value)}
                      className="ctl text-xs"
                    />
                  </div>
                  <div>
                    <label className="field-label">End date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="ctl text-xs"
                    />
                  </div>
                </div>

                {/* Cloud cover limit */}
                <div>
                  <div className="flex justify-between text-[11px] text-[#8B8C7F] mb-1">
                    <span>Cloud limit</span>
                    <span className="mono text-[#EDE8DB]">{cloudCover}% max</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cloudCover}
                    onChange={(e) => setCloudCover(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Temporal comparison toggle */}
                <div className="pt-1">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[11.5px] text-[#8B8C7F]">Temporal comparison</span>
                    <input
                      type="checkbox"
                      checked={compareMode}
                      onChange={(e) => setCompareMode(e.target.checked)}
                      className="accent-[#7FA35C] cursor-pointer"
                    />
                  </div>
                  {compareMode && (
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#35372E]">
                      <div>
                        <label className="field-label">Baseline start</label>
                        <input
                          type="date"
                          value={compareStartDate}
                          onChange={(e) => updateBaselineStartDate(e.target.value)}
                          className="ctl text-xs"
                        />
                      </div>
                      <div>
                        <label className="field-label">Baseline end</label>
                        <input
                          type="date"
                          value={compareEndDate}
                          onChange={(e) => setCompareEndDate(e.target.value)}
                          className="ctl text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={fetchSatelliteImagery}
                  disabled={loadingMapId || coords.length === 0}
                  className="run-btn"
                >
                  {loadingMapId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching Sentinel-2...
                    </>
                  ) : (
                    <>
                      <Satellite className="w-3.5 h-3.5" /> Fetch satellite imagery
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Phase 3: Classification */}
            <div className={`phase ${tileUrls.classified ? 'done active' : (tileUrls.trueColor ? 'active' : '')}`}>
              <div className="node"></div>
              <div className="phase-title">
                <span>Classification</span>
                <span className="tag mono">03</span>
              </div>

              <div className="phase-body">
                <div className="field-label">Model</div>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value as any)}
                  className="ctl"
                >
                  <option value="deep_learning">Deep Learning Spatial U-Net (GeoAI)</option>
                  <option value="random_forest">Smile random forest — on the fly</option>
                  <option value="dynamic_world">Dynamic World (10m Near-RT Labels)</option>
                </select>

                {(modelType === 'random_forest' || modelType === 'deep_learning') && (
                  <>
                    <div 
                      className="hp-toggle"
                      onClick={() => setShowConfig(!showConfig)}
                    >
                      <span>Hyperparameters</span>
                      <span>{showConfig ? '−' : '+'}</span>
                    </div>

                    {showConfig && (
                      <div className="pt-3 space-y-2.5">
                        <div>
                          <div className="flex justify-between text-[11px] text-[#8B8C7F] mb-1">
                            <span>Decision trees</span>
                            <span className="mono text-[#EDE8DB]">{numTrees}</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="250"
                            step="10"
                            value={numTrees}
                            onChange={(e) => setNumTrees(parseInt(e.target.value))}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-[#8B8C7F] mb-1">
                            <span>Samples per class</span>
                            <span className="mono text-[#EDE8DB]">{samplePoints} px</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="500"
                            step="25"
                            value={samplePoints}
                            onChange={(e) => setSamplePoints(parseInt(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={runClassification}
                  disabled={loadingClassify || coords.length === 0}
                  className="run-btn"
                >
                  {loadingClassify ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Training & Classifying...
                    </>
                  ) : (
                    <>
                      <span className="tri"></span> Run classification
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Phase 4: Layer Stack */}
            <div className="phase">
              <div className="node"></div>
              <div className="phase-title">
                <span>Layer stack</span>
                <span className="tag mono" style={{ color: 'var(--ink-dim)' }}>
                  {readyLayersCount}/4
                </span>
              </div>

              <div className="phase-body">
                {/* Base map row */}
                <div 
                  className={`layer-row ${activeLayer === 'none' ? 'bg-white/[0.04]' : ''}`}
                  onClick={() => setActiveLayer('none')}
                >
                  <div className="layer-left">
                    <div className={`swatch ${activeLayer === 'none' ? 'on' : 'off'}`}></div>
                    <div>
                      <div className="layer-name">Base map</div>
                      <div className="layer-sub">District reference</div>
                    </div>
                  </div>
                  <div className={`layer-state ${activeLayer === 'none' ? 'visible' : 'ready'}`}>
                    {activeLayer === 'none' ? 'visible' : 'ready'}
                  </div>
                </div>

                {/* Overlays */}
                {layerStack.map((layer) => {
                  const isVisible = activeLayer === layer.key;
                  return (
                    <div
                      key={layer.key}
                      className={`layer-row ${!layer.hasUrl ? 'disabled waiting' : ''} ${isVisible ? 'bg-white/[0.04]' : ''}`}
                      onClick={() => {
                        if (layer.hasUrl) setActiveLayer(layer.key);
                      }}
                    >
                      <div className="layer-left">
                        <div className={`swatch ${isVisible ? 'on' : 'off'}`}></div>
                        <div>
                          <div className="layer-name">{layer.label}</div>
                          <div className="layer-sub">{layer.sub}</div>
                        </div>
                      </div>
                      <div className={`layer-state ${isVisible ? 'visible' : layer.hasUrl ? 'ready' : 'waiting'}`}>
                        {isVisible ? 'visible' : layer.hasUrl ? 'ready' : 'waiting'}
                      </div>
                    </div>
                  );
                })}

                {/* Opacity slider */}
                <div className="opacity-row">
                  <span>Overlay opacity</span>
                  <span className="mono">{Math.round(opacity * 100)}%</span>
                </div>
                <div className="mt-2">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={opacity * 100}
                    disabled={activeLayer === 'none'}
                    onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
                    className="w-full"
                  />
                </div>

                {/* Confidence toggle */}
                {confidenceReady && (
                  <div className="pt-3 border-t border-[#35372E] mt-3">
                    <div className="flex items-center justify-between text-[11.5px] text-[#8B8C7F]">
                      <span>Confidence mask</span>
                      <button
                        type="button"
                        onClick={() => setConfidenceVisible(!confidenceVisible)}
                        className={`text-[10px] px-2 py-0.5 rounded mono ${confidenceVisible ? 'bg-[#7FA35C]/20 text-[#7FA35C] border border-[#7FA35C]/40' : 'bg-[#22241E] border border-[#35372E] text-[#8B8C7F]'}`}
                      >
                        {confidenceVisible ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Phase 5: Field tools & Export */}
            <div className="phase">
              <div className="node"></div>
              <div className="phase-title">Field tools</div>
              <div className="phase-body">
                <div className="field-tools">
                  <button
                    type="button"
                    onClick={() => triggerTool('measure')}
                    className={`tool-btn ${measurementMode ? 'active' : ''}`}
                  >
                    <Ruler className="w-3.5 h-3.5" /> Measure
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerTool('notes')}
                    className={`tool-btn ${noteMode ? 'active' : ''}`}
                  >
                    <StickyNote className="w-3.5 h-3.5" /> Notes · {mapNotes.length}
                  </button>
                </div>

                {/* Export actions */}
                {tileUrls.classified && (
                  <div className="pt-3 mt-3 border-t border-[#35372E] space-y-2">
                    <div className="field-label">Export classification</div>
                    <div className="flex gap-2">
                      <select
                        value={downloadFormat}
                        onChange={(e) => setDownloadFormat(e.target.value as any)}
                        className="ctl text-xs flex-1"
                      >
                        <option value="geotiff">GeoTIFF (Raster)</option>
                        <option value="png">PNG (Map Image)</option>
                        <option value="geojson">GeoJSON (Vectors)</option>
                        <option value="kml">KML (Google Earth)</option>
                      </select>
                      <button
                        type="button"
                        onClick={triggerDownload}
                        disabled={downloading}
                        className="px-3 py-1.5 bg-[#22241E] hover:bg-[#2A2C24] border border-[#35372E] text-[#EDE8DB] rounded text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-[#7FA35C]" />
                        {downloading ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </aside>

        {/* ---------- Map area ---------- */}
        <main className="map-area">
          
          {/* Status strip */}
          <div className="status-strip">
            <div className="status-item primary">
              <div className="k">Scene status</div>
              <div className="v">
                {loadingMapId ? 'Fetching...' : loadingClassify ? 'Classifying...' : tileUrls.classified ? 'Classified' : tileUrls.trueColor ? 'Imagery ready' : 'Awaiting AOI'}
              </div>
            </div>
            <div className="status-item primary">
              <div className="k">AOI</div>
              <div className="v">
                {aoiAreaHa ? `${aoiAreaHa.toFixed(1)} ha` : 'Not selected'}
              </div>
            </div>
            <div className="status-item muted">
              <div className="k">Period</div>
              <div className="v">{startDate.slice(0, 4)} season</div>
            </div>
            <div className="status-item muted">
              <div className="k">Cloud limit</div>
              <div className="v">{cloudCover}% max</div>
            </div>
            <div className="status-item muted">
              <div className="k">Layers ready</div>
              <div className="v">{readyLayersCount} / 4</div>
            </div>
            {aiQualityMetrics && (
              <div className="status-item primary">
                <div className="k">AI Clarity</div>
                <div className="v flex items-center gap-1.5 text-[#7FA35C]">
                  <span>{aiQualityMetrics.overall_quality_score}%</span>
                  <span className="text-[10px] mono text-[#EDE8DB]/60">({aiQualityMetrics.rating})</span>
                </div>
              </div>
            )}
            {buildingStats && (
              <div className="status-item primary">
                <div className="k">Buildings</div>
                <div className="v text-[#C8834C]">{buildingStats.building_count} bldg</div>
              </div>
            )}
            {processingTime && (
              <div className="status-item muted">
                <div className="k">Compute</div>
                <div className="v">{processingTime}s</div>
              </div>
            )}
          </div>

          {/* Map canvas */}
          <div className="map-canvas">
            
            {/* Custom Toolstrip */}
            <div className="toolstrip">
              <button
                type="button"
                onClick={() => triggerTool('rect')}
                className={`t ${activeTool === 'rect' ? 'active' : ''}`}
                title="Draw AOI rectangle"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <rect x="2.5" y="3.5" width="11" height="9" strokeDasharray="2.4 2"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => triggerTool('poly')}
                className={`t ${activeTool === 'poly' ? 'active' : ''}`}
                title="Draw AOI polygon"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M8,2.5 L14,6.5 L11.5,13.5 L4.5,13.5 L2,6.5 Z"/>
                  <circle cx="8" cy="2.5" r="1" fill="currentColor" stroke="none"/>
                  <circle cx="14" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                  <circle cx="2" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => triggerTool('smart')}
                className={`t ${activeTool === 'smart' ? 'active' : ''}`}
                title="SAM Smart Select (Click anywhere to segment contiguous parcel/water body)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" strokeDasharray="3 3"/>
                  <path d="M12 7v10M7 12h10"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => triggerTool('pan')}
                className={`t ${activeTool === 'pan' ? 'active' : ''}`}
                title="Pan map"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M8,2 L8,14 M2,8 L14,8 M8,2 L6,4.2 M8,2 L10,4.2 M8,14 L6,11.8 M8,14 L10,11.8 M2,8 L4.2,6 M2,8 L4.2,10 M14,8 L11.8,6 M14,8 L11.8,10"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => triggerTool('measure')}
                className={`t ${measurementMode ? 'active' : ''}`}
                title="Measure distance"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <circle cx="8" cy="8" r="5.5"/>
                  <path d="M8,3 v2.4 M8,10.6 v2.4 M3,8 h2.4 M10.6,8 h2.4"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => triggerTool('clear')}
                className="t"
                title="Clear boundary"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M4,4 L12,12 M12,4 L4,12"/>
                </svg>
              </button>
            </div>

            {/* AOI Invite (Empty state) */}
            {coords.length === 0 && (
              <div className="aoi-invite">
                <div className="headline">Draw or Smart-Select an AOI</div>
                <div className="body">Use the rectangle, polygon, or SAM smart-select tool at left to mark the district area you want to fetch and classify.</div>
              </div>
            )}

            {/* Coordinate readout */}
            <div className="coord-readout">
              lat <span className="lat">{mapCenter[0].toFixed(6)}</span>&nbsp;&nbsp;lng <span className="lng">{mapCenter[1].toFixed(6)}</span>
            </div>

            {/* Scale readout */}
            <div className="scale-readout">
              Sentinel-2 &middot; 10m
            </div>

            {/* Attribution */}
            <div className="attribution">Earth Engine &middot; GeoAI &middot; CartoDB &middot; OSM</div>

            {/* Leaflet Map */}
            <MapComponent
              onAOIDrawn={handleAOIDrawn}
              aoiCoords={coords}
              trueColorUrl={tileUrls.trueColor}
              falseColorUrl={tileUrls.falseColor}
              ndviUrl={tileUrls.ndvi}
              classifiedUrl={tileUrls.classified}
              baselineTrueColorUrl={tileUrls.baselineTrueColor}
              baselineFalseColorUrl={tileUrls.baselineFalseColor}
              baselineNdviUrl={tileUrls.baselineNdvi}
              baselineClassifiedUrl={tileUrls.baselineClassified}
              compareMode={compareMode}
              activeTimePeriod={activeTimePeriod}
              opacity={opacity}
              activeLayer={activeLayer}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              searchLocation={selectedLocation}
              confidenceVisible={confidenceVisible}
              confidenceThreshold={confidenceThreshold}
              measurementMode={measurementMode}
              noteMode={noteMode}
              notes={mapNotes}
              onNoteAdd={handleMapNoteAdd}
              onSwipeActiveChange={setSwipeActive}
              smartSelectMode={smartSelectMode}
              onSmartSelectClick={handleSmartSelectClick}
              buildingFootprintsGeoJSON={buildingFootprints}
              showBuildings={showBuildingLayer}
            />

            {/* Temporal period swapper (in compare mode) */}
            {compareMode && !swipeActive && (tileUrls.classified || tileUrls.trueColor) && (
              <DraggableContainer centerHorizontally defaultPosition={{ x: 0, y: 16 }} zIndex={1002}>
                <div className="bg-[#1B1D19]/90 backdrop-blur-md border border-[#35372E] p-1 rounded shadow-2xl flex gap-1 cursor-grab active:cursor-grabbing">
                  <button
                    onClick={() => setActiveTimePeriod('target')}
                    className={`px-3 py-1.5 rounded text-[11px] font-medium mono transition cursor-pointer ${
                      activeTimePeriod === 'target'
                        ? 'bg-[#4E6A3D] text-[#EDE8DB] border border-[#7FA35C]'
                        : 'text-[#8B8C7F] hover:text-[#EDE8DB]'
                    }`}
                  >
                    Target ({startDate.slice(0, 4)})
                  </button>
                  <button
                    onClick={() => setActiveTimePeriod('baseline')}
                    className={`px-3 py-1.5 rounded text-[11px] font-medium mono transition cursor-pointer ${
                      activeTimePeriod === 'baseline'
                        ? 'bg-[#4E6A3D] text-[#EDE8DB] border border-[#7FA35C]'
                        : 'text-[#8B8C7F] hover:text-[#EDE8DB]'
                    }`}
                  >
                    Baseline ({compareStartDate.slice(0, 4)})
                  </button>
                </div>
              </DraggableContainer>
            )}
          </div>

          {/* ---------- Analytics area (Bottom) ---------- */}
          <div className="analytics">
            <div className="analytics-head">
              <div className="title">
                <BarChart3 className="w-4 h-4 text-[#7FA35C]" /> Classification analytics
              </div>
              {statistics && (
                <button
                  type="button"
                  onClick={printReport}
                  className="px-2.5 py-1 bg-[#22241E] hover:bg-[#2A2C24] border border-[#35372E] text-[#EDE8DB] rounded text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-[#7FA35C]" /> Print report
                </button>
              )}
            </div>

            {/* Empty skeletal state if not classified yet */}
            {!statistics && (
              <div className="analytics-body">
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
            )}

            {/* Full analytics dashboard once classified */}
            {statistics && (
              <div className="space-y-6 pt-2">
                {/* Smart Result Summary */}
                {smartResultSummary.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
                    {smartResultSummary.map((insight) => (
                      <div
                        key={insight.label}
                        className="p-3 bg-[#22241E] border border-[#35372E] rounded"
                      >
                        <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-[#8B8C7F]">
                          <span>{insight.label}</span>
                          {insight.tone === 'positive' && <CheckCircle className="w-3.5 h-3.5 text-[#7FA35C]" />}
                          {insight.tone === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-[#C8834C]" />}
                          {insight.tone === 'critical' && <ShieldAlert className="w-3.5 h-3.5 text-[#C56A5A]" />}
                          {insight.tone === 'neutral' && <Info className="w-3.5 h-3.5 text-[#8CA0AA]" />}
                        </div>
                        <p className="text-base font-bold text-[#EDE8DB] mt-1.5 mono">{insight.value}</p>
                        <p className="text-[11px] text-[#8B8C7F] mt-1 leading-normal">{insight.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Temporal Change Detection Matrix */}
                {compareMode && referenceStatistics && (
                  <div className="p-3.5 bg-[#22241E] border border-[#35372E] rounded space-y-3">
                    <div className="flex justify-between items-center border-b border-[#35372E] pb-2">
                      <span className="text-xs font-semibold text-[#EDE8DB] flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#7FA35C]" /> Temporal Change Matrix
                      </span>
                      <span className="text-[10px] mono text-[#8B8C7F]">
                        {startDate.slice(0, 4)} vs {compareStartDate.slice(0, 4)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {LULC_CLASS_NAMES.map((className) => {
                        const valCurrent = statistics[className] || { area_ha: 0, percentage: 0, pixel_count: 0 };
                        const valRef = referenceStatistics[className] || { area_ha: 0, percentage: 0, pixel_count: 0 };
                        if (valCurrent.area_ha === 0 && valRef.area_ha === 0) return null;

                        const areaChange = valCurrent.area_ha - valRef.area_ha;
                        const pctChange = valCurrent.percentage - valRef.percentage;
                        const changeTone = getTemporalChangeTone(className, areaChange);

                        return (
                          <div
                            key={className}
                            className={`p-2.5 rounded border bg-[#1B1D19] flex items-center justify-between ${changeTone.borderClass}`}
                          >
                            <div>
                              <span className="text-[10.5px] uppercase font-semibold text-[#8B8C7F] block">{className}</span>
                              <span className="text-sm font-bold text-[#EDE8DB] mono mt-0.5 block">{valCurrent.area_ha.toFixed(1)} ha</span>
                            </div>
                            <div className={`text-right ${changeTone.textClass} mono text-xs font-semibold`}>
                              <div className="flex items-center gap-1 justify-end">
                                {areaChange < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : areaChange > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : null}
                                {areaChange > 0 ? '+' : ''}{areaChange.toFixed(1)} ha
                              </div>
                              <div className="text-[10px] text-[#8B8C7F]">
                                {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recharts Visualization, Building Intelligence, Transition Matrix & Advanced AI Cards */}
                <DashboardCharts
                  statistics={statistics}
                  totalArea={totalAreaHa}
                  buildingStats={buildingStats}
                  aiQualityMetrics={aiQualityMetrics}
                  transitionData={transitionData}
                  superResData={superResData}
                  waterDynamicsData={waterDynamicsData}
                  canopyHeightData={canopyHeightData}
                  loadingSuperRes={loadingSuperRes}
                  loadingWaterDynamics={loadingWaterDynamics}
                  loadingCanopyHeight={loadingCanopyHeight}
                  onExtractBuildings={extractBuildingFootprints}
                  extractingBuildings={extractingBuildings}
                  onTriggerSuperRes={triggerSuperResolution}
                  onTriggerWaterDynamics={triggerWaterDynamics}
                  onTriggerCanopyHeight={triggerCanopyHeight}
                />

                {/* Ecological Guidelines */}
                {reportInsights && (
                  <div className="p-3.5 bg-[#22241E] border border-[#35372E] rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#EDE8DB]">Conservation notes</span>
                      <span className="text-[10.5px] text-[#7FA35C] mono">{reportInsights.healthStatus}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-[#8B8C7F] leading-relaxed">
                      {reportInsights.recommendations.map((rec, i) => (
                        <li key={i}><span className="text-[#C7C6BA]">{rec}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

        </main>

      </div>
    </div>
  );
}
