import os
import io
import zipfile
import base64
import requests
import logging
from datetime import date
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
import ee

from gee_service import initialize_gee, get_s2_composite, get_s1_sar_composite, get_dynamic_world_composite, get_map_tile_url, add_ndvi
from classifier import (
    train_and_classify_gee,
    train_and_classify_deep_learning_gee,
    get_precomputed_statistics,
    LULC_PALETTE,
    LULC_CLASSES
)
from ai_service import (
    perform_sam_smart_select,
    extract_and_regularize_buildings,
    compute_ai_quality_metrics,
    compute_bitemporal_transition_matrix,
    compute_super_resolution_tiles,
    compute_water_dynamics,
    compute_canopy_height_estimation
)
from terrain_service import (
    compute_terrain_metrics,
    compute_elevation_profile,
    SLOPE_TIERS
)
from spectral_service import (
    compute_spectral_analysis,
    inspect_pixel_spectrum
)
from timeseries_service import (
    extract_pixel_timeseries
)
from change_service import (
    compute_temporal_change_engine
)
from pdf_service import (
    generate_executive_pdf
)
from stac_service import (
    search_stac_scenes,
    get_landsat_composite
)

# Configure Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def parse_csv_env(name: str, default: str = "") -> List[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]

app = FastAPI(
    title="GeoClass AI Backend",
    description="FastAPI backend to communicate with Google Earth Engine for LULC classification",
    version="1.0.0"
)

# Enable CORS for frontend API calls.
# By default allow all origins ('*') and all *.vercel.app domains so frontend deployments connect immediately.
raw_origins = os.getenv("FRONTEND_ORIGINS", "*")
if raw_origins.strip() == "*":
    frontend_origins = ["*"]
else:
    frontend_origins = parse_csv_env(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    )

frontend_origin_regex = os.getenv("FRONTEND_ORIGIN_REGEX") or r"https://.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_origin_regex=frontend_origin_regex if frontend_origins != ["*"] else None,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event: Initialize Google Earth Engine
@app.on_event("startup")
def startup_event():
    success = initialize_gee()
    if not success:
        logger.error("Could not initialize Earth Engine on startup. API requests may fail until configured.")

# Pydantic Schemas
class AOIRequest(BaseModel):
    coords: List[List[float]] = Field(
        ..., 
        description="Coordinates of the polygon in GeoJSON format: [[lng1, lat1], [lng2, lat2], ...]"
    )
    start_date: str = Field("2024-01-01", description="Start date YYYY-MM-DD")
    end_date: str = Field("2024-12-31", description="End date YYYY-MM-DD")
    cloud_cover: float = Field(20.0, description="Max cloud cover percentage allowed")
    cloud_mask_type: Optional[str] = Field("both", description="Masking algorithm: 'both', 'scl', 'qa60', or 'none'")
    mask_shadows: Optional[bool] = Field(True, description="Whether to mask cloud shadows specifically")
    seasonal_filter: Optional[str] = Field("all", description="Seasonal compositing filter: 'all', 'dry', or 'wet'")

    @model_validator(mode="after")
    def validate_date_range(self):
        try:
            start = date.fromisoformat(self.start_date)
            end = date.fromisoformat(self.end_date)
        except ValueError as exc:
            raise ValueError("start_date and end_date must use YYYY-MM-DD format") from exc

        if start >= end:
            raise ValueError("end_date must be after start_date")
        return self

class ClassifyRequest(AOIRequest):
    num_trees: int = Field(100, description="Number of decision trees for Random Forest")
    sample_points: int = Field(150, description="Number of sample pixels to extract per class for training")
    model_type: str = Field("random_forest", description="Model type: 'random_forest', 'deep_learning', or 'dynamic_world'")
    use_sar_fusion: Optional[bool] = Field(False, description="Whether to fuse Sentinel-1 C-band SAR backscatter features (VV, VH, VV/VH ratio) with optical imagery")
    sensor: Optional[str] = Field("sentinel_2", description="Sensor constellation: 'sentinel_2' (Sentinel-2 MSI 10m) or 'landsat' (Landsat 8/9 OLI 30m)")

class STACSearchRequest(BaseModel):
    coords: List[List[float]] = Field(
        ...,
        description="Coordinates of the polygon in GeoJSON format: [[lng1, lat1], [lng2, lat2], ...]"
    )
    start_date: str = Field("2024-01-01", description="Start date YYYY-MM-DD")
    end_date: str = Field("2024-12-31", description="End date YYYY-MM-DD")
    collections: Optional[List[str]] = Field(
        None,
        description="STAC collections to query, e.g. ['sentinel-2', 'landsat-8', 'landsat-9', 'sentinel-1']"
    )
    max_cloud_cover: Optional[float] = Field(30.0, description="Max scene cloud cover percentage")
    limit: Optional[int] = Field(25, description="Maximum number of scenes to return")

class LandsatCompositeRequest(BaseModel):
    coords: List[List[float]] = Field(
        ...,
        description="Coordinates of the polygon in GeoJSON format: [[lng1, lat1], [lng2, lat2], ...]"
    )
    start_date: str = Field("2024-01-01", description="Start date YYYY-MM-DD")
    end_date: str = Field("2024-12-31", description="End date YYYY-MM-DD")
    cloud_percentage: Optional[float] = Field(20.0, description="Max cloud cover threshold")

