"""
Unit tests untuk RouteAnalyzer service.
"""

import pytest
from app.services.route_analyzer import RouteAnalyzer


@pytest.fixture
def analyzer():
    return RouteAnalyzer()


@pytest.fixture
def sample_coordinates():
    """Polyline lurus ~5km dari barat ke timur di Surakarta"""
    # Approx 0.045 degree longitude = ~5km at latitude -7.55
    start_lng, start_lat = 110.80, -7.55
    points = []
    for i in range(100):
        lng = start_lng + (i / 99) * 0.045
        points.append([lng, start_lat])
    return points


@pytest.fixture
def sample_elevation_points():
    """Elevation points dengan tanjakan dan turunan"""
    points = []
    elevations = [
        100, 102, 105, 110, 118, 125, 135, 140, 145, 150,  # naik
        150, 148, 145, 140, 135, 130, 125, 120, 115, 110,  # turun
        110, 112, 115, 120, 125, 130, 128, 125, 120, 115,  # naik lalu turun
    ]
    for i, elev in enumerate(elevations):
        dist = i * 200.0  # setiap 200m
        points.append({
            "lat": -7.55,
            "lng": 110.80 + (i * 0.002),
            "elevation": elev,
            "distance": dist
        })
    return points


class TestGetKmPoints:
    def test_basic_km_points(self, analyzer, sample_coordinates):
        """Harus mengembalikan titik per km"""
        total_distance = 5000.0
        result = analyzer.get_km_points(sample_coordinates, total_distance)

        assert len(result) >= 4
        assert result[0]["km"] == 1
        assert result[0]["distanceM"] == 1000.0

    def test_short_route_no_km_points(self, analyzer):
        """Rute < 1km tidak punya km points"""
        coords = [[110.80, -7.55], [110.805, -7.55]]
        result = analyzer.get_km_points(coords, 500.0)
        assert len(result) == 0

    def test_empty_coordinates(self, analyzer):
        """Koordinat kosong atau 1 titik"""
        assert analyzer.get_km_points([], 0) == []
        assert analyzer.get_km_points([[110.80, -7.55]], 0) == []


class TestInterpolateAtDistance:
    def test_interpolate_midpoint(self, analyzer, sample_coordinates):
        """Interpolasi di tengah polyline"""
        result = analyzer.interpolate_at_distance(sample_coordinates, 2500.0)

        assert result is not None
        assert "lat" in result
        assert "lng" in result
        assert result["distanceM"] == 2500.0

    def test_interpolate_at_zero(self, analyzer, sample_coordinates):
        """Interpolasi di titik awal"""
        result = analyzer.interpolate_at_distance(sample_coordinates, 0.0)

        assert result is not None
        assert abs(result["lat"] - (-7.55)) < 0.001
        assert abs(result["lng"] - 110.80) < 0.001

    def test_interpolate_beyond_route(self, analyzer):
        """Jarak melebihi polyline, kembalikan titik terakhir"""
        coords = [[110.80, -7.55], [110.81, -7.55]]
        result = analyzer.interpolate_at_distance(coords, 999999.0)

        assert result is not None
        assert abs(result["lng"] - 110.81) < 0.001

    def test_empty_coordinates(self, analyzer):
        """Koordinat kosong"""
        assert analyzer.interpolate_at_distance([], 1000) is None


class TestExtractElevationFeatures:
    def test_detects_climbs(self, analyzer, sample_elevation_points):
        """Harus mendeteksi segmen tanjakan > 10m"""
        result = analyzer.extract_elevation_features(sample_elevation_points)

        assert len(result["climbSegments"]) > 0
        first_climb = result["climbSegments"][0]
        assert first_climb["elevationGain"] > 10
        assert "avgGradient" in first_climb

    def test_detects_descents(self, analyzer, sample_elevation_points):
        """Harus mendeteksi segmen turunan > 10m"""
        result = analyzer.extract_elevation_features(sample_elevation_points)

        assert len(result["descentSegments"]) > 0
        first_descent = result["descentSegments"][0]
        assert first_descent["elevationLoss"] > 10

    def test_flat_route_no_features(self, analyzer):
        """Rute datar tidak punya climb/descent signifikan"""
        flat_points = [
            {"lat": -7.55, "lng": 110.80 + i * 0.001, "elevation": 100, "distance": i * 100}
            for i in range(20)
        ]
        result = analyzer.extract_elevation_features(flat_points)

        assert len(result["climbSegments"]) == 0
        assert len(result["descentSegments"]) == 0

    def test_too_few_points(self, analyzer):
        """Kurang dari 3 titik"""
        result = analyzer.extract_elevation_features([
            {"lat": -7.55, "lng": 110.80, "elevation": 100, "distance": 0}
        ])
        assert result["climbSegments"] == []


class TestSimplifyCoordinates:
    def test_no_simplification_needed(self, analyzer):
        """Koordinat di bawah max_points tidak disederhanakan"""
        coords = [[110.80 + i * 0.001, -7.55] for i in range(50)]
        result = analyzer.simplify_coordinates(coords, max_points=120)
        assert len(result) == 50

    def test_simplification_applied(self, analyzer):
        """Koordinat di atas max_points disederhanakan"""
        coords = [[110.80 + i * 0.0001, -7.55] for i in range(500)]
        result = analyzer.simplify_coordinates(coords, max_points=120)
        assert len(result) == 120

    def test_last_point_preserved(self, analyzer):
        """Titik terakhir harus selalu ada"""
        coords = [[110.80 + i * 0.0001, -7.55] for i in range(500)]
        result = analyzer.simplify_coordinates(coords, max_points=120)
        assert result[-1] == coords[-1]


class TestAnalyze:
    def test_full_analysis(self, analyzer, sample_coordinates, sample_elevation_points):
        """Analisis lengkap harus mengembalikan semua field"""
        result = analyzer.analyze(
            coordinates=sample_coordinates,
            elevation_points=sample_elevation_points,
            total_distance=5000.0,
            elevation_status="valid"
        )

        assert result["totalDistanceKm"] == 5.0
        assert result["totalDistanceM"] == 5000.0
        assert len(result["kmPoints"]) >= 4
        assert result["elevationFeatures"] is not None
        assert result["elevationStatus"] == "valid"
        assert len(result["simplifiedCoordinates"]) <= 120

    def test_degraded_elevation_skips_features(self, analyzer, sample_coordinates):
        """Elevasi terdegradasi tidak menghasilkan elevation features"""
        result = analyzer.analyze(
            coordinates=sample_coordinates,
            elevation_points=[],
            total_distance=5000.0,
            elevation_status="degraded"
        )

        assert result["elevationFeatures"] is None
        assert result["elevationStatus"] == "degraded"
