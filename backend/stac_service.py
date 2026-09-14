import logging
import datetime
from typing import List, Dict, Any, Optional
import ee

from gee_service import initialize_gee, get_map_tile_url

logger = logging.getLogger(__name__)

def mask_landsat_sr(image: ee.Image) -> ee.Image:
    """
    Masks clouds and cloud shadows for Landsat 8 and 9 Collection 2 Level 2 imagery
    using the QA_PIXEL bitmask and applies radiometric surface reflectance scale factors.
    """
    qa = image.select('QA_PIXEL')
    # Bit 3: Cloud, Bit 4: Cloud Shadow, Bit 2: Cirrus
    cloud = qa.bitwiseAnd(1 << 3).eq(0)
    shadow = qa.bitwiseAnd(1 << 4).eq(0)
    cirrus = qa.bitwiseAnd(1 << 2).eq(0)
    mask = cloud.And(shadow).And(cirrus)

    # Scale factor for surface reflectance bands: 0.0000275 * DN - 0.2
    optical_bands = image.select('SR_B.').multiply(0.0000275).add(-0.2)
    return image.addBands(optical_bands, None, True).updateMask(mask)


def get_landsat_composite(
    aoi: ee.Geometry,
    start_date: str = "2024-01-01",
    end_date: str = "2024-12-31",
    cloud_percentage: float = 30.0
) -> Dict[str, Any]:
    """
    Generates an all-optical cloud-screened USGS Landsat 8 and 9 harmonized surface reflectance composite.
    Returns the composite Earth Engine Image and tile URLs for True Color, False Color, and NDVI.
    """
    initialize_gee()

    # Query both Landsat 8 and Landsat 9 Collection 2 Tier 1 Level 2
    l8 = (ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
          .filterBounds(aoi)
          .filterDate(start_date, end_date)
          .filter(ee.Filter.lt('CLOUD_COVER', cloud_percentage))
          .map(mask_landsat_sr))

    l9 = (ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
          .filterBounds(aoi)
          .filterDate(start_date, end_date)
          .filter(ee.Filter.lt('CLOUD_COVER', cloud_percentage))
          .map(mask_landsat_sr))

    merged = l8.merge(l9)
    composite = merged.median().clip(aoi)

    # Calculate Landsat NDVI: (SR_B5 - SR_B4) / (SR_B5 + SR_B4)
    ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
    composite_with_ndvi = composite.addBands(ndvi)

    # True Color: SR_B4 (Red), SR_B3 (Green), SR_B2 (Blue)
    vis_true_color = {
        'bands': ['SR_B4', 'SR_B3', 'SR_B2'],
        'min': 0.0,
        'max': 0.3
    }

    # False Color: SR_B5 (NIR), SR_B4 (Red), SR_B3 (Green)
    vis_false_color = {
        'bands': ['SR_B5', 'SR_B4', 'SR_B3'],
        'min': 0.0,
        'max': 0.3
    }

    # NDVI
    vis_ndvi = {
        'bands': ['NDVI'],
        'min': -0.1,
        'max': 0.8,
        'palette': ['blue', 'white', 'green']
    }

    true_color_url = get_map_tile_url(composite, vis_true_color)
    false_color_url = get_map_tile_url(composite, vis_false_color)
    ndvi_url = get_map_tile_url(composite_with_ndvi, vis_ndvi)

    return {
        "composite_image": composite_with_ndvi,
        "image": composite_with_ndvi,
        "true_color_tile_url": true_color_url,
        "true_color_url": true_color_url,
        "false_color_tile_url": false_color_url,
        "false_color_url": false_color_url,
        "ndvi_tile_url": ndvi_url,
        "ndvi_url": ndvi_url,
        "sensor": "Landsat 8/9 OLI Collection 2 Tier 1",
        "spatial_resolution": "30m",
        "date_range": {
            "start_date": start_date,
            "end_date": end_date
        }
    }


