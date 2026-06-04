from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.schemas.planner import StartTimeRequest
from app.services.run_planner_service import RunPlannerService
from app.services.weather_service import WeatherService


client = TestClient(app)


def sample_forecast():
    times = [f"2026-06-04T{hour:02d}:00" for hour in range(24)]
    return {
        "timezone": "Asia/Jakarta",
        "hourly": {
            "time": times,
            "temperature_2m": [24, 24, 24, 24, 24, 25, 25, 26, 27, 29, 31, 32, 34, 34, 33, 32, 29, 28, 27, 26, 26, 25, 25, 25],
            "apparent_temperature": [25, 25, 25, 25, 25, 26, 26, 27, 28, 31, 34, 35, 37, 37, 36, 34, 31, 30, 29, 28, 27, 26, 26, 26],
            "relative_humidity_2m": [86, 86, 86, 86, 85, 84, 82, 80, 78, 74, 70, 68, 65, 65, 68, 70, 74, 76, 78, 80, 82, 84, 85, 86],
            "precipitation_probability": [5, 5, 5, 5, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 45, 55, 35, 25, 20, 18, 15, 10, 8, 5],
            "rain": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.3, 0.4, 1.0, 1.2, 0.4, 0.2, 0, 0, 0, 0, 0, 0],
            "weather_code": [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 51, 51, 61, 61, 51, 3, 2, 2, 1, 1, 0, 0],
            "wind_speed_10m": [6, 6, 6, 6, 7, 7, 8, 8, 9, 10, 12, 13, 14, 15, 16, 17, 14, 12, 10, 9, 8, 8, 7, 7],
            "wind_gusts_10m": [10, 10, 10, 10, 11, 11, 12, 13, 14, 16, 18, 20, 22, 24, 27, 30, 22, 18, 16, 14, 12, 12, 11, 10],
            "uv_index": [0, 0, 0, 0, 0, 0.2, 1, 2, 4, 6, 8, 9, 10, 9, 7, 5, 3, 1, 0, 0, 0, 0, 0, 0],
        },
    }


def sample_payload():
    return {
        "route": {
            "polyline": {
                "type": "LineString",
                "coordinates": [[110.8316, -7.5568], [110.8350, -7.5600]],
            },
            "totalDistance": 5000,
            "elevationGain": 40,
            "elevationLoss": 35,
        },
        "preferences": {
            "date": "2026-06-04",
            "timeWindows": [
                {"start": "05:00", "end": "09:00"},
                {"start": "12:00", "end": "15:00"},
            ],
            "paceSecondsPerKm": 360,
            "priority": "balanced",
        },
    }


def test_planner_endpoint_returns_recommendations():
    with patch(
        "app.api.planner.weather_service.get_hourly_forecast",
        new=AsyncMock(return_value=sample_forecast()),
    ):
        response = client.post("/api/planner/start-time", json=sample_payload())

    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "rules"
    assert data["provider"]["name"] == "Open-Meteo"
    assert len(data["recommendations"]) >= 2
    assert data["recommendations"][0]["label"] == "best"
    assert data["recommendations"][0]["score"] >= data["recommendations"][1]["score"]
    assert "apparentTemperature" in data["recommendations"][0]["weather"]


def test_planner_rejects_short_route():
    payload = sample_payload()
    payload["route"]["totalDistance"] = 50
    response = client.post("/api/planner/start-time", json=payload)

    assert response.status_code == 400
    assert "minimal 100 m" in response.json()["detail"]


def test_planner_service_ranks_morning_above_hot_midday():
    request = StartTimeRequest(**sample_payload())
    weather_service = WeatherService()
    service = RunPlannerService(weather_service)

    with patch.object(
        weather_service,
        "get_hourly_forecast",
        new=AsyncMock(return_value=sample_forecast()),
    ):
        import asyncio

        result = asyncio.run(service.recommend_start_times(request))

    assert result.recommendations[0].startTime in {"05:00", "05:30", "06:00", "06:30"}
    assert result.recommendations[0].score > 70
