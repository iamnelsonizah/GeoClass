import os
import logging
from typing import List, Dict, Any, Optional
import datetime
import ee

from gee_service import initialize_gee

logger = logging.getLogger(__name__)

def mask_s2_clouds(image: ee.Image) -> ee.Image:
    """
    Masks clouds and cirrus using both QA60 bitmask and SCL (Scene Classification Layer).
    """
    qa = image.select('QA60')
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    qa_mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(
        qa.bitwiseAnd(cirrus_bit_mask).eq(0)
    )

    # If SCL band is available, mask out cloud shadows (3), clouds medium (8), clouds high (9), cirrus (10)
    scl = image.select('SCL')
    scl_mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10))
    
    combined_mask = qa_mask.And(scl_mask)
    return image.updateMask(combined_mask).divide(10000.0)


def extract_pixel_timeseries(
    lat: float,
    lng: float,
    start_year: int = 2021,
    end_year: int = 2025,
    interval: str = "quarterly"
) -> Dict[str, Any]:
    """
    Extracts a multi-year historical time-series of Sentinel-2 spectral indices (NDVI, MNDWI, NBR, NDBI)
    at a single geographic point using a single batched Earth Engine server-side RPC.
    """
    initialize_gee()
    point = ee.Geometry.Point([lng, lat])

    # Build date intervals
    intervals = []
    current_year = datetime.datetime.now().year
    end_year = min(end_year, current_year)
    start_year = max(2017, min(start_year, end_year))

    if interval == "monthly":
        for yr in range(start_year, end_year + 1):
            for m in range(1, 13):
                # Don't query future dates
                if yr == current_year and m > datetime.datetime.now().month:
                    break
                s_date = f"{yr}-{m:02d}-01"
                if m == 12:
                    e_date = f"{yr+1}-01-01"
                else:
                    e_date = f"{yr}-{m+1:02d}-01"
                label = f"{yr}-{m:02d}"
                intervals.append({"start": s_date, "end": e_date, "label": label, "year": yr, "period_index": yr * 12 + m})
    else:
        # Quarterly by default (optimal balance between temporal resolution and cloud-free compositing)
        quarter_defs = [
            ("Q1", "-01-01", "-04-01"),
            ("Q2", "-04-01", "-07-01"),
            ("Q3", "-07-01", "-10-01"),
            ("Q4", "-10-01", "-12-31"),
        ]
        now_dt = datetime.datetime.now()
        for yr in range(start_year, end_year + 1):
            for q_name, s_suffix, e_suffix in quarter_defs:
                s_date = f"{yr}{s_suffix}"
                # If Q4, end date is next year Jan 01 for full coverage
                e_date = f"{yr+1}-01-01" if q_name == "Q4" else f"{yr}{e_suffix}"
                
                # Skip future quarters
                s_dt = datetime.datetime.strptime(s_date, "%Y-%m-%d")
                if s_dt > now_dt:
                    break

                label = f"{yr}-{q_name}"
                intervals.append({"start": s_date, "end": e_date, "label": label, "year": yr})

    ee_intervals = ee.List(intervals)

    def sample_interval(item):
        item = ee.Dictionary(item)
        start_d = item.getString('start')
        end_d = item.getString('end')
        label = item.getString('label')

        col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
               .filterBounds(point)
               .filterDate(start_d, end_d)
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50))
               .map(mask_s2_clouds))

        comp = col.median()
        
        # Calculate indices
        ndvi = comp.normalizedDifference(['B8', 'B4']).rename('ndvi')
        mndwi = comp.normalizedDifference(['B3', 'B11']).rename('mndwi')
        nbr = comp.normalizedDifference(['B8', 'B12']).rename('nbr')
        ndbi = comp.normalizedDifference(['B11', 'B8']).rename('ndbi')
        
        indexed_img = comp.select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']).addBands([ndvi, mndwi, nbr, ndbi])
        
        stats = indexed_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=point,
            scale=10,
            maxPixels=1e6
        )

        return ee.Feature(None, stats).set({
            'period': label,
            'start_date': start_d,
            'end_date': end_d
        })

    sampled_fc = ee.FeatureCollection(ee_intervals.map(sample_interval))
    fc_info = sampled_fc.getInfo()

    # Parse and clean output points
    raw_points = []
    for feat in fc_info.get('features', []):
        props = feat.get('properties', {})
        period = props.get('period')
        start_date = props.get('start_date')
        end_date = props.get('end_date')
        ndvi = props.get('ndvi')
        mndwi = props.get('mndwi')
        nbr = props.get('nbr')
        ndbi = props.get('ndbi')

        # Clean numerical values
        point_data = {
            "period": period,
            "start_date": start_date,
            "end_date": end_date,
            "ndvi": round(ndvi, 4) if isinstance(ndvi, (int, float)) else None,
            "mndwi": round(mndwi, 4) if isinstance(mndwi, (int, float)) else None,
            "nbr": round(nbr, 4) if isinstance(nbr, (int, float)) else None,
            "ndbi": round(ndbi, 4) if isinstance(ndbi, (int, float)) else None,
            "has_data": isinstance(ndvi, (int, float))
        }
        raw_points.append(point_data)

    # Impute missing values (e.g. temporary cloud coverage in 1 quarter) via linear interpolation
    clean_points = impute_missing_data(raw_points)

    # Run automated disturbance detection
    analysis = detect_disturbances(clean_points)

    return {
        "coordinates": {"lat": lat, "lng": lng},
        "timeframe": {
            "start_year": start_year,
            "end_year": end_year,
            "interval": interval,
            "total_intervals": len(clean_points)
        },
        "points": clean_points,
        "disturbances": analysis.get("disturbances", []),
        "trajectory": analysis.get("trajectory", {}),
        "summary": analysis.get("summary", "")
    }


