import { TasteProfile } from '@/types/taste';

export const MOCK_TASTE_PROFILES: Record<string, TasteProfile> = {
  smokyMargarita: { sweetness: 35, sourness: 65, bitterness: 20, body: 50, aroma: 70 },
  negroni: { sweetness: 20, sourness: 10, bitterness: 80, body: 70, aroma: 85 },
  daiquiri: { sweetness: 55, sourness: 70, bitterness: 10, body: 30, aroma: 60 },
  oldFashioned: { sweetness: 40, sourness: 5, bitterness: 55, body: 90, aroma: 80 },
  mojito: { sweetness: 60, sourness: 60, bitterness: 10, body: 25, aroma: 75 },
};
