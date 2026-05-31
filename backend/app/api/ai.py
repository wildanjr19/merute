"""
API endpoints untuk fitur AI MeRute.
Hybrid approach: rules baseline + AI enhancement.
"""

from typing import Dict
from fastapi import APIRouter, HTTPException, Request
from app.schemas.ai import (
    HydrationRequest,
    HydrationResponse,
    RouteTextRequest,
    RouteTextResponse,
    RouteTextStep,
)
from app.config.ai import ai_config
from app.services.hydration_rules import HydrationRulesService
from app.services.route_analyzer import RouteAnalyzer
from app.services.ai_service import AIService
from app.services.cue_sheet import CueSheetBuilder
from app.services.rate_limiter import ai_rate_limiter

router = APIRouter(prefix="/api/ai", tags=["ai"])

hydration_service = HydrationRulesService()
route_analyzer = RouteAnalyzer()
ai_service = AIService()
cue_sheet_builder = CueSheetBuilder()


@router.post("/hydration-suggestions", response_model=HydrationResponse)
async def hydration_suggestions(request: HydrationRequest, req: Request):
    """
    Generate rekomendasi titik hidrasi di sepanjang rute.
    Hybrid: rules baseline + AI enhancement jika tersedia.
    """
    if not ai_config.enabled:
        raise HTTPException(
            status_code=503,
            detail="Fitur AI belum diaktifkan. Set AI_FEATURE_ENABLED=true di .env"
        )

    # Rate limit
    ai_rate_limiter.check(req)

    if request.route.totalDistance < 1000:
        raise HTTPException(
            status_code=400,
            detail="Rute terlalu pendek untuk rekomendasi hidrasi (minimal 1 km)"
        )

    coordinates = request.route.polyline.get("coordinates", [])
    if len(coordinates) < 2:
        raise HTTPException(
            status_code=400,
            detail="Polyline harus memiliki minimal 2 koordinat"
        )

    # Limit jumlah koordinat untuk mencegah payload terlalu besar
    if len(coordinates) > 5000:
        raise HTTPException(
            status_code=400,
            detail="Polyline terlalu besar (maks 5000 koordinat)"
        )

    # Step 1: Generate rules baseline
    rules_result = hydration_service.generate(
        coordinates=coordinates,
        total_distance=request.route.totalDistance,
        elevation_points=request.route.elevationPoints,
        elevation_status=request.route.elevationStatus,
        pace_seconds_per_km=request.preferences.paceSecondsPerKm,
        route_type=request.preferences.routeType,
        max_points=request.preferences.maxPoints
    )

    # Step 2: Enhance dengan AI jika available
    if ai_config.is_available() and rules_result["points"]:
        route_summary = route_analyzer.analyze(
            coordinates=coordinates,
            elevation_points=request.route.elevationPoints,
            total_distance=request.route.totalDistance,
            elevation_status=request.route.elevationStatus
        )

        ai_result = await ai_service.enhance_hydration(
            route_summary=route_summary,
            rules_result=rules_result,
            preferences={
                "paceSecondsPerKm": request.preferences.paceSecondsPerKm,
                "routeType": request.preferences.routeType
            }
        )

        if ai_result:
            # Merge AI enhancements ke rules result
            for i, ai_point in enumerate(ai_result.get("points", [])):
                if i < len(rules_result["points"]):
                    if ai_point.get("reason"):
                        rules_result["points"][i]["reason"] = ai_point["reason"]
                    if ai_point.get("notes"):
                        rules_result["points"][i]["notes"] = ai_point["notes"]
                    if ai_point.get("priority"):
                        rules_result["points"][i]["priority"] = ai_point["priority"]

            if ai_result.get("summary"):
                rules_result["summary"] = ai_result["summary"]
            rules_result["source"] = "hybrid"

    return HydrationResponse(**rules_result)


