# Backend MeRute - FastAPI
# PENTING: build context = ROOT proyek (lihat docker-compose*.yml),
# karena requirements.txt berada di root proyek.
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# System deps (gcc untuk build wheel tertentu, mis. psycopg2/shapely fallback)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps lebih dulu agar layer cache efisien
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy kode aplikasi backend (context root -> ambil folder backend/)
COPY backend/ ./

# Non-root user untuk keamanan
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8001

# Produksi: tanpa reload, worker dari env. Di-override oleh compose bila perlu.
ENV HOST=0.0.0.0 \
    PORT=8001 \
    RELOAD=false \
    WORKERS=2

CMD ["python", "run.py"]
