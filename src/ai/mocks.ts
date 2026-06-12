import type { AiApi } from './contracts';
import { zChecklist, zQuickHelp, zRecipe, zSubstitution } from './schemas';

/* Fixtures determinísticas para testar a UI inteira sem API key e sem custo.
   Tudo passa pelos schemas (.parse) — garante que o mock é sempre válido. */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Espera `ms` reportando progresso ~0→90% no caminho (simula o streaming real). */
async function delayWithProgress(ms: number, onProgress?: (pct: number) => void): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < ms) {
    await delay(80);
    onProgress?.(Math.min(90, Math.round(((Date.now() - startedAt) / ms) * 100)));
  }
  onProgress?.(100);
}

const checklist = zChecklist.parse({
  servings: 'Rende ~3 porções (base: 600 g de guisado)',
  anchorNote: 'Massa e molho porcionados a partir dos 600 g de guisado (~1 : 0,5 carne : massa seca).',
  ingredients: [
    { name: 'Guisado (carne moída)', quantity: 600, unit: 'g', essential: true, role: 'proteína âncora', note: 'à temperatura ambiente' },
    { name: 'Massa curta (parafuso)', quantity: 300, unit: 'g', essential: true, role: 'carboidrato base' },
    { name: 'Cebola', quantity: 1, unit: 'unidade', essential: true, role: 'base aromática' },
    { name: 'Alho', quantity: 3, unit: 'dente', essential: true, role: 'base aromática' },
    { name: 'Extrato de tomate', quantity: 70, unit: 'g', essential: true, role: 'corpo do molho' },
    { name: 'Tomate pelado', quantity: 400, unit: 'g', essential: true, role: 'molho' },
    { name: 'Ghee', quantity: 20, unit: 'g', essential: false, role: 'gordura de selagem' },
    { name: 'Azeite de oliva extravirgem', quantity: 15, unit: 'ml', essential: false, role: 'finalização' },
    { name: 'Sal', quantity: 8, unit: 'g', essential: true, role: 'tempero' },
    { name: 'Pimenta-do-reino', quantity: 1, unit: 'g', essential: false, role: 'tempero' },
    { name: 'Manjericão fresco', unit: 'folhas', essential: false, role: 'finalização aromática' },
  ],
});

const recipe = zRecipe.parse({
  recipeName: 'Parafuso com Guisado ao Sugo',
  servings: 'Rende ~3 porções (base: 600 g de guisado)',
  summary:
    'Guisado selado para desenvolver fond, molho de tomate encorpado e massa al dente unida com a água de cozimento para dar liga.',
  flavorExplanation:
    'A selagem do guisado gera compostos da reação de Maillard (sabor tostado); o extrato refogado carameliza e remove o gosto cru; o amido da água da massa emulsiona o molho.',
  miseEnPlace: [
    '600 g de guisado (carne moída) à temperatura ambiente',
    '300 g de massa curta (parafuso)',
    '1 cebola em cubos pequenos',
    '3 dentes de alho picados',
    '70 g de extrato de tomate',
    '400 g de tomate pelado, amassado',
    '20 g de ghee',
    '15 ml de azeite de oliva extravirgem (finalização)',
    '8 g de sal + 30 g para a água da massa',
    '1 g de pimenta-do-reino moída',
    'Folhas de manjericão fresco lavadas e secas',
  ],
  equipmentUsed: ['P3 (molho e guisado)', 'P4 (água da massa)'],
  steps: [
    {
      n: 1,
      title: 'Água da massa',
      instruction: 'Na P4: ferva 3 L de água com 30 g de sal.',
      equipment: 'P4',
      heat: 'alto',
      controlPoints: ['Fervura plena, bolhas vigorosas'],
    },
    {
      n: 2,
      title: 'Refogue os aromáticos',
      instruction: 'Na P3: aqueça 15 ml de óleo em fogo médio e refogue cebola e alho.',
      equipment: 'P3',
      heat: 'médio',
      durationSeconds: 180,
      controlPoints: ['Cebola translúcida, sem dourar forte'],
      scientificNote: 'Translucidez = liberação de água/açúcares; evitar Maillard intenso aqui para não amargar o alho.',
    },
    {
      n: 3,
      title: 'Sele o guisado',
      instruction: 'Na P3: suba para médio-alto e junte os 600 g de guisado, espalhando no fundo.',
      equipment: 'P3',
      heat: 'médio-alto',
      durationSeconds: 360,
      controlPoints: ['Crosta dourada no fundo (fond)', 'Sem água acumulada na panela'],
      adjustments: ['Se soltar muita água, aumente o fogo e espere evaporar antes de dourar'],
      scientificNote: 'Maillard a 140–165°C na superfície. O inox tem alta inércia: recupere a temperatura antes de mexer.',
    },
    {
      n: 4,
      title: 'Extrato e tomate',
      instruction: 'Na P3: adicione 70 g de extrato, refogue 60 s, então junte 400 g de tomate pelado amassado.',
      equipment: 'P3',
      heat: 'médio',
      durationSeconds: 60,
      controlPoints: ['Extrato com cor mais escura e cheiro adocicado'],
      scientificNote: 'Refogar o extrato carameliza açúcares e elimina o gosto cru de lata.',
    },
    {
      n: 5,
      title: 'Cozinhe o molho',
      instruction: 'Na P3: reduza para médio-baixo e cozinhe o molho, mexendo de vez em quando.',
      equipment: 'P3',
      heat: 'médio-baixo',
      durationSeconds: 600,
      controlPoints: ['Molho encorpado: a colher risca o fundo e ele demora a fechar'],
    },
    {
      n: 6,
      title: 'Cozinhe a massa',
      instruction: 'Na P4: cozinhe os 300 g de massa na água fervente.',
      equipment: 'P4',
      heat: 'alto',
      durationSeconds: 540,
      controlPoints: ['Al dente: núcleo levemente firme ao morder'],
      adjustments: ['Reserve 100 ml da água da massa antes de escorrer'],
    },
    {
      n: 7,
      title: 'Una massa e molho',
      instruction: 'Na P3: junte a massa escorrida ao molho com um fio da água reservada e misture.',
      equipment: 'P3',
      heat: 'médio-baixo',
      durationSeconds: 60,
      scientificNote: 'O amido da água de cozimento emulsiona a gordura do molho, dando liga e brilho.',
    },
    {
      n: 8,
      title: 'Finalize',
      instruction: 'Na P3 (fogo desligado): incorpore 10 g de manteiga e o manjericão.',
      equipment: 'P3',
      heat: 'sem fogo',
      controlPoints: ['Brilho do molho ao montar a emulsão final'],
    },
  ],
  pairings: ['Salada verde com vinagrete leve', 'Pão para o molho'],
  warnings: ['Lactante: dispense vinho/álcool no molho. Sem cafeína nesta receita.'],
});

