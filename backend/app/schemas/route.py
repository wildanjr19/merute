from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class Waypoint(BaseModel):
    """Single waypoint coordinate"""
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")


class RouteCalculateRequest(BaseModel):
    """Request body for route calculation"""
    waypoints: List[Waypoint] = Field(..., min_length=2, description="List of waypoints (minimum 2)")


class RouteSegment(BaseModel):
    """Single route segment between two waypoints"""
    polyline: dict = Field(..., description="GeoJSON LineString geometry")
    distance: float = Field(..., description="Distance in meters")
    duration: Optional[float] = Field(None, description="Duration in seconds")


class RouteInstruction(BaseModel):
    """Single turn-by-turn instruction from GraphHopper"""
    text: str = Field(..., description="Instruction text")
    distance: float = Field(0, description="Distance of this segment in meters")
    duration: float = Field(0, description="Duration of this segment in seconds")
    cumulativeDistance: float = Field(0, description="Cumulative distance from start in meters")
    sign: int = Field(0, description="Maneuver type (0=straight, -2=left, 2=right, etc)")
    interval: List[int] = Field(default_factory=list, description="[start_idx, end_idx] in coordinates")
    lat: Optional[float] = Field(None, description="Latitude of instruction point")
    lng: Optional[float] = Field(None, description="Longitude of instruction point")


class RouteCalculateResponse(BaseModel):
    """Response for route calculation"""
    segments: List[RouteSegment] = Field(..., description="Route segments")
    totalDistance: float = Field(..., description="Total distance in meters")
    totalDuration: Optional[float] = Field(None, description="Total duration in seconds")
    instructions: Optional[List[RouteInstruction]] = Field(
        None, description="Turn-by-turn instructions (if requested)"
    )


class ElevationPoint(BaseModel):
    """Single elevation point along the route"""
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")
    elevation: float = Field(..., description="Elevation in meters")
    distance: float = Field(..., description="Cumulative distance from start in meters")


class ElevationRequest(BaseModel):
    """Request body for elevation data"""
    polyline: dict = Field(..., description="GeoJSON LineString geometry")


class ElevationResponse(BaseModel):
    """Response for elevation data"""
    model_config = ConfigDict(populate_by_name=True, by_alias=True)
    
    points: List[ElevationPoint] = Field(..., description="Elevation points along the route")
    elevation_gain: float = Field(..., serialization_alias="elevationGain", description="Total elevation gain in meters")
    elevation_loss: float = Field(..., serialization_alias="elevationLoss", description="Total elevation loss in meters")
    min_elevation: float = Field(..., serialization_alias="minElevation", description="Minimum elevation in meters")
    max_elevation: float = Field(..., serialization_alias="maxElevation", description="Maximum elevation in meters")
    elevation_status: Literal["valid", "degraded"] = Field(
        "valid",
        serialization_alias="elevationStatus",
        description="Status data elevasi: valid atau degraded (fallback ke 0)"
    )
