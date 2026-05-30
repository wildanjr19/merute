import { useEffect } from 'react';
import { useAIStore } from '../stores/aiStore';
import type { Map as MaplibreMap } from 'maplibre-gl';

interface HydrationMarkerLayerProps {
  map: MaplibreMap | null;
}

export function HydrationMarkerLayer({ map }: HydrationMarkerLayerProps) {
  const { hydrationSuggestions } = useAIStore();

  useEffect(() => {
    if (!map) return;

    const sourceId = 'hydration-points';
    const layerId = 'hydration-markers';
    const labelLayerId = 'hydration-labels';

    // Cleanup existing
    if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    if (hydrationSuggestions.length === 0) return;

    // Add source
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: hydrationSuggestions.map((point) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat],
        },
        properties: {
          label: point.label,
          priority: point.priority,
          reason: point.reason,
          distanceKm: point.distanceKm,
        },
      })),
    };

    map.addSource(sourceId, { type: 'geojson', data: geojson });

    // Circle marker layer
    map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'match',
          ['get', 'priority'],
          'high', '#dc2626',
          'medium', '#2563eb',
          'low', '#6b7280',
          '#2563eb',
        ],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Label layer
    map.addLayer({
      id: labelLayerId,
      type: 'symbol',
      source: sourceId,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 10,
        'text-offset': [0, -1.8],
        'text-anchor': 'bottom',
        'text-font': ['Open Sans Bold'],
      },
      paint: {
        'text-color': '#1e3a5f',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });

    return () => {
      if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, hydrationSuggestions]);

  return null;
}
