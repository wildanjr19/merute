from fastapi import APIRouter, HTTPException

from app.schemas.planner import StartTimeRequest, StartTimeResponse
from app.services.run_planner_service import RunPlannerService
from app.services.weather_service import WeatherService

router = APIRouter(prefix="/api/planner", tags=["planner"])

weather_service = WeatherService()
run_planner_service = RunPlannerService(weather_service)


@router.post("/start-time", response_model=StartTimeResponse)
async def recommend_start_time(request: StartTimeRequest):
    """
    Rekomendasi jam mulai lari berdasarkan rute aktif dan forecast cuaca.
    Rules-based, tanpa AI.
    """
    try:
        if request.route.totalDistance < 100:
            raise ValueError("Rute minimal 100 m untuk Smart Run Planner")

        return await run_planner_service.recommend_start_times(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal menghitung rekomendasi jam lari: {str(exc)}",
        )
