"""
Schema Pydantic untuk fitur AI MeRute.
Mencakup request/response untuk:
- Hydration Suggestions (rekomendasi titik hidrasi)
- Route Text (cue sheet teks rute)
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


# === Shared ===

class RouteData(BaseModel):
    """Data rute yang dikirim ke endpoint AI"""
    polyline: dict = Field(..., description="GeoJSON LineString geometry")
    totalDistance: float = Field(..., gt=0, description="Total jarak dalam meter")
    elevationGain: float = Field(0, ge=0, description="Total elevation gain dalam meter")
    elevationLoss: float = Field(0, ge=0, description="Total elevation loss dalam meter")
    elevationPoints: List[dict] = Field(
        default_factory=list,
        description="Titik elevasi [{lat, lng, elevation, distance}]"
    )
    elevationStatus: Literal["valid", "degraded"] = Field(
        "valid",
        description="Status data elevasi: valid atau degraded (fallback ke 0)"
    )


# === Hydration Suggestions ===

class HydrationPreferences(BaseModel):
    """Preferensi user untuk rekomendasi hidrasi"""
    paceSecondsPerKm: int = Field(360, gt=0, description="Pace dalam detik per km")
    routeType: Literal["easy_run", "long_run", "race", "trail", "custom"] = Field(
        "easy_run",
        description="Tipe latihan"
    )
    maxPoints: int = Field(5, ge=1, le=10, description="Jumlah maksimum titik hidrasi")
    notes: str = Field("", max_length=200, description="Catatan tambahan dari user")


class HydrationRequest(BaseModel):
    """Request body untuk hydration suggestions"""
    route: RouteData
    preferences: HydrationPreferences = Field(default_factory=HydrationPreferences)


class HydrationPoint(BaseModel):
    """Satu titik rekomendasi hidrasi"""
    label: str = Field(..., description="Label titik, misal 'WS 1'")
    distanceKm: float = Field(..., ge=0, description="Jarak dari start dalam km")
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    priority: Literal["low", "medium", "high"] = Field("medium")
    reason: str = Field(..., description="Alasan rekomendasi titik ini")
    notes: str = Field("", description="Catatan tambahan untuk runner")


class HydrationResponse(BaseModel):
    """Response untuk hydration suggestions"""
    model_config = ConfigDict(populate_by_name=True)

    summary: str = Field(..., description="Ringkasan rekomendasi")
    points: List[HydrationPoint] = Field(default_factory=list)
    source: Literal["ai", "rules", "hybrid"] = Field(
        "rules",
        description="Sumber rekomendasi: ai, rules, atau hybrid"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Peringatan atau disclaimer"
    )


# === Route Text ===

class RouteTextOptions(BaseModel):
    """Opsi untuk generate route text"""
    paceSecondsPerKm: int = Field(360, gt=0, description="Pace dalam detik per km")
    language: Literal["id", "en"] = Field("id", description="Bahasa output")
    format: Literal["cue_sheet", "narrative"] = Field(
        "cue_sheet",
        description="Format output: cue_sheet (ringkas) atau narrative (cerita)"
    )


class RouteInstructionData(BaseModel):
    """Satu instruksi turn-by-turn dari GraphHopper (dikirim frontend)"""
    text: str = Field("", description="Teks instruksi, misal 'Belok kiri ke Jl. Slamet Riyadi'")
    distance: float = Field(0, description="Panjang leg ini dalam meter")
    duration: float = Field(0, description="Durasi leg ini dalam detik")
    cumulativeDistance: float = Field(0, description="Jarak kumulatif dari start dalam meter")
    sign: int = Field(0, description="Tipe manuver (0=lurus, -2=kiri, 2=kanan, dll)")
    interval: List[int] = Field(default_factory=list, description="[start_idx, end_idx]")
    lat: Optional[float] = Field(None)
    lng: Optional[float] = Field(None)


class RouteTextRequest(BaseModel):
    """Request body untuk route text generation"""
    route: RouteData
    instructions: List[RouteInstructionData] = Field(
        default_factory=list,
        description="Instruksi turn-by-turn dari GraphHopper untuk menyusun cue sheet"
    )
    options: RouteTextOptions = Field(default_factory=RouteTextOptions)


class RouteTextStep(BaseModel):
    """Satu langkah instruksi dalam cue sheet"""
    distanceKm: float = Field(..., ge=0, description="Jarak kumulatif dari start")
    text: str = Field(..., description="Instruksi teks")


class RouteTextResponse(BaseModel):
    """Response untuk route text generation"""
    model_config = ConfigDict(populate_by_name=True)

    title: str = Field("MeRute Cue Sheet", description="Judul dokumen")
    summary: str = Field(..., description="Ringkasan rute")
    steps: List[RouteTextStep] = Field(default_factory=list)
    source: Literal["ai", "template", "hybrid"] = Field(
        "template",
        description="Sumber teks: ai, template, atau hybrid"
    )
    downloadText: str = Field(
        "",
        description="Teks lengkap siap download sebagai .txt"
    )