class SmartSelectRequest(BaseModel):
    point: List[float] = Field(
        ..., 
        description="Prompt point coordinates in [lng, lat] format"
    )
    tolerance_radius_m: float = Field(
        80.0, 
        description="Feature extraction search radius in meters"
    )
    feature_category: str = Field(
        "auto", 
        description="Feature hint ('auto', 'water', 'building', 'parcel')"
    )
    aoi_coords: Optional[List[List[float]]] = Field(
        None, 
        description="Optional bounding AOI coordinates to restrict extraction"
    )

class BuildingExtractRequest(AOIRequest):
    regularize: bool = Field(
        True, 
        description="Whether to apply orthogonal geometric regularization to building footprints"
    )
    min_building_area_m2: float = Field(
        40.0, 
        description="Minimum building footprint area in square meters"
    )

class QualityAssessmentRequest(BaseModel):
    coords: List[List[float]] = Field(
        ..., 
        description="Coordinates of the polygon in GeoJSON format: [[lng1, lat1], [lng2, lat2], ...]"
    )
    cloud_cover: float = Field(
        20.0, 
        description="Max cloud cover percentage allowed"
    )

class DeepChangeRequest(BaseModel):
    coords: List[List[float]] = Field(
        ..., 
        description="Coordinates of the polygon in GeoJSON format"
    )
    target_start_date: str = Field("2024-01-01", description="Target period start date")
    target_end_date: str = Field("2024-12-31", description="Target period end date")
    baseline_start_date: str = Field("2020-01-01", description="Baseline period start date")
    baseline_end_date: str = Field("2020-12-31", description="Baseline period end date")
    cloud_cover: float = Field(20.0, description="Cloud cover percentage threshold")
    target_stats: Optional[Dict[str, Any]] = None
    baseline_stats: Optional[Dict[str, Any]] = None

class SuperResolutionRequest(AOIRequest):
    pass

class WaterDynamicsRequest(AOIRequest):
    pass

class CanopyHeightRequest(AOIRequest):
    forest_stats: Optional[Dict[str, Any]] = None

class TerrainAnalyzeRequest(AOIRequest):
    pass

class ElevationProfileRequest(BaseModel):
    line_coords: List[List[float]] = Field(
        ...,
        description="Coordinates of the line transect [[lng1, lat1], [lng2, lat2], ...]"
    )
    num_samples: int = Field(80, ge=10, le=250, description="Number of sample elevation points along the line")
    start_location: Optional[str] = Field(None, description="Human readable name or address of the start location")
    end_location: Optional[str] = Field(None, description="Human readable name or address of the end location")

class SpectralAnalyzeRequest(AOIRequest):
    pass

class PixelSpectrumRequest(BaseModel):
    lat: float = Field(..., description="Latitude of the pixel to inspect")
    lng: float = Field(..., description="Longitude of the pixel to inspect")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")

class PixelTimelineRequest(BaseModel):
    lat: float = Field(..., description="Latitude of the pixel location")
    lng: float = Field(..., description="Longitude of the pixel location")
    start_year: Optional[int] = Field(2021, description="Start year of analysis window")
    end_year: Optional[int] = Field(2025, description="End year of analysis window")
    interval: Optional[str] = Field("quarterly", description="Temporal cadence: 'quarterly' or 'monthly'")

class ChangeDetectionRequest(BaseModel):
    coords: List[List[float]] = Field(..., description="AOI polygon coordinates")
    start_year: Optional[int] = Field(2020, description="Start year for baseline reference")
    end_year: Optional[int] = Field(2024, description="End year for disturbance monitoring window")
    index_name: Optional[str] = Field("nbr", description="Spectral index: 'nbr' (canopy disturbance), 'ndvi' (vegetation decline), 'ndbi' (urban sprawl)")
    sensitivity: Optional[str] = Field("moderate", description="Disturbance sensitivity: 'low', 'moderate', 'high'")

class PDFBriefingRequest(BaseModel):
    coords: List[List[float]] = Field(..., description="AOI polygon coordinates")
    statistics: Dict[str, Any] = Field(..., description="Classified statistics dictionary")
    total_area_ha: float = Field(..., description="Total AOI area in hectares")
    start_date: str = Field("2024-01-01")
    end_date: str = Field("2024-12-31")
    cloud_cover: Optional[float] = Field(20.0)
    model_type: Optional[str] = Field("random_forest")
    cloud_mask_type: Optional[str] = Field("both")
    seasonal_filter: Optional[str] = Field("all")
    location_name: Optional[str] = Field(None)

def coords_to_ee_geometry(coords: List[List[float]]) -> ee.Geometry:
    """
    Helper function to convert coords [[lng, lat], ...] to ee.Geometry.Polygon.
    Ensures that coordinate structure is closed and correctly formatted.
    """
    try:
        # GEE expects polygon coordinates to be wrapped: [[[lng, lat], [lng, lat], ...]]
        # Check if the coordinates are already double wrapped
        if len(coords) > 0 and isinstance(coords[0][0], list):
            return ee.Geometry.Polygon(coords)
        else:
            # Check if polygon is closed (first coord matches last). GEE does this automatically but it's good practice
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            return ee.Geometry.Polygon([coords])
    except Exception as e:
        logger.error(f"Error parsing coordinates to Earth Engine Geometry: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid coordinate format for polygon AOI: {e}"
        )

@app.get("/")
def read_root():
    """
    Root endpoint providing API information and service health.
    """
    gee_status = initialize_gee()
    return {
        "service": "GeoClass AI Backend API",
        "version": "1.0.0",
        "status": "online",
        "gee_connected": gee_status,
        "docs_url": "/docs",
        "status_url": "/api/status"
    }