def search_stac_scenes(
    aoi_coords: List[List[float]],
    start_date: str = "2024-01-01",
    end_date: str = "2024-12-31",
    collections: Optional[List[str]] = None,
    max_cloud: float = 30.0,
    limit: int = 25
) -> Dict[str, Any]:
    """
    Queries open Earth Observation SpatioTemporal Asset Catalog (STAC) collections
    intersecting the user Area of Interest (Sentinel-2, Landsat 8/9, Sentinel-1).
    """
    initialize_gee()

    if len(aoi_coords) > 0 and isinstance(aoi_coords[0][0], list):
        aoi = ee.Geometry.Polygon(aoi_coords)
    else:
        if aoi_coords[0] != aoi_coords[-1]:
            aoi_coords.append(aoi_coords[0])
        aoi = ee.Geometry.Polygon([aoi_coords])

    if not collections:
        collections = ["sentinel-2", "landsat-8", "landsat-9", "sentinel-1"]

    results = []

    # 1. Query Sentinel-2 MSI Level-2A
    if "sentinel-2" in collections:
        try:
            s2_col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                      .filterBounds(aoi)
                      .filterDate(start_date, end_date)
                      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud))
                      .sort('system:time_start', False)
                      .limit(limit))

            s2_info = s2_col.getInfo()
            for feat in s2_info.get('features', []):
                props = feat.get('properties', {})
                timestamp = props.get('system:time_start', 0)
                dt_str = datetime.datetime.fromtimestamp(timestamp / 1000.0, tz=datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                date_only = dt_str.split(' ')[0]

                results.append({
                    "id": feat.get('id', ''),
                    "collection": "sentinel-2-l2a",
                    "collection_title": "Sentinel-2 MSI Level-2A",
                    "platform": "Sentinel-2" + ("A" if "S2A" in feat.get('id', '') else "B"),
                    "sensor": "MSI (MultiSpectral Instrument)",
                    "datetime": dt_str,
                    "acquisition_datetime": dt_str,
                    "date": date_only,
                    "cloud_cover": round(float(props.get('CLOUDY_PIXEL_PERCENTAGE', 0.0)), 1),
                    "sun_elevation": round(float(props.get('MEAN_SOLAR_ZENITH_ANGLE', 0.0)), 1),
                    "resolution_m": 10,
                    "bands": ["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"],
                    "properties": props,
                    "stac_assets": {
                        "visual": f"https://earthsearch.element84.com/v1/collections/sentinel-2-l2a/items/{feat.get('id', '')}",
                        "provider": "ESA Copernicus"
                    }
                })
        except Exception as e:
            logger.warning(f"Error querying Sentinel-2 scenes in STAC search: {e}")

    # 2. Query Landsat 8 & 9 Collection 2 Tier 1
    if "landsat-8" in collections or "landsat-9" in collections:
        try:
            l_collections = []
            if "landsat-8" in collections:
                l_collections.append(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2'))
            if "landsat-9" in collections:
                l_collections.append(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))

            if l_collections:
                base_l = l_collections[0]
                for extra in l_collections[1:]:
                    base_l = base_l.merge(extra)

                l_col = (base_l.filterBounds(aoi)
                         .filterDate(start_date, end_date)
                         .filter(ee.Filter.lt('CLOUD_COVER', max_cloud))
                         .sort('system:time_start', False)
                         .limit(limit))

                l_info = l_col.getInfo()
                for feat in l_info.get('features', []):
                    props = feat.get('properties', {})
                    timestamp = props.get('system:time_start', 0)
                    dt_str = datetime.datetime.fromtimestamp(timestamp / 1000.0, tz=datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                    date_only = dt_str.split(' ')[0]
                    is_l9 = "LC09" in feat.get('id', '')

                    results.append({
                        "id": feat.get('id', ''),
                        "collection": "landsat-c2-l2",
                        "collection_title": "Landsat 9 OLI-2" if is_l9 else "Landsat 8 OLI",
                        "platform": "Landsat 9" if is_l9 else "Landsat 8",
                        "sensor": "OLI/TIRS Collection 2 Tier 1",
                        "datetime": dt_str,
                        "acquisition_datetime": dt_str,
                        "date": date_only,
                        "cloud_cover": round(float(props.get('CLOUD_COVER', 0.0)), 1),
                        "sun_elevation": round(float(props.get('SUN_ELEVATION', 0.0)), 1),
                        "resolution_m": 30,
                        "bands": ["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"],
                        "properties": props,
                        "stac_assets": {
                            "visual": f"https://landsatlook.usgs.gov/stac-server/collections/landsat-c2l2-sr/items/{feat.get('id', '')}",
                            "provider": "USGS / NASA"
                        }
                    })
        except Exception as e:
            logger.warning(f"Error querying Landsat scenes in STAC search: {e}")

    # 3. Query Sentinel-1 C-SAR GRD
    if "sentinel-1" in collections:
        try:
            s1_col = (ee.ImageCollection('COPERNICUS/S1_GRD')
                      .filterBounds(aoi)
                      .filterDate(start_date, end_date)
                      .filter(ee.Filter.eq('instrumentMode', 'IW'))
                      .sort('system:time_start', False)
                      .limit(limit))

            s1_info = s1_col.getInfo()
            for feat in s1_info.get('features', []):
                props = feat.get('properties', {})
                timestamp = props.get('system:time_start', 0)
                dt_str = datetime.datetime.fromtimestamp(timestamp / 1000.0, tz=datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                date_only = dt_str.split(' ')[0]

                results.append({
                    "id": feat.get('id', ''),
                    "collection": "sentinel-1-grd",
                    "collection_title": "Sentinel-1 C-SAR GRD",
                    "platform": "Sentinel-1",
                    "sensor": "C-SAR (Synthetic Aperture Radar)",
                    "datetime": dt_str,
                    "acquisition_datetime": dt_str,
                    "date": date_only,
                    "cloud_cover": 0.0,  # Radar penetrates clouds
                    "sun_elevation": 0.0,
                    "resolution_m": 10,
                    "bands": ["VV", "VH"],
                    "properties": props,
                    "stac_assets": {
                        "visual": f"https://browser.dataspace.copernicus.eu/?item={feat.get('id', '')}",
                        "provider": "ESA Copernicus"
                    }
                })
        except Exception as e:
            logger.warning(f"Error querying Sentinel-1 scenes in STAC search: {e}")

    # Sort combined results by acquisition datetime descending
    results.sort(key=lambda x: x.get('acquisition_datetime', ''), reverse=True)

    return {
        "status": "success",
        "total_scenes": len(results),
        "collections_queried": collections,
        "date_range": {
            "start_date": start_date,
            "end_date": end_date
        },
        "max_cloud_threshold": max_cloud,
        "features": results[:limit]
    }
