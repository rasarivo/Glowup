import type { InterestCategory } from "@/types/database";

export const CATEGORY_LABELS: Record<InterestCategory, string> = {
  sport: "Sport",
  plein_air: "Plein air",
  culture: "Culture",
  creatif: "Créatif",
  social: "Social",
  bien_etre: "Bien-être",
};

export const CATEGORY_ORDER: InterestCategory[] = [
  "sport",
  "plein_air",
  "culture",
  "creatif",
  "social",
  "bien_etre",
];

export const MIN_INTERESTS_REQUIRED = 3;
