import { AiFormatError, MissingKeyError } from '../ai';

/** Converte qualquer erro (SDK, rede, validação) em mensagem amigável em PT-BR. */
export function errorMessage(e: unknown): string {
  if (e instanceof MissingKeyError) return e.message;
  if (e instanceof AiFormatError) return e.message;

  if (e && typeof e === 'object' && 'status' in e) {
    const status = (e as { status?: number }).status;
    if (status === 401) return 'API key inválida ou sem permissão. Revise em Ajustes.';
    if (status === 429) return 'Limite de uso da API atingido. Aguarde um instante e tente de novo.';
    if (status === 400) return 'A requisição foi recusada pela API. Tente reformular o pedido.';
    if (status && status >= 500) return 'A API da Anthropic está instável agora. Tente novamente.';
  }
  if (e instanceof Error && /fetch|network|Failed to/i.test(e.message)) {
    return 'Sem conexão com a API. Verifique a internet e tente de novo.';
  }
  if (e instanceof Error) return e.message;
  return 'Algo deu errado. Tente novamente.';
}
