import { describe, expect, it } from 'vitest';
import { zChecklist, zHeat, zRecipe, zSubstitution } from './ai/schemas';
import { formatClock, formatDuration } from './lib/format';
import { buildIngredientLines } from './store/useAppStore';
import { normalizeRestoredTimer, remainingMs, type OneTimer } from './store/useTimers';
import type { ChecklistEntry } from './types';

describe('schemas (o "portão" da saída da IA)', () => {
  it('zRecipe aplica defaults para arrays opcionais', () => {
    const r = zRecipe.parse({
      recipeName: 'X',
      servings: '2 porções',
      summary: 's',
      steps: [{ n: 1, instruction: 'faça' }],
    });
    expect(r.miseEnPlace).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.pairings).toEqual([]);
    expect(r.steps[0]!.controlPoints).toEqual([]);
    expect(r.steps[0]!.adjustments).toEqual([]);
  });

  it('zRecipe rejeita receita sem passos', () => {
    const bad = zRecipe.safeParse({ recipeName: 'X', servings: '2', summary: 's', steps: [] });
    expect(bad.success).toBe(false);
  });

  it('zChecklist exige ao menos 1 ingrediente', () => {
    expect(zChecklist.safeParse({ servings: '2', ingredients: [] }).success).toBe(false);
  });

  it('zSubstitution exige os três campos', () => {
    expect(zSubstitution.safeParse({ substitute: 'a', ratio: 'b', impactNote: 'c' }).success).toBe(true);
    expect(zSubstitution.safeParse({ substitute: 'a' }).success).toBe(false);
  });
});

describe('format', () => {
  it('formatClock (cronômetro)', () => {
    expect(formatClock(125)).toBe('2:05');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(5)).toBe('0:05');
  });

  it('formatDuration (receita)', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(180)).toBe('3 min');
    expect(formatDuration(90)).toBe('1 min 30s');
  });
});

describe('zHeat leniente (variações de grafia da IA)', () => {
  it('normaliza acento/espaço para o enum canônico', () => {
    expect(zHeat.parse('Médio Alto')).toBe('médio-alto');
    expect(zHeat.parse('medio')).toBe('médio');
    expect(zHeat.parse('SEM FOGO')).toBe('sem fogo');
  });

  it('valor irreconhecível vira undefined em vez de reprovar', () => {
    expect(zHeat.parse('fogo das profundezas')).toBeUndefined();
    expect(zHeat.parse(42)).toBeUndefined();
  });
});

function entry(patch: Partial<ChecklistEntry>): ChecklistEntry {
  return {
    id: 'e1',
    ingredient: { name: 'Ghee', quantity: 20, unit: 'g', essential: false },
    status: 'unknown',
    suggested: [],
    ...patch,
  };
}

describe('buildIngredientLines (lista final para a IA)', () => {
  it('substituição avaliada inclui proporção e o original com quantidade', () => {
    const lines = buildIngredientLines([
      entry({
        status: 'substituted',
        substitution: { substitute: 'Banha', ratio: '20 g de banha', impactNote: 'x' },
      }),
    ]);
    expect(lines[0]).toBe('- Banha — 20 g de banha (substitui 20 g de Ghee)');
  });

  it('escolha do usuário sem proporção pede recálculo explícito', () => {
    const lines = buildIngredientLines([
      entry({
        status: 'substituted',
        substitution: { substitute: 'Margarina', ratio: '', impactNote: '' },
      }),
    ]);
    expect(lines[0]).toContain('Margarina');
    expect(lines[0]).toContain('escolha do usuário');
    expect(lines[0]).toContain('recalcule');
  });

  it('removido vira [REMOVIDO]', () => {
    expect(buildIngredientLines([entry({ status: 'removed' })])[0]).toBe('- [REMOVIDO] Ghee');
  });
});

describe('hidratação de cronômetros persistidos', () => {
  const base: OneTimer = {
    durationSeconds: 60,
    label: 'Passo 2',
    status: 'running',
    endsAt: 0,
    remainingMs: 0,
  };

  it('timer vencido com o app fechado vira done silencioso', () => {
    const t = normalizeRestoredTimer({ ...base, endsAt: 1000 }, 5000);
    expect(t.status).toBe('done');
    expect(t.endsAt).toBeNull();
    expect(t.remainingMs).toBe(0);
  });

  it('timer ainda rodando continua rodando', () => {
    const t = normalizeRestoredTimer({ ...base, endsAt: 9000 }, 5000);
    expect(t.status).toBe('running');
    expect(t.endsAt).toBe(9000);
  });
});

describe('timer remainingMs', () => {
  const base = { durationSeconds: 10, label: 'x', remainingMs: 0 } as const;

  it('rodando calcula a partir de endsAt', () => {
    const now = 10_000;
    expect(remainingMs({ ...base, status: 'running', endsAt: now + 5000 }, now)).toBe(5000);
  });

  it('pausado usa remainingMs', () => {
    expect(remainingMs({ ...base, status: 'paused', endsAt: null, remainingMs: 4200 }, 99_999)).toBe(4200);
  });

  it('rodando e vencido não fica negativo', () => {
    const now = 10_000;
    expect(remainingMs({ ...base, status: 'running', endsAt: now - 1000 }, now)).toBe(0);
  });
});
