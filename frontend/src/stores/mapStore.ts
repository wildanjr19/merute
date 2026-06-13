import { create } from 'zustand';

export type MapStyle = 'streets' | 'satellite' | 'outdoor';

export interface UserLocation {
  center: [number, number];
  accuracy: number;
  timestamp: number;
}

interface MapState {
  center: [number, number];
  zoom: number;
  style: MapStyle;
  userLocation: UserLocation | null;
}

interface MapActions {
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setStyle: (style: MapStyle) => void;
  setUserLocation: (location: UserLocation) => void;
  flyTo: (center: [number, number], zoom?: number) => void;
}

type MapStore = MapState & MapActions;

const initialState: MapState = {
  center: [110.8316, -7.5568], // Surakarta, Indonesia [lng, lat]
  zoom: 12,
  style: 'streets',
  userLocation: null,
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

  setUserLocation: (userLocation) =>
    set({
      userLocation,
    }),

  flyTo: (center, zoom) =>
    set((state) => ({
      center,
      zoom: zoom ?? state.zoom,
    })),
}));
