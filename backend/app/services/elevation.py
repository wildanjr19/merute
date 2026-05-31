import os
import httpx
from typing import List, Dict, Any, Tuple
from dotenv import load_dotenv

load_dotenv()

OPEN_ELEVATION_URL = os.getenv("OPEN_ELEVATION_URL", "https://api.open-elevation.com/api/v1/lookup")
MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "")


class ElevationService:
    """Service untuk mendapatkan data elevasi dari Open-Elevation API"""
    
    def __init__(self):
        self.open_elevation_url = OPEN_ELEVATION_URL
        self.mapbox_token = MAPBOX_TOKEN
        self.timeout = 30.0
    
    async def get_elevation_profile(
        self, 
        coordinates: List[List[float]], 
        sample_distance: float = 50.0
    ) -> Dict[str, Any]:
        """
        Dapatkan profil elevasi untuk polyline
        
        Args:
            coordinates: List of [lng, lat] coordinates (GeoJSON format)
            sample_distance: Jarak sampling dalam meter (default 50m)
        
        Returns:
            Dict dengan points, elevation_gain, elevation_loss, min, max, elevation_status
        """
        if len(coordinates) < 2:
            raise ValueError("Minimal 2 koordinat diperlukan")
        
        # Sample points along the route
        sampled_points = self._sample_points(coordinates, sample_distance)
        
        # Get elevation data
        elevations, is_degraded = await self._fetch_elevations(sampled_points)
        
        # Calculate statistics
        points = []
        cumulative_distance = 0.0
        
        for i, (lat, lng, elevation) in enumerate(elevations):
            if i > 0:
                prev_lat, prev_lng = elevations[i-1][0], elevations[i-1][1]
                cumulative_distance += self._haversine_distance(
                    prev_lat, prev_lng, lat, lng
                )
            
            points.append({
                "lat": lat,
                "lng": lng,
                "elevation": elevation,
                "distance": cumulative_distance
            })
        
        # Calculate gain/loss
        elevation_gain, elevation_loss = self._calculate_gain_loss(
            [p["elevation"] for p in points]
        )
        
        elevations_only = [p["elevation"] for p in points]
        
        return {
            "points": points,
            "elevation_gain": elevation_gain,
            "elevation_loss": elevation_loss,
            "min_elevation": min(elevations_only) if elevations_only else 0,
            "max_elevation": max(elevations_only) if elevations_only else 0,
            "elevation_status": "degraded" if is_degraded else "valid"
        }
    
    def _sample_points(
        self, 
        coordinates: List[List[float]], 
        sample_distance: float
    ) -> List[Tuple[float, float]]:
        """Sample points along polyline at regular intervals"""
        sampled = []
        cumulative_distance = 0.0
        
        # Always include first point
        sampled.append((coordinates[0][1], coordinates[0][0]))  # lat, lng
        
        for i in range(1, len(coordinates)):
            prev_lng, prev_lat = coordinates[i-1]
            curr_lng, curr_lat = coordinates[i]
            
            segment_distance = self._haversine_distance(
                prev_lat, prev_lng, curr_lat, curr_lng
            )
            
            # Sample points along this segment
            num_samples = int(segment_distance / sample_distance)
            
            for j in range(1, num_samples + 1):
                fraction = j / (num_samples + 1)
                interpolated_lat = prev_lat + (curr_lat - prev_lat) * fraction
                interpolated_lng = prev_lng + (curr_lng - prev_lng) * fraction
                sampled.append((interpolated_lat, interpolated_lng))
            
            # Add end point of segment
            sampled.append((curr_lat, curr_lng))
        
        # Limit to max 500 points to avoid API limits
        if len(sampled) > 500:
            step = len(sampled) // 500
            sampled = sampled[::step]
        
        return sampled
    
    async def _fetch_elevations(
        self, 
        points: List[Tuple[float, float]]
    ) -> Tuple[List[Tuple[float, float, float]], bool]:
        """
        Fetch elevation data from Open-Elevation API.
        
        Returns:
            Tuple of (elevation results, is_degraded flag)
        """
        try:
            locations = [{"latitude": lat, "longitude": lng} for lat, lng in points]
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.open_elevation_url,
                    json={"locations": locations}
                )
                response.raise_for_status()
                data = response.json()
            
            results = []
            for i, result in enumerate(data["results"]):
                lat = result["latitude"]
                lng = result["longitude"]
                elevation = result["elevation"]
                results.append((lat, lng, elevation))
            
            return results, False
        
        except Exception as e:
            # Fallback: return points with elevation 0, mark as degraded
            return [(lat, lng, 0.0) for lat, lng in points], True
    
    def _calculate_gain_loss(
        self, 
        elevations: List[float], 
        threshold: float = 3.0
    ) -> Tuple[float, float]:
        """Calculate total elevation gain and loss, ignoring noise below threshold"""
        gain = 0.0
        loss = 0.0
        
        for i in range(1, len(elevations)):
            diff = elevations[i] - elevations[i-1]
            
            if diff > threshold:
                gain += diff
            elif diff < -threshold:
                loss += abs(diff)
        
        return gain, loss
    
    def _haversine_distance(
        self, 
        lat1: float, 
        lng1: float, 
        lat2: float, 
        lng2: float
    ) -> float:
        """Calculate distance between two points in meters using Haversine formula"""
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371000  # Earth radius in meters
        
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lng = radians(lng2 - lng1)
        
        a = sin(delta_lat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lng/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