@app.get("/api/status")
def get_status():
    """
    Status endpoint to check if Earth Engine is connected.
    """
    gee_status = initialize_gee()
    return {
        "status": "online" if gee_status else "offline",
        "gee_connected": gee_status,
        "message": "Earth Engine connection is active." if gee_status else "Earth Engine is not initialized. Please verify credentials."
    }

@app.post("/api/gee/map-id")
def get_s2_map_id(payload: AOIRequest):
    """
    Takes an AOI and date range, generates a cloud-free Sentinel-2 composite,
    and returns the tile URL template.
    """
    if not initialize_gee():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Earth Engine is not initialized. Please configure credentials."
        )

    try:
        aoi = coords_to_ee_geometry(payload.coords)
        composite = get_s2_composite(
            aoi=aoi,
            start_date=payload.start_date,
            end_date=payload.end_date,
            cloud_percentage=payload.cloud_cover,
            cloud_mask_type=payload.cloud_mask_type or "both",
            mask_shadows=payload.mask_shadows if payload.mask_shadows is not None else True,
            seasonal_filter=payload.seasonal_filter or "all"
        )

        # Standard False Color composite parameters (NIR, Red, Green) for vegetation highlighting
        vis_false_color = {
            'bands': ['B8', 'B4', 'B3'],
            'min': 0,
            'max': 0.3
        }

        # True Color composite (Red, Green, Blue)
        vis_true_color = {
            'bands': ['B4', 'B3', 'B2'],
            'min': 0,
            'max': 0.3
        }

        true_color_url = get_map_tile_url(composite, vis_true_color)
        false_color_url = get_map_tile_url(composite, vis_false_color)

        # Generate NDVI overlay URL
        composite_with_ndvi = add_ndvi(composite)
        vis_ndvi = {
            'bands': ['NDVI'],
            'min': -0.1,
            'max': 0.8,
            'palette': ['blue', 'white', 'green']
        }
        ndvi_url = get_map_tile_url(composite_with_ndvi, vis_ndvi)

        # Generate Sentinel-1 SAR False-Color composite URL (VV, VH, VV/VH ratio)
        sar_url = None
        try:
            sar_comp = get_s1_sar_composite(aoi, payload.start_date, payload.end_date)
            vis_sar = {
                'bands': ['VV', 'VH', 'VV_VH_ratio'],
                'min': [-20.0, -25.0, 0.0],
                'max': [0.0, -5.0, 15.0]
            }
            sar_url = get_map_tile_url(sar_comp, vis_sar)
        except Exception as sar_err:
            logger.warning(f"Could not generate Sentinel-1 SAR tile URL: {sar_err}")

        return {
            "true_color_tile_url": true_color_url,
            "false_color_tile_url": false_color_url,
            "ndvi_tile_url": ndvi_url,
            "sar_tile_url": sar_url
        }

    except Exception as e:
        logger.error(f"Error in map-id endpoint: {e}")
        err_msg = str(e)
        if any(keyword in err_msg.lower() for keyword in ["memory", "limit", "exceeded", "timeout", "timed out"]):
            detail_msg = "Google Earth Engine memory limit or timeout exceeded. The selected Area of Interest is too large to render. Please select a smaller AOI or reduce the date range."
        else:
            detail_msg = f"Earth Engine error: {e}"
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail_msg
        )

@app.post("/api/gee/classify")
def classify_aoi(payload: ClassifyRequest):
    """
    Runs LULC classification on the specified AOI.
    - If model_type is 'random_forest', trains a Random Forest model on the fly using S2 bands and Dynamic World labels.
    - If model_type is 'dynamic_world', returns the raw Dynamic World classification mode composite.
    - If use_sar_fusion is True, ingests Sentinel-1 C-band SAR backscatter features (VV, VH, VV/VH ratio).
    Returns the classified map tile URL along with land cover statistics.
    """
    if not initialize_gee():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Earth Engine is not initialized."
        )

    try:
        aoi = coords_to_ee_geometry(payload.coords)
        
        # 1. Fetch Dynamic World labels
        dw_labels = get_dynamic_world_composite(aoi, payload.start_date, payload.end_date)

        # 2. Optional Sentinel-1 SAR fusion
        sar_composite = None
        if payload.use_sar_fusion:
            try:
                sar_composite = get_s1_sar_composite(aoi, payload.start_date, payload.end_date)
                logger.info("Successfully fetched Sentinel-1 SAR composite for multi-sensor fusion.")
            except Exception as sar_err:
                logger.warning(f"Failed to fetch SAR composite for fusion: {sar_err}")
        
        sensor_choice = payload.sensor or "sentinel_2"

        if payload.model_type == "dynamic_world":
            # Use precomputed Dynamic World composite directly
            classified_image = dw_labels
            stats = get_precomputed_statistics(dw_labels, aoi)
        else:
            # Fetch optical imagery based on sensor selection
            if sensor_choice == "landsat":
                landsat_res = get_landsat_composite(
                    aoi=aoi,
                    start_date=payload.start_date,
                    end_date=payload.end_date,
                    cloud_percentage=payload.cloud_cover
                )
                optical_composite = landsat_res["image"]
            else:
                optical_composite = get_s2_composite(
                    aoi=aoi,
                    start_date=payload.start_date,
                    end_date=payload.end_date,
                    cloud_percentage=payload.cloud_cover,
                    cloud_mask_type=payload.cloud_mask_type or "both",
                    mask_shadows=payload.mask_shadows if payload.mask_shadows is not None else True,
                    seasonal_filter=payload.seasonal_filter or "all"
                )

            if payload.model_type == "deep_learning":
                classified_image, stats = train_and_classify_deep_learning_gee(
                    s2_composite=optical_composite,
                    label_composite=dw_labels,
                    aoi=aoi,
                    num_trees=payload.num_trees,
                    sample_points=payload.sample_points,
                    sar_composite=sar_composite,
                    sensor=sensor_choice
                )
            else:
                classified_image, stats = train_and_classify_gee(
                    s2_composite=optical_composite,
                    label_composite=dw_labels,
                    aoi=aoi,
                    num_trees=payload.num_trees,
                    sample_points=payload.sample_points,
                    sar_composite=sar_composite,
                    sensor=sensor_choice
                )

        # Visual params for LULC classes
        vis_params = {
            'min': 0,
            'max': 8,
            'palette': LULC_PALETTE
        }
        
        tile_url = get_map_tile_url(classified_image, vis_params)

        return {
            "tile_url": tile_url,
            "statistics": stats["classes"],
            "total_area_ha": stats["total_area_ha"],
            "model_used": payload.model_type,
            "sensor_used": sensor_choice,
            "sar_fusion_active": payload.use_sar_fusion and (sar_composite is not None)
        }

    except Exception as e:
        logger.error(f"Error in classify endpoint: {e}")
        err_msg = str(e)
        if any(keyword in err_msg.lower() for keyword in ["memory", "limit", "exceeded", "timeout", "timed out"]):
            detail_msg = "Google Earth Engine memory limit or timeout exceeded. The selected Area of Interest is too large to classify. Please select a smaller AOI (ideally under 15,000 hectares), reduce the parameters, or use Dynamic World mode."
        else:
            detail_msg = f"Classification error: {e}"

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail_msg
        )

