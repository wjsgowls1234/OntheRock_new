export type IngredientCategory = 
  | 'spirit'
  | 'mixer'
  | 'liqueur'
  | 'bitters'
  | 'traditional'
  | 'other';

export type SpiritType = 
  | 'whiskey'
  | 'vodka'
  | 'gin'
  | 'rum'
  | 'tequila'
  | 'brandy'
  | 'hwayo'
  | 'other';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  spiritType?: SpiritType;
  brand?: string;
  abv?: number;
  imageUrl: string; // PNG bottle image
  description?: string;
  addedDate: number; // timestamp
  lastUsed?: number;
  notes?: string;
}

export interface InventoryItem extends Ingredient {
  quantity: 'full' | 'high' | 'medium' | 'low';
  shelf?: number; // Which shelf (0-3, top to bottom)
  position?: number; // Position on shelf
}