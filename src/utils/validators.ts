export function isValidIngredientName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100;
}

export function isValidAbv(value: number): boolean {
  return value >= 0 && value <= 100;
}

export function isValidTasteValue(value: number): boolean {
  return value >= 0 && value <= 100;
}
