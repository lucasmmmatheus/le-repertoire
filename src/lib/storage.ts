import type { ChecklistEntry, GenerationInput, Recipe, SavedRecipe } from '../types';

/* Persistência local (uso pessoal, 1 usuário). Tudo em localStorage. */

const KEY_API = 'lr.apiKey';
const KEY_MODE = 'lr.aiMode';
const KEY_SAVED = 'lr.saved';
const KEY_SESSION = 'lr.session';
const KEY_TIMERS = 'lr.timers';

// Guards para ambiente sem localStorage (testes em node) e storage cheio.
function readJson<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* indisponível/cheio — segue sem persistir */
  }
}

export type AiMode = 'live' | 'mock';

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_API) ?? '';
  } catch {
    return '';
  }
}

export function setApiKey(value: string): void {
  localStorage.setItem(KEY_API, value.trim());
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

/** Modo da IA: 'live' (API real) ou 'mock' (fixtures, sem key/sem custo). */
export function getAiMode(): AiMode {
  try {
    const m = localStorage.getItem(KEY_MODE);
    if (m === 'mock' || m === 'live') return m;
  } catch {
    /* ignore */
  }
  return 'live';
}

export function setAiMode(mode: AiMode): void {
  localStorage.setItem(KEY_MODE, mode);
}

// ---------- Receitas salvas ----------

export function getSavedRecipes(): SavedRecipe[] {
  try {
    const raw = localStorage.getItem(KEY_SAVED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedRecipe[]) : [];
  } catch {
    return [];
  }
}

export function saveRecipe(entry: SavedRecipe): SavedRecipe[] {
  const all = getSavedRecipes().filter((r) => r.id !== entry.id);
  const next = [entry, ...all];
  localStorage.setItem(KEY_SAVED, JSON.stringify(next));
  return next;
}

export function deleteSavedRecipe(id: string): SavedRecipe[] {
  const next = getSavedRecipes().filter((r) => r.id !== id);
  localStorage.setItem(KEY_SAVED, JSON.stringify(next));
  return next;
}

// ---------- Sessão em andamento (sobrevive a voltar/fechar o app) ----------

/** Snapshot do fluxo atual. Validado na hidratação do store (dados podem ser velhos). */
export interface SessionSnapshot {
  route: string;
  input: GenerationInput;
  entries: ChecklistEntry[];
  servings: string;
  anchorNote?: string;
  recipe: Recipe | null;
  recipeStale: boolean;
}

export function getSessionSnapshot(): SessionSnapshot | null {
  return readJson<SessionSnapshot>(KEY_SESSION);
}

export function saveSessionSnapshot(s: SessionSnapshot): void {
  writeJson(KEY_SESSION, s);
}

// ---------- Cronômetros (sobrevivem a fechar o app; endsAt é absoluto) ----------

export function getTimersSnapshot<T>(): Record<string, T> | null {
  return readJson<Record<string, T>>(KEY_TIMERS);
}

export function saveTimersSnapshot(timers: unknown): void {
  writeJson(KEY_TIMERS, timers);
}

/** ID curto e único para entradas e receitas. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
