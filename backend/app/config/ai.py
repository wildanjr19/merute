"""
Konfigurasi AI untuk MeRute.
Membaca env variables dan menyediakan settings terpusat.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class AIConfig:
    """Konfigurasi terpusat untuk fitur AI"""

    enabled: bool = os.getenv("AI_FEATURE_ENABLED", "false").lower() == "true"
    base_url: str = os.getenv("OPENAI_BASE_URL", "")
    api_key: str = os.getenv("OPENAI_API_KEY", "")
    model: str = os.getenv("OPENAI_MODEL", "gpt-5.5")
    timeout: int = int(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "20"))
    max_route_points: int = int(os.getenv("AI_MAX_ROUTE_POINTS", "120"))

    @classmethod
    def is_available(cls) -> bool:
        """Cek apakah fitur AI bisa dipakai (enabled + credentials ada)"""
        return cls.enabled and bool(cls.base_url) and bool(cls.api_key)


ai_config = AIConfig()
