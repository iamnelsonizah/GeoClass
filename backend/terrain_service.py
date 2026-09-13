import os
import math
import logging
from typing import List, Dict, Any, Optional
import ee

from classifier import LULC_CLASSES

logger = logging.getLogger(__name__)

# Slope visualization palette (Degrees 0 to 45+)
# 0-5 (Flat): #2ecc71 (Green)
# 5-15 (Gentle): #f1c40f (Yellow)
# 15-25 (Moderate): #e67e22 (Orange)
# 25-35 (Steep): #e74c3c (Red)
# >35 (Cliff/Hazard): #8e44ad (Purple/Crimson)
SLOPE_PALETTE = ['2ecc71', 'f1c40f', 'e67e22', 'e74c3c', '8e44ad']

# Topographic elevation terrain colormap
ELEVATION_PALETTE = [
    '006633', # Dark Green (Lowlands)
    '339933', # Medium Green
    '99cc66', # Pale Green
    'ffff99', # Pale Yellow (Midlands)
    'ffcc66', # Warm Sand
    'cc9966', # Brown (Highlands)
    '996633', # Deep Brown
    'ffffff'  # Snow/Peak White
]

SLOPE_TIERS = [
    {"id": 0, "name": "Flat (0–5°)", "min": 0, "max": 5, "color": "#2ecc71", "hazard": "Very Low (Sedimentation/Runoff basin)"},
    {"id": 1, "name": "Gentle (5–15°)", "min": 5, "max": 15, "color": "#f1c40f", "hazard": "Low (Good for infrastructure)"},
    {"id": 2, "name": "Moderate (15–25°)", "min": 15, "max": 25, "color": "#e67e22", "hazard": "Medium (Moderate runoff/erosion risk)"},
    {"id": 3, "name": "Steep (25–35°)", "min": 25, "max": 35, "color": "#e74c3c", "hazard": "High (Severe erosion & rockfall risk)"},
    {"id": 4, "name": "Extreme Cliff (>35°)", "min": 35, "max": 90, "color": "#8e44ad", "hazard": "Critical (Severe landslide & structural failure)"}
]

def get_copernicus_dem(aoi: Optional[ee.Geometry] = None) -> ee.Image:
    """
    Fetches the Copernicus 30m Global DEM (GLO-30) for the given AOI.
    Preserves default projection so that ee.Terrain.slope calculates accurate degree gradients.
    Falls back to USGS 30m SRTM if Copernicus is unavailable.
    """
    try:
        dem_col = ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").select("DEM")
        proj = dem_col.first().projection()
        dem = dem_col.mosaic().setDefaultProjection(proj).rename("elevation")
        return dem
    except Exception as e:
        logger.warning(f"Failed to load Copernicus GLO30_2024_1, trying fallback: {e}")
        try:
            dem_col = ee.ImageCollection("COPERNICUS/DEM/GLO30").select("DEM")
            proj = dem_col.first().projection()
            return dem_col.mosaic().setDefaultProjection(proj).rename("elevation")
        except Exception:
            return ee.Image("USGS/SRTMGL1_003").rename("elevation")

