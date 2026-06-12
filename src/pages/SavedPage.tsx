import { TopBar } from '../components/TopBar';
import { useApp } from '../store/useAppStore';

export function SavedPage() {
  const saved = useApp((s) => s.saved);
  const loadSaved = useApp((s) => s.loadSaved);
  const removeSaved = useApp((s) => s.removeSaved);
  const go = useApp((s) => s.go);

  return (
    <div className="app-shell">
      <TopBar onBack={() => go('home')} title="Receitas salvas" />
      <main className="screen">
        {saved.length === 0 ? (
          <p className="empty">Nenhuma receita salva ainda.</p>
        ) : (
          <div className="list">
            {saved.map((r) => (
              <div className="item saved-card" key={r.id}>
                <button className="saved-card__body" onClick={() => loadSaved(r)}>
                  <div className="saved-card__name">{r.recipe.recipeName}</div>
                  <div className="saved-card__meta">
                    {r.input.query} · {new Date(r.savedAt).toLocaleDateString('pt-BR')}
                  </div>
                </button>
                <button
                  className="iconbtn iconbtn--sm"
                  onClick={() => removeSaved(r.id)}
                  aria-label="Excluir"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
