import os
import time
from typing import Any, Dict, Tuple

import httpx
from dotenv import load_dotenv

load_dotenv()

OPEN_METEO_URL = os.getenv(
    "OPEN_METEO_URL",
    "https://api.open-meteo.com/v1/forecast",
)

HOURLY_VARIABLES = [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "precipitation_probability",
    "rain",
    "weather_code",
    "wind_speed_10m",
    "wind_gusts_10m",
    "uv_index",
]


class WeatherService:
    """Fetch and cache hourly forecast data from Open-Meteo."""

    def __init__(self) -> None:
        self.base_url = OPEN_METEO_URL
        self.timeout = 15.0
        self.cache_ttl_seconds = 15 * 60
        self._cache: Dict[Tuple[float, float, str], Tuple[float, Dict[str, Any]]] = {}

    async def get_hourly_forecast(
        self,
        latitude: float,
        longitude: float,
        forecast_date: str,
    ) -> Dict[str, Any]:
        cache_key = (round(latitude, 3), round(longitude, 3), forecast_date)
        now = time.time()
        cached = self._cache.get(cache_key)

        if cached and now - cached[0] < self.cache_ttl_seconds:
            return cached[1]

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ",".join(HOURLY_VARIABLES),
            "start_date": forecast_date,
            "end_date": forecast_date,
            "timezone": "auto",
            "wind_speed_unit": "kmh",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            raise RuntimeError("Gagal mengambil forecast dari Open-Meteo") from exc

        hourly = data.get("hourly")
        if not hourly or not hourly.get("time"):
            raise RuntimeError("Forecast Open-Meteo tidak memiliki data hourly")

        self._cache[cache_key] = (now, data)
        self._prune_cache(now)
        return data

    def _prune_cache(self, now: float) -> None:
        expired_keys = [
            key
            for key, (created_at, _) in self._cache.items()
            if now - created_at >= self.cache_ttl_seconds
        ]
        for key in expired_keys:
            self._cache.pop(key, None)