class DownloadRequest(ClassifyRequest):
    export_format: str = Field("geotiff", description="Export format: 'geotiff', 'png', 'geojson', 'kml', 'kmz'")

@app.post("/api/gee/download-url")
def get_download_link(payload: DownloadRequest):
    """
    Generates a direct download link for the classification result
    supporting GeoTIFF, PNG, GeoJSON, and KML formats.
    """
    if not initialize_gee():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Earth Engine is not initialized."
        )

    try:
        aoi = coords_to_ee_geometry(payload.coords)

        # 1. Coordinate parsing & spatial extent calculations
        raw_ring = payload.coords if not (len(payload.coords) > 0 and isinstance(payload.coords[0][0], list)) else payload.coords[0]
        ring_coords = [list(pt) for pt in raw_ring]
        if ring_coords and ring_coords[0] != ring_coords[-1]:
            ring_coords.append(ring_coords[0])

        lats = [float(pt[1]) for pt in ring_coords]
        lngs = [float(pt[0]) for pt in ring_coords]
        north = max(lats) if lats else 0.0
        south = min(lats) if lats else 0.0
        east = max(lngs) if lngs else 0.0
        west = min(lngs) if lngs else 0.0
        center_lat = (north + south) / 2.0
        center_lng = (east + west) / 2.0

        try:
            area_ha = aoi.area().divide(10000).getInfo()
        except Exception:
            area_ha = 0.0

        api_key = os.getenv("GEE_API_KEY") or os.getenv("GOOGLE_API_KEY")

        # 2. Build classified image layer
        dw_labels = get_dynamic_world_composite(aoi, payload.start_date, payload.end_date)
        
        if payload.model_type == "dynamic_world":
            classified_image = dw_labels
        elif payload.model_type == "deep_learning":
            s2_composite = get_s2_composite(
                aoi=aoi,
                start_date=payload.start_date,
                end_date=payload.end_date,
                cloud_percentage=payload.cloud_cover
            )
            classified_image, _ = train_and_classify_deep_learning_gee(
                s2_composite=s2_composite,
                label_composite=dw_labels,
                aoi=aoi,
                num_trees=payload.num_trees,
                sample_points=payload.sample_points
            )
        else:
            s2_composite = get_s2_composite(
                aoi=aoi,
                start_date=payload.start_date,
                end_date=payload.end_date,
                cloud_percentage=payload.cloud_cover
            )
            classified_image, _ = train_and_classify_gee(
                s2_composite=s2_composite,
                label_composite=dw_labels,
                aoi=aoi,
                num_trees=payload.num_trees,
                sample_points=payload.sample_points
            )

        # 3. GeoJSON Export (Comprehensive Vector Package with Coordinates, CRS, and Class Legend)
        if payload.export_format == "geojson":
            legend_dict = {
                LULC_CLASSES.get(i, f"Class {i}"): f"#{LULC_PALETTE[i]}"
                for i in range(min(len(LULC_PALETTE), len(LULC_CLASSES)))
            }
            return {
                "download_url": None,
                "export_format": "geojson",
                "geojson_data": {
                    "type": "FeatureCollection",
                    "crs": {
                        "type": "name",
                        "properties": {
                            "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                        }
                    },
                    "features": [
                        {
                            "type": "Feature",
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [ring_coords]
                            },
                            "properties": {
                                "title": f"GeoClass LULC Analysis ({payload.model_type})",
                                "model_type": payload.model_type,
                                "start_date": payload.start_date,
                                "end_date": payload.end_date,
                                "cloud_cover_max": payload.cloud_cover,
                                "center_latitude": round(center_lat, 6),
                                "center_longitude": round(center_lng, 6),
                                "bounding_box": {
                                    "west_longitude": round(west, 6),
                                    "south_latitude": round(south, 6),
                                    "east_longitude": round(east, 6),
                                    "north_latitude": round(north, 6)
                                },
                                "area_hectares": round(area_ha, 2),
                                "area_km2": round(area_ha / 100.0, 3),
                                "coordinate_system": "WGS84 / EPSG:4326",
                                "classes_legend": legend_dict
                            }
                        }
                    ]
                }
            }

        # 4. KML / KMZ Export (Google Earth with GroundOverlay Raster draped on 3D terrain + Vector Placemark + Legend)
        if payload.export_format in ("kml", "kmz"):
            bbox_geom = ee.Geometry.BBox(west, south, east, north)
            overlay_url = classified_image.getThumbURL({
                'name': f'geoclass_overlay_{payload.start_date}',
                'dimensions': 2048,
                'region': bbox_geom,
                'format': 'png',
                'min': 0,
                'max': 8,
                'palette': LULC_PALETTE
            })

            # Fetch the actual rendered PNG raster server-side using GEE authenticated client
            png_bytes = None
            try:
                png_bytes = ee.data.getThumbnail({
                    'image': classified_image,
                    'dimensions': 2048,
                    'region': bbox_geom,
                    'format': 'png',
                    'min': 0,
                    'max': 8,
                    'palette': LULC_PALETTE
                })
                logger.info(f"Successfully retrieved classification PNG raster for KMZ ({len(png_bytes)} bytes)")
            except Exception as e:
                logger.warning(f"ee.data.getThumbnail failed for KMZ bundling: {e}")
                try:
                    headers = {"Referer": "http://localhost:3000/"}
                    img_res = requests.get(overlay_url, headers=headers, timeout=30)
                    if img_res.status_code == 200:
                        png_bytes = img_res.content
                        logger.info(f"Retrieved classification PNG raster via fallback HTTP ({len(png_bytes)} bytes)")
                except Exception as fallback_e:
                    logger.warning(f"Fallback HTTP thumbnail fetch also failed: {fallback_e}")

            kml_coords_str = " ".join([f"{pt[0]},{pt[1]},0" for pt in ring_coords])

            # HTML Legend Table inside KML description
            legend_rows = "".join([
                f'<tr><td style="background-color:#{LULC_PALETTE[i]};width:16px;height:16px;border:1px solid #444;"></td>'
                f'<td style="padding-left:8px;font-size:12px;color:#222;">{LULC_CLASSES.get(i, f"Class {i}")}</td></tr>'
                for i in range(min(len(LULC_PALETTE), len(LULC_CLASSES)))
            ])

            def build_kml_content(image_href: str) -> str:
                return f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>GeoClass Land Cover Analysis ({payload.start_date} to {payload.end_date})</name>
    <open>1</open>
    <description><![CDATA[
      <h2>GeoClass Satellite Land Cover Classification</h2>
      <table cellpadding="4" cellspacing="0" style="font-family:Arial,sans-serif;font-size:12px;border-collapse:collapse;">
        <tr><td><b>Model:</b></td><td>{payload.model_type}</td></tr>
        <tr><td><b>Date Range:</b></td><td>{payload.start_date} to {payload.end_date}</td></tr>
        <tr><td><b>Center:</b></td><td>{center_lat:.5f}&deg; N, {center_lng:.5f}&deg; E</td></tr>
        <tr><td><b>Area:</b></td><td>{area_ha:,.2f} ha ({area_ha/100:,.2f} km&sup2;)</td></tr>
        <tr><td><b>Bounding Box:</b></td><td>[{west:.4f}, {south:.4f}] to [{east:.4f}, {north:.4f}]</td></tr>
        <tr><td><b>Coordinate System:</b></td><td>WGS84 (EPSG:4326)</td></tr>
      </table>
      <hr style="border:0;border-top:1px solid #ddd;margin:10px 0;"/>
      <h4>LULC Classification Palette</h4>
      <table cellpadding="3" cellspacing="0" style="font-family:Arial,sans-serif;">
        {legend_rows}
      </table>
    ]]></description>

    <!-- Ground Overlay: The colored classified raster draped on Google Earth 3D terrain -->
    <GroundOverlay>
      <name>Land Cover Classification Layer</name>
      <description>Classification map draped over 3D topography</description>
      <color>e6ffffff</color>
      <Icon>
        <href>{image_href}</href>
      </Icon>
      <LatLonBox>
        <north>{north}</north>
        <south>{south}</south>
        <east>{east}</east>
        <west>{west}</west>
        <rotation>0</rotation>
      </LatLonBox>
    </GroundOverlay>

    <!-- Vector AOI Boundary Outline -->
    <Style id="geoclassBoundary">
      <LineStyle>
        <color>ff4ca37f</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>254ca37f</color>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>AOI Boundary Outline</name>
      <styleUrl>#geoclassBoundary</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>{kml_coords_str}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>"""

            kmz_base64 = None
            if png_bytes:
                # In KMZ, the relative path points directly inside the archive (NO external network request)
                kmz_doc_kml = build_kml_content("files/classification.png")
                kmz_buf = io.BytesIO()
                with zipfile.ZipFile(kmz_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                    zf.writestr("doc.kml", kmz_doc_kml)
                    zf.writestr("files/classification.png", png_bytes)
                kmz_base64 = base64.b64encode(kmz_buf.getvalue()).decode("utf-8")

            # Fallback standalone KML with XML-escaped remote URL
            xml_safe_remote_url = overlay_url.replace("&", "&amp;")
            standalone_kml = build_kml_content(xml_safe_remote_url)

            return {
                "download_url": None,
                "export_format": payload.export_format,
                "kml_data": standalone_kml,
                "kmz_base64": kmz_base64
            }

        # Adaptive scale calculation for GeoTIFF and PNG
        if area_ha > 500000:
            export_scale = 120
        elif area_ha > 100000:
            export_scale = 60
        elif area_ha > 30000:
            export_scale = 30
        elif area_ha > 10000:
            export_scale = 20
        else:
            export_scale = 10

        if payload.export_format == "png":
            thumb_url = classified_image.getThumbURL({
                'name': f'geoclass_map_{payload.start_date}',
                'dimensions': 2048,
                'region': aoi,
                'format': 'png',
                'min': 0,
                'max': 8,
                'palette': LULC_PALETTE
            })
            if api_key and "?key=" not in thumb_url and "&key=" not in thumb_url:
                sep = "&" if "?" in thumb_url else "?"
                thumb_url += f"{sep}key={api_key}"
            # Fetch the PNG image server-side to avoid HTTP referer blocking
            try:
                img_response = requests.get(thumb_url, timeout=60, headers={
                    'Referer': 'https://geoclass.vercel.app'
                })
                img_response.raise_for_status()
                png_base64 = base64.b64encode(img_response.content).decode('utf-8')
                download_url = f"data:image/png;base64,{png_base64}"
            except Exception as img_err:
                logger.warning(f"Server-side PNG fetch failed, falling back to direct URL: {img_err}")
                download_url = thumb_url
        else:
            # Default to GeoTIFF (WGS84 EPSG:4326 for QGIS, ArcGIS, Leapfrog)
            download_url = classified_image.getDownloadURL({
                'name': f'geoclass_classification_{payload.start_date}',
                'scale': export_scale,
                'crs': 'EPSG:4326',
                'region': aoi,
                'fileFormat': 'GeoTIFF'
            })

        return {
            "download_url": download_url,
            "export_format": payload.export_format
        }

    except Exception as e:
        logger.error(f"Error generating download link: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate download URL: {e}"
        )

@app.post("/api/ai/sam-segment")
def sam_segment(payload: SmartSelectRequest):
    """
    SAM-inspired interactive feature extraction.
    Given a prompt point [lng, lat], extracts the enclosing contiguous feature boundary.
    """
    try:
        result = perform_sam_smart_select(
            click_point=payload.point,
            aoi_coords=payload.aoi_coords,
            tolerance_radius_m=payload.tolerance_radius_m,
            feature_category=payload.feature_category
        )
        return result
    except Exception as e:
        logger.error(f"Error in SAM segment endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SAM segmentation failed: {e}"
        )

@app.post("/api/ai/extract-buildings")
def extract_buildings(payload: BuildingExtractRequest):
    """
    Extracts building footprint polygons within the AOI with
    orthogonal geometric regularization and spatial metrics.
    """
    try:
        result = extract_and_regularize_buildings(
            aoi_coords=payload.coords,
            start_date=payload.start_date,
            end_date=payload.end_date,
            regularize=payload.regularize,
            min_building_area_m2=payload.min_building_area_m2
        )
        return result
    except Exception as e:
        logger.error(f"Error in building extraction endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Building footprint extraction failed: {e}"
        )

@app.post("/api/ai/quality-assessment")
def quality_assessment(payload: QualityAssessmentRequest):
    """
    Evaluates AI atmospheric clarity, haze index, and cloud penetration ratings.
    """
    try:
        result = compute_ai_quality_metrics(
            aoi_coords=payload.coords,
            cloud_percentage=payload.cloud_cover
        )
        return result
    except Exception as e:
        logger.error(f"Error in quality assessment endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quality assessment failed: {e}"
        )

@app.post("/api/ai/deep-change-detection")
def deep_change_detection(payload: DeepChangeRequest):
    """
    Computes a deep learning LULC transition matrix and ecological trajectory shifts
    between target and baseline temporal periods.
    """
    try:
        result = compute_bitemporal_transition_matrix(
            aoi_coords=payload.coords,
            target_stats=payload.target_stats,
            baseline_stats=payload.baseline_stats
        )
        return result
    except Exception as e:
        logger.error(f"Error in deep change detection endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deep change detection failed: {e}"
        )

@app.post("/api/ai/super-resolution")
def super_resolution(payload: SuperResolutionRequest):
    """
    4x spatial super-resolution enhancement from 10m Sentinel-2 to 2.5m synthetic resolution.
    """
    try:
        result = compute_super_resolution_tiles(
            aoi_coords=payload.coords,
            start_date=payload.start_date,
            end_date=payload.end_date,
            cloud_percentage=payload.cloud_cover
        )
        return result
    except Exception as e:
        logger.error(f"Error in super resolution endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Super-resolution failed: {e}"
        )

@app.post("/api/ai/water-dynamics")
def water_dynamics(payload: WaterDynamicsRequest):
    """
    Analyzes seasonal surface water dynamics, flood boundary tracking, and drought vulnerability.
    """
    try:
        result = compute_water_dynamics(
            aoi_coords=payload.coords,
            start_date=payload.start_date,
            end_date=payload.end_date
        )
        return result
    except Exception as e:
        logger.error(f"Error in water dynamics endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Water dynamics analysis failed: {e}"
        )

@app.post("/api/ai/canopy-height")
def canopy_height(payload: CanopyHeightRequest):
    """
    Estimates tree canopy height distributions, structural strata, and biomass carbon stock.
    """
    try:
        result = compute_canopy_height_estimation(
            aoi_coords=payload.coords,
            start_date=payload.start_date,
            end_date=payload.end_date,
            forest_stats=payload.forest_stats
        )
        return result
    except Exception as e:
        logger.error(f"Error in canopy height endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Canopy height estimation failed: {e}"
        )

@app.post("/api/terrain/analyze")
def analyze_terrain(payload: TerrainAnalyzeRequest):
    """
    Computes topographic elevation, slope stability classes (0-5, 5-15, 15-25, 25-35, >35 deg),
    aspect distribution, and LULC x Slope geotechnical hazard cross-matrix using Copernicus 30m Global DEM.
    """
    try:
        result = compute_terrain_metrics(
            aoi_coords=payload.coords,
            start_date=payload.start_date,
            end_date=payload.end_date
        )
        return result
    except Exception as e:
        logger.error(f"Error in terrain analysis endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terrain analysis failed: {e}"
        )

@app.post("/api/terrain/elevation-profile")
def elevation_profile(payload: ElevationProfileRequest):
    """
    Computes elevation profile transect slice along a user-drawn polyline across Copernicus 30m DEM.
    """
    try:
        if len(payload.line_coords) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 2 coordinate points are required for an elevation profile transect."
            )
        result = compute_elevation_profile(
            line_coords=payload.line_coords,
            num_samples=payload.num_samples,
            start_location=payload.start_location,
            end_location=payload.end_location
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in elevation profile endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Elevation profile calculation failed: {e}"
        )

