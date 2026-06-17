import { create } from 'zustand';

interface AppStore {
  initialized: boolean;
  setInitialized: (value: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  initialized: false,
  setInitialized: (value) => set({ initialized: value }),
}));