import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/* ============================================================
   Schemas Zod (o "portão" que valida a saída da IA) +
   definições de ferramenta (o "guia" que estrutura a saída).
   Mantê-los em sincronia. A UI nunca recebe forma inesperada:
   tudo passa por estes schemas antes de ser renderizado.
   ============================================================ */

export const HEAT_LEVELS = [
  'baixo',
  'médio-baixo',
  'médio',
  'médio-alto',
  'alto',
  'sem fogo',
] as const;

/** Aceita variações de grafia ("medio alto", "Médio-Alto"); valor irreconhecível
    vira undefined em vez de reprovar a receita inteira na validação. */
export const zHeat = z.preprocess((v) => {
  if (typeof v !== 'string') return undefined;
  const norm = v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '-');
  const map: Record<string, (typeof HEAT_LEVELS)[number]> = {
    baixo: 'baixo',
    'medio-baixo': 'médio-baixo',
    medio: 'médio',
    'medio-alto': 'médio-alto',
    alto: 'alto',
    'sem-fogo': 'sem fogo',
    desligado: 'sem fogo',
  };
  return map[norm];
}, z.enum(HEAT_LEVELS).optional());

// ---------- Ingrediente / Checklist ----------

export const zIngredient = z.object({
  name: z.string(),
  quantity: z.number().optional(),
  unit: z.string(),
  note: z.string().optional(),
  essential: z.boolean(),
  role: z.string().optional(),
});

export const zChecklist = z.object({
  servings: z.string(),
  anchorNote: z.string().optional(),
  ingredients: z.array(zIngredient).min(1),
});

// ---------- Substituição ----------

export const zSubstitution = z.object({
  substitute: z.string(),
  ratio: z.string(),
  impactNote: z.string(),
});

// ---------- Receita completa ----------

export const zRecipeStep = z.object({
  n: z.number(),
  title: z.string().optional(),
  instruction: z.string(),
  equipment: z.string().optional(),
  heat: zHeat,
  durationSeconds: z.number().optional(),
  controlPoints: z.array(z.string()).default([]),
  adjustments: z.array(z.string()).default([]),
  scientificNote: z.string().optional(),
});

export const zRecipe = z.object({
  recipeName: z.string(),
  servings: z.string(),
  summary: z.string(),
  flavorExplanation: z.string().default(''),
  miseEnPlace: z.array(z.string()).default([]),
  equipmentUsed: z.array(z.string()).default([]),
  steps: z.array(zRecipeStep).min(1),
  pairings: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

// ---------- Ajuda rápida (modo sous-chef) ----------

export const zQuickHelp = z.object({
  diagnosis: z.string(),
  fixSteps: z.array(z.string()).min(1),
});

// Tipos inferidos = tipos canônicos de domínio (dados vindos da IA).
export type IngredientData = z.infer<typeof zIngredient>;
export type Checklist = z.infer<typeof zChecklist>;
export type Substitution = z.infer<typeof zSubstitution>;
export type RecipeStep = z.infer<typeof zRecipeStep>;
export type Recipe = z.infer<typeof zRecipe>;
export type QuickHelp = z.infer<typeof zQuickHelp>;

/* ============================================================
   Ferramentas Anthropic (tool use forçado → JSON estruturado)
   ============================================================ */

export const checklistTool: Anthropic.Tool = {
  name: 'emit_checklist',
  description: 'Emite a lista de ingredientes (ainda não a receita completa).',
  input_schema: {
    type: 'object',
    properties: {
      servings: {
        type: 'string',
        description: 'Porções que a receita rende com base no âncora. Ex: "Rende ~3 porções".',
      },
      anchorNote: {
        type: 'string',
        description: 'Como o ingrediente âncora foi usado para porcionar. Vazio se não houver âncora.',
      },
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            quantity: {
              type: 'number',
              description: 'Quantidade numérica. Omitir para itens inteiros contados (ex: 2 cebolas → quantity 2, unit "unidade").',
            },
            unit: {
              type: 'string',
              description: 'g, ml, unidade, dente, colher de sopa, colher de chá, etc. Prefira g e ml.',
            },
            note: { type: 'string', description: 'Observação curta opcional.' },
            essential: {
              type: 'boolean',
              description: 'true se estrutural; false se finalização/opcional.',
            },
            role: { type: 'string', description: 'Papel técnico (ex: "gordura de selagem", "ácido").' },
          },
          required: ['name', 'unit', 'essential'],
        },
      },
    },
    required: ['servings', 'ingredients'],
  },
};

