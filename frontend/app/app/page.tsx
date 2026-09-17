'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { 
  Loader2, 
  BarChart3, 
  Settings, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  FileText,
  LogOut, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Wrench,
  Info, 
  MapPin, 
  Upload, 
  TrendingUp, 
  TrendingDown, 
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
  Share2,
  BookOpen,
  Database,
  Eye,
  EyeOff,
  Target,
  MoreVertical,
  Box,
  Network,
  PlusSquare,
  Bell,
  Folder,
  LayoutGrid,
  Crosshair,
  SplitSquareVertical,
  Plus,
  Minus,
  Compass,
  MousePointer,
  Calendar,
  Maximize2,
  Minimize2,
  GripVertical
} from 'lucide-react';
import DashboardCharts, { SpectralData } from '@/components/DashboardCharts';
import { DraggableContainer } from '@/components/DraggableContainer';
import { SpectralInspectorPanel, SpectralPixelData } from '@/components/SpectralInspectorPanel';
import { PixelTimelinePanel, PixelTimelineData } from '@/components/PixelTimelinePanel';
import { ChangeDetectionPanel, ChangeDetectionData } from '@/components/ChangeDetectionPanel';
import { STACBrowserModal } from '@/components/STACBrowserModal';
import { StudyAreaMapModal } from '@/components/StudyAreaMapModal';
import { generateJupyterNotebook } from '@/lib/notebookGenerator';
import { parseVectorFile } from '@/lib/vectorParsers';

// Dynamically import the map component to avoid SSR errors with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
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

const LULC_COLORS: Record<string, string> = {
  Water: '#419BDF',
  Forest: '#397D49',
  Grass: '#88B053',
  Wetland: '#7A87C6',
  Agriculture: '#E49635',
  Shrub: '#DFC35A',
  Urban: '#C4281B',
  'Bare Land': '#A59B8F',
  'Snow/Ice': '#B39FE1',
};

