# MeRute - Running Route Builder

Web application untuk membuat dan merencanakan rute running dengan visualisasi peta interaktif, profil elevasi, dan export ke GPX/TCX.

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Java 17+ (untuk GraphHopper)

### 1. Install Dependencies

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 2. Start GraphHopper
Windows Style
```bash
cd graphhopper
.\start-graphhopper.ps1
```

Lihat [GRAPHHOPPER_SETUP.md](GRAPHHOPPER_SETUP.md) untuk detail instalasi Java.

### 3. Start Backend

```bash
cd backend
python run.py
```

Backend akan berjalan di `http://localhost:8000`

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

## Tech Stack

### Frontend
- React 19 + TypeScript
- MapLibre GL JS (peta interaktif)
- Zustand (state management)
- Tailwind CSS (styling)
- Recharts (elevation chart)
- Axios (HTTP client)

### Backend
- FastAPI (Python web framework)
- Pydantic (data validation)
- httpx (async HTTP client)
- GraphHopper (routing engine)
- Open-Elevation API (elevation data)

### Infrastructure
- GraphHopper 11.0 (Java-based routing)
- OpenStreetMap data (Surakarta untuk development)

## API Endpoints

### Backend (`http://localhost:8000`)

- `GET /health` - Health check
- `POST /api/routes/calculate` - Calculate route from waypoints
- `POST /api/routes/elevation` - Get elevation profile
- `GET /docs` - Interactive API documentation

### GraphHopper (`http://localhost:8989`)

- `GET /health` - Health check
- `GET /route` - Routing API
- `GET /` - GraphHopper Maps UI


## Project Structure

```
MeRute/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── services/       # Business logic
│   │   └── schemas/        # Pydantic models
│   ├── .env                # Environment variables
│   └── run.py              # Server entry point
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── stores/         # Zustand stores
│   │   ├── services/       # API clients
│   │   └── utils/          # Utilities
│   └── package.json
├── graphhopper/            # GraphHopper routing engine
│   ├── config.yml          # GraphHopper config
│   └── start-graphhopper.ps1
├── data/
│   └── graphhopper/
│       └── surakarta.osm.pbf  # OSM data
├── PLAN.md                 # Implementation roadmap
└── docker-compose.yml      # Docker config (optional)
```

## License

[To be determined]

## Contact

[To be determined]