@app.post("/api/spectral/analyze")
def analyze_spectral(payload: SpectralAnalyzeRequest):
    """
    Computes NDBI (built-up), MNDWI (water), and NBR (burn severity) index statistics,
    zonal footprints, and map tile URLs across the Area of Interest.
    """
    try:
        result = compute_spectral_analysis(
            aoi_coords=payload.coords,
            start_date=payload.start_date,
            end_date=payload.end_date
        )
        return result
    except Exception as e:
        logger.error(f"Error in spectral analysis endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Spectral analysis failed: {e}"
        )

@app.post("/api/spectral/inspect-pixel")
def inspect_pixel(payload: PixelSpectrumRequest):
    """
    Extracts 10-band Sentinel-2 spectral reflectance curve, computes diagnostic indices
    (NDVI, NDBI, MNDWI, NBR, NDRE, BSI), and classifies the spectral surface archetype.
    """
    try:
        result = inspect_pixel_spectrum(
            lat=payload.lat,
            lng=payload.lng,
            start_date=payload.start_date,
            end_date=payload.end_date
        )
        return result
    except Exception as e:
        logger.error(f"Error in pixel spectral inspection endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pixel spectral inspection failed: {e}"
        )


@app.post("/api/timeseries/pixel-history")
def pixel_timeseries_history(payload: PixelTimelineRequest):
    """
    Extracts a 5-year multi-index temporal time-series (NDVI, MNDWI, NBR, NDBI) across Sentinel-2
    harmonized surface reflectance and executes automated statistical disturbance/anomaly detection.
    """
    try:
        result = extract_pixel_timeseries(
            lat=payload.lat,
            lng=payload.lng,
            start_year=payload.start_year or 2021,
            end_year=payload.end_year or 2025,
            interval=payload.interval or "quarterly"
        )
        return result
    except Exception as e:
        logger.error(f"Error in pixel timeseries history endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Temporal time-series extraction failed: {e}"
        )


