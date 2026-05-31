#!/usr/bin/env pwsh
# Script untuk menjalankan GraphHopper dengan OSM data Surakarta

$ErrorActionPreference = "Stop"

Write-Host "=== Starting GraphHopper Server ===" -ForegroundColor Green

# Check if Java is installed
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Java not found. Please install Java 17 or higher." -ForegroundColor Red
    exit 1
}
$prevErrorPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$javaVersion = java -version 2>&1 | Select-Object -First 1
$ErrorActionPreference = $prevErrorPref
Write-Host "Java found: $javaVersion" -ForegroundColor Cyan

# Check if OSM data exists
$osmFile = "..\data\graphhopper\surakarta.osm.pbf"
if (-not (Test-Path $osmFile)) {
    Write-Host "ERROR: OSM file not found at $osmFile" -ForegroundColor Red
    exit 1
}

Write-Host "OSM file: $osmFile" -ForegroundColor Cyan

# Check if GraphHopper JAR exists
$jarFile = "graphhopper-web-11.0.jar"
if (-not (Test-Path $jarFile)) {
    Write-Host "ERROR: GraphHopper JAR not found. Downloading..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/11.0/graphhopper-web-11.0.jar" -OutFile $jarFile
    Write-Host "Download complete!" -ForegroundColor Green
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

Write-Host ""
Write-Host "Starting GraphHopper..." -ForegroundColor Green
Write-Host "OSM Data: $osmFile" -ForegroundColor Cyan
Write-Host "Config: config.yml" -ForegroundColor Cyan
Write-Host "Server will be available at: http://localhost:8989" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start GraphHopper
java -D"dw.graphhopper.datareader.file=$osmFile" `
     -Xmx2g -Xms1g `
     -jar $jarFile server config.yml
