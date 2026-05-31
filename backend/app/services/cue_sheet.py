"""
Cue Sheet Builder untuk MeRute.

Membangun panduan rute turn-by-turn secara deterministik langsung dari
instruksi GraphHopper (nama jalan + arah belok + jarak). Tidak bergantung
pada AI, sehingga akurat, gratis, dan instan. AI hanya dipakai opsional
untuk merapikan ringkasan/narasi.
"""

from typing import Dict, Any, List


# Pemetaan GraphHopper "sign" -> frasa arah (fallback bila text kosong).
# Referensi sign GraphHopper: negatif = kiri, positif = kanan.
_SIGN_TEXT = {
    "id": {
        -98: "Putar balik",
        -8: "Putar balik",
        -7: "Tetap di kiri",
        -3: "Belok tajam kiri",
        -2: "Belok kiri",
        -1: "Serong kiri",
        0: "Lurus",
        1: "Serong kanan",
        2: "Belok kanan",
        3: "Belok tajam kanan",
        4: "Tiba di tujuan",
        5: "Lewati titik",
        6: "Masuk bundaran",
        7: "Tetap di kanan",
        8: "Putar balik",
    },
    "en": {
        -98: "Make a U-turn",
        -8: "Make a U-turn",
        -7: "Keep left",
        -3: "Turn sharp left",
        -2: "Turn left",
        -1: "Turn slight left",
        0: "Continue straight",
        1: "Turn slight right",
        2: "Turn right",
        3: "Turn sharp right",
        4: "Arrive at destination",
        5: "Pass waypoint",
        6: "Enter roundabout",
        7: "Keep right",
        8: "Make a U-turn",
    },
}

_LABELS = {
    "id": {
        "title": "MeRute Cue Sheet",
        "start": "Mulai dari titik start",
        "finish": "Finish. Selamat",
        "continue_for": "lalu lanjut",
        "total": "Total jarak",
        "est_time": "Estimasi waktu",
        "pace": "pada pace",
        "hour": "jam",
        "minute": "menit",
        "onto": "ke",
    },
    "en": {
        "title": "MeRute Cue Sheet",
        "start": "Start at the starting point",
        "finish": "Finish. Well done",
        "continue_for": "then continue",
        "total": "Total distance",
        "est_time": "Estimated time",
        "pace": "at pace",
        "hour": "h",
        "minute": "min",
        "onto": "onto",
    },
}


class CueSheetBuilder:
    """Membangun cue sheet deterministik dari instruksi GraphHopper."""

    def build(
        self,
        instructions: List[Dict[str, Any]],
        route_summary: Dict[str, Any],
        options: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Bangun cue sheet dari instruksi turn-by-turn.

        Returns:
            Dict {title, summary, steps, downloadText}.
            steps: List[{distanceKm, text}].
        """
        language = options.get("language", "id")
        labels = _LABELS.get(language, _LABELS["id"])
        distance_km = route_summary.get("totalDistanceKm", 0)

        steps = self._build_steps(instructions, language, labels)
        summary = self._build_summary(distance_km, options, labels)
        download_text = self._build_download_text(steps, summary, labels)

        return {
            "title": labels["title"],
            "summary": summary,
            "steps": steps,
            "downloadText": download_text,
        }

    def _build_steps(
        self,
        instructions: List[Dict[str, Any]],
        language: str,
        labels: Dict[str, str],
    ) -> List[Dict[str, Any]]:
        """Konversi tiap instruksi menjadi langkah cue sheet."""
        steps: List[Dict[str, Any]] = []
        sign_map = _SIGN_TEXT.get(language, _SIGN_TEXT["id"])

        for instr in instructions:
            cumulative_m = instr.get("cumulativeDistance", 0) or 0
            cum_km = round(cumulative_m / 1000, 2)

            text = (instr.get("text") or "").strip()
            if not text:
                # Fallback: susun dari sign bila GraphHopper tidak memberi teks.
                text = sign_map.get(int(instr.get("sign", 0) or 0), sign_map[0])

            # Tambahkan jarak leg agar mirip panduan voice ("lalu lanjut 400 m").
            leg_m = instr.get("distance", 0) or 0
            sign = int(instr.get("sign", 0) or 0)
            if leg_m >= 1 and sign not in (4, 5):
                text = f"{text}, {labels['continue_for']} {self._format_distance(leg_m)}"

            steps.append({"distanceKm": cum_km, "text": text})

        return steps

    def _build_summary(
        self,
        distance_km: float,
        options: Dict[str, Any],
        labels: Dict[str, str],
    ) -> str:
        """Ringkasan jarak + estimasi waktu."""
        pace = options.get("paceSecondsPerKm", 360)
        pace_min = pace // 60
        pace_sec = pace % 60
        time_str = self._format_duration(int(distance_km * pace), labels)

        return (
            f"{labels['total']}: {distance_km} km. "
            f"{labels['est_time']}: {time_str} {labels['pace']} {pace_min}:{pace_sec:02d}/km."
        )

    def _build_download_text(
        self,
        steps: List[Dict[str, Any]],
        summary: str,
        labels: Dict[str, str],
    ) -> str:
        """Teks lengkap siap diunduh sebagai .txt."""
        lines = [labels["title"], "", summary, ""]
        for step in steps:
            lines.append(f"  KM {step['distanceKm']:.1f}: {step['text']}")
        return "\n".join(lines)

    @staticmethod
    def _format_distance(meters: float) -> str:
        """Format jarak: >= 1 km tampil km, selain itu meter (kelipatan 10)."""
        if meters >= 1000:
            return f"{round(meters / 1000, 1)} km"
        return f"{int(round(meters / 10.0) * 10)} m"

    @staticmethod
    def _format_duration(total_seconds: int, labels: Dict[str, str]) -> str:
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        if hours > 0:
            return f"{hours} {labels['hour']} {minutes} {labels['minute']}"
        return f"{minutes} {labels['minute']}"
