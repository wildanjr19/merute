# MeRute Backend

Backend API untuk MeRute - Running Route Builder

## Setup

### Prerequisites
- Python 3.10+
- Docker Desktop (untuk GraphHopper)
- Virtual environment sudah dibuat di root project

### Install Dependencies

```bash
# Dari root project
cd backend
pip install -r ../requirements.txt
```

### Environment Variables

File `.env` sudah ada di `backend/.env`:
```
GRAPHHOPPER_URL=http://localhost:8989
MAPBOX_TOKEN=
OPEN_ELEVATION_URL=https://api.open-elevation.com/api/v1/lookup
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Running the Server

### 1. Start GraphHopper (Required)

GraphHopper harus berjalan sebelum backend bisa menghitung rute.

```bash
# Dari root project
docker compose up -d
```

Tunggu hingga GraphHopper selesai memproses OSM data (~1-2 menit pertama kali).

Verifikasi GraphHopper berjalan:
```bash
curl http://localhost:8989/health
```

### 2. Start Backend Server

```bash
# Dari root project
cd backend
python run.py
```

Server akan berjalan di `http://localhost:8000`

## API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "services": {
    "backend": "ok",
    "graphhopper": "ok"
  }
}
```

### Calculate Route
```bash
POST /api/routes/calculate
Content-Type: application/json

{
  "waypoints": [
    {"lat": -7.5568, "lng": 110.8316},
    {"lat": -7.5600, "lng": 110.8350}
  ]
}
```

Response:
```json
{
  "segments": [
    {
      "polyline": {
        "type": "LineString",
        "coordinates": [[lng, lat], ...]
      },
      "distance": 1234.56,
      "duration": 123.45
    }
  ],
  "total_distance": 1234.56,
  "total_duration": 123.45
}
```

### Get Elevation Profile
```bash
POST /api/routes/elevation
Content-Type: application/json

{
  "polyline": {
    "type": "LineString",
    "coordinates": [[lng, lat], ...]
  }
}
```

Response:
```json
{
  "points": [
    {
      "lat": -7.5568,
      "lng": 110.8316,
      "elevation": 123.45,
      "distance": 0
    }
  ],
  "elevation_gain": 50.0,
  "elevation_loss": 30.0,
  "min_elevation": 100.0,
  "max_elevation": 150.0
}
```

## API Documentation

Interactive API docs tersedia di:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Architecture

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app & CORS config
│   ├── api/
│   │   ├── __init__.py
│   │   ├── health.py        # Health check endpoint
│   │   └── routes.py        # Route calculation & elevation endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── graphhopper.py   # GraphHopper API wrapper
│   │   └── elevation.py     # Open-Elevation API wrapper
│   └── schemas/
│       ├── __init__.py
│       └── route.py         # Pydantic models
├── .env
└── run.py                   # Server entry point
```

## Notes

- Backend ini **stateless** - tidak ada database untuk MVP
- GraphHopper menggunakan profile `foot` untuk routing (cocok untuk running)
- Elevation data dari Open-Elevation API (gratis, no API key)
- CORS sudah dikonfigurasi untuk frontend di port 5173 (Vite default)
