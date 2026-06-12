import type { GenerationInput } from '../types';
import type { Checklist, QuickHelp, Recipe, Substitution } from './schemas';

export interface SubstitutionRequest {
  query: string;
  ingredientName: string;
  quantityLabel?: string;
  role?: string;
  /** Sugestões já mostradas, para não repetir em "Gerar nova sugestão". */
  avoid?: string[];
  /** Substituição escrita pelo próprio usuário — a IA avalia ESTA proposta em vez de sugerir outra. */
  userProposal?: string;
}

export interface RecipeRequest {
  input: GenerationInput;
  /** Linhas já formatadas da lista final (com substituições e remoções). */
  ingredientLines: string[];
}

export interface QuickHelpRequest {
  stepInstruction: string;
  equipment?: string;
  heat?: string;
  problem: string;
}

/** Callback de progresso aproximado (0–100) das gerações longas. */
export type OnProgress = (pct: number) => void;

/** Contrato único implementado tanto pela IA real quanto pelo mock. */
export interface AiApi {
  generateChecklist(input: GenerationInput, onProgress?: OnProgress): Promise<Checklist>;
  suggestSubstitution(req: SubstitutionRequest): Promise<Substitution>;
  generateRecipe(req: RecipeRequest, onProgress?: OnProgress): Promise<Recipe>;
  quickHelp(req: QuickHelpRequest): Promise<QuickHelp>;
}
