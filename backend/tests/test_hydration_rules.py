"""
Unit tests untuk HydrationRulesService.
"""

import pytest
from app.services.hydration_rules import HydrationRulesService


@pytest.fixture
def service():
    return HydrationRulesService()


@pytest.fixture
def long_route_coords():
    """Polyline lurus ~12km"""
    start_lng, start_lat = 110.80, -7.55
    points = []
    for i in range(200):
        lng = start_lng + (i / 199) * 0.108  # ~12km
        points.append([lng, start_lat])
    return points


@pytest.fixture
def medium_route_coords():
    """Polyline lurus ~7km"""
    start_lng, start_lat = 110.80, -7.55
    points = []
    for i in range(150):
        lng = start_lng + (i / 149) * 0.063  # ~7km
        points.append([lng, start_lat])
    return points


@pytest.fixture
def short_route_coords():
    """Polyline lurus ~2km"""
    start_lng, start_lat = 110.80, -7.55
    points = []
    for i in range(50):
        lng = start_lng + (i / 49) * 0.018  # ~2km
        points.append([lng, start_lat])
    return points


@pytest.fixture
def elevation_with_climb():
    """Elevation points dengan tanjakan signifikan di km 4-5"""
    points = []
    for i in range(60):
        dist = i * 200.0
        if 4000 <= dist <= 5000:
            elev = 100 + (dist - 4000) * 0.05  # 50m gain
        elif dist > 5000:
            elev = 150
        else:
            elev = 100
        points.append({
            "lat": -7.55,
            "lng": 110.80 + (i * 0.001),
            "elevation": elev,
            "distance": dist
        })
    return points


class TestShortRoute:
    def test_no_points_for_very_short_route(self, service, short_route_coords):
        """Rute < 3km tidak perlu titik hidrasi"""
        result = service.generate(
            coordinates=short_route_coords,
            total_distance=2000,
            elevation_points=[],
            elevation_status="valid",
            max_points=5
        )
        assert len(result["points"]) == 0
        assert result["source"] == "rules"
        assert "pendek" in result["summary"]


class TestMediumRoute:
    def test_medium_route_has_points(self, service, medium_route_coords):
        """Rute 7km harus punya minimal 1 titik"""
        result = service.generate(
            coordinates=medium_route_coords,
            total_distance=7000,
            elevation_points=[],
            elevation_status="valid",
            route_type="easy_run",
            max_points=5
        )
        assert len(result["points"]) >= 1
        assert result["points"][0]["label"] == "WS 1"
        assert result["points"][0]["distanceKm"] > 0

    def test_race_type_more_points(self, service, medium_route_coords):
        """Race type punya interval lebih pendek -> lebih banyak titik"""
        easy = service.generate(
            coordinates=medium_route_coords,
            total_distance=7000,
            elevation_points=[],
            elevation_status="valid",
            route_type="easy_run",
            max_points=5
        )
        race = service.generate(
            coordinates=medium_route_coords,
            total_distance=7000,
            elevation_points=[],
            elevation_status="valid",
            route_type="race",
            max_points=5
        )
        assert len(race["points"]) >= len(easy["points"])


class TestLongRoute:
    def test_long_route_multiple_points(self, service, long_route_coords):
        """Rute 12km harus punya beberapa titik"""
        result = service.generate(
            coordinates=long_route_coords,
            total_distance=12000,
            elevation_points=[],
            elevation_status="valid",
            route_type="long_run",
            max_points=5
        )
        assert len(result["points"]) >= 2
        # Titik harus terurut berdasarkan jarak
        distances = [p["distanceKm"] for p in result["points"]]
        assert distances == sorted(distances)

    def test_max_points_respected(self, service, long_route_coords):
        """Tidak boleh melebihi max_points"""
        result = service.generate(
            coordinates=long_route_coords,
            total_distance=12000,
            elevation_points=[],
            elevation_status="valid",
            max_points=2
        )
        assert len(result["points"]) <= 2


class TestElevationAdjustment:
    def test_adds_point_before_climb(self, service, long_route_coords, elevation_with_climb):
        """Harus menambah titik sebelum tanjakan signifikan"""
        result = service.generate(
            coordinates=long_route_coords,
            total_distance=12000,
            elevation_points=elevation_with_climb,
            elevation_status="valid",
            route_type="long_run",
            max_points=5
        )
        # Cari titik dengan reason terkait tanjakan
        climb_points = [p for p in result["points"] if "tanjakan" in p["reason"].lower()]
        assert len(climb_points) >= 1
        assert climb_points[0]["priority"] == "high"

    def test_degraded_elevation_no_climb_points(self, service, long_route_coords):
        """Elevasi degraded tidak boleh generate titik berbasis elevasi"""
        result = service.generate(
            coordinates=long_route_coords,
            total_distance=12000,
            elevation_points=[],
            elevation_status="degraded",
            route_type="long_run",
            max_points=5
        )
        climb_points = [p for p in result["points"] if "tanjakan" in p["reason"].lower()]
        assert len(climb_points) == 0


class TestWarningsAndMetadata:
    def test_has_disclaimer(self, service, medium_route_coords):
        """Selalu ada disclaimer"""
        result = service.generate(
            coordinates=medium_route_coords,
            total_distance=7000,
            elevation_points=[],
            elevation_status="valid"
        )
        assert len(result["warnings"]) >= 1
        assert any("kondisi tubuh" in w for w in result["warnings"])

    def test_degraded_warning(self, service, medium_route_coords):
        """Elevasi degraded harus ada warning tambahan"""
        result = service.generate(
            coordinates=medium_route_coords,
            total_distance=7000,
            elevation_points=[],
            elevation_status="degraded"
        )
        assert any("elevasi" in w.lower() for w in result["warnings"])

    def test_source_is_rules(self, service, medium_route_coords):
        """Source harus 'rules'"""
        result = service.generate(
            coordinates=medium_route_coords,
            total_distance=7000,
            elevation_points=[],
            elevation_status="valid"
        )
        assert result["source"] == "rules"
