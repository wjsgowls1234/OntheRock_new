export interface TasteProfile {
    sweetness: number; // 0-100
    sourness: number;
    bitterness: number;
    body: number; // Light to Full
    aroma: number; // Subtle to Bold
  }
  
  export interface TasteNote {
    id: string;
    tag: string; // e.g., "#SmokyCitrus"
    confidence: number; // 0-1
  }
  
  export interface CocktailEntry {
    id: string;
    name: string;
    recipe: string;
    tasterProfile: TasteProfile;
    notes: TasteNote[];
    rating: number; // 1-5
    createdAt: number;
    mood?: string;
    occasion?: string;
  }
  
