from fastapi import APIRouter
from app.services.graphhopper import GraphHopperService

router = APIRouter(tags=["health"])

graphhopper_service = GraphHopperService()


@router.get("/health")
async def health_check():
    """
    Health check endpoint - verifikasi status backend dan GraphHopper
    """
    graphhopper_status = await graphhopper_service.health_check()
    
    return {
        "status": "healthy" if graphhopper_status else "degraded",
        "services": {
            "backend": "ok",
            "graphhopper": "ok" if graphhopper_status else "unavailable"
        }
    }
