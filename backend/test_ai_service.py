from fastapi.testclient import TestClient
from main import app
from ai_service import (
    calculate_polygon_area_m2,
    calculate_polygon_perimeter_m,
    regularize_polygon_orthogonal,
    perform_sam_smart_select,
    extract_and_regularize_buildings,
    compute_ai_quality_metrics
)

client = TestClient(app)

SAMPLE_AOI = [
    [-122.245, 37.825],
    [-122.075, 37.805],
    [-122.06, 37.71],
    [-122.2, 37.675],
    [-122.245, 37.825],
]

def test_polygon_geometry_utilities():
    square = [
        [0.0, 0.0],
        [0.001, 0.0],
        [0.001, 0.001],
        [0.0, 0.001],
        [0.0, 0.0]
    ]
    area = calculate_polygon_area_m2(square)
    assert area > 5000  # ~111m x ~111m = ~12300 m2
    
    perim = calculate_polygon_perimeter_m(square)
    assert perim > 300  # ~444m
    
    regularized = regularize_polygon_orthogonal(square)
    assert len(regularized) >= 4
    assert regularized[0] == regularized[-1]

def test_sam_smart_select():
    point = [-122.2, 37.75]
    result = perform_sam_smart_select(point, tolerance_radius_m=100.0)
    assert result["type"] == "Feature"
    assert result["geometry"]["type"] == "Polygon"
    coords = result["geometry"]["coordinates"][0]
    assert len(coords) > 5
    assert coords[0] == coords[-1]
    assert result["properties"]["area_m2"] > 0
    assert result["properties"]["engine"] == "GeoAI-SAM-Lite"

def test_extract_and_regularize_buildings():
    result = extract_and_regularize_buildings(
        aoi_coords=SAMPLE_AOI,
        regularize=True,
        min_building_area_m2=30.0
    )
    assert result["type"] == "FeatureCollection"
    assert "summary" in result
    assert result["summary"]["building_count"] > 0
    assert result["summary"]["total_footprint_ha"] > 0
    assert result["summary"]["regularization_applied"] is True
    assert len(result["features"]) == result["summary"]["building_count"]

def test_compute_ai_quality_metrics():
    metrics = compute_ai_quality_metrics(SAMPLE_AOI, cloud_percentage=15.0)
    assert 0 <= metrics["overall_quality_score"] <= 100
    assert metrics["rating"] in ["Optimal", "Good", "Moderate"]
    assert 0 <= metrics["usable_pixels_percentage"] <= 100

def test_api_sam_endpoint():
    response = client.post("/api/ai/sam-segment", json={
        "point": [-122.15, 37.75],
        "tolerance_radius_m": 120.0,
        "feature_category": "auto"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "Feature"
    assert "geometry" in data

def test_api_building_extraction_endpoint():
    response = client.post("/api/ai/extract-buildings", json={
        "coords": SAMPLE_AOI,
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "cloud_cover": 20.0,
        "regularize": True,
        "min_building_area_m2": 50.0
    })
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert data["summary"]["building_count"] > 0

def test_api_quality_assessment_endpoint():
    response = client.post("/api/ai/quality-assessment", json={
        "coords": SAMPLE_AOI,
        "cloud_cover": 15.0
    })
    assert response.status_code == 200
    data = response.json()
    assert "overall_quality_score" in data
    assert "rating" in data

def test_transition_matrix_computation():
    from ai_service import compute_bitemporal_transition_matrix
    result = compute_bitemporal_transition_matrix(
        aoi_coords=SAMPLE_AOI,
        total_area_ha=1250.0
    )
    assert result["total_area_ha"] == 1250.0
    assert "trajectories" in result
    assert "urbanization" in result["trajectories"]
    assert "deforestation" in result["trajectories"]
    assert "matrix" in result
    assert len(result["matrix"]) > 0

def test_api_deep_change_detection_endpoint():
    response = client.post("/api/ai/deep-change-detection", json={
        "coords": SAMPLE_AOI,
        "target_start_date": "2024-01-01",
        "target_end_date": "2024-12-31",
        "baseline_start_date": "2020-01-01",
        "baseline_end_date": "2020-12-31",
        "cloud_cover": 20.0
    })
    assert response.status_code == 200
    data = response.json()
    assert "trajectories" in data
    assert "matrix" in data
    assert "net_changes" in data

def test_super_resolution_computation():
    from ai_service import compute_super_resolution_tiles
    res = compute_super_resolution_tiles(SAMPLE_AOI)
    assert res["status"] == "success"
    assert res["super_resolution_m"] == 2.5
    assert res["metrics"]["sharpness_improvement_pct"] > 0
    assert res["metrics"]["structural_similarity_ssim"] > 0

def test_water_dynamics_computation():
    from ai_service import compute_water_dynamics
    res = compute_water_dynamics(SAMPLE_AOI)
    assert res["status"] == "success"
    assert len(res["monthly_series"]) == 12
    assert "flood_risk" in res
    assert "drought_vulnerability" in res
    assert res["max_water_extent_ha"] >= res["min_water_extent_ha"]

def test_canopy_height_computation():
    from ai_service import compute_canopy_height_estimation
    res = compute_canopy_height_estimation(SAMPLE_AOI)
    assert res["status"] == "success"
    assert res["mean_canopy_height_m"] > 0
    assert len(res["height_strata_distribution"]) == 6
    assert "biomass_and_carbon" in res

def test_api_super_resolution_endpoint():
    response = client.post("/api/ai/super-resolution", json={
        "coords": SAMPLE_AOI,
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "cloud_cover": 20.0
    })
    assert response.status_code == 200
    data = response.json()
    assert data["super_resolution_m"] == 2.5

def test_api_water_dynamics_endpoint():
    response = client.post("/api/ai/water-dynamics", json={
        "coords": SAMPLE_AOI,
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "cloud_cover": 20.0
    })
    assert response.status_code == 200
    data = response.json()
    assert "monthly_series" in data

def test_api_canopy_height_endpoint():
    response = client.post("/api/ai/canopy-height", json={
        "coords": SAMPLE_AOI,
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "cloud_cover": 20.0
    })
    assert response.status_code == 200
    data = response.json()
    assert "height_strata_distribution" in data

