import os
import logging
from typing import List, Dict, Any, Optional
import ee

from gee_service import get_s2_composite, get_map_tile_url

logger = logging.getLogger(__name__)

# Palettes for Spectral Indices
# NDBI: -0.5 to 0.5 (Vegetation/Water blue-grey to dense built-up bright amber/crimson)
NDBI_PALETTE = ['2c3e50', '7f8c8d', 'bdc3c7', 'f39c12', 'd35400', 'c0392b']

# MNDWI: -0.5 to 0.5 (Dry land brown/amber to shallow water azure to deep water dark blue)
MNDWI_PALETTE = ['d73027', 'fc8d59', 'fee08b', 'd9ef8b', '91cf60', '1a9850', '2166ac', '053061']

# NBR: -0.4 to 0.8 (Burned/cleared crimson/brown to healthy vegetation lush green)
NBR_PALETTE = ['67001f', 'b2182b', 'd6604d', 'f4a582', 'fddbc7', 'd1e5f0', '92c5de', '4393c3', '2166ac', '053061']

# Sentinel-2 Spectral Band Wavelengths (Center wavelength in nanometers)
BAND_METADATA = [
    {"band": "B2", "name": "Blue", "center_nm": 490, "color": "#4a90e2", "desc": "Atmospheric scattering & water penetration"},
    {"band": "B3", "name": "Green", "center_nm": 560, "color": "#2ecc71", "desc": "Vegetation peak reflectance & water clarity"},
    {"band": "B4", "name": "Red", "center_nm": 665, "color": "#e74c3c", "desc": "Chlorophyll-a absorption peak"},
    {"band": "B5", "name": "Red Edge 1", "center_nm": 705, "color": "#e67e22", "desc": "Vegetation stress & canopy transition"},
    {"band": "B6", "name": "Red Edge 2", "center_nm": 740, "color": "#f1c40f", "desc": "Leaf area index & chlorophyll absorption boundary"},
    {"band": "B7", "name": "Red Edge 3", "center_nm": 783, "color": "#9b59b6", "desc": "Canopy biomass estimation"},
    {"band": "B8", "name": "NIR Broad", "center_nm": 842, "color": "#1abc9c", "desc": "Internal leaf structure cellular scatter"},
    {"band": "B8A", "name": "NIR Narrow", "center_nm": 865, "color": "#16a085", "desc": "Water vapor correction & narrow NIR"},
    {"band": "B11", "name": "SWIR 1", "center_nm": 1610, "color": "#d35400", "desc": "Moisture content & soil/urban separation"},
    {"band": "B12", "name": "SWIR 2", "center_nm": 2190, "color": "#c0392b", "desc": "Mineral composition & burn scar detection"}
]