@app.post("/api/export/pdf-briefing")
def export_pdf_briefing(payload: PDFBriefingRequest):
    """
    Generates an executive PDF briefing report bundling geodetic extent,
    Sentinel-2 sensor metadata, LULC area distribution table, vector chart,
    and automated ecological risk bullets.
    """
    try:
        pdf_bytes = generate_executive_pdf(
            coords=payload.coords,
            statistics=payload.statistics,
            total_area_ha=payload.total_area_ha,
            start_date=payload.start_date,
            end_date=payload.end_date,
            cloud_cover=payload.cloud_cover or 20.0,
            model_type=payload.model_type or "random_forest",
            cloud_mask_type=payload.cloud_mask_type or "both",
            seasonal_filter=payload.seasonal_filter or "all",
            location_name=payload.location_name
        )
        filename = f"GeoClass_Executive_Briefing_{date.today().isoformat()}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.error(f"Failed to generate executive PDF briefing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Executive PDF briefing generation failed: {e}"
        )


# ---------------------------------------------------------------------------
# Developer REST API v1
# ---------------------------------------------------------------------------

@app.get("/api/v1/health", tags=["Developer API v1"])
def api_v1_health():
    """
    Developer API v1 health check endpoint verifying Earth Engine connectivity and system readiness.
    """
    return get_status()


