"""
AI Service untuk MeRute.
Menghubungkan ke OpenAI API untuk enhance hydration suggestions dan generate route text.
Fallback ke rules jika AI gagal.
"""

import json
import hashlib
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI
from app.config.ai import ai_config


class AIService:
    """Service untuk interaksi dengan OpenAI API."""

    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None
        self._cache: Dict[str, Any] = {}

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(
                base_url=ai_config.base_url,
                api_key=ai_config.api_key,
                timeout=float(ai_config.timeout)
            )
        return self._client

    def _cache_key(self, prefix: str, data: Dict) -> str:
        raw = json.dumps(data, sort_keys=True)
        return f"{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"

    async def enhance_hydration(
        self,
        route_summary: Dict[str, Any],
        rules_result: Dict[str, Any],
        preferences: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Enhance hydration suggestions menggunakan AI.
        Menerima hasil rules sebagai kandidat, AI merapikan alasan dan summary.

        Returns:
            Enhanced result atau None jika gagal
        """
        cache_key = self._cache_key("hydration", {
            "summary": route_summary,
            "rules": rules_result,
            "prefs": preferences
        })

        if cache_key in self._cache:
            return self._cache[cache_key]

        system_prompt = """Kamu adalah asisten untuk pelari yang membantu merekomendasikan titik hidrasi.
Kamu menerima data rute dan kandidat titik hidrasi dari rules engine.
Tugasmu:
1. Perbaiki alasan (reason) setiap titik agar lebih natural dan informatif untuk runner.
2. Buat summary yang ringkas dan berguna.
3. Jangan mengarang lokasi fasilitas (toko, toilet, dll) kecuali data POI disediakan.
4. Jangan memberi saran medis spesifik tentang jumlah cairan.
5. Jika elevasi berstatus "degraded", jangan menyebut tanjakan/turunan dalam alasan.

Kembalikan JSON dengan format:
{
  "summary": "string ringkasan",
  "points": [{"label": "WS 1", "reason": "alasan baru", "priority": "low|medium|high", "notes": "catatan opsional"}]
}
Hanya kembalikan JSON, tanpa teks lain."""

        user_content = json.dumps({
            "routeSummary": {
                "totalDistanceKm": route_summary.get("totalDistanceKm"),
                "elevationStatus": route_summary.get("elevationStatus"),
                "elevationFeatures": route_summary.get("elevationFeatures"),
                "kmPoints": route_summary.get("kmPoints", [])[:15]
            },
            "candidates": [
                {"label": p["label"], "distanceKm": p["distanceKm"], "reason": p["reason"], "priority": p["priority"]}
                for p in rules_result.get("points", [])
            ],
            "preferences": preferences
        }, ensure_ascii=False)

        try:
            response = await self.client.chat.completions.create(
                model=ai_config.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.4,
                max_tokens=1000
            )

            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

            result = json.loads(content)
            self._cache[cache_key] = result
            return result

        except Exception:
            return None

    async def generate_route_text(
        self,
        route_summary: Dict[str, Any],
        instructions: List[Dict[str, Any]],
        options: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Generate cue sheet / route text menggunakan AI.

        Returns:
            Dict dengan title, summary, steps, downloadText atau None jika gagal
        """
        cache_key = self._cache_key("routetext", {
            "summary": route_summary,
            "instructions": instructions[:30],
            "options": options
        })

        if cache_key in self._cache:
            return self._cache[cache_key]

        language = options.get("language", "id")
        fmt = options.get("format", "cue_sheet")
        pace = options.get("paceSecondsPerKm", 360)

        lang_instruction = "Tulis dalam Bahasa Indonesia." if language == "id" else "Write in English."

        system_prompt = f"""Kamu adalah asisten yang membuat panduan rute lari dalam bentuk teks.
{lang_instruction}
Format: {"cue sheet ringkas per langkah" if fmt == "cue_sheet" else "narasi mengalir"}.
Pace user: {pace // 60}:{pace % 60:02d}/km.

Aturan:
1. Gunakan instruksi arah dari data yang diberikan. Jangan mengarang nama jalan yang tidak ada di data.
2. Sertakan jarak kumulatif di setiap langkah.
3. Sebutkan perubahan elevasi signifikan jika data tersedia.
4. Buat ringkasan di awal.
5. Jika elevasi berstatus "degraded", jangan menyebut tanjakan/turunan.

Kembalikan JSON:
{{
  "title": "MeRute Cue Sheet",
  "summary": "ringkasan rute",
  "steps": [{{"distanceKm": 0.0, "text": "instruksi"}}],
  "downloadText": "teks lengkap siap download"
}}
Hanya kembalikan JSON."""

        user_content = json.dumps({
            "routeSummary": {
                "totalDistanceKm": route_summary.get("totalDistanceKm"),
                "elevationStatus": route_summary.get("elevationStatus"),
                "elevationFeatures": route_summary.get("elevationFeatures"),
            },
            "instructions": instructions[:30],
            "options": options
        }, ensure_ascii=False)

        try:
            response = await self.client.chat.completions.create(
                model=ai_config.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.5,
                max_tokens=2000
            )

            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

            result = json.loads(content)
            self._cache[cache_key] = result
            return result

        except Exception:
            return None
