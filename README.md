<div align="center">

# MeRute

### Running Route Builder untuk Pelari Modern

Rancang rute lari sendiri di atas peta interaktif, lihat jarak dan profil elevasi secara real-time, lalu export ke GPX/TCX yang kompatibel dengan Strava, Garmin, dan Wahoo.

[Fitur](#fitur-unggulan) · [Quick Start](#quick-start) · [Arsitektur](#arsitektur) · [API](#api-reference) · [Struktur Proyek](#struktur-proyek)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![MapLibre](https://img.shields.io/badge/MapLibre-GL_JS-396CB2?logo=maplibre&logoColor=white)
![GraphHopper](https://img.shields.io/badge/GraphHopper-11.0-2B6CB0)
</div>

---

## Daftar Isi

- [MeRute](#merute)
    - [Running Route Builder untuk Pelari Modern](#running-route-builder-untuk-pelari-modern)
  - [Daftar Isi](#daftar-isi)
  - [Tentang Proyek](#tentang-proyek)
  - [Fitur Unggulan](#fitur-unggulan)
  - [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [1. Install Dependencies](#1-install-dependencies)
    - [2. Start GraphHopper](#2-start-graphhopper)
    - [3. Start Backend](#3-start-backend)
    - [4. Start Frontend](#4-start-frontend)
  - [Tech Stack](#tech-stack)
    - [Frontend](#frontend)
    - [Backend](#backend)
    - [Data \& Infrastruktur](#data--infrastruktur)
  - [Arsitektur](#arsitektur)
  - [API Reference](#api-reference)
    - [Backend (`http://localhost:8000`)](#backend-httplocalhost8000)
    - [GraphHopper (`http://localhost:8989`)](#graphhopper-httplocalhost8989)
  - [Konfigurasi AI (Opsional)](#konfigurasi-ai-opsional)
  - [Struktur Proyek](#struktur-proyek)
  - [Lisensi \& Kontak](#lisensi--kontak)

---

## Tentang Proyek

Pelari sering kesulitan merencanakan rute baru, terutama di area asing. Tool yang ada terkunci di balik paywall atau punya UX yang ketinggalan zaman. **MeRute** hadir sebagai platform yang *runner-first*, gratis, dan modern.

User cukup mengeklik titik di peta. Rute otomatis *snap* ke jalan nyata lewat routing engine, jarak dan elevasi terhitung seketika, dan hasilnya bisa langsung diunduh ke perangkat GPS.

> **Cakupan Area**: Saat ini MeRute baru mendukung wilayah **Surakarta Raya** (Solo dan sekitarnya), karena data routing GraphHopper masih terbatas pada area tersebut. Dukungan wilayah lain akan ditambahkan seiring perkembangan proyek.

---

## Fitur Unggulan

| | Fitur | Deskripsi |
|---|---|---|
| 🗺️ | **Route Drawing** | Gambar rute point-to-point. Titik otomatis snap ke jalan OSM via GraphHopper, bisa di-drag dan dihapus. |
| 📏 | **Info Real-Time** | Total jarak, estimasi waktu berdasarkan pace, dan jumlah waypoint terupdate setiap titik ditambah. |
| ⛰️ | **Profil Elevasi** | Grafik elevasi interaktif (Recharts) sepanjang rute, lengkap dengan total elevation gain & loss. |
| 💾 | **Export GPX / TCX** | Unduh rute langsung dari browser dalam format standar yang kompatibel Strava, Garmin, dan Wahoo. |
| 🔍 | **Pencarian Lokasi** | Cari dan lompat ke lokasi mana pun lewat search bar terintegrasi. |
| 💧 | **AI Hydration Points** | Rekomendasi titik hidrasi sepanjang rute (hybrid: rules baseline + AI enhancement). |
| 📝 | **AI Cue Sheet** | Panduan teks natural per segmen rute, dibuat otomatis dengan fallback template. |
| ⌨️ | **Keyboard Shortcuts** | Undo, redo, dan aksi cepat lain untuk alur kerja yang mulus. |

---

## Quick Start

### Prerequisites

| Tool | Versi | Keterangan |
|---|---|---|
| Python | 3.10+ | Backend FastAPI |
| Node.js | 18+ | Frontend React |
| Java | 17+ | Routing engine GraphHopper |

### 1. Install Dependencies

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 2. Start GraphHopper

```powershell
cd graphhopper
.\start-graphhopper.ps1
```

> Routing engine berjalan di `http://localhost:8989`. Lihat [GRAPHHOPPER_SETUP.md](GRAPHHOPPER_SETUP.md) untuk detail instalasi Java.

### 3. Start Backend

```bash
cd backend
python run.py
```

> API berjalan di `http://localhost:8000` — dokumentasi interaktif di `http://localhost:8000/docs`.

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

> Aplikasi terbuka di `http://localhost:5173`.

Jalankan ketiga service secara paralel (masing-masing di terminal terpisah), lalu buka frontend di browser.

## Tech Stack

### Frontend
- **React 19 + TypeScript** — UI dan type safety
- **MapLibre GL JS** — peta interaktif (visual tiles Mapbox)
- **Zustand** — state management ringan
- **Tailwind CSS** — styling utility-first
- **Recharts** — grafik profil elevasi
- **Turf.js** — kalkulasi geospasial
- **xmlbuilder2** — generator GPX/TCX di sisi klien
- **Axios** — HTTP client

### Backend
- **FastAPI** — web framework Python async
- **Pydantic** — validasi data dan skema
- **httpx** — async HTTP client ke layanan eksternal
- **GraphHopper** — routing engine (snap-to-road)
- **Open-Elevation API** — data elevasi

### Data & Infrastruktur
- **GraphHopper 11.0** — routing berbasis Java
- **OpenStreetMap** — data peta (Surakarta untuk development)
- **Docker Compose** — orkestrasi opsional

---

## Arsitektur

Alur utama saat user menggambar rute:

```
User klik titik di peta (MapLibre)
   │  koordinat (lat, lng)
   ▼
FastAPI  ──►  GraphHopper  ──►  snap ke jalan OSM
   │                              │
   │  ◄── polyline + jarak segmen ┘
   ▼
MapLibre render garis  ──►  total jarak terakumulasi di UI
   │
   └──►  Elevasi di-fetch paralel (Open-Elevation) ──► update grafik
```

Export GPX/TCX dilakukan di sisi klien dari polyline yang sudah dihitung, sehingga unduhan instan tanpa round-trip ke server.

---

## API Reference

### Backend (`http://localhost:8000`)

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/health` | Health check backend + status GraphHopper |
| `POST` | `/api/routes/calculate` | Hitung rute snap-to-road dari daftar waypoint |
| `POST` | `/api/routes/elevation` | Ambil profil elevasi dari polyline |
| `POST` | `/api/ai/hydration-suggestions` | Rekomendasi titik hidrasi (hybrid rules + AI) |
| `POST` | `/api/ai/route-text` | Generate cue sheet / panduan teks rute |
| `GET` | `/docs` | Dokumentasi API interaktif (Swagger UI) |

> Endpoint `/api/ai/*` hanya aktif bila fitur AI diaktifkan. Lihat [Konfigurasi AI](#konfigurasi-ai-opsional).

### GraphHopper (`http://localhost:8989`)

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/health` | Health check routing engine |
| `GET` | `/route` | Routing API |
| `GET` | `/` | GraphHopper Maps UI |

---

## Konfigurasi AI (Opsional)

Fitur AI (rekomendasi hidrasi & cue sheet) dimatikan secara default. Untuk mengaktifkannya, set environment variable di `backend/.env`:

```env
AI_FEATURE_ENABLED=true
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
AI_REQUEST_TIMEOUT_SECONDS=20
AI_MAX_ROUTE_POINTS=120
```

Tanpa kredensial yang valid, endpoint AI tetap berfungsi memakai *rules baseline* dan *template fallback*, sehingga aplikasi tetap berjalan penuh tanpa AI.

---

## Struktur Proyek

```
MeRute/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/                # Endpoint: health, routes, ai
│   │   ├── services/           # GraphHopper, elevation, AI, rate limiter
│   │   ├── schemas/            # Pydantic models
│   │   └── config/             # Konfigurasi AI
│   ├── tests/                  # Unit test backend
│   └── run.py                  # Entry point server
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # Map, panel rute, elevasi, AI, dll
│   │   ├── stores/             # Zustand stores
│   │   ├── services/           # API client
│   │   ├── hooks/              # Custom hooks
│   │   └── utils/              # Utilities (elevation, markers)
│   └── package.json
├── graphhopper/                # Routing engine
│   ├── config.yml
│   └── start-graphhopper.ps1
├── data/graphhopper/           # OSM data (surakarta.osm.pbf)
└── docker-compose.yml          # Konfigurasi Docker (opsional)
```

---

## Lisensi & Kontak

- **Lisensi**: Belum ditentukan
- **Kontak**: Belum ditentukan

<div align="center">

Dibuat untuk para pelari. Selamat berlari!

</div>