def impute_missing_data(points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Fills in isolated missing quarters (due to cloudiness) using linear interpolation
    between adjacent valid timestamps to ensure smooth timeline charting.
    """
    n = len(points)
    if n == 0:
        return points

    indices_keys = ["ndvi", "mndwi", "nbr", "ndbi"]
    filled = [dict(pt) for pt in points]

    for key in indices_keys:
        for i in range(n):
            if filled[i][key] is None:
                # Find previous valid
                prev_val = None
                for p in range(i - 1, -1, -1):
                    if filled[p][key] is not None:
                        prev_val = filled[p][key]
                        break

                # Find next valid
                next_val = None
                for nx in range(i + 1, n):
                    if filled[nx][key] is not None:
                        next_val = filled[nx][key]
                        break

                if prev_val is not None and next_val is not None:
                    interpolated = round((prev_val + next_val) / 2.0, 4)
                    filled[i][key] = interpolated
                    filled[i]["interpolated"] = True
                elif prev_val is not None:
                    filled[i][key] = prev_val
                elif next_val is not None:
                    filled[i][key] = next_val
                else:
                    filled[i][key] = 0.0

    return filled


def detect_disturbances(points: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Runs automated statistical anomaly and step-change detection across the multi-year time-series.
    Identifies sudden vegetation loss, quarry expansion, water inundation, and burn events.
    """
    valid_points = [p for p in points if p.get("ndvi") is not None]
    if len(valid_points) < 3:
        return {
            "disturbances": [],
            "trajectory": {
                "trend": "Insufficient Data",
                "slope": 0.0,
                "net_change_ndvi": 0.0,
                "badge_color": "#95a5a6"
            },
            "summary": "Insufficient temporal observations to detect disturbance trends."
        }

    ndvi_vals = [p["ndvi"] for p in valid_points]
    mndwi_vals = [p["mndwi"] for p in valid_points]
    nbr_vals = [p["nbr"] for p in valid_points]
    periods = [p["period"] for p in valid_points]

    disturbances = []

    # 1. Step-change and Anomaly Detection
    for i in range(1, len(valid_points)):
        delta_ndvi = round(ndvi_vals[i] - ndvi_vals[i - 1], 4)
        delta_mndwi = round(mndwi_vals[i] - mndwi_vals[i - 1], 4)
        delta_nbr = round(nbr_vals[i] - nbr_vals[i - 1], 4)

        prev_pt = valid_points[i - 1]
        curr_pt = valid_points[i]

        # Case A: Forest Clearing / Rapid Canopy Removal
        if delta_ndvi <= -0.16 and prev_pt["ndvi"] >= 0.40:
            severity = "High" if delta_ndvi <= -0.25 else "Moderate"
            disturbances.append({
                "period": curr_pt["period"],
                "date": curr_pt["start_date"],
                "type": "Deforestation / Canopy Removal",
                "severity": severity,
                "badge_color": "#e74c3c",
                "delta": delta_ndvi,
                "primary_index": "NDVI",
                "description": f"Sharp vegetation drop ({delta_ndvi:+.2f}) from baseline {prev_pt['ndvi']:.2f} to {curr_pt['ndvi']:.2f}. Indicates clear-cutting, land clearing, or site preparation."
            })

        # Case B: Surface Excavation / Open-pit Quarry Expansion
        elif delta_ndvi <= -0.12 and delta_nbr <= -0.15 and curr_pt["ndvi"] < 0.28:
            disturbances.append({
                "period": curr_pt["period"],
                "date": curr_pt["start_date"],
                "type": "Surface Stripping / Excavation",
                "severity": "High",
                "badge_color": "#d35400",
                "delta": delta_ndvi,
                "primary_index": "NDVI & NBR",
                "description": f"Drop in canopy ({delta_ndvi:+.2f}) coupled with exposed bare ground signature. Typical of pit expansion, quarry stripping, or earthworks."
            })

        # Case C: Water Inundation / Flooding / Tailings Reservoir Filling
        elif delta_mndwi >= 0.18 and curr_pt["mndwi"] > -0.05:
            disturbances.append({
                "period": curr_pt["period"],
                "date": curr_pt["start_date"],
                "type": "Water Inundation / Submergence",
                "severity": "Moderate" if delta_mndwi < 0.3 else "High",
                "badge_color": "#2980b9",
                "delta": delta_mndwi,
                "primary_index": "MNDWI",
                "description": f"Rapid water index surge ({delta_mndwi:+.2f}) reaching {curr_pt['mndwi']:.2f}. Indicates inundation, reservoir filling, tailings spill, or wetland flooding."
            })

        # Case D: Biomass Burning / Severe Dieback
        elif delta_nbr <= -0.22 and delta_ndvi <= -0.12:
            disturbances.append({
                "period": curr_pt["period"],
                "date": curr_pt["start_date"],
                "type": "Wildfire / Severe Burn Scar",
                "severity": "High",
                "badge_color": "#c0392b",
                "delta": delta_nbr,
                "primary_index": "NBR",
                "description": f"Severe drop in Normalized Burn Ratio ({delta_nbr:+.2f}). Characteristic of recent wildfire burn scar or agricultural slash burning."
            })

        # Case E: Accelerated Revegetation / Greening
        elif delta_ndvi >= 0.18 and prev_pt["ndvi"] < 0.35:
            disturbances.append({
                "period": curr_pt["period"],
                "date": curr_pt["start_date"],
                "type": "Revegetation / Canopy Regrowth",
                "severity": "Positive",
                "badge_color": "#27ae60",
                "delta": delta_ndvi,
                "primary_index": "NDVI",
                "description": f"Rapid green canopy gain ({delta_ndvi:+.2f}) from {prev_pt['ndvi']:.2f} to {curr_pt['ndvi']:.2f}. Indicates seasonal crop growth or post-disturbance rehabilitation."
            })

    # 2. Overall 5-Year Trajectory & Slope Calculation
    baseline_ndvi = valid_points[0]["ndvi"]
    latest_ndvi = valid_points[-1]["ndvi"]
    net_ndvi_change = round(latest_ndvi - baseline_ndvi, 4)

    # Simple linear regression slope across intervals
    n = len(ndvi_vals)
    x = list(range(n))
    x_mean = sum(x) / n
    y_mean = sum(ndvi_vals) / n
    numerator = sum((x[i] - x_mean) * (ndvi_vals[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n)) or 1.0
    slope = round(numerator / denominator, 4)

    if slope < -0.012 or net_ndvi_change < -0.15:
        trend_label = "Persistent Canopy Loss / Degradation"
        trend_color = "#e74c3c"
        trend_badge = "Degradation"
    elif slope > 0.012 or net_ndvi_change > 0.15:
        trend_label = "Active Greening / Post-Disturbance Recovery"
        trend_color = "#27ae60"
        trend_badge = "Greening"
    elif abs(net_ndvi_change) <= 0.08 and abs(slope) <= 0.006:
        trend_label = "Stable Baseline / Dynamic Equilibrium"
        trend_color = "#3498db"
        trend_badge = "Stable"
    else:
        trend_label = "Moderate Fluctuations / Seasonal Drift"
        trend_color = "#f39c12"
        trend_badge = "Moderate Drift"

    summary_text = (
        f"Over the {periods[0]} to {periods[-1]} timeframe, this location experienced a net NDVI delta of {net_ndvi_change:+.2f} "
        f"(from baseline {baseline_ndvi:.2f} to current {latest_ndvi:.2f}). "
        f"Detected {len(disturbances)} discrete land cover disturbance event(s). "
        f"Long-term trajectory classified as '{trend_label}'."
    )

    return {
        "disturbances": disturbances,
        "trajectory": {
            "trend": trend_label,
            "badge": trend_badge,
            "badge_color": trend_color,
            "slope": slope,
            "net_change_ndvi": net_ndvi_change,
            "baseline_ndvi": baseline_ndvi,
            "latest_ndvi": latest_ndvi,
            "disturbance_count": len(disturbances)
        },
        "summary": summary_text
    }
