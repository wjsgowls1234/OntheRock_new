import { Cocktail } from '@/types/cocktail';
import { MOCK_INGREDIENTS } from './mockIngredients';

export const MOCK_COCKTAILS: Cocktail[] = [
  {
    id: 'margarita',
    name: 'Classic Margarita',
    ingredients: [
      { ingredient: MOCK_INGREDIENTS[1], measure: '1.5 oz' },
      { ingredient: MOCK_INGREDIENTS[4], measure: '1 oz' },
      { ingredient: MOCK_INGREDIENTS[0], measure: '0.5 oz' },
    ],
    instructions: [
      'Shake with ice',
      'Strain into glass',
      'Serve',
    ],
    tasterProfile: {
      sweetness: 35,
      sourness: 65,
      bitterness: 15,
      body: 45,
      aroma: 70,
    },
    notes: [
      { id: '1', tag: '#CitrusFresh', confidence: 0.95 },
      { id: '2', tag: '#Balanced', confidence: 0.88 },
    ],
  },
];