import logging
from typing import Dict, Any, Tuple
import ee

logger = logging.getLogger(__name__)

# Colors matching the classes
# Class IDs mapping:
# 0: Water -> #419BDF (Blue)
# 1: Trees/Forest -> #397D49 (Dark Green)
# 2: Grass/Vegetation -> #88B053 (Light Green)
# 3: Flooded Vegetation/Wetland -> #7A87C6 (Purple)
# 4: Crops/Agriculture -> #E49635 (Orange)
# 5: Shrub & Scrub -> #DFC35A (Yellow)
# 6: Built-up/Urban -> #C4281B (Red)
# 7: Bare Land/Desert -> #DFC35A (Tan/Sand)
# 8: Snow/Ice -> #B39FE1 (Light Blue/Lavender)

LULC_PALETTE = [
    '419BDF',  # 0: Water
    '397D49',  # 1: Trees/Forest
    '88B053',  # 2: Grass/Vegetation
    '7A87C6',  # 3: Flooded Veg/Wetland
    'E49635',  # 4: Crops/Agriculture
    'DFC35A',  # 5: Shrub & Scrub
    'C4281B',  # 6: Built-up/Urban
    'A59B8F',  # 7: Bare Land/Desert
    'B39FE1'   # 8: Snow/Ice
]

LULC_CLASSES = {
    0: "Water",
    1: "Forest",
    2: "Grass",
    3: "Wetland",
    4: "Agriculture",
    5: "Shrub",
    6: "Urban",
    7: "Bare Land",
    8: "Snow/Ice"
}

def train_and_classify_gee(
    s2_composite: ee.Image,
    label_composite: ee.Image,
    aoi: ee.Geometry,
    num_trees: int = 100,
    sample_points: int = 150
) -> Tuple[ee.Image, Dict[str, Any]]:
    """
    Trains an ee.Classifier.smileRandomForest on the GEE server.
    - Samples points from the label_composite (Dynamic World labels) in the AOI.
    - Uses Sentinel-2 bands + NDVI as features.
    - Classifies the S2 composite.
    - Computes area statistics in hectares.
    """
    logger.info("Starting GEE Random Forest training and classification...")

    # Calculate AOI area to determine scale dynamically
    try:
        area_ha = aoi.area().divide(10000).getInfo()
        logger.info(f"AOI Area: {area_ha:.2f} hectares")
    except Exception as e:
        logger.warning(f"Could not calculate area to determine scale, defaulting to 10m: {e}")
        area_ha = 0
        
    # Dynamically select scale to prevent memory limits
    if area_ha > 100000:  # > 100,000 ha (1,000 sq km)
        scale = 60
        logger.info(f"Large AOI (>100k ha) detected. Using adaptive scale: {scale}m")
    elif area_ha > 30000:  # > 30,000 ha (300 sq km)
        scale = 30
        logger.info(f"Medium-Large AOI (>30k ha) detected. Using adaptive scale: {scale}m")
    elif area_ha > 10000:  # > 10,000 ha (100 sq km)
        scale = 20
        logger.info(f"Medium AOI (>10k ha) detected. Using adaptive scale: {scale}m")
    else:
        scale = 10

    # 1. Prepare features
    # Calculate NDVI and add it as a band
    ndvi = s2_composite.normalizedDifference(['B8', 'B4']).rename('NDVI')
    
    # Calculate NDWI (Water Index) and add it: (B3 - B8) / (B3 + B8)
    ndwi = s2_composite.normalizedDifference(['B3', 'B8']).rename('NDWI')
    
    # Create feature image
    feature_bands = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12', 'NDVI', 'NDWI']
    feature_image = s2_composite.select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']).addBands([ndvi, ndwi])

    # Combine features with target label
    # The label image must be integer
    target_label = label_composite.select('label').toInt().rename('label')
    training_src = feature_image.addBands(target_label)

    # 2. Stratified Sampling
    # Draw points from each class to balance the training dataset
    try:
        training_data = training_src.stratifiedSample(
            numPoints=sample_points,
            classBand='label',
            region=aoi,
            scale=scale,
            projection='EPSG:4326',
            geometries=True
        )
        # Check if we got any samples
        sample_count = training_data.size().getInfo()
        logger.info(f"Successfully collected {sample_count} training pixels.")
    except Exception as e:
        logger.warning(f"Stratified sample failed, falling back to random sampling: {e}")
        # Fallback: simple random sampling if stratified fails (e.g., if some classes are missing in a small AOI)
        training_data = training_src.sample(
            region=aoi,
            scale=scale,
            numPixels=sample_points * 5,
            geometries=True
        )
        sample_count = training_data.size().getInfo()
        logger.info(f"Collected {sample_count} pixels via random sampling.")

    if sample_count == 0:
        raise ValueError("Could not extract any training samples within the Area of Interest. Make sure the AOI is large enough.")

    # 3. Train Classifier
    classifier = ee.Classifier.smileRandomForest(numberOfTrees=num_trees).train(
        features=training_data,
        classProperty='label',
        inputProperties=feature_bands
    )

    # 4. Classify Image
    classified_image = feature_image.classify(classifier).rename('label')

    # 5. Calculate statistics (Class Area)
    # Using GEE reduceRegion to compute pixel count for each label
    stats = classified_image.reduceRegion(
        reducer=ee.Reducer.frequencyHistogram(),
        geometry=aoi,
        scale=scale,
        maxPixels=1e8
    )
    
    # Retrieve the stats
    try:
        histogram = stats.get('label').getInfo()
        logger.info(f"Class histogram raw counts: {histogram}")
    except Exception as e:
        logger.error(f"Failed to fetch classification statistics: {e}")
        histogram = {}

    # Convert counts to area (each Sentinel-2 pixel at scale 'scale' is scale^2 square meters)
    processed_stats = {}
    total_area_ha = 0.0
    
    for class_id_str, count in histogram.items():
        class_id = int(float(class_id_str))
        class_name = LULC_CLASSES.get(class_id, f"Class {class_id}")
        # Hectares = Count * (scale * scale) / 10000.0
        area_ha = float(count) * (scale * scale) / 10000.0
        processed_stats[class_name] = {
            "id": class_id,
            "area_ha": round(area_ha, 2),
            "pixel_count": count
        }
        total_area_ha += area_ha

    # Add percentages
    for class_name, data in processed_stats.items():
        pct = (data["area_ha"] / total_area_ha * 100.0) if total_area_ha > 0 else 0.0
        data["percentage"] = round(pct, 2)

    logger.info(f"Classification stats generated. Total area: {round(total_area_ha, 2)} hectares.")

    return classified_image, {
        "classes": processed_stats,
        "total_area_ha": round(total_area_ha, 2)
    }

