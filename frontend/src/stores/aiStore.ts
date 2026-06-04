import { create } from 'zustand';
import type { HydrationPoint, HydrationResponse, RouteTextResponse } from '../types';

interface AIState {
  // Hydration
  hydrationSuggestions: HydrationPoint[];
  hydrationSummary: string;
  hydrationSource: 'ai' | 'rules' | 'hybrid' | null;
  hydrationWarnings: string[];

  // Route Text
  routeText: RouteTextResponse | null;

  // UI State
  isGeneratingHydration: boolean;
  isGeneratingRouteText: boolean;
  error: string | null;
  activeTab: 'hydration' | 'routetext';
  lastRouteKey: string | null;
}

interface AIActions {
  setHydrationResult: (result: HydrationResponse, routeKey?: string) => void;
  setRouteTextResult: (result: RouteTextResponse, routeKey?: string) => void;
  setIsGeneratingHydration: (val: boolean) => void;
  setIsGeneratingRouteText: (val: boolean) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: 'hydration' | 'routetext') => void;
  clearHydration: () => void;
  clearRouteText: () => void;
  clearAll: () => void;
}

type AIStore = AIState & AIActions;

export const useAIStore = create<AIStore>((set) => ({
  hydrationSuggestions: [],
  hydrationSummary: '',
  hydrationSource: null,
  hydrationWarnings: [],
  routeText: null,
  isGeneratingHydration: false,
  isGeneratingRouteText: false,
  error: null,
  activeTab: 'hydration',
  lastRouteKey: null,

  setHydrationResult: (result, lastRouteKey) =>
    set({
      hydrationSuggestions: result.points,
      hydrationSummary: result.summary,
      hydrationSource: result.source,
      hydrationWarnings: result.warnings,
      lastRouteKey: lastRouteKey ?? null,
      error: null,
    }),

  setRouteTextResult: (result, lastRouteKey) =>
    set({
      routeText: result,
      lastRouteKey: lastRouteKey ?? null,
      error: null,
    }),

  setIsGeneratingHydration: (val) => set({ isGeneratingHydration: val }),
  setIsGeneratingRouteText: (val) => set({ isGeneratingRouteText: val }),
  setError: (error) => set({ error }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  clearHydration: () =>
    set({
      hydrationSuggestions: [],
      hydrationSummary: '',
      hydrationSource: null,
      hydrationWarnings: [],
    }),

  clearRouteText: () => set({ routeText: null }),

  clearAll: () =>
    set({
      hydrationSuggestions: [],
      hydrationSummary: '',
      hydrationSource: null,
      hydrationWarnings: [],
      routeText: null,
      lastRouteKey: null,
      error: null,
    }),
}));
