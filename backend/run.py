import os
import uvicorn

if __name__ == "__main__":
    # Konfigurasi via env agar file yang sama dipakai untuk lokal & produksi.
    # Default mengikuti pengembangan lokal (reload aktif, 1 worker).
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    workers = int(os.getenv("WORKERS", "1"))
    log_level = os.getenv("LOG_LEVEL", "info")

    # uvicorn melarang workers > 1 bersamaan dengan reload.
    if reload:
        workers = 1

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        workers=workers,
        log_level=log_level,
    )
