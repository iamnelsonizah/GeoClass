'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Loader2, 
  Globe, 
  Layers, 
  BarChart3, 
  Settings, 
  Play, 
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
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Eye,
  Zap,
  X,
  Satellite,
  Activity,
  Clock,
  Target,
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
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-slate-800 border-t-blue-500 animate-spin" />
        <Globe className="w-6 h-6 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <span className="text-slate-400 text-sm font-medium mt-4">Initializing Interactive Map Engine...</span>
      <span className="text-slate-600 text-xs mt-1">Loading Leaflet, GeoMan, and tile providers</span>
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
    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';

  const Icon = type === 'error' ? ShieldAlert : CheckCircle;

  return (
    <div className={`flex items-center gap-3 p-3.5 border rounded-xl animate-in slide-in-from-top-2 ${styles} print:hidden`}>
      <Icon className="w-4.5 h-4.5 flex-shrink-0" />
      <div className="text-xs font-semibold flex-1">{message}</div>
      <button 
        onClick={onDismiss} 
        className="p-1 hover:bg-white/10 rounded-md transition flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Workflow progress step indicator
function WorkflowProgress({ currentStep }: { currentStep: number }) {
  const steps = [
    { id: 1, label: 'Select AOI', icon: MapPin },
    { id: 2, label: 'Fetch Imagery', icon: Satellite },
    { id: 3, label: 'Classify', icon: Zap },
    { id: 4, label: 'Analyze', icon: BarChart3 },
  ];

  return (
    <div className="flex items-center gap-1 print:hidden">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const StepIcon = step.icon;
        
        return (
          <div key={step.id} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-300 ${
              isCompleted 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                : isCurrent 
                  ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-sm shadow-blue-500/10' 
                  : 'text-slate-600 border border-transparent'
            }`}>
              <StepIcon className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className={`w-3 h-3 ${isCompleted ? 'text-emerald-600' : 'text-slate-800'}`} />
            )}
          </div>
        );
      })}
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
      borderClass: 'border-slate-800/60',
      textClass: 'text-slate-400',
      iconClass: 'text-slate-500',
    };
  }

  if (className === 'Urban' || className === 'Bare Land') {
    return areaChange > 0
      ? {
          borderClass: 'border-amber-900/40',
          textClass: 'text-amber-400',
          iconClass: 'text-amber-500',
        }
      : {
          borderClass: 'border-emerald-900/30',
          textClass: 'text-emerald-400',
          iconClass: 'text-emerald-500',
        };
  }

  if (VEGETATION_CLASSES.includes(className) || className === 'Water') {
    return areaChange < 0
      ? {
          borderClass: 'border-rose-900/35',
          textClass: 'text-rose-400',
          iconClass: 'text-rose-500',
        }
      : {
          borderClass: 'border-emerald-900/30',
          textClass: 'text-emerald-400',
          iconClass: 'text-emerald-500',
        };
  }

  return areaChange < 0
    ? {
        borderClass: 'border-rose-900/30',
        textClass: 'text-rose-400',
        iconClass: 'text-rose-500',
      }
    : {
        borderClass: 'border-emerald-900/30',
        textClass: 'text-emerald-400',
        iconClass: 'text-emerald-500',
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
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  
  // Standard Configuration State
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [cloudCover, setCloudCover] = useState(20);
  const [modelType, setModelType] = useState<'random_forest' | 'dynamic_world'>('random_forest');
  const [numTrees, setNumTrees] = useState(100);
  const [samplePoints, setSamplePoints] = useState(150);

  // Advanced: Temporal Change Detection State
  const [compareMode, setCompareMode] = useState(false);
  const [compareStartDate, setCompareStartDate] = useState('2020-01-01');
  const [compareEndDate, setCompareEndDate] = useState('2020-12-31');
  const [referenceStatistics, setReferenceStatistics] = useState<Record<string, ClassData> | undefined>(undefined);
  const [activeTimePeriod, setActiveTimePeriod] = useState<'target' | 'baseline'>('target');
  const [timelineBaselineYear, setTimelineBaselineYear] = useState(2020);
  const [timelineTargetYear, setTimelineTargetYear] = useState(2024);

  // Overlay Layer States
  const [activeLayer, setActiveLayer] = useState<'none' | 'true_color' | 'false_color' | 'ndvi' | 'classified'>('none');
  const [opacity, setOpacity] = useState(0.85);
  const [swipeActive, setSwipeActive] = useState(false);
  const [confidenceVisible, setConfidenceVisible] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(72);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [noteDraft, setNoteDraft] = useState('Field observation');
  const [mapNotes, setMapNotes] = useState<MapNote[]>([]);
  
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  // Backend API Base URL
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

  // Compute workflow step
  const workflowStep = statistics ? 4 : tileUrls.classified ? 4 : (tileUrls.trueColor ? 3 : (coords.length > 0 ? 2 : 1));
  const aoiAreaKm2 = aoiAreaHa !== null ? aoiAreaHa / 100 : null;
  const confidenceReview = getConfidenceReview(confidenceThreshold);
  const confidenceReady = !!statistics;
  const timelineYears = [2019, 2020, 2021, 2022, 2023, 2024];
  const temporalSettingsSignature = [
    compareMode,
    startDate,
    endDate,
    compareStartDate,
    compareEndDate,
    cloudCover,
    modelType,
    numTrees,
    samplePoints,
  ].join('|');
  const temporalSettingsRef = useRef(temporalSettingsSignature);
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
  const seasonWindowsMatch = !compareMode || (
    startDate.slice(5) === compareStartDate.slice(5) &&
    endDate.slice(5) === compareEndDate.slice(5)
  );

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
    setSuccessMessage(`Map centered on ${location.shortLabel}. Draw or load an AOI around this location.`);
  };

  const clearLocationSearch = () => {
    setLocationQuery('');
    setLocationSuggestions([]);
    setSelectedLocation(null);
  };

  const submitLocationSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locationSuggestions.length > 0) {
      selectLocation(locationSuggestions[0]);
      return;
    }

    if (selectedLocation && locationQuery.trim() === selectedLocation.label) {
      setMapCenter([selectedLocation.lat, selectedLocation.lng]);
      setMapZoom(getLocationZoom(selectedLocation.type));
    }
  };

  const selectSavedArea = (area: SavedArea) => {
    handleAOIDrawn(area.coords);
    setSelectedAreaId(area.id);
    setMapCenter(area.center);
    setMapZoom(area.zoom);
    setSuccessMessage(`${area.name} loaded. Area is ready for imagery review.`);
  };

  const saveCurrentArea = () => {
    if (coords.length === 0) {
      setErrorMessage("Select or draw an AOI before saving it.");
      return;
    }

    const id = `custom-${Date.now()}`;
    const customArea: SavedArea = {
      id,
      name: `Saved AOI ${savedAreas.length + 1}`,
      type: 'User saved boundary',
      center: mapCenter,
      zoom: mapZoom,
      coords,
    };

    setSavedAreas(prev => [customArea, ...prev]);
    setSelectedAreaId(id);
    setSuccessMessage(`${customArea.name} saved to the area library.`);
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
    setSuccessMessage(`Map note ${nextIndex} added at ${lat.toFixed(4)}, ${lng.toFixed(4)}.`);
  }, [mapNotes.length, noteDraft]);

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
          setErrorMessage('Could not load location suggestions. Check your connection and try again.');
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

  useEffect(() => {
    if (temporalSettingsRef.current === temporalSettingsSignature) return;
    temporalSettingsRef.current = temporalSettingsSignature;

    setTileUrls({});
    setStatistics(undefined);
    setReferenceStatistics(undefined);
    setTotalAreaHa(undefined);
    setActiveLayer('none');
    setActiveTimePeriod('target');
    setConfidenceVisible(false);
    setProcessingTime(null);
    setSuccessMessage(null);
  }, [temporalSettingsSignature]);

  // Check GEE Connection on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/status`)
      .then(res => res.json())
      .then(data => {
        setGeeConnected(data.gee_connected);
        if (!data.gee_connected) {
          setErrorMessage("Earth Engine API is not initialized. Please ensure backend/credentials.json is configured.");
        }
      })
      .catch(() => {
        setGeeConnected(false);
        setErrorMessage("Cannot connect to the backend server. Please verify FastAPI is running on port 8000.");
      });
  }, []);

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

    if (drawnCoords.length > 0) {
      const area = calculateAOIArea(drawnCoords);
      setAoiAreaHa(area);
      
      const lats = drawnCoords.map(c => c[1]);
      const lngs = drawnCoords.map(c => c[0]);
      const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
      const midLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
      setMapCenter([midLat, midLng]);
      setMapZoom(12);
      setSuccessMessage(`AOI selected with ${drawnCoords.length} vertices. Ready to fetch satellite imagery.`);
    } else {
      setAoiAreaHa(null);
    }
  }, []);

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
        setSuccessMessage(`Successfully imported AOI from "${file.name}" with ${coordinates.length} boundary vertices.`);
      } else {
        throw new Error("Could not find a valid Polygon geometry inside the uploaded GeoJSON.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to parse GeoJSON file. Make sure it contains a closed Polygon boundary.");
    }
    // Reset input so the same file can be re-uploaded
    e.target.value = '';
  };

  // Fetch Sentinel-2 Tile Layers (True Color, False Color, NDVI)
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
          throw new Error(errA.detail || errB.detail || "Failed to fetch satellite imagery for one of the periods.");
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
      setSuccessMessage(`Sentinel-2 cloud-free composites fetched in ${elapsed}s. Select overlays below to visualize on the map.`);
    } catch (e: any) {
      setErrorMessage(e.message || "An error occurred fetching GEE map tiles.");
    } finally {
      setLoadingMapId(false);
    }
  };

  // Run LULC classification and compare mode
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
        setSuccessMessage(`Classification completed in ${elapsed}s using ${modelType === 'random_forest' ? 'Smile Random Forest' : 'Dynamic World'}. ${Object.keys(data.statistics).length} land cover classes identified.`);
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
        setSuccessMessage(`Temporal change detection completed in ${elapsed}s. Comparing ${startDate.split('-')[0]} vs ${compareStartDate.split('-')[0]}.`);
      }
    } catch (e: any) {
      setErrorMessage(e.message || "An error occurred during classification.");
    } finally {
      setLoadingClassify(false);
    }
  };

  // Handle Dynamic Downloads (Supports GeoTIFF, PNG, GeoJSON, KML)
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
        let blob: Blob;
        let filename: string;
        
        if (downloadFormat === 'kml') {
          // Convert GeoJSON to basic KML
          const geojson = data.geojson_data;
          const kmlContent = geojsonToKml(geojson);
          blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
          filename = `geoclass-aoi-${startDate}-to-${endDate}.kml`;
        } else {
          blob = new Blob([JSON.stringify(data.geojson_data, null, 2)], { type: 'application/json' });
          filename = `geoclass-aoi-${startDate}-to-${endDate}.geojson`;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSuccessMessage(`${downloadFormat.toUpperCase()} file downloaded successfully!`);
      } else {
        if (data.download_url) {
          window.location.href = data.download_url;
          setSuccessMessage(`${downloadFormat.toUpperCase()} export initiated. Download starting...`);
        } else {
          throw new Error("No download URL returned from server.");
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || "An error occurred during file download.");
    } finally {
      setDownloading(false);
    }
  };

  // Simple GeoJSON to KML converter
  const geojsonToKml = (geojson: any): string => {
    const coords = geojson.geometry.coordinates[0];
    const coordString = coords.map((c: number[]) => `${c[0]},${c[1]},0`).join(' ');
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>GeoClass - ${geojson.properties?.name || 'AOI Boundary'}</name>
    <description>Study Period: ${startDate} to ${endDate} | Model: ${modelType}</description>
    <Style id="aoiStyle">
      <LineStyle><color>ffff7800</color><width>3</width></LineStyle>
      <PolyStyle><color>33ff7800</color></PolyStyle>
    </Style>
    <Placemark>
      <name>Area of Interest</name>
      <styleUrl>#aoiStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
  };

  // Print Executive Environmental Report
  const printReport = () => {
    window.print();
  };

  // Generate automated environmental insights based on results
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
    let healthColor = "text-yellow-400 border-yellow-500/20 bg-yellow-500/5";
    let healthIcon = <AlertTriangle className="w-5 h-5" />;
    
    if (naturalIndex > 75) {
      healthStatus = "High Ecological Quality";
      healthColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
      healthIcon = <CheckCircle className="w-5 h-5" />;
    } else if (urbanPct > 40) {
      healthStatus = "Critical Urban Heat Island Risk";
      healthColor = "text-rose-400 border-rose-500/20 bg-rose-500/5";
      healthIcon = <ShieldAlert className="w-5 h-5" />;
    }

    const recommendations = [];
    if (urbanPct > 20) {
      recommendations.push("Implement Sustainable Urban Drainage Systems (SUDS) to manage stormwater runoff in Built-up zones.");
      recommendations.push("Establish cool roof and urban green belt initiatives to reduce municipal Heat Island effects.");
    }
    if (forestPct < 15) {
      recommendations.push("Prioritize native tree planting campaigns to bolster local canopy cover and support biodiversity.");
    } else {
      recommendations.push("Establish structural forest management borders to protect dense tree stands from encroachment.");
    }
    if (wetlandPct > 5) {
      recommendations.push("Implement active wetland preservation guidelines; identify marshes as critical biological reserves.");
    }

    return {
      dominantClass: dominant.name,
      dominantPct: dominant.percentage,
      naturalIndex: Math.round(naturalIndex),
      urbanPct,
      healthStatus,
      healthColor,
      healthIcon,
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
    const currentWater = getSingleClassArea(statistics, 'Water');
    const currentVegetation = getClassArea(statistics, VEGETATION_CLASSES);

    if (compareMode && referenceStatistics) {
      const urbanChange = currentUrban - getSingleClassArea(referenceStatistics, 'Urban');
      const vegetationChange = currentVegetation - getClassArea(referenceStatistics, VEGETATION_CLASSES);
      const waterChange = currentWater - getSingleClassArea(referenceStatistics, 'Water');

      const classChanges = LULC_CLASS_NAMES.map(className => {
        const current = getSingleClassArea(statistics, className);
        const baseline = getSingleClassArea(referenceStatistics, className);
        return {
          className,
          change: current - baseline,
        };
      }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      const largestChange = classChanges[0];

      insights.push({
        label: 'Urban Change',
        value: `${urbanChange >= 0 ? '+' : '-'}${formatHectares(urbanChange)}`,
        detail: urbanChange > stabilityLimit
          ? `Urban increased by ${formatHectares(urbanChange)} compared with ${compareStartDate.slice(0, 4)}.`
          : urbanChange < -stabilityLimit
            ? `Urban decreased by ${formatHectares(urbanChange)} compared with ${compareStartDate.slice(0, 4)}.`
            : 'Urban footprint is stable across both periods.',
        tone: urbanChange > stabilityLimit ? 'warning' : urbanChange < -stabilityLimit ? 'positive' : 'neutral',
      });

      insights.push({
        label: 'Vegetation Shift',
        value: `${vegetationChange >= 0 ? '+' : '-'}${formatHectares(vegetationChange)}`,
        detail: vegetationChange < -stabilityLimit
          ? `Vegetation loss is the main ecological concern; review highlighted ${confidenceReview.focusZone} AOI cells first.`
          : vegetationChange > stabilityLimit
            ? `Vegetation gained ${formatHectares(vegetationChange)} across forest, grass, wetland, crop, and shrub classes.`
            : 'Vegetation classes are broadly stable across both periods.',
        tone: vegetationChange < -stabilityLimit ? 'critical' : vegetationChange > stabilityLimit ? 'positive' : 'neutral',
      });

      insights.push({
        label: 'Water Stability',
        value: `${waterChange >= 0 ? '+' : '-'}${formatHectares(waterChange)}`,
        detail: Math.abs(waterChange) <= stabilityLimit
          ? 'Water class stable across both periods.'
          : waterChange > 0
            ? `Water expanded by ${formatHectares(waterChange)}; check seasonal or flood conditions.`
            : `Water reduced by ${formatHectares(waterChange)}; review exposed wetland or shoreline pixels.`,
        tone: Math.abs(waterChange) <= stabilityLimit ? 'positive' : 'warning',
      });

      if (largestChange) {
        insights.push({
          label: 'Largest Shift',
          value: `${largestChange.change >= 0 ? '+' : '-'}${formatHectares(largestChange.change)}`,
          detail: `${largestChange.className} has the largest mapped change in the AOI.`,
          tone: Math.abs(largestChange.change) <= stabilityLimit ? 'neutral' : largestChange.change > 0 ? 'warning' : 'critical',
        });
      }
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
        tone: vegetationPct >= 50 ? 'positive' : vegetationPct >= 25 ? 'neutral' : 'warning',
      });

      insights.push({
        label: 'Urban Footprint',
        value: `${currentUrban.toLocaleString()} ha`,
        detail: urbanPct > 35
          ? 'Built-up coverage is high; prioritize heat and runoff review.'
          : 'Built-up coverage remains below the high-urban review threshold.',
        tone: urbanPct > 35 ? 'warning' : 'positive',
      });
    }

    insights.push({
      label: 'Uncertainty Review',
      value: `${confidenceReview.reviewCells}/${confidenceReview.totalCells} cells`,
      detail: confidenceReview.reviewCells > 0
        ? `Confidence mask flags ${confidenceReview.reviewShare}% of review cells below ${confidenceThreshold}%, concentrated around the ${confidenceReview.focusZone} AOI.`
        : `No review cells fall below the ${confidenceThreshold}% confidence threshold.`,
      tone: confidenceReview.criticalCells > 0 ? 'critical' : confidenceReview.reviewCells > 0 ? 'warning' : 'positive',
    });

    return insights.slice(0, 4);
  };

  const smartResultSummary = getSmartResultSummary();
  const smartInsightToneClass: Record<InsightTone, string> = {
    positive: 'border-emerald-500/20 bg-emerald-500/5',
    warning: 'border-amber-500/25 bg-amber-500/7',
    critical: 'border-rose-500/25 bg-rose-500/7',
    neutral: 'border-slate-800 bg-slate-950/35',
  };
  const smartInsightIconClass: Record<InsightTone, string> = {
    positive: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-rose-400',
    neutral: 'text-blue-400',
  };
  const getSmartInsightIcon = (tone: InsightTone) => {
    if (tone === 'positive') return <CheckCircle className="w-4 h-4" />;
    if (tone === 'critical') return <ShieldAlert className="w-4 h-4" />;
    if (tone === 'warning') return <AlertTriangle className="w-4 h-4" />;
    return <Info className="w-4 h-4" />;
  };

  // Layer info descriptions
  const layerDescriptions: Record<string, string> = {
    true_color: 'Natural human-eye perspective using Red (B4), Green (B3), and Blue (B2) spectral bands from Sentinel-2 L2A surface reflectance data.',
    false_color: 'Near-Infrared composite (B8, B4, B3). Healthy vegetation appears bright red/magenta. Urban areas appear blue/grey. Water appears dark.',
    ndvi: 'Normalized Difference Vegetation Index: (B8−B4)/(B8+B4). Dense green canopy → dark green. Bare soil → white/tan. Water → blue.',
    classified: 'Model-derived land cover classification with 9 LULC classes mapped from spectral band analysis.'
  };

  const layerStack = [
    {
      key: 'true_color' as const,
      label: 'True Color',
      detail: 'Sentinel-2 RGB',
      hasUrl: !!(tileUrls.trueColor || tileUrls.baselineTrueColor),
      Icon: Globe,
      swatch: '#a9cbd8'
    },
    {
      key: 'false_color' as const,
      label: 'False Color',
      detail: 'NIR composite',
      hasUrl: !!(tileUrls.falseColor || tileUrls.baselineFalseColor),
      Icon: Activity,
      swatch: '#c95757'
    },
    {
      key: 'ndvi' as const,
      label: 'Vegetation',
      detail: 'NDVI index',
      hasUrl: !!(tileUrls.ndvi || tileUrls.baselineNdvi),
      Icon: TrendingUp,
      swatch: '#5f8b55'
    },
    {
      key: 'classified' as const,
      label: 'Land Cover',
      detail: statistics ? `${Object.keys(statistics).length} classes` : 'Classification output',
      hasUrl: !!(tileUrls.classified || tileUrls.baselineClassified),
      Icon: BarChart3,
      swatch: '#e9c947'
    },
  ];

  const availableLayerCount = layerStack.filter(layer => layer.hasUrl).length;
  const activeLayerLabel = activeLayer === 'none'
    ? 'Base Map'
    : layerStack.find(layer => layer.key === activeLayer)?.label || 'Overlay';
  const imageryStatus = loadingMapId
    ? 'Fetching imagery'
    : loadingClassify
      ? 'Classifying'
      : tileUrls.classified
        ? 'Classified'
        : tileUrls.trueColor
          ? 'Imagery ready'
          : 'Awaiting AOI';
  const activePeriodLabel = compareMode
    ? activeTimePeriod === 'target'
      ? `Target ${startDate.slice(0, 4)}`
      : `Baseline ${compareStartDate.slice(0, 4)}`
    : startDate.slice(0, 4) === endDate.slice(0, 4)
      ? `${startDate.slice(0, 4)} season`
      : `${startDate.slice(0, 4)}-${endDate.slice(0, 4)}`;

  return (
    <div className="geo-shell flex flex-col min-h-screen bg-slate-950 text-slate-100 print:bg-white print:text-black">
      {/* Top Navigation */}
      <header className="geo-topbar flex items-center justify-between px-5 py-3 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800 shadow-lg sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-3">
          <div className="geo-brand-mark relative p-2.5 bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-500/20 text-blue-400 rounded-xl" aria-hidden="true">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              GeoClass
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
              Land cover operations workspace
            </p>
          </div>
          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
            District B13
          </span>
        </div>

        {/* Workflow Progress */}
        <WorkflowProgress currentStep={workflowStep} />

        {/* Connection Status + Processing Time */}
        <div className="flex items-center gap-3">
          {processingTime && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 text-[10px] font-semibold">
              <Clock className="w-3 h-3" /> {processingTime}s
            </div>
          )}
          {geeConnected === null ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting...
            </div>
          ) : geeConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              GEE Online
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              GEE Offline
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="geo-workspace flex flex-1 overflow-hidden print:overflow-visible">
        
        {/* Sidebar Controls */}
        <aside 
          className={`geo-sidebar ${sidebarCollapsed ? 'w-14' : 'w-[360px]'} bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden min-h-0 transition-all duration-300 print:hidden`} 
          aria-label="Controls Panel"
        >
          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center py-2 border-b border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronDown className="w-4 h-4 rotate-[-90deg]" /> : <ChevronUp className="w-4 h-4 rotate-[-90deg]" />}
          </button>

          {!sidebarCollapsed && (
            <>
              <div className="geo-sidebar-scroll p-4 space-y-5 flex-1 min-h-0" tabIndex={0} aria-label="Area Settings scroll area">
                <div className="geo-sidebar-title">
                  <span>Area Settings</span>
                  <strong>Sentinel-2 / classification review</strong>
                </div>

                <form className="space-y-2.5" onSubmit={submitLocationSearch}>
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Search className="w-3 h-3" />
                    </div>
                    Find Location
                  </h2>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="search"
                      value={locationQuery}
                      onChange={(e) => {
                        setLocationQuery(e.target.value);
                        setSelectedLocation(null);
                      }}
                      placeholder="Search city, address, landmark"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-8 pr-9 text-xs text-slate-200 outline-none"
                      aria-label="Search map location"
                      autoComplete="off"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {locationLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      ) : locationQuery ? (
                        <button
                          type="button"
                          onClick={clearLocationSearch}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-300"
                          aria-label="Clear location search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {locationSuggestions.length > 0 && (
                    <div className="border border-slate-800 rounded-xl bg-slate-950/35 overflow-hidden" role="listbox" aria-label="Location suggestions">
                      {locationSuggestions.map((location) => (
                        <button
                          type="button"
                          key={location.id}
                          onClick={() => selectLocation(location)}
                          className="w-full px-3 py-2 text-left border-b border-slate-800/60 last:border-b-0 hover:bg-blue-500/8 transition"
                          role="option"
                        >
                          <span className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <span className="min-w-0">
                              <span className="block text-xs font-bold text-slate-300 truncate">{location.shortLabel}</span>
                              <span className="block text-[10px] text-slate-500 leading-snug line-clamp-2">{location.label}</span>
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedLocation && (
                    <div className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-[10px] text-slate-400">
                      <div className="flex items-start justify-between gap-2">
                        <span>
                          <span className="block font-bold text-blue-400 text-xs">{selectedLocation.shortLabel}</span>
                          <span className="block mt-0.5 tabular-nums">
                            {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                          </span>
                        </span>
                        <button
                          type="submit"
                          className="px-2 py-1 rounded-md border border-blue-500/25 text-blue-400 font-bold uppercase hover:bg-blue-500/10"
                        >
                          Zoom
                        </button>
                      </div>
                    </div>
                  )}
                </form>
                
                {/* Step 1: AOI Draw / Upload */}
                <div className="space-y-2.5">
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <span className="text-[10px] font-black">1</span>
                    </div>
                    Area of Interest
                  </h2>
                  {coords.length === 0 ? (
                    <div className="space-y-2">
                      <div className="p-4 bg-slate-950/80 border border-dashed border-slate-700 rounded-xl text-center shadow-inner">
                        <MapPin className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">No area selected</p>
                        <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">Draw on the map or import a boundary file</p>
                      </div>
                      
                      <label className="flex items-center justify-center gap-2 p-2.5 bg-slate-950 border border-slate-800 hover:border-blue-500/30 hover:bg-blue-500/5 rounded-xl cursor-pointer transition-all text-[10px] font-bold text-slate-400 uppercase tracking-wider focus-within:ring-2 focus-within:ring-blue-500 group">
                        <Upload className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span>Upload Boundary File</span>
                        <input
                          type="file"
                          accept=".geojson,.json,.shp"
                          onChange={handleGeoJSONUpload}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-blue-400 rounded-xl flex flex-col gap-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <CheckCircle className="w-4 h-4 text-emerald-400" /> 
                            AOI Selected
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 font-bold border border-slate-800 shadow-inner font-mono">
                            {coords.length} pts
                          </span>
                        </div>
                        {aoiAreaHa !== null && (
                          <div className="text-[11px] text-slate-300 font-medium flex justify-between gap-3 border-t border-blue-500/10 pt-1.5">
                            <span>Estimated Area</span>
                            <span className="font-bold text-blue-300 tabular-nums text-right">
                              {aoiAreaKm2?.toFixed(2)} km² ({Math.round(aoiAreaHa).toLocaleString()} ha)
                            </span>
                          </div>
                        )}
                      </div>
                      {aoiAreaHa !== null && aoiAreaHa > 15000 && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[11px] text-amber-400 leading-normal flex items-start gap-2 animate-in fade-in duration-300">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Large Area Warning:</span> The selected AOI exceeds 15,000 hectares. To prevent Earth Engine memory limits, the system will dynamically optimize resolution.
                          </div>
                        </div>
                      )}
                      <button 
                        onClick={() => handleAOIDrawn([])}
                        className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 hover:border-rose-500/30 hover:text-rose-400 text-slate-500 text-[10px] font-bold uppercase rounded-lg transition cursor-pointer"
                      >
                        Clear AOI
                      </button>
                    </div>
                  )}

                  <div className="geo-aoi-library space-y-2 pt-2 border-t border-slate-800/70">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                        <Bookmark className="w-3 h-3" /> Saved Areas
                      </span>
                      <button
                        type="button"
                        onClick={saveCurrentArea}
                        className="text-[10px] font-bold uppercase text-blue-400 flex items-center gap-1 disabled:opacity-40"
                        disabled={coords.length === 0}
                      >
                        <Save className="w-3 h-3" /> Save
                      </button>
                    </div>
                    <label className="relative block">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="search"
                        value={areaSearch}
                        onChange={(e) => setAreaSearch(e.target.value)}
                        placeholder="Search saved areas"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-8 pr-2 text-xs text-slate-200 outline-none"
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {filteredSavedAreas.map(area => {
                        const areaHa = calculateAOIArea(area.coords);
                        return (
                          <button
                            type="button"
                            key={area.id}
                            onClick={() => selectSavedArea(area)}
                            className={`text-left p-2 rounded-lg border transition ${
                              selectedAreaId === area.id
                                ? 'bg-blue-500/8 border-blue-500/40 text-blue-400'
                                : 'bg-slate-950/50 border-slate-800/50 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span className="flex items-start justify-between gap-2">
                              <span className="min-w-0">
                                <span className="block text-xs font-bold truncate">{area.name}</span>
                                <span className="block text-[10px] text-slate-500">{area.type}</span>
                              </span>
                              <span className="text-[10px] font-bold tabular-nums whitespace-nowrap">
                                {(areaHa / 100).toFixed(1)} km²
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Change Detection Mode Toggle */}
                <div className="p-3 bg-gradient-to-r from-slate-950/40 to-slate-900/20 border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Change Detection</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">Compare temporal shifts</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compareMode}
                      onChange={(e) => {
                        setCompareMode(e.target.checked);
                        setActiveTimePeriod('target');
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {compareMode && (
                  <div className="geo-timeline p-3 border border-slate-800/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" /> Change Timeline
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {timelineBaselineYear} vs {timelineTargetYear}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Baseline</label>
                        <select
                          value={timelineBaselineYear}
                          onChange={(e) => applyBaselineYear(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                        >
                          {timelineYears.map(year => (
                            <option key={year} value={year} disabled={year >= timelineTargetYear}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Target</label>
                        <select
                          value={timelineTargetYear}
                          onChange={(e) => applyTargetYear(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                        >
                          {timelineYears.map(year => (
                            <option key={year} value={year} disabled={year <= timelineBaselineYear}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {timelineYears.map(year => (
                        <button
                          type="button"
                          key={year}
                          onClick={() => {
                            if (year <= timelineBaselineYear) {
                              applyBaselineYear(year);
                            } else if (year >= timelineTargetYear) {
                              applyTargetYear(year);
                            } else if (year - timelineBaselineYear <= timelineTargetYear - year) {
                              applyBaselineYear(year);
                            } else {
                              applyTargetYear(year);
                            }
                          }}
                          className={`h-7 rounded-md border text-[10px] font-bold transition ${
                            year === timelineBaselineYear || year === timelineTargetYear
                              ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                              : year > timelineBaselineYear && year < timelineTargetYear
                                ? 'bg-slate-800 border-slate-700 text-slate-400'
                                : 'bg-slate-950/50 border-slate-800/60 text-slate-500'
                          }`}
                        >
                          {String(year).slice(2)}
                        </button>
                      ))}
                    </div>
                    {temporalValidationMessage && (
                      <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/7 text-[10px] text-rose-400 leading-relaxed flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{temporalValidationMessage}</span>
                      </div>
                    )}
                    {!temporalValidationMessage && !seasonWindowsMatch && (
                      <div className="p-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 text-[10px] text-amber-500 leading-relaxed flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>Baseline and target seasons differ. Results are still valid, but seasonal effects may look like land-cover change.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Date Filters */}
                <div className="space-y-3">
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <span className="text-[10px] font-black">2</span>
                    </div>
                    Imagery Settings
                  </h2>
                  
                  {/* Target Period */}
                  <div className="space-y-2">
                    {compareMode && (
                      <span className="text-[10px] font-extrabold uppercase text-blue-400 tracking-wide block border-b border-slate-800 pb-1 flex items-center gap-1.5">
                        <Target className="w-3 h-3" /> Target Period
                      </span>
                    )}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase block" htmlFor="start-date-input">Start</label>
                        <input
                          id="start-date-input"
                          type="date"
                          value={startDate}
                          onChange={(e) => updateTargetStartDate(e.target.value)}
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 transition font-medium cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase block" htmlFor="end-date-input">End</label>
                        <input
                          id="end-date-input"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 transition font-medium cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Baseline Period (Compare Mode only) */}
                  {compareMode && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wide block border-b border-slate-800 pb-1 flex items-center gap-1.5">
                        <Activity className="w-3 h-3" /> Baseline Period
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase block" htmlFor="baseline-start-input">Start</label>
                        <input
                          id="baseline-start-input"
                          type="date"
                          value={compareStartDate}
                            onChange={(e) => updateBaselineStartDate(e.target.value)}
                            onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 transition font-medium cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase block" htmlFor="baseline-end-input">End</label>
                          <input
                            id="baseline-end-input"
                            type="date"
                            value={compareEndDate}
                            onChange={(e) => setCompareEndDate(e.target.value)}
                            onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 transition font-medium cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {temporalValidationMessage && !compareMode && (
                    <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/7 text-[10px] text-rose-400 leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{temporalValidationMessage}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                      <span>Max Cloud Cover</span>
                      <span className="text-blue-400 font-mono text-xs">{cloudCover}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      aria-label="Max Cloud Cover Percentage"
                      value={cloudCover}
                      onChange={(e) => setCloudCover(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>

                  {/* Action: Pull Raw S2 */}
                  <button
                    onClick={fetchSatelliteImagery}
                    disabled={loadingMapId || coords.length === 0 || !!temporalValidationMessage}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700 shadow-md disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer active:scale-[0.98]"
                  >
                    {loadingMapId ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Fetching Composites...
                      </>
                    ) : (
                      <>
                        <Satellite className="w-4 h-4 text-blue-400" /> Fetch Satellite Imagery
                      </>
                    )}
                  </button>
                </div>

                {/* Step 3: Classifier Configuration */}
                <div className="space-y-3">
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <span className="text-[10px] font-black">3</span>
                    </div>
                    Classification
                  </h2>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block" htmlFor="model-select">Model</label>
                    <select
                      id="model-select"
                      value={modelType}
                      onChange={(e) => setModelType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition font-medium"
                    >
                      <option value="random_forest">Smile Random Forest (On-the-fly Training)</option>
                      <option value="dynamic_world">Dynamic World (10m Near-RT Labels)</option>
                    </select>
                  </div>

                  {/* Random Forest Advanced Panel Toggle */}
                  {modelType === 'random_forest' && (
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                      <button 
                        onClick={() => setShowConfig(!showConfig)}
                        aria-expanded={showConfig}
                        className="w-full p-2.5 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-800/30 transition focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <span className="flex items-center gap-1.5">
                          <Settings className="w-3 h-3" /> Hyperparameters
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
                      </button>

                      {showConfig && (
                        <div className="p-3 border-t border-slate-800 space-y-3 bg-slate-950/30">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                              <span>Decision Trees</span>
                              <span className="text-blue-400 font-mono text-xs">{numTrees}</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="250"
                              step="10"
                              aria-label="Number of Decision Trees"
                              value={numTrees}
                              onChange={(e) => setNumTrees(parseInt(e.target.value))}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                              <span>Samples per Class</span>
                              <span className="text-blue-400 font-mono text-xs">{samplePoints} px</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="500"
                              step="25"
                              aria-label="Training Sample Points per Class"
                              value={samplePoints}
                              onChange={(e) => setSamplePoints(parseInt(e.target.value))}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action: Run Classifier */}
                  <button
                    onClick={runClassification}
                    disabled={loadingClassify || coords.length === 0 || !!temporalValidationMessage}
                    className="geo-primary-action w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer active:scale-[0.98]"
                  >
                    {loadingClassify ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Classification in Progress...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Run Classification</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Step 4: Layer Stack */}
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <span className="text-[10px] font-black">4</span>
                      </div>
                      Layer Stack
                    </h2>
                    <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                      {availableLayerCount}/4 ready
                    </span>
                  </div>

                  <div className="geo-layer-stack border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                    <button
                      onClick={() => { setActiveLayer('none'); setActiveInfoTab('none'); }}
                      className={`geo-layer-row w-full px-3 py-2.5 text-left border-b border-slate-800/70 transition-all ${
                        activeLayer === 'none'
                          ? 'bg-blue-500/8 text-blue-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-md border border-slate-800 flex items-center justify-center bg-slate-900">
                          <Eye className="w-3.5 h-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold">Base Map</span>
                          <span className="block text-[10px] text-slate-500">District reference map</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase">
                          {activeLayer === 'none' ? 'Visible' : 'Base'}
                        </span>
                      </span>
                    </button>

                    {layerStack.map(layer => (
                      <div key={layer.key} className="border-b border-slate-800/70 last:border-b-0">
                        <button
                          type="button"
                          disabled={!layer.hasUrl}
                          onClick={() => {
                            if (!layer.hasUrl) return;
                            setActiveLayer(layer.key);
                            setActiveInfoTab(activeInfoTab === layer.key ? 'none' : layer.key);
                          }}
                          className={`geo-layer-row w-full px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-55 ${
                            activeLayer === layer.key
                              ? 'bg-blue-500/8 text-blue-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="w-7 h-7 rounded-md border border-slate-800 flex items-center justify-center bg-slate-900"
                              style={{ boxShadow: layer.hasUrl ? `inset 3px 0 0 ${layer.swatch}` : undefined }}
                            >
                              <layer.Icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-bold">{layer.label}</span>
                              <span className="block text-[10px] text-slate-500">{layer.detail}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase">
                                {layer.hasUrl ? (activeLayer === layer.key ? 'Visible' : 'Ready') : 'Waiting'}
                              </span>
                              <Info className={`w-3 h-3 transition-opacity ${activeInfoTab === layer.key ? 'opacity-100 text-blue-400' : 'opacity-35'}`} />
                            </span>
                          </span>
                        </button>
                        {activeInfoTab === layer.key && layer.hasUrl && (
                          <p className="text-[10px] text-slate-500 bg-slate-950/60 px-3 py-2 leading-relaxed border-t border-slate-800/50 animate-in fade-in duration-200">
                            {layerDescriptions[layer.key]}
                          </p>
                        )}
                      </div>
                    ))}
                    <div className="border-t border-slate-800/70">
                      <button
                        type="button"
                        disabled={!confidenceReady}
                        onClick={() => setConfidenceVisible(value => !value)}
                        className={`geo-layer-row w-full px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-55 ${
                          confidenceVisible
                            ? 'bg-blue-500/8 text-blue-400'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="w-7 h-7 rounded-md border border-slate-800 flex items-center justify-center bg-slate-900"
                            style={{ boxShadow: 'inset 3px 0 0 #f0a442' }}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold">Confidence Mask</span>
                            <span className="block text-[10px] text-slate-500">
                              {confidenceReady ? `Review below ${confidenceThreshold}%` : 'Available after classification'}
                            </span>
                          </span>
                          <span className="text-[10px] font-bold uppercase">
                            {!confidenceReady ? 'Waiting' : confidenceVisible ? 'On' : 'Ready'}
                          </span>
                        </span>
                      </button>
                      {confidenceReady && confidenceVisible && (
                        <div className="px-3 py-2 border-t border-slate-800/50 space-y-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                            <span>Confidence Threshold</span>
                            <span className="font-mono text-xs text-blue-400">{confidenceThreshold}%</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="95"
                            value={confidenceThreshold}
                            onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            aria-label="Confidence threshold"
                          />
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="p-2 rounded-md border border-slate-800/60 bg-slate-950/35">
                              <span className="block text-[9px] uppercase font-bold text-slate-500">Avg</span>
                              <span className="text-xs font-bold text-slate-300">{confidenceReview.averageScore}%</span>
                            </div>
                            <div className="p-2 rounded-md border border-slate-800/60 bg-slate-950/35">
                              <span className="block text-[9px] uppercase font-bold text-slate-500">Review</span>
                              <span className="text-xs font-bold text-slate-300">{confidenceReview.reviewCells}</span>
                            </div>
                            <div className="p-2 rounded-md border border-slate-800/60 bg-slate-950/35">
                              <span className="block text-[9px] uppercase font-bold text-slate-500">Focus</span>
                              <span className="text-xs font-bold text-slate-300 capitalize">{confidenceReview.focusZone}</span>
                            </div>
                          </div>
                          <p className="text-[10px] leading-relaxed text-slate-500">
                            Cells below threshold are painted amber; critical review cells are red.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                      <span>Overlay Opacity</span>
                      <span className="font-mono text-xs text-blue-400">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      aria-label="Map Overlay Opacity"
                      value={opacity * 100}
                      disabled={availableLayerCount === 0 || activeLayer === 'none'}
                      onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <span className="text-[10px] font-black">5</span>
                    </div>
                    Field Tools
                  </h2>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMeasurementMode(value => !value)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-2 ${
                        measurementMode
                          ? 'bg-blue-500/8 border-blue-500/40 text-blue-400'
                          : 'bg-slate-950/50 border-slate-800/50 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <Ruler className="w-3.5 h-3.5" /> Measure
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteMode(value => !value)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-2 ${
                        noteMode
                          ? 'bg-blue-500/8 border-blue-500/40 text-blue-400'
                          : 'bg-slate-950/50 border-slate-800/50 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <StickyNote className="w-3.5 h-3.5" /> Notes
                    </button>
                  </div>

                  {noteMode && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase block" htmlFor="note-draft-input">Next note text</label>
                      <input
                        id="note-draft-input"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                        placeholder="Field observation"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                    <div className="p-2 rounded-lg border border-slate-800/60 bg-slate-950/40">
                      Notes: <span className="text-blue-400">{mapNotes.length}</span>
                    </div>
                    <div className="p-2 rounded-lg border border-slate-800/60 bg-slate-950/40">
                      Mode: <span className="text-blue-400">{measurementMode ? 'Measure' : noteMode ? 'Notes' : 'Pan'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export & Print Options */}
              {tileUrls.classified && (
                <div className="p-4 border-t border-slate-800 bg-slate-950/30 space-y-3">
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-blue-400" /> Export Results
                  </h2>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block" htmlFor="format-select">Format</label>
                    <select
                      id="format-select"
                      value={downloadFormat}
                      onChange={(e) => setDownloadFormat(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <option value="geotiff">GeoTIFF (Spatial Raster)</option>
                      <option value="png">PNG (Colorized Map View)</option>
                      <option value="geojson">GeoJSON (Vector Boundary)</option>
                      <option value="kml">KML (Google Earth)</option>
                    </select>
                  </div>

                  <button
                    onClick={triggerDownload}
                    disabled={downloading}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 hover:border-slate-700 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer active:scale-[0.98]"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> Generating Export...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-blue-400" /> Download
                      </>
                    )}
                  </button>

                  <button
                    onClick={printReport}
                    className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-slate-800/50 border border-slate-800/50 text-slate-400 text-[10px] font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-3 h-3" /> Print Report (PDF)
                  </button>
                </div>
              )}
            </>
          )}
        </aside>

        {/* Center/Right Map and Charts Workspace */}
        <main className="geo-main flex-1 flex flex-col p-5 gap-5 overflow-y-auto print:p-0 print:gap-0">
          
          {/* Notification Messages */}
          <div className="space-y-2">
            {errorMessage && (
              <Notification type="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
            )}
            {successMessage && (
              <Notification type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
            )}
          </div>

          <section className="geo-quality-strip grid grid-cols-2 xl:grid-cols-6 gap-2 print:hidden" aria-label="Imagery quality summary">
            <div className="geo-quality-item">
              <Satellite className="w-4 h-4" />
              <span>
                <small>Scene Status</small>
                <strong>{imageryStatus}</strong>
              </span>
            </div>
            <div className="geo-quality-item">
              <MapPin className="w-4 h-4" />
              <span>
                <small>AOI</small>
                <strong>{aoiAreaKm2 ? `${aoiAreaKm2.toFixed(2)} km² (${Math.round(aoiAreaHa || 0).toLocaleString()} ha)` : 'Not selected'}</strong>
              </span>
            </div>
            <div className="geo-quality-item">
              <Target className="w-4 h-4" />
              <span>
                <small>Period</small>
                <strong>{activePeriodLabel}</strong>
              </span>
            </div>
            <div className="geo-quality-item">
              <Activity className="w-4 h-4" />
              <span>
                <small>Cloud Limit</small>
                <strong>{cloudCover}% max</strong>
              </span>
            </div>
            <div className="geo-quality-item">
              <Layers className="w-4 h-4" />
              <span>
                <small>Layers</small>
                <strong>{availableLayerCount} ready</strong>
              </span>
            </div>
            <div className="geo-quality-item">
              <Eye className="w-4 h-4" />
              <span>
                <small>Active View</small>
                <strong>
                  {activeLayerLabel} {activeLayer !== 'none' ? `${Math.round(opacity * 100)}%` : ''}
                  {confidenceVisible ? ` + ${confidenceReview.reviewCells} review cells` : ''}
                </strong>
              </span>
            </div>
          </section>

          {/* Map Viewer Container */}
          <div className="geo-map-frame relative flex-shrink-0 print:hidden" style={{ height: 'clamp(430px, 58vh, 720px)' }}>
            {/* Draggable Temporal View Swapper (Floating on top of Map) — hidden when swipe active */}
            {compareMode && !swipeActive && (tileUrls.classified || tileUrls.trueColor || tileUrls.baselineClassified || tileUrls.baselineTrueColor) && (
              <DraggableContainer centerHorizontally defaultPosition={{ x: 0, y: 16 }} zIndex={1002}>
                <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-2xl flex gap-1 cursor-grab active:cursor-grabbing">
                  <button
                    onClick={() => setActiveTimePeriod('target')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                      activeTimePeriod === 'target'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    Target ({startDate.split('-')[0]})
                  </button>
                  <button
                    onClick={() => setActiveTimePeriod('baseline')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                      activeTimePeriod === 'baseline'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    Baseline ({compareStartDate.split('-')[0]})
                  </button>
                </div>
              </DraggableContainer>
            )}

            {/* Loading Overlay */}
            {(loadingMapId || loadingClassify) && (
              <div className="absolute inset-0 z-[999] bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-6 flex flex-col items-center gap-3 shadow-2xl">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    {loadingMapId ? (
                      <Satellite className="w-5 h-5 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    ) : (
                      <Zap className="w-5 h-5 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-200">
                      {loadingMapId ? 'Fetching Satellite Imagery' : 'Running Classification'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {loadingMapId ? 'Processing Sentinel-2 composites on Earth Engine servers...' : 'Training classifier and mapping pixels on Earth Engine servers...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
            />
          </div>

          {/* Print Header */}
          <div className="hidden print:block mb-8">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">GeoClass Environmental Summary Report</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Study Period: {startDate} to {endDate} 
                  {compareMode && ` | Baseline: ${compareStartDate} to ${compareEndDate}`} 
                  | Model: {modelType === 'random_forest' ? 'Smile Random Forest' : 'Dynamic World 10m'}
                  {processingTime && ` | Processing: ${processingTime}s`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Study Area</p>
                <p className="text-xl font-extrabold text-slate-800">{totalAreaHa ? `${totalAreaHa.toLocaleString()} ha` : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Smart Result Summary */}
          {statistics && smartResultSummary.length > 0 && (
            <section className="geo-panel bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 print:bg-white print:border-slate-400 print:shadow-none print:p-4">
              <div className="flex flex-col gap-3 border-b border-slate-800 pb-3 print:border-slate-400 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 print:text-black print:text-lg">
                    <FileText className="w-5 h-5 text-blue-400 print:text-black" /> Smart Result Summary
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 print:text-slate-600">
                    Operational findings generated from the classification statistics and uncertainty review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfidenceVisible(value => !value)}
                  className={`px-3 py-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-2 transition print:hidden ${
                    confidenceVisible
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {confidenceVisible ? 'Hide Confidence Mask' : 'Show Confidence Mask'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 print:grid-cols-2">
                {smartResultSummary.map((insight) => (
                  <div
                    key={insight.label}
                    className={`p-4 rounded-xl border ${smartInsightToneClass[insight.tone]} print:border-slate-400 print:bg-white`}
                  >
                    <div className={`flex items-center justify-between gap-3 ${smartInsightIconClass[insight.tone]} print:text-black`}>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 print:text-slate-600">
                        {insight.label}
                      </span>
                      {getSmartInsightIcon(insight.tone)}
                    </div>
                    <p className="text-lg font-bold text-slate-100 mt-2 print:text-black">{insight.value}</p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-2 print:text-slate-700">{insight.detail}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-bold text-slate-500 print:text-slate-700">
                <div className="p-2.5 rounded-lg border border-slate-800/60 bg-slate-950/35 print:bg-white print:border-slate-300">
                  Avg Confidence <span className="block text-sm text-slate-200 print:text-black">{confidenceReview.averageScore}%</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-800/60 bg-slate-950/35 print:bg-white print:border-slate-300">
                  Review Cells <span className="block text-sm text-slate-200 print:text-black">{confidenceReview.reviewCells}/{confidenceReview.totalCells}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-800/60 bg-slate-950/35 print:bg-white print:border-slate-300">
                  Critical Cells <span className="block text-sm text-slate-200 print:text-black">{confidenceReview.criticalCells}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-800/60 bg-slate-950/35 print:bg-white print:border-slate-300">
                  Review Focus <span className="block text-sm text-slate-200 capitalize print:text-black">{confidenceReview.focusZone}</span>
                </div>
              </div>
            </section>
          )}

          {/* Temporal Change Detection Shift Matrix (Compare Mode only) */}
          {compareMode && statistics && referenceStatistics && (
            <section className="geo-panel bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 print:bg-white print:border-none print:shadow-none print:p-0 print:mt-6">
              <div className="border-b border-slate-800 pb-3 print:border-b-2 print:border-slate-900 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 print:text-black print:text-lg">
                  <TrendingUp className="w-5 h-5 text-blue-400 print:text-black" /> Temporal LULC Change Matrix
                </h3>
                <span className="text-[10px] px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold uppercase rounded-lg">
                  Target {startDate.split('-')[0]} vs Baseline {compareStartDate.split('-')[0]}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3">
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
                      className={`p-3.5 rounded-xl border bg-slate-950/30 flex items-center justify-between transition-all hover:border-slate-700 ${changeTone.borderClass} print:border-slate-350 print:text-black print:bg-white`}
                    >
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 print:text-slate-600 block">{className}</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg font-bold text-slate-200 print:text-black">{valCurrent.area_ha.toLocaleString()} ha</span>
                          <span className="text-[10px] text-slate-600 font-semibold print:text-slate-600">vs {valRef.area_ha.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className={`flex flex-col items-end ${changeTone.textClass} print:text-black`}>
                        <span className="text-sm font-bold flex items-center gap-1">
                          {areaChange < 0 ? (
                            <TrendingDown className={`w-4 h-4 ${changeTone.iconClass} print:text-black`} />
                          ) : areaChange > 0 ? (
                            <TrendingUp className={`w-4 h-4 ${changeTone.iconClass} print:text-black`} />
                          ) : null}
                          {areaChange > 0 ? '+' : ''}{areaChange.toFixed(1)} ha
                        </span>
                        <span className="text-[10px] font-semibold mt-0.5">
                          {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Analytics Section */}
          <section className="geo-panel bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-5 print:bg-white print:border-none print:shadow-none print:p-0">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 print:border-b-2 print:border-slate-900">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 print:text-black print:text-lg">
                <BarChart3 className="w-5 h-5 text-blue-400 print:text-black" /> Classification Analytics
              </h3>

              {statistics && (
                <button
                  onClick={printReport}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition print:hidden cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </button>
              )}
            </div>
            
            <DashboardCharts statistics={statistics} totalArea={totalAreaHa} />
          </section>

          {/* Environmental Insights */}
          {statistics && reportInsights && (
            <section className="geo-panel bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 print:bg-white print:border-none print:shadow-none print:p-0 print:mt-12">
              <div className="border-b border-slate-800 pb-3 print:border-b-2 print:border-slate-900">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 print:text-black print:text-lg">
                  <FileText className="w-5 h-5 text-blue-400 print:text-black" /> Environmental Assessment
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
                {/* Health Rating */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${reportInsights.healthColor} print:border-slate-400 print:text-black`}>
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 print:text-slate-600">Eco-Health Rating</h4>
                    <p className="text-base font-bold mt-2 leading-snug">{reportInsights.healthStatus}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold mt-4 print:hidden">
                    {reportInsights.healthIcon} Assessment
                  </div>
                </div>

                {/* Dominant Class */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 print:border-slate-400 print:text-black">
                  <h4 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 print:text-slate-600">Dominant Land Cover</h4>
                  <p className="text-2xl font-bold mt-2 text-slate-100 print:text-black">{reportInsights.dominantClass}</p>
                  <p className="text-xs text-slate-400 mt-1 font-semibold print:text-slate-600">
                    Covers <span className="text-blue-400 font-bold print:text-black">{reportInsights.dominantPct}%</span> of total area
                  </p>
                </div>

                {/* Natural Index vs Built Ratio */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 print:border-slate-400 print:text-black">
                  <h4 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 print:text-slate-600">Ecology Index</h4>
                  <p className="text-2xl font-bold mt-2 text-slate-100 print:text-black">{reportInsights.naturalIndex}%</p>
                  <p className="text-xs text-slate-400 mt-1 font-semibold print:text-slate-600">
                    Natural land vs <span className="text-rose-400 font-bold print:text-black">{reportInsights.urbanPct}%</span> built-up
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl space-y-2.5 print:bg-white print:border-slate-400 print:text-black">
                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-300 print:text-black">Conservation Guidelines</h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 leading-relaxed print:text-slate-700">
                  {reportInsights.recommendations.map((rec, index) => (
                    <li key={index} className="pl-1">
                      <span className="text-slate-300 font-medium print:text-black">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

        </main>

      </div>
    </div>
  );
}
