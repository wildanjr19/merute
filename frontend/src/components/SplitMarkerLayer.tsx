import { useEffect, useMemo } from 'react';
import maplibregl, { type Map as MaplibreMap } from 'maplibre-gl';
import { useRouteStore } from '../stores/routeStore';
import { useSplitMarkerStore } from '../stores/splitMarkerStore';
import { buildSplitMarkers, formatSplitLabel } from '../utils/splitMarkers';

interface SplitMarkerLayerProps {
  map: MaplibreMap | null;
}

const SOURCE_ID = 'split-markers-source';
const DOT_LAYER_ID = 'split-markers-dot';
const LABEL_LAYER_ID = 'split-markers-label';

/**
 * Renders evenly spaced distance markers along the calculated route.
 * Dot is always visible; label progressively reveals at higher zoom levels.
 * Hover a marker to preview the split's distance and estimated time.
 */
export function SplitMarkerLayer({ map }: SplitMarkerLayerProps) {
  const { segments, totalDistance, paceMinPerKm } = useRouteStore();
  const { enabled, unit, interval } = useSplitMarkerStore();

  const polyline = useMemo(() => {
    if (segments.length === 0) return null;
    if (segments.length === 1) return segments[0].polyline;

    // Merge multiple segments into one continuous LineString for marker calc
    const coordinates = segments.flatMap((seg, idx) =>
      idx === 0 ? seg.polyline.coordinates : seg.polyline.coordinates.slice(1)
    );
    return { type: 'LineString' as const, coordinates };
  }, [segments]);

  const markers = useMemo(() => {
    if (!enabled) return [];
    return buildSplitMarkers({
      polyline,
      totalDistance,
      unit,
      interval,
      paceMinPerKm,
    });
  }, [enabled, polyline, totalDistance, unit, interval, paceMinPerKm]);

  useEffect(() => {
    if (!map) return;

    let popup: maplibregl.Popup | null = null;

    const cleanup = () => {
      if (popup) {
        popup.remove();
        popup = null;
      }
      try {
        if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
        if (map.getLayer(DOT_LAYER_ID)) map.removeLayer(DOT_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // map may be torn down; ignore
      }
    };

    const render = () => {
      if (!map.isStyleLoaded()) return;
      cleanup();

      if (markers.length === 0) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: markers.map((m) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
          properties: {
            index: m.index,
            label: formatSplitLabel(m),
            estimatedTime: m.estimatedTime,
          },
        })),
      };

      try {
        map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });

        // Outer dot: white halo + bright core for contrast on any basemap
        map.addLayer({
          id: DOT_LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 3,
              14, 4.5,
              17, 6,
            ],
            'circle-color': '#0050cb',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        // Label: hidden at low zoom, fades in around zoom 13
        map.addLayer({
          id: LABEL_LAYER_ID,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 0,
              13, 10,
              16, 12,
            ],
            'text-offset': [0, -1.4],
            'text-anchor': 'bottom',
            'text-font': ['Open Sans Bold'],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': '#003b9a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        });
      } catch (error) {
        console.error('Error adding split marker layers:', error);
      }
    };

    const showPopup = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;

      const props = feature.properties as Record<string, unknown>;
      const label = String(props.label ?? '');
      const time = String(props.estimatedTime ?? '--');

      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;

      if (popup) popup.remove();

      popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        closeOnMove: false,
        offset: 14,
        className: 'split-marker-popup',
      })
        .setLngLat([lng, lat])
        .setHTML(
          `<div style="font-family:inherit;min-width:120px;padding:2px 4px">
            <div style="font-size:11px;font-weight:800;letter-spacing:0.04em;color:#003b9a;text-transform:uppercase">Split ${label}</div>
            <div style="margin-top:6px;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:12px;color:#1f2937">
              <span style="color:#6b7280">Time</span><span style="font-weight:700">${time}</span>
            </div>
          </div>`
        )
        .addTo(map);
    };

    const handleEnter = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      map.getCanvas().style.cursor = 'pointer';
      showPopup(e);
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = '';
      if (popup) {
        popup.remove();
        popup = null;
      }
    };

    if (map.isStyleLoaded()) {
      render();
    } else {
      map.once('styledata', render);
    }

    // Re-render after style switches (basemap toggle wipes custom layers)
    const handleStyleData = () => {
      if (!map.getSource(SOURCE_ID) && markers.length > 0) {
        render();
      }
    };
    map.on('styledata', handleStyleData);

    map.on('mouseenter', DOT_LAYER_ID, handleEnter);
    map.on('mouseleave', DOT_LAYER_ID, handleLeave);

    return () => {
      map.off('styledata', handleStyleData);
      map.off('mouseenter', DOT_LAYER_ID, handleEnter);
      map.off('mouseleave', DOT_LAYER_ID, handleLeave);
      cleanup();
    };
  }, [map, markers]);

  return null;
}
