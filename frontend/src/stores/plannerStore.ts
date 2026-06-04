import { create } from 'zustand';
import type { PlannerPriority, PlannerTimeWindow, StartTimeResponse } from '../types';

export type PlannerWindowPreset = 'morning' | 'afternoon' | 'both' | 'custom';

interface PlannerState {
  date: string;
  windowPreset: PlannerWindowPreset;
  customStart: string;
  customEnd: string;
  priority: PlannerPriority;
  result: StartTimeResponse | null;
  isAnalyzing: boolean;
  error: string | null;
  lastRequestKey: string | null;
}

interface PlannerActions {
  setDate: (date: string) => void;
  setWindowPreset: (preset: PlannerWindowPreset) => void;
  setCustomStart: (time: string) => void;
  setCustomEnd: (time: string) => void;
  setPriority: (priority: PlannerPriority) => void;
  setResult: (result: StartTimeResponse, requestKey: string) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setError: (error: string | null) => void;
  clearResult: () => void;
  getTimeWindows: () => PlannerTimeWindow[];
}

type PlannerStore = PlannerState & PlannerActions;

const pad = (value: number) => String(value).padStart(2, '0');

const todayOrTomorrow = () => {
  const now = new Date();
  const selected = new Date(now);
  if (now.getHours() >= 20) {
    selected.setDate(selected.getDate() + 1);
  }

  return `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}`;
};

export const usePlannerStore = create<PlannerStore>((set, get) => ({
  date: todayOrTomorrow(),
  windowPreset: 'both',
  customStart: '05:00',
  customEnd: '09:00',
  priority: 'balanced',
  result: null,
  isAnalyzing: false,
  error: null,
  lastRequestKey: null,

  setDate: (date) => set({ date }),
  setWindowPreset: (windowPreset) => set({ windowPreset }),
  setCustomStart: (customStart) => set({ customStart }),
  setCustomEnd: (customEnd) => set({ customEnd }),
  setPriority: (priority) => set({ priority }),
  setResult: (result, lastRequestKey) => set({ result, lastRequestKey, error: null }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setError: (error) => set({ error }),
  clearResult: () => set({ result: null, lastRequestKey: null, error: null }),
  getTimeWindows: () => {
    const state = get();

    if (state.windowPreset === 'morning') {
      return [{ start: '05:00', end: '09:00' }];
    }
    if (state.windowPreset === 'afternoon') {
      return [{ start: '16:00', end: '20:00' }];
    }
    if (state.windowPreset === 'custom') {
      return [{ start: state.customStart, end: state.customEnd }];
    }

    return [
      { start: '05:00', end: '09:00' },
      { start: '16:00', end: '20:00' },
    ];
  },
}));
