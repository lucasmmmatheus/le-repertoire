import type Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import { getApiKey } from '../lib/storage';

export const MODELS = {
  generation: 'claude-sonnet-4-6',
  quickHelp: 'claude-haiku-4-5-20251001',
} as const;

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
/** Aborta se o stream ficar este tempo sem receber nenhum byte. */
const STALL_TIMEOUT_MS = 45_000;

/** Erros tipados para a UI tratar com mensagens amigáveis. */
export class MissingKeyError extends Error {
  constructor() {
    super('Configure sua API key da Anthropic em Ajustes para gerar receitas.');
    this.name = 'MissingKeyError';
  }
}
export class AiFormatError extends Error {
  constructor(detail: string) {
    super(`A IA devolveu algo fora do formato esperado. ${detail}`);
    this.name = 'AiFormatError';
  }
}
export class AiStalledError extends Error {
  constructor() {
    super('A conexão com a IA travou no meio do caminho. Verifique a internet e tente de novo.');
    this.name = 'AiStalledError';
  }
}

interface CreateBody {
  model: string;
  max_tokens: number;
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  tools: Anthropic.Tool[];
  tool_choice: { type: 'tool'; name: string };
}

interface StreamResult {
  toolUse: { id: string; name: string; input: unknown } | null;
  stopReason: string | null;
}

/** Eventos SSE da API que interessam aqui (subset). */
interface SseEvent {
  type: string;
  content_block?: { type: string; id?: string; name?: string };
  delta?: { type?: string; partial_json?: string; stop_reason?: string };
  error?: { message?: string };
}

/**
 * Chamada direta à API REST da Anthropic a partir do navegador, em STREAMING.
 * (Evita empacotar o SDK Node — usamos o SDK só para tipos.)
 * A key fica local; o header dangerous-direct-browser-access libera o CORS.
 *
 * Streaming resolve dois problemas reais no celular:
 * - feedback de progresso (onDelta recebe o total de caracteres já gerados);
 * - detecção de conexão travada (timeout de inatividade + abort), em vez de
 *   um fetch que nunca resolve e deixa o loading infinito.
 */
async function messagesCreateStream(
  body: CreateBody,
  onDelta?: (totalChars: number) => void,
): Promise<StreamResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new MissingKeyError();

  const controller = new AbortController();
  let stallTimer = window.setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
  const resetStall = () => {
    window.clearTimeout(stallTimer);
    stallTimer = window.setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
  };

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = '';
      try {
        const j = (await res.json()) as { error?: { message?: string } };
        detail = j.error?.message ?? '';
      } catch {
        /* corpo não-JSON */
      }
      const err = new Error(detail || `HTTP ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    if (!res.body) throw new Error('Resposta sem corpo (stream indisponível).');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let toolId = '';
    let toolName = '';
    let json = '';
    let stopReason: string | null = null;

    const handleEvent = (ev: SseEvent) => {
      if (ev.type === 'content_block_start' && ev.content_block?.type === 'tool_use') {
        toolId = ev.content_block.id ?? '';
        toolName = ev.content_block.name ?? '';
      } else if (ev.type === 'content_block_delta' && ev.delta?.type === 'input_json_delta') {
        json += ev.delta.partial_json ?? '';
        onDelta?.(json.length);
      } else if (ev.type === 'message_delta' && ev.delta?.stop_reason) {
        stopReason = ev.delta.stop_reason;
      } else if (ev.type === 'error') {
        throw new Error(ev.error?.message || 'Erro no stream da API.');
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      resetStall();
      buffer += decoder.decode(value, { stream: true });
      // SSE: cada linha "data: {...}"; eventos separados por linha em branco.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        handleEvent(JSON.parse(payload) as SseEvent);
      }
    }

    if (!toolId || !json) return { toolUse: null, stopReason };
    try {
      return { toolUse: { id: toolId, name: toolName, input: JSON.parse(json) }, stopReason };
    } catch {
      // JSON truncado (ex.: cortado por max_tokens) — sem input utilizável.
      return { toolUse: null, stopReason };
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw new AiStalledError();
    throw e;
  } finally {
    window.clearTimeout(stallTimer);
  }
}

interface RunArgs<T> {
  model: string;
  system: Anthropic.TextBlockParam[];
  userPrompt: string;
  tool: Anthropic.Tool;
  // Input desacoplado (unknown) → T é o tipo de SAÍDA (com defaults do Zod aplicados).
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  maxTokens: number;
  /** Recebe um % aproximado (0–100) conforme a resposta vai chegando. */
  onProgress?: (pct: number) => void;
  /** Tamanho típico da resposta em caracteres — calibra o % aproximado. */
  expectedChars?: number;
}

/**
 * Força uma ferramenta, valida o resultado com Zod e, se falhar,
 * faz UM retry de reparo devolvendo os erros via tool_result.
 * Garante que a UI só recebe dados já validados.
 */
export async function runStructured<T>(args: RunArgs<T>): Promise<T> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: args.userPrompt }];
  const expected = args.expectedChars ?? 2000;
  let lastPct = -1;
  const onDelta = (chars: number) => {
    const pct = Math.min(95, Math.round((chars / expected) * 100));
    if (pct > lastPct) {
      lastPct = pct;
      args.onProgress?.(pct);
    }
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const { toolUse, stopReason } = await messagesCreateStream(
      {
        model: args.model,
        max_tokens: args.maxTokens,
        system: args.system,
        tools: [args.tool],
        tool_choice: { type: 'tool', name: args.tool.name },
        messages,
      },
      onDelta,
    );

    if (!toolUse && stopReason === 'max_tokens') {
      throw new AiFormatError('A resposta ficou longa demais e foi cortada. Tente de novo.');
    }

    const parsed = args.schema.safeParse(toolUse?.input);
    if (parsed.success) {
      args.onProgress?.(100);
      return parsed.data;
    }

    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`)
      .join('; ');

    if (attempt === 1 || !toolUse) throw new AiFormatError(detail);

    // Retry de reparo: ecoa a chamada e devolve os erros como tool_result.
    messages.push(
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: toolUse.id, name: toolUse.name, input: toolUse.input }],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `A saída não passou na validação: ${detail}. Reemita corrigida usando a ferramenta ${args.tool.name}.`,
          },
        ],
      },
    );
  }

  throw new AiFormatError('Falha inesperada.');
}