const quickHelp = zQuickHelp.parse({
  diagnosis: 'O molho está ralo porque ainda não reduziu o suficiente.',
  fixSteps: [
    'Suba para fogo médio e deixe abrir fervura sem tampa.',
    'Cozinhe até a colher riscar o fundo (~5 min).',
    'Se precisar acelerar, escorra parte do líquido e reserve.',
  ],
});

export const mockAi: AiApi = {
  async generateChecklist(_input, onProgress) {
    await delayWithProgress(700, onProgress);
    return structuredClone(checklist);
  },
  async suggestSubstitution(req) {
    await delay(500);
    if (req.userProposal) {
      return zSubstitution.parse({
        substitute: req.userProposal,
        ratio: `Use a mesma quantidade indicada para ${req.ingredientName}`,
        impactNote: `(mock) Avaliação da sua escolha "${req.userProposal}": funciona nesta receita; ajuste sal e gordura no final.`,
      });
    }
    const name = req.ingredientName.toLowerCase();
    if (name.includes('ghee')) {
      const first = 'Óleo de soja + manteiga integral';
      if (!req.avoid?.includes(first)) {
        return zSubstitution.parse({
          substitute: first,
          ratio: '15 ml de óleo de soja + 10 g de manteiga integral no lugar de 20 g de ghee',
          impactNote:
            'O óleo segura a temperatura de selagem (ponto de fumaça ~238°C); a manteiga entra no fim, fora do pico de calor, para devolver o sabor lácteo sem queimar os sólidos do leite (queimam a ~150°C).',
        });
      }
      return zSubstitution.parse({
        substitute: 'Banha de porco',
        ratio: '20 g de banha no lugar de 20 g de ghee',
        impactNote: 'Ponto de fumaça ~188°C, suficiente para refogar o guisado; sabor mais marcante, levemente suíno.',
      });
    }
    return zSubstitution.parse({
      substitute: `Alternativa para ${req.ingredientName}`,
      ratio: 'Mesma quantidade indicada na receita',
      impactNote: '(mock) Ajuste conforme o que você tiver em casa.',
    });
  },
  async generateRecipe(_req, onProgress) {
    await delayWithProgress(2400, onProgress);
    return structuredClone(recipe);
  },
  async quickHelp() {
    await delay(400);
    return structuredClone(quickHelp);
  },
};