def classify_spectral_profile(bands: Dict[str, float], indices: Dict[str, float]) -> Dict[str, str]:
    """
    Diagnostically classifies the dominant surface archetype from 10-band spectral signatures
    and multispectral index values.
    """
    ndvi = indices.get("ndvi", 0.0)
    ndbi = indices.get("ndbi", 0.0)
    mndwi = indices.get("mndwi", 0.0)
    nbr = indices.get("nbr", 0.0)
    bsi = indices.get("bsi", 0.0)

    b2 = bands.get("B2", 0.0)
    b3 = bands.get("B3", 0.0)
    b4 = bands.get("B4", 0.0)
    b8 = bands.get("B8", 0.0)
    b11 = bands.get("B11", 0.0)
    b12 = bands.get("B12", 0.0)

    # 1. Water Body / Inundation
    if mndwi > 0.05 or (b3 > b8 and b8 < 0.1 and b11 < 0.08):
        return {
            "signature": "Open Water / Wetland",
            "type": "water",
            "badge_color": "#2980b9",
            "description": "Strong green reflectance with near-total light absorption across NIR and SWIR wavelengths. Typical of lakes, reservoirs, tailings ponds, and coastal water."
        }

    # 2. Dense Healthy Vegetation
    if ndvi > 0.55 and b8 > b4 * 2.5:
        return {
            "signature": "Dense Healthy Canopy",
            "type": "vegetation_dense",
            "badge_color": "#27ae60",
            "description": "High chlorophyll absorption in Red (B4) and high cellular scattering in NIR (B8) resulting in a steep 'red-edge' leap. Typical of closed-canopy forests and vigorous agriculture."
        }

    # 3. Moderate / Sparse Vegetation
    if ndvi >= 0.25 and b8 > b4:
        return {
            "signature": "Moderate / Sparse Vegetation",
            "type": "vegetation_moderate",
            "badge_color": "#2ecc71",
            "description": "Moderate red-edge transition with balanced visible reflectance. Typical of savannah grasslands, open scrub, and transitional regrowth."
        }

    # 4. Burn Scar / Cleared Biomass
    if nbr < -0.05 and b12 > b8 and bsi > 0.1:
        return {
            "signature": "Burn Scar / Cleared Land",
            "type": "burn_scar",
            "badge_color": "#c0392b",
            "description": "Low NIR reflectance combined with elevated SWIR2 reflectance due to loss of cellular moisture and presence of charcoal/ash."
        }

    # 5. Impervious Built-Up / Infrastructure
    if ndbi > 0.0 and b11 > b8 and abs(b11 - b12) < 0.08:
        return {
            "signature": "Built-Up / Impervious Surface",
            "type": "urban",
            "badge_color": "#e67e22",
            "description": "Relatively flat spectral profile across visible bands with SWIR1 exceeding NIR. Characteristic of asphalt, concrete, building roofs, and industrial yards."
        }

    # 6. Bare Soil / Quarry Rock / Sand
    if b11 > b8 and bsi > 0.0:
        return {
            "signature": "Bare Soil / Exposed Bedrock",
            "type": "soil",
            "badge_color": "#d35400",
            "description": "Monotonically increasing reflectance curve from visible to SWIR wavelengths with minimal red-edge step. Characteristic of topsoil, excavation pits, and quarries."
        }

    # 7. Unclassified / Mixed Pixel
    return {
        "signature": "Mixed / Transitional Surface",
        "type": "mixed",
        "badge_color": "#7f8c8d",
        "description": "Heterogeneous spectral response with composite characteristics of multiple surface materials."
    }


