from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


Priority = Literal["balanced", "avoid_heat", "avoid_rain"]
RecommendationLabel = Literal["best", "alternative"]


class PlannerRouteData(BaseModel):
    """Route context for Smart Run Planner."""

    polyline: dict = Field(..., description="GeoJSON LineString geometry")
    totalDistance: float = Field(..., gt=0, description="Total distance in meters")
    elevationGain: float = Field(0, ge=0, description="Total elevation gain in meters")
    elevationLoss: float = Field(0, ge=0, description="Total elevation loss in meters")


class PlannerTimeWindow(BaseModel):
    """Candidate start-time window in local route time."""

    start: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM")
    end: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM")

    @field_validator("start", "end")
    @classmethod
    def validate_time_value(cls, value: str) -> str:
        hour, minute = (int(part) for part in value.split(":"))
        if hour > 23 or minute > 59:
            raise ValueError("Waktu harus memakai format HH:MM valid")
        return value


class PlannerPreferences(BaseModel):
    """User preferences for Smart Run Planner."""

    date: date
    timeWindows: List[PlannerTimeWindow] = Field(..., min_length=1, max_length=4)
    paceSecondsPerKm: int = Field(360, gt=0, le=1800)
    priority: Priority = "balanced"


class StartTimeRequest(BaseModel):
    route: PlannerRouteData
    preferences: PlannerPreferences


class PlannerWeatherSnapshot(BaseModel):
    temperature: float
    apparentTemperature: float
    humidity: float
    rainProbability: float
    rainVolume: float
    weatherCode: int
    windSpeed: float
    windGust: float
    uvIndex: float


class PlannerRecommendation(BaseModel):
    startTime: str
    finishTime: str
    score: int = Field(..., ge=0, le=100)
    label: RecommendationLabel
    weather: PlannerWeatherSnapshot
    reasons: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)


class PlannerAvoidWindow(BaseModel):
    start: str
    end: str
    reason: str
    score: int = Field(..., ge=0, le=100)


class PlannerProviderMeta(BaseModel):
    name: str = "Open-Meteo"
    attribution: str = "Weather data by Open-Meteo"
    timezone: Optional[str] = None
    forecastDate: str


class StartTimeResponse(BaseModel):
    summary: str
    recommendations: List[PlannerRecommendation] = Field(default_factory=list)
    avoidWindows: List[PlannerAvoidWindow] = Field(default_factory=list)
    source: Literal["rules"] = "rules"
    provider: PlannerProviderMeta
