import { useState } from 'react';
import { TopBar } from '../components/TopBar';
import { formatDuration } from '../lib/format';
import { useApp } from '../store/useAppStore';
import type { RecipeStep } from '../types';

function StepBadges({ step }: { step: RecipeStep }) {
  return (
    <div className="step__top">
      <span className="step__n">{step.n}</span>
      {step.title && <span className="step__title">{step.title}</span>}
      {step.equipment && <span className="badge badge--equip">{step.equipment}</span>}
      {step.heat && <span className="badge badge--heat">🔥 {step.heat}</span>}
      {step.durationSeconds != null && (
        <span className="badge badge--time">⏱ {formatDuration(step.durationSeconds)}</span>
      )}
    </div>
  );
}

export function RecipePage() {
  const recipe = useApp((s) => s.recipe);
  const recipeStale = useApp((s) => s.recipeStale);
  const busy = useApp((s) => s.busy);
  const progress = useApp((s) => s.progress);
  const entries = useApp((s) => s.entries);
  const go = useApp((s) => s.go);
  const generateRecipe = useApp((s) => s.generateRecipe);
  const saveCurrent = useApp((s) => s.saveCurrent);
  const startNew = useApp((s) => s.startNew);
  const [justSaved, setJustSaved] = useState(false);

  if (!recipe) {
    return (
      <div className="app-shell">
        <TopBar onBack={() => go('home')} title="Sugestão do Chef" />
        <main className="screen">
          <p className="empty">Nenhuma receita gerada ainda.</p>
        </main>
      </div>
    );
  }

  const reavaliando = busy === 'recipe';

  return (
    <div className="app-shell">
      <TopBar
        onBack={() => go(entries.length ? 'checklist' : 'home')}
        title="Sugestão do Chef"
        right={
          <button className="btn btn--quiet" onClick={startNew}>
            nova
          </button>
        }
      />
      <main className="screen">
        <div className="recipe-head">
          <h1 className="recipe-name">{recipe.recipeName}</h1>
          {recipe.servings && <div className="recipe-servings">{recipe.servings}</div>}
        </div>

        {recipeStale && (
          <div className="stale-banner">
            <span>Você mudou o checklist. Reavalie para atualizar a receita.</span>
            <button
              className="btn btn--primary"
              disabled={reavaliando}
              onClick={() => void generateRecipe()}
            >
              {reavaliando ? (
                <>
                  <span className="spinner" />
                  {progress != null ? ` ${progress}%` : ''}
                </>
              ) : (
                'Reavaliar'
              )}
            </button>
          </div>
        )}

        {recipe.summary && <p className="prose">{recipe.summary}</p>}

        {recipe.warnings.map((w, i) => (
          <div className="warning" key={i}>
            <span aria-hidden>⚠</span>
            <span>{w}</span>
          </div>
        ))}

        {recipe.flavorExplanation && (
          <div className="sec">
            <div className="sec-title">Sabores</div>
            <p className="prose">{recipe.flavorExplanation}</p>
          </div>
        )}

        {recipe.miseEnPlace.length > 0 && (
          <div className="sec">
            <div className="sec-title">Mise en place</div>
            <ul className="bullets">
              {recipe.miseEnPlace.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="sec">
          <div className="sec-title">Preparo</div>
          {recipe.steps.map((step) => (
            <div className="step" key={step.n}>
              <StepBadges step={step} />
              <p className="step__instruction">{step.instruction}</p>
              {step.controlPoints.length > 0 && (
                <p className="note note--ctrl">
                  <b>Observe:</b> {step.controlPoints.join(' · ')}
                </p>
              )}
              {step.adjustments.length > 0 && (
                <p className="note note--adj">
                  <b>Ajuste:</b> {step.adjustments.join(' · ')}
                </p>
              )}
              {step.scientificNote && <p className="note note--sci">{step.scientificNote}</p>}
            </div>
          ))}
        </div>

        {recipe.pairings.length > 0 && (
          <div className="sec">
            <div className="sec-title">Harmonização</div>
            <ul className="bullets">
              {recipe.pairings.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="action-bar stack">
          <button className="btn btn--primary btn--block btn--lg" onClick={() => go('souschef')}>
            ▶ Ativar modo sous-chef
          </button>
          <button
            className="btn btn--ghost btn--block"
            onClick={() => {
              saveCurrent();
              setJustSaved(true);
            }}
            disabled={justSaved}
          >
            {justSaved ? '✓ Receita salva' : '♥ Salvar receita'}
          </button>
        </div>
      </main>
    </div>
  );
}
