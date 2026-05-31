# GraphHopper Setup untuk MeRute

Folder ini berisi GraphHopper routing engine untuk menghitung rute running.

## Files

- `graphhopper-web-11.0.jar` - GraphHopper server JAR (versi 11.0)
- `config.yml` - Konfigurasi GraphHopper
- `start-graphhopper.ps1` - Script untuk menjalankan GraphHopper
- `graph-cache/` - Cache graph hasil processing OSM data (dibuat otomatis)
- `logs/` - Log files (dibuat otomatis)

## Cara Menjalankan

### Opsi 1: Menggunakan Script (Recommended)

```powershell
cd graphhopper
.\start-graphhopper.ps1
```

### Opsi 2: Manual

```powershell
cd graphhopper
java -D"dw.graphhopper.datareader.file=..\data\graphhopper\surakarta.osm.pbf" -Xmx2g -Xms1g -jar graphhopper-web-11.0.jar server config.yml
```

## Konfigurasi

### Profiles yang Aktif

- `car` - Routing untuk mobil
- `foot` - Routing untuk pejalan kaki / running (yang kita gunakan)

### Encoded Values

- `car_access`, `car_average_speed`
- `foot_access`, `foot_average_speed`
- `road_access`

### Server Settings

- Port: `8989`
- Bind: `0.0.0.0` (accessible dari Docker dan localhost)
- Admin Port: `8990`

## Endpoints

- `http://localhost:8989/` - GraphHopper Maps UI
- `http://localhost:8989/route` - Routing API
- `http://localhost:8989/health` - Health check
- `http://localhost:8989/info` - Server info

## First Run

Pada run pertama, GraphHopper akan memproses OSM data dan membuat graph cache. Ini memakan waktu ~1-2 menit untuk data Surakarta (~50MB).

Setelah selesai, Anda akan melihat log:
```
INFO  [main] com.graphhopper.http.GraphHopperApplication - Started GraphHopperApplication
```

Graph cache akan disimpan di folder `graph-cache/` dan akan digunakan untuk run berikutnya (lebih cepat).

## Memory Usage

- Minimum: 1GB (`-Xms1g`)
- Maximum: 2GB (`-Xmx2g`)

Untuk OSM data yang lebih besar (misalnya seluruh Jawa), tingkatkan memory:
```
-Xmx4g -Xms2g
```

## Troubleshooting

### Port 8989 sudah digunakan

```powershell
# Cek process yang menggunakan port 8989
Get-NetTCPConnection -LocalPort 8989 -ErrorAction SilentlyContinue

# Stop process jika ada
Stop-Process -Id <PID>
```

### Out of Memory Error

Tingkatkan memory allocation di script atau command:
```
-Xmx4g -Xms2g
```

### Graph cache corrupt

Hapus folder `graph-cache/` dan jalankan ulang:
```powershell
Remove-Item -Recurse -Force graph-cache
.\start-graphhopper.ps1
```

## Notes

- GraphHopper menggunakan profile `foot` untuk routing running
- Data OSM: `data/graphhopper/surakarta.osm.pbf`
- Config sudah disesuaikan untuk development lokal
- Bind host `0.0.0.0` agar bisa diakses dari Docker container backend
