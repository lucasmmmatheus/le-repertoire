import { useEffect, useState } from 'react';
import { ai } from '../ai';
import { ErrorNote } from '../components/ErrorNote';
import { ProgressBar } from '../components/ProgressBar';
import { TopBar } from '../components/TopBar';
import { errorMessage } from '../lib/errors';
import { useApp } from '../store/useAppStore';
import type { ChecklistEntry } from '../types';

interface Draft {
  entryId: string;
  substitute: string;
  ratio: string;
  impactNote: string;
  /** Última sugestão vinda da IA — para detectar quando o usuário escreveu a própria substituição. */
  aiSubstitute: string;
  suggested: string[];
  loading: boolean;
  /** Avaliando a substituição escrita pelo usuário, antes de aplicar. */
  evaluating: boolean;
  error: string | null;
}

/** O texto difere da sugestão da IA → é uma escolha do usuário. */
function isCustom(d: Draft): boolean {
  return d.substitute.trim().toLowerCase() !== d.aiSubstitute.trim().toLowerCase();
}

function qtyLabel(e: ChecklistEntry): string {
  const { quantity, unit } = e.ingredient;
  if (quantity == null) return unit;
  return `${quantity} ${unit}`;
}

export function ChecklistPage() {
  const entries = useApp((s) => s.entries);
  const servings = useApp((s) => s.servings);
  const anchorNote = useApp((s) => s.anchorNote);
  const input = useApp((s) => s.input);
  const busy = useApp((s) => s.busy);
  const progress = useApp((s) => s.progress);
  const error = useApp((s) => s.error);
  const clearError = useApp((s) => s.clearError);
  const markHave = useApp((s) => s.markHave);
  const applySubstitution = useApp((s) => s.applySubstitution);
  const removeEntry = useApp((s) => s.removeEntry);
  const reopenEntry = useApp((s) => s.reopenEntry);
  const generateRecipe = useApp((s) => s.generateRecipe);
  const go = useApp((s) => s.go);

  const [draft, setDraft] = useState<Draft | null>(null);
  const loadingRecipe = busy === 'recipe';

  // Traz a caixa de substituição para a vista quando abre/carrega.
  useEffect(() => {
    if (draft) {
      document.getElementById('subbox-active')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [draft?.entryId, draft?.loading]);

  async function fetchSuggestion(entry: ChecklistEntry, avoid: string[], userProposal?: string) {
    return ai.suggestSubstitution({
      query: input.query,
      ingredientName: entry.ingredient.name,
      quantityLabel: qtyLabel(entry),
      role: entry.ingredient.role,
      avoid: avoid.length ? avoid : undefined,
      userProposal,
    });
  }

  async function openSubstitution(entry: ChecklistEntry) {
    setDraft({
      entryId: entry.id,
      substitute: '',
      ratio: '',
      impactNote: '',
      aiSubstitute: '',
      suggested: [],
      loading: true,
      evaluating: false,
      error: null,
    });
    try {
      const sug = await fetchSuggestion(entry, []);
      setDraft({
        entryId: entry.id,
        substitute: sug.substitute,
        ratio: sug.ratio,
        impactNote: sug.impactNote,
        aiSubstitute: sug.substitute,
        suggested: [sug.substitute],
        loading: false,
        evaluating: false,
        error: null,
      });
    } catch (e) {
      setDraft((d) => (d?.entryId === entry.id ? { ...d, loading: false, error: errorMessage(e) } : d));
    }
  }

  async function regenerate(entry: ChecklistEntry) {
    const avoid = draft?.suggested ?? [];
    setDraft((d) => (d ? { ...d, loading: true, error: null } : d));
    try {
      const sug = await fetchSuggestion(entry, avoid);
      setDraft((d) =>
        d
          ? {
              ...d,
              substitute: sug.substitute,
              ratio: sug.ratio,
              impactNote: sug.impactNote,
              aiSubstitute: sug.substitute,
              suggested: [...d.suggested, sug.substitute],
              loading: false,
            }
          : d,
      );
    } catch (e) {
      setDraft((d) => (d ? { ...d, loading: false, error: errorMessage(e) } : d));
    }
  }

  async function accept(entry: ChecklistEntry) {
    if (!draft) return;
    const text = draft.substitute.trim();
    if (!text) return;

    // Sugestão da IA aceita como veio: aplica direto, com a proporção/impacto já mostrados.
    if (!isCustom(draft)) {
      applySubstitution(draft.entryId, {
        substitute: text,
        ratio: draft.ratio,
        impactNote: draft.impactNote,
      });
      setDraft(null);
      return;
    }

    // Texto escrito pelo usuário: a IA avalia ESTA proposta (proporção + impacto) antes de aplicar.
    setDraft((d) => (d ? { ...d, evaluating: true, error: null } : d));
    try {
      const sug = await fetchSuggestion(entry, [], text);
      applySubstitution(entry.id, {
        substitute: sug.substitute || text,
        ratio: sug.ratio,
        impactNote: sug.impactNote,
      });
      setDraft(null);
    } catch (e) {
      setDraft((d) =>
        d?.entryId === entry.id ? { ...d, evaluating: false, error: errorMessage(e) } : d,
      );
    }
  }

  /** Aplica a escolha do usuário sem avaliação (fallback quando a IA falhou). */
  function acceptWithoutEvaluation() {
    if (!draft || !draft.substitute.trim()) return;
    applySubstitution(draft.entryId, {
      substitute: draft.substitute.trim(),
      ratio: '',
      impactNote: '',
    });
    setDraft(null);
  }

  const resolved = entries.filter((e) => e.status !== 'unknown').length;

  return (
    <div className="app-shell">
      <TopBar onBack={() => go('home')} title="Checklist de Ingredientes" />
      <main className="screen">
        <div className="recipe-head">
          <div className="section-title">{input.query || 'Sua receita'}</div>
          {servings && <div className="recipe-servings">{servings}</div>}
          {anchorNote && <p className="prose" style={{ fontSize: 13 }}>{anchorNote}</p>}
        </div>

        {error && <ErrorNote message={error} onDismiss={clearError} />}

        <div className="list">
          {entries.map((e) => {
            const isOpen = draft?.entryId === e.id;
            return (
              <div
                key={e.id}
                className={[
                  'item',
                  e.status === 'have' && 'item--have',
                  e.status === 'substituted' && 'item--sub',
                  e.status === 'removed' && 'item--removed',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="item__head">
                  <div>
                    <div
                      className={
                        e.status === 'removed' ? 'item__name item__name--struck' : 'item__name'
                      }
                    >
                      {e.ingredient.name}
                    </div>
                    {e.ingredient.role && <div className="item__role">{e.ingredient.role}</div>}
                  </div>
                  <div className="item__qty">{qtyLabel(e)}</div>
                </div>

                {/* Ações por estado */}
                {!isOpen && e.status === 'unknown' && (
                  <div className="seg">
                    <button className="seg__btn" onClick={() => markHave(e.id)}>
                      Tenho
                    </button>
                    <button className="seg__btn" onClick={() => void openSubstitution(e)}>
                      Não tenho
                    </button>
                  </div>
                )}

                {!isOpen && e.status === 'have' && (
                  <div className="row" style={{ marginTop: 12 }}>
                    <span className="tag tag--have">✓ tenho</span>
                    <button className="btn btn--quiet" onClick={() => reopenEntry(e.id)}>
                      alterar
                    </button>
                  </div>
                )}

                {!isOpen && e.status === 'substituted' && e.substitution && (
                  <>
                    <p className="applied">
                      <span className="tag tag--sub">substituído</span>{' '}
                      <b>{e.substitution.substitute}</b> — {e.substitution.ratio}
                    </p>
                    <button className="btn btn--quiet" onClick={() => reopenEntry(e.id)}>
                      desfazer
                    </button>
                  </>
                )}

                {!isOpen && e.status === 'removed' && (
                  <div className="row" style={{ marginTop: 12 }}>
                    <span className="tag tag--removed">fora da receita</span>
                    <button className="btn btn--quiet" onClick={() => reopenEntry(e.id)}>
                      voltar
                    </button>
                  </div>
                )}

                {/* Caixa de substituição */}
                {isOpen && draft && (
                  <div className="subbox fadein" id="subbox-active">
                    {draft.loading ? (
                      <div className="row">
                        <span className="spinner spinner--ink" /> buscando substituição…
                      </div>
                    ) : draft.evaluating ? (
                      <div className="row">
                        <span className="spinner spinner--ink" /> avaliando sua substituição…
                      </div>
                    ) : (
                      <>
                        <div className="subbox__label">Substituir por</div>
                        <input
                          className="input"
                          placeholder="ou escreva a sua substituição"
                          value={draft.substitute}
                          onChange={(ev) =>
                            setDraft((d) => (d ? { ...d, substitute: ev.target.value } : d))
                          }
                        />
                        {isCustom(draft) ? (
                          draft.substitute.trim() !== '' && (
                            <div className="subbox__impact">
                              Substituição sua — ao usar, a IA calcula a proporção e o impacto
                              para o que você escreveu.
                            </div>
                          )
                        ) : (
                          <>
                            {draft.ratio && <div className="subbox__ratio">{draft.ratio}</div>}
                            {draft.impactNote && (
                              <div className="subbox__impact">{draft.impactNote}</div>
                            )}
                          </>
                        )}
                        {draft.error && <ErrorNote message={draft.error} />}
                        <div className="subbox__actions">
                          <button
                            className="btn btn--primary"
                            disabled={!draft.substitute.trim()}
                            onClick={() => void accept(e)}
                          >
                            {isCustom(draft) ? 'Avaliar e usar' : 'Usar substituição'}
                          </button>
                          <button className="btn btn--ghost" onClick={() => void regenerate(e)}>
                            Gerar nova sugestão
                          </button>
                        </div>
                        {draft.error && draft.substitute.trim() !== '' && (
                          <div className="subbox__actions">
                            <button className="btn btn--quiet" onClick={acceptWithoutEvaluation}>
                              Usar mesmo assim (sem avaliação)
                            </button>
                          </div>
                        )}
                        <div className="subbox__actions">
                          <button
                            className="btn btn--quiet"
                            onClick={() => {
                              removeEntry(e.id);
                              setDraft(null);
                            }}
                          >
                            Não tenho mesmo (tirar da receita)
                          </button>
                          <button className="btn btn--quiet" onClick={() => setDraft(null)}>
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Esconde a barra global enquanto o usuário resolve uma substituição,
            evitando que ela cubra os botões da caixa. */}
        {!draft && (
          <div className="action-bar">
            {loadingRecipe && progress != null && <ProgressBar pct={progress} />}
            <button
              className="btn btn--primary btn--block btn--lg"
              disabled={loadingRecipe || entries.length === 0}
              onClick={() => void generateRecipe()}
            >
              {loadingRecipe ? (
                <>
                  <span className="spinner" /> Montando a receita…
                  {progress != null ? ` ${progress}%` : ''}
                </>
              ) : (
                <>Reavaliar Receita</>
              )}
            </button>
            <p className="center faint" style={{ fontSize: 12, marginTop: 8 }}>
              {resolved} de {entries.length} confirmados · itens não marcados entram como “tenho”
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