export const substitutionTool: Anthropic.Tool = {
  name: 'emit_substitution',
  description: 'Emite UMA sugestão de substituição prática para um ingrediente ausente.',
  input_schema: {
    type: 'object',
    properties: {
      substitute: {
        type: 'string',
        description: 'Substituto sugerido. Ex: "Óleo de soja + manteiga integral".',
      },
      ratio: { type: 'string', description: 'Proporção prática de troca, com g/ml.' },
      impactNote: {
        type: 'string',
        description: 'O que muda na prática (sabor, textura, temperatura) — 1 a 2 frases.',
      },
    },
    required: ['substitute', 'ratio', 'impactNote'],
  },
};

export const recipeTool: Anthropic.Tool = {
  name: 'emit_recipe',
  description: 'Emite a receita completa estruturada.',
  input_schema: {
    type: 'object',
    properties: {
      recipeName: { type: 'string' },
      servings: { type: 'string' },
      summary: { type: 'string', description: 'Resumo curto da receita.' },
      flavorExplanation: { type: 'string', description: 'Explicação dos sabores.' },
      miseEnPlace: {
        type: 'array',
        items: { type: 'string' },
        description:
          'TODOS os ingredientes da receita, cada um com sua quantidade final (g/ml ou unidade/dente) e o preparo prévio quando houver. Ex: "300 g de massa parafuso", "1 cebola em cubos pequenos". Nenhum ingrediente usado nos passos pode faltar aqui.',
      },
      equipmentUsed: { type: 'array', items: { type: 'string' }, description: 'Equipamentos (ex: F1, P4, PP).' },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            n: { type: 'integer' },
            title: { type: 'string', description: 'Título curto (≤ 40 caracteres) para o modo stories.' },
            instruction: { type: 'string', description: 'Verbo no imperativo, direto.' },
            equipment: { type: 'string', description: 'Equipamento nomeado (ex: F1, P4, PP).' },
            heat: { type: 'string', enum: [...HEAT_LEVELS], description: 'Nível do fogo.' },
            durationSeconds: {
              type: 'integer',
              description: 'Segundos, quando o passo tem tempo definido. Omitir se não houver.',
            },
            controlPoints: { type: 'array', items: { type: 'string' }, description: 'O que observar visual/termicamente.' },
            adjustments: { type: 'array', items: { type: 'string' }, description: 'O que mudar se X não funcionar.' },
            scientificNote: { type: 'string', description: 'Embasamento físico-químico curto.' },
          },
          required: ['n', 'instruction'],
        },
      },
      pairings: { type: 'array', items: { type: 'string' }, description: 'Sugestões de acompanhamento.' },
      warnings: { type: 'array', items: { type: 'string' }, description: 'Alertas (ex: lactante). Vazio se nada.' },
    },
    required: ['recipeName', 'servings', 'summary', 'steps'],
  },
};

export const quickHelpTool: Anthropic.Tool = {
  name: 'emit_quick_help',
  description: 'Emite diagnóstico rápido e ações para resolver um problema no passo atual.',
  input_schema: {
    type: 'object',
    properties: {
      diagnosis: { type: 'string', description: 'Diagnóstico em 1 frase.' },
      fixSteps: { type: 'array', items: { type: 'string' }, description: '2 a 4 ações imperativas e diretas.' },
    },
    required: ['diagnosis', 'fixSteps'],
  },
};
