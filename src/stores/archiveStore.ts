import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CocktailEntry } from '@/types/taste';

interface ArchiveStore {
  entries: CocktailEntry[];
  addEntry: (entry: CocktailEntry) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, updates: Partial<CocktailEntry>) => void;
}

export const useArchiveStore = create<ArchiveStore>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => ({ entries: [...state.entries, entry] })),

      removeEntry: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),

      updateEntry: (id, updates) =>
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),
    }),
    {
      name: 'ontherock-archive-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
