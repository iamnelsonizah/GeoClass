'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
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
  Save,
  Mountain,
  History,
  Columns2,
  Cloud,
  Move,
  RotateCw,
  Type,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Layers,
  Sliders,
  Square,
  Pentagon,
  Edit3,
  Wand2,
  Hand,
  Trash2,
  Sparkles,
  Share2,
  BookOpen,
  Database
} from 'lucide-react';
import DashboardCharts, { SpectralData } from '../components/DashboardCharts';
import { DraggableContainer } from '../components/DraggableContainer';
import { SpectralInspectorPanel, SpectralPixelData } from '../components/SpectralInspectorPanel';
import { PixelTimelinePanel, PixelTimelineData } from '../components/PixelTimelinePanel';
import { ChangeDetectionPanel, ChangeDetectionData } from '../components/ChangeDetectionPanel';
import { STACBrowserModal } from '../components/STACBrowserModal';
import { parseVectorFile } from '../lib/vectorParsers';

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
    ? 'bg-rose-950/40 border-rose-800/40 text-rose-200' 
    : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200';

  const Icon = type === 'error' ? AlertTriangle : CheckCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 border rounded-lg ${styles} text-xs print:hidden shadow-sm`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div className="font-medium flex-1">{message}</div>
      <button 
        onClick={onDismiss} 
        className="p-1 hover:bg-white/10 rounded transition flex-shrink-0 cursor-pointer text-slate-400 hover:text-white"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
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

const createBoundingBoxAOI = (lat: number, lng: number, sizeKm = 5): number[][] => {
  const half = sizeKm / 2;
  const dLat = half / 111.32;
  const dLng = half / (111.32 * Math.cos((lat * Math.PI) / 180));
  const minLat = Number((lat - dLat).toFixed(6));
  const maxLat = Number((lat + dLat).toFixed(6));
  const minLng = Number((lng - dLng).toFixed(6));
  const maxLng = Number((lng + dLng).toFixed(6));
  // Closed GeoJSON polygon: [lng, lat]
  return [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ];
};

const parseCoordinateQuery = (query: string): { lat: number; lng: number } | null => {
  const cleaned = query.replace(/[\[\]\(\)\{\}]/g, '').trim();
  if (!cleaned) return null;

  // Format 1: With N/S/E/W e.g., "9.0765 N, 7.3986 E" or "37.7749° N, 122.4194° W"
  const dmsRegex = /^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NS])?[\s,;]+([+-]?\d+(?:\.\d+)?)\s*°?\s*([EW])?$/i;
  const match = cleaned.match(dmsRegex);
  if (match) {
    let lat = parseFloat(match[1]);
    const latDir = match[2]?.toUpperCase();
    let lng = parseFloat(match[3]);
    const lngDir = match[4]?.toUpperCase();

    if (latDir === 'S') lat = -Math.abs(lat);
    if (latDir === 'N') lat = Math.abs(lat);
    if (lngDir === 'W') lng = -Math.abs(lng);
    if (lngDir === 'E') lng = Math.abs(lng);

    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Format 2: Standard lat, lng or lat lng (e.g. "9.0765, 7.3986" or "-33.8688, 151.2093")
  const simpleMatch = cleaned.match(/^([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)$/);
  if (simpleMatch) {
    const lat = parseFloat(simpleMatch[1]);
    const lng = parseFloat(simpleMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
};

const getLocationZoom = (type?: string) => {
  if (!type) return 13;
  if (['coordinate'].includes(type)) return 14;
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
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(10);
  const [savedAreas, setSavedAreas] = useState<SavedArea[]>(SAVED_AREAS);
  const [areaSearch, setAreaSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>('district-b13');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [dismissedInvite, setDismissedInvite] = useState(false);
  
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
  const [activeLayer, setActiveLayer] = useState<'none' | 'true_color' | 'false_color' | 'ndvi' | 'classified' | 'slope' | 'elevation' | 'hillshade' | 'ndbi' | 'mndwi' | 'nbr' | 'sar' | 'change_year' | 'change_magnitude' | 'landsat_true_color' | 'landsat_false_color' | 'landsat_ndvi'>('none');
  const [selectedSensor, setSelectedSensor] = useState<'sentinel_2' | 'landsat'>('sentinel_2');
  const [isSTACModalOpen, setIsSTACModalOpen] = useState(false);
  const [useSarFusion, setUseSarFusion] = useState(false);
  const [opacity, setOpacity] = useState(0.82);
  const [swipeActive, setSwipeActive] = useState(false);
  const [confidenceVisible, setConfidenceVisible] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(72);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [noteDraft, setNoteDraft] = useState('Field observation');
  const [mapNotes, setMapNotes] = useState<MapNote[]>([]);
  
  // Active tool on map toolstrip
  const [activeTool, setActiveTool] = useState<'none' | 'rect' | 'poly' | 'edit' | 'drag' | 'rotate' | 'text' | 'pan' | 'measure' | 'notes' | 'smart' | 'transect' | 'spectral' | 'timeline' | 'swipe'>('rect');

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

  // Feature 1: Topographic & Terrain Slope Engine States
  const [terrainData, setTerrainData] = useState<any>(null);
  const [loadingTerrain, setLoadingTerrain] = useState(false);
  const [elevationProfileData, setElevationProfileData] = useState<any>(null);
  const [loadingElevationProfile, setLoadingElevationProfile] = useState(false);
  const [transectMode, setTransectMode] = useState(false);

  // Feature 2: Spectral Indices Explorer & Band Math Inspector States
  const [spectralData, setSpectralData] = useState<SpectralData | null>(null);
  const [loadingSpectral, setLoadingSpectral] = useState(false);
  const [spectralInspectorMode, setSpectralInspectorMode] = useState(false);
  const [spectralPixelData, setSpectralPixelData] = useState<SpectralPixelData | null>(null);
  const [loadingPixelInspect, setLoadingPixelInspect] = useState(false);

  // Feature 3: Historical Time-Series & Disturbance Tracker States
  const [timelineMode, setTimelineMode] = useState(false);
  const [timelineData, setTimelineData] = useState<PixelTimelineData | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Feature 4: Multi-Temporal Disturbance & Trend Break Engine (LandTrendr)
  const [changeDetectionData, setChangeDetectionData] = useState<ChangeDetectionData | null>(null);
  const [loadingChangeDetection, setLoadingChangeDetection] = useState(false);
  const [showChangePanel, setShowChangePanel] = useState(false);

  // Feature 5 & 6: Atmospheric Screening & PDF Executive Briefing States
  const [cloudMaskType, setCloudMaskType] = useState<'both' | 'scl' | 'qa60' | 'none'>('both');
  const [maskShadows, setMaskShadows] = useState(true);
  const [seasonalFilter, setSeasonalFilter] = useState<'all' | 'dry' | 'wet'>('all');
  const [showAtmosphericConfig, setShowAtmosphericConfig] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [isImportingVector, setIsImportingVector] = useState(false);

  // Dual-Sidebar Architecture & Folding States
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);

  // Individual Phase Folding Accordion States
  const [phase1Open, setPhase1Open] = useState(true);
  const [phase2Open, setPhase2Open] = useState(true);
  const [phase3Open, setPhase3Open] = useState(true);
  const [phase4Open, setPhase4Open] = useState(true);
  const [phase5Open, setPhase5Open] = useState(true);

  // GEE Tile URLs from API
  const [tileUrls, setTileUrls] = useState<{
    trueColor?: string;
    falseColor?: string;
    ndvi?: string;
    classified?: string;
    slope?: string;
    elevation?: string;
    hillshade?: string;
    ndbi?: string;
    mndwi?: string;
    nbr?: string;
    sar?: string;
    landsatTrueColor?: string;
    landsatFalseColor?: string;
    landsatNdvi?: string;
    changeYear?: string;
    changeMagnitude?: string;
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
  const [downloadFormat, setDownloadFormat] = useState<'geotiff' | 'png' | 'geojson' | 'kml' | 'kmz'>('kmz');
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

  const handleSharePermalink = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('start', startDate);
    url.searchParams.set('end', endDate);
    url.searchParams.set('model', modelType);
    url.searchParams.set('layer', activeLayer);
    url.searchParams.set('sar', useSarFusion ? '1' : '0');
    if (coords.length > 0) {
      url.searchParams.set('aoi', encodeURIComponent(JSON.stringify(coords)));
    }
    navigator.clipboard.writeText(url.toString()).then(() => {
      setSuccessMessage('Shareable permalink copied to clipboard!');
    }).catch(() => {
      setErrorMessage('Could not copy link to clipboard.');
    });
  }, [startDate, endDate, modelType, activeLayer, useSarFusion, coords]);

  // Read URL query parameters on mount to restore analysis state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const aoiParam = params.get('aoi');
    const startParam = params.get('start');
    const endParam = params.get('end');
    const modelParam = params.get('model');
    const layerParam = params.get('layer');
    const sarParam = params.get('sar');

    if (aoiParam) {
      try {
        const parsedCoords = JSON.parse(decodeURIComponent(aoiParam));
        if (Array.isArray(parsedCoords) && parsedCoords.length > 0) {
          setCoords(parsedCoords);
        }
      } catch (e) {
        console.error('Failed to parse aoi param from URL', e);
      }
    }
    if (startParam) setStartDate(startParam);
    if (endParam) setEndDate(endParam);
    if (modelParam && ['random_forest', 'dynamic_world', 'deep_learning'].includes(modelParam)) {
      setModelType(modelParam as any);
    }
    if (sarParam === '1') setUseSarFusion(true);
    if (layerParam && ['none', 'true_color', 'false_color', 'ndvi', 'classified', 'slope', 'elevation', 'hillshade', 'ndbi', 'mndwi', 'nbr', 'sar'].includes(layerParam)) {
      setActiveLayer(layerParam as any);
    }
  }, []);

  const selectLocation = (location: LocationSuggestion) => {
    setSelectedLocation(location);
    setLocationQuery(location.label);
    setLocationSuggestions([]);
    setMapCenter([location.lat, location.lng]);
    setMapZoom(getLocationZoom(location.type));
    setDismissedInvite(true);
    setSuccessMessage(`Navigated to ${location.shortLabel}. Dropped pin on target location.`);
  };

  const clearLocationSearch = () => {
    setLocationQuery('');
    setLocationSuggestions([]);
    setSelectedLocation(null);
  };

  const handleSearchSubmit = async () => {
    const query = locationQuery.trim();
    if (!query) return;

    // 1. Check if directly entered coordinates
    const coordMatch = parseCoordinateQuery(query);
    if (coordMatch) {
      selectLocation({
        id: `coord-${coordMatch.lat}-${coordMatch.lng}`,
        label: `Coordinates: ${coordMatch.lat.toFixed(5)}°, ${coordMatch.lng.toFixed(5)}°`,
        shortLabel: `${coordMatch.lat.toFixed(4)}°, ${coordMatch.lng.toFixed(4)}°`,
        lat: coordMatch.lat,
        lng: coordMatch.lng,
        type: 'coordinate',
      });
      return;
    }

    // 2. If suggestions already loaded, select first suggestion
    if (locationSuggestions.length > 0) {
      selectLocation(locationSuggestions[0]);
      return;
    }

    // 3. Instant on-demand fetch if user hits Enter immediately
    setLocationLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '1',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          const item = results[0];
          const lat = Number(item.lat);
          const lng = Number(item.lon);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const address = item.address || {};
            const shortLabel = address.city || address.town || address.village || address.suburb || address.county || address.state || item.display_name?.split(',')[0] || query;
            selectLocation({
              id: String(item.place_id || `${lat}-${lng}`),
              label: item.display_name || query,
              shortLabel,
              lat,
              lng,
              type: item.type,
            });
          }
        } else {
          setErrorMessage(`No location found for "${query}". Try coordinates or a nearby city.`);
        }
      }
    } catch (err) {
      console.error("Direct search lookup error:", err);
    } finally {
      setLocationLoading(false);
    }
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
  const triggerTool = (tool: 'rect' | 'poly' | 'edit' | 'drag' | 'rotate' | 'text' | 'pan' | 'measure' | 'notes' | 'smart' | 'clear' | 'transect' | 'spectral' | 'timeline' | 'swipe') => {
    setDismissedInvite(true);
    if (tool === 'rect') {
      setActiveTool('rect');
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      window.dispatchEvent(new CustomEvent('map-tool-rectangle'));
    } else if (tool === 'poly') {
      setActiveTool('poly');
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      window.dispatchEvent(new CustomEvent('map-tool-polygon'));
    } else if (tool === 'edit') {
      const next = activeTool === 'edit' ? 'none' : 'edit';
      setActiveTool(next);
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      window.dispatchEvent(new CustomEvent('map-tool-edit'));
      if (next === 'edit') {
        setSuccessMessage("Edit mode active: Drag polygon vertices to adjust boundary.");
      }
    } else if (tool === 'drag') {
      const next = activeTool === 'drag' ? 'none' : 'drag';
      setActiveTool(next);
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      window.dispatchEvent(new CustomEvent('map-tool-drag'));
      if (next === 'drag') {
        setSuccessMessage("Move mode active: Click and drag the polygon to reposition the AOI.");
      }
    } else if (tool === 'rotate') {
      const next = activeTool === 'rotate' ? 'none' : 'rotate';
      setActiveTool(next);
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      window.dispatchEvent(new CustomEvent('map-tool-rotate'));
      if (next === 'rotate') {
        setSuccessMessage("Rotate mode active: Click and drag rotation handle to orient the AOI.");
      }
    } else if (tool === 'text') {
      const next = activeTool === 'text' ? 'none' : 'text';
      setActiveTool(next);
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      window.dispatchEvent(new CustomEvent('map-tool-text'));
      if (next === 'text') {
        setSuccessMessage("Text tool active: Click anywhere on the map to type and place a comment or annotation.");
      }
    } else if (tool === 'pan') {
      setActiveTool('pan');
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      window.dispatchEvent(new CustomEvent('map-tool-pan'));
    } else if (tool === 'measure') {
      const next = !measurementMode;
      setMeasurementMode(next);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      setActiveTool(next ? 'measure' : 'none');
      if (next) {
        window.dispatchEvent(new CustomEvent('map-tool-pan'));
        setSuccessMessage("Measurement tool active: Click sequential map points to measure distance dynamically.");
      }
    } else if (tool === 'notes') {
      const next = !noteMode;
      setNoteMode(next);
      setMeasurementMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      setActiveTool(next ? 'notes' : 'none');
      if (next) {
        window.dispatchEvent(new CustomEvent('map-tool-pan'));
      }
    } else if (tool === 'smart') {
      const next = !smartSelectMode;
      setSmartSelectMode(next);
      setMeasurementMode(false);
      setNoteMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      setActiveTool(next ? 'smart' : 'none');
      if (next) {
        window.dispatchEvent(new CustomEvent('map-tool-pan'));
        setSuccessMessage("SAM Smart Select active: Click anywhere on the map to extract a contiguous parcel or feature.");
      }
    } else if (tool === 'transect') {
      const next = !transectMode;
      setTransectMode(next);
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      setActiveTool(next ? 'transect' : 'none');
      if (next) {
        window.dispatchEvent(new CustomEvent('map-tool-pan'));
        setSuccessMessage("Elevation Transect active: Click on map to place transect points, then click 'Get Profile'.");
      }
    } else if (tool === 'spectral') {
      const next = !spectralInspectorMode;
      setSpectralInspectorMode(next);
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setTimelineMode(false);
      setActiveTool(next ? 'spectral' : 'none');
      if (next) {
        window.dispatchEvent(new CustomEvent('map-tool-pan'));
        setSuccessMessage("Spectral Band Inspector active: Click anywhere on the map to sample 10-band Sentinel-2 reflectance.");
      }
    } else if (tool === 'timeline') {
      const next = !timelineMode;
      setTimelineMode(next);
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setActiveTool(next ? 'timeline' : 'none');
      if (next) {
        window.dispatchEvent(new CustomEvent('map-tool-pan'));
        setSuccessMessage("Historical Timeline Tracker active: Click anywhere on the map to extract 5-year multi-index history & detect disturbances.");
      }
    } else if (tool === 'swipe') {
      const next = !swipeActive;
      setSwipeActive(next);
      setMeasurementMode(false);
      setNoteMode(false);
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
      setActiveTool(next ? 'swipe' : 'none');
      if (next) {
        setSuccessMessage("Split-Screen Swipe active: Drag the vertical curtain to wipe between layers.");
      }
    } else if (tool === 'clear') {
      handleAOIDrawn([]);
      window.dispatchEvent(new CustomEvent('map-tool-clear'));
      setActiveTool('none');
      setSmartSelectMode(false);
      setTransectMode(false);
      setSpectralInspectorMode(false);
      setTimelineMode(false);
    }
  };

  useEffect(() => {
    const query = locationQuery.trim();
    if (!query || (selectedLocation && query === selectedLocation.label)) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      return;
    }

    const coordMatch = parseCoordinateQuery(query);
    const coordSuggestion: LocationSuggestion | null = coordMatch
      ? {
          id: `coord-${coordMatch.lat}-${coordMatch.lng}`,
          label: `Coordinates: ${coordMatch.lat.toFixed(5)}°, ${coordMatch.lng.toFixed(5)}°`,
          shortLabel: `📍 ${coordMatch.lat.toFixed(4)}°, ${coordMatch.lng.toFixed(4)}°`,
          lat: coordMatch.lat,
          lng: coordMatch.lng,
          type: 'coordinate',
        }
      : null;

    if (query.length < 3 && !coordMatch) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      return;
    }

    // If query is directly coordinates (numbers, commas, signs), show coordinate suggestion immediately
    if (coordMatch && /^[-+0-9.,\s°NSEWnsew\[\]\(\)]+$/.test(query)) {
      setLocationSuggestions([coordSuggestion!]);
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

        if (coordSuggestion) {
          setLocationSuggestions([coordSuggestion, ...suggestions]);
        } else {
          setLocationSuggestions(suggestions);
        }
        setErrorMessage(null);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          if (coordSuggestion) {
            setLocationSuggestions([coordSuggestion]);
          } else {
            setLocationSuggestions([]);
            setErrorMessage('Could not load location suggestions. Check connection and try again.');
          }
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
    setTerrainData(null);
    setElevationProfileData(null);

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
      setDismissedInvite(true);
    } else {
      setAoiAreaHa(null);
    }
  }, []);

  const handleCreateAOIAtPoint = useCallback((lat: number, lng: number, sizeKm = 5) => {
    const boxCoords = createBoundingBoxAOI(lat, lng, sizeKm);
    handleAOIDrawn(boxCoords);
    setDismissedInvite(true);
    setSuccessMessage(`Created ${sizeKm}km AOI boundary at [${lat.toFixed(4)}, ${lng.toFixed(4)}]. Ready to fetch imagery.`);
  }, [handleAOIDrawn]);

  const selectSavedArea = (area: SavedArea) => {
    handleAOIDrawn(area.coords);
    setSelectedAreaId(area.id);
    setMapCenter(area.center);
    setMapZoom(area.zoom);
    setDismissedInvite(true);
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

  // Feature 1: Trigger Topographic & Terrain Slope Engine (DEM)
  const triggerAnalyzeTerrain = async () => {
    if (coords.length === 0) {
      setErrorMessage("Please define an Area of Interest (AOI) boundary first.");
      return;
    }
    setLoadingTerrain(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/terrain/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Topographic terrain analysis failed.");
      }
      const data = await response.json();
      setTerrainData(data);
      if (data.tile_urls) {
        setTileUrls(prev => ({
          ...prev,
          slope: data.tile_urls.slope,
          elevation: data.tile_urls.elevation,
          hillshade: data.tile_urls.hillshade,
        }));
        setActiveLayer('slope');
      }
      setSuccessMessage(`Topographic analysis ready: ${data.elevation.relief_m}m relief, mean slope ${data.slope.mean_deg}°.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Terrain analysis failed.");
    } finally {
      setLoadingTerrain(false);
    }
  };

  // Feature 1: Handle Elevation Profile Transect Line
  const handleTransectDrawn = async (lineCoords: number[][], startLocation?: string, endLocation?: string) => {
    setLoadingElevationProfile(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/terrain/elevation-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_coords: lineCoords,
          num_samples: 80,
          start_location: startLocation || undefined,
          end_location: endLocation || undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Elevation profile calculation failed.");
      }
      const data = await response.json();
      setElevationProfileData(data);
      const routeLabel = data.summary?.route_title || (startLocation && endLocation ? `${startLocation} → ${endLocation}` : null);
      if (routeLabel) {
        setSuccessMessage(`Topography elevation profile computed: ${routeLabel} (${data.summary.total_distance_km} km).`);
      } else {
        setSuccessMessage(`Elevation transect profile computed across ${data.summary.total_distance_km} km.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to compute elevation transect profile.");
    } finally {
      setLoadingElevationProfile(false);
    }
  };

  // Feature 2: Trigger Multispectral Indices Explorer (NDBI, MNDWI, NBR)
  const triggerAnalyzeSpectral = async () => {
    if (coords.length === 0) {
      setErrorMessage("Please define an Area of Interest (AOI) boundary first.");
      return;
    }
    setLoadingSpectral(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/spectral/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Multispectral index analysis failed.");
      }
      const data = await response.json();
      setSpectralData(data);
      setTileUrls(prev => ({
        ...prev,
        ndbi: data.ndbi?.tile_url,
        mndwi: data.mndwi?.tile_url,
        nbr: data.nbr?.tile_url,
      }));
      setActiveLayer('ndbi');
      setSuccessMessage(`Spectral indices ready: NDBI built-up ${data.ndbi.built_percentage}%, MNDWI water ${data.mndwi.water_percentage}%.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Spectral analysis failed.");
    } finally {
      setLoadingSpectral(false);
    }
  };

  // Feature 2: Handle Spectral Inspector Pixel Inspection
  const handleSpectralInspect = async (lat: number, lng: number) => {
    setLoadingPixelInspect(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/spectral/inspect-pixel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Pixel spectral inspection failed.");
      }
      const data: SpectralPixelData = await response.json();
      setSpectralPixelData(data);
      setSuccessMessage(`Sampled spectrum at ${lat.toFixed(4)}°, ${lng.toFixed(4)}°: ${data.profile.signature}.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Pixel inspection failed.");
    } finally {
      setLoadingPixelInspect(false);
    }
  };

  // Feature 3: Handle Pixel Historical Timeline & Disturbance Extraction
  const handleTimelineInspect = async (lat: number, lng: number) => {
    setLoadingTimeline(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/timeseries/pixel-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          start_year: 2021,
          end_year: 2025,
          interval: 'quarterly',
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Pixel timeline analysis failed.");
      }
      const data: PixelTimelineData = await response.json();
      setTimelineData(data);
      setSuccessMessage(`Extracted 5-year timeline at ${lat.toFixed(4)}°, ${lng.toFixed(4)}° (${data.trajectory.badge}).`);
    } catch (err: any) {
      setErrorMessage(err.message || "Timeline extraction failed.");
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Feature 4: Handle Multi-Temporal Disturbance & Trend Break Analysis (LandTrendr)
  const handleAnalyzeChange = async (
    indexName: string = 'nbr',
    sensitivity: string = 'moderate',
    sYear: number = 2020,
    eYear: number = 2024
  ) => {
    if (coords.length === 0) {
      setErrorMessage('Please draw or select an Area of Interest first.');
      return;
    }

    setLoadingChangeDetection(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/change/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords,
          start_year: sYear,
          end_year: eYear,
          index_name: indexName,
          sensitivity: sensitivity
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Change detection analysis failed.');
      }

      const data: ChangeDetectionData = await response.json();
      setChangeDetectionData(data);
      setTileUrls(prev => ({
        ...prev,
        changeYear: data.tile_urls?.onset_year,
        changeMagnitude: data.tile_urls?.magnitude,
      }));
      setActiveLayer('change_year');
      setSuccessMessage(
        `Disturbance analysis completed: ${data.total_disturbed_ha} ha (${data.disturbed_percentage}%) disturbed over ${sYear}-${eYear}.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Disturbance analysis failed.');
    } finally {
      setLoadingChangeDetection(false);
    }
  };

  // Handle Vector File Upload (GeoJSON, KML, KMZ, Shapefile .zip, GPX)
  const handleVectorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingVector(true);
    setErrorMessage(null);
    try {
      const result = await parseVectorFile(file);
      if (result.coordinates && result.coordinates.length >= 3) {
        handleAOIDrawn(result.coordinates);
        const detailInfo = result.info ? ` (${result.info})` : '';
        setSuccessMessage(
          `Imported ${result.format} AOI from "${file.name}" with ${result.coordinates.length} vertices${detailInfo}.`
        );
      } else {
        throw new Error(`Could not extract valid polygon coordinates from "${file.name}".`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to parse vector file.");
    } finally {
      setIsImportingVector(false);
      e.target.value = '';
    }
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
      if (selectedSensor === 'landsat') {
        const response = await fetch(`${API_BASE}/api/landsat/map-id`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coords,
            start_date: startDate,
            end_date: endDate,
            cloud_percentage: cloudCover
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || "Failed to fetch Landsat imagery.");
        }

        const data = await response.json();
        setTileUrls(prev => ({
          ...prev,
          landsatTrueColor: data.true_color_url,
          landsatFalseColor: data.false_color_url,
          landsatNdvi: data.ndvi_url,
          trueColor: data.true_color_url,
          falseColor: data.false_color_url,
          ndvi: data.ndvi_url
        }));
        setActiveLayer('true_color');
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
        setProcessingTime(parseFloat(elapsed));
        setSuccessMessage(`Landsat 8/9 composite generated in ${elapsed}s (30m GSD).`);
        return;
      }

      if (!compareMode) {
        const response = await fetch(`${API_BASE}/api/gee/map-id`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coords,
            start_date: startDate,
            end_date: endDate,
            cloud_cover: cloudCover,
            cloud_mask_type: cloudMaskType,
            mask_shadows: maskShadows,
            seasonal_filter: seasonalFilter
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
          ndvi: data.ndvi_tile_url,
          sar: data.sar_tile_url
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
              cloud_cover: cloudCover,
              cloud_mask_type: cloudMaskType,
              mask_shadows: maskShadows,
              seasonal_filter: seasonalFilter
            })
          }),
          fetch(`${API_BASE}/api/gee/map-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coords,
              start_date: compareStartDate,
              end_date: compareEndDate,
              cloud_cover: cloudCover,
              cloud_mask_type: cloudMaskType,
              mask_shadows: maskShadows,
              seasonal_filter: seasonalFilter
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
          sar: dataA.sar_tile_url,
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
        model_type: modelType,
        cloud_mask_type: cloudMaskType,
        mask_shadows: maskShadows,
        seasonal_filter: seasonalFilter,
        use_sar_fusion: useSarFusion,
        sensor: selectedSensor
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
          export_format: downloadFormat
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to generate download packet.");
      }

      const data = await response.json();

      if (downloadFormat === 'geojson') {
        const blob = new Blob([JSON.stringify(data.geojson_data, null, 2)], { type: 'application/geo+json' });
        const filename = `geoclass-aoi-${startDate}-to-${endDate}.geojson`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSuccessMessage("GeoJSON vectors exported successfully!");
      } else if (downloadFormat === 'kmz') {
        if (!data.kmz_base64) {
          throw new Error("Backend was unable to bundle the 3D classification raster into the KMZ archive. Please verify server connection.");
        }
        // Decode base64 KMZ archive (bundles doc.kml and classification raster image locally)
        const binaryStr = atob(data.kmz_base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/vnd.google-earth.kmz' });
        const filename = `geoclass-aoi-${startDate}-to-${endDate}.kmz`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSuccessMessage("KMZ exported successfully! Open this .kmz file in Google Earth Desktop or Web to see the 3D classification overlay.");
      } else if (downloadFormat === 'kml') {
        const kmlText = data.kml_data || "";
        const blob = new Blob([kmlText], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
        const filename = `geoclass-aoi-${startDate}-to-${endDate}.kml`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSuccessMessage("KML Placemark exported! (Note: For 3D terrain overlay without network/API restrictions, use the KMZ format).");
      } else if (data.download_url) {
        const a = document.createElement('a');
        a.href = data.download_url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.download = `geoclass-${downloadFormat === 'png' ? 'map' : 'classification'}-${startDate}.${downloadFormat === 'png' ? 'png' : 'tif'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setSuccessMessage(`${downloadFormat === 'geotiff' ? 'GeoTIFF' : 'PNG'} export initiated! Check your downloads.`);
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

  // Feature 5: Automated PDF Executive Summary Briefing Generator
  const triggerPdfBriefing = async () => {
    if (coords.length === 0 || !statistics) {
      setErrorMessage("Please select an Area of Interest and run classification before generating an executive briefing.");
      return;
    }

    setGeneratingPdf(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/export/pdf-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coords,
          statistics,
          total_area_ha: totalAreaHa || (aoiAreaHa || 0),
          start_date: startDate,
          end_date: endDate,
          cloud_cover: cloudCover,
          model_type: modelType,
          cloud_mask_type: cloudMaskType,
          seasonal_filter: seasonalFilter,
          location_name: selectedAreaId ? SAVED_AREAS.find(a => a.id === selectedAreaId)?.name : (selectedLocation?.label || undefined)
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to generate executive PDF briefing.");
      }

      const blob = await response.blob();
      const filename = `GeoClass_Executive_Briefing_${startDate}_to_${endDate}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage("Executive Briefing PDF generated and downloaded successfully!");
    } catch (err: any) {
      console.error("PDF Briefing Error:", err);
      setErrorMessage(err.message || "Failed to generate PDF briefing.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Generate automated environmental insights
  const getEnvironmentalReport = () => {
    if (!statistics) return null;

    const statsArray = Object.entries(statistics).map(([name, val]) => ({
      name,
      ...val
    }));

    if (statsArray.length === 0) return null;

    const dominant = [...statsArray].sort((a, b) => (b.area_ha || 0) - (a.area_ha || 0))[0];
    if (!dominant) return null;

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
      dominantClass: dominant?.name || 'N/A',
      dominantPct: dominant?.percentage || 0,
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
    {
      key: 'slope' as const,
      label: 'Slope stability',
      sub: '5-Tier geotechnical grade',
      hasUrl: !!tileUrls.slope,
    },
    {
      key: 'elevation' as const,
      label: 'Digital elevation',
      sub: 'Copernicus 30m DEM',
      hasUrl: !!tileUrls.elevation,
    },
    {
      key: 'hillshade' as const,
      label: 'Terrain hillshade',
      sub: '3D shaded relief',
      hasUrl: !!tileUrls.hillshade,
    },
    {
      key: 'ndbi' as const,
      label: 'Built-up (NDBI)',
      sub: 'Impervious urban & rock',
      hasUrl: !!tileUrls.ndbi,
    },
    {
      key: 'mndwi' as const,
      label: 'Water (MNDWI)',
      sub: 'Open water & basins',
      hasUrl: !!tileUrls.mndwi,
    },
    {
      key: 'nbr' as const,
      label: 'Burn ratio (NBR)',
      sub: 'Burn severity & clearing',
      hasUrl: !!tileUrls.nbr,
    },
    {
      key: 'sar' as const,
      label: 'SAR Radar (C-Band)',
      sub: 'Cloud-penetrating VV/VH',
      hasUrl: !!tileUrls.sar,
    },
    {
      key: 'landsat_true_color' as const,
      label: 'Landsat 8/9 RGB',
      sub: 'USGS 30m True Color',
      hasUrl: !!tileUrls.landsatTrueColor,
    },
    {
      key: 'landsat_false_color' as const,
      label: 'Landsat False Color',
      sub: 'SWIR/NIR 30m composite',
      hasUrl: !!tileUrls.landsatFalseColor,
    },
    {
      key: 'landsat_ndvi' as const,
      label: 'Landsat NDVI',
      sub: '30m Vegetation Index',
      hasUrl: !!tileUrls.landsatNdvi,
    },
    {
      key: 'change_year' as const,
      label: 'Disturbance Onset',
      sub: 'LandTrendr break year',
      hasUrl: !!tileUrls.changeYear,
    },
    {
      key: 'change_magnitude' as const,
      label: 'Disturbance Severity',
      sub: 'Trajectory drop intensity',
      hasUrl: !!tileUrls.changeMagnitude,
    },
  ];

  const readyLayersCount = layerStack.filter(l => l.hasUrl).length;

  return (
    <div className="geo-app">
      
      {/* ---------- Top bar ---------- */}
      <header className="topbar">
        <div className="flex items-center gap-2">
          <div className="brand">
            <div className="brand-mark bg-[#306840]/15 border border-[#306840]/30 text-[#E0DCD3] flex items-center justify-center rounded-lg p-1.5">
              <Layers className="w-4 h-4 text-[#E0DCD3]" />
            </div>
            <div className="brand-text">
              <div className="name font-sans text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                <span>GeoClass</span>
              </div>
              <div className="sub text-[11px] text-slate-400 font-sans hidden sm:block">Earth Observation & Land Cover Analysis</div>
            </div>
          </div>
        </div>

        {/* Desktop Steps Nav */}
        <div className="steps-nav hidden md:flex text-xs font-medium text-slate-400">
          <div className={`step ${workflowStep >= 1 ? 'active text-[#E0DCD3] font-semibold' : ''}`}>1. Area</div>
          <span className="sep text-slate-600">›</span>
          <div className={`step ${workflowStep >= 2 ? 'active text-[#E0DCD3] font-semibold' : ''}`}>2. Imagery</div>
          <span className="sep text-slate-600">›</span>
          <div className={`step ${workflowStep >= 3 ? 'active text-[#E0DCD3] font-semibold' : ''}`}>3. Classification</div>
          <span className="sep text-slate-600">›</span>
          <div className={`step ${workflowStep >= 4 ? 'active text-[#E0DCD3] font-semibold' : ''}`}>4. Analytics</div>
        </div>

        {/* Mobile Step Badge */}
        <div className="md:hidden flex items-center gap-1.5 text-xs text-neutral-300 bg-[#1A1D17] border border-[#2E3429] px-2.5 py-1 rounded">
          <span className="text-[#E0DCD3] font-medium">Step {workflowStep}/4</span>
          <span className="text-neutral-600">•</span>
          <span className="truncate max-w-[85px]">
            {workflowStep === 1 ? 'AOI' : workflowStep === 2 ? 'Imagery' : workflowStep === 3 ? 'Classify' : 'Analyze'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/methods"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1A1D17] border border-[#2E3429] text-[#E0DCD3] hover:text-white hover:border-[#306840] text-xs font-medium transition cursor-pointer"
            title="Explore band physics, SAR microwave equations, and developer API"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#306840]" />
            <span>Methods & API</span>
          </a>

          <button
            type="button"
            onClick={handleSharePermalink}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1A1D17] border border-[#2E3429] text-[#E0DCD3] hover:text-white hover:border-[#306840] text-xs font-medium transition cursor-pointer"
            title="Copy shareable permalink with current AOI and parameters"
          >
            <Share2 className="w-3.5 h-3.5 text-[#306840]" />
            <span className="hidden sm:inline">Share View</span>
          </button>

          <div className="flex items-center gap-1 bg-[#1A1D17] border border-[#2E3429] rounded p-0.5">
            <button
              type="button"
              onClick={() => setLeftRailCollapsed(!leftRailCollapsed)}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition cursor-pointer font-medium ${!leftRailCollapsed ? 'bg-[#22261E] text-[#E0DCD3] border border-[#306840]/40' : 'text-neutral-400 hover:text-neutral-200'}`}
              title={leftRailCollapsed ? "Expand Workflow Controls" : "Collapse Workflow Controls"}
            >
              {leftRailCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
              <span className="text-xs">Workflow</span>
            </button>
            <button
              type="button"
              onClick={() => setRightRailCollapsed(!rightRailCollapsed)}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition cursor-pointer font-medium ${!rightRailCollapsed ? 'bg-[#22261E] text-[#E0DCD3] border border-[#306840]/40' : 'text-neutral-400 hover:text-neutral-200'}`}
              title={rightRailCollapsed ? "Expand Layers & Tools" : "Collapse Layers & Tools"}
            >
              {rightRailCollapsed ? <PanelRightOpen className="w-3.5 h-3.5" /> : <PanelRightClose className="w-3.5 h-3.5" />}
              <span className="text-xs">Layers</span>
            </button>
          </div>

          {processingTime && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1A1D17] border border-[#2E3429] text-neutral-300 text-xs">
              <Clock className="w-3.5 h-3.5 text-[#E0DCD3]" /> {processingTime}s
            </div>
          )}

          <div className="gee-status text-xs">
            <span className={`dot ${geeConnected === false ? 'offline' : 'online'}`}></span>
            <span className="hidden sm:inline text-neutral-300 text-xs">{geeConnected === null ? 'Connecting...' : geeConnected ? 'Engine: Active' : 'Engine: Offline'}</span>
            <span className="sm:hidden text-xs text-neutral-300">{geeConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </header>

      {/* ---------- Main grid ---------- */}
      <div className={`main-grid ${leftRailCollapsed ? 'left-collapsed' : ''} ${rightRailCollapsed ? 'right-collapsed' : ''}`}>
        
        {/* ---------- Left rail (Workflow & Pipeline) ---------- */}
        <aside className={`rail rail-left ${leftRailCollapsed ? 'collapsed' : ''}`} aria-label="Workflow controls">
          <div className="rail-header">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Sliders className="w-3.5 h-3.5 text-[#306840]" />
              <span>Workflow Controls</span>
            </div>
            <button
              type="button"
              onClick={() => setLeftRailCollapsed(true)}
              className="p-1 rounded text-[#8B8C7F] hover:text-[#EDE8DB] hover:bg-[#2A2C24] transition cursor-pointer"
              title="Collapse workflow panel"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

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
              <div 
                className="phase-title cursor-pointer select-none flex items-center justify-between"
                onClick={() => setPhase1Open(!phase1Open)}
              >
                <div className="flex items-center gap-2">
                  <span>Area of Interest</span>
                  {coords.length > 0 && <span className="tag mono">{coords.length} pts</span>}
                </div>
                <span className="text-[#8B8C7F] hover:text-[#EDE8DB] transition">
                  {phase1Open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </div>

              <AnimatePresence initial={false}>
                {phase1Open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="phase-body space-y-2.5">
                {/* Location search */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => {
                        setLocationQuery(e.target.value);
                        if (e.target.value.trim()) setDismissedInvite(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchSubmit();
                        }
                      }}
                      placeholder="Search city, district, coordinates..."
                      className="ctl pr-8 text-xs"
                      aria-label="Search geographic location"
                    />
                    {locationLoading ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#E0DCD3] animate-spin absolute right-2.5 pointer-events-none" />
                    ) : (
                      <Search 
                        className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 cursor-pointer hover:text-white transition"
                        onClick={handleSearchSubmit}
                      />
                    )}
                  </div>

                  {/* Autocomplete dropdown suggestions */}
                  {locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#1A1D17] border border-[#2E3429] rounded shadow-xl overflow-hidden text-xs">
                      {locationSuggestions.map((sug) => (
                        <button
                          key={sug.id}
                          type="button"
                          onClick={() => selectLocation(sug)}
                          className="w-full text-left px-3 py-2 hover:bg-[#22261E] text-neutral-200 border-b border-[#2E3429]/60 last:border-0 flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="truncate pr-2 font-medium">{sug.label}</span>
                          <span className="text-[10px] mono text-[#E0DCD3] shrink-0">
                            {sug.type || 'region'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>



                {/* Vector File Ingestion (GeoJSON, KML, KMZ, Shapefile .zip, GPX) */}
                <label className={`flex flex-col items-center justify-center w-full py-2 px-3 border border-dashed border-[#3D4537] hover:border-[#306840]/60 rounded bg-[#1A1D17]/60 hover:bg-[#1A1D17] text-neutral-300 hover:text-white transition cursor-pointer mt-1 ${isImportingVector ? 'opacity-60 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2">
                    {isImportingVector ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#E0DCD3] animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#E0DCD3]" />
                    )}
                    <span className="text-xs font-medium">
                      {isImportingVector ? 'Parsing Vector File...' : 'Import AOI Vector Boundary'}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono mt-0.5">
                    GeoJSON • KML / KMZ • Shapefile (.zip) • GPX
                  </span>
                  <input
                    type="file"
                    accept=".geojson,.json,.kml,.kmz,.zip,.gpx"
                    onChange={handleVectorUpload}
                    disabled={isImportingVector}
                    className="sr-only"
                  />
                </label>

                {coords.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                    <span>{aoiAreaHa ? `${aoiAreaHa.toFixed(1)} ha` : ''}</span>
                    <button
                      type="button"
                      onClick={saveCurrentArea}
                      className="text-[#E0DCD3] hover:text-[#d3e868] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" /> Save AOI
                    </button>
                  </div>
                )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Phase 2: Fetch satellite imagery */}
            <div className={`phase ${tileUrls.trueColor ? 'done' : (coords.length > 0 && !tileUrls.classified ? 'active' : '')}`}>
              <div className="node"></div>
              <div 
                className="phase-title cursor-pointer select-none flex items-center justify-between"
                onClick={() => setPhase2Open(!phase2Open)}
              >
                <div className="flex items-center gap-2">
                  <span>Satellite imagery</span>
                  {tileUrls.trueColor && <span className="tag mono">READY</span>}
                </div>
                <span className="text-[#8B8C7F] hover:text-[#EDE8DB] transition">
                  {phase2Open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </div>

              <AnimatePresence initial={false}>
                {phase2Open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="phase-body space-y-3">
                {/* Sensor Constellation Selector */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="field-label mb-0">Sensor constellation</label>
                    <span className="text-[10px] mono text-[#EDE8DB]">{selectedSensor === 'sentinel_2' ? '10m MSI' : '30m OLI'}</span>
                  </div>
                  <select
                    value={selectedSensor}
                    onChange={(e) => setSelectedSensor(e.target.value as any)}
                    className="ctl text-xs"
                  >
                    <option value="sentinel_2">Copernicus Sentinel-2 (10m Optical)</option>
                    <option value="landsat">USGS Landsat 8/9 (30m Optical)</option>
                  </select>
                </div>

                {/* STAC Catalog Granule Browser Button */}
                <button
                  type="button"
                  onClick={() => setIsSTACModalOpen(true)}
                  className="w-full py-1.5 px-2.5 rounded text-xs bg-[#1A1D17] hover:bg-[#22261E] border border-[#2E3429] text-[#E0DCD3] flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#306840]" />
                    <span>Browse STAC Catalog</span>
                  </div>
                  <span className="text-[10px] mono text-[#8B8C7F]">Scenes & Granules</span>
                </button>

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
                    <div className="mt-2 pt-2 border-t border-[#35372E] space-y-2">
                      <div className="grid grid-cols-2 gap-2">
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

                      {/* Split-Screen Swipe Quick Launch */}
                      <button
                        type="button"
                        onClick={() => triggerTool('swipe')}
                        className={`w-full py-1.5 px-2 rounded text-xs cursor-pointer flex items-center justify-center gap-1.5 transition ${
                          swipeActive
                            ? 'bg-[#306840] text-[#E0DCD3] font-medium shadow-md border border-[#4B6445]'
                            : 'bg-[#1A1D17] hover:bg-[#22261E] text-[#E0DCD3] border border-[#306840]/50'
                        }`}
                      >
                        <Columns2 className={`w-3.5 h-3.5 ${swipeActive ? 'text-[#E0DCD3]' : 'text-[#4B6445]'}`} />
                        <span>{swipeActive ? "Exit Split-Screen Curtain" : "Launch Split-Screen Curtain"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Feature 6: Atmospheric & Cloud Screening Controls */}
                <div className="pt-1">
                  <div 
                    className="flex items-center justify-between py-1 cursor-pointer select-none text-[11.5px] text-neutral-400 hover:text-white transition"
                    onClick={() => setShowAtmosphericConfig(!showAtmosphericConfig)}
                  >
                    <div className="flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-[#E0DCD3]" />
                      <span>Atmospheric & Cloud Controls</span>
                    </div>
                    <span className="mono text-[#E0DCD3] text-xs font-semibold">{showAtmosphericConfig ? '−' : '+'}</span>
                  </div>

                  {showAtmosphericConfig && (
                    <div className="mt-2 pt-2 pb-1.5 px-2.5 bg-[#121410] border border-[#2E3429] rounded space-y-2.5">
                      <div>
                        <label className="field-label flex justify-between items-center">
                          <span>Cloud Mask Algorithm</span>
                          <span className="text-[10px] text-[#06B6D4] font-mono lowercase">{cloudMaskType}</span>
                        </label>
                        <select
                          value={cloudMaskType}
                          onChange={(e) => setCloudMaskType(e.target.value as any)}
                          className="ctl text-xs"
                        >
                          <option value="both">Dual SCL + QA60 (Strict Filtering)</option>
                          <option value="scl">Scene Classification (SCL Only)</option>
                          <option value="qa60">QA60 Cloud Bitmask Only</option>
                          <option value="none">Raw Radiance (Unmasked)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between py-0.5">
                        <span className="text-[11px] text-[#94A3B8]">Filter Cloud Shadows</span>
                        <input
                          type="checkbox"
                          checked={maskShadows}
                          onChange={(e) => setMaskShadows(e.target.checked)}
                          className="accent-[#F59E0B] cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="field-label flex justify-between items-center">
                          <span>Seasonal Composite Window</span>
                          <span className="text-[10px] text-[#E0DCD3] font-mono lowercase">{seasonalFilter}</span>
                        </label>
                        <select
                          value={seasonalFilter}
                          onChange={(e) => setSeasonalFilter(e.target.value as any)}
                          className="ctl text-xs"
                        >
                          <option value="all">All Months (Annual Composite)</option>
                          <option value="dry">Dry Season Only (Optimal Low Cloud)</option>
                          <option value="wet">Wet / Green Season (Peak Biomass)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={fetchSatelliteImagery}
                  disabled={loadingMapId || coords.length === 0}
                  className="run-btn"
                >
                  {loadingMapId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching imagery...
                    </>
                  ) : (
                    <>
                      <Satellite className="w-3.5 h-3.5" /> Fetch satellite imagery
                    </>
                  )}
                </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Phase 3: Classification */}
            <div className={`phase ${tileUrls.classified ? 'done active' : (tileUrls.trueColor ? 'active' : '')}`}>
              <div className="node"></div>
              <div 
                className="phase-title cursor-pointer select-none flex items-center justify-between"
                onClick={() => setPhase3Open(!phase3Open)}
              >
                <div className="flex items-center gap-2">
                  <span>Classification</span>
                  <span className="tag mono">03</span>
                </div>
                <span className="text-slate-400 hover:text-white transition">
                  {phase3Open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </div>

              <AnimatePresence initial={false}>
                {phase3Open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="phase-body">
                <div className="field-label">Model</div>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value as any)}
                  className="ctl"
                >
                  <option value="deep_learning">Deep Learning Spatial U-Net (GeoAI)</option>
                  <option value="random_forest">Smile Random Forest (On-the-Fly)</option>
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
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Decision trees</span>
                            <span className="mono text-slate-200">{numTrees}</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="250"
                            step="10"
                            value={numTrees}
                            onChange={(e) => setNumTrees(parseInt(e.target.value))}
                            className="w-full accent-[#306840] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Samples per class</span>
                            <span className="mono text-slate-200">{samplePoints} px</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="500"
                            step="25"
                            value={samplePoints}
                            onChange={(e) => setSamplePoints(parseInt(e.target.value))}
                            className="w-full accent-[#306840] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {(modelType === 'random_forest' || modelType === 'deep_learning') && (
                  <div className="mt-3 p-2.5 rounded bg-[#161912] border border-[#2E3429]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Satellite className="w-3.5 h-3.5 text-[#306840]" />
                        <span className="text-xs font-medium text-white">Sentinel-1 SAR Fusion</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useSarFusion}
                          onChange={(e) => setUseSarFusion(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-[#2E3429] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#306840]"></div>
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      Fuses C-band SAR microwave backscatter (VV, VH, VV/VH ratio) to penetrate cloud cover and separate soil moisture from canopy roughness.
                    </p>
                  </div>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </aside>

        {/* ---------- Map area ---------- */}
        <main className="map-area">
          {/* Floating panel restore buttons */}
          {leftRailCollapsed && (
            <button
              type="button"
              onClick={() => setLeftRailCollapsed(false)}
              className="absolute left-3 top-3 z-[1001] px-3 py-1.5 bg-[#1A1D17]/90 hover:bg-[#22261E] border border-[#2E3429] text-neutral-200 rounded-lg shadow-lg backdrop-blur-md transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Expand Workflow Controls"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-[#E0DCD3]" />
              <span>Workflow</span>
            </button>
          )}
          {rightRailCollapsed && (
            <button
              type="button"
              onClick={() => setRightRailCollapsed(false)}
              className="absolute right-3 top-3 z-[1001] px-3 py-1.5 bg-[#1A1D17]/90 hover:bg-[#22261E] border border-[#2E3429] text-neutral-200 rounded-lg shadow-lg backdrop-blur-md transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Expand Layers & Tools"
            >
              <PanelRightOpen className="w-3.5 h-3.5 text-[#E0DCD3]" />
              <span>Layers</span>
            </button>
          )}
          
          {/* Status Telemetry Strip */}
          <div className="status-strip">
            <div className="status-item">
              <div className="k">Status</div>
              <div className="v">
                {loadingMapId ? (
                  <span className="status-badge status-badge-computing"><Loader2 className="w-3 h-3 animate-spin mr-1" />Fetching Scene...</span>
                ) : loadingClassify ? (
                  <span className="status-badge status-badge-computing"><Loader2 className="w-3 h-3 animate-spin mr-1" />Classifying...</span>
                ) : tileUrls.classified ? (
                  <span className="status-badge status-badge-active">Classified</span>
                ) : tileUrls.trueColor ? (
                  <span className="status-badge status-badge-ready">Imagery Ready</span>
                ) : (
                  <span className="status-badge status-badge-standby">Ready for AOI</span>
                )}
              </div>
            </div>
            <div className="status-item">
              <div className="k">AOI Area</div>
              <div className="v font-medium text-slate-200">
                {aoiAreaHa ? (
                  <span className="text-[#E0DCD3] font-semibold">{aoiAreaHa.toFixed(1)} ha</span>
                ) : (
                  <span className="text-slate-500">None selected</span>
                )}
              </div>
            </div>
            <div className="status-item">
              <div className="k">Date Window</div>
              <div className="v font-medium text-slate-200">{startDate.slice(0, 4)} Season</div>
            </div>
            <div className="status-item">
              <div className="k">Cloud Mask</div>
              <div className="v font-medium text-slate-200">{cloudCover}% Max</div>
            </div>
            <div className="status-item">
              <div className="k">Active Layers</div>
              <div className="v font-medium text-[#E0DCD3]">{readyLayersCount} / {layerStack.length} ready</div>
            </div>
            {aiQualityMetrics && (
              <div className="status-item">
                <div className="k">Quality Score</div>
                <div className="v flex items-center gap-1 text-emerald-400 font-medium">
                  <span>{aiQualityMetrics.overall_quality_score}%</span>
                  <span className="text-[10px] text-slate-400">({aiQualityMetrics.rating})</span>
                </div>
              </div>
            )}
            {buildingStats && (
              <div className="status-item">
                <div className="k">Footprints</div>
                <div className="v font-medium text-slate-200">{buildingStats.building_count} bldg</div>
              </div>
            )}
            {processingTime && (
              <div className="status-item">
                <div className="k">Processing</div>
                <div className="v font-medium text-slate-300">{processingTime}s</div>
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
                title="Draw Rectangle"
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

              <button
                type="button"
                onClick={() => triggerTool('poly')}
                className={`t ${activeTool === 'poly' ? 'active' : ''}`}
                title="Draw Polygon"
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

              <button
                type="button"
                onClick={() => triggerTool('edit')}
                className={`t ${activeTool === 'edit' ? 'active' : ''}`}
                title="Edit Vertices"
              >
                <Edit3 className="w-4 h-4" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>Edit Vertices</span>
                    <span className="tool-tip-badge">EDIT</span>
                  </div>
                  <div className="tool-tip-desc">Click and drag boundary corner nodes to reshape the active AOI.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerTool('drag')}
                className={`t ${activeTool === 'drag' ? 'active' : ''}`}
                title="Move Boundary"
              >
                <Move className="w-4 h-4" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>Move Boundary</span>
                    <span className="tool-tip-badge">MOVE</span>
                  </div>
                  <div className="tool-tip-desc">Click and drag the entire polygon across the map canvas.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerTool('rotate')}
                className={`t ${activeTool === 'rotate' ? 'active' : ''}`}
                title="Rotate Boundary"
              >
                <RotateCw className="w-4 h-4" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>Rotate Boundary</span>
                    <span className="tool-tip-badge">ROTATE</span>
                  </div>
                  <div className="tool-tip-desc">Click and drag rotation handle to orient the active AOI.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerTool('text')}
                className={`t ${activeTool === 'text' ? 'active' : ''}`}
                title="Text Annotation"
              >
                <Type className="w-4 h-4" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>Text Annotation</span>
                    <span className="tool-tip-badge">NOTE</span>
                  </div>
                  <div className="tool-tip-desc">Click anywhere on the map to type and place custom notes or field labels.</div>
                </div>
              </button>

              <div className="divider" />

              <button
                type="button"
                onClick={() => triggerTool('smart')}
                className={`t ${activeTool === 'smart' ? 'active' : ''}`}
                title="Smart Select"
              >
                <Wand2 className="w-4 h-4" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>SAM Smart Select</span>
                    <span className="tool-tip-badge">AI GEO</span>
                  </div>
                  <div className="tool-tip-desc">Click any pixel to automatically segment a contiguous parcel or water body.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerTool('pan')}
                className={`t ${activeTool === 'pan' ? 'active' : ''}`}
                title="Pan Map"
              >
                <Hand className="w-4 h-4" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>Pan Map</span>
                    <span className="tool-tip-badge">NAV</span>
                  </div>
                  <div className="tool-tip-desc">Explore satellite imagery freely without drawing or editing geometry.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerTool('measure')}
                className={`t ${measurementMode ? 'active' : ''}`}
                title="Measure Distance"
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

              <button
                type="button"
                onClick={() => triggerTool('transect')}
                className={`t ${transectMode ? 'active' : ''}`}
                title="Elevation Profile"
              >
                <Mountain className="w-4 h-4" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>Elevation Transect</span>
                    <span className="tool-tip-badge">DEM</span>
                  </div>
                  <div className="tool-tip-desc">Draw a cross-sectional line across terrain to slice a 3D elevation profile.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerTool('spectral')}
                className={`t ${spectralInspectorMode ? 'active' : ''}`}
                title="Spectral Inspector"
              >
                <Activity className="w-4 h-4 text-blue-400" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>Spectral Inspector</span>
                    <span className="tool-tip-badge">10-BAND</span>
                  </div>
                  <div className="tool-tip-desc">Click any pixel to extract its 10-band Sentinel-2 reflectance curve and indices.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerTool('timeline')}
                className={`t ${timelineMode ? 'active' : ''}`}
                title="Pixel Timeline"
              >
                <History className="w-4 h-4 text-blue-400" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>Pixel Timeline</span>
                    <span className="tool-tip-badge">5-YEAR</span>
                  </div>
                  <div className="tool-tip-desc">Click any pixel to track historical multi-index trends and detect disturbances.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowChangePanel(!showChangePanel)}
                className={`t ${showChangePanel ? 'active' : ''}`}
                title="Disturbance & Trend Breaks (LandTrendr)"
              >
                <TrendingDown className="w-4 h-4 text-amber-400" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>Trend Breaks</span>
                    <span className="tool-tip-badge">LANDTRENDR</span>
                  </div>
                  <div className="tool-tip-desc">Multi-year trajectory segmentation to detect deforestation and urban sprawl.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerTool('swipe')}
                className={`t ${swipeActive ? 'active' : ''}`}
                title="Split Wipe"
              >
                <Columns2 className="w-4 h-4 text-emerald-400" />
                <div className="tool-tip">
                  <div className="tool-tip-title">
                    <span>Split-Screen Wipe</span>
                    <span className="tool-tip-badge">COMPARE</span>
                  </div>
                  <div className="tool-tip-desc">Draggable curtain slider to visually wipe between two dates or satellite modalities.</div>
                </div>
              </button>

              <div className="divider" />

              <button
                type="button"
                onClick={() => triggerTool('clear')}
                className="t"
                title="Clear Boundary"
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

            {/* AOI Guidance Empty State */}
            {coords.length === 0 && !dismissedInvite && !selectedLocation && !locationQuery.trim() && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-[#1A1D17]/95 backdrop-blur-md border border-[#2E3429] rounded-lg px-4 py-3 shadow-xl max-w-md w-[90vw] text-neutral-200">
                <button
                  type="button"
                  onClick={() => setDismissedInvite(true)}
                  className="absolute top-2 right-2 text-neutral-400 hover:text-white p-1 transition cursor-pointer"
                  title="Dismiss guide"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="text-xs font-semibold text-[#E0DCD3] flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#306840]"></span>
                  Define Area of Interest
                </div>
                <div className="text-xs text-neutral-300 leading-relaxed">
                  Use the rectangle or polygon tools on the left toolbar to draw your district boundary for Sentinel-2 satellite ingestion and classification.
                </div>
              </div>
            )}

            {/* Unified Neatline Telemetry Footer Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-[#1A1D17]/95 backdrop-blur-md border-t border-[#2E3429] px-3 py-1.5 flex items-center justify-between text-xs text-neutral-400 select-none">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-medium">LAT</span>
                  <span className="text-neutral-200 font-mono">{mapCenter[0].toFixed(5)}°</span>
                  <span className="text-neutral-500 font-medium ml-1">LNG</span>
                  <span className="text-neutral-200 font-mono">{mapCenter[1].toFixed(5)}°</span>
                </div>
                <span className="text-[#3D4537]">|</span>
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-neutral-500">GSD:</span>
                  <span className="text-[#E0DCD3] font-mono">10m / px</span>
                </div>
                <span className="text-[#3D4537] hidden md:inline">|</span>
                <div className="hidden md:flex items-center gap-1">
                  <span className="text-neutral-500">Sensor:</span>
                  <span className="text-neutral-200">Sentinel-2 MSI</span>
                </div>
                <span className="text-[#3D4537] hidden md:inline">|</span>
                <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-neutral-500 font-sans">Cursor:</span>
                  {cursorCoords ? (
                    <>
                      <span className="text-[#4B6445] font-medium">Lat</span>
                      <span className="text-[#E0DCD3]">{cursorCoords.lat.toFixed(6)}°</span>
                      <span className="text-[#4B6445] font-medium ml-1">Lng</span>
                      <span className="text-[#E0DCD3]">{cursorCoords.lng.toFixed(6)}°</span>
                    </>
                  ) : (
                    <span className="text-neutral-500 italic font-sans text-[11px]">Move cursor over map</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {aoiAreaHa ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#306840]"></span>
                    <span className="text-[#E0DCD3] font-medium">{aoiAreaHa.toFixed(1)} ha AOI</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    <span>No AOI</span>
                  </div>
                )}
                <span className="text-[#334155] hidden lg:inline">|</span>
                <div className="text-[10px] text-slate-500 hidden lg:block">
                  GEE &middot; Copernicus &middot; ESA &middot; OSM
                </div>
              </div>
            </div>

            {/* Leaflet Map */}
            <MapComponent
              onAOIDrawn={handleAOIDrawn}
              onCursorMove={setCursorCoords}
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
              swipeActive={swipeActive}
              onSwipeActiveChange={setSwipeActive}
              smartSelectMode={smartSelectMode}
              onSmartSelectClick={handleSmartSelectClick}
              buildingFootprintsGeoJSON={buildingFootprints}
              showBuildings={showBuildingLayer}
              onSetAOIAtPoint={handleCreateAOIAtPoint}
              slopeUrl={tileUrls.slope}
              elevationUrl={tileUrls.elevation}
              hillshadeUrl={tileUrls.hillshade}
              ndbiUrl={tileUrls.ndbi}
              mndwiUrl={tileUrls.mndwi}
              nbrUrl={tileUrls.nbr}
              sarUrl={tileUrls.sar}
              landsatTrueColorUrl={tileUrls.landsatTrueColor}
              landsatFalseColorUrl={tileUrls.landsatFalseColor}
              landsatNdviUrl={tileUrls.landsatNdvi}
              changeYearUrl={tileUrls.changeYear}
              changeMagnitudeUrl={tileUrls.changeMagnitude}
              spectralInspectorMode={spectralInspectorMode}
              onSpectralInspectorClick={handleSpectralInspect}
              inspectedSpectralCoord={spectralPixelData?.coordinate}
              timelineMode={timelineMode}
              onTimelineClick={handleTimelineInspect}
              inspectedTimelineCoord={timelineData?.coordinates}
              transectMode={transectMode}
              onTransectDrawn={handleTransectDrawn}
              elevationProfileData={elevationProfileData}
              onClearElevationProfile={() => setElevationProfileData(null)}
            />

            {/* STAC Catalog Granules Browser Modal */}
            <STACBrowserModal
              isOpen={isSTACModalOpen}
              onClose={() => setIsSTACModalOpen(false)}
              aoiCoords={coords}
              startDate={startDate}
              endDate={endDate}
              onApplySceneSettings={(newStart, newEnd, newSensor) => {
                setStartDate(newStart);
                setEndDate(newEnd);
                setSelectedSensor(newSensor as any);
                setSuccessMessage(`Applied STAC scene window (${newStart} to ${newEnd}) on ${newSensor === 'landsat' ? 'Landsat 8/9' : 'Sentinel-2'}.`);
              }}
            />

            {/* Spectral Band Inspector Floating Drawer */}
            {(spectralPixelData || loadingPixelInspect) && (
              <SpectralInspectorPanel
                data={spectralPixelData}
                loading={loadingPixelInspect}
                onClose={() => {
                  setSpectralPixelData(null);
                  setSpectralInspectorMode(false);
                }}
              />
            )}

            {/* Historical Pixel Timeline & Disturbance Tracker Floating Drawer */}
            {(timelineData || loadingTimeline) && (
              <PixelTimelinePanel
                data={timelineData}
                loading={loadingTimeline}
                onClose={() => {
                  setTimelineData(null);
                  setTimelineMode(false);
                }}
              />
            )}

            {/* Multi-Temporal Disturbance & Trend Break Panel (LandTrendr) */}
            {(showChangePanel || changeDetectionData || loadingChangeDetection) && (
              <ChangeDetectionPanel
                data={changeDetectionData}
                loading={loadingChangeDetection}
                onClose={() => setShowChangePanel(false)}
                onAnalyze={handleAnalyzeChange}
                onSelectLayer={(layerKey) => setActiveLayer(layerKey)}
                activeLayer={activeLayer}
              />
            )}


            {/* Temporal period swapper (in compare mode) */}
            {compareMode && !swipeActive && (tileUrls.classified || tileUrls.trueColor) && (
              <DraggableContainer centerHorizontally defaultPosition={{ x: 0, y: 16 }} zIndex={1002}>
                <div className="bg-[#121410]/95 backdrop-blur-md border border-[#2E3429] p-1 rounded shadow-2xl flex gap-1 cursor-grab active:cursor-grabbing">
                  <button
                    onClick={() => setActiveTimePeriod('target')}
                    className={`px-3 py-1.5 rounded text-[11px] font-medium mono transition cursor-pointer ${
                      activeTimePeriod === 'target'
                        ? 'bg-[#306840]/20 text-[#F9FAFB] border border-[#306840]'
                        : 'text-neutral-400 hover:text-[#F9FAFB]'
                    }`}
                  >
                    Target ({startDate.slice(0, 4)})
                  </button>
                  <button
                    onClick={() => setActiveTimePeriod('baseline')}
                    className={`px-3 py-1.5 rounded text-[11px] font-medium mono transition cursor-pointer ${
                      activeTimePeriod === 'baseline'
                        ? 'bg-[#F59E0B]/20 text-[#F8FAFC] border border-[#F59E0B]'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    Baseline ({compareStartDate.slice(0, 4)})
                  </button>
                </div>
              </DraggableContainer>
            )}
          </div>

          {/* ---------- Analytics area (Bottom) ---------- */}
          <div className={`analytics ${analyticsExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="analytics-head">
              <div 
                className="title cursor-pointer select-none flex items-center gap-2 hover:text-[#F8FAFC] transition"
                onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                title={analyticsExpanded ? "Minimize analytics drawer" : "Expand analytics drawer"}
              >
                <BarChart3 className="w-4 h-4 text-[#06B6D4]" />
                <span>Classification analytics</span>
                <span className="text-xs text-[#94A3B8] font-normal flex items-center gap-1 ml-1">
                  {analyticsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  <span className="text-[10.5px] mono">{analyticsExpanded ? 'Minimize' : 'Expand'}</span>
                </span>
              </div>
              {statistics && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={triggerPdfBriefing}
                    disabled={generatingPdf}
                    className="px-2.5 py-1 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 border border-[#F59E0B]/50 text-[#F8FAFC] rounded text-xs cursor-pointer flex items-center gap-1.5 transition"
                  >
                    {generatingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F59E0B]" />
                        <span>Generating Briefing...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>Executive Briefing PDF</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={printReport}
                    className="px-2.5 py-1 bg-[#1A1D17] hover:bg-[#22261E] border border-[#2E3429] text-[#F9FAFB] rounded text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#E0DCD3]" /> Print report
                  </button>
                </div>
              )}
            </div>

            {analyticsExpanded && (
              <>
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
                            className="p-3 bg-[#1A1D17] border border-[#2E3429] rounded"
                          >
                            <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-neutral-400">
                              <span>{insight.label}</span>
                              {insight.tone === 'positive' && <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />}
                              {insight.tone === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />}
                              {insight.tone === 'critical' && <ShieldAlert className="w-3.5 h-3.5 text-[#F43F5E]" />}
                              {insight.tone === 'neutral' && <Info className="w-3.5 h-3.5 text-[#E0DCD3]" />}
                            </div>
                            <p className="text-base font-bold text-[#F9FAFB] mt-1.5 mono">{insight.value}</p>
                            <p className="text-[11px] text-neutral-400 mt-1 leading-normal">{insight.detail}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Temporal Change Detection Matrix */}
                    {compareMode && referenceStatistics && (
                      <div className="p-3.5 bg-[#1A1D17] border border-[#2E3429] rounded space-y-3">
                        <div className="flex justify-between items-center border-b border-[#2E3429] pb-2">
                          <span className="text-xs font-semibold text-[#F9FAFB] flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-[#E0DCD3]" /> Temporal Change Matrix
                          </span>
                          <span className="text-[10px] mono text-neutral-400">
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
                                className={`p-2.5 rounded border bg-[#1A1D17] flex items-center justify-between ${changeTone.borderClass}`}
                              >
                                <div>
                                  <span className="text-[10.5px] uppercase font-semibold text-neutral-400 block">{className}</span>
                                  <span className="text-sm font-bold text-[#F9FAFB] mono mt-0.5 block">{valCurrent.area_ha.toFixed(1)} ha</span>
                                </div>
                                <div className={`text-right ${changeTone.textClass} mono text-xs font-semibold`}>
                                  <div className="flex items-center gap-1 justify-end">
                                    {areaChange < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : areaChange > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : null}
                                    {areaChange > 0 ? '+' : ''}{areaChange.toFixed(1)} ha
                                  </div>
                                  <div className="text-[10px] text-neutral-400">
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
                      terrainData={terrainData}
                      spectralData={spectralData}
                      loadingSuperRes={loadingSuperRes}
                      loadingWaterDynamics={loadingWaterDynamics}
                      loadingCanopyHeight={loadingCanopyHeight}
                      loadingTerrain={loadingTerrain}
                      loadingSpectral={loadingSpectral}
                      onExtractBuildings={extractBuildingFootprints}
                      extractingBuildings={extractingBuildings}
                      onTriggerSuperRes={triggerSuperResolution}
                      onTriggerWaterDynamics={triggerWaterDynamics}
                      onTriggerCanopyHeight={triggerCanopyHeight}
                      onTriggerTerrain={triggerAnalyzeTerrain}
                      onTriggerSpectral={triggerAnalyzeSpectral}
                      onSelectLayer={(l) => setActiveLayer(l as any)}
                    />

                    {/* Ecological Guidelines */}
                    {reportInsights && (
                      <div className="p-3.5 bg-[#1A1D17] border border-[#2E3429] rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#F9FAFB]">Conservation notes</span>
                          <span className="text-[10.5px] text-[#10B981] mono">{reportInsights.healthStatus}</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-neutral-400 leading-relaxed">
                          {reportInsights.recommendations.map((rec, i) => (
                            <li key={i}><span className="text-[#E5E7EB]">{rec}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

        </main>

        {/* ---------- Right rail (Layers, Tools & Export) ---------- */}
        <aside className={`rail rail-right ${rightRailCollapsed ? 'collapsed' : ''}`} aria-label="Layers and analysis controls">
          <div className="rail-header">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Layers className="w-3.5 h-3.5 text-[#306840]" />
              <span>Layers & Tools</span>
            </div>
            <button
              type="button"
              onClick={() => setRightRailCollapsed(true)}
              className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[#22261E] transition cursor-pointer"
              title="Collapse layers panel"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          <div className="rail-track">
            {/* Phase 4: Layer Stack */}
            <div className="phase">
              <div className="node"></div>
              <div 
                className="phase-title cursor-pointer select-none flex items-center justify-between"
                onClick={() => setPhase4Open(!phase4Open)}
              >
                <div className="flex items-center gap-2">
                  <span>Satellite Layers</span>
                  <span className="tag mono text-[#E0DCD3] font-semibold">
                    {readyLayersCount}/{layerStack.length}
                  </span>
                </div>
                <span className="text-slate-400 hover:text-white transition">
                  {phase4Open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </div>

              <AnimatePresence initial={false}>
                {phase4Open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
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
                      onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                      className="w-full accent-[#306840] h-1 bg-[#2E3429] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Confidence toggle */}
                  {confidenceReady && (
                    <div className="pt-3 border-t border-[#2E3429] mt-3">
                      <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span>Confidence mask</span>
                        <button
                          type="button"
                          onClick={() => setConfidenceVisible(!confidenceVisible)}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${confidenceVisible ? 'bg-[#306840] text-white' : 'bg-[#1A1D17] border border-[#2E3429] text-neutral-400'}`}
                        >
                          {confidenceVisible ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Phase 5: Field tools & Export */}
            <div className="phase">
              <div className="node"></div>
              <div 
                className="phase-title cursor-pointer select-none flex items-center justify-between"
                onClick={() => setPhase5Open(!phase5Open)}
              >
                <div className="flex items-center gap-2">
                  <span>Field tools & Export</span>
                </div>
                <span className="text-slate-400 hover:text-white transition">
                  {phase5Open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </div>

              <AnimatePresence initial={false}>
                {phase5Open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
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
                      onClick={() => triggerTool('transect')}
                      className={`tool-btn ${transectMode ? 'active' : ''}`}
                    >
                      <Mountain className="w-3.5 h-3.5" /> Transect
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerTool('spectral')}
                      className={`tool-btn ${spectralInspectorMode ? 'active' : ''}`}
                    >
                      <Activity className="w-3.5 h-3.5 text-[#E0DCD3]" /> Spectral
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerTool('timeline')}
                      className={`tool-btn ${timelineMode ? 'active' : ''}`}
                    >
                      <History className="w-3.5 h-3.5 text-[#E0DCD3]" /> Timeline
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerTool('swipe')}
                      className={`tool-btn ${swipeActive ? 'active' : ''}`}
                    >
                      <Columns2 className="w-3.5 h-3.5 text-emerald-400" /> Swipe
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerTool('notes')}
                      className={`tool-btn ${noteMode ? 'active' : ''}`}
                    >
                      <StickyNote className="w-3.5 h-3.5" /> Notes · {mapNotes.length}
                    </button>
                  </div>

                  {/* Topographic Analysis trigger button */}
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={triggerAnalyzeTerrain}
                      disabled={loadingTerrain}
                      className="w-full py-1.5 px-2 bg-[#1A1D17] hover:bg-[#22261E] border border-[#2E3429] text-neutral-200 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5 transition"
                    >
                      {loadingTerrain ? (
                        <>
                          <Loader2 className="w-3 h-3 text-[#E0DCD3] animate-spin" />
                          <span>Analyzing DEM...</span>
                        </>
                      ) : (
                        <>
                          <Mountain className="w-3.5 h-3.5 text-[#E0DCD3]" />
                          <span>{terrainData ? "Refresh Terrain & Slope" : "Analyze Terrain & Slope"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Spectral Indices Analysis trigger button */}
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={triggerAnalyzeSpectral}
                      disabled={loadingSpectral}
                      className="w-full py-1.5 px-2 bg-[#1A1D17] hover:bg-[#22261E] border border-[#2E3429] text-neutral-200 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5 transition"
                    >
                      {loadingSpectral ? (
                        <>
                          <Loader2 className="w-3 h-3 text-[#E0DCD3] animate-spin" />
                          <span>Computing Band Math...</span>
                        </>
                      ) : (
                        <>
                          <Activity className="w-3.5 h-3.5 text-[#E0DCD3]" />
                          <span>{spectralData ? "Refresh Spectral Indices" : "Analyze Spectral Indices"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Export Deliverables Section: ALWAYS VISIBLE */}
                  <div className="pt-3.5 mt-3.5 border-t border-[#2E3429] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold tracking-wide text-neutral-300 uppercase">Export & Deliverables</span>
                      {tileUrls.classified ? (
                        <span className="text-[10px] text-[#E0DCD3] font-medium px-1.5 py-0.5 rounded bg-[#306840]/15 border border-[#306840]/30">Ready</span>
                      ) : coords.length > 0 ? (
                        <span className="text-[10px] text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700">AOI Set</span>
                      ) : (
                        <span className="text-[10px] text-neutral-500">Draw AOI</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="field-label">Export classification & layers</div>
                      <div className="flex gap-2">
                        <select
                          value={downloadFormat}
                          onChange={(e) => setDownloadFormat(e.target.value as any)}
                          className="ctl text-xs flex-1"
                        >
                          <option value="kmz">KMZ (Google Earth 3D - Bundled)</option>
                          <option value="kml">KML (Google Earth Placemark XML)</option>
                          <option value="geotiff">GeoTIFF (Raster)</option>
                          <option value="png">PNG (Map Image)</option>
                          <option value="geojson">GeoJSON (Vectors)</option>
                        </select>
                        <button
                          type="button"
                          onClick={triggerDownload}
                          disabled={downloading}
                          className="px-3 py-1.5 bg-[#1A1D17] hover:bg-[#22261E] border border-[#2E3429] text-neutral-200 rounded text-xs cursor-pointer flex items-center gap-1.5 transition hover:text-white"
                          title="Export selected format"
                        >
                          <Download className="w-3.5 h-3.5 text-[#E0DCD3]" />
                          {downloading ? '...' : 'Save'}
                        </button>
                      </div>
                    </div>

                    {/* Quick GeoJSON AOI export shortcut */}
                    {coords.length > 0 && (
                      <div className="flex items-center justify-between pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([JSON.stringify({
                              type: "FeatureCollection",
                              features: [{
                                type: "Feature",
                                geometry: {
                                  type: "Polygon",
                                  coordinates: [coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1] ? coords : [...coords, coords[0]]]
                                },
                                properties: {
                                  name: "AOI_Boundary",
                                  area_ha: aoiAreaHa || totalAreaHa || 0,
                                  created: new Date().toISOString()
                                }
                              }]
                            }, null, 2)], { type: 'application/geo+json' });
                            const filename = `geoclass-aoi-${new Date().toISOString().split('T')[0]}.geojson`;
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            setSuccessMessage("AOI Boundary GeoJSON exported!");
                          }}
                          className="text-[11px] text-[#E0DCD3] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Square className="w-3 h-3" /> Quick export AOI (GeoJSON)
                        </button>
                        <span className="text-[10px] text-neutral-500">{coords.length} vertices</span>
                      </div>
                    )}

                    {/* Feature 5: Executive PDF Briefing Generator Button */}
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={triggerPdfBriefing}
                        disabled={generatingPdf || !statistics}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition shadow-sm ${
                          statistics
                            ? 'bg-[#306840] hover:bg-[#4B6445] text-[#E0DCD3] border border-[#4B6445]'
                            : 'bg-[#1A1D17] border border-[#2E3429] text-neutral-400 cursor-not-allowed opacity-75'
                        }`}
                        title={statistics ? "Download executive PDF briefing report" : "Run classification first to generate full statistics for the PDF report"}
                      >
                        {generatingPdf ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating Briefing PDF...</span>
                          </>
                        ) : (
                          <>
                            <FileText className={`w-3.5 h-3.5 ${statistics ? 'text-white' : 'text-neutral-500'}`} />
                            <span>{statistics ? "Generate Executive Briefing PDF" : "Executive Briefing PDF (Requires Analysis)"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </aside>

      </div>
    </div>
  );
}