const SAVED_AREAS: SavedArea[] = [
  {
    id: 'sf-bay',
    name: 'San Francisco Bay',
    type: 'Coastal region',
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
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Authentication Route Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/app');
    }
  }, [authLoading, isAuthenticated, router]);

  // Map State
  const [coords, setCoords] = useState<number[][]>([]);
  const [aoiAreaHa, setAoiAreaHa] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(10);
  const [savedAreas, setSavedAreas] = useState<SavedArea[]>(SAVED_AREAS);
  const [areaSearch, setAreaSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
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
  const [activeTool, setActiveTool] = useState<'none' | 'rect' | 'poly' | 'edit' | 'drag' | 'rotate' | 'text' | 'pan' | 'measure' | 'notes' | 'smart' | 'transect' | 'spectral' | 'timeline' | 'swipe'>('pan');

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
  const [toolstripCollapsed, setToolstripCollapsed] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'analysis' | 'statistics' | 'metadata'>('analysis');
  const [analyticsHeight, setAnalyticsHeight] = useState<number>(380);
  const [isDraggingAnalytics, setIsDraggingAnalytics] = useState(false);
  const dragStartYRef = useRef<number>(0);
  const dragStartHeightRef = useRef<number>(380);
  const isDraggingRef = useRef<boolean>(false);

  // Individual Phase Folding Accordion States
  const [phase1Open, setPhase1Open] = useState(true);
  const [phase2Open, setPhase2Open] = useState(true);
  const [phase3Open, setPhase3Open] = useState(true);
  const [phase4Open, setPhase4Open] = useState(true);
  const [phase5Open, setPhase5Open] = useState(false);
  const [exportsOpen, setExportsOpen] = useState(false);

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
  const [downloadFormat, setDownloadFormat] = useState<'geotiff' | 'png' | 'geojson' | 'kml' | 'kmz' | 'ipynb'>('kmz');
  const [downloading, setDownloading] = useState(false);
  const [isStudyAreaModalOpen, setIsStudyAreaModalOpen] = useState(false);
  const [savedWorkspaces, setSavedWorkspaces] = useState<any[]>([]);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isWorkspaceLibraryOpen, setIsWorkspaceLibraryOpen] = useState(false);
  const [singleClassPromptOpen, setSingleClassPromptOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'none' | 'true_color' | 'false_color' | 'ndvi' | 'classified'>('none');
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Responsive: auto-collapse side rails and analytics drawer on mobile devices to give full view to map
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setLeftRailCollapsed(true);
      setRightRailCollapsed(true);
      setAnalyticsExpanded(false);
    }
  }, []);

  const toggleMapFullscreen = () => {
    window.dispatchEvent(new CustomEvent('map-toggle-fullscreen'));
  };

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
 
  // Interactive Drawer Dragging (allows dragging up to expand or down to close)
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartYRef.current = clientY;
    dragStartHeightRef.current = analyticsExpanded ? analyticsHeight : 44;
    isDraggingRef.current = true;
    setIsDraggingAnalytics(true);
  }, [analyticsExpanded, analyticsHeight]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - dragStartYRef.current;
      // Moving cursor down (deltaY > 0) reduces height; moving up (deltaY < 0) increases height
      const targetHeight = dragStartHeightRef.current - deltaY;

      if (targetHeight < 90) {
        // Dragged down past collapse threshold: snap closed
        setAnalyticsExpanded(false);
      } else {
        const maxHeight = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.75, 700) : 600;
        const clamped = Math.min(Math.max(targetHeight, 140), maxHeight);
        setAnalyticsExpanded(true);
        setAnalyticsHeight(clamped);
      }
    };

    const handleEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDraggingAnalytics(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

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
      try {
        localStorage.removeItem('geoclass_active_session_state');
      } catch {}
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

  const clearAOI = useCallback(() => {
    handleAOIDrawn([]);
  }, [handleAOIDrawn]);

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
    setSuccessMessage(`${customArea.name} saved to the boundary library.`);
  };

  // Fetch Saved Workspaces from Supabase + LocalStorage
  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces?userId=${user?.id || 'guest'}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.workspaces)) {
        setSavedWorkspaces(data.workspaces);
        localStorage.setItem('geoclass_saved_workspaces_v1', JSON.stringify(data.workspaces));
      } else {
        const local = localStorage.getItem('geoclass_saved_workspaces_v1');
        if (local) setSavedWorkspaces(JSON.parse(local));
      }
    } catch {
      const local = localStorage.getItem('geoclass_saved_workspaces_v1');
      if (local) setSavedWorkspaces(JSON.parse(local));
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Global Escape key listener to close any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSaveModalOpen(false);
        setIsWorkspaceLibraryOpen(false);
        setIsStudyAreaModalOpen(false);
        setIsSTACModalOpen(false);
        setSingleClassPromptOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-save active analysis session so page refresh never loses analysis progress
  useEffect(() => {
    if (coords.length > 0 || tileUrls.trueColor || tileUrls.classified) {
      try {
        const activeSession = {
          coords,
          startDate,
          endDate,
          cloudCover,
          selectedSensor,
          activeLayer,
          tileUrls,
          statistics,
          totalAreaHa,
          aoiAreaHa,
          mapCenter,
          mapZoom,
          selectedLocation,
          timestamp: Date.now()
        };
        localStorage.setItem('geoclass_active_session_state', JSON.stringify(activeSession));
      } catch (err) {
        console.warn('Auto-save error', err);
      }
    }
  }, [coords, startDate, endDate, cloudCover, selectedSensor, activeLayer, tileUrls, statistics, totalAreaHa, aoiAreaHa, mapCenter, mapZoom, selectedLocation]);

  // Auto-restore active analysis session on page reload/refresh
  useEffect(() => {
    try {
      const saved = localStorage.getItem('geoclass_active_session_state');
      if (saved) {
        const session = JSON.parse(saved);
        if (session && session.coords && session.coords.length > 0) {
          setCoords(session.coords);
          if (session.startDate) setStartDate(session.startDate);
          if (session.endDate) setEndDate(session.endDate);
          if (session.cloudCover !== undefined) setCloudCover(session.cloudCover);
          if (session.selectedSensor) setSelectedSensor(session.selectedSensor);
          if (session.activeLayer) setActiveLayer(session.activeLayer);
          if (session.tileUrls) setTileUrls(session.tileUrls);
          if (session.statistics) {
            setStatistics(session.statistics);
            setAnalyticsExpanded(true);
          }
          if (session.totalAreaHa !== undefined) setTotalAreaHa(session.totalAreaHa);
          if (session.aoiAreaHa !== undefined) setAoiAreaHa(session.aoiAreaHa);
          if (session.selectedLocation) setSelectedLocation(session.selectedLocation);
          if (session.mapCenter && Array.isArray(session.mapCenter)) {
            setMapCenter(session.mapCenter);
            setMapZoom(session.mapZoom || 12);
          }
          setDismissedInvite(true);
        }
      }
    } catch (err) {
      console.warn('Auto-restore error', err);
    }
  }, []);

  // Save current workspace state to Supabase / LocalStorage
  const handleSaveWorkspace = async (customName?: string) => {
    if (coords.length === 0 && !selectedLocation) {
      setErrorMessage("Please select or draw an Area of Interest before saving.");
      return;
    }

    setIsSavingWorkspace(true);
    setErrorMessage(null);

    const name = (customName || newWorkspaceName).trim() || 
      (selectedLocation?.label ? selectedLocation.label.split(',')[0] : `AOI Project (${new Date().toLocaleDateString()})`);

    const payload = {
      userId: user?.id || null,
      name,
      description: `${aoiAreaHa ? aoiAreaHa.toFixed(1) + ' ha' : 'AOI'} · ${startDate} to ${endDate} · ${selectedSensor}`,
      aoi_geojson: {
        type: 'Polygon',
        coordinates: coords
      },
      layer_state: {
        startDate,
        endDate,
        cloudCover,
        selectedSensor,
        activeLayer,
        tileUrls,
        statistics,
        totalAreaHa,
        mapCenter,
        mapZoom,
        aoiAreaHa,
        selectedLocation
      }
    };

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.workspace) {
        setSavedWorkspaces(prev => [data.workspace, ...prev.filter(w => w.id !== data.workspace.id)]);
        setSuccessMessage(`Analysis state "${name}" saved to Supabase!`);
      } else {
        const localWs = { ...payload, id: `local-${Date.now()}`, updated_at: new Date().toISOString() };
        setSavedWorkspaces(prev => [localWs, ...prev]);
        setSuccessMessage(`Analysis state "${name}" saved to local cache.`);
      }
      setSaveModalOpen(false);
      setNewWorkspaceName('');
    } catch (err: any) {
      const localWs = { ...payload, id: `local-${Date.now()}`, updated_at: new Date().toISOString() };
      setSavedWorkspaces(prev => [localWs, ...prev]);
      setSuccessMessage(`Analysis state "${name}" saved to local cache.`);
      setSaveModalOpen(false);
      setNewWorkspaceName('');
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  // Restore saved workspace
  const handleRestoreWorkspace = (ws: any) => {
    try {
      if (ws.aoi_geojson?.coordinates && ws.aoi_geojson.coordinates.length > 0) {
        setCoords(ws.aoi_geojson.coordinates);
      }
      if (ws.layer_state) {
        const ls = ws.layer_state;
        if (ls.startDate) setStartDate(ls.startDate);
        if (ls.endDate) setEndDate(ls.endDate);
        if (ls.cloudCover !== undefined) setCloudCover(ls.cloudCover);
        if (ls.selectedSensor) setSelectedSensor(ls.selectedSensor);
        if (ls.activeLayer) setActiveLayer(ls.activeLayer);
        if (ls.tileUrls) setTileUrls(ls.tileUrls);
        if (ls.statistics) {
          setStatistics(ls.statistics);
          setAnalyticsExpanded(true);
        }
        if (ls.totalAreaHa !== undefined) setTotalAreaHa(ls.totalAreaHa);
        if (ls.aoiAreaHa !== undefined) setAoiAreaHa(ls.aoiAreaHa);
        if (ls.selectedLocation) setSelectedLocation(ls.selectedLocation);
        if (ls.mapCenter && Array.isArray(ls.mapCenter)) {
          setMapCenter(ls.mapCenter);
          setMapZoom(ls.mapZoom || 12);
        }
      }
      setDismissedInvite(true);
      setIsWorkspaceLibraryOpen(false);
      setSuccessMessage(`Restored analysis "${ws.name}" on the map.`);
    } catch (err: any) {
      setErrorMessage(`Failed to restore workspace: ${err.message}`);
    }
  };

  // Delete saved workspace
  const handleDeleteWorkspace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/workspaces?id=${id}`, { method: 'DELETE' });
      setSavedWorkspaces(prev => prev.filter(w => w.id !== id));
      setSuccessMessage("Analysis workspace removed.");
    } catch {
      setSavedWorkspaces(prev => prev.filter(w => w.id !== id));
    }
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
        const tcUrl = data.true_color_url || data.true_color_tile_url;
        const fcUrl = data.false_color_url || data.false_color_tile_url;
        const ndviUrl = data.ndvi_url || data.ndvi_tile_url;

        setTileUrls(prev => ({
          ...prev,
          landsatTrueColor: tcUrl,
          landsatFalseColor: fcUrl,
          landsatNdvi: ndviUrl,
          trueColor: tcUrl,
          falseColor: fcUrl,
          ndvi: ndviUrl
        }));
        setActiveLayer('true_color');
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
        setProcessingTime(parseFloat(elapsed));
        setSuccessMessage(`Landsat 8/9 composite generated in ${elapsed}s (30m GSD).`);
        setPhase3Open(true);
        setLeftRailCollapsed(false);
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
      setPhase3Open(true);
      setLeftRailCollapsed(false);
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
        
        // Auto-collapse sidebars and toolstrip so map and results take center stage
        setLeftRailCollapsed(true);
        setRightRailCollapsed(true);
        setToolstripCollapsed(true);
        setAnalyticsExpanded(true);
        
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
        
        // Auto-collapse sidebars and toolstrip so map and results take center stage
        setLeftRailCollapsed(true);
        setRightRailCollapsed(true);
        setToolstripCollapsed(true);
        setAnalyticsExpanded(true);
        
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
      const rawMsg = e.message || "An error occurred during classification.";
      const lower = rawMsg.toLowerCase();
      if (lower.includes("only one class") || lower.includes("single land cover class") || lower.includes("homogeneous")) {
        setSingleClassPromptOpen(true);
        setErrorMessage("Single land cover class detected: Expand your Area of Interest to include diverse landscape features.");
      } else {
        setErrorMessage(rawMsg);
      }
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

    if (downloadFormat === 'ipynb') {
      try {
        const notebookJson = generateJupyterNotebook({
          title: selectedLocation?.label ? `Study Area: ${selectedLocation.label.split(',')[0]}` : `GeoClass Analysis ${startDate}`,
          coords,
          aoiAreaHa,
          startDate,
          endDate,
          cloudCover,
          selectedSensor,
          statistics,
          mapCenter,
          mapZoom
        });
        const blob = new Blob([notebookJson], { type: 'application/x-ipynb+json' });
        const filename = `geoclass-study-area-${startDate}-to-${endDate}.ipynb`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSuccessMessage("Jupyter Notebook (.ipynb) exported! Open in JupyterLab, Google Colab, or VS Code.");
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to generate Jupyter Notebook.");
      }
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
      sub: 'Sentinel-2 (10m)',
      thumbnail: '/layer-thumbnails/true_color.png',
      hasUrl: !!(tileUrls.trueColor || tileUrls.baselineTrueColor),
    },
    {
      key: 'false_color' as const,
      label: 'False color',
      sub: 'NIR composite',
      thumbnail: '/layer-thumbnails/false_color.png',
      hasUrl: !!(tileUrls.falseColor || tileUrls.baselineFalseColor),
    },
    {
      key: 'ndvi' as const,
      label: 'Vegetation',
      sub: 'NDVI index',
      thumbnail: '/layer-thumbnails/vegetation.png',
      hasUrl: !!(tileUrls.ndvi || tileUrls.baselineNdvi),
    },
    {
      key: 'classified' as const,
      label: 'Land cover',
      sub: 'Classified output',
      thumbnail: '/layer-thumbnails/land_cover.png',
      hasUrl: !!(tileUrls.classified || tileUrls.baselineClassified),
    },
    {
      key: 'slope' as const,
      label: 'Slope stability',
      sub: 'SRTM derived (°)',
      thumbnail: '/layer-thumbnails/slope_stability.png',
      hasUrl: !!tileUrls.slope,
    },
    {
      key: 'elevation' as const,
      label: 'Digital elevation',
      sub: 'Copernicus 30m DEM',
      thumbnail: '/layer-thumbnails/digital_elevation.png',
      hasUrl: !!tileUrls.elevation,
    },
    {
      key: 'hillshade' as const,
      label: 'Terrain hillshade',
      sub: '30m shaded relief',
      thumbnail: '/layer-thumbnails/terrain_hillshade.png',
      hasUrl: !!tileUrls.hillshade,
    },
    {
      key: 'ndbi' as const,
      label: 'Built-up (NDBI)',
      sub: 'Urban index',
      thumbnail: '/layer-thumbnails/built_up.png',
      hasUrl: !!tileUrls.ndbi,
    },
    {
      key: 'mndwi' as const,
      label: 'Water (MNDWI)',
      sub: 'Water features',
      thumbnail: '/layer-thumbnails/water.png',
      hasUrl: !!tileUrls.mndwi,
    },
    {
      key: 'nbr' as const,
      label: 'Burn ratio (NBR)',
      sub: 'Burn severity',
      thumbnail: '/layer-thumbnails/burn_ratio.png',
      hasUrl: !!tileUrls.nbr,
    },
    {
      key: 'sar' as const,
      label: 'SAR Radar (C-band)',
      sub: 'Cloud penetrating (VV/VH)',
      thumbnail: '/layer-thumbnails/sar_radar.png',
      hasUrl: !!tileUrls.sar,
    },
    {
      key: 'landsat_true_color' as const,
      label: 'Landsat 8/9 RGB',
      sub: '8/9 OLI/TIRS',
      thumbnail: '/layer-thumbnails/landsat_rgb.png',
      hasUrl: !!tileUrls.landsatTrueColor,
    },
  ];

  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    none: true,
    true_color: true,
    false_color: true,
    ndvi: true,
    classified: true,
    slope: true,
    elevation: true,
    hillshade: true,
    ndbi: false,
    mndwi: true,
    nbr: true,
    sar: true,
    landsat_true_color: true,
  });

  const handleToggleLayer = useCallback((key: string) => {
    if (key === 'none' || key === 'base_map') {
      setLayerVisibility((prev) => {
        const next = !prev.none;
        if (next) setActiveLayer('none');
        return { ...prev, none: next };
      });
      return;
    }

    setLayerVisibility((prev) => {
      const next = !prev[key];
      if (next) {
        setActiveLayer(key as any);
      } else if (activeLayer === key) {
        setActiveLayer('none');
      }
      return { ...prev, [key]: next };
    });
  }, [activeLayer]);

  useEffect(() => {
    if (activeLayer && activeLayer !== 'none') {
      setLayerVisibility((prev) => ({ ...prev, [activeLayer]: true }));
    }
  }, [activeLayer]);

  const readyLayersCount = layerStack.filter(l => l.hasUrl).length;

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0D1316] text-[#FFFFFF] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#1F2A30] border-t-[#B7E89F] animate-spin" />
        <div className="text-xs font-mono tracking-widest text-[#B7E89F] uppercase">Authenticating Geospatial Node...</div>
      </div>
    );
  }

  return (
    <div className="geo-app">
      
      {/* ---------- Top bar ---------- */}
      {/* ---------- Top bar ---------- */}
      <header className="topbar bg-[#FAF9F5] border-b border-[#D8D5CA] px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer group" title="Return to Overview">
              <svg width="24" height="20" viewBox="0 0 28 22" fill="none" className="flex-shrink-0">
                <path d="M14 2L2 19H26L14 2Z" stroke="#2D4A34" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M8 14L14 7L20 14" stroke="#2D4A34" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 19C8 16 10.5 16 14 19C17.5 16 20 16 23 19" stroke="#2D4A34" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-sans text-[18px] font-bold tracking-[-0.02em] text-[#1A1D23]">
                GeoClass
              </span>
              <span className="hidden xl:inline-block text-xs font-mono uppercase tracking-[0.1em] text-[#69706A] border-l border-[#D8D5CA] pl-3 ml-2 group-hover:text-[#1A1D23] transition">
                Earth Observation
              </span>
            </Link>
          </div>
        </div>

        {/* Center Understated Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium" aria-label="Main Navigation">
          <button 
            type="button"
            onClick={() => { setLeftRailCollapsed(false); setPhase1Open(true); }}
            className="pb-1 border-b-2 border-[#D9622B] text-[#D9622B] font-semibold cursor-pointer transition"
          >
            Projects
          </button>
          <button 
            type="button"
            onClick={() => { setLeftRailCollapsed(false); setPhase2Open(true); }}
            className="pb-1 border-b-2 border-transparent text-[#454B46] hover:text-[#1A1D23] cursor-pointer transition"
          >
            Imagery
          </button>
          <button 
            type="button"
            onClick={() => { setLeftRailCollapsed(false); setPhase3Open(true); }}
            className="pb-1 border-b-2 border-transparent text-[#454B46] hover:text-[#1A1D23] cursor-pointer transition"
          >
            Classification
          </button>
          <button 
            type="button"
            onClick={() => { setAnalyticsExpanded(true); }}
            className="pb-1 border-b-2 border-transparent text-[#454B46] hover:text-[#1A1D23] cursor-pointer transition"
          >
            Analytics
          </button>
        </nav>

        {/* Right Header Controls matching Mockup */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-[#69706A] hover:text-[#1A1D23] transition cursor-pointer p-1"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            className="text-[#69706A] hover:text-[#1A1D23] transition cursor-pointer p-1 relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 pl-2 cursor-pointer select-none group"
            >
              <div className="w-7 h-7 rounded-full bg-[#2D4A34] text-[#B7E89F] border border-[#306840] flex items-center justify-center text-[11px] font-bold">
                {user?.fullName 
                  ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                  : 'NI'}
              </div>
              <span className="text-xs font-semibold text-[#1A1D23] hidden md:inline">
                {user?.fullName || 'Nelson Izah'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#69706A] transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#FAF9F5] border border-[#D8D5CA] rounded-[6px] shadow-xl p-3 space-y-2 z-50 text-xs">
                <div className="border-b border-[#E3E0D5] pb-2">
                  <div className="font-semibold text-[#1A1D23]">{user?.fullName || 'Analyst'}</div>
                  <div className="text-[11px] text-[#676E7D] truncate">{user?.email || 'analyst@organization.org'}</div>
                  <div className="inline-block mt-1.5 font-mono text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E4E9DF] text-[#2D4A34] font-medium">
                    {user?.role?.replace(/_/g, ' ') || 'Remote Sensing Analyst'}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      router.push('/login');
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-xs font-medium text-[#A84E42] hover:bg-[#FCECE4] transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out / Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------- Scientific Workstation Telemetry & Summary Bar ---------- */}
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
              <div className="font-mono text-[#1A1D23] font-medium">
                {calculateAOIArea(coords).toFixed(1)} ha
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
            <div className="font-mono text-[#1A1D23] font-medium">{readyLayersCount > 0 ? readyLayersCount : 6} / {layerStack.length}</div>
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
            onClick={() => setIsStudyAreaModalOpen(true)}
            className="px-2 sm:px-2.5 py-1 rounded border border-[#D8D5CA] bg-[#FAF9F5] hover:bg-[#F4F1E8] text-[#1A1D23] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium shadow-2xs"
            title="Generate Publication-Ready Study Area Map"
          >
            <Compass className="w-3.5 h-3.5 text-[#D9622B]" />
            <span className="hidden sm:inline">Study Map</span>
          </button>

          {/* Save Analysis State */}
          <button 
            type="button"
            onClick={() => setSaveModalOpen(true)}
            disabled={coords.length === 0}
            className={`px-2 sm:px-2.5 py-1 rounded border transition cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
              coords.length > 0 
                ? 'bg-[#FAF9F5] text-[#1A1D23] border-[#D8D5CA] hover:bg-[#F4F1E8] shadow-2xs' 
                : 'text-[#8A908A] border-[#E5E5E0] cursor-not-allowed opacity-60'
            }`}
            title={coords.length > 0 ? "Save Current Analysis State to Supabase" : "Select an AOI to save analysis"}
          >
            <Save className="w-3.5 h-3.5 text-[#D9622B]" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Saved Analyses Library */}
          <button 
            type="button"
            onClick={() => setIsWorkspaceLibraryOpen(true)}
            className="px-2 sm:px-2.5 py-1 rounded border border-[#D8D5CA] bg-transparent text-[#69706A] hover:text-[#1A1D23] hover:bg-[#F4F1E8] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Open Saved Analyses Library"
          >
            <Folder className="w-3.5 h-3.5 text-[#69706A]" />
            <span className="hidden md:inline">Saved ({savedWorkspaces.length})</span>
          </button>

          <button 
            type="button"
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="p-1 hover:bg-[#F4F1E8] rounded text-[#69706A] hover:text-[#1A1D23] transition cursor-pointer"
            title="Toggle Analytics Drawer"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={() => setRightRailCollapsed(!rightRailCollapsed)}
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
        </div>
      </div>

      {/* ---------- Main grid ---------- */}
      <div className={`main-grid ${leftRailCollapsed ? 'left-collapsed' : ''} ${rightRailCollapsed ? 'right-collapsed' : ''}`}>
        
        {/* ---------- Left rail (Workflow & Pipeline) matching Mockup ---------- */}
        <aside className={`rail rail-left ${leftRailCollapsed ? 'collapsed' : ''} bg-[#FAF9F5] border-r border-[#D8D5CA] overflow-y-auto`} aria-label="Workflow controls">
          {/* Left Rail Header */}
          <div className="rail-header bg-[#FAF9F5] border-b border-[#D8D5CA]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1D23]">
              <Target className="w-4 h-4 text-[#D9622B]" />
              <span>Workflow &amp; Pipeline</span>
            </div>
            <button
              type="button"
              onClick={() => setLeftRailCollapsed(true)}
              className="p-1 rounded text-[#69706A] hover:text-[#1A1D23] hover:bg-[#F4F1E8] transition cursor-pointer"
              title="Collapse workflow panel"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 space-y-4">

            {/* Notification messages */}
            {(errorMessage || successMessage) && (
              <div className="space-y-2">
                {errorMessage && <Notification type="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />}
                {successMessage && <Notification type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
              </div>
            )}

            {/* Section 1: Area of Interest */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#1A1D23]" />
                  <span className="text-[13px] font-bold text-[#1A1D23] tracking-tight">Area of Interest</span>
                </div>
              </div>

              {/* Location search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8A908A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  placeholder="Search place, region, coordinates..."
                  className="w-full pl-8.5 pr-8 py-1.5 bg-[#FAF9F5] border border-[#D8D5CA] rounded-lg text-xs text-[#1A1D23] placeholder:text-[#8A908A] focus:outline-none focus:border-[#D9622B] shadow-2xs transition"
                  aria-label="Search geographic location"
                />
                {locationLoading && (
                  <Loader2 className="w-3.5 h-3.5 text-[#D9622B] animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}

                {/* Autocomplete dropdown suggestions */}
                {locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#FAF9F5] border border-[#D8D5CA] rounded-lg shadow-md overflow-hidden text-xs">
                    {locationSuggestions.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => selectLocation(sug)}
                        className="w-full text-left px-3 py-2 hover:bg-[#F4F1E8] text-[#1A1D23] border-b border-[#D8D5CA]/60 last:border-0 flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="truncate pr-2 font-medium">{sug.label}</span>
                        <span className="text-[10px] mono text-[#69706A] shrink-0">
                          {sug.type || 'region'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active AOI Summary Card - Only displayed when AOI is set */}
              {(coords.length > 0 || selectedLocation) && (
                <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl p-3 flex items-start justify-between shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#D9622B] flex items-center justify-center text-white flex-shrink-0 shadow-none mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="2 12 12 17 22 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1A1D23]">
                        {selectedLocation?.label ? selectedLocation.label.split(',')[0] : `${calculateAOIArea(coords).toFixed(1)} ha Active AOI`}
                      </div>
                      <div className="text-[10.5px] font-mono text-[#69706A] mt-0.5">
                        {coords.length > 0 
                          ? `${coords[0][0].toFixed(4)}° N, ${coords[0][1].toFixed(4)}° E` 
                          : `${selectedLocation?.lat.toFixed(4)}° N, ${selectedLocation?.lng.toFixed(4)}° E`}
                      </div>
                      {selectedLocation?.label && (
                        <div className="text-[10.5px] text-[#8A908A] mt-0.5">
                          {selectedLocation.label.split(',').slice(1).join(',').trim()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {coords.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAOI}
                        className="text-[#8A908A] hover:text-[#A84E42] p-1 transition cursor-pointer"
                        title="Clear AOI"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={saveCurrentArea}
                      className="text-[#8A908A] hover:text-[#1A1D23] p-1 transition cursor-pointer"
                      title="AOI Actions"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Vector File Ingestion (GeoJSON, KML, KMZ, Shapefile .zip, GPX) */}
              <label className={`flex flex-col items-center justify-center w-full py-2 px-3 border border-dashed border-[#D8D5CA] hover:border-[#D9622B] rounded-lg bg-[#FAF9F5] hover:bg-[#F4F1E8] text-[#454B46] hover:text-[#1A1D23] transition cursor-pointer ${isImportingVector ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-2">
                  {isImportingVector ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#D9622B] animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#D9622B]" />
                  )}
                  <span className="text-[11.5px] font-medium">
                    {isImportingVector ? 'Parsing Vector File...' : 'Import AOI Vector Boundary'}
                  </span>
                </div>
                <span className="text-[9.5px] text-[#8A908A] font-mono mt-0.5">
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

              {/* Saved Analyses & Projects Quick Launcher */}
              <button
                type="button"
                onClick={() => setIsWorkspaceLibraryOpen(true)}
                className="w-full py-1.5 px-3 border border-[#D8D5CA] hover:border-[#D9622B] rounded-lg bg-[#FAF9F5] hover:bg-[#F4F1E8] text-[#454B46] hover:text-[#1A1D23] transition flex items-center justify-between text-xs font-medium cursor-pointer"
                title="Open Saved Workspace Library"
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-[#D9622B]" />
                  <span>Saved Projects & Analyses</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#EAE8E1] text-[#454B46] rounded-full">
                  {savedWorkspaces.length}
                </span>
              </button>
            </div>

            {/* Section 2: Satellite Imagery */}
            <div className="space-y-2.5 pt-3 border-t border-[#EFECE3]">
              <div 
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setPhase2Open(!phase2Open)}
              >
                <div className="flex items-center gap-2">
                  <Satellite className="w-4 h-4 text-[#1A1D23]" />
                  <span className="text-[13px] font-bold text-[#1A1D23] tracking-tight">Satellite Imagery</span>
                  {tileUrls.trueColor && <span className="text-[9px] px-1.5 py-0.5 bg-[#EAF3EB] text-[#3B7A46] font-mono font-semibold rounded">READY</span>}
                </div>
                <span className="text-[#69706A]">
                  {phase2Open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                    <div className="space-y-2.5 pt-1">
                      {/* Sensor Constellation */}
                      <div>
                        <label className="block text-[11px] font-medium text-[#69706A] mb-1">Sensor constellation</label>
                        <select
                          value={selectedSensor}
                          onChange={(e) => setSelectedSensor(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-[#D8D5CA] rounded-lg text-xs text-[#1A1D23] font-medium focus:outline-none focus:border-[#D9622B] shadow-2xs cursor-pointer"
                        >
                          <option value="sentinel_2">Sentinel-2 (10m, Optical)</option>
                          <option value="landsat">Landsat 8/9 (30m, Optical)</option>
                        </select>
                      </div>

                      {/* STAC Catalog Button Card */}
                      <div
                        onClick={() => setIsSTACModalOpen(true)}
                        className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#F4F1E8] transition shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Box className="w-4 h-4 text-[#69706A] flex-shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-[#1A1D23]">Browse STAC Catalog</div>
                            <div className="text-[10px] text-[#69706A]">Sentinel-2 · Copernicus</div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#8A908A]" />
                      </div>

                      {/* Date Range Inputs matching mockup */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-medium text-[#69706A] mb-1">Start date</label>
                          <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-lg px-2 py-1.5 text-xs text-[#1A1D23] shadow-2xs focus-within:border-[#D9622B] transition-colors">
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => updateTargetStartDate(e.target.value)}
                              className="bg-transparent text-xs w-full focus:outline-none font-mono text-[#1A1D23] cursor-pointer"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-medium text-[#69706A] mb-1">End date</label>
                          <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-lg px-2 py-1.5 text-xs text-[#1A1D23] shadow-2xs focus-within:border-[#D9622B] transition-colors">
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="bg-transparent text-xs w-full focus:outline-none font-mono text-[#1A1D23] cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Cloud Cover Slider */}
                      <div>
                        <div className="flex justify-between text-[11px] font-medium text-[#69706A] mb-1">
                          <span>Cloud cover (max)</span>
                          <span className="font-mono text-[#1A1D23] font-semibold">{cloudCover}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={cloudCover}
                          onChange={(e) => setCloudCover(parseInt(e.target.value))}
                          className="w-full accent-[#D9622B] h-1.5 bg-[#D8D5CA] rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Temporal comparison toggle */}
                      <div className="flex items-center justify-between text-xs text-[#454B46] py-0.5">
                        <span className="text-[11px] font-medium text-[#69706A]">Temporal comparison</span>
                        <div
                          onClick={() => setCompareMode(!compareMode)}
                          className={`w-8 h-4.5 rounded-full p-0.5 cursor-pointer transition ${compareMode ? 'bg-[#D9622B]' : 'bg-[#D8D5CA]'}`}
                        >
                          <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transform transition ${compareMode ? 'translate-x-3.5' : 'translate-x-0'}`} />
                        </div>
                      </div>

                      {compareMode && (
                        <div className="pt-2 border-t border-[#EFECE3] space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-[#69706A] mb-1">Baseline start</label>
                              <input
                                type="date"
                                value={compareStartDate}
                                onChange={(e) => updateBaselineStartDate(e.target.value)}
                                className="w-full bg-[#FAF9F5] border border-[#D8D5CA] rounded-lg px-2 py-1 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#69706A] mb-1">Baseline end</label>
                              <input
                                type="date"
                                value={compareEndDate}
                                onChange={(e) => setCompareEndDate(e.target.value)}
                                className="w-full bg-[#FAF9F5] border border-[#D8D5CA] rounded-lg px-2 py-1 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Atmospheric & Cloud Screening Controls Accordion */}
                      <div className="pt-1 border-t border-[#EFECE3]">
                        <div 
                          className="flex items-center justify-between text-xs text-[#69706A] py-1 cursor-pointer select-none"
                          onClick={() => setShowAtmosphericConfig(!showAtmosphericConfig)}
                        >
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={showAtmosphericConfig}
                              onChange={() => {}}
                              className="accent-[#D9622B] rounded cursor-pointer pointer-events-none"
                            />
                            <span className="text-[11px] font-medium">Atmospheric & Cloud Controls</span>
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 text-[#69706A] transition-transform ${showAtmosphericConfig ? 'rotate-180' : ''}`} />
                        </div>

                        {showAtmosphericConfig && (
                          <div className="mt-2 p-2.5 bg-[#F4F1E8] border border-[#D8D5CA] rounded-lg space-y-2 text-xs">
                            <div>
                              <label className="block text-[10px] text-[#69706A] mb-1 font-medium">Cloud Mask Algorithm</label>
                              <select
                                value={cloudMaskType}
                                onChange={(e) => setCloudMaskType(e.target.value as any)}
                                className="w-full px-2 py-1 bg-[#FAF9F5] border border-[#D8D5CA] rounded text-xs"
                              >
                                <option value="both">Dual SCL + QA60 (Strict Filtering)</option>
                                <option value="scl">Scene Classification (SCL Only)</option>
                                <option value="qa60">QA60 Cloud Bitmask Only</option>
                                <option value="none">Raw Radiance (Unmasked)</option>
                              </select>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] text-[#69706A]">Filter Cloud Shadows</span>
                              <input
                                type="checkbox"
                                checked={maskShadows}
                                onChange={(e) => setMaskShadows(e.target.checked)}
                                className="accent-[#D9622B] cursor-pointer"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Fetch Satellite Imagery CTA Button */}
                      <button
                        type="button"
                        onClick={fetchSatelliteImagery}
                        disabled={loadingMapId}
                        className="w-full mt-2 py-2 bg-[#FAF9F5] border border-[#D8D5CA] hover:bg-[#F4F1E8] text-[#1A1D23] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                      >
                        {loadingMapId ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9622B]" />
                            <span>Fetching satellite imagery...</span>
                          </>
                        ) : (
                          <>
                            <Layers className="w-4 h-4 text-[#D9622B]" />
                            <span>Fetch satellite imagery</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Section 3: Classification 03 */}
            <div className="space-y-2.5 pt-3 border-t border-[#EFECE3]">
              <div 
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setPhase3Open(!phase3Open)}
              >
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-[#1A1D23]" />
                  <span className="text-[13px] font-bold text-[#1A1D23] tracking-tight">Classification</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#EAE7DE] text-[10px] font-mono text-[#69706A] font-semibold">03</span>
                </div>
                <span className="text-[#69706A]">
                  {phase3Open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-[#69706A] mb-1">Model</label>
                        <select
                          value={modelType}
                          onChange={(e) => setModelType(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-[#D8D5CA] rounded-lg text-xs text-[#1A1D23] font-medium focus:outline-none focus:border-[#D9622B] shadow-2xs cursor-pointer"
                        >
                          <option value="deep_learning">Deep Learning Spatial U-Net (GeoAI)</option>
                          <option value="random_forest">Smile Random Forest (On-the-Fly)</option>
                          <option value="dynamic_world">Dynamic World (10m Near-RT Labels)</option>
                        </select>
                      </div>

                      {/* Hyperparameters Toggle */}
                      <div>
                        <div 
                          className="flex items-center justify-between text-xs text-[#69706A] py-1 cursor-pointer select-none border-t border-[#EFECE3]"
                          onClick={() => setShowConfig(!showConfig)}
                        >
                          <span className="text-[11px] font-medium">Hyperparameters</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-[#69706A] transition-transform ${showConfig ? 'rotate-180' : ''}`} />
                        </div>

                        {showConfig && (
                          <div className="p-2.5 bg-[#F4F1E8] border border-[#D8D5CA] rounded-lg space-y-2 text-xs">
                            <div>
                              <div className="flex justify-between text-[11px] text-[#69706A] mb-1">
                                <span>Decision trees</span>
                                <span className="font-mono text-[#1A1D23] font-semibold">{numTrees}</span>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="250"
                                step="10"
                                value={numTrees}
                                onChange={(e) => setNumTrees(parseInt(e.target.value))}
                                className="w-full accent-[#D9622B] h-1.5 bg-[#D8D5CA] rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-[11px] text-[#69706A] mb-1">
                                <span>Samples per class</span>
                                <span className="font-mono text-[#1A1D23] font-semibold">{samplePoints} px</span>
                              </div>
                              <input
                                type="range"
                                min="50"
                                max="500"
                                step="25"
                                value={samplePoints}
                                onChange={(e) => setSamplePoints(parseInt(e.target.value))}
                                className="w-full accent-[#D9622B] h-1.5 bg-[#D8D5CA] rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sentinel-1 SAR Fusion Card matching mockup */}
                      <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-lg p-2.5 flex items-start gap-2.5 shadow-2xs">
                        <Layers className="w-4 h-4 text-[#69706A] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1A1D23]">Sentinel-1 & SAR Fusion</span>
                            <input
                              type="checkbox"
                              checked={useSarFusion}
                              onChange={(e) => setUseSarFusion(e.target.checked)}
                              className="accent-[#D9622B] rounded cursor-pointer"
                            />
                          </div>
                          <div className="text-[10px] text-[#69706A] mt-0.5">Fuse S1 + S2. 10m resolution. Custom bands.</div>
                        </div>
                      </div>

                      {/* Classification CTA button */}
                      <button
                        type="button"
                        onClick={runClassification}
                        disabled={loadingClassify}
                        className="w-full mt-2 py-2 bg-[#FAF9F5] border border-[#D8D5CA] hover:bg-[#F4F1E8] text-[#1A1D23] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                      >
                        {loadingClassify ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9622B]" />
                            <span>Classifying satellite imagery...</span>
                          </>
                        ) : (
                          <>
                            <span>Analyze & Classify Land Cover</span>
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

            {(tileUrls.trueColor || tileUrls.landsatTrueColor) && !tileUrls.classified && !loadingClassify && (
              <div className="status-item !border-r-0 ml-auto">
                <button
                  type="button"
                  onClick={runClassification}
                  className="px-3 py-1 bg-[#306840] hover:bg-[#265433] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                  title="Run land cover classification and analysis on fetched imagery"
                >
                  <span>Analyze & Classify AOI</span>
                </button>
              </div>
            )}
          </div>

          {/* Map canvas */}
          <div className="map-canvas">
            
            {/* Top-Left Floating Controls: Workflow and Tools restore pills */}
            <div 
              className="absolute top-3 z-[1001] flex items-center gap-2 pointer-events-auto transition-all"
              style={{ left: !toolstripCollapsed ? '48px' : '12px' }}
            >
              {leftRailCollapsed && (
                <button
                  type="button"
                  onClick={() => setLeftRailCollapsed(false)}
                  className="px-2.5 py-1.5 bg-[#1A1D17]/95 hover:bg-[#22261E] border border-[#2E3429] text-[#E0DCD3] rounded-md shadow-lg backdrop-blur-md transition flex items-center gap-1.5 text-xs font-medium cursor-pointer group"
                  title="Expand Workflow Sidebar"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5 text-[#306840] group-hover:text-[#4B6445]" />
                  <span>Workflow</span>
                </button>
              )}
              {toolstripCollapsed && (
                <button
                  type="button"
                  onClick={() => setToolstripCollapsed(false)}
                  className="px-2.5 py-1.5 bg-[#1A1D17]/95 hover:bg-[#22261E] border border-[#2E3429] text-[#E0DCD3] rounded-md shadow-lg backdrop-blur-md transition flex items-center gap-1.5 text-xs font-medium cursor-pointer group"
                  title="Expand Drawing & Analysis Tools"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#306840] group-hover:text-[#4B6445]" />
                  <span>Tools</span>
                  <ChevronRight className="w-3 h-3 text-[#9A97A4]" />
                </button>
              )}
            </div>

            {/* Top-Right Floating Controls: Layers restore pill */}
            {rightRailCollapsed && (
              <button
                type="button"
                onClick={() => setRightRailCollapsed(false)}
                className="absolute top-3.5 right-3.5 z-[1005] px-3 py-1.5 bg-[#FAF9F5]/95 hover:bg-[#F4F1E8] border border-[#D8D5CA] text-[#1A1D23] rounded-lg shadow-md backdrop-blur-md transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer group hover:border-[#BCB8AA]"
                title="Expand Layers & Tools"
              >
                <Layers className="w-4 h-4 text-[#D9622B]" />
                <span>Layers & Tools</span>
                <ChevronLeft className="w-3.5 h-3.5 text-[#69706A] group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Right Edge Pull-Tab to restore Layers & Tools */}
            {rightRailCollapsed && (
              <button
                type="button"
                onClick={() => setRightRailCollapsed(false)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-[1005] bg-[#FAF9F5] hover:bg-[#F4F1E8] border-l border-t border-b border-[#D8D5CA] rounded-l-lg py-3.5 px-1.5 shadow-md flex flex-col items-center gap-2 cursor-pointer transition-all hover:pr-2.5 text-[#1A1D23] group hover:border-[#BCB8AA]"
                title="Open Layers & Tools"
              >
                <ChevronLeft className="w-4 h-4 text-[#D9622B] group-hover:-translate-x-0.5 transition-transform" />
                <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-semibold tracking-wider text-[#69706A] group-hover:text-[#1A1D23] uppercase select-none">
                  Layers & Tools
                </span>
              </button>
            )}

            {/* Custom Horizontal Toolstrip */}
            {!toolstripCollapsed && (
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
            )}

            {/* AOI Guidance Empty State */}
            {coords.length === 0 && !dismissedInvite && !selectedLocation && !locationQuery.trim() && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-[#FAF9F5]/95 backdrop-blur-md border border-[#D8D5CA] rounded-xl px-4 py-3 shadow-md max-w-md w-[90vw] text-[#1A1D23]">
                <button
                  type="button"
                  onClick={() => setDismissedInvite(true)}
                  className="absolute top-2.5 right-2.5 text-[#8A908A] hover:text-[#1A1D23] p-1 transition cursor-pointer"
                  title="Dismiss guide"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="text-xs font-bold text-[#1A1D23] flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#D9622B]"></span>
                  Define Area of Interest
                </div>
                <div className="text-xs text-[#69706A] leading-relaxed">
                  Use the rectangle or polygon tools on the floating toolbar to draw your boundary for satellite ingestion and classification.
                </div>
              </div>
            )}

            {/* Unified Neatline Telemetry Footer Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-[#FAF9F5]/95 backdrop-blur-md border-t border-[#D8D5CA] px-3.5 py-1.5 flex items-center justify-between text-xs text-[#69706A] select-none shadow-xs">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#8A908A] font-semibold text-[11px] uppercase tracking-wider">LAT</span>
                  <span className="text-[#1A1D23] font-mono font-medium text-[11.5px]">{mapCenter[0].toFixed(5)}°</span>
                  <span className="text-[#8A908A] font-semibold text-[11px] uppercase tracking-wider ml-1">LNG</span>
                  <span className="text-[#1A1D23] font-mono font-medium text-[11.5px]">{mapCenter[1].toFixed(5)}°</span>
                </div>
                <span className="text-[#D8D5CA]">|</span>
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-[#8A908A]">GSD:</span>
                  <span className="text-[#1A1D23] font-mono">10m / px</span>
                </div>
                <span className="text-[#D8D5CA] hidden md:inline">|</span>
                <div className="hidden md:flex items-center gap-1">
                  <span className="text-[#8A908A]">Sensor:</span>
                  <span className="text-[#1A1D23] font-medium">Sentinel-2 MSI</span>
                </div>
                <span className="text-[#D8D5CA] hidden md:inline">|</span>
                <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-[#8A908A] font-sans">Cursor:</span>
                  {cursorCoords ? (
                    <>
                      <span className="text-[#4B8055] font-medium">Lat</span>
                      <span className="text-[#1A1D23]">{cursorCoords.lat.toFixed(6)}°</span>
                      <span className="text-[#4B8055] font-medium ml-1">Lng</span>
                      <span className="text-[#1A1D23]">{cursorCoords.lng.toFixed(6)}°</span>
                    </>
                  ) : (
                    <span className="text-[#8A908A] italic font-sans text-[11px]">Move cursor over map</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {aoiAreaHa ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4B8055]"></span>
                    <span className="text-[#1A1D23] font-medium font-mono">{aoiAreaHa.toFixed(1)} ha AOI</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[#8A908A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D8D5CA]"></span>
                    <span>No AOI</span>
                  </div>
                )}
                <span className="text-[#D8D5CA] hidden lg:inline">|</span>
                <div className="text-[10px] text-[#8A908A] hidden lg:block tracking-wide">
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

          {/* ---------- Map Status Bar (IBM Plex Mono) ---------- */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-[#FAF9F5] border-t border-b border-[#D8D5CA] text-[11px] font-mono text-[#454B46] select-none z-20">
            <div className="flex items-center gap-3 overflow-x-auto">
              <span className="font-semibold text-[#1A1D23]">{selectedSensor === 'sentinel_2' ? 'Sentinel-2' : 'Landsat 8/9'}</span>
              <span className="text-[#8A908A]">·</span>
              <span>{selectedSensor === 'sentinel_2' ? '10m' : '30m'}</span>
              <span className="text-[#8A908A]">·</span>
              <span>{startDate} → {endDate}</span>
              <span className="text-[#8A908A]">·</span>
              <span>{cloudCover}% cloud</span>
              <span className="text-[#8A908A]">·</span>
              <span>{coords.length > 0 ? `${coords[0][1].toFixed(4)}° N · ${coords[0][0].toFixed(4)}° W` : '37.7749° N · 122.4194° W'}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[#69706A] flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>EPSG:4326</span>
            </div>
          </div>

          {/* Draggable Divider between Map Canvas and Analytics Report */}
          <div
            className={`analytics-resizer ${isDraggingAnalytics ? 'dragging' : ''}`}
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            onDoubleClick={() => setAnalyticsExpanded(prev => !prev)}
            title={analyticsExpanded ? "Drag down to close report, drag up to expand. Double-click to toggle." : "Drag up to open report. Double-click to expand."}
          >
            <div className="analytics-resizer-handle" />
            <div className="analytics-resizer-hint">
              <GripHorizontal className="w-3.5 h-3.5 text-[#8A908A]" />
            </div>
          </div>

          {/* ---------- Analytics area (Bottom) ---------- */}
          <div 
            className={`analytics ${analyticsExpanded ? 'expanded' : 'collapsed'} bg-[#FAF9F5]`}
            style={
              analyticsExpanded 
                ? { 
                    height: `${analyticsHeight}px`, 
                    maxHeight: '80vh',
                    transition: isDraggingAnalytics ? 'none' : undefined 
                  } 
                : { 
                    height: '44px', 
                    maxHeight: '44px',
                    transition: isDraggingAnalytics ? 'none' : undefined 
                  }
            }
          >
            <div className="analytics-head border-b border-[#D8D5CA] pb-2 mb-3">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAnalyticsTab('analysis');
                    if (!analyticsExpanded) setAnalyticsExpanded(true);
                  }}
                  className={`text-xs pb-1 cursor-pointer transition ${
                    activeAnalyticsTab === 'analysis'
                      ? 'font-semibold text-[#1A1D23] border-b-2 border-[#D9622B]'
                      : 'font-medium text-[#69706A] hover:text-[#1A1D23] border-b-2 border-transparent'
                  }`}
                >
                  Classification Analysis
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAnalyticsTab('statistics');
                    if (!analyticsExpanded) setAnalyticsExpanded(true);
                  }}
                  className={`text-xs pb-1 cursor-pointer transition ${
                    activeAnalyticsTab === 'statistics'
                      ? 'font-semibold text-[#1A1D23] border-b-2 border-[#D9622B]'
                      : 'font-medium text-[#69706A] hover:text-[#1A1D23] border-b-2 border-transparent'
                  }`}
                >
                  Statistics
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAnalyticsTab('metadata');
                    if (!analyticsExpanded) setAnalyticsExpanded(true);
                  }}
                  className={`text-xs pb-1 cursor-pointer transition ${
                    activeAnalyticsTab === 'metadata'
                      ? 'font-semibold text-[#1A1D23] border-b-2 border-[#D9622B]'
                      : 'font-medium text-[#69706A] hover:text-[#1A1D23] border-b-2 border-transparent'
                  }`}
                >
                  Metadata
                </button>
              </div>

              <div className="flex items-center gap-2">
                {statistics && (
                  <>
                    <button
                      type="button"
                      onClick={triggerPdfBriefing}
                      disabled={generatingPdf}
                      className="px-2.5 py-1 bg-transparent hover:bg-[#F4F1E8] border border-[#D8D5CA] text-[#1A1D23] rounded text-xs cursor-pointer flex items-center gap-1.5 transition"
                    >
                      {generatingPdf ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9622B]" />
                          <span>Generating Briefing...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-[#D9622B]" />
                          <span>Executive Briefing PDF</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={printReport}
                      className="px-2.5 py-1 bg-transparent hover:bg-[#F4F1E8] border border-[#D8D5CA] text-[#1A1D23] rounded text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#69706A]" /> Print report
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                  className="p-1 text-[#69706A] hover:text-[#1A1D23] transition cursor-pointer ml-2"
                  title={analyticsExpanded ? "Collapse Analysis" : "Expand Analysis"}
                >
                  {analyticsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {analyticsExpanded && (
              <div className="overflow-y-auto max-h-[calc(80vh-60px)] pr-1">
                {/* Tab 1: Classification Analysis */}
                {activeAnalyticsTab === 'analysis' && (
                  <>
                {/* Empty state if not classified yet */}
                {!statistics && (
                  <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded p-4 flex items-center gap-3 text-xs text-[#69706A]">
                    <div className="w-7 h-7 rounded bg-[#F4F1E8] border border-[#D8D5CA] flex items-center justify-center text-[#69706A] flex-shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span>Class breakdown and area totals appear here once a classification run finishes.</span>
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

            {/* Tab 2: Statistics */}
            {activeAnalyticsTab === 'statistics' && (
              <div className="space-y-5 pt-1">
                {(() => {
                  const totalArea = totalAreaHa || (statistics ? Object.values(statistics).reduce((sum, item) => sum + item.area_ha, 0) : (aoiAreaHa || 0));
                  const totalPixels = statistics ? Object.values(statistics).reduce((sum, item) => sum + item.pixel_count, 0) : 0;
                  const entries = statistics ? Object.entries(statistics) : [];
                  const dominantEntry = entries.length > 0 
                    ? entries.reduce((max, curr) => curr[1].area_ha > max[1].area_ha ? curr : max)
                    : null;
                  const dominantName = dominantEntry && dominantEntry[0] ? dominantEntry[0] : 'None';
                  const dominantPct = dominantEntry && dominantEntry[1] ? dominantEntry[1].percentage : 0;
                  
                  // Shannon-Wiener Diversity Index
                  const shannonDiversity = (statistics && totalArea > 0)
                    ? -Object.values(statistics).reduce((acc, curr) => {
                        const p = curr.area_ha / totalArea;
                        return p > 0 ? acc + p * Math.log(p) : acc;
                      }, 0)
                    : 0;

                  // Carbon stock estimate (IPCC Tier-1)
                  const carbonEstimate = statistics
                    ? ((statistics['Forest']?.area_ha || 0) * 120 + 
                       (statistics['Wetland']?.area_ha || 0) * 85 + 
                       (statistics['Grass']?.area_ha || 0) * 25 + 
                       (statistics['Shrub']?.area_ha || 0) * 35)
                    : 0;

                  return (
                    <>
                      {/* Top KPI Telemetry Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-3 rounded-lg shadow-2xs">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#69706A] block">Total Extent Area</span>
                          <div className="text-base font-bold text-[#1A1D23] mono mt-1">
                            {totalArea > 0 ? `${totalArea.toFixed(1)} ha` : '—'}
                          </div>
                          <div className="text-[10.5px] text-[#69706A] mt-0.5">
                            {totalArea > 0 ? `${(totalArea / 100).toFixed(2)} km² · ${(totalArea * 2.471).toFixed(0)} ac` : 'No AOI defined'}
                          </div>
                        </div>

                        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-3 rounded-lg shadow-2xs">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#69706A] block">Dominant Land Cover</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            {dominantName !== 'None' && (
                              <span 
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: LULC_COLORS[dominantName] || '#D9622B' }} 
                              />
                            )}
                            <span className="text-base font-bold text-[#1A1D23] truncate">
                              {dominantName}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-[#69706A] mt-0.5">
                            {dominantPct > 0 ? `${dominantPct.toFixed(1)}% of total AOI` : 'Pending classification'}
                          </div>
                        </div>

                        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-3 rounded-lg shadow-2xs">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#69706A] block">Diversity Index</span>
                          <div className="text-base font-bold text-[#1A1D23] mono mt-1">
                            {shannonDiversity > 0 ? `${shannonDiversity.toFixed(2)} H'` : '—'}
                          </div>
                          <div className="text-[10.5px] text-[#69706A] mt-0.5">
                            {shannonDiversity > 0 ? 'Shannon-Wiener index' : 'Requires classification'}
                          </div>
                        </div>

                        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-3 rounded-lg shadow-2xs">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#69706A] block">Sampled Pixels</span>
                          <div className="text-base font-bold text-[#1A1D23] mono mt-1">
                            {totalPixels > 0 ? totalPixels.toLocaleString() : '—'}
                          </div>
                          <div className="text-[10.5px] text-[#69706A] mt-0.5">
                            10m GSD grid resolution
                          </div>
                        </div>

                        <div className="bg-[#FAF9F5] border border-[#D8D5CA] p-3 rounded-lg shadow-2xs col-span-2 sm:col-span-1">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#69706A] block">Carbon Stock Est.</span>
                          <div className="text-base font-bold text-[#306840] mono mt-1">
                            {carbonEstimate > 0 ? `${Math.round(carbonEstimate).toLocaleString()} tC` : '—'}
                          </div>
                          <div className="text-[10.5px] text-[#69706A] mt-0.5">
                            IPCC Tier-1 biomass model
                          </div>
                        </div>
                      </div>

                      {/* If classified, show full tabular statistical breakdown */}
                      {statistics ? (
                        <div className="space-y-4">
                          {/* Detailed Class Breakdown Table */}
                          <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl overflow-hidden shadow-2xs">
                            <div className="p-3 border-b border-[#EFECE3] flex items-center justify-between bg-[#F4F1E8]/50">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-[#D9622B]" />
                                <span className="text-xs font-bold text-[#1A1D23] tracking-tight">Land Cover Class Distribution</span>
                              </div>
                              <span className="text-[11px] font-mono text-[#69706A]">
                                {Object.keys(statistics).length} active classes
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-[#EFECE3] bg-[#FAF9F5] text-[10.5px] text-[#69706A] uppercase tracking-wider font-semibold">
                                    <th className="py-2.5 px-3.5">Class Name</th>
                                    <th className="py-2.5 px-3 text-right">Area (ha)</th>
                                    <th className="py-2.5 px-3 text-right">Area (km²)</th>
                                    <th className="py-2.5 px-3 text-right">Area (Acres)</th>
                                    <th className="py-2.5 px-3 text-right">Share (%)</th>
                                    <th className="py-2.5 px-3 text-right">Pixel Count</th>
                                    <th className="py-2.5 px-3.5 w-36">Proportion</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#EFECE3] font-mono text-[11.5px]">
                                  {Object.entries(statistics).map(([name, data]) => {
                                    const color = LULC_COLORS[name] || '#8CA0AA';
                                    return (
                                      <tr key={name} className="hover:bg-[#F4F1E8]/60 transition-colors">
                                        <td className="py-2.5 px-3.5 font-sans font-medium text-[#1A1D23] flex items-center gap-2">
                                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                          <span>{name}</span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-[#1A1D23] font-semibold">
                                          {data.area_ha.toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-[#69706A]">
                                          {(data.area_ha / 100).toFixed(3)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-[#69706A]">
                                          {(data.area_ha * 2.471).toFixed(1)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-bold text-[#1A1D23]">
                                          {data.percentage.toFixed(1)}%
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-[#69706A]">
                                          {data.pixel_count.toLocaleString()}
                                        </td>
                                        <td className="py-2.5 px-3.5">
                                          <div className="w-full h-2 bg-[#EFECE3] rounded-full overflow-hidden">
                                            <div 
                                              className="h-full rounded-full transition-all duration-300"
                                              style={{ width: `${Math.min(100, data.percentage)}%`, backgroundColor: color }}
                                            />
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-[#D8D5CA] bg-[#FAF9F5] font-semibold text-[11px] text-[#1A1D23]">
                                    <td className="py-2.5 px-3.5 font-sans">Total AOI Footprint</td>
                                    <td className="py-2.5 px-3 text-right mono">{totalArea.toFixed(2)} ha</td>
                                    <td className="py-2.5 px-3 text-right mono">{(totalArea / 100).toFixed(3)} km²</td>
                                    <td className="py-2.5 px-3 text-right mono">{(totalArea * 2.471).toFixed(1)} ac</td>
                                    <td className="py-2.5 px-3 text-right mono">100.0%</td>
                                    <td className="py-2.5 px-3 text-right mono">{totalPixels.toLocaleString()}</td>
                                    <td className="py-2.5 px-3.5">
                                      <div className="w-full h-2 bg-[#306840] rounded-full" />
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          {/* Ecological Indices & Landscape Metrics Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="p-3 bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl">
                              <div className="text-[10px] font-semibold uppercase text-[#69706A] tracking-wider">Green Canopy Coverage</div>
                              <div className="text-lg font-bold text-[#306840] mono mt-1">
                                {(((statistics['Forest']?.percentage || 0) + (statistics['Grass']?.percentage || 0) + (statistics['Wetland']?.percentage || 0))).toFixed(1)}%
                              </div>
                              <p className="text-[11px] text-[#69706A] mt-0.5">Forest, grass, and wetland canopy</p>
                            </div>

                            <div className="p-3 bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl">
                              <div className="text-[10px] font-semibold uppercase text-[#69706A] tracking-wider">Impervious Surface</div>
                              <div className="text-lg font-bold text-[#C4281B] mono mt-1">
                                {(statistics['Urban']?.percentage || 0).toFixed(1)}%
                              </div>
                              <p className="text-[11px] text-[#69706A] mt-0.5">Built structures and paved ground</p>
                            </div>

                            <div className="p-3 bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl">
                              <div className="text-[10px] font-semibold uppercase text-[#69706A] tracking-wider">Surface Moisture / Water</div>
                              <div className="text-lg font-bold text-[#419BDF] mono mt-1">
                                {(statistics['Water']?.percentage || 0).toFixed(1)}%
                              </div>
                              <p className="text-[11px] text-[#69706A] mt-0.5">Lakes, rivers, reservoirs, estuaries</p>
                            </div>

                            <div className="p-3 bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl">
                              <div className="text-[10px] font-semibold uppercase text-[#69706A] tracking-wider">Exposed / Bare Ground</div>
                              <div className="text-lg font-bold text-[#A59B8F] mono mt-1">
                                {(statistics['Bare Land']?.percentage || 0).toFixed(1)}%
                              </div>
                              <p className="text-[11px] text-[#69706A] mt-0.5">Bare soil, rocks, open ground</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Fallback when not yet classified: Show Geometry & Extent Telemetry */
                        <div className="p-5 bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFECE3] pb-3">
                            <div>
                              <h4 className="text-xs font-bold text-[#1A1D23] flex items-center gap-2">
                                <Target className="w-4 h-4 text-[#D9622B]" />
                                Area of Interest (AOI) Geometry Telemetry
                              </h4>
                              <p className="text-xs text-[#69706A] mt-0.5">
                                {coords.length > 0 
                                  ? `Polygon with ${coords.length} vertices is defined. Ready for land cover inference.` 
                                  : 'Draw a boundary or select an AOI on the map to compute geometric statistics.'}
                              </p>
                            </div>
                            {coords.length > 0 && !loadingClassify && (
                              <button
                                type="button"
                                onClick={runClassification}
                                className="px-3.5 py-1.5 bg-[#306840] hover:bg-[#265433] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer flex-shrink-0"
                              >
                                <span>Analyze & Classify AOI</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 bg-[#F4F1E8]/50 border border-[#EFECE3] rounded-lg">
                              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Boundary Vertices</span>
                              <p className="text-sm font-bold text-[#1A1D23] mono mt-0.5">{coords.length} points</p>
                            </div>
                            <div className="p-3 bg-[#F4F1E8]/50 border border-[#EFECE3] rounded-lg">
                              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Center Latitude</span>
                              <p className="text-sm font-bold text-[#1A1D23] mono mt-0.5">{mapCenter[0].toFixed(5)}°</p>
                            </div>
                            <div className="p-3 bg-[#F4F1E8]/50 border border-[#EFECE3] rounded-lg">
                              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Center Longitude</span>
                              <p className="text-sm font-bold text-[#1A1D23] mono mt-0.5">{mapCenter[1].toFixed(5)}°</p>
                            </div>
                            <div className="p-3 bg-[#F4F1E8]/50 border border-[#EFECE3] rounded-lg">
                              <span className="text-[10px] text-[#69706A] uppercase font-semibold">Satellite Sensor</span>
                              <p className="text-sm font-bold text-[#1A1D23] mt-0.5">Sentinel-2 MSI</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Tab 3: Metadata (Meta Tag) */}
            {activeAnalyticsTab === 'metadata' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  
                  {/* Card 1: Sensor & Platform */}
                  <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#EFECE3] pb-2">
                      <Satellite className="w-4 h-4 text-[#D9622B]" />
                      <h4 className="text-xs font-bold text-[#1A1D23] tracking-tight">Sensor & Platform Specs</h4>
                    </div>
                    <dl className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Constellation:</dt>
                        <dd className="text-[#1A1D23] font-medium text-right">ESA Copernicus Sentinel-2</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Instrument:</dt>
                        <dd className="text-[#1A1D23] font-medium text-right">MultiSpectral Instrument (MSI)</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Product Level:</dt>
                        <dd className="text-[#1A1D23] font-medium text-right">Level-2A BOA Reflectance</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Dynamic Range:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">12-bit (0 - 10,000 BOA)</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">GSD Resolution:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">10m VNIR / 20m SWIR</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Revisit Cycle:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">5 days (Constellation)</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Card 2: Cartographic & Spatial Georeference */}
                  <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#EFECE3] pb-2">
                      <Target className="w-4 h-4 text-[#D9622B]" />
                      <h4 className="text-xs font-bold text-[#1A1D23] tracking-tight">Georeferencing & Spatial Bounds</h4>
                    </div>
                    <dl className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Coordinate Reference:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">EPSG:4326 (WGS 84)</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Map Projection:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">EPSG:3857 (Web Mercator)</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Bounding Box (N / S):</dt>
                        <dd className="text-[#1A1D23] font-mono text-right text-[11px]">
                          {coords.length > 0 
                            ? `${Math.max(...coords.map(c => c[1])).toFixed(4)}° / ${Math.min(...coords.map(c => c[1])).toFixed(4)}°` 
                            : '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Bounding Box (E / W):</dt>
                        <dd className="text-[#1A1D23] font-mono text-right text-[11px]">
                          {coords.length > 0 
                            ? `${Math.max(...coords.map(c => c[0])).toFixed(4)}° / ${Math.min(...coords.map(c => c[0])).toFixed(4)}°` 
                            : '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Centroid Coordinates:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right text-[11px]">
                          {mapCenter[0].toFixed(4)}°, {mapCenter[1].toFixed(4)}°
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Geometry Vertices:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">{coords.length} vertices</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Card 3: Temporal & Atmospheric Parameters */}
                  <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#EFECE3] pb-2">
                      <Calendar className="w-4 h-4 text-[#D9622B]" />
                      <h4 className="text-xs font-bold text-[#1A1D23] tracking-tight">Temporal & Scene Parameters</h4>
                    </div>
                    <dl className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Acquisition Window:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">{startDate} → {endDate}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Cloud Tolerance:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">&lt; {cloudCover}% scene cloud</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Masking Filter:</dt>
                        <dd className="text-[#1A1D23] font-medium text-right">QA60 + SCL Probability</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Compositing Method:</dt>
                        <dd className="text-[#1A1D23] font-medium text-right">Cloud-free Median</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Atmospheric Model:</dt>
                        <dd className="text-[#1A1D23] font-medium text-right">ESA Sen2Cor BOA</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">STAC Collection:</dt>
                        <dd className="text-[#1A1D23] font-mono text-[10.5px] text-right">COPERNICUS/S2_SR_HARMONIZED</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Card 4: Machine Learning Pipeline */}
                  <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#EFECE3] pb-2">
                      <Database className="w-4 h-4 text-[#D9622B]" />
                      <h4 className="text-xs font-bold text-[#1A1D23] tracking-tight">Machine Learning Pipeline</h4>
                    </div>
                    <dl className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Classifier Model:</dt>
                        <dd className="text-[#1A1D23] font-medium text-right">Random Forest (GEE Cluster)</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Ensemble Trees:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">100 Decision Trees</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Input Feature Bands:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">B2, B3, B4, B8, B11, B12</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Spectral Indices:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">NDVI, MNDWI, NDBI</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Ground Truth Data:</dt>
                        <dd className="text-[#1A1D23] font-medium text-right">ESA WorldCover 10m v200</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Backend Engine:</dt>
                        <dd className="text-[#1A1D23] font-medium text-right">Google Earth Engine Python API</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Card 5: Session & Execution Telemetry */}
                  <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#EFECE3] pb-2">
                      <Activity className="w-4 h-4 text-[#D9622B]" />
                      <h4 className="text-xs font-bold text-[#1A1D23] tracking-tight">Execution & Session Status</h4>
                    </div>
                    <dl className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Cloud Connection:</dt>
                        <dd className="text-[#306840] font-semibold text-right flex items-center gap-1 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#306840]" />
                          {geeConnected === false ? 'Offline / Fallback' : 'Connected to GEE'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Inference Latency:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">
                          {processingTime !== null ? `${processingTime}s` : (tileUrls.classified ? '< 3.5s (Cached)' : 'Pending classification')}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Active Layers:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">{readyLayersCount > 0 ? readyLayersCount : 6} / {layerStack.length} ready</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Database Storage:</dt>
                        <dd className="text-[#1A1D23] font-medium text-right">Supabase PostgreSQL</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#69706A]">Export Formats:</dt>
                        <dd className="text-[#1A1D23] font-mono text-right">GeoTIFF, GeoJSON, PDF</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Card 6: Raw STAC / Scene Metadata JSON Inspector */}
                  <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#EFECE3] pb-2">
                      <FileText className="w-4 h-4 text-[#D9622B]" />
                      <h4 className="text-xs font-bold text-[#1A1D23] tracking-tight">Raw Metadata Inspector</h4>
                    </div>
                    <div className="bg-[#F4F1E8] border border-[#EFECE3] rounded-lg p-2.5 max-h-36 overflow-y-auto">
                      <pre className="text-[10.5px] font-mono text-[#1A1D23] whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify({
                          satellite: "COPERNICUS/S2_SR_HARMONIZED",
                          sensor: "Sentinel-2 MSI Level-2A",
                          projection: "EPSG:4326",
                          date_range: [startDate, endDate],
                          cloud_cover_max: cloudCover,
                          bands: ["B2", "B3", "B4", "B8", "B11", "B12"],
                          spatial_resolution_meters: 10,
                          aoi_area_ha: aoiAreaHa ? Number(aoiAreaHa.toFixed(2)) : null,
                          coordinates_count: coords.length,
                          classification_status: tileUrls.classified ? "completed" : "standby",
                          classes: Object.keys(statistics || {})
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>

                </div>
              </div>
            )}
              </div>
            )}
          </div>

        </main>

        {/* ---------- Right rail (Layers, Tools & Export) ---------- */}
        <aside className={`rail rail-right ${rightRailCollapsed ? 'collapsed' : ''}`} aria-label="Layers and analysis controls">
          <div className="rail-header bg-[#FAF9F5] border-b border-[#D8D5CA]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1D23]">
              <Layers className="w-4 h-4 text-[#D9622B]" />
              <span>Layers & Tools</span>
            </div>
            <button
              type="button"
              onClick={() => setRightRailCollapsed(true)}
              className="p-1 rounded text-[#69706A] hover:text-[#1A1D23] hover:bg-[#F4F1E8] transition cursor-pointer"
              title="Collapse layers panel"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-50px)]">
            {/* Satellite Layers Dedicated Card matching Image 1 */}
            <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-2xl shadow-xs overflow-hidden">
              <div 
                className="p-3.5 flex items-center justify-between cursor-pointer select-none border-b border-[#EFECE3] bg-[#FAF9F5] hover:bg-[#F4F1E8]/50 transition"
                onClick={() => setPhase4Open(!phase4Open)}
              >
                <div className="flex items-center gap-2">
                  <img src="/layer-thumbnails/header_icon.png" alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                  <span className="text-[13.5px] font-bold text-[#1A1D23] tracking-tight">Satellite Layers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#69706A] font-semibold">
                    {readyLayersCount > 0 ? readyLayersCount : 6}/{layerStack.length}
                  </span>
                  <span className="text-[#69706A]">
                    {phase4Open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </div>
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
                    <div className="divide-y divide-[#EFECE3] px-2 py-1">
                      {/* Base map row */}
                      {(() => {
                        const isVisible = layerVisibility.none !== false;
                        return (
                          <div
                            className="flex items-center justify-between py-2 px-1 hover:bg-[#F4F1E8]/70 transition-colors cursor-pointer rounded-lg group"
                            onClick={() => handleToggleLayer('none')}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src="/layer-thumbnails/base_map.png"
                                alt="Base map"
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[#D8D5CA]/50 shadow-2xs"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#1A1D23] tracking-tight truncate">Base map</div>
                                <div className="text-[10.5px] text-[#69706A] truncate">Cartographic reference</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLayer('none');
                                }}
                                className="text-[#69706A] hover:text-[#1A1D23] transition-colors p-1 rounded cursor-pointer"
                              >
                                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-[#8A908A]" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLayer('none');
                                }}
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition cursor-pointer ${
                                  isVisible
                                    ? 'bg-[#EAF3EB] text-[#3B7A46]'
                                    : 'bg-[#FDEAE8] text-[#C24E43]'
                                }`}
                              >
                                {isVisible ? 'Visible' : 'Hidden'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 12 Satellite Overlays */}
                      {layerStack.map((layer) => {
                        const isVisible = layerVisibility[layer.key] !== false;
                        return (
                          <div
                            key={layer.key}
                            className="flex items-center justify-between py-2 px-1 hover:bg-[#F4F1E8]/70 transition-colors cursor-pointer rounded-lg group"
                            onClick={() => handleToggleLayer(layer.key)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={layer.thumbnail}
                                alt={layer.label}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[#D8D5CA]/50 shadow-2xs"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#1A1D23] tracking-tight truncate">{layer.label}</div>
                                <div className="text-[10.5px] text-[#69706A] truncate">{layer.sub}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLayer(layer.key);
                                }}
                                className="text-[#69706A] hover:text-[#1A1D23] transition-colors p-1 rounded cursor-pointer"
                              >
                                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-[#8A908A]" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLayer(layer.key);
                                }}
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition cursor-pointer ${
                                  isVisible
                                    ? 'bg-[#EAF3EB] text-[#3B7A46]'
                                    : 'bg-[#FDEAE8] text-[#C24E43]'
                                }`}
                              >
                                {isVisible ? 'Visible' : 'Hidden'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Opacity slider & Controls footer */}
                    <div className="p-3 bg-[#F4F1E8] border-t border-[#EFECE3] space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#69706A]">
                        <span className="font-medium text-[11px]">Overlay opacity</span>
                        <span className="mono text-[#1A1D23] font-semibold text-xs">{Math.round(opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={opacity * 100}
                        onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                        className="w-full accent-[#D9622B] h-1.5 bg-[#D8D5CA] rounded-lg appearance-none cursor-pointer"
                      />

                      {/* Confidence toggle */}
                      {confidenceReady && (
                        <div className="pt-2 border-t border-[#D8D5CA] flex items-center justify-between text-xs text-[#69706A]">
                          <span className="text-[11px]">Confidence mask</span>
                          <button
                            type="button"
                            onClick={() => setConfidenceVisible(!confidenceVisible)}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer transition ${
                              confidenceVisible
                                ? 'bg-[#6F8060] text-white'
                                : 'bg-[#FAF9F5] border border-[#D8D5CA] text-[#69706A]'
                            }`}
                          >
                            {confidenceVisible ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Analysis Tools Card matching mockup */}
            <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-2xl shadow-xs overflow-hidden">
              <div 
                className="p-3.5 flex items-center justify-between cursor-pointer select-none border-b border-[#EFECE3] bg-[#FAF9F5] hover:bg-[#F4F1E8]/50 transition"
                onClick={() => {
                  const next = !phase5Open;
                  setPhase5Open(next);
                  if (next) setExportsOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <PlusSquare className="w-4 h-4 text-[#69706A]" />
                  <span className="text-[13.5px] font-bold text-[#1A1D23] tracking-tight">Analysis Tools</span>
                </div>
                <span className="text-[#69706A]">
                  {phase5Open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                    <div className="p-3 space-y-3 bg-[#FAF9F5]">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => triggerTool('measure')}
                          className={`py-1.5 px-2 text-xs rounded border transition flex items-center justify-center gap-1.5 cursor-pointer font-medium ${
                            measurementMode
                              ? 'bg-[#D9622B] text-white border-[#D9622B]'
                              : 'bg-[#F4F1E8] hover:bg-[#E9E6DC] text-[#1A1D23] border-[#D8D5CA]'
                          }`}
                        >
                          <Ruler className="w-3.5 h-3.5" /> Measure
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerTool('transect')}
                          className={`py-1.5 px-2 text-xs rounded border transition flex items-center justify-center gap-1.5 cursor-pointer font-medium ${
                            transectMode
                              ? 'bg-[#D9622B] text-white border-[#D9622B]'
                              : 'bg-[#F4F1E8] hover:bg-[#E9E6DC] text-[#1A1D23] border-[#D8D5CA]'
                          }`}
                        >
                          <Mountain className="w-3.5 h-3.5" /> Transect
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerTool('spectral')}
                          className={`py-1.5 px-2 text-xs rounded border transition flex items-center justify-center gap-1.5 cursor-pointer font-medium ${
                            spectralInspectorMode
                              ? 'bg-[#D9622B] text-white border-[#D9622B]'
                              : 'bg-[#F4F1E8] hover:bg-[#E9E6DC] text-[#1A1D23] border-[#D8D5CA]'
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5" /> Spectral
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerTool('timeline')}
                          className={`py-1.5 px-2 text-xs rounded border transition flex items-center justify-center gap-1.5 cursor-pointer font-medium ${
                            timelineMode
                              ? 'bg-[#D9622B] text-white border-[#D9622B]'
                              : 'bg-[#F4F1E8] hover:bg-[#E9E6DC] text-[#1A1D23] border-[#D8D5CA]'
                          }`}
                        >
                          <History className="w-3.5 h-3.5" /> Timeline
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerTool('swipe')}
                          className={`py-1.5 px-2 text-xs rounded border transition flex items-center justify-center gap-1.5 cursor-pointer font-medium ${
                            swipeActive
                              ? 'bg-[#D9622B] text-white border-[#D9622B]'
                              : 'bg-[#F4F1E8] hover:bg-[#E9E6DC] text-[#1A1D23] border-[#D8D5CA]'
                          }`}
                        >
                          <Columns2 className="w-3.5 h-3.5" /> Swipe
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerTool('notes')}
                          className={`py-1.5 px-2 text-xs rounded border transition flex items-center justify-center gap-1.5 cursor-pointer font-medium ${
                            noteMode
                              ? 'bg-[#D9622B] text-white border-[#D9622B]'
                              : 'bg-[#F4F1E8] hover:bg-[#E9E6DC] text-[#1A1D23] border-[#D8D5CA]'
                          }`}
                        >
                          <StickyNote className="w-3.5 h-3.5" /> Notes · {mapNotes.length}
                        </button>
                      </div>

                      {/* Topographic Analysis trigger button */}
                      <button
                        type="button"
                        onClick={triggerAnalyzeTerrain}
                        disabled={loadingTerrain}
                        className="w-full py-2 px-2.5 bg-[#F4F1E8] hover:bg-[#E9E6DC] border border-[#D8D5CA] text-[#1A1D23] rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5 transition font-medium"
                      >
                        {loadingTerrain ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-[#D9622B] animate-spin" />
                            <span>Analyzing DEM...</span>
                          </>
                        ) : (
                          <>
                            <Mountain className="w-3.5 h-3.5 text-[#D9622B]" />
                            <span>{terrainData ? "Refresh Terrain & Slope" : "Analyze Terrain & Slope"}</span>
                          </>
                        )}
                      </button>

                      {/* Spectral Indices Analysis trigger button */}
                      <button
                        type="button"
                        onClick={triggerAnalyzeSpectral}
                        disabled={loadingSpectral}
                        className="w-full py-2 px-2.5 bg-[#F4F1E8] hover:bg-[#E9E6DC] border border-[#D8D5CA] text-[#1A1D23] rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5 transition font-medium"
                      >
                        {loadingSpectral ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-[#D9622B] animate-spin" />
                            <span>Computing Band Math...</span>
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5 text-[#D9622B]" />
                            <span>{spectralData ? "Refresh Spectral Indices" : "Analyze Spectral Indices"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Exports Card matching mockup */}
            <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-2xl shadow-xs overflow-hidden">
              <div 
                className="p-3.5 flex items-center justify-between cursor-pointer select-none border-b border-[#EFECE3] bg-[#FAF9F5] hover:bg-[#F4F1E8]/50 transition"
                onClick={() => {
                  const next = !exportsOpen;
                  setExportsOpen(next);
                  if (next) setPhase5Open(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#69706A]" />
                  <span className="text-[13.5px] font-bold text-[#1A1D23] tracking-tight">Exports</span>
                </div>
                <span className="text-[#69706A]">
                  {exportsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </div>

              <AnimatePresence initial={false}>
                {exportsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-3 bg-[#FAF9F5]">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold tracking-wide text-[#454B46] uppercase">Export Deliverables</span>
                          {tileUrls.classified ? (
                            <span className="text-[10px] text-[#6F8060] font-medium px-2 py-0.5 rounded bg-[#E4E9DF] border border-[#6F8060]/30 font-mono">Ready</span>
                          ) : coords.length > 0 ? (
                            <span className="text-[10px] text-[#69706A] px-2 py-0.5 rounded bg-[#F4F1E8] border border-[#D8D5CA] font-mono">AOI Set</span>
                          ) : (
                            <span className="text-[10px] text-[#69706A]">Draw AOI</span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <select
                              value={downloadFormat}
                              onChange={(e) => setDownloadFormat(e.target.value as any)}
                              className="bg-[#F4F1E8] border border-[#D8D5CA] text-[#1A1D23] rounded-lg px-2.5 py-1.5 text-xs flex-1 min-w-0 outline-none font-medium truncate focus:border-[#D9622B]"
                            >
                              <option value="kmz">KMZ (Google Earth 3D)</option>
                              <option value="kml">KML (Placemark XML)</option>
                              <option value="ipynb">Jupyter Notebook (.ipynb - Folium)</option>
                              <option value="geotiff">GeoTIFF (Raster)</option>
                              <option value="png">PNG (Map Image)</option>
                              <option value="geojson">GeoJSON (Vectors)</option>
                            </select>
                            <button
                              type="button"
                              onClick={triggerDownload}
                              disabled={downloading}
                              className="shrink-0 px-3 py-1.5 bg-[#FAF9F5] hover:bg-[#E9E6DC] border border-[#D8D5CA] text-[#1A1D23] rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition font-medium whitespace-nowrap shadow-2xs"
                              title="Export selected format"
                            >
                              <Download className="w-3.5 h-3.5 text-[#D9622B]" />
                              <span>{downloading ? 'Saving...' : 'Save'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Executive PDF Briefing Generator Button */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={triggerPdfBriefing}
                            disabled={generatingPdf || !statistics}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition shadow-xs ${
                              statistics
                                ? 'bg-[#D9622B] hover:bg-[#A84A32] text-white border border-[#A84A32]'
                                : 'bg-[#F4F1E8] border border-[#D8D5CA] text-[#8A908A] cursor-not-allowed opacity-75'
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
                                <FileText className={`w-3.5 h-3.5 ${statistics ? 'text-white' : 'text-[#8A908A]'}`} />
                                <span>{statistics ? "Generate Executive Briefing PDF" : "Executive Briefing PDF (Requires Analysis)"}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Cartographic Study Area Map Modal Trigger */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setIsStudyAreaModalOpen(true)}
                            disabled={coords.length === 0}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition shadow-xs ${
                              coords.length > 0
                                ? 'bg-[#FAF9F5] hover:bg-[#F4F1E8] text-[#1A1D23] border border-[#D8D5CA]'
                                : 'bg-[#F4F1E8] border border-[#D8D5CA] text-[#8A908A] cursor-not-allowed opacity-75'
                            }`}
                            title={coords.length > 0 ? "Generate publication-grade study area map layout" : "Define an AOI first to compose a study area map"}
                          >
                            <Compass className="w-3.5 h-3.5 text-[#D9622B]" />
                            <span>Generate Cartographic Study Area Map</span>
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

        {/* Mobile Backdrop for Drawers */}
        <div 
          className={`rail-backdrop ${(!leftRailCollapsed || !rightRailCollapsed || analyticsExpanded) ? 'active' : ''}`}
          onClick={() => {
            setLeftRailCollapsed(true);
            setRightRailCollapsed(true);
            setAnalyticsExpanded(false);
          }}
          aria-hidden="true"
        />

      </div>

      {/* STAC Catalog Granules Browser Modal */}
      <STACBrowserModal
        isOpen={isSTACModalOpen}
        onClose={() => setIsSTACModalOpen(false)}
        aoiCoords={coords}
        startDate={startDate}
        endDate={endDate}
        apiBase={API_BASE}
        onApplySceneSettings={(newStart, newEnd, newSensor) => {
          setStartDate(newStart);
          setEndDate(newEnd);
          setSelectedSensor(newSensor as any);
          setSuccessMessage(`Applied STAC scene window (${newStart} to ${newEnd}) on ${newSensor === 'landsat' ? 'Landsat 8/9' : 'Sentinel-2'}.`);
        }}
      />

      {/* Study Area Cartographic Map Generator Modal */}
      <StudyAreaMapModal
        isOpen={isStudyAreaModalOpen}
        onClose={() => setIsStudyAreaModalOpen(false)}
        aoiCoords={coords}
        aoiAreaHa={aoiAreaHa}
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        startDate={startDate}
        endDate={endDate}
        selectedSensor={selectedSensor}
        statistics={statistics || undefined}
        trueColorUrl={tileUrls.trueColor}
        classifiedUrl={tileUrls.classified}
      />

      {/* Save Workspace State Dialog */}
      {saveModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSaveModalOpen(false);
          }}
        >
          <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 relative z-10">
            <div className="flex items-center justify-between border-b border-[#EFECE3] pb-3">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-[#D9622B]" />
                <h3 className="text-sm font-bold text-[#1A1D23]">Save Analysis State</h3>
              </div>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="p-1 hover:bg-[#EFECE3] rounded text-[#8A908A] hover:text-[#1A1D23] transition cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#69706A] leading-relaxed">
              Persist your current study area polygon, classified land-use layers, date filters, sensor configurations, and statistical summary to Supabase for instant retrieval.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#1A1D23] uppercase tracking-wider">
                Analysis Project Name
              </label>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder={selectedLocation?.label ? selectedLocation.label.split(',')[0] : "e.g. Lagos Coastal Wetland Analysis"}
                className="w-full px-3 py-2 text-xs bg-white border border-[#D8D5CA] focus:border-[#D9622B] rounded-lg outline-none text-[#1A1D23] transition"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveWorkspace();
                }}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFECE3]">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#69706A] hover:text-[#1A1D23] hover:bg-[#EFECE3] rounded-lg transition cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveWorkspace()}
                disabled={isSavingWorkspace}
                className="px-4 py-1.5 text-xs bg-[#D9622B] hover:bg-[#A84A32] text-white font-medium rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingWorkspace ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Analyses & Projects Library Modal */}
      {isWorkspaceLibraryOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWorkspaceLibraryOpen(false);
          }}
        >
          <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative z-10">
            <div className="flex items-center justify-between border-b border-[#EFECE3] px-4 sm:px-6 py-3 sm:py-4 bg-white/70">
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4 text-[#D9622B]" />
                <h3 className="text-sm font-bold text-[#1A1D23]">Saved Projects & Analyses</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#EAE8E1] text-[#454B46] rounded-full">
                  {savedWorkspaces.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkspaceLibraryOpen(false)}
                className="p-1 hover:bg-[#EFECE3] rounded text-[#8A908A] hover:text-[#1A1D23] transition cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-3">
              {savedWorkspaces.length === 0 ? (
                <div className="py-12 text-center text-[#8A908A] space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#EAE8E1] flex items-center justify-center text-[#69706A]">
                    <Folder className="w-6 h-6 opacity-60" />
                  </div>
                  <p className="text-xs font-medium text-[#454B46]">No saved analyses found</p>
                  <p className="text-[11px] text-[#8A908A] max-w-sm mx-auto">
                    Draw or import an Area of Interest, configure your layers, and click <strong className="text-[#1A1D23]">Save Analysis</strong> in the top bar to store your project here.
                  </p>
                </div>
              ) : (
                savedWorkspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className="p-3.5 bg-white border border-[#D8D5CA] hover:border-[#D9622B] rounded-lg transition group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#1A1D23] truncate">
                          {ws.name}
                        </h4>
                        {ws.layer_state?.statistics && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#EAF3EB] text-[#3B7A46] rounded border border-[#3B7A46]/20">
                            Classified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[#8A908A]">
                        <span>{ws.description || 'Geospatial Workspace'}</span>
                        <span>•</span>
                        <span>{ws.updated_at ? new Date(ws.updated_at).toLocaleDateString() : 'Recent'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleRestoreWorkspace(ws)}
                        className="px-3 py-1.5 bg-[#FAF9F5] hover:bg-[#D9622B] hover:text-white border border-[#D8D5CA] hover:border-[#D9622B] text-[#1A1D23] text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Restore on Map</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                        className="p-1.5 text-[#8A908A] hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Delete workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#EFECE3] px-4 sm:px-6 py-3 bg-[#FAF9F5] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8A908A]">
              <span>Saved states are stored in Supabase with local redundancy.</span>
              <button
                type="button"
                onClick={() => setIsWorkspaceLibraryOpen(false)}
                className="px-3 py-1 text-xs text-[#1A1D23] font-medium hover:bg-[#EAE8E1] rounded transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Homogeneous Single Class Guidance Modal */}
      {singleClassPromptOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSingleClassPromptOpen(false);
          }}
        >
          <div className="bg-[#FAF9F5] border border-[#D8D5CA] rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#EFECE3] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF3E8] border border-[#F5C29B] flex items-center justify-center text-[#D9622B] shadow-2xs shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FFF0E6] text-[#D9622B] border border-[#F5C29B] rounded-full font-bold uppercase tracking-wider">
                      One Class Found
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1A1D23] mt-0.5">
                    Diverse Landscape Required for Classification
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSingleClassPromptOpen(false)}
                className="p-1 hover:bg-[#EFECE3] rounded-lg text-[#8A908A] hover:text-[#1A1D23] transition cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Why this happens */}
            <div className="p-3.5 bg-[#F4F1E8] border border-[#D8D5CA] rounded-xl space-y-2 text-xs text-[#454B46] leading-relaxed">
              <div className="font-semibold text-[#1A1D23] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D9622B]"></span>
                <span>Why did this happen?</span>
              </div>
              <p>
                The Area of Interest you selected contains <strong>only one uniform land cover class</strong> across all training pixels (for example, 100% open water, 100% sand desert, or a single crop monoculture).
              </p>
              <p>
                Supervised machine learning classifiers (Random Forest and Deep Neural Nets) learn by finding <strong>decision boundaries between contrasting classes</strong> (such as separating vegetation from water, urban buildings, or bare ground). Without at least 2 distinct classes to compare against, mathematical decision trees cannot be trained.
              </p>
            </div>

            {/* How to resolve */}
            <div className="p-3.5 bg-[#EAF3EB] border border-[#B5D7BB] rounded-xl space-y-2 text-xs text-[#2A5E33]">
              <div className="font-semibold text-[#1B4323] flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#3B7A46]" />
                <span>How to resolve this:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11.5px] text-[#2A5E33]/90">
                <li><strong>Expand your boundary</strong> slightly to encompass surrounding landscape features.</li>
                <li><strong>Draw across a transition zone</strong>, such as a coastline, riverbank, forest boundary, or rural-urban edge.</li>
                <li>Ensure the study area contains at least two distinct terrain types (e.g. water + land, or trees + agriculture).</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFECE3]">
              <button
                type="button"
                onClick={() => setSingleClassPromptOpen(false)}
                className="px-3.5 py-1.5 text-xs text-[#69706A] hover:text-[#1A1D23] hover:bg-[#EFECE3] rounded-lg transition cursor-pointer font-medium"
              >
                Got It, Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setSingleClassPromptOpen(false);
                  setLeftRailCollapsed(false);
                  triggerTool('poly');
                  setSuccessMessage("Draw tool active: Plot vertices across a transition zone containing multiple terrain types (e.g. land & water).");
                }}
                className="px-4 py-1.5 text-xs bg-[#D9622B] hover:bg-[#A84A32] text-white font-medium rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Pentagon className="w-3.5 h-3.5" />
                <span>Redraw / Expand AOI</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Bottom Navigation Bar (Visible only on < 1024px screens) */}
      <nav className="mobile-bottom-nav select-none" aria-label="Mobile Navigation">
        {/* 1. Map Tab */}
        <button
          type="button"
          onClick={() => {
            setLeftRailCollapsed(true);
            setRightRailCollapsed(true);
            setAnalyticsExpanded(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            leftRailCollapsed && rightRailCollapsed && !analyticsExpanded
              ? 'text-[#D9622B]'
              : 'text-[#69706A] hover:text-[#1A1D23]'
          }`}
        >
          <div className="relative">
            <Compass className="w-5 h-5" />
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 ${
            leftRailCollapsed && rightRailCollapsed && !analyticsExpanded ? 'font-bold' : 'font-medium'
          }`}>
            Map
          </span>
        </button>

        {/* 2. Workflow Tab */}
        <button
          type="button"
          onClick={() => {
            const willOpen = leftRailCollapsed;
            setLeftRailCollapsed(!willOpen);
            setRightRailCollapsed(true);
            setAnalyticsExpanded(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            !leftRailCollapsed
              ? 'text-[#D9622B]'
              : 'text-[#69706A] hover:text-[#1A1D23]'
          }`}
        >
          <div className="relative">
            <Target className="w-5 h-5" />
            {coords.length > 0 && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#4B8055] ring-2 ring-[#FAF9F5]" />
            )}
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 ${
            !leftRailCollapsed ? 'font-bold' : 'font-medium'
          }`}>
            Workflow
          </span>
        </button>

        {/* 3. Layers Tab */}
        <button
          type="button"
          onClick={() => {
            const willOpen = rightRailCollapsed;
            setRightRailCollapsed(!willOpen);
            setLeftRailCollapsed(true);
            setAnalyticsExpanded(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            !rightRailCollapsed
              ? 'text-[#D9622B]'
              : 'text-[#69706A] hover:text-[#1A1D23]'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            {readyLayersCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[8.5px] font-bold rounded-full bg-[#D9622B] text-white">
                {readyLayersCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 ${
            !rightRailCollapsed ? 'font-bold' : 'font-medium'
          }`}>
            Layers
          </span>
        </button>

        {/* 4. Analytics Tab */}
        <button
          type="button"
          onClick={() => {
            const willOpen = !analyticsExpanded;
            setAnalyticsExpanded(willOpen);
            setLeftRailCollapsed(true);
            setRightRailCollapsed(true);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            analyticsExpanded
              ? 'text-[#D9622B]'
              : 'text-[#69706A] hover:text-[#1A1D23]'
          }`}
        >
          <div className="relative">
            <LayoutGrid className="w-5 h-5" />
            {statistics && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#3B7A46] ring-2 ring-[#FAF9F5]" />
            )}
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 ${
            analyticsExpanded ? 'font-bold' : 'font-medium'
          }`}>
            Analytics
          </span>
        </button>
      </nav>
    </div>
  );
}