def compute_spectral_analysis(
    aoi_coords: List[List[float]],
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """
    Computes NDBI, MNDWI, and NBR multispectral index maps and zonal area statistics across the AOI.
    Generates GEE map tile URLs for each index.
    """
    aoi = ee.Geometry.Polygon(aoi_coords)
    area_m2 = aoi.area(maxError=10).getInfo()
    total_area_ha = round(area_m2 / 10000.0, 2)

    # 1. Fetch cloud-masked Sentinel-2 Surface Reflectance composite
    s2_img = get_s2_composite(aoi, start_date, end_date)

    # 2. Band Math Calculations
    # NDBI = (SWIR1 - NIR) / (SWIR1 + NIR) = (B11 - B8) / (B11 + B8)
    ndbi = s2_img.normalizedDifference(['B11', 'B8']).rename('NDBI')

    # MNDWI = (Green - SWIR1) / (Green + SWIR1) = (B3 - B11) / (B3 + B11)
    mndwi = s2_img.normalizedDifference(['B3', 'B11']).rename('MNDWI')

    # NBR = (NIR - SWIR2) / (NIR + SWIR2) = (B8 - B12) / (B8 + B12)
    nbr = s2_img.normalizedDifference(['B8', 'B12']).rename('NBR')

    combined_indices = s2_img.select(['B8', 'B4']).addBands([ndbi, mndwi, nbr])

    # 3. Zonal Statistics across AOI
    stats = combined_indices.reduceRegion(
        reducer=ee.Reducer.mean().combine(
            reducer2=ee.Reducer.minMax(),
            sharedInputs=True
        ).combine(
            reducer2=ee.Reducer.stdDev(),
            sharedInputs=True
        ),
        geometry=aoi,
        scale=30,
        maxPixels=1e9,
        bestEffort=True
    ).getInfo()

    # 4. Binary / Category Extent Masks
    # Built-up footprint: NDBI > 0
    built_mask = ndbi.gt(0).rename('built')
    # Water footprint: MNDWI > 0
    water_mask = mndwi.gt(0).rename('water')

    # Burn severity breakdown:
    # 0: High Severity (NBR < -0.10)
    # 1: Moderate Severity (-0.10 <= NBR < 0.10)
    # 2: Low Severity (0.10 <= NBR < 0.27)
    # 3: Unburned / Healthy (NBR >= 0.27)
    burn_classes = (
        ee.Image(3)
        .where(nbr.lt(0.27), 2)
        .where(nbr.lt(0.10), 1)
        .where(nbr.lt(-0.10), 0)
        .rename('burn_class')
    )

    # Pixel area computations in square meters
    pixel_area = ee.Image.pixelArea()
    extent_stats = ee.Image.cat([built_mask, water_mask]).multiply(pixel_area).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=aoi,
        scale=30,
        maxPixels=1e9,
        bestEffort=True
    ).getInfo()

    built_ha = round((extent_stats.get('built') or 0.0) / 10000.0, 2)
    water_ha = round((extent_stats.get('water') or 0.0) / 10000.0, 2)
    built_pct = round((built_ha / max(total_area_ha, 0.01)) * 100, 2)
    water_pct = round((water_ha / max(total_area_ha, 0.01)) * 100, 2)

    # Calculate Burn Severity category distribution
    burn_hist = burn_classes.reduceRegion(
        reducer=ee.Reducer.frequencyHistogram(),
        geometry=aoi,
        scale=30,
        maxPixels=1e9,
        bestEffort=True
    ).get('burn_class').getInfo() or {}

    total_burn_pixels = sum(burn_hist.values()) if burn_hist else 1
    burn_severity_breakdown = [
        {
            "tier": "High Severity / Burn Scar",
            "range": "NBR < -0.10",
            "count": burn_hist.get("0", 0),
            "percentage": round((burn_hist.get("0", 0) / total_burn_pixels) * 100, 2),
            "color": "#67001f",
            "description": "Severe canopy destruction, charcoal/ash exposure, or recent clear-cut excavation"
        },
        {
            "tier": "Moderate Severity",
            "range": "-0.10 ≤ NBR < 0.10",
            "count": burn_hist.get("1", 0),
            "percentage": round((burn_hist.get("1", 0) / total_burn_pixels) * 100, 2),
            "color": "#f4a582",
            "description": "Mixed scorched canopy, heavy dieback, or partial topsoil stripping"
        },
        {
            "tier": "Low Severity / Regrowth",
            "range": "0.10 ≤ NBR < 0.27",
            "count": burn_hist.get("2", 0),
            "percentage": round((burn_hist.get("2", 0) / total_burn_pixels) * 100, 2),
            "color": "#92c5de",
            "description": "Surface scorch, light stress, or recovering secondary regrowth"
        },
        {
            "tier": "Unburned / Vigorous",
            "range": "NBR ≥ 0.27",
            "count": burn_hist.get("3", 0),
            "percentage": round((burn_hist.get("3", 0) / total_burn_pixels) * 100, 2),
            "color": "#2166ac",
            "description": "Undisturbed healthy green canopy with strong cellular NIR scatter"
        }
    ]

    # 5. Generate Tile URLs
    ndbi_tile_url = get_map_tile_url(ndbi, {
        'min': -0.5,
        'max': 0.5,
        'palette': NDBI_PALETTE
    })

    mndwi_tile_url = get_map_tile_url(mndwi, {
        'min': -0.5,
        'max': 0.5,
        'palette': MNDWI_PALETTE
    })

    nbr_tile_url = get_map_tile_url(nbr, {
        'min': -0.4,
        'max': 0.8,
        'palette': NBR_PALETTE
    })

    return {
        "total_area_ha": total_area_ha,
        "ndbi": {
            "mean": round(stats.get('NDBI_mean') or 0.0, 4),
            "min": round(stats.get('NDBI_min') or 0.0, 4),
            "max": round(stats.get('NDBI_max') or 0.0, 4),
            "std_dev": round(stats.get('NDBI_stdDev') or 0.0, 4),
            "built_area_ha": built_ha,
            "built_percentage": built_pct,
            "tile_url": ndbi_tile_url
        },
        "mndwi": {
            "mean": round(stats.get('MNDWI_mean') or 0.0, 4),
            "min": round(stats.get('MNDWI_min') or 0.0, 4),
            "max": round(stats.get('MNDWI_max') or 0.0, 4),
            "std_dev": round(stats.get('MNDWI_stdDev') or 0.0, 4),
            "water_area_ha": water_ha,
            "water_percentage": water_pct,
            "tile_url": mndwi_tile_url
        },
        "nbr": {
            "mean": round(stats.get('NBR_mean') or 0.0, 4),
            "min": round(stats.get('NBR_min') or 0.0, 4),
            "max": round(stats.get('NBR_max') or 0.0, 4),
            "std_dev": round(stats.get('NBR_stdDev') or 0.0, 4),
            "burn_severity_breakdown": burn_severity_breakdown,
            "tile_url": nbr_tile_url
        }
    }


