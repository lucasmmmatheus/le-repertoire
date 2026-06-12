import { create } from 'zustand';
import { ai } from '../ai';
import { errorMessage } from '../lib/errors';
import {
  getSavedRecipes,
  getSessionSnapshot,
  newId,
  saveRecipe,
  saveSessionSnapshot,
  deleteSavedRecipe,
  type SessionSnapshot,
} from '../lib/storage';
import { useTimers } from './useTimers';
import type {
  ChecklistEntry,
  GenerationInput,
  Recipe,
  SavedRecipe,
  Substitution,
} from '../types';

export type Route = 'home' | 'checklist' | 'recipe' | 'souschef' | 'saved' | 'settings';

export const VALID_ROUTES: readonly Route[] = [
  'home',
  'checklist',
  'recipe',
  'souschef',
  'saved',
  'settings',
];

/** Sessão anterior (se houver), com validação defensiva — dados podem ser de versão velha. */
function restoreSession(): SessionSnapshot | null {
  const s = getSessionSnapshot();
  if (!s || typeof s !== 'object') return null;
  if (!Array.isArray(s.entries) || typeof s.input?.query !== 'string') return null;
  return s;
}

const restored = restoreSession();

function restoredRoute(): Route {
  if (!restored) return 'home';
  const r = restored.route as Route;
  if (!VALID_ROUTES.includes(r)) return 'home';
  // Sem receita não há o que mostrar nessas rotas.
  if ((r === 'recipe' || r === 'souschef') && !restored.recipe) return 'home';
  return r;
}

/** Monta as linhas da lista final (com substituições e remoções) para a geração da receita.
    Exportada para teste. */
export function buildIngredientLines(entries: ChecklistEntry[]): string[] {
  return entries.map((e) => {
    const ing = e.ingredient;
    const qty = ing.quantity != null ? `${ing.quantity} ${ing.unit} de ` : '';
    if (e.status === 'removed') return `- [REMOVIDO] ${ing.name}`;
    if (e.status === 'substituted' && e.substitution) {
      const original = `substitui ${qty}${ing.name}`;
      if (e.substitution.ratio) {
        return `- ${e.substitution.substitute} — ${e.substitution.ratio} (${original})`;
      }
      // Escolha digitada pelo usuário, sem proporção avaliada: a receita deve recalcular.
      return `- ${e.substitution.substitute} (${original}; escolha do usuário — USE este ingrediente e recalcule a proporção adequada)`;
    }
    return `- ${qty}${ing.name}`;
  });
}

interface AppState {
  route: Route;
  input: GenerationInput;
  entries: ChecklistEntry[];
  servings: string;
  anchorNote?: string;
  recipe: Recipe | null;
  recipeStale: boolean;
  busy: null | 'checklist' | 'recipe';
  /** % aproximado (0–100) da geração em andamento; null quando ocioso. */
  progress: number | null;
  error: string | null;
  saved: SavedRecipe[];

  go: (route: Route) => void;
  setInput: (patch: Partial<GenerationInput>) => void;
  clearError: () => void;

  generateChecklist: () => Promise<void>;
  markHave: (id: string) => void;
  applySubstitution: (id: string, sub: Substitution) => void;
  removeEntry: (id: string) => void;
  reopenEntry: (id: string) => void;
  generateRecipe: () => Promise<void>;

  refreshSaved: () => void;
  saveCurrent: () => void;
  removeSaved: (id: string) => void;
  loadSaved: (r: SavedRecipe) => void;
  startNew: () => void;
}

export const useApp = create<AppState>((set, get) => ({
  route: restoredRoute(),
  input: restored?.input ?? { query: '', anchor: '', style: '' },
  entries: restored?.entries ?? [],
  servings: restored?.servings ?? '',
  anchorNote: restored?.anchorNote,
  recipe: restored?.recipe ?? null,
  recipeStale: restored?.recipeStale ?? false,
  busy: null,
  progress: null,
  error: null,
  saved: getSavedRecipes(),

  go: (route) => set({ route, error: null }),
  setInput: (patch) => set((s) => ({ input: { ...s.input, ...patch } })),
  clearError: () => set({ error: null }),

  async generateChecklist() {
    const { input } = get();
    if (!input.query.trim()) return;
    set({ busy: 'checklist', progress: 0, error: null });
    try {
      const cl = await ai.generateChecklist(input, (pct) => set({ progress: pct }));
      const entries: ChecklistEntry[] = cl.ingredients.map((ing) => ({
        id: newId(),
        ingredient: ing,
        status: 'unknown',
        suggested: [],
      }));
      set({
        entries,
        servings: cl.servings,
        anchorNote: cl.anchorNote,
        recipe: null,
        recipeStale: false,
        route: 'checklist',
        busy: null,
        progress: null,
      });
    } catch (e) {
      set({ busy: null, progress: null, error: errorMessage(e) });
    }
  },

  markHave: (id) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, status: 'have', substitution: undefined } : e,
      ),
    })),

  applySubstitution: (id, sub) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, status: 'substituted', substitution: sub } : e,
      ),
      recipeStale: s.recipe ? true : s.recipeStale,
    })),

  removeEntry: (id) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, status: 'removed', substitution: undefined } : e,
      ),
      recipeStale: s.recipe ? true : s.recipeStale,
    })),

  reopenEntry: (id) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, status: 'unknown', substitution: undefined } : e,
      ),
    })),

  async generateRecipe() {
    const { entries, input } = get();
    set({ busy: 'recipe', progress: 0, error: null });
    try {
      const raw = await ai.generateRecipe(
        { input, ingredientLines: buildIngredientLines(entries) },
        (pct) => set({ progress: pct }),
      );
      // Renumera os passos: chaves/timers dependem de n único e sequencial.
      const recipe = { ...raw, steps: raw.steps.map((s, i) => ({ ...s, n: i + 1 })) };
      useTimers.getState().clearAll(); // receita nova → zera cronômetros antigos
      set({ recipe, recipeStale: false, route: 'recipe', busy: null, progress: null });
    } catch (e) {
      set({ busy: null, progress: null, error: errorMessage(e) });
    }
  },

  refreshSaved: () => set({ saved: getSavedRecipes() }),

  saveCurrent: () => {
    const { recipe, input } = get();
    if (!recipe) return;
    const entry: SavedRecipe = { id: newId(), savedAt: Date.now(), input, recipe };
    set({ saved: saveRecipe(entry) });
  },

  removeSaved: (id) => set({ saved: deleteSavedRecipe(id) }),

  loadSaved: (r) => {
    useTimers.getState().clearAll();
    set({ recipe: r.recipe, input: r.input, recipeStale: false, route: 'recipe' });
  },

  startNew: () => {
    useTimers.getState().clearAll();
    set({
      route: 'home',
      input: { query: '', anchor: '', style: '' },
      entries: [],
      servings: '',
      anchorNote: undefined,
      recipe: null,
      recipeStale: false,
      error: null,
    });
  },
}));

// Persistência da sessão: o fluxo em andamento sobrevive a voltar/fechar o app.
if (typeof window !== 'undefined') {
  let saveTimer: number | undefined;
  useApp.subscribe((s) => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveSessionSnapshot({
        route: s.route,
        input: s.input,
        entries: s.entries,
        servings: s.servings,
        anchorNote: s.anchorNote,
        recipe: s.recipe,
        recipeStale: s.recipeStale,
      });
    }, 300);
  });
}
