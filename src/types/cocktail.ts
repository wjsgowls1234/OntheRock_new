import { TasteProfile, TasteNote } from './taste';
import { Ingredient } from './ingredient';

export interface Cocktail {
  id: string;
  name: string;
  ingredients: { ingredient: Ingredient; measure: string }[];
  instructions: string[];
  tasterProfile: TasteProfile;
  notes: TasteNote[];
}