@app.post("/api/v1/classify", tags=["Developer API v1"])
def api_v1_classify(payload: ClassifyRequest):
    """
    Developer API v1 endpoint to perform land cover classification on an arbitrary GeoJSON AOI polygon.
    Supports Random Forest ML, Deep Learning Spatial Context, Dynamic World, and Sentinel-1 SAR microwave fusion.
    """
    return classify_aoi(payload)


@app.post("/api/v1/sar-composite", tags=["Developer API v1"])
def api_v1_sar_composite(payload: AOIRequest):
    """
    Developer API v1 endpoint generating a dual-polarization Sentinel-1 C-band SAR composite (VV, VH, VV/VH ratio).
    Returns cloud-penetrating SAR false-color tile URLs and sensor metadata.
    """
    if not initialize_gee():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Earth Engine is not initialized."
        )
    try:
        aoi = coords_to_ee_geometry(payload.coords)
        sar_composite = get_s1_sar_composite(aoi, payload.start_date, payload.end_date)
        vis_sar = {
            'bands': ['VV', 'VH', 'VV_VH_ratio'],
            'min': [-20.0, -25.0, 0.0],
            'max': [0.0, -5.0, 15.0]
        }
        tile_url = get_map_tile_url(sar_composite, vis_sar)
        return {
            "sar_tile_url": tile_url,
            "bands": ["VV", "VH", "VV_VH_ratio"],
            "polarization_mode": "IW (Interferometric Wide Swath)",
            "frequency": "C-band (5.405 GHz)",
            "spatial_resolution": "10m",
            "date_range": {
                "start_date": payload.start_date,
                "end_date": payload.end_date
            }
        }
    except Exception as e:
        logger.error(f"Error generating SAR composite in api_v1: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SAR composite generation failed: {e}"
        )


