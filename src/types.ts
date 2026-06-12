import type { Checklist, IngredientData, Recipe, Substitution } from './ai/schemas';

/** Entrada do usuário na página inicial. */
export interface GenerationInput {
  query: string;
  anchor?: string; // ex: "600g de guisado"
  style?: string; // ex: "janta elaborada"
}

export type ItemStatus = 'unknown' | 'have' | 'substituted' | 'removed';

/** Linha do checklist (estado da UI). O id vive na entrada, não no dado da IA. */
export interface ChecklistEntry {
  id: string;
  ingredient: IngredientData;
  status: ItemStatus;
  substitution?: Substitution;
  /** Sugestões já mostradas, para "Gerar nova sugestão" não repetir. */
  suggested: string[];
}

export interface SavedRecipe {
  id: string;
  savedAt: number;
  input: GenerationInput;
  recipe: Recipe;
}

export type { Checklist, IngredientData, Recipe, Substitution };
export type { RecipeStep, QuickHelp } from './ai/schemas';
