import os
import logging
from datetime import date
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
import ee

from gee_service import initialize_gee, get_s2_composite, get_dynamic_world_composite, get_map_tile_url, add_ndvi
from classifier import train_and_classify_gee, get_precomputed_statistics, LULC_PALETTE

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

# Enable CORS for frontend API calls. Set FRONTEND_ORIGINS in production to
# your exact Vercel URL, for example: https://your-app.vercel.app
frontend_origins = parse_csv_env(
    "FRONTEND_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)
frontend_origin_regex = os.getenv("FRONTEND_ORIGIN_REGEX") or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_origin_regex=frontend_origin_regex,
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
    model_type: str = Field("random_forest", description="Model type: 'random_forest' or 'dynamic_world'")

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
            cloud_percentage=payload.cloud_cover
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

        return {
            "true_color_tile_url": true_color_url,
            "false_color_tile_url": false_color_url,
            "ndvi_tile_url": ndvi_url
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
        
        if payload.model_type == "dynamic_world":
            # Use precomputed Dynamic World composite directly
            classified_image = dw_labels
            stats = get_precomputed_statistics(dw_labels, aoi)
        else:
            # Fetch Sentinel-2 composite for feature extraction
            s2_composite = get_s2_composite(
                aoi=aoi,
                start_date=payload.start_date,
                end_date=payload.end_date,
                cloud_percentage=payload.cloud_cover
            )
            
            # Train model and run classification
            classified_image, stats = train_and_classify_gee(
                s2_composite=s2_composite,
                label_composite=dw_labels,
                aoi=aoi,
                num_trees=payload.num_trees,
                sample_points=payload.sample_points
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
            "model_used": payload.model_type
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
    export_format: str = Field("geotiff", description="Export format: 'geotiff', 'png', 'geojson'")

@app.post("/api/gee/download-url")
def get_download_link(payload: DownloadRequest):
    """
    Generates a direct download link for the classification result
    supporting GeoTIFF, PNG, and GeoJSON formats.
    """
    if not initialize_gee():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Earth Engine is not initialized."
        )

    try:
        aoi = coords_to_ee_geometry(payload.coords)

        if payload.export_format == "geojson":
            # Return GeoJSON directly
            return {
                "download_url": None,
                "geojson_data": {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": payload.coords if isinstance(payload.coords[0][0], list) else [payload.coords]
                    },
                    "properties": {
                        "name": "GeoClass AI AOI Boundary",
                        "start_date": payload.start_date,
                        "end_date": payload.end_date,
                        "model_type": payload.model_type
                    }
                }
            }

        dw_labels = get_dynamic_world_composite(aoi, payload.start_date, payload.end_date)
        
        if payload.model_type == "dynamic_world":
            classified_image = dw_labels
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

        if payload.export_format == "png":
            # Generate visualization thumbnail URL (colored PNG)
            download_url = classified_image.getThumbURL({
                'name': 'geoclass_map',
                'scale': 10,
                'region': aoi,
                'format': 'png',
                'min': 0,
                'max': 8,
                'palette': LULC_PALETTE
            })
        else:
            # Default to GeoTIFF
            download_url = classified_image.getDownloadURL({
                'name': 'geoclass_classification',
                'scale': 10,
                'region': aoi,
                'fileFormat': 'GeoTIFF'
            })

        return {
            "download_url": download_url
        }

    except Exception as e:
        logger.error(f"Error generating download link: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate download URL: {e}"
        )
