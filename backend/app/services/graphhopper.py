import os
import httpx
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

GRAPHHOPPER_URL = os.getenv("GRAPHHOPPER_URL", "http://localhost:8989")


class GraphHopperService:
    """Service untuk berinteraksi dengan GraphHopper Routing API"""
    
    def __init__(self):
        self.base_url = GRAPHHOPPER_URL
        self.timeout = 30.0
    
    async def calculate_route(
        self, 
        waypoints: List[Dict[str, float]], 
        profile: str = "foot",
        include_instructions: bool = True,
        locale: str = "id"
    ) -> Dict[str, Any]:
        """
        Hitung rute antara waypoints menggunakan GraphHopper
        
        Args:
            waypoints: List of {lat, lng} dictionaries
            profile: Routing profile (foot, car, bike, etc.)
            include_instructions: Ambil instruksi turn-by-turn
            locale: Bahasa untuk instruksi (id, en, dll)
        
        Returns:
            Dict dengan segments, total_distance, dan opsional instructions
        """
        if len(waypoints) < 2:
            raise ValueError("Minimal 2 waypoints diperlukan")
        
        params = {
            "profile": profile,
            "points_encoded": False,
            "elevation": False,
            "instructions": include_instructions,
            "calc_points": True,
            "locale": locale
        }
        
        url = f"{self.base_url}/route"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            point_params = [("point", f"{wp['lat']},{wp['lng']}") for wp in waypoints]
            
            response = await client.get(
                url,
                params=[*point_params, *params.items()]
            )
            response.raise_for_status()
            data = response.json()
        
        if "paths" not in data or len(data["paths"]) == 0:
            raise ValueError("GraphHopper tidak menemukan rute")
        
        path = data["paths"][0]
        
        coordinates = path["points"]["coordinates"]
        total_distance = path["distance"]
        total_duration = path.get("time", 0) / 1000  # ms to seconds
        
        # Segment utama (backward-compatible)
        segment = {
            "polyline": {
                "type": "LineString",
                "coordinates": coordinates
            },
            "distance": total_distance,
            "duration": total_duration
        }
        
        result = {
            "segments": [segment],
            "totalDistance": total_distance,
            "totalDuration": total_duration
        }
        
        # Tambahkan instructions jika diminta dan tersedia
        if include_instructions and "instructions" in path:
            result["instructions"] = self._parse_instructions(
                path["instructions"], coordinates
            )
        
        return result
    
    def _parse_instructions(
        self,
        raw_instructions: List[Dict[str, Any]],
        coordinates: List[List[float]]
    ) -> List[Dict[str, Any]]:
        """
        Parse instruksi GraphHopper menjadi format yang lebih bersih.
        
        GraphHopper instruction fields:
        - text: instruksi teks (misal "Belok kiri ke Jl. Slamet Riyadi")
        - distance: jarak segmen ini dalam meter
        - time: waktu segmen ini dalam ms
        - interval: [start_index, end_index] di coordinates array
        - sign: tipe manuver (0=lurus, -2=belok kiri, 2=belok kanan, dll)
        """
        instructions = []
        cumulative_distance = 0.0
        
        for instr in raw_instructions:
            interval = instr.get("interval", [0, 0])
            start_idx = interval[0]
            
            # Ambil koordinat titik instruksi
            lat, lng = None, None
            if start_idx < len(coordinates):
                coord = coordinates[start_idx]
                lng, lat = coord[0], coord[1]
            
            parsed = {
                "text": instr.get("text", ""),
                "distance": instr.get("distance", 0),
                "duration": instr.get("time", 0) / 1000,
                "cumulativeDistance": cumulative_distance,
                "sign": instr.get("sign", 0),
                "interval": interval,
            }
            
            if lat is not None and lng is not None:
                parsed["lat"] = lat
                parsed["lng"] = lng
            
            instructions.append(parsed)
            cumulative_distance += instr.get("distance", 0)
        
        return instructions
    
    async def health_check(self) -> bool:
        """Check if GraphHopper service is available"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/health")
                return response.status_code == 200
        except Exception:
            return False
