import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Mock initialize_gee before importing main to avoid oauth2 network retries in offline test environment
with patch("gee_service.initialize_gee", return_value=True):
    from main import app
    from project_service import save_project, get_project, list_projects, delete_project
    from classifier import parse_custom_training_fc, CLASS_NAME_TO_ID

class TestRoadmapItems(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    @patch("classifier.ee.FeatureCollection")
    @patch("classifier.ee.Feature")
    @patch("classifier.ee.Geometry")
    def test_custom_training_parsing(self, mock_geom, mock_feat, mock_fc):
        mock_geom.Point.side_effect = lambda coords: MagicMock()
        mock_geom.Polygon.side_effect = lambda coords: MagicMock()
        mock_feat.side_effect = lambda geom, props: MagicMock()
        mock_fc.side_effect = lambda feats: MagicMock()

        geojson_data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [34.5, -2.5]
                    },
                    "properties": {
                        "class_name": "water"
                    }
                },
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[34.5, -2.5], [34.6, -2.5], [34.6, -2.4], [34.5, -2.4], [34.5, -2.5]]]
                    },
                    "properties": {
                        "label": 1  # forest/trees
                    }
                },
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [34.55, -2.45]
                    },
                    "properties": {
                        "target": "built"  # built -> 6
                    }
                }
            ]
        }
        fc, count = parse_custom_training_fc(geojson_data)
        self.assertEqual(count, 3)
        self.assertIsNotNone(fc)

    def test_project_crud(self):
        test_aoi = {
            "type": "Polygon",
            "coordinates": [[[30.0, -1.0], [30.1, -1.0], [30.1, -0.9], [30.0, -0.9], [30.0, -1.0]]]
        }
        test_layers = {
            "sensor": "sentinel_2",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "model_type": "random_forest"
        }

        # 1. Create
        saved = save_project(
            title="Serengeti Conservation Sector",
            aoi_geojson=test_aoi,
            layer_state=test_layers,
            description="Monitoring savanna tree canopy and seasonal waterbodies."
        )
        self.assertTrue(saved["id"].startswith("prj_"))
        self.assertEqual(saved["title"], "Serengeti Conservation Sector")
        pid = saved["id"]

        # 2. Read
        fetched = get_project(pid)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["title"], "Serengeti Conservation Sector")
        self.assertEqual(fetched["layer_state"]["sensor"], "sentinel_2")

        # 3. List
        all_prjs = list_projects(10)
        self.assertTrue(any(p["id"] == pid for p in all_prjs))

        # 4. Delete
        deleted = delete_project(pid)
        self.assertTrue(deleted)
        self.assertIsNone(get_project(pid))

    def test_projects_api_endpoints(self):
        # Test POST /api/projects
        create_payload = {
            "title": "Amazon Basin Sector A",
            "description": "Deforestation monitoring permalink project",
            "aoi_geojson": {
                "type": "Polygon",
                "coordinates": [[[-60.0, -3.0], [-59.9, -3.0], [-59.9, -2.9], [-60.0, -2.9], [-60.0, -3.0]]]
            },
            "layer_state": {
                "sensor": "sentinel_2",
                "start_date": "2024-01-01",
                "end_date": "2024-12-31"
            }
        }
        res = self.client.post("/api/projects", json=create_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["id"].startswith("prj_"))
        self.assertEqual(data["title"], "Amazon Basin Sector A")
        self.assertIn("share_url", data)
        project_id = data["id"]

        # Test GET /api/projects/{id}
        res_get = self.client.get(f"/api/projects/{project_id}")
        self.assertEqual(res_get.status_code, 200)
        get_data = res_get.json()
        self.assertEqual(get_data["title"], "Amazon Basin Sector A")
        self.assertIn("/app?project=", get_data["share_url"])

        # Test GET /api/projects
        res_list = self.client.get("/api/projects")
        self.assertEqual(res_list.status_code, 200)
        self.assertTrue(any(p["id"] == project_id for p in res_list.json()))

        # Test DELETE /api/projects/{id}
        res_del = self.client.delete(f"/api/projects/{project_id}")
        self.assertEqual(res_del.status_code, 200)

        # Confirm 404 after deletion
        res_not_found = self.client.get(f"/api/projects/{project_id}")
        self.assertEqual(res_not_found.status_code, 404)

    @patch("main.coords_to_ee_geometry", return_value=MagicMock())
    @patch("main.get_era5_climate_context")
    @patch("main.initialize_gee", return_value=True)
    def test_climate_endpoint(self, mock_init, mock_climate, mock_coords):
        mock_climate.return_value = {
            "mean_temperature_c": 24.5,
            "total_precipitation_mm": 1200.0,
            "mean_soil_moisture": 0.32,
            "climate_classification": "Humid",
            "aridity_index": 34.8,
            "temperature_tile_url": "https://earthengine.googleapis.com/temp-tile/{z}/{x}/{y}",
            "precipitation_tile_url": "https://earthengine.googleapis.com/precip-tile/{z}/{x}/{y}",
            "soil_moisture_tile_url": "https://earthengine.googleapis.com/soil-tile/{z}/{x}/{y}",
            "monthly_time_series": [
                {"month": "2024-01", "temp_c": 23.1, "precip_mm": 110.0, "soil_moisture": 0.31}
            ]
        }

        payload = {
            "coords": [[-60.0, -3.0], [-59.9, -3.0], [-59.9, -2.9], [-60.0, -2.9], [-60.0, -3.0]],
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        }
        res = self.client.post("/api/climate/analyze", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["mean_temperature_c"], 24.5)
        self.assertEqual(data["climate_classification"], "Humid")
        self.assertIn("temperature_tile_url", data)

if __name__ == "__main__":
    unittest.main()
