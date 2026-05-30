import { create } from 'zustand';

export type SplitUnit = 'km' | 'mi';
export type SplitInterval = 1 | 2 | 5;

interface SplitMarkerState {
  enabled: boolean;
  unit: SplitUnit;
  interval: SplitInterval;
}

interface SplitMarkerActions {
  setEnabled: (enabled: boolean) => void;
  setUnit: (unit: SplitUnit) => void;
  setInterval: (interval: SplitInterval) => void;
}

type SplitMarkerStore = SplitMarkerState & SplitMarkerActions;

const STORAGE_KEY = 'merute.splitMarkers.v1';

const DEFAULT_STATE: SplitMarkerState = {
  enabled: true,
  unit: 'km',
  interval: 1,
};

const loadInitialState = (): SplitMarkerState => {
  if (typeof window === 'undefined') return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;

    const parsed = JSON.parse(raw) as Partial<SplitMarkerState>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_STATE.enabled,
      unit: parsed.unit === 'mi' ? 'mi' : 'km',
      interval:
        parsed.interval === 1 || parsed.interval === 2 || parsed.interval === 5
          ? parsed.interval
          : DEFAULT_STATE.interval,
    };
  } catch {
    return DEFAULT_STATE;
  }
};

const persist = (state: SplitMarkerState) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        enabled: state.enabled,
        unit: state.unit,
        interval: state.interval,
      })
    );
  } catch {
    // ignore quota errors
  }
};

export const useSplitMarkerStore = create<SplitMarkerStore>((set) => ({
  ...loadInitialState(),

  setEnabled: (enabled) =>
    set((state) => {
      const next = { ...state, enabled };
      persist(next);
      return { enabled };
    }),

  setUnit: (unit) =>
    set((state) => {
      const next = { ...state, unit };
      persist(next);
      return { unit };
    }),

  setInterval: (interval) =>
    set((state) => {
      const next = { ...state, interval };
      persist(next);
      return { interval };
    }),
}));