@router.post("/route-text", response_model=RouteTextResponse)
async def route_text(request: RouteTextRequest, req: Request):
    """
    Generate cue sheet / panduan teks rute.

    Strategi hybrid:
    1. Baseline deterministik dari instruksi GraphHopper (nama jalan + arah belok + jarak).
    2. AI opsional hanya merapikan summary/narasi (tidak mengubah arah).
    3. Fallback template berbasis kilometer bila tidak ada instruksi.
    """
    if not ai_config.enabled:
        raise HTTPException(
            status_code=503,
            detail="Fitur AI belum diaktifkan. Set AI_FEATURE_ENABLED=true di .env"
        )

    # Rate limit
    ai_rate_limiter.check(req)

    if request.route.totalDistance < 100:
        raise HTTPException(
            status_code=400,
            detail="Rute terlalu pendek untuk generate teks (minimal 100 m)"
        )

    coordinates = request.route.polyline.get("coordinates", [])
    if len(coordinates) < 2:
        raise HTTPException(
            status_code=400,
            detail="Polyline harus memiliki minimal 2 koordinat"
        )

    if len(coordinates) > 5000:
        raise HTTPException(
            status_code=400,
            detail="Polyline terlalu besar (maks 5000 koordinat)"
        )

    # Analyze route
    route_summary = route_analyzer.analyze(
        coordinates=coordinates,
        elevation_points=request.route.elevationPoints,
        total_distance=request.route.totalDistance,
        elevation_status=request.route.elevationStatus
    )

    instructions = [instr.model_dump() for instr in request.instructions]
    options = {
        "paceSecondsPerKm": request.options.paceSecondsPerKm,
        "language": request.options.language,
        "format": request.options.format,
    }

    # Tanpa instruksi turn-by-turn, jatuh ke template berbasis kilometer.
    if not instructions:
        return _generate_template_response(route_summary, request)

    # Baseline deterministik dari instruksi GraphHopper.
    built = cue_sheet_builder.build(
        instructions=instructions,
        route_summary=route_summary,
        options=options,
    )
    steps = [
        RouteTextStep(distanceKm=s["distanceKm"], text=s["text"])
        for s in built["steps"]
    ]
    summary = built["summary"]
    source = "rules"

    # Enhance opsional: AI hanya merapikan ringkasan/narasi, arah tetap deterministik.
    if ai_config.is_available():
        ai_result = await ai_service.generate_route_text(
            route_summary=route_summary,
            instructions=instructions,
            options=options,
        )
        if ai_result and ai_result.get("summary"):
            summary = ai_result["summary"]
            source = "hybrid"
            if request.options.format == "narrative" and ai_result.get("steps"):
                steps = [
                    RouteTextStep(distanceKm=s["distanceKm"], text=s["text"])
                    for s in ai_result["steps"]
                ]

    download_lines = [built["title"], "", summary, ""]
    for step in steps:
        download_lines.append(f"  KM {step.distanceKm:.1f}: {step.text}")

    return RouteTextResponse(
        title=built["title"],
        summary=summary,
        steps=steps,
        source=source,
        downloadText="\n".join(download_lines),
    )


def _generate_template_response(
    route_summary: Dict, request: RouteTextRequest
) -> RouteTextResponse:
    """Fallback template tanpa AI."""
    distance_km = route_summary["totalDistanceKm"]
    pace = request.options.paceSecondsPerKm
    pace_min = pace // 60
    pace_sec = pace % 60
    total_seconds = int(distance_km * pace)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60

    time_str = f"{hours} jam {minutes} menit" if hours > 0 else f"{minutes} menit"

    steps = []
    steps.append(RouteTextStep(distanceKm=0.0, text="Mulai dari titik start."))

    for km_point in route_summary.get("kmPoints", []):
        steps.append(RouteTextStep(
            distanceKm=float(km_point["km"]),
            text=f"KM {km_point['km']} tercapai."
        ))

    steps.append(RouteTextStep(
        distanceKm=distance_km,
        text="Finish. Selamat!"
    ))

    summary = f"Rute {distance_km} km, estimasi {time_str} pada pace {pace_min}:{pace_sec:02d}/km."

    download_lines = [
        "MeRute Cue Sheet",
        "",
        f"Total jarak: {distance_km} km",
        f"Estimasi waktu: {time_str} pada pace {pace_min}:{pace_sec:02d}/km",
        "",
    ]
    for step in steps:
        download_lines.append(f"  KM {step.distanceKm:.1f}: {step.text}")

    return RouteTextResponse(
        title="MeRute Cue Sheet",
        summary=summary,
        steps=steps,
        source="template",
        downloadText="\n".join(download_lines)
    )
