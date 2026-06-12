# Le Répertoire

Gerador de receitas técnico‑científico com **checklist dinâmico por IA**. App web mobile‑first (PWA, instalável no celular). React + TypeScript + Vite.

Diferencial: além de gerar a receita, a IA acompanha o checklist de ingredientes — sugere substituições com impacto técnico e **reescreve a receita conforme as mudanças** (comportamento híbrido: a substituição aceita atualiza o item na hora; o recálculo completo acontece em “Reavaliar Receita”).

## Rodar

```bash
npm install
npm run dev      # abre em http://localhost:5173 (acessível na rede p/ testar no celular)
```

Outros comandos:

```bash
npm run build    # typecheck (tsc) + build de produção em dist/
npm run test     # testes unitários (vitest)
npm run preview  # serve o build de produção
```

## Usar

1. Abra **Ajustes** e cole sua **API key da Anthropic** (console.anthropic.com). Ela fica salva **só no seu aparelho** (localStorage); as chamadas vão direto do navegador para a API.
2. Ou escolha o modo **Demonstração** em Ajustes para navegar com uma receita de exemplo, sem chave e sem custo.
3. Página inicial → pedido (“massa com guisado”), ingrediente âncora opcional (“600g de guisado”) e estilo → **Gerar receita** → checklist → **Reavaliar Receita** → modo **sous‑chef** (stories com cronômetros por passo).

## Como a IA é alimentada

O “cérebro” (`src/ai/prompts.ts`) monta o system prompt com as regras da spec **+ as três tabelas de referência** importadas de `Markdown para criação/` (`temperaturas_proteinas.md`, `pontos_de_fumaca.md`, `glossario_gaucho.md`). Edite esses `.md` para ajustar o conhecimento técnico. Esse bloco é estático e vai com **prompt caching** para baratear/acelerar.

- Geração de checklist/receita: `claude-sonnet-4-6`. Ajuda rápida do sous‑chef: `claude-haiku-4-5`.
- Toda saída da IA passa por **schemas Zod** (`src/ai/schemas.ts`) com 1 retry de reparo — a UI nunca recebe formato inesperado.

## Publicar / instalar no celular

`npm run build` gera `dist/` (estático). Suba em qualquer host estático (Vercel, Netlify, GitHub Pages). No celular, abra a URL e use “Adicionar à tela inicial”.

> Segurança: a API key fica no navegador (ok para uso pessoal de 1 pessoa). Para compartilhar publicamente, troque a chamada direta por um proxy serverless que esconda a chave.

## Limitações conhecidas

- O fluxo em andamento (checklist, receita, cronômetros) fica **salvo no aparelho**: voltar ou fechar por engano não perde nada, e o botão voltar navega entre as telas em vez de sair do app.
- Cronômetros usam horário absoluto (`endsAt`): seguem corretos ao trocar de app e até ao fechar/reabrir. O que um PWA **não** consegue é tocar o alarme na hora exata com o app 100% fechado (exigiria app nativo) — em segundo plano, a notificação sai via service worker quando o navegador permite.
- No modo sous-chef e durante gerações de IA, o app mantém a **tela acesa** (Wake Lock), quando o navegador suporta.
- Sem contas/multiusuário.

## Estrutura

```
src/ai/        cliente (fetch), prompts, schemas (Zod + tools), funções, mocks
src/store/     useAppStore (fluxo/estado), useTimers (cronômetros)
src/pages/     Home, Checklist, Recipe, SousChef, Settings, Saved
src/components/ Brand, TopBar, ErrorNote, ErrorBoundary
src/lib/       storage, errors, format, sound, notify
Markdown para criação/  spec + referências técnicas (alimentam a IA)
```
