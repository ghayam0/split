export const CATEGORIES = [
  "Food",
  "Transport",
  "Going out",
  "Shopping",
  "Study",
  "Rent & bills",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = "Other";
