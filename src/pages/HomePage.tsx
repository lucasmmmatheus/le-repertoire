import { Brand } from '../components/Brand';
import { ErrorNote } from '../components/ErrorNote';
import { ProgressBar } from '../components/ProgressBar';
import { getAiMode, hasApiKey } from '../lib/storage';
import { useApp } from '../store/useAppStore';

const STYLE_EXAMPLES = [
  'janta elaborada',
  'almoço rápido em 30 min',
  'lanche saboroso',
  'jantar pra um dia frio',
];

export function HomePage() {
  const input = useApp((s) => s.input);
  const setInput = useApp((s) => s.setInput);
  const busy = useApp((s) => s.busy);
  const progress = useApp((s) => s.progress);
  const error = useApp((s) => s.error);
  const clearError = useApp((s) => s.clearError);
  const generateChecklist = useApp((s) => s.generateChecklist);
  const go = useApp((s) => s.go);

  const loading = busy === 'checklist';
  const canGenerate = input.query.trim().length > 0 && !loading;

  return (
    <div className="app-shell">
      <Brand />
      <main className="screen">
        <div className="stack">
          <label className="field">
            <span className="field__label">O que você quer cozinhar?</span>
            <textarea
              className="textarea"
              placeholder="massa com guisado"
              value={input.query}
              onChange={(e) => setInput({ query: e.target.value })}
              rows={2}
            />
          </label>

          <label className="field">
            <span className="field__label">
              Ingrediente âncora <span className="field__hint">opcional · base para porcionar</span>
            </span>
            <input
              className="input"
              placeholder="600g de guisado"
              value={input.anchor ?? ''}
              onChange={(e) => setInput({ anchor: e.target.value })}
            />
          </label>

          <label className="field">
            <span className="field__label">
              Estilo / restrições do dia <span className="field__hint">opcional</span>
            </span>
            <input
              className="input"
              placeholder="janta elaborada"
              value={input.style ?? ''}
              onChange={(e) => setInput({ style: e.target.value })}
            />
            <div className="example">
              ex.:{' '}
              {STYLE_EXAMPLES.map((ex, i) => (
                <span key={ex}>
                  {i > 0 && ' · '}
                  <b onClick={() => setInput({ style: ex })}>{ex}</b>
                </span>
              ))}
            </div>
          </label>

          {error && <ErrorNote message={error} onDismiss={clearError} />}
        </div>

        <div className="action-bar">
          {loading && progress != null && <ProgressBar pct={progress} />}
          <button
            className="btn btn--primary btn--block btn--lg"
            disabled={!canGenerate}
            onClick={() => void generateChecklist()}
          >
            {loading ? (
              <>
                <span className="spinner" /> Gerando…{progress != null ? ` ${progress}%` : ''}
              </>
            ) : (
              <>✦ Gerar receita</>
            )}
          </button>
          <div className="home-foot">
            <button className="btn btn--quiet" onClick={() => go('saved')}>
              Receitas salvas
            </button>
            <button className="btn btn--quiet" onClick={() => go('settings')}>
              Ajustes
            </button>
          </div>
          {getAiMode() === 'mock' ? (
            <p className="center faint" style={{ fontSize: 12 }}>
              modo demonstração ativo · troque em Ajustes
            </p>
          ) : (
            !hasApiKey() && (
              <p className="center faint" style={{ fontSize: 12 }}>
                Adicione sua API key em Ajustes para gerar receitas — ou use o modo demonstração.
              </p>
            )
          )}
        </div>
      </main>
    </div>
  );
}
