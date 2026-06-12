import { MODELS, runStructured } from './client';
import type { AiApi } from './contracts';
import { generationSystem, quickHelpSystem } from './prompts';
import {
  checklistTool,
  quickHelpTool,
  recipeTool,
  substitutionTool,
  zChecklist,
  zQuickHelp,
  zRecipe,
  zSubstitution,
} from './schemas';

const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join('\n');

/** Implementação real: cada função força sua ferramenta e retorna dado já validado. */
export const liveAi: AiApi = {
  generateChecklist(input, onProgress) {
    const userPrompt = lines(
      'Crie a LISTA DE INGREDIENTES (ainda NÃO a receita completa) para o pedido abaixo.',
      '',
      `Pedido: "${input.query}"`,
      input.anchor
        ? `Ingrediente âncora (já tenho em casa): ${input.anchor}. Porcione TODA a receita a partir dele e diga as porções.`
        : 'Sem ingrediente âncora — assuma 2 porções.',
      input.style ? `Estilo desejado: ${input.style}.` : '',
      '',
      'Liste cada ingrediente com quantidade (g/ml; ou unidade/dente para itens inteiros), papel técnico e essential (false para finalização/opcional). NÃO escreva o passo a passo agora. Use a ferramenta emit_checklist.',
    );
    return runStructured({
      model: MODELS.generation,
      system: generationSystem(),
      userPrompt,
      tool: checklistTool,
      schema: zChecklist,
      maxTokens: 1500,
      onProgress,
      expectedChars: 900,
    });
  },

  suggestSubstitution(req) {
    const context = `Na receita "${req.query}", o usuário NÃO TEM este ingrediente: ${req.ingredientName}${
      req.quantityLabel ? ` (${req.quantityLabel})` : ''
    }${req.role ? `, papel: ${req.role}` : ''}.`;
    const userPrompt = req.userProposal
      ? lines(
          context,
          `Ele decidiu substituir pela PRÓPRIA escolha: "${req.userProposal}".`,
          'AVALIE A ESCOLHA DELE — não sugira outra coisa. O campo "substitute" deve ser exatamente a proposta dele (só normalize a grafia). Calcule "ratio" (proporção prática em g/ml PARA a proposta dele) e "impactNote" (impacto real dessa escolha na receita).',
          'Se a escolha for tecnicamente arriscada (ponto de fumaça, temperatura, textura), avise no impactNote — mas respeite a escolha. Use a ferramenta emit_substitution.',
        )
      : lines(
          context,
          'Sugira UMA substituição prática e comum de ter em casa, com proporção (g/ml) e impacto na receita.',
          req.avoid?.length ? `NÃO repita estas sugestões já dadas: ${req.avoid.join(', ')}.` : '',
          'Se for gordura ou proteína, respeite pontos de fumaça e temperaturas. Use a ferramenta emit_substitution.',
        );
    return runStructured({
      model: MODELS.generation,
      system: generationSystem(),
      userPrompt,
      tool: substitutionTool,
      schema: zSubstitution,
      maxTokens: 600,
    });
  },

  generateRecipe(req, onProgress) {
    const { input, ingredientLines } = req;
    const userPrompt = lines(
      'Gere a RECEITA COMPLETA com base na lista final confirmada pelo usuário.',
      '',
      `Pedido original: "${input.query}"`,
      input.anchor ? `Âncora: ${input.anchor} (porcione a partir dele).` : '',
      input.style ? `Estilo: ${input.style}.` : '',
      '',
      'Ingredientes confirmados:',
      ...ingredientLines,
      '',
      'Siga TODAS as diretrizes: equipamento e fogo nomeados em cada etapa, g/ml, pontos de controle, variáveis de ajuste, embasamento físico-químico e warnings de lactante quando pertinente. Todo passo com tempo definido traz durationSeconds. Dê títulos curtos aos passos para o modo stories.',
      'No miseEnPlace, liste TODOS os ingredientes da receita com as quantidades finais (já com as substituições aplicadas) e o preparo prévio de cada um — nenhum ingrediente dos passos pode ficar de fora. Use a ferramenta emit_recipe.',
    );
    return runStructured({
      model: MODELS.generation,
      system: generationSystem(),
      userPrompt,
      tool: recipeTool,
      schema: zRecipe,
      maxTokens: 6000,
      onProgress,
      expectedChars: 4500,
    });
  },

  quickHelp(req) {
    const userPrompt = lines(
      'MODO SOUS-CHEF — cozinhando agora. Resposta rápida e curta.',
      `Passo atual: "${req.stepInstruction}"${
        req.equipment ? ` [${req.equipment}${req.heat ? `, fogo ${req.heat}` : ''}]` : ''
      }.`,
      `Problema: "${req.problem}".`,
      'Dê 1 diagnóstico curto e 2 a 4 ações imperativas. Use a ferramenta emit_quick_help.',
    );
    return runStructured({
      model: MODELS.quickHelp,
      system: quickHelpSystem(),
      userPrompt,
      tool: quickHelpTool,
      schema: zQuickHelp,
      maxTokens: 500,
    });
  },
};
