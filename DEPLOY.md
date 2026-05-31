# Deploy MeRute ke VPS (1Panel, single-domain)

Domain: merute.my.id (A record sudah menunjuk ke VPS).

Arsitektur:
- merute.my.id/        -> frontend statis (dist/), disajikan OpenResty 1Panel
- merute.my.id/api     -> backend FastAPI (127.0.0.1:8001)
- merute.my.id/health  -> backend (path TANPA prefix /api, wajib ikut di-proxy)
- graphhopper          -> internal container saja, tidak diekspos publik

## 1. Siapkan kode + data di VPS
- Clone/pull repo ke VPS.
- Upload file OSM ke: data/graphhopper/surakarta.osm.pbf
  (file *.osm.pbf di-gitignore, jadi tidak ikut git push - upload manual).
- Buat backend/.env (lihat backend/.env.example), set untuk produksi:
    GRAPHHOPPER_URL=http://graphhopper:8989
    CORS_ORIGINS=https://merute.my.id
    AI_FEATURE_ENABLED=false   # atau true + kredensial bila dipakai

## 2. Jalankan backend + graphhopper (Docker)
Dari root proyek di VPS:

    docker compose -f docker-compose.prod.yml up -d --build

- GraphHopper build graph pertama kali ~1-2 menit (lihat healthcheck).
- Backend hanya bind ke 127.0.0.1:8001 (tidak publik).
- Cek: curl http://127.0.0.1:8001/health  -> status healthy, graphhopper ok.

## 3. Build frontend
Build bisa di lokal lalu upload dist/, atau di VPS:

    cd frontend
    npm ci
    npm run build

VITE_API_URL dibiarkan kosong (same-origin). Pastikan VITE_MAPBOX_TOKEN terisi.
Hasil ada di frontend/dist/.

## 4. Buat Website di 1Panel + reverse proxy
1Panel > Websites > Create Website:
- Domain: merute.my.id
- Tipe: Static (atau Runtime/Reverse proxy), arahkan web root ke isi frontend/dist/.

Tambahkan konfigurasi proxy (OpenResty) untuk meneruskan API ke backend.
Edit config website, di dalam server { ... } tambahkan:

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /health {
        proxy_pass http://127.0.0.1:8001/health;
        proxy_set_header Host $host;
    }

    # SPA fallback: refresh di route React tidak 404
    location / {
        try_files $uri $uri/ /index.html;
    }

CATATAN PENTING: frontend memanggil /health TANPA prefix /api
(lihat frontend/src/services/api.ts). Kalau hanya /api yang di-proxy,
health check di UI akan gagal. Pastikan kedua lokasi di atas ada.

## 5. SSL (HTTPS)
1Panel > Websites > pilih merute.my.id > HTTPS:
- Terbitkan sertifikat Let's Encrypt (ACME).
- Aktifkan "Force HTTPS" (redirect HTTP -> HTTPS).
- 1Panel memperpanjang sertifikat otomatis.

## 6. Amankan Mapbox token
Token pk.* terlihat publik di bundle browser (normal untuk token public).
Di dashboard Mapbox, tambahkan URL restriction: hanya https://merute.my.id/*
agar kuota tidak dipakai domain lain.

## 7. Verifikasi live
- https://merute.my.id            -> peta muncul (Mapbox tiles tampil)
- https://merute.my.id/health     -> JSON status healthy, graphhopper ok
- Gambar rute beberapa titik      -> garis snap ke jalan (backend->GraphHopper)
- Export GPX                      -> berhasil (client-side)

## Update berikutnya
- Backend/GraphHopper: git pull, lalu
    docker compose -f docker-compose.prod.yml up -d --build
- Frontend: npm run build, upload ulang isi dist/ ke web root 1Panel.

## Tes lokal sebelum push (VS Code)
Alur lokal tetap sama, tidak berubah:
1. GraphHopper:  cd graphhopper ; .\start-graphhopper.ps1
2. Backend:      cd backend ; python run.py     (reload aktif, port 8001)
3. Frontend:     cd frontend ; npm run dev      (buka http://localhost:5173)

Vite dev proxy meneruskan /api dan /health ke http://localhost:8001
(atur via VITE_DEV_API_PROXY di frontend/.env bila port beda).
Untuk uji hasil build produksi secara lokal: npm run build ; npm run preview
