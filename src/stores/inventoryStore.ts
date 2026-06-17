import { create } from 'zustand';
import { InventoryItem } from '@/types/ingredient';

interface InventoryStore {
  items: InventoryItem[];
  selectedItem: InventoryItem | null;
  isLoading: boolean;
  
  // Actions
  addIngredient: (ingredient: InventoryItem) => void;
  removeIngredient: (id: string) => void;
  updateIngredient: (id: string, updates: Partial<InventoryItem>) => void;
  setSelectedItem: (item: InventoryItem | null) => void;
  reorganizeShelf: (items: InventoryItem[]) => void;
}

export const useInventoryStore = create<InventoryStore>((set) => ({
  items: [],
  selectedItem: null,
  isLoading: false,

  addIngredient: (ingredient) =>
    set((state) => ({
      items: [...state.items, ingredient],
    })),

  removeIngredient: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      selectedItem:
        state.selectedItem?.id === id ? null : state.selectedItem,
    })),

  updateIngredient: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
      selectedItem:
        state.selectedItem?.id === id
          ? { ...state.selectedItem, ...updates }
          : state.selectedItem,
    })),

  setSelectedItem: (item) => set({ selectedItem: item }),

  reorganizeShelf: (items) =>
    set({ items }),
}));