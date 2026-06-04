from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from math import ceil
from typing import Any, Dict, List, Tuple

from app.schemas.planner import (
    PlannerAvoidWindow,
    PlannerProviderMeta,
    PlannerRecommendation,
    PlannerWeatherSnapshot,
    StartTimeRequest,
    StartTimeResponse,
)
from app.services.weather_service import WeatherService


@dataclass
class CandidateScore:
    start_at: datetime
    finish_at: datetime
    window_end: datetime
    score: int
    weather: PlannerWeatherSnapshot
    reasons: List[str]
    risks: List[str]


class RunPlannerService:
    """Rule-based Smart Run Planner scoring service."""

    def __init__(self, weather_service: WeatherService) -> None:
        self.weather_service = weather_service

    async def recommend_start_times(self, request: StartTimeRequest) -> StartTimeResponse:
        coordinates = self._extract_coordinates(request.route.polyline)
        start_lng, start_lat = coordinates[0]
        forecast_date = request.preferences.date.isoformat()

        forecast = await self.weather_service.get_hourly_forecast(
            latitude=start_lat,
            longitude=start_lng,
            forecast_date=forecast_date,
        )
        hourly_records = self._build_hourly_records(forecast)
        if not hourly_records:
            raise ValueError("Forecast tidak tersedia untuk tanggal tersebut")

        duration_seconds = self._estimate_duration_seconds(
            total_distance=request.route.totalDistance,
            pace_seconds_per_km=request.preferences.paceSecondsPerKm,
        )
        candidates = self._generate_candidates(
            run_date=request.preferences.date,
            time_windows=request.preferences.timeWindows,
            duration_seconds=duration_seconds,
        )
        if not candidates:
            raise ValueError("Tidak ada kandidat waktu valid di time window")

        scored = [
            self._score_candidate(
                start_at=start_at,
                finish_at=start_at + timedelta(seconds=duration_seconds),
                window_end=window_end,
                hourly_records=hourly_records,
                priority=request.preferences.priority,
            )
            for start_at, window_end in candidates
        ]
        scored.sort(key=lambda item: item.score, reverse=True)

        recommendations = self._build_recommendations(scored)
        avoid_windows = self._build_avoid_windows(scored)
        summary = self._build_summary(recommendations, request.preferences.priority)

        return StartTimeResponse(
            summary=summary,
            recommendations=recommendations,
            avoidWindows=avoid_windows,
            source="rules",
            provider=PlannerProviderMeta(
                timezone=forecast.get("timezone"),
                forecastDate=forecast_date,
            ),
        )

    def _extract_coordinates(self, polyline: Dict[str, Any]) -> List[List[float]]:
        if polyline.get("type") != "LineString":
            raise ValueError("Polyline harus berupa GeoJSON LineString")

        coordinates = polyline.get("coordinates", [])
        if len(coordinates) < 2:
            raise ValueError("Polyline harus memiliki minimal 2 koordinat")

        for coord in coordinates[:2]:
            if not isinstance(coord, list) or len(coord) < 2:
                raise ValueError("Koordinat polyline tidak valid")
            lng, lat = coord[0], coord[1]
            if not (-180 <= lng <= 180 and -90 <= lat <= 90):
                raise ValueError("Koordinat polyline di luar batas valid")

        return coordinates

    def _estimate_duration_seconds(
        self,
        total_distance: float,
        pace_seconds_per_km: int,
    ) -> int:
        distance_km = total_distance / 1000
        return max(60, int(ceil(distance_km * pace_seconds_per_km)))

    def _build_hourly_records(self, forecast: Dict[str, Any]) -> List[Dict[str, Any]]:
        hourly = forecast.get("hourly", {})
        times = hourly.get("time", [])
        records: List[Dict[str, Any]] = []

        for index, raw_time in enumerate(times):
            try:
                records.append(
                    {
                        "time": datetime.fromisoformat(raw_time),
                        "temperature": self._value_at(hourly, "temperature_2m", index),
                        "apparent_temperature": self._value_at(hourly, "apparent_temperature", index),
                        "humidity": self._value_at(hourly, "relative_humidity_2m", index),
                        "rain_probability": self._value_at(hourly, "precipitation_probability", index),
                        "rain": self._value_at(hourly, "rain", index),
                        "weather_code": int(self._value_at(hourly, "weather_code", index)),
                        "wind_speed": self._value_at(hourly, "wind_speed_10m", index),
                        "wind_gust": self._value_at(hourly, "wind_gusts_10m", index),
                        "uv_index": self._value_at(hourly, "uv_index", index),
                    }
                )
            except (TypeError, ValueError, IndexError):
                continue

        return records

    def _value_at(self, hourly: Dict[str, Any], key: str, index: int) -> float:
        values = hourly.get(key) or []
        value = values[index]
        return float(value or 0)

    def _generate_candidates(
        self,
        run_date: date,
        time_windows: List[Any],
        duration_seconds: int,
    ) -> List[Tuple[datetime, datetime]]:
        candidates: List[Tuple[datetime, datetime]] = []
        step = timedelta(minutes=30)
        duration = timedelta(seconds=duration_seconds)

        for window in time_windows:
            start_at = datetime.combine(run_date, self._parse_time(window.start))
            end_at = datetime.combine(run_date, self._parse_time(window.end))
            if end_at <= start_at:
                end_at += timedelta(days=1)

            current = start_at
            while current <= end_at:
                # Keep very long runs from producing starts that miss the selected window entirely.
                if current + duration > start_at:
                    candidates.append((current, end_at))
                current += step

        return candidates

    def _parse_time(self, value: str) -> time:
        hour, minute = (int(part) for part in value.split(":"))
        return time(hour=hour, minute=minute)

    def _score_candidate(
        self,
        start_at: datetime,
        finish_at: datetime,
        window_end: datetime,
        hourly_records: List[Dict[str, Any]],
        priority: str,
    ) -> CandidateScore:
        records = self._records_for_run(start_at, finish_at, hourly_records)
        snapshot = self._aggregate_weather(records)

        temp_score = self._score_temperature(snapshot.apparentTemperature)
        rain_score = self._score_rain(snapshot.rainProbability, snapshot.rainVolume)
        humidity_score = self._score_humidity(snapshot.humidity)
        wind_score = self._score_wind(snapshot.windSpeed, snapshot.windGust)
        uv_score = self._score_uv(snapshot.uvIndex)
        duration_fit_score = self._score_duration_fit(finish_at, window_end)

        weights = self._weights(priority)
        final_score = round(
            temp_score * weights["temperature"]
            + rain_score * weights["rain"]
            + humidity_score * weights["humidity"]
            + wind_score * weights["wind"]
            + uv_score * weights["uv"]
            + duration_fit_score * weights["duration"]
        )
        final_score = max(0, min(100, final_score))
        reasons, risks = self._build_reasons_and_risks(snapshot, finish_at, window_end)

        return CandidateScore(
            start_at=start_at,
            finish_at=finish_at,
            window_end=window_end,
            score=final_score,
            weather=snapshot,
            reasons=reasons,
            risks=risks,
        )

    def _records_for_run(
        self,
        start_at: datetime,
        finish_at: datetime,
        hourly_records: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        selected = [
            record
            for record in hourly_records
            if record["time"] < finish_at and record["time"] + timedelta(hours=1) > start_at
        ]
        if selected:
            return selected

        return [min(hourly_records, key=lambda record: abs(record["time"] - start_at))]

    def _aggregate_weather(self, records: List[Dict[str, Any]]) -> PlannerWeatherSnapshot:
        count = len(records)
        worst_code = max(records, key=lambda record: self._weather_code_severity(record["weather_code"]))[
            "weather_code"
        ]

        return PlannerWeatherSnapshot(
            temperature=round(sum(record["temperature"] for record in records) / count, 1),
            apparentTemperature=round(
                sum(record["apparent_temperature"] for record in records) / count,
                1,
            ),
            humidity=round(sum(record["humidity"] for record in records) / count),
            rainProbability=round(max(record["rain_probability"] for record in records)),
            rainVolume=round(sum(record["rain"] for record in records), 1),
            weatherCode=worst_code,
            windSpeed=round(sum(record["wind_speed"] for record in records) / count, 1),
            windGust=round(max(record["wind_gust"] for record in records), 1),
            uvIndex=round(max(record["uv_index"] for record in records), 1),
        )

    def _score_temperature(self, apparent_temp: float) -> float:
        if 18 <= apparent_temp <= 26:
            return 100
        if 26 < apparent_temp <= 29:
            return 86 - (apparent_temp - 26) * 4
        if 29 < apparent_temp <= 32:
            return 70 - (apparent_temp - 29) * 10
        if apparent_temp > 32:
            return max(15, 40 - (apparent_temp - 32) * 5)
        return max(70, 100 - (18 - apparent_temp) * 5)

    def _score_rain(self, probability: float, rain_volume: float) -> float:
        return max(0, 100 - probability * 1.1 - rain_volume * 18)

    def _score_humidity(self, humidity: float) -> float:
        if humidity <= 70:
            return 100
        if humidity <= 80:
            return 82
        if humidity <= 90:
            return 58
        return 35

    def _score_wind(self, wind_speed: float, wind_gust: float) -> float:
        effective_wind = max(wind_speed, wind_gust * 0.75)
        if effective_wind < 15:
            return 100
        if effective_wind <= 25:
            return 82
        if effective_wind <= 35:
            return 55
        return 25

    def _score_uv(self, uv_index: float) -> float:
        if uv_index <= 2:
            return 100
        if uv_index <= 5:
            return 76
        if uv_index <= 7:
            return 48
        return 20

    def _score_duration_fit(self, finish_at: datetime, window_end: datetime) -> float:
        if finish_at <= window_end:
            return 100

        overflow_minutes = (finish_at - window_end).total_seconds() / 60
        return max(45, 100 - overflow_minutes * 0.7)

    def _weights(self, priority: str) -> Dict[str, float]:
        if priority == "avoid_heat":
            return {
                "temperature": 0.38,
                "rain": 0.18,
                "humidity": 0.16,
                "wind": 0.08,
                "uv": 0.17,
                "duration": 0.03,
            }
        if priority == "avoid_rain":
            return {
                "temperature": 0.24,
                "rain": 0.38,
                "humidity": 0.13,
                "wind": 0.10,
                "uv": 0.10,
                "duration": 0.05,
            }
        return {
            "temperature": 0.30,
            "rain": 0.25,
            "humidity": 0.15,
            "wind": 0.10,
            "uv": 0.15,
            "duration": 0.05,
        }

    def _build_reasons_and_risks(
        self,
        weather: PlannerWeatherSnapshot,
        finish_at: datetime,
        window_end: datetime,
    ) -> Tuple[List[str], List[str]]:
        reasons: List[str] = []
        risks: List[str] = []

        if weather.apparentTemperature <= 26:
            reasons.append("Suhu terasa masih nyaman untuk lari.")
        elif weather.apparentTemperature <= 29:
            reasons.append("Suhu masih cukup oke, tetapi mulai terasa hangat.")
        elif weather.apparentTemperature <= 32:
            risks.append("Suhu terasa cukup panas.")
        else:
            risks.append("Suhu terasa panas dan kurang ideal untuk intensitas tinggi.")

        if weather.rainProbability <= 20 and weather.rainVolume <= 0.2:
            reasons.append("Peluang hujan rendah.")
        elif weather.rainProbability <= 40:
            risks.append("Ada risiko hujan ringan.")
        elif weather.rainProbability <= 60:
            risks.append("Risiko hujan sedang, pantau ulang mendekati jam lari.")
        else:
            risks.append("Peluang hujan tinggi.")

        if weather.uvIndex <= 2:
            reasons.append("UV masih rendah.")
        elif weather.uvIndex <= 5:
            risks.append("UV sedang, gunakan proteksi bila rute terbuka.")
        else:
            risks.append("UV tinggi.")

        if weather.humidity >= 90:
            risks.append("Kelembapan tinggi dapat membuat lari terasa lebih berat.")

        if weather.windGust > 35:
            risks.append("Hembusan angin cukup kuat.")
        elif weather.windSpeed < 15:
            reasons.append("Angin relatif ringan.")

        if finish_at > window_end:
            risks.append("Estimasi finish melewati rentang waktu yang dipilih.")

        return reasons[:4], risks[:4]

    def _build_recommendations(
        self,
        scored: List[CandidateScore],
    ) -> List[PlannerRecommendation]:
        recommendations: List[PlannerRecommendation] = []

        for index, item in enumerate(scored[:3]):
            recommendations.append(
                PlannerRecommendation(
                    startTime=item.start_at.strftime("%H:%M"),
                    finishTime=item.finish_at.strftime("%H:%M"),
                    score=item.score,
                    label="best" if index == 0 else "alternative",
                    weather=item.weather,
                    reasons=item.reasons,
                    risks=item.risks,
                )
            )

        return recommendations

    def _build_avoid_windows(self, scored: List[CandidateScore]) -> List[PlannerAvoidWindow]:
        by_time = sorted(scored, key=lambda item: item.start_at)
        avoid: List[PlannerAvoidWindow] = []
        current_group: List[CandidateScore] = []

        for item in by_time:
            if item.score < 50:
                current_group.append(item)
                continue

            self._append_avoid_window(avoid, current_group)
            current_group = []

        self._append_avoid_window(avoid, current_group)
        return avoid[:2]

    def _append_avoid_window(
        self,
        avoid: List[PlannerAvoidWindow],
        group: List[CandidateScore],
    ) -> None:
        if not group:
            return

        worst = min(group, key=lambda item: item.score)
        reason = worst.risks[0] if worst.risks else "Kondisi cuaca kurang nyaman."
        avoid.append(
            PlannerAvoidWindow(
                start=group[0].start_at.strftime("%H:%M"),
                end=(group[-1].start_at + timedelta(minutes=30)).strftime("%H:%M"),
                reason=reason,
                score=worst.score,
            )
        )

    def _build_summary(
        self,
        recommendations: List[PlannerRecommendation],
        priority: str,
    ) -> str:
        if not recommendations:
            return "Belum ada rekomendasi yang bisa dihitung dari data cuaca."

        best = recommendations[0]
        priority_note = {
            "balanced": "dengan pertimbangan suhu, hujan, angin, UV, dan durasi.",
            "avoid_heat": "karena relatif lebih aman dari panas dan UV tinggi.",
            "avoid_rain": "karena risiko hujannya relatif paling rendah.",
        }[priority]

        return (
            f"Waktu terbaik untuk rute ini adalah {best.startTime} "
            f"(finish sekitar {best.finishTime}) {priority_note}"
        )

    def _weather_code_severity(self, code: int) -> int:
        if code in {95, 96, 99}:
            return 5
        if code in {61, 63, 65, 66, 67, 80, 81, 82}:
            return 4
        if code in {51, 53, 55, 56, 57}:
            return 3
        if code in {45, 48}:
            return 2
        if code in {1, 2, 3}:
            return 1
        return 0
