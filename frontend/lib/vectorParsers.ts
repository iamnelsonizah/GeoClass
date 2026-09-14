import { kml as parseKml, gpx as parseGpx } from '@tmcw/togeojson';
import JSZip from 'jszip';
import shp from 'shpjs';

export interface ParsedVectorResult {
  coordinates: number[][];
  format: string;
  featureCount: number;
  info?: string;
}

/**
 * Calculates approximate planar area of a ring for ranking/selecting the primary polygon.
 */
function getRingArea(ring: number[][]): number {
  if (!ring || ring.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i];
    const p2 = ring[i + 1];
    area += (p2[0] - p1[0]) * (p2[1] + p1[1]);
  }
  return Math.abs(area / 2);
}

/**
 * Ensures the polygon coordinate ring is closed (first coord equals last coord).
 */
function ensureClosedRing(coords: number[][]): number[][] {
  if (coords.length < 3) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...coords, [first[0], first[1]]];
  }
  return coords;
}

/**
 * Extracts polygon rings from any GeoJSON structure (Feature, FeatureCollection, Geometry, or array).
 */
function extractPolygonRings(geo: any): number[][][] {
  const rings: number[][][] = [];

  const processGeometry = (geom: any) => {
    if (!geom || !geom.type) return;

    if (geom.type === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
      rings.push(geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
      for (const poly of geom.coordinates) {
        if (Array.isArray(poly) && poly.length > 0) {
          rings.push(poly[0]);
        }
      }
    } else if (geom.type === 'GeometryCollection' && Array.isArray(geom.geometries)) {
      for (const subGeom of geom.geometries) {
        processGeometry(subGeom);
      }
    }
  };

  const processFeature = (feature: any) => {
    if (!feature) return;
    if (feature.geometry) {
      processGeometry(feature.geometry);
    }
  };

  if (Array.isArray(geo)) {
    for (const item of geo) {
      rings.push(...extractPolygonRings(item));
    }
  } else if (geo.type === 'FeatureCollection' && Array.isArray(geo.features)) {
    for (const feat of geo.features) {
      processFeature(feat);
    }
  } else if (geo.type === 'Feature') {
    processFeature(geo);
  } else {
    processGeometry(geo);
  }

  return rings;
}

/**
 * If no polygons exist, extract all coordinate points (e.g. from LineString / GPX tracks)
 * and generate a bounding rectangle polygon.
 */
function extractFallbackBoundingBox(geo: any): number[][] | null {
  const points: number[][] = [];

  const collectPoints = (item: any) => {
    if (!item) return;
    if (Array.isArray(item) && typeof item[0] === 'number' && typeof item[1] === 'number') {
      points.push([item[0], item[1]]);
      return;
    }
    if (Array.isArray(item)) {
      for (const sub of item) collectPoints(sub);
      return;
    }
    if (item.coordinates) collectPoints(item.coordinates);
    if (item.geometry) collectPoints(item.geometry);
    if (item.features) {
      for (const f of item.features) collectPoints(f);
    }
  };

  collectPoints(geo);

  if (points.length < 2) return null;

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // Minimum bounding box with small buffer if flat
  if (minLng === maxLng) { minLng -= 0.005; maxLng += 0.005; }
  if (minLat === maxLat) { minLat -= 0.005; maxLat += 0.005; }

  return [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ];
}

/**
 * Parses any supported vector file (GeoJSON, KML, KMZ, Shapefile .zip, GPX)
 * and returns the outer ring coordinates formatted for AOI use.
 */
export async function parseVectorFile(file: File): Promise<ParsedVectorResult> {
  const fileName = file.name.toLowerCase();
  let geojson: any = null;
  let formatName = 'GeoJSON';

  if (fileName.endsWith('.kml')) {
    formatName = 'KML';
    const text = await file.text();
    const dom = new DOMParser().parseFromString(text, 'text/xml');
    const parseError = dom.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid KML XML document structure.');
    }
    geojson = parseKml(dom);
  } else if (fileName.endsWith('.kmz')) {
    formatName = 'KMZ';
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Find the primary KML file inside the KMZ archive
    const kmlFile = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.kml') && !f.dir);
    if (!kmlFile) {
      throw new Error('No .kml document found inside the KMZ archive.');
    }
    const kmlText = await kmlFile.async('text');
    const dom = new DOMParser().parseFromString(kmlText, 'text/xml');
    geojson = parseKml(dom);
  } else if (fileName.endsWith('.gpx')) {
    formatName = 'GPX';
    const text = await file.text();
    const dom = new DOMParser().parseFromString(text, 'text/xml');
    const parseError = dom.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid GPX XML document structure.');
    }
    geojson = parseGpx(dom);
  } else if (fileName.endsWith('.zip')) {
    formatName = 'Shapefile';
    const arrayBuffer = await file.arrayBuffer();
    try {
      geojson = await shp(arrayBuffer);
    } catch (err: any) {
      throw new Error(
        `Failed to parse Shapefile archive: ${err?.message || 'ensure the .zip contains .shp, .shx, and .dbf files'}`
      );
    }
  } else if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
    formatName = 'GeoJSON';
    const text = await file.text();
    try {
      geojson = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON format in uploaded file.');
    }
  } else {
    throw new Error('Unsupported file format. Please upload .geojson, .kml, .kmz, .zip (Shapefile), or .gpx.');
  }

  if (!geojson) {
    throw new Error(`Failed to extract vector geometry from ${formatName} file.`);
  }

  // Extract all polygon rings
  const rings = extractPolygonRings(geojson);

  if (rings.length > 0) {
    // Select the largest polygon ring by area
    let bestRing = rings[0];
    let maxArea = getRingArea(bestRing);

    for (let i = 1; i < rings.length; i++) {
      const currentArea = getRingArea(rings[i]);
      if (currentArea > maxArea) {
        maxArea = currentArea;
        bestRing = rings[i];
      }
    }

    const closedCoords = ensureClosedRing(bestRing);
    const info = rings.length > 1
      ? `Selected largest polygon from ${rings.length} found boundaries.`
      : undefined;

    return {
      coordinates: closedCoords,
      format: formatName,
      featureCount: rings.length,
      info,
    };
  }

  // Fallback: Check if bounding box can be constructed from track/point geometries
  const bbox = extractFallbackBoundingBox(geojson);
  if (bbox) {
    return {
      coordinates: bbox,
      format: formatName,
      featureCount: 1,
      info: 'Generated bounding AOI from line/point coordinates.',
    };
  }

  throw new Error(`No polygon or line coordinates could be found in the ${formatName} file.`);
}