def compute_terrain_metrics(
    aoi_coords: List[List[float]],
    start_date: str = "2024-01-01",
    end_date: str = "2024-12-31"
) -> Dict[str, Any]:
    """
    Computes topographic elevation, slope stability classes, aspect,
    LULC x slope cross-hazard matrix, and map tile URLs.
    """
    ring_coords = aoi_coords if not (len(aoi_coords) > 0 and isinstance(aoi_coords[0][0], list)) else aoi_coords[0]
    if ring_coords and ring_coords[0] != ring_coords[-1]:
        ring_coords = list(ring_coords) + [ring_coords[0]]

    aoi = ee.Geometry.Polygon([ring_coords])
    
    # 1. Calculate AOI area to determine scale adaptively
    try:
        area_ha = aoi.area().divide(10000).getInfo()
    except Exception:
        area_ha = 5000

    if area_ha > 500000:
        scale = 120
    elif area_ha > 100000:
        scale = 60
    elif area_ha > 30000:
        scale = 30
    elif area_ha > 10000:
        scale = 20
    else:
        scale = 10

    api_key = os.getenv("GEE_API_KEY") or os.getenv("GOOGLE_API_KEY")

    # 2. Extract DEM, Slope, Aspect, and Hillshade
    dem = get_copernicus_dem(aoi)
    slope = ee.Terrain.slope(dem).rename("slope")
    aspect = ee.Terrain.aspect(dem).rename("aspect")
    hillshade = ee.Terrain.hillshade(dem, 315, 45).rename("hillshade")

    # 3. Compute Elevation Statistics (Min, Max, Mean, Relief)
    elev_stats = dem.reduceRegion(
        reducer=ee.Reducer.min().combine(
            reducer2=ee.Reducer.max(), sharedInputs=True
        ).combine(
            reducer2=ee.Reducer.mean(), sharedInputs=True
        ),
        geometry=aoi,
        scale=scale,
        maxPixels=1e10,
        bestEffort=True
    ).getInfo()

    min_elev = float(elev_stats.get("elevation_min") or 0.0)
    max_elev = float(elev_stats.get("elevation_max") or 0.0)
    mean_elev = float(elev_stats.get("elevation_mean") or 0.0)
    relief_m = max(0.0, max_elev - min_elev)

    # 4. Compute Slope Statistics (Mean, Max)
    slope_stats = slope.reduceRegion(
        reducer=ee.Reducer.mean().combine(
            reducer2=ee.Reducer.max(), sharedInputs=True
        ),
        geometry=aoi,
        scale=scale,
        maxPixels=1e10,
        bestEffort=True
    ).getInfo()

    mean_slope = float(slope_stats.get("slope_mean") or 0.0)
    max_slope = float(slope_stats.get("slope_max") or 0.0)

    # 5. Classify Slope into 5 Geotechnical Tiers
    # 0: <5, 1: 5-15, 2: 15-25, 3: 25-35, 4: >35
    classified_slope = (
        ee.Image(0)
        .where(slope.gte(5).And(slope.lt(15)), 1)
        .where(slope.gte(15).And(slope.lt(25)), 2)
        .where(slope.gte(25).And(slope.lt(35)), 3)
        .where(slope.gte(35), 4)
        .clip(aoi)
        .rename("slope_class")
    )

    slope_hist = classified_slope.reduceRegion(
        reducer=ee.Reducer.frequencyHistogram(),
        geometry=aoi,
        scale=scale,
        maxPixels=1e10,
        bestEffort=True
    ).get("slope_class").getInfo() or {}

    total_pixels = sum(slope_hist.values()) if slope_hist else 1

    slope_distribution = []
    steep_slopes_pct = 0.0
    steep_slopes_ha = 0.0

    for tier in SLOPE_TIERS:
        tier_id = str(tier["id"])
        pixel_count = int(slope_hist.get(tier_id, 0))
        tier_area_ha = (pixel_count * (scale * scale)) / 10000.0
        pct = (pixel_count / total_pixels) * 100.0 if total_pixels > 0 else 0.0
        
        if tier["id"] >= 3: # 25° or higher
            steep_slopes_pct += pct
            steep_slopes_ha += tier_area_ha

        slope_distribution.append({
            "tier_id": tier["id"],
            "name": tier["name"],
            "area_ha": round(tier_area_ha, 2),
            "percentage": round(pct, 2),
            "color": tier["color"],
            "hazard_level": tier["hazard"]
        })

    # 6. Aspect Analysis (North, East, South, West orientation)
    # N: 315-45, E: 45-135, S: 135-225, W: 225-315
    aspect_classified = (
        ee.Image(0) # North
        .where(aspect.gte(45).And(aspect.lt(135)), 1)  # East
        .where(aspect.gte(135).And(aspect.lt(225)), 2) # South
        .where(aspect.gte(225).And(aspect.lt(315)), 3) # West
        .clip(aoi)
        .rename("aspect_class")
    )
    aspect_hist = aspect_classified.reduceRegion(
        reducer=ee.Reducer.frequencyHistogram(),
        geometry=aoi,
        scale=scale,
        maxPixels=1e10,
        bestEffort=True
    ).get("aspect_class").getInfo() or {}

    aspect_total = sum(aspect_hist.values()) if aspect_hist else 1
    aspect_distribution = [
        {"cardinal": "North (0–45° / 315–360°)", "percentage": round((aspect_hist.get("0", 0) / aspect_total) * 100.0, 1)},
        {"cardinal": "East (45–135°)", "percentage": round((aspect_hist.get("1", 0) / aspect_total) * 100.0, 1)},
        {"cardinal": "South (135–225°)", "percentage": round((aspect_hist.get("2", 0) / aspect_total) * 100.0, 1)},
        {"cardinal": "West (225–315°)", "percentage": round((aspect_hist.get("3", 0) / aspect_total) * 100.0, 1)}
    ]

    # 7. Cross-Analysis Matrix (LULC x Slope Hazard)
    # Fetch Dynamic World labels for LULC cross-referencing
    dw_col = (
        ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
        .filterBounds(aoi)
        .filterDate(start_date, end_date)
    )
    dw_mode = dw_col.select("label").reduce(ee.Reducer.mode()).clip(aoi).rename("label")

    # Bare land (7) or Scrub (5) on slope >= 25 deg -> High Landslide / Erosion Susceptibility
    bare_scrub_mask = dw_mode.eq(7).Or(dw_mode.eq(5))
    steep_bare_image = bare_scrub_mask.And(slope.gte(25)).rename("steep_bare")
    steep_bare_hist = steep_bare_image.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=aoi,
        scale=scale,
        maxPixels=1e10,
        bestEffort=True
    ).getInfo()
    steep_bare_pixels = float(steep_bare_hist.get("steep_bare") or 0.0)
    steep_bare_ha = (steep_bare_pixels * (scale * scale)) / 10000.0

    # Built-up (6) on slope >= 15 deg -> Geotechnical Foundation Hazard
    urban_steep_image = dw_mode.eq(6).And(slope.gte(15)).rename("urban_steep")
    urban_steep_hist = urban_steep_image.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=aoi,
        scale=scale,
        maxPixels=1e10,
        bestEffort=True
    ).getInfo()
    urban_steep_pixels = float(urban_steep_hist.get("urban_steep") or 0.0)
    urban_steep_ha = (urban_steep_pixels * (scale * scale)) / 10000.0

    # Flood / Water accumulation: Flat terrain (slope <= 3 deg)
    flat_basin_image = slope.lte(3).rename("flat_basin")
    flat_basin_hist = flat_basin_image.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=aoi,
        scale=scale,
        maxPixels=1e10,
        bestEffort=True
    ).getInfo()
    flat_basin_pixels = float(flat_basin_hist.get("flat_basin") or 0.0)
    flat_basin_ha = (flat_basin_pixels * (scale * scale)) / 10000.0

    # Erosion Vulnerability Index (0-100)
    # Scaled by percentage of steep bare slopes + mean slope
    vulnerability_score = min(100, int((steep_slopes_pct * 0.7) + (mean_slope * 1.2) + (steep_bare_ha / max(1, area_ha) * 150)))
    vulnerability_rating = (
        "Severe Hazard" if vulnerability_score > 65
        else "High Hazard" if vulnerability_score > 45
        else "Moderate Hazard" if vulnerability_score > 25
        else "Low Stability Risk"
    )

    # 8. Generate Map Tile URLs
    # Slope visual params (0 to 40 degrees)
    slope_vis = {
        "min": 0,
        "max": 40,
        "palette": SLOPE_PALETTE
    }
    slope_map_id = slope.getMapId(slope_vis)
    slope_tile_url = slope_map_id["tile_fetcher"].url_format

    # Elevation visual params
    elev_min_clamped = max(0, min_elev)
    elev_max_clamped = max(elev_min_clamped + 50, max_elev)
    elev_vis = {
        "min": elev_min_clamped,
        "max": elev_max_clamped,
        "palette": ELEVATION_PALETTE
    }
    elev_map_id = dem.getMapId(elev_vis)
    elevation_tile_url = elev_map_id["tile_fetcher"].url_format

    # Hillshade visual params (grayscale 0 to 255)
    hillshade_vis = {
        "min": 0,
        "max": 255
    }
    hillshade_map_id = hillshade.getMapId(hillshade_vis)
    hillshade_tile_url = hillshade_map_id["tile_fetcher"].url_format

    # Attach API key to tile URLs
    if api_key:
        for url_var in [slope_tile_url, elevation_tile_url, hillshade_tile_url]:
            sep = "&" if "?" in url_var else "?"
        if "?key=" not in slope_tile_url:
            slope_tile_url += f"{'&' if '?' in slope_tile_url else '?'}key={api_key}"
        if "?key=" not in elevation_tile_url:
            elevation_tile_url += f"{'&' if '?' in elevation_tile_url else '?'}key={api_key}"
        if "?key=" not in hillshade_tile_url:
            hillshade_tile_url += f"{'&' if '?' in hillshade_tile_url else '?'}key={api_key}"

    return {
        "elevation": {
            "min_m": round(min_elev, 1),
            "max_m": round(max_elev, 1),
            "mean_m": round(mean_elev, 1),
            "relief_m": round(relief_m, 1)
        },
        "slope": {
            "mean_deg": round(mean_slope, 1),
            "max_deg": round(max_slope, 1),
            "steep_slopes_pct": round(steep_slopes_pct, 2),
            "steep_slopes_ha": round(steep_slopes_ha, 2)
        },
        "slope_distribution": slope_distribution,
        "aspect_distribution": aspect_distribution,
        "hazard_cross_matrix": {
            "vulnerability_score": vulnerability_score,
            "vulnerability_rating": vulnerability_rating,
            "high_erosion_bare_ground_ha": round(steep_bare_ha, 2),
            "urban_slope_risk_ha": round(urban_steep_ha, 2),
            "flat_inundation_basin_ha": round(flat_basin_ha, 2),
            "geotechnical_notes": [
                f"{round(steep_bare_ha, 1)} ha of exposed bare ground/scrub located on slopes >= 25° indicate high soil erosion and gully formation risk.",
                f"{round(urban_steep_ha, 1)} ha of built-up infrastructure situated on slopes >= 15° require geotechnical stability reviews.",
                f"{round(flat_basin_ha, 1)} ha of low-gradient terrain (<= 3°) serve as primary drainage and sediment deposition basins."
            ]
        },
        "tile_urls": {
            "slope": slope_tile_url,
            "elevation": elevation_tile_url,
            "hillshade": hillshade_tile_url
        }
    }

