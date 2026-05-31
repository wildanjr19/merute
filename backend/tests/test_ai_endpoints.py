"""
Integration tests untuk AI endpoints.
Menggunakan FastAPI TestClient tanpa perlu OpenAI aktif.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_route_payload():
    """Payload rute 10km untuk testing"""
    coords = [[110.80 + i * 0.001, -7.55] for i in range(100)]
    return {
        "route": {
            "polyline": {"type": "LineString", "coordinates": coords},
            "totalDistance": 10000,
            "elevationGain": 50,
            "elevationLoss": 40,
            "elevationPoints": [
                {"lat": -7.55, "lng": 110.80 + i * 0.001, "elevation": 100 + i, "distance": i * 100}
                for i in range(20)
            ],
            "elevationStatus": "valid"
        },
        "preferences": {
            "paceSecondsPerKm": 360,
            "routeType": "long_run",
            "maxPoints": 3,
            "notes": ""
        }
    }


@pytest.fixture
def sample_routetext_payload():
    """Payload untuk route text testing"""
    coords = [[110.80 + i * 0.001, -7.55] for i in range(100)]
    return {
        "route": {
            "polyline": {"type": "LineString", "coordinates": coords},
            "totalDistance": 10000,
            "elevationGain": 50,
            "elevationLoss": 40,
            "elevationPoints": [],
            "elevationStatus": "valid"
        },
        "segments": [],
        "options": {
            "paceSecondsPerKm": 360,
            "language": "id",
            "format": "cue_sheet"
        }
    }


class TestHydrationEndpoint:
    def test_returns_suggestions(self, client, sample_route_payload):
        """Endpoint harus mengembalikan rekomendasi hidrasi"""
        response = client.post("/api/ai/hydration-suggestions", json=sample_route_payload)
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "points" in data
        assert "source" in data
        assert data["source"] in ("rules", "hybrid", "ai")
        assert len(data["points"]) > 0

    def test_short_route_rejected(self, client):
        """Rute < 1km harus ditolak"""
        payload = {
            "route": {
                "polyline": {"type": "LineString", "coordinates": [[110.80, -7.55], [110.801, -7.55]]},
                "totalDistance": 500,
                "elevationGain": 0,
                "elevationLoss": 0,
                "elevationPoints": [],
                "elevationStatus": "valid"
            },
            "preferences": {
                "paceSecondsPerKm": 360,
                "routeType": "easy_run",
                "maxPoints": 3,
                "notes": ""
            }
        }
        response = client.post("/api/ai/hydration-suggestions", json=payload)
        assert response.status_code == 400

    def test_invalid_polyline_rejected(self, client):
        """Polyline dengan < 2 koordinat harus ditolak"""
        payload = {
            "route": {
                "polyline": {"type": "LineString", "coordinates": [[110.80, -7.55]]},
                "totalDistance": 5000,
                "elevationGain": 0,
                "elevationLoss": 0,
                "elevationPoints": [],
                "elevationStatus": "valid"
            },
            "preferences": {
                "paceSecondsPerKm": 360,
                "routeType": "easy_run",
                "maxPoints": 3,
                "notes": ""
            }
        }
        response = client.post("/api/ai/hydration-suggestions", json=payload)
        assert response.status_code == 400

    def test_points_have_required_fields(self, client, sample_route_payload):
        """Setiap point harus punya field yang diperlukan"""
        response = client.post("/api/ai/hydration-suggestions", json=sample_route_payload)
        data = response.json()
        for point in data["points"]:
            assert "label" in point
            assert "distanceKm" in point
            assert "lat" in point
            assert "lng" in point
            assert "priority" in point
            assert "reason" in point
            assert point["priority"] in ("low", "medium", "high")

    def test_warnings_present(self, client, sample_route_payload):
        """Response harus punya warnings/disclaimer"""
        response = client.post("/api/ai/hydration-suggestions", json=sample_route_payload)
        data = response.json()
        assert "warnings" in data
        assert len(data["warnings"]) > 0


class TestRouteTextEndpoint:
    def test_returns_template_fallback(self, client, sample_routetext_payload):
        """Endpoint harus mengembalikan template jika AI tidak tersedia"""
        with patch("app.api.ai.ai_config") as mock_config:
            mock_config.enabled = True
            mock_config.is_available.return_value = False
            response = client.post("/api/ai/route-text", json=sample_routetext_payload)

        assert response.status_code == 200
        data = response.json()
        assert "title" in data
        assert "summary" in data
        assert "steps" in data
        assert "downloadText" in data
        assert data["source"] == "template"

    def test_short_route_rejected(self, client):
        """Rute < 100m harus ditolak"""
        payload = {
            "route": {
                "polyline": {"type": "LineString", "coordinates": [[110.80, -7.55], [110.8001, -7.55]]},
                "totalDistance": 50,
                "elevationGain": 0,
                "elevationLoss": 0,
                "elevationPoints": [],
                "elevationStatus": "valid"
            },
            "segments": [],
            "options": {
                "paceSecondsPerKm": 360,
                "language": "id",
                "format": "cue_sheet"
            }
        }
        response = client.post("/api/ai/route-text", json=payload)
        assert response.status_code == 400


class TestRateLimit:
    def test_rate_limit_enforced(self, client, sample_route_payload):
        """Rate limit harus aktif setelah batas terlampaui"""
        # Reset rate limiter
        from app.services.rate_limiter import ai_rate_limiter
        ai_rate_limiter._requests.clear()

        # Kirim 10 request (limit)
        for _ in range(10):
            response = client.post("/api/ai/hydration-suggestions", json=sample_route_payload)
            assert response.status_code == 200

        # Request ke-11 harus ditolak
        response = client.post("/api/ai/hydration-suggestions", json=sample_route_payload)
        assert response.status_code == 429

        # Cleanup
        ai_rate_limiter._requests.clear()
