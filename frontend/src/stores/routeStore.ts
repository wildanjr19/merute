import { create } from 'zustand';
import type { Waypoint, RouteSegment } from '../types';

interface RouteState {
  waypoints: Waypoint[];
  segments: RouteSegment[];
  totalDistance: number;
  isCalculating: boolean;
  paceMinPerKm: number;
  history: RouteState[];
  historyIndex: number;
}

interface RouteActions {
  addWaypoint: (waypoint: Waypoint) => void;
  updateWaypoint: (id: string, lat: number, lng: number) => void;
  removeWaypoint: (id: string) => void;
  setSegments: (segments: RouteSegment[], totalDistance: number) => void;
  setIsCalculating: (isCalculating: boolean) => void;
  setPaceMinPerKm: (pace: number) => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

type RouteStore = RouteState & RouteActions;

const MAX_HISTORY = 50;

const initialState: RouteState = {
  waypoints: [],
  segments: [],
  totalDistance: 0,
  isCalculating: false,
  paceMinPerKm: 6,
  history: [],
  historyIndex: -1,
};

const saveToHistory = (state: RouteState): RouteState => {
  const snapshot: RouteState = {
    waypoints: [...state.waypoints],
    segments: [...state.segments],
    totalDistance: state.totalDistance,
    isCalculating: state.isCalculating,
    paceMinPerKm: state.paceMinPerKm,
    history: [],
    historyIndex: -1,
  };

  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(snapshot);

  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
  }

  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
};

export const useRouteStore = create<RouteStore>((set, get) => ({
  ...initialState,

  addWaypoint: (waypoint) =>
    set((state) => {
      const newState = saveToHistory(state);
      return {
        ...newState,
        waypoints: [...state.waypoints, waypoint],
      };
    }),

  updateWaypoint: (id, lat, lng) =>
    set((state) => {
      const newState = saveToHistory(state);
      return {
        ...newState,
        waypoints: state.waypoints.map((wp) =>
          wp.id === id ? { ...wp, lat, lng } : wp
        ),
      };
    }),

  removeWaypoint: (id) =>
    set((state) => {
      const newState = saveToHistory(state);
      return {
        ...newState,
        waypoints: state.waypoints.filter((wp) => wp.id !== id),
      };
    }),

  setSegments: (segments, totalDistance) =>
    set({
      segments,
      totalDistance,
    }),

  setIsCalculating: (isCalculating) =>
    set({
      isCalculating,
    }),

  setPaceMinPerKm: (pace) =>
    set({
      paceMinPerKm: pace,
    }),

  clearAll: () =>
    set((state) => {
      const newState = saveToHistory(state);
      return {
        ...newState,
        waypoints: [],
        segments: [],
        totalDistance: 0,
      };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        const prevState = state.history[state.historyIndex - 1];
        return {
          ...prevState,
          history: state.history,
          historyIndex: state.historyIndex - 1,
        };
      }
      return state;
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        return {
          ...nextState,
          history: state.history,
          historyIndex: state.historyIndex + 1,
        };
      }
      return state;
    }),

  canUndo: () => {
    const state = get();
    return state.historyIndex > 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },
}));