@app.post("/api/v1/spectral", tags=["Developer API v1"])
def api_v1_spectral(payload: SpectralAnalyzeRequest):
    """
    Developer API v1 endpoint computing multi-index spectral diagnostic metrics (NDBI, MNDWI, NBR)
    and index visualization tile URLs.
    """
    return analyze_spectral(payload)


@app.post("/api/v1/timeseries", tags=["Developer API v1"])
def api_v1_timeseries(payload: PixelTimelineRequest):
    """
    Developer API v1 endpoint extracting multi-year pixel trajectory history with anomaly and trend detection.
    """
    return pixel_timeseries_history(payload)


@app.post("/api/change/analyze")
def analyze_temporal_change(payload: ChangeDetectionRequest):
    """
    Multi-temporal LandTrendr-style disturbance detection and trend break analysis
    across annual Sentinel-2 composites.
    """
    try:
        result = compute_temporal_change_engine(
            aoi_coords=payload.coords,
            start_year=payload.start_year or 2020,
            end_year=payload.end_year or 2024,
            index_name=payload.index_name or "nbr",
            sensitivity=payload.sensitivity or "moderate"
        )
        return result
    except Exception as e:
        logger.error(f"Error in change detection endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Change detection analysis failed: {e}"
        )


@app.post("/api/v1/change-detection", tags=["Developer API v1"])
def api_v1_change_detection(payload: ChangeDetectionRequest):
    """
    Developer API v1 endpoint running multi-temporal LandTrendr disturbance onset and trajectory segmentation.
    Returns annual disturbance breakdown, net canopy loss/gain, and Earth Engine map tile URLs.
    """
    return analyze_temporal_change(payload)


@app.post("/api/stac/search")
def search_stac(payload: STACSearchRequest):
    """
    Search multi-mission open EO scenes across user AOI via Earth Engine STAC-compliant collections.
    """
    try:
        stac_res = search_stac_scenes(
            aoi_coords=payload.coords,
            start_date=payload.start_date,
            end_date=payload.end_date,
            collections=payload.collections,
            max_cloud=payload.max_cloud_cover or 30.0,
            limit=payload.limit or 25
        )
        features_list = stac_res.get("features", []) if isinstance(stac_res, dict) else stac_res
        return {
            "total_found": len(features_list),
            "features": features_list,
            "query": {
                "start_date": payload.start_date,
                "end_date": payload.end_date,
                "collections": payload.collections or ["sentinel-2", "landsat-8", "landsat-9", "sentinel-1"],
                "max_cloud_cover": payload.max_cloud_cover or 30.0
            }
        }
    except Exception as e:
        logger.error(f"Error in STAC search: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"STAC search failed: {e}"
        )


@app.post("/api/v1/stac/search", tags=["Developer API v1"])
def api_v1_stac_search(payload: STACSearchRequest):
    """
    Developer API v1 endpoint querying STAC-compliant Earth Observation scenes for Copernicus and USGS constellations.
    """
    return search_stac(payload)


@app.post("/api/landsat/map-id")
def get_landsat_map_tiles(payload: LandsatCompositeRequest):
    """
    Generate Google Earth Engine XYZ tile URLs for Landsat 8/9 Collection 2 Tier 1 Surface Reflectance.
    Returns True Color, False Color (SWIR/NIR/Red), and NDVI visualization tile URLs.
    """
    try:
        aoi = coords_to_ee_geometry(payload.coords)
        composite = get_landsat_composite(
            aoi=aoi,
            start_date=payload.start_date,
            end_date=payload.end_date,
            cloud_percentage=payload.cloud_percentage or 20.0
        )
        tc_url = composite.get("true_color_url") or composite.get("true_color_tile_url")
        fc_url = composite.get("false_color_url") or composite.get("false_color_tile_url")
        ndvi_url = composite.get("ndvi_url") or composite.get("ndvi_tile_url")

        return {
            "true_color_url": tc_url,
            "false_color_url": fc_url,
            "ndvi_url": ndvi_url,
            "sensor": "Landsat 8/9 OLI Collection 2 Tier 1",
            "resolution": "30m"
        }
    except Exception as e:
        logger.error(f"Error generating Landsat tiles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Landsat composite generation failed: {e}"
        )


@app.post("/api/v1/landsat-composite", tags=["Developer API v1"])
def api_v1_landsat_composite(payload: LandsatCompositeRequest):
    """
    Developer API v1 endpoint generating Landsat 8/9 Level 2 Tier 1 composites and map tile URLs.
    """
    return get_landsat_map_tiles(payload)







