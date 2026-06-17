import { create } from 'zustand';
import { CocktailEntry } from '@/types/taste';

interface TasteGenomeStore {
  entries: CocktailEntry[];
  averageProfile: any;
  
  addEntry: (entry: CocktailEntry) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, updates: Partial<CocktailEntry>) => void;
  calculateAverageProfile: () => void;
}

export const useTasteGenomeStore = create<TasteGenomeStore>((set, get) => ({
  entries: [],
  averageProfile: null,

  addEntry: (entry) =>
    set((state) => {
      const newEntries = [...state.entries, entry];
      return { entries: newEntries };
    }),

  removeEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),

  updateEntry: (id, updates) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  calculateAverageProfile: () => {
    const state = get();
    if (state.entries.length === 0) return;

    const avg = state.entries.reduce(
      (acc, entry) => ({
        sweetness: acc.sweetness + entry.tasterProfile.sweetness,
        sourness: acc.sourness + entry.tasterProfile.sourness,
        bitterness: acc.bitterness + entry.tasterProfile.bitterness,
        body: acc.body + entry.tasterProfile.body,
        aroma: acc.aroma + entry.tasterProfile.aroma,
      }),
      { sweetness: 0, sourness: 0, bitterness: 0, body: 0, aroma: 0 }
    );

    const count = state.entries.length;
    set({
      averageProfile: {
        sweetness: avg.sweetness / count,
        sourness: avg.sourness / count,
        bitterness: avg.bitterness / count,
        body: avg.body / count,
        aroma: avg.aroma / count,
      },
    });
  },
}));