def train_and_classify_deep_learning_gee(
    s2_composite: ee.Image,
    label_composite: ee.Image,
    aoi: ee.Geometry,
    num_trees: int = 150,
    sample_points: int = 200
) -> Tuple[ee.Image, Dict[str, Any]]:
    """
    Deep Learning–inspired Spatial Contextual Segmentation on GEE.
    - Computes multi-spectral bands + 4 indices (NDVI, NDWI, NDBI, MNDWI).
    - Generates multi-scale spatial convolution feature maps (Gaussian blur, Laplacian gradients).
    - Samples balanced spatial training points from Dynamic World labels.
    - Applies spatial majority filter (focal_mode) to eliminate salt-and-pepper noise and enforce spatial coherence.
    """
    logger.info("Starting Deep Learning spatial classification on GEE...")

    try:
        area_ha = aoi.area().divide(10000).getInfo()
        logger.info(f"AOI Area: {area_ha:.2f} hectares")
    except Exception as e:
        logger.warning(f"Could not calculate area, defaulting scale: {e}")
        area_ha = 0

    if area_ha > 100000:
        scale = 60
    elif area_ha > 30000:
        scale = 30
    elif area_ha > 10000:
        scale = 20
    else:
        scale = 10

    # 1. Multi-spectral Indices
    ndvi = s2_composite.normalizedDifference(['B8', 'B4']).rename('NDVI')
    ndwi = s2_composite.normalizedDifference(['B3', 'B8']).rename('NDWI')
    ndbi = s2_composite.normalizedDifference(['B11', 'B8']).rename('NDBI')
    mndwi = s2_composite.normalizedDifference(['B3', 'B11']).rename('MNDWI')

    # 2. Spatial Context Convolutions (Textures & Edges)
    b8_smooth = s2_composite.select('B8').convolve(ee.Kernel.gaussian(radius=3, sigma=1.5)).rename('B8_smooth')
    ndvi_smooth = ndvi.convolve(ee.Kernel.gaussian(radius=3, sigma=1.5)).rename('NDVI_smooth')
    edge_gradient = s2_composite.select('B4').convolve(ee.Kernel.laplacian8(1)).rename('Edge_gradient')

    feature_bands = [
        'B2', 'B3', 'B4', 'B8', 'B11', 'B12',
        'NDVI', 'NDWI', 'NDBI', 'MNDWI',
        'B8_smooth', 'NDVI_smooth', 'Edge_gradient'
    ]
    
    feature_image = s2_composite.select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']).addBands([
        ndvi, ndwi, ndbi, mndwi,
        b8_smooth, ndvi_smooth, edge_gradient
    ])

    target_label = label_composite.select('label').toInt().rename('label')
    training_src = feature_image.addBands(target_label)

    # 3. Stratified Sampling
    try:
        training_data = training_src.stratifiedSample(
            numPoints=sample_points,
            classBand='label',
            region=aoi,
            scale=scale,
            projection='EPSG:4326',
            geometries=True
        )
        sample_count = training_data.size().getInfo()
    except Exception as e:
        logger.warning(f"Stratified sample fallback for DL: {e}")
        training_data = training_src.sample(
            region=aoi,
            scale=scale,
            numPixels=sample_points * 6,
            geometries=True
        )
        sample_count = training_data.size().getInfo()

    if sample_count == 0:
        raise ValueError("Could not extract training samples within the AOI.")

    # 4. Train Deep Spatial Ensemble
    classifier = ee.Classifier.smileRandomForest(
        numberOfTrees=max(num_trees, 120),
        minLeafPopulation=2,
        bagFraction=0.7
    ).train(
        features=training_data,
        classProperty='label',
        inputProperties=feature_bands
    )

    raw_classified = feature_image.classify(classifier).rename('label')

    # 5. Spatial Regularization (Focal Mode Smoothing)
    # Replaces isolated noisy pixels with spatial neighborhood mode
    classified_image = raw_classified.focal_mode(radius=1.5, kernelType='circle').rename('label')

    # 6. Calculate statistics
    stats = classified_image.reduceRegion(
        reducer=ee.Reducer.frequencyHistogram(),
        geometry=aoi,
        scale=scale,
        maxPixels=1e8
    )

    try:
        histogram = stats.get('label').getInfo()
    except Exception as e:
        logger.error(f"Failed to fetch DL classification statistics: {e}")
        histogram = {}

    processed_stats = {}
    total_area_ha = 0.0

    for class_id_str, count in histogram.items():
        class_id = int(float(class_id_str))
        class_name = LULC_CLASSES.get(class_id, f"Class {class_id}")
        area_ha = float(count) * (scale * scale) / 10000.0
        processed_stats[class_name] = {
            "id": class_id,
            "area_ha": round(area_ha, 2),
            "pixel_count": count
        }
        total_area_ha += area_ha

    for class_name, data in processed_stats.items():
        pct = (data["area_ha"] / total_area_ha * 100.0) if total_area_ha > 0 else 0.0
        data["percentage"] = round(pct, 2)

    return classified_image, {
        "classes": processed_stats,
        "total_area_ha": round(total_area_ha, 2)
    }

