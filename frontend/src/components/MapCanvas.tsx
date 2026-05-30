import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../stores/mapStore';
import { useRouteStore } from '../stores/routeStore';
import { useRouteCalculate } from '../hooks/useRouteCalculate';
import { RouteLayer } from './RouteLayer';
import { HydrationMarkerLayer } from './HydrationMarkerLayer';
import { SplitMarkerLayer } from './SplitMarkerLayer';
import type { Waypoint } from '../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MAP_STYLES = {
  streets: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
  satellite: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
  outdoor: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
};

// Overlay layers that should swallow map clicks (so clicking them never adds a waypoint).
const OVERLAY_LAYER_IDS = ['split-markers-dot', 'hydration-markers'];

const getMarkerMeta = (index: number, total: number) => {
  if (index === 0) {
    return { label: 'A', className: 'waypoint-marker--start' };
  }

  if (index === total - 1) {
    return { label: 'B', className: 'waypoint-marker--finish' };
  }

  return { label: String(index), className: 'waypoint-marker--middle' };
};

export default function MapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());


  const { center, zoom, style } = useMapStore();
  const initialView = useRef({ center, zoom, style });
  const { waypoints, addWaypoint, updateWaypoint, removeWaypoint, segments } = useRouteStore();

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  // Initialize route calculation hook
  useRouteCalculate();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: [MAP_STYLES[initialView.current.style]],
              tileSize: 512,
              attribution:
                '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
          },
          layers: [
            {
              id: 'simple-tiles',
              type: 'raster',
              source: 'raster-tiles',
              minzoom: 0,
              maxzoom: 22,
            },
          ],
        },
        center: initialView.current.center,
        zoom: initialView.current.zoom,
      });
      setMapInstance(map.current);

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setIsMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
      });

      // Click to add waypoint (skip if click landed on an overlay layer)
      map.current.on('click', (e) => {
        const presentLayers = OVERLAY_LAYER_IDS.filter((id) => map.current?.getLayer(id));
        if (presentLayers.length > 0) {
          const hits = map.current!.queryRenderedFeatures(e.point, { layers: presentLayers });
          if (hits.length > 0) return;
        }

        const newWaypoint: Waypoint = {
          id: `wp-${Date.now()}`,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        };
        addWaypoint(newWaypoint);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      map.current?.remove();
      map.current = null;
      setMapInstance(null);
    };
  }, [addWaypoint]);

  // Smoothly follow store-driven map movements, for example search result selection.
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    map.current.easeTo({
      center,
      zoom,
      duration: 650,
      essential: true,
    });
  }, [center, zoom, isMapLoaded]);

  // Update map style
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    try {
      const currentStyle = map.current.getStyle();
      if (currentStyle && currentStyle.sources['raster-tiles']) {
        const rasterSource = currentStyle.sources['raster-tiles'] as maplibregl.RasterSourceSpecification;
        const nextStyle = {
          ...currentStyle,
          sources: {
            ...currentStyle.sources,
            'raster-tiles': {
              ...rasterSource,
              tiles: [MAP_STYLES[style]],
            },
          },
        } as maplibregl.StyleSpecification;

        map.current.setStyle(nextStyle);
      }
    } catch (error) {
      console.error('Error updating map style:', error);
    }
  }, [style, isMapLoaded]);

  // Update markers when waypoints change
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Remove markers that no longer exist
    const currentWaypointIds = new Set(waypoints.map((wp) => wp.id));
    markers.current.forEach((marker, id) => {
      if (!currentWaypointIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });

    // Add or update markers
    waypoints.forEach((waypoint, index) => {
      let marker = markers.current.get(waypoint.id);

      if (!marker) {
        // Create marker element
        const el = document.createElement('div');
        el.className = 'waypoint-marker';
        
        const markerMeta = getMarkerMeta(index, waypoints.length);
        el.classList.add(markerMeta.className);

        el.innerHTML = `<span>${markerMeta.label}</span>`;

        // Create marker
        marker = new maplibregl.Marker({
          element: el,
          draggable: true,
        })
          .setLngLat([waypoint.lng, waypoint.lat])
          .addTo(map.current!);

        // Handle drag
        marker.on('dragend', () => {
          const lngLat = marker!.getLngLat();
          updateWaypoint(waypoint.id, lngLat.lat, lngLat.lng);
        });

        // Handle right-click to delete
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          removeWaypoint(waypoint.id);
        });

        markers.current.set(waypoint.id, marker);
      } else {
        // Update existing marker position
        marker.setLngLat([waypoint.lng, waypoint.lat]);
        
        const el = marker.getElement();
        el.classList.remove('waypoint-marker--start', 'waypoint-marker--middle', 'waypoint-marker--finish');
        const markerMeta = getMarkerMeta(index, waypoints.length);
        el.classList.add(markerMeta.className);
        el.querySelector('span')!.textContent = markerMeta.label;
      }
    });
  }, [waypoints, isMapLoaded, updateWaypoint, removeWaypoint]);

  // Draw straight lines between waypoints (only when no route segments)
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const sourceId = 'straight-line';
    const layerId = 'straight-line-layer';

    try {
      // Remove existing source and layer
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }

      // Only show straight lines if we have waypoints but no route segments yet
      if (waypoints.length >= 2 && segments.length === 0) {
        const coordinates = waypoints.map((wp) => [wp.lng, wp.lat]);

        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
          },
        });

        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#0050cb',
            'line-width': 4,
            'line-opacity': 0.72,
            'line-dasharray': [2, 2],
          },
        });
      }
    } catch (error) {
      console.error('Error drawing line:', error);
    }
  }, [waypoints, segments, isMapLoaded]);



  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-container-low">
          <div className="glass-panel rounded-full px-5 py-3 text-sm font-semibold text-on-surface-variant shadow-[0_16px_34px_rgba(23,27,41,0.12)]">
            Loading map...
          </div>
        </div>
      )}
      {/* Render route layer */}
      <RouteLayer map={mapInstance} />
      <SplitMarkerLayer map={mapInstance} />
      <HydrationMarkerLayer map={mapInstance} />
    </div>
  );
}
