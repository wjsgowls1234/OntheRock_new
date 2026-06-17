import { TasteProfile } from '@/types/taste';

type MixIngredient = {
  id: string;
  name: string;
  profile: TasteProfile;
};

export const MIX_INGREDIENTS: MixIngredient[] = [
  { id: '1', name: 'Bourbon Whiskey', profile: { sweetness: 40, sourness: 5, bitterness: 60, body: 90, aroma: 80 } },
  { id: '2', name: 'Ginger Ale', profile: { sweetness: 65, sourness: 20, bitterness: 10, body: 30, aroma: 35 } },
  { id: '3', name: 'Grapefruit Juice', profile: { sweetness: 30, sourness: 75, bitterness: 35, body: 25, aroma: 65 } },
  { id: '4', name: 'Espresso', profile: { sweetness: 5, sourness: 30, bitterness: 90, body: 70, aroma: 95 } },
  { id: '5', name: 'Lime Juice', profile: { sweetness: 10, sourness: 95, bitterness: 15, body: 10, aroma: 50 } },
  { id: '6', name: 'Simple Syrup', profile: { sweetness: 100, sourness: 0, bitterness: 0, body: 20, aroma: 5 } },
  { id: '7', name: 'Angostura Bitters', profile: { sweetness: 5, sourness: 10, bitterness: 95, body: 15, aroma: 90 } },
  { id: '8', name: 'Coconut Cream', profile: { sweetness: 75, sourness: 0, bitterness: 0, body: 85, aroma: 70 } },
];

export function predictFlavorProfile(selectedIds: string[]): TasteProfile {
  const selected = MIX_INGREDIENTS.filter((i) => selectedIds.includes(i.id));
  if (selected.length === 0) {
    return { sweetness: 0, sourness: 0, bitterness: 0, body: 0, aroma: 0 };
  }
  const sum = selected.reduce(
    (acc, ing) => ({
      sweetness: acc.sweetness + ing.profile.sweetness,
      sourness: acc.sourness + ing.profile.sourness,
      bitterness: acc.bitterness + ing.profile.bitterness,
      body: acc.body + ing.profile.body,
      aroma: acc.aroma + ing.profile.aroma,
    }),
    { sweetness: 0, sourness: 0, bitterness: 0, body: 0, aroma: 0 }
  );
  const count = selected.length;
  return {
    sweetness: Math.round(sum.sweetness / count),
    sourness: Math.round(sum.sourness / count),
    bitterness: Math.round(sum.bitterness / count),
    body: Math.round((sum.body / count) * 1.1),
    aroma: Math.round(sum.aroma / count),
  };
}

export function calculateSimilarity(a: TasteProfile, b: TasteProfile): number {
  const keys: (keyof TasteProfile)[] = ['sweetness', 'sourness', 'bitterness', 'body', 'aroma'];
  const diff = keys.reduce((acc, k) => acc + Math.abs(a[k] - b[k]), 0);
  return Math.max(0, Math.round(100 - (diff / (keys.length * 100)) * 100));
}

export function generateTags(profile: TasteProfile): string[] {
  const tags: string[] = [];
  if (profile.sweetness > 60) tags.push('#Sweet');
  if (profile.sourness > 60) tags.push('#Citrusy');
  if (profile.bitterness > 60) tags.push('#Bold');
  if (profile.body > 70) tags.push('#FullBody');
  if (profile.aroma > 70) tags.push('#Aromatic');
  if (profile.sweetness < 20 && profile.sourness < 20) tags.push('#Dry');
  if (tags.length === 0) tags.push('#Balanced');
  return tags;
}
