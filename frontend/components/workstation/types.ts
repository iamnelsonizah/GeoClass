export interface ClassData {
  id: number;
  area_ha: number;
  pixel_count: number;
  percentage: number;
}

export interface SavedArea {
  id: string;
  name: string;
  type: string;
  center: [number, number];
  zoom: number;
  coords: number[][];
}

export interface MapNote {
  id: string;
  title: string;
  body: string;
  lat: number;
  lng: number;
}

export interface LocationSuggestion {
  id: string;
  label: string;
  shortLabel: string;
  lat: number;
  lng: number;
  type?: string;
}

export type InsightTone = 'positive' | 'warning' | 'critical' | 'neutral';

export interface SmartInsight {
  label: string;
  value: string;
  detail: string;
  tone: InsightTone;
}

export const LULC_CLASS_NAMES = [
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

export const LULC_COLORS: Record<string, string> = {
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

export const SAVED_AREAS: SavedArea[] = [
  {
    id: 'sf-bay',
    name: 'San Francisco Peninsula & Central',
    type: 'Coastal region',
    center: [37.77, -122.42],
    zoom: 11,
    coords: [
      [-122.525, 37.845],
      [-122.365, 37.840],
      [-122.355, 37.695],
      [-122.515, 37.700],
      [-122.525, 37.845],
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
