"""
Hydration Rules Baseline untuk MeRute.
Rekomendasi titik hidrasi berbasis aturan deterministik (tanpa AI).
"""

from typing import List, Dict, Any
from app.services.route_analyzer import RouteAnalyzer


class HydrationRulesService:
    """Generate rekomendasi titik hidrasi berdasarkan rules."""

    def __init__(self):
        self.analyzer = RouteAnalyzer()

    def generate(
        self,
        coordinates: List[List[float]],
        total_distance: float,
        elevation_points: List[Dict[str, Any]],
        elevation_status: str = "valid",
        pace_seconds_per_km: int = 360,
        route_type: str = "easy_run",
        max_points: int = 5
    ) -> Dict[str, Any]:
        """
        Generate rekomendasi titik hidrasi.

        Returns:
            Dict sesuai HydrationResponse schema
        """
        distance_km = total_distance / 1000

        # Rute terlalu pendek
        if distance_km < 3:
            return {
                "summary": f"Rute {distance_km:.1f} km cukup pendek, hidrasi sebelum dan sesudah lari biasanya cukup.",
                "points": [],
                "source": "rules",
                "warnings": self._get_warnings(elevation_status)
            }

        # Tentukan interval hidrasi berdasarkan route type dan pace
        interval_km = self._get_interval(route_type, pace_seconds_per_km, distance_km)

        # Generate kandidat titik berdasarkan interval
        candidates = self._generate_interval_points(
            coordinates, total_distance, interval_km, max_points
        )

        # Adjust berdasarkan elevasi jika data valid
        if elevation_status == "valid" and elevation_points:
            candidates = self._adjust_for_elevation(
                candidates, elevation_points, coordinates, total_distance
            )

        # Batasi jumlah titik
        candidates = candidates[:max_points]

        # Assign label dan priority
        points = self._finalize_points(candidates, distance_km, route_type)

        summary = self._generate_summary(distance_km, len(points), route_type, elevation_status)

        return {
            "summary": summary,
            "points": points,
            "source": "rules",
            "warnings": self._get_warnings(elevation_status)
        }

    def _get_interval(self, route_type: str, pace: int, distance_km: float) -> float:
        """Tentukan interval km antar titik hidrasi."""
        base_intervals = {
            "easy_run": 5.0,
            "long_run": 4.0,
            "race": 3.0,
            "trail": 3.5,
            "custom": 4.5
        }
        interval = base_intervals.get(route_type, 4.5)

        # Pace lambat (>7:00/km) -> interval lebih pendek (lebih lama di luar)
        if pace > 420:
            interval -= 0.5

        # Rute pendek -> interval lebih pendek agar ada minimal 1 titik
        if distance_km < interval * 1.5:
            interval = distance_km / 2

        return max(interval, 2.0)

    def _generate_interval_points(
        self,
        coordinates: List[List[float]],
        total_distance: float,
        interval_km: float,
        max_points: int
    ) -> List[Dict[str, Any]]:
        """Generate titik pada interval reguler."""
        points = []
        interval_m = interval_km * 1000
        current_m = interval_m

        while current_m < total_distance - 500 and len(points) < max_points:
            coord = self.analyzer.interpolate_at_distance(coordinates, current_m)
            if coord:
                points.append({
                    "distanceM": current_m,
                    "distanceKm": round(current_m / 1000, 1),
                    "lat": coord["lat"],
                    "lng": coord["lng"],
                    "reason": f"Titik reguler pada KM {current_m/1000:.1f}",
                    "priority": "medium",
                    "source": "interval"
                })
            current_m += interval_m

        return points

    def _adjust_for_elevation(
        self,
        candidates: List[Dict[str, Any]],
        elevation_points: List[Dict[str, Any]],
        coordinates: List[List[float]],
        total_distance: float
    ) -> List[Dict[str, Any]]:
        """Tambah/adjust titik berdasarkan segmen tanjakan."""
        features = self.analyzer.extract_elevation_features(elevation_points)
        climbs = features.get("climbSegments", [])

        for climb in climbs:
            # Tambah titik sebelum tanjakan signifikan (gain > 20m)
            if climb["elevationGain"] > 20:
                before_climb_m = max(climb["startDistanceM"] - 200, 0)

                # Cek apakah sudah ada titik dekat sini (dalam 500m)
                too_close = any(
                    abs(c["distanceM"] - before_climb_m) < 500
                    for c in candidates
                )

                if not too_close:
                    coord = self.analyzer.interpolate_at_distance(coordinates, before_climb_m)
                    if coord:
                        candidates.append({
                            "distanceM": before_climb_m,
                            "distanceKm": round(before_climb_m / 1000, 1),
                            "lat": coord["lat"],
                            "lng": coord["lng"],
                            "reason": f"Sebelum tanjakan ({climb['elevationGain']:.0f}m gain)",
                            "priority": "high",
                            "source": "elevation"
                        })

        # Sort by distance
        candidates.sort(key=lambda x: x["distanceM"])
        return candidates

    def _finalize_points(
        self,
        candidates: List[Dict[str, Any]],
        distance_km: float,
        route_type: str
    ) -> List[Dict[str, Any]]:
        """Assign label final dan notes."""
        points = []
        for i, c in enumerate(candidates):
            point = {
                "label": f"WS {i + 1}",
                "distanceKm": c["distanceKm"],
                "lat": c["lat"],
                "lng": c["lng"],
                "priority": c["priority"],
                "reason": c["reason"],
                "notes": self._get_notes(c, i, len(candidates), route_type)
            }
            points.append(point)
        return points

    def _get_notes(
        self, candidate: Dict, index: int, total: int, route_type: str
    ) -> str:
        """Generate catatan singkat untuk runner."""
        if candidate.get("source") == "elevation":
            return "Hidrasi sebelum tanjakan membantu performa."
        if index == 0:
            return "Checkpoint hidrasi pertama."
        if index == total - 1 and route_type in ("long_run", "race"):
            return "Checkpoint terakhir sebelum finish."
        return ""

    def _generate_summary(
        self,
        distance_km: float,
        point_count: int,
        route_type: str,
        elevation_status: str
    ) -> str:
        """Generate ringkasan rekomendasi."""
        type_labels = {
            "easy_run": "lari santai",
            "long_run": "long run",
            "race": "race simulation",
            "trail": "trail run",
            "custom": "latihan"
        }
        label = type_labels.get(route_type, "latihan")

        summary = f"Rute {distance_km:.1f} km ({label}) direkomendasikan {point_count} titik hidrasi."

        if elevation_status == "degraded":
            summary += " Catatan: data elevasi tidak tersedia, rekomendasi hanya berdasarkan jarak."

        return summary

    def _get_warnings(self, elevation_status: str) -> List[str]:
        """Generate warnings/disclaimer."""
        warnings = [
            "Rekomendasi ini bukan pengganti pertimbangan kondisi tubuh dan cuaca."
        ]
        if elevation_status == "degraded":
            warnings.append(
                "Data elevasi tidak tersedia. Rekomendasi tidak mempertimbangkan tanjakan/turunan."
            )
        return warnings
