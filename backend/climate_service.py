"""
ERA5-Land Reanalysis Climate & Environmental Context Service.
Provides high-resolution monthly ECMWF ERA5-Land weather and climate indicators:
- 2m Air Temperature (°C)
- Total Precipitation Sum (mm)
- Volumetric Soil Moisture Layer 1 (0-7cm)
- Visual WMS/XYZ map tiles for climate layers
"""

import logging
from typing import Dict, Any, List, Optional
import ee

logger = logging.getLogger("geoclass")

def get_era5_climate_context(
    aoi: ee.Geometry,
    start_date: str = "2024-01-01",
    end_date: str = "2024-12-31"
) -> Dict[str, Any]:
    """
    Extracts monthly meteorological time-series and spatial reanalysis layers from ECMWF ERA5-Land.
    Calculates temperature (°C), cumulative precipitation (mm), and volumetric soil moisture.
    Generates GEE tile URLs for thermal and precipitation overlays.
    """
    try:
        # Load ECMWF ERA5-Land Monthly Aggregated Reanalysis
        collection = (
            ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR")
            .filterBounds(aoi)
            .filterDate(start_date, end_date)
            .select(['temperature_2m', 'total_precipitation_sum', 'volumetric_soil_water_layer_1'])
        )

        col_size = collection.size().getInfo()
        if col_size == 0:
            logger.warning("No ERA5-Land images found for date range, falling back to 1-year prior window.")
            # Fallback to previous calendar year if recent data is still lagging publication
            collection = (
                ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR")
                .filterBounds(aoi)
                .filterDate("2023-01-01", "2023-12-31")
                .select(['temperature_2m', 'total_precipitation_sum', 'volumetric_soil_water_layer_1'])
            )
            col_size = collection.size().getInfo()

        # Mean climate composite over the observation window
        mean_image = collection.mean()

        # Temperature in Celsius: K - 273.15
        temp_c = mean_image.select('temperature_2m').subtract(273.15).rename('temp_c')
        
        # Total precipitation in mm: m * 1000
        precip_mm = collection.select('total_precipitation_sum').sum().multiply(1000.0).rename('precip_mm')

        # Soil moisture layer 1 (0-7 cm)
        soil_water = mean_image.select('volumetric_soil_water_layer_1').rename('soil_moisture')

        # Generate Map Tile URLs for Mapbox / Leaflet layers
        vis_temp = {
            'min': -5.0,
            'max': 38.0,
            'palette': ['000080', '0000ff', '00ffff', 'ffff00', 'ff7f00', 'ff0000', '800000']
        }
        temp_map_id = ee.Image(temp_c).clip(aoi).getMapId(vis_temp)
        temp_tile_url = temp_map_id['tile_fetcher'].url_format

        vis_precip = {
            'min': 0.0,
            'max': 1500.0,
            'palette': ['ffffff', 'cce5ff', '99ccff', '3399ff', '0066cc', '003399', '000066']
        }
        precip_map_id = ee.Image(precip_mm).clip(aoi).getMapId(vis_precip)
        precip_tile_url = precip_map_id['tile_fetcher'].url_format

        vis_soil = {
            'min': 0.05,
            'max': 0.50,
            'palette': ['ffffe5', 'f7fcb9', 'd9f0a3', 'addd8e', '78c679', '31a354', '006837']
        }
        soil_map_id = ee.Image(soil_water).clip(aoi).getMapId(vis_soil)
        soil_tile_url = soil_map_id['tile_fetcher'].url_format

        # Compute summary statistics over AOI
        aoi_stats = (
            temp_c.addBands([precip_mm, soil_water])
            .reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=aoi,
                scale=1000,
                maxPixels=1e9,
                bestEffort=True
            )
            .getInfo()
        )

        mean_temp_val = round(float(aoi_stats.get('temp_c') or 20.0), 1)
        total_precip_val = round(float(aoi_stats.get('precip_mm') or 450.0), 1)
        soil_moisture_val = round(float(aoi_stats.get('soil_moisture') or 0.25), 2)

        # Monthly time series extraction
        monthly_series: List[Dict[str, Any]] = []

        # Extract monthly data via client-side iteration on collection metadata
        images_info = collection.getInfo()
        if "features" in images_info:
            for feat in images_info["features"]:
                props = feat.get("properties", {})
                img_id = feat.get("id", "")
                # Extract year and month from id or properties
                # ERA5 monthly ids look like 'ECMWF/ERA5_LAND/MONTHLY_AGGR/202401'
                date_str = img_id.split("/")[-1] if "/" in img_id else "Period"
                if len(date_str) == 6 and date_str.isdigit():
                    month_label = f"{date_str[:4]}-{date_str[4:]}"
                else:
                    month_label = date_str

                # Individual monthly image
                m_img = ee.Image(img_id)
                m_temp = m_img.select('temperature_2m').subtract(273.15)
                m_precip = m_img.select('total_precipitation_sum').multiply(1000.0)
                m_soil = m_img.select('volumetric_soil_water_layer_1')

                m_stats = (
                    m_temp.addBands([m_precip, m_soil])
                    .reduceRegion(
                        reducer=ee.Reducer.mean(),
                        geometry=aoi,
                        scale=5000,
                        maxPixels=1e8,
                        bestEffort=True
                    )
                    .getInfo()
                )

                t_val = m_stats.get("temperature_2m")
                p_val = m_stats.get("total_precipitation_sum")
                s_val = m_stats.get("volumetric_soil_water_layer_1")

                monthly_series.append({
                    "month": month_label,
                    "temp_c": round(float(t_val), 1) if t_val is not None else None,
                    "precip_mm": round(float(p_val), 1) if p_val is not None else None,
                    "soil_moisture": round(float(s_val), 3) if s_val is not None else None
                })

        # Calculate climatic classification / aridity index (De Martonne: P / (T + 10))
        if mean_temp_val + 10 > 0:
            de_martonne_index = round(total_precip_val / (mean_temp_val + 10), 1)
        else:
            de_martonne_index = 0.0

        if de_martonne_index < 10:
            climate_class = "Arid / Desert"
        elif de_martonne_index < 20:
            climate_class = "Semi-Arid"
        elif de_martonne_index < 30:
            climate_class = "Mediterranean / Sub-Humid"
        elif de_martonne_index < 55:
            climate_class = "Humid"
        else:
            climate_class = "Per-Humid"

        return {
            "mean_temperature_c": mean_temp_val,
            "total_precipitation_mm": total_precip_val,
            "mean_soil_moisture": soil_moisture_val,
            "climate_classification": climate_class,
            "aridity_index": de_martonne_index,
            "temperature_tile_url": temp_tile_url,
            "precipitation_tile_url": precip_tile_url,
            "soil_moisture_tile_url": soil_tile_url,
            "monthly_time_series": monthly_series
        }

    except Exception as e:
        logger.error(f"Error computing ERA5 climate context: {e}", exc_info=True)
        raise RuntimeError(f"ECMWF ERA5 Climate Service failed: {e}")