def inspect_pixel_spectrum(
    lat: float,
    lng: float,
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """
    Extracts 10-band spectral reflectance values at the specified coordinate
    from the cloud-masked Sentinel-2 Surface Reflectance composite.
    Computes key diagnostic remote sensing indices and classifies the spectral signature.
    """
    point = ee.Geometry.Point([lng, lat])
    region = point.buffer(20)

    s2_img = get_s2_composite(region, start_date, end_date)

    band_names = [m["band"] for m in BAND_METADATA]
    sampled = s2_img.select(band_names).reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=point,
        scale=10,
        maxPixels=100
    ).getInfo()

    # Extract reflectances (clipped to 0.0 - 1.0)
    reflectances = {}
    curve_data = []

    for meta in BAND_METADATA:
        b = meta["band"]
        val = float(sampled.get(b) or 0.0)
        # Sentinel-2 reflectances are scaled 0 to 1
        clamped_val = max(0.0, min(1.0, val))
        reflectances[b] = round(clamped_val, 4)
        curve_data.append({
            "band": b,
            "name": meta["name"],
            "center_nm": meta["center_nm"],
            "reflectance": round(clamped_val, 4),
            "color": meta["color"],
            "desc": meta["desc"]
        })

    # Diagnostic Index Calculations
    b2 = reflectances.get("B2", 0.0)
    b3 = reflectances.get("B3", 0.0)
    b4 = reflectances.get("B4", 0.0)
    b5 = reflectances.get("B5", 0.0)
    b8 = reflectances.get("B8", 0.0)
    b11 = reflectances.get("B11", 0.0)
    b12 = reflectances.get("B12", 0.0)

    def safe_norm_diff(x: float, y: float) -> float:
        denom = x + y
        if abs(denom) < 1e-6:
            return 0.0
        return round((x - y) / denom, 4)

    # NDVI: (NIR - Red) / (NIR + Red)
    ndvi = safe_norm_diff(b8, b4)
    # NDBI: (SWIR1 - NIR) / (SWIR1 + NIR)
    ndbi = safe_norm_diff(b11, b8)
    # MNDWI: (Green - SWIR1) / (Green + SWIR1)
    mndwi = safe_norm_diff(b3, b11)
    # NBR: (NIR - SWIR2) / (NIR + SWIR2)
    nbr = safe_norm_diff(b8, b12)
    # NDRE: Red Edge NDVI (NIR - RedEdge1) / (NIR + RedEdge1)
    ndre = safe_norm_diff(b8, b5)
    # BSI: Bare Soil Index ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))
    bsi_num = (b11 + b4) - (b8 + b2)
    bsi_den = (b11 + b4) + (b8 + b2)
    bsi = round(bsi_num / bsi_den, 4) if abs(bsi_den) > 1e-6 else 0.0

    diagnostic_indices = {
        "ndvi": ndvi,
        "ndbi": ndbi,
        "mndwi": mndwi,
        "nbr": nbr,
        "ndre": ndre,
        "bsi": bsi
    }

    profile = classify_spectral_profile(reflectances, diagnostic_indices)

    return {
        "coordinate": {
            "lat": round(lat, 6),
            "lng": round(lng, 6)
        },
        "profile": profile,
        "curve": curve_data,
        "indices": diagnostic_indices,
        "bands": reflectances
    }
