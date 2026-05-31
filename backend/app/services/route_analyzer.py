"""
Route Analyzer Service untuk MeRute.
Mengekstrak fitur-fitur penting dari polyline rute untuk dipakai oleh
rules engine dan AI service.
"""

from typing import List, Dict, Any, Tuple
from math import radians, sin, cos, sqrt, atan2


class RouteAnalyzer:
    """Menganalisis dan merangkum data rute untuk keperluan AI/rules"""

    def analyze(
        self,
        coordinates: List[List[float]],
        elevation_points: List[Dict[str, Any]],
        total_distance: float,
        elevation_status: str = "valid"
    ) -> Dict[str, Any]:
        """
        Analisis lengkap rute.

        Args:
            coordinates: GeoJSON coordinates [[lng, lat], ...]
            elevation_points: [{lat, lng, elevation, distance}, ...]
            total_distance: Total jarak dalam meter
            elevation_status: "valid" atau "degraded"

        Returns:
            Dict ringkasan fitur rute
        """
        km_points = self.get_km_points(coordinates, total_distance)

        summary = {
            "totalDistanceM": total_distance,
            "totalDistanceKm": round(total_distance / 1000, 2),
            "coordinateCount": len(coordinates),
            "kmPoints": km_points,
            "elevationStatus": elevation_status,
        }

        if elevation_status == "valid" and elevation_points:
            summary["elevationFeatures"] = self.extract_elevation_features(
                elevation_points
            )
        else:
            summary["elevationFeatures"] = None

        summary["simplifiedCoordinates"] = self.simplify_coordinates(
            coordinates, max_points=120
        )

        return summary

    def get_km_points(
        self,
        coordinates: List[List[float]],
        total_distance: float
    ) -> List[Dict[str, Any]]:
        """
        Cari koordinat pada setiap kilometer di sepanjang polyline.

        Returns:
            List of {km, lat, lng, distanceM}
        """
        if len(coordinates) < 2:
            return []

        km_points = []
        cumulative = 0.0
        next_km = 1000.0
        total_km = int(total_distance / 1000)

        for i in range(1, len(coordinates)):
            prev_lng, prev_lat = coordinates[i - 1]
            curr_lng, curr_lat = coordinates[i]

            seg_dist = self._haversine(prev_lat, prev_lng, curr_lat, curr_lng)

            while cumulative + seg_dist >= next_km and next_km <= total_distance:
                fraction = (next_km - cumulative) / seg_dist if seg_dist > 0 else 0
                interp_lat = prev_lat + (curr_lat - prev_lat) * fraction
                interp_lng = prev_lng + (curr_lng - prev_lng) * fraction

                km_points.append({
                    "km": len(km_points) + 1,
                    "lat": round(interp_lat, 6),
                    "lng": round(interp_lng, 6),
                    "distanceM": round(next_km, 1)
                })
                next_km += 1000.0

            cumulative += seg_dist

        return km_points

    def interpolate_at_distance(
        self,
        coordinates: List[List[float]],
        target_distance: float
    ) -> Dict[str, float]:
        """
        Cari koordinat pada jarak tertentu (meter) di sepanjang polyline.

        Returns:
            {lat, lng, distanceM} atau None jika jarak melebihi polyline
        """
        if len(coordinates) < 2:
            return None

        cumulative = 0.0

        for i in range(1, len(coordinates)):
            prev_lng, prev_lat = coordinates[i - 1]
            curr_lng, curr_lat = coordinates[i]

            seg_dist = self._haversine(prev_lat, prev_lng, curr_lat, curr_lng)

            if cumulative + seg_dist >= target_distance:
                fraction = (target_distance - cumulative) / seg_dist if seg_dist > 0 else 0
                interp_lat = prev_lat + (curr_lat - prev_lat) * fraction
                interp_lng = prev_lng + (curr_lng - prev_lng) * fraction

                return {
                    "lat": round(interp_lat, 6),
                    "lng": round(interp_lng, 6),
                    "distanceM": round(target_distance, 1)
                }

            cumulative += seg_dist

        # Jarak melebihi polyline, kembalikan titik terakhir
        last = coordinates[-1]
        return {
            "lat": round(last[1], 6),
            "lng": round(last[0], 6),
            "distanceM": round(cumulative, 1)
        }

    def extract_elevation_features(
        self,
        elevation_points: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Ekstrak fitur elevasi penting: segmen tanjakan, turunan, titik tertinggi/terendah.

        Returns:
            Dict dengan climb_segments, descent_segments, peaks, valleys
        """
        if len(elevation_points) < 3:
            return {"climbSegments": [], "descentSegments": [], "peaks": [], "valleys": []}

        climbs = []
        descents = []
        peaks = []
        valleys = []

        # Deteksi segmen tanjakan/turunan signifikan (>10m gain/loss)
        i = 0
        while i < len(elevation_points) - 1:
            start_idx = i
            start_elev = elevation_points[i]["elevation"]
            start_dist = elevation_points[i]["distance"]

            # Cari segmen naik
            while i < len(elevation_points) - 1 and elevation_points[i + 1]["elevation"] >= elevation_points[i]["elevation"]:
                i += 1

            end_elev = elevation_points[i]["elevation"]
            end_dist = elevation_points[i]["distance"]
            gain = end_elev - start_elev

            if gain > 10:
                climbs.append({
                    "startDistanceM": round(start_dist, 1),
                    "endDistanceM": round(end_dist, 1),
                    "elevationGain": round(gain, 1),
                    "lengthM": round(end_dist - start_dist, 1),
                    "avgGradient": round((gain / (end_dist - start_dist)) * 100, 1) if end_dist > start_dist else 0
                })

            # Cek apakah ini peak
            if i > 0 and i < len(elevation_points) - 1:
                if elevation_points[i]["elevation"] > elevation_points[i - 1]["elevation"] and elevation_points[i]["elevation"] > elevation_points[i + 1]["elevation"]:
                    peaks.append({
                        "distanceM": round(elevation_points[i]["distance"], 1),
                        "elevation": round(elevation_points[i]["elevation"], 1),
                        "lat": elevation_points[i]["lat"],
                        "lng": elevation_points[i]["lng"]
                    })

            # Cari segmen turun
            start_idx = i
            start_elev = elevation_points[i]["elevation"]
            start_dist = elevation_points[i]["distance"]

            while i < len(elevation_points) - 1 and elevation_points[i + 1]["elevation"] <= elevation_points[i]["elevation"]:
                i += 1

            end_elev = elevation_points[i]["elevation"]
            end_dist = elevation_points[i]["distance"]
            loss = start_elev - end_elev

            if loss > 10:
                descents.append({
                    "startDistanceM": round(start_dist, 1),
                    "endDistanceM": round(end_dist, 1),
                    "elevationLoss": round(loss, 1),
                    "lengthM": round(end_dist - start_dist, 1),
                    "avgGradient": round((loss / (end_dist - start_dist)) * 100, 1) if end_dist > start_dist else 0
                })

            # Cek apakah ini valley
            if i > 0 and i < len(elevation_points) - 1:
                if elevation_points[i]["elevation"] < elevation_points[i - 1]["elevation"] and elevation_points[i]["elevation"] < elevation_points[i + 1]["elevation"]:
                    valleys.append({
                        "distanceM": round(elevation_points[i]["distance"], 1),
                        "elevation": round(elevation_points[i]["elevation"], 1),
                        "lat": elevation_points[i]["lat"],
                        "lng": elevation_points[i]["lng"]
                    })

            if i == start_idx:
                i += 1

        return {
            "climbSegments": climbs,
            "descentSegments": descents,
            "peaks": peaks,
            "valleys": valleys
        }

    def simplify_coordinates(
        self,
        coordinates: List[List[float]],
        max_points: int = 120
    ) -> List[List[float]]:
        """
        Sederhanakan polyline agar tidak terlalu banyak titik.
        Menggunakan sampling merata jika melebihi max_points.
        """
        if len(coordinates) <= max_points:
            return coordinates

        step = len(coordinates) / max_points
        simplified = []
        for i in range(max_points):
            idx = int(i * step)
            simplified.append(coordinates[idx])

        # Pastikan titik terakhir selalu ada
        if simplified[-1] != coordinates[-1]:
            simplified[-1] = coordinates[-1]

        return simplified

    def _haversine(
        self, lat1: float, lng1: float, lat2: float, lng2: float
    ) -> float:
        """Jarak antara dua titik dalam meter (Haversine)"""
        R = 6371000
        lat1_r, lat2_r = radians(lat1), radians(lat2)
        dlat = radians(lat2 - lat1)
        dlng = radians(lng2 - lng1)

        a = sin(dlat / 2) ** 2 + cos(lat1_r) * cos(lat2_r) * sin(dlng / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c