def get_precomputed_statistics(label_image: ee.Image, aoi: ee.Geometry) -> Dict[str, Any]:
    """
    Returns land cover statistics directly from Dynamic World label mode composite.
    """
    try:
        area_ha = aoi.area().divide(10000).getInfo()
    except Exception as e:
        logger.warning(f"Could not calculate area to determine scale, defaulting to 10m: {e}")
        area_ha = 0

    if area_ha > 100000:
        scale = 60
    elif area_ha > 30000:
        scale = 30
    elif area_ha > 10000:
        scale = 20
    else:
        scale = 10

    stats = label_image.reduceRegion(
        reducer=ee.Reducer.frequencyHistogram(),
        geometry=aoi,
        scale=scale,
        maxPixels=1e8
    )
    
    try:
        histogram = stats.get('label').getInfo()
    except Exception as e:
        logger.error(f"Failed to fetch precomputed statistics: {e}")
        histogram = {}

    processed_stats = {}
    total_area_ha = 0.0
    
    for class_id_str, count in histogram.items():
        class_id = int(float(class_id_str))
        class_name = LULC_CLASSES.get(class_id, f"Class {class_id}")
        area_ha = float(count) * (scale * scale) / 10000.0
        processed_stats[class_name] = {
            "id": class_id,
            "area_ha": round(area_ha, 2),
            "pixel_count": count
        }
        total_area_ha += area_ha

    for class_name, data in processed_stats.items():
        pct = (data["area_ha"] / total_area_ha * 100.0) if total_area_ha > 0 else 0.0
        data["percentage"] = round(pct, 2)

    return {
        "classes": processed_stats,
        "total_area_ha": round(total_area_ha, 2)
    }
