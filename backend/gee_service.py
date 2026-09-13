import os
import logging
import base64
from typing import Dict, Any, List
import ee
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# GEE Global state tracker
gee_initialized = False

def initialize_gee() -> bool:
    """
    Initializes Google Earth Engine using service account JSON key,
    or falls back to default system credentials.
    """
    global gee_initialized
    if gee_initialized:
        return True

    project_id = os.getenv("GEE_PROJECT")
    sa_email = os.getenv("GEE_SERVICE_ACCOUNT")
    key_file = os.getenv("GEE_KEY_FILE", "credentials.json")
    key_data = os.getenv("GEE_SERVICE_ACCOUNT_JSON")
    key_data_b64 = os.getenv("GEE_SERVICE_ACCOUNT_JSON_B64")

    # Determine paths relative to backend root
    base_dir = os.path.dirname(os.path.abspath(__file__))
    key_path = os.path.join(base_dir, key_file)

    api_key = os.getenv("GEE_API_KEY") or os.getenv("GOOGLE_API_KEY")

    try:
        # Option 1: Prefer credentials supplied by the hosting platform.
        if key_data_b64 and not key_data:
            key_data = base64.b64decode(key_data_b64).decode("utf-8")

        if key_data:
            logger.info("Initializing Earth Engine with Service Account JSON from environment.")
            credentials = ee.ServiceAccountCredentials(sa_email or None, key_data=key_data)
            ee.Initialize(credentials, project=project_id)
            gee_initialized = True
            logger.info("Earth Engine initialized successfully via environment credentials.")
            return True

        # Option 2: Try Service Account key file if configured and exists
        if sa_email and os.path.exists(key_path):
            logger.info(f"Initializing Earth Engine with Service Account: {sa_email}")
            credentials = ee.ServiceAccountCredentials(sa_email, key_path)
            ee.Initialize(credentials, project=project_id)
            gee_initialized = True
            logger.info("Earth Engine initialized successfully via Service Account.")
            return True

        # Option 3: Fallback to Service Account key file at default path if it exists
        default_key_path = os.path.join(base_dir, "credentials.json")
        if os.path.exists(default_key_path):
            logger.info("Initializing Earth Engine with default credentials.json file...")
            credentials = ee.ServiceAccountCredentials("", default_key_path) # ee parses SA from JSON automatically
            ee.Initialize(credentials, project=project_id)
            gee_initialized = True
            logger.info("Earth Engine initialized successfully via credentials.json.")
            return True

        # Option 4: Fallback to default application default credentials
        logger.info("No service account credentials file found. Trying Default Credentials...")
        ee.Initialize(project=project_id)
        gee_initialized = True
        logger.info("Earth Engine initialized successfully via Default Credentials.")
        return True

    except Exception as e:
        logger.error(f"Failed to initialize Earth Engine: {e}")
        logger.error("Please ensure that you have configured the Earth Engine API, or placed your service account 'credentials.json' in the backend directory.")
        gee_initialized = False
        return False

def mask_s2_clouds_configured(
    image: ee.Image,
    mask_type: str = "both",
    mask_shadows: bool = True
) -> ee.Image:
    """
    Applies configurable cloud and shadow masking on Sentinel-2 L2A imagery.
    Supports:
    - 'scl': Scene Classification Layer (values 3: shadow, 8: med cloud, 9: high cloud, 10: cirrus)
    - 'qa60': Standard bitmask (bit 10: opaque clouds, bit 11: cirrus)
    - 'both': Dual-masking combining SCL and QA60 for strict cloud screening
    - 'none': Raw reflectance without masking
    """
    if mask_type == "none":
        return image

    mask = ee.Image(1)

    if mask_type in ("qa60", "both"):
        qa = image.select('QA60')
        cloud_bit = 1 << 10
        cirrus_bit = 1 << 11
        qa_mask = qa.bitwiseAnd(cloud_bit).eq(0).And(qa.bitwiseAnd(cirrus_bit).eq(0))
        mask = mask.And(qa_mask)

    if mask_type in ("scl", "both"):
        scl = image.select('SCL')
        scl_mask = scl.neq(8).And(scl.neq(9)).And(scl.neq(10))
        if mask_shadows:
            scl_mask = scl_mask.And(scl.neq(3))
        mask = mask.And(scl_mask)

    return image.updateMask(mask)


def mask_s2_clouds(image: ee.Image) -> ee.Image:
    """
    Default cloud and shadow masking wrapper for backward compatibility.
    """
    return mask_s2_clouds_configured(image, mask_type="both", mask_shadows=True)


def get_s2_composite(
    aoi: ee.Geometry, 
    start_date: str, 
    end_date: str, 
    cloud_percentage: float = 20.0,
    cloud_mask_type: str = "both",
    mask_shadows: bool = True,
    seasonal_filter: str = "all"
) -> ee.Image:
    """
    Fetches and cloud-masks Sentinel-2 Surface Reflectance imagery, returning a median composite.
    Supports configurable cloud screening (SCL / QA60 / Both) and seasonal filtering (Dry / Wet).
    """
    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(aoi)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloud_percentage))
    )

    # Apply seasonal filter if requested
    if seasonal_filter == "dry":
        # Filter for typical low-cloud dry periods (Nov-Apr)
        collection = collection.filter(
            ee.Filter.Or(
                ee.Filter.calendarRange(1, 4, 'month'),
                ee.Filter.calendarRange(11, 12, 'month')
            )
        )
    elif seasonal_filter == "wet":
        # Filter for wet / green season (May-Oct)
        collection = collection.filter(ee.Filter.calendarRange(5, 10, 'month'))
    
    # Apply configured cloud masking
    def mask_wrapper(img):
        return mask_s2_clouds_configured(img, mask_type=cloud_mask_type, mask_shadows=mask_shadows)

    masked_col = collection.map(mask_wrapper)
    
    # Calculate median composite across the date range and clip to AOI
    composite = masked_col.median().clip(aoi)
    
    # Rescale back to standard unit float scale (values in Sentinel-2 SR are 0-10000)
    spectral_bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']
    scaled = composite.select(spectral_bands).divide(10000.0)
    
    # Combine scaled spectral bands with any remaining bands
    return composite.addBands(scaled, overwrite=True)

def get_dynamic_world_composite(
    aoi: ee.Geometry, 
    start_date: str, 
    end_date: str
) -> ee.Image:
    """
    Fetches Dynamic World v1 LULC classifications and returns a mode composite.
    """
    collection = (
        ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
        .filterBounds(aoi)
        .filterDate(start_date, end_date)
    )
    # Use mode reducer to get the most frequent class label for each pixel
    return collection.select('label').reduce(ee.Reducer.mode()).clip(aoi).rename('label')

def add_ndvi(image: ee.Image) -> ee.Image:
    """
    Calculates and appends Normalized Difference Vegetation Index (NDVI) to the image.
    Formula: (B8 - B4) / (B8 + B4)
    """
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    return image.addBands(ndvi)

def get_map_tile_url(image: ee.Image, vis_params: Dict[str, Any]) -> str:
    """
    Generates a direct map tile URL from GEE using MapId.
    """
    map_id_dict = image.getMapId(vis_params)
    url_format = map_id_dict['tile_fetcher'].url_format
    api_key = os.getenv("GEE_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if api_key and "?key=" not in url_format and "&key=" not in url_format:
        separator = "&" if "?" in url_format else "?"
        url_format += f"{separator}key={api_key}"
    return url_format
