import { useEffect } from 'react';
import { useRouteStore } from '../stores/routeStore';
import type { Map } from 'maplibre-gl';

interface RouteLayerProps {
  map: Map | null;
}

/**
 * Komponen untuk render polyline hasil routing dari GraphHopper
 * Menggunakan GeoJSON source dan line layer dengan styling
 */
export const RouteLayer: React.FC<RouteLayerProps> = ({ map }) => {
  const { segments } = useRouteStore();

  useEffect(() => {
    if (!map) return;

    const SOURCE_ID = 'route-source';
    const LAYER_ID = 'route-layer';
    const OUTLINE_LAYER_ID = 'route-outline-layer';

    const initializeLayers = () => {
      if (!map || !map.isStyleLoaded()) return;

      // Remove existing layers and source if they exist
      try {
        if (map.getLayer(LAYER_ID)) {
          map.removeLayer(LAYER_ID);
        }
        if (map.getLayer(OUTLINE_LAYER_ID)) {
          map.removeLayer(OUTLINE_LAYER_ID);
        }
        if (map.getSource(SOURCE_ID)) {
          map.removeSource(SOURCE_ID);
        }
      } catch (error) {
        console.error('Error removing existing layers:', error);
      }

      // Only add layers if we have segments
      if (segments.length === 0) return;

      try {
        // Create GeoJSON from segments
        const features = segments.map((segment) => ({
          type: 'Feature' as const,
          properties: {
            distance: segment.distance,
          },
          geometry: segment.polyline,
        }));

        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features,
        };

        // Add source
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
        });

        // Add outline layer (wider, darker) - Design System
        map.addLayer({
          id: OUTLINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#003b9a', // primary color
            'line-width': 7,
            'line-opacity': 0.4,
          },
        });

        // Add main route layer (thinner, brighter) - Design System
        map.addLayer({
          id: LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#0050cb', // primary-container color
            'line-width': 4.5,
            'line-opacity': 1,
          },
        });
      } catch (error) {
        console.error('Error adding route layers:', error);
      }
    };

    // Wait for map to be fully loaded
    if (!map.isStyleLoaded()) {
      const onStyleLoad = () => {
        initializeLayers();
      };
      map.once('styledata', onStyleLoad);
      return () => {
        map.off('styledata', onStyleLoad);
      };
    } else {
      initializeLayers();
    }

    // Cleanup on unmount
    return () => {
      if (!map || !map.getStyle()) return;
      try {
        if (map.getLayer(LAYER_ID)) {
          map.removeLayer(LAYER_ID);
        }
        if (map.getLayer(OUTLINE_LAYER_ID)) {
          map.removeLayer(OUTLINE_LAYER_ID);
        }
        if (map.getSource(SOURCE_ID)) {
          map.removeSource(SOURCE_ID);
        }
      } catch (error) {
        console.error('Error cleaning up route layers:', error);
      }
    };
  }, [map, segments]);

  return null; // This component doesn't render anything directly
};
