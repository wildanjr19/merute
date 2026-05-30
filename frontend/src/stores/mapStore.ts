import { create } from 'zustand';

export type MapStyle = 'streets' | 'satellite' | 'outdoor';

interface MapState {
  center: [number, number];
  zoom: number;
  style: MapStyle;
}

interface MapActions {
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setStyle: (style: MapStyle) => void;
  flyTo: (center: [number, number], zoom?: number) => void;
}

type MapStore = MapState & MapActions;

const initialState: MapState = {
  center: [110.8316, -7.5568], // Surakarta, Indonesia [lng, lat]
  zoom: 12,
  style: 'streets',
};

export const useMapStore = create<MapStore>((set) => ({
  ...initialState,

  setCenter: (center) =>
    set({
      center,
    }),

  setZoom: (zoom) =>
    set({
      zoom,
    }),

  setStyle: (style) =>
    set({
      style,
    }),

  flyTo: (center, zoom) =>
    set((state) => ({
      center,
      zoom: zoom ?? state.zoom,
    })),
}));