def calculate_haversine_distance_km(pt1: List[float], pt2: List[float]) -> float:
    """Calculates great-circle distance between two [lng, lat] points in kilometers."""
    lon1, lat1 = math.radians(pt1[0]), math.radians(pt1[1])
    lon2, lat2 = math.radians(pt2[0]), math.radians(pt2[1])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2.0)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0)**2
    c = 2 * math.asin(math.sqrt(a))
    return 6371.0 * c

def compute_elevation_profile(
    line_coords: List[List[float]],
    num_samples: int = 80
) -> Dict[str, Any]:
    """
    Computes a cross-sectional elevation profile along a user-drawn transect line.
    Returns equidistant distance vs. elevation points and profile statistics.
    """
    if len(line_coords) < 2:
        raise ValueError("Transect line must have at least 2 points.")

    # 1. Calculate segment lengths and total distance
    segment_lengths = []
    total_dist_km = 0.0
    for i in range(len(line_coords) - 1):
        d = calculate_haversine_distance_km(line_coords[i], line_coords[i + 1])
        segment_lengths.append(d)
        total_dist_km += d

    if total_dist_km <= 0.0:
        raise ValueError("Transect line length must be greater than 0.")

    # 2. Interpolate num_samples equidistant points along the polyline
    num_samples = max(20, min(200, num_samples))
    step_km = total_dist_km / (num_samples - 1)
    
    sample_points = []
    curr_seg_idx = 0
    curr_seg_cum_dist = 0.0
    
    for i in range(num_samples):
        target_dist = i * step_km
        while curr_seg_idx < len(segment_lengths) - 1 and target_dist > (curr_seg_cum_dist + segment_lengths[curr_seg_idx]):
            curr_seg_cum_dist += segment_lengths[curr_seg_idx]
            curr_seg_idx += 1

        seg_len = segment_lengths[curr_seg_idx]
        seg_dist = target_dist - curr_seg_cum_dist
        ratio = (seg_dist / seg_len) if seg_len > 0 else 0.0
        ratio = max(0.0, min(1.0, ratio))

        p_start = line_coords[curr_seg_idx]
        p_end = line_coords[curr_seg_idx + 1]

        lng = p_start[0] + (p_end[0] - p_start[0]) * ratio
        lat = p_start[1] + (p_end[1] - p_start[1]) * ratio

        sample_points.append({
            "index": i,
            "distance_km": round(target_dist, 3),
            "coords": [lng, lat]
        })

    # 3. Sample Copernicus DEM along points in GEE
    point_features = [
        ee.Feature(ee.Geometry.Point(sp["coords"]), {"index": sp["index"], "dist_km": sp["distance_km"]})
        for sp in sample_points
    ]
    fc = ee.FeatureCollection(point_features)
    
    # Bounding geometry for clipping DEM
    lats = [pt[1] for pt in line_coords]
    lngs = [pt[0] for pt in line_coords]
    buffer_deg = 0.05
    bbox = ee.Geometry.BBox(min(lngs) - buffer_deg, min(lats) - buffer_deg, max(lngs) + buffer_deg, max(lats) + buffer_deg)
    
    dem = get_copernicus_dem(bbox)
    sampled = dem.sampleRegions(
        collection=fc,
        properties=["index", "dist_km"],
        scale=30,
        geometries=True
    ).getInfo()

    # Sort results by index to preserve order
    elev_map = {}
    for feat in sampled.get("features", []):
        props = feat.get("properties", {})
        idx = props.get("index")
        elev = props.get("elevation")
        if idx is not None and elev is not None:
            elev_map[idx] = float(elev)

    # 4. Fill profile points & compute grade/slope
    profile_points = []
    last_elev = 0.0
    for sp in sample_points:
        idx = sp["index"]
        elev = elev_map.get(idx, last_elev)
        last_elev = elev
        profile_points.append({
            "distance_km": sp["distance_km"],
            "elevation_m": round(elev, 1),
            "lat": round(sp["coords"][1], 5),
            "lng": round(sp["coords"][0], 5)
        })

    elevations = [p["elevation_m"] for p in profile_points]
    min_elev = min(elevations) if elevations else 0.0
    max_elev = max(elevations) if elevations else 0.0
    
    # Compute elevation gain, loss, and slope grades
    total_gain_m = 0.0
    total_loss_m = 0.0
    max_grade_pct = 0.0
    
    for i in range(1, len(profile_points)):
        delta_elev = profile_points[i]["elevation_m"] - profile_points[i - 1]["elevation_m"]
        delta_dist_m = (profile_points[i]["distance_km"] - profile_points[i - 1]["distance_km"]) * 1000.0
        
        if delta_elev > 0:
            total_gain_m += delta_elev
        else:
            total_loss_m += abs(delta_elev)

        if delta_dist_m > 0:
            grade = abs(delta_elev) / delta_dist_m * 100.0
            if grade > max_grade_pct:
                max_grade_pct = grade

    avg_grade_pct = (abs(elevations[-1] - elevations[0]) / (total_dist_km * 1000.0) * 100.0) if total_dist_km > 0 else 0.0

    return {
        "summary": {
            "total_distance_km": round(total_dist_km, 2),
            "min_elevation_m": round(min_elev, 1),
            "max_elevation_m": round(max_elev, 1),
            "elevation_relief_m": round(max_elev - min_elev, 1),
            "elevation_gain_m": round(total_gain_m, 1),
            "elevation_loss_m": round(total_loss_m, 1),
            "average_grade_pct": round(avg_grade_pct, 1),
            "max_grade_pct": round(max_grade_pct, 1),
            "start_point": {"lat": line_coords[0][1], "lng": line_coords[0][0]},
            "end_point": {"lat": line_coords[-1][1], "lng": line_coords[-1][0]}
        },
        "points": profile_points
    }
