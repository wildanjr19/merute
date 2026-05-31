from fastapi import APIRouter, HTTPException
from app.schemas.route import (
    RouteCalculateRequest,
    RouteCalculateResponse,
    ElevationRequest,
    ElevationResponse
)
from app.services.graphhopper import GraphHopperService
from app.services.elevation import ElevationService

router = APIRouter(prefix="/api/routes", tags=["routes"])

graphhopper_service = GraphHopperService()
elevation_service = ElevationService()


@router.post("/calculate", response_model=RouteCalculateResponse)
async def calculate_route(request: RouteCalculateRequest):
    """
    Hitung rute antara waypoints menggunakan GraphHopper
    """
    try:
        waypoints = [{"lat": wp.lat, "lng": wp.lng} for wp in request.waypoints]
        result = await graphhopper_service.calculate_route(waypoints)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Gagal menghitung rute: {str(e)}"
        )


@router.post("/elevation", response_model=ElevationResponse)
async def get_elevation(request: ElevationRequest):
    """
    Dapatkan profil elevasi untuk polyline
    """
    try:
        if request.polyline.get("type") != "LineString":
            raise ValueError("Polyline harus berupa GeoJSON LineString")
        
        coordinates = request.polyline.get("coordinates", [])
        if len(coordinates) < 2:
            raise ValueError("Minimal 2 koordinat diperlukan")
        
        result = await elevation_service.get_elevation_profile(coordinates)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Gagal mendapatkan data elevasi: {str(e)}"
        )
