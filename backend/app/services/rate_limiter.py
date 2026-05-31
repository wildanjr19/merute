"""
Rate limiter sederhana in-memory untuk endpoint AI.
Membatasi jumlah request per IP dalam window waktu tertentu.
"""

import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException


class RateLimiter:
    """Simple in-memory rate limiter per IP."""

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, list] = {}

    def check(self, request: Request) -> None:
        """Raise HTTPException jika rate limit terlampaui."""
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        if client_ip not in self._requests:
            self._requests[client_ip] = []

        # Hapus request lama di luar window
        self._requests[client_ip] = [
            t for t in self._requests[client_ip]
            if now - t < self.window_seconds
        ]

        if len(self._requests[client_ip]) >= self.max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit: maksimal {self.max_requests} request per {self.window_seconds} detik. Coba lagi nanti."
            )

        self._requests[client_ip].append(now)

    def cleanup(self) -> None:
        """Bersihkan entry lama untuk mencegah memory leak."""
        now = time.time()
        expired_ips = [
            ip for ip, times in self._requests.items()
            if all(now - t >= self.window_seconds for t in times)
        ]
        for ip in expired_ips:
            del self._requests[ip]


# Instance global: 10 request per menit per IP
ai_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)
