import { ClassData } from './types';

export const MAX_AOI_HA = 50000;
export const CONFIDENCE_ROWS = 5;
export const CONFIDENCE_COLS = 6;
export const VEGETATION_CLASSES = ['Forest', 'Grass', 'Wetland', 'Agriculture', 'Shrub'];

export const calculateAOIArea = (polygonCoords: number[][]): number => {
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

export const formatHectares = (value: number) => `${Math.abs(value).toFixed(1)} ha`;

export const getYearFromDate = (value: string) => {
  const parsed = Number(value.slice(0, 4));
  return Number.isFinite(parsed) ? parsed : null;
};

export const getClassArea = (stats: Record<string, ClassData> | undefined, classNames: string[]) => {
  if (!stats) return 0;
  return classNames.reduce((total, className) => total + (stats[className]?.area_ha || 0), 0);
};

export const getSingleClassArea = (stats: Record<string, ClassData> | undefined, className: string) => (
  stats?.[className]?.area_ha || 0
);

export const createBoundingBoxAOI = (lat: number, lng: number, sizeKm = 5): number[][] => {
  const half = sizeKm / 2;
  const dLat = half / 111.32;
  const dLng = half / (111.32 * Math.cos((lat * Math.PI) / 180));
  const minLat = Number((lat - dLat).toFixed(6));
  const maxLat = Number((lat + dLat).toFixed(6));
  const minLng = Number((lng - dLng).toFixed(6));
  const maxLng = Number((lng + dLng).toFixed(6));
  return [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ];
};

export const parseCoordinateQuery = (query: string): { lat: number; lng: number } | null => {
  const cleaned = query.replace(/[\[\]\(\)\{\}]/g, '').trim();
  if (!cleaned) return null;

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

export const getLocationZoom = (type?: string) => {
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

export const getConfidenceScore = (row: number, col: number) => (
  58 + Math.round(Math.abs(Math.sin((row + 1.7) * (col + 2.3))) * 38)
);

export const getConfidenceReview = (threshold: number) => {
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

export const getTemporalChangeTone = (className: string, areaChange: number) => {
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
