import { getAiMode } from '../lib/storage';
import type { AiApi } from './contracts';
import { liveAi } from './live';
import { mockAi } from './mocks';

// Escolhe a implementação por chamada (o modo pode mudar em Ajustes sem reload).
function impl(): AiApi {
  return getAiMode() === 'mock' ? mockAi : liveAi;
}

export const ai: AiApi = {
  generateChecklist: (input, onProgress) => impl().generateChecklist(input, onProgress),
  suggestSubstitution: (req) => impl().suggestSubstitution(req),
  generateRecipe: (req, onProgress) => impl().generateRecipe(req, onProgress),
  quickHelp: (req) => impl().quickHelp(req),
};

export { MissingKeyError, AiFormatError, AiStalledError } from './client';
export type { AiApi, RecipeRequest, SubstitutionRequest, QuickHelpRequest } from './contracts';
