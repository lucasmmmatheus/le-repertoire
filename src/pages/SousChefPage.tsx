import { useEffect, useState } from 'react';
import { ai } from '../ai';
import { ErrorNote } from '../components/ErrorNote';
import { errorMessage } from '../lib/errors';
import { formatClock } from '../lib/format';
import { requestNotifyPermission } from '../lib/notify';
import { armAudio } from '../lib/sound';
import { useApp } from '../store/useAppStore';
import { remainingMs, useTimers } from '../store/useTimers';
import type { QuickHelp, RecipeStep } from '../types';

function StepTimer({
  stepN,
  durationSeconds,
  label,
}: {
  stepN: number;
  durationSeconds: number;
  label: string;
}) {
  const now = useTimers((s) => s.now);
  const timer = useTimers((s) => s.timers[stepN]);
  const ensure = useTimers((s) => s.ensure);
  const start = useTimers((s) => s.start);
  const pause = useTimers((s) => s.pause);
  const reset = useTimers((s) => s.reset);

  useEffect(() => {
    ensure(stepN, durationSeconds, label);
  }, [stepN, durationSeconds, label, ensure]);

  const status = timer?.status ?? 'idle';
  const ms = timer ? remainingMs(timer, now) : durationSeconds * 1000;

  function handleStart() {
    armAudio(); // destrava o áudio dentro do gesto
    requestNotifyPermission();
    start(stepN);
  }

  return (
    <div className={`timer ${status === 'done' ? 'timer--ringing' : ''}`}>
      <div className="timer__time">{formatClock(ms / 1000)}</div>
      <div className="row timer__btn" style={{ gap: 8 }}>
        {status === 'running' ? (
          <button className="btn btn--ghost" onClick={() => pause(stepN)}>
            Pausar
          </button>
        ) : (
          <button className="btn btn--primary" onClick={handleStart}>
            {status === 'paused' ? 'Retomar' : status === 'done' ? '↺ De novo' : '▶ Iniciar'}
          </button>
        )}
        {status !== 'idle' && (
          <button className="btn btn--quiet" onClick={() => reset(stepN)}>
            Zerar
          </button>
        )}
      </div>
    </div>
  );
}

function HelpSheet({ step, onClose }: { step: RecipeStep; onClose: () => void }) {
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickHelp | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!problem.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const help = await ai.quickHelp({
        stepInstruction: step.instruction,
        equipment: step.equipment,
        heat: step.heat,
        problem: problem.trim(),
      });
      setResult(help);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="sheet__title">Ajuda rápida</div>
          <button className="iconbtn iconbtn--sm" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        {!result && (
          <>
            <textarea
              className="textarea"
              placeholder="O que está acontecendo? Ex: o molho está talhando…"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={3}
              autoFocus
            />
            {error && <ErrorNote message={error} />}
            <button className="btn btn--primary btn--block" disabled={loading || !problem.trim()} onClick={() => void submit()}>
              {loading ? (
                <>
                  <span className="spinner" /> Pensando…
                </>
              ) : (
                'Pedir ajuda'
              )}
            </button>
          </>
        )}

        {result && (
          <div className="stack fadein">
            <p className="prose" style={{ color: 'var(--ink)' }}>
              <b>{result.diagnosis}</b>
            </p>
            <ul className="bullets">
              {result.fixSteps.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            <button className="btn btn--ghost btn--block" onClick={onClose}>
              Entendi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SousChefPage() {
  const recipe = useApp((s) => s.recipe);
  const go = useApp((s) => s.go);
  const [index, setIndex] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const now = useTimers((s) => s.now);
  const timers = useTimers((s) => s.timers);

  if (!recipe || recipe.steps.length === 0) {
    return (
      <div className="app-shell">
        <main className="screen">
          <p className="empty">Nenhum passo para mostrar.</p>
          <button className="btn btn--ghost btn--block" onClick={() => go('recipe')}>
            Voltar
          </button>
        </main>
      </div>
    );
  }

  const steps = recipe.steps;
  const step = steps[index]!;
  const isLast = index === steps.length - 1;

  // Cronômetros vivos de OUTROS passos — feedback de que algo roda em segundo plano.
  const bgTimers = steps
    .filter((s) => s.n !== step.n)
    .map((s) => ({ s, t: timers[s.n] }))
    .filter(({ t }) => t && (t.status === 'running' || t.status === 'done'));

  return (
    <div className="stories">
      <div className="story__progress">
        {steps.map((s, i) => (
          <span
            key={s.n}
            className={[
              'story__dot',
              i === index && 'story__dot--on',
              i < index && 'story__dot--done',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>

      {bgTimers.length > 0 && (
        <div className="bg-timers">
          {bgTimers.map(({ s, t }) => (
            <button
              key={s.n}
              className={`bg-timer ${t!.status === 'done' ? 'bg-timer--done' : ''}`}
              onClick={() => setIndex(steps.findIndex((x) => x.n === s.n))}
            >
              ⏱ Passo {s.n} ·{' '}
              {t!.status === 'done' ? 'pronto!' : formatClock(remainingMs(t!, now) / 1000)}
            </button>
          ))}
        </div>
      )}

      <div className="story__head">
        <span className="story__count">
          Passo {index + 1} de {steps.length}
        </span>
        <button className="iconbtn iconbtn--sm" onClick={() => go('recipe')} aria-label="Sair">
          ✕
        </button>
      </div>

      <div className="story__body">
        {step.title && <div className="story__title">{step.title}</div>}
        <div className="story__badges">
          {step.equipment && <span className="badge badge--equip">{step.equipment}</span>}
          {step.heat && <span className="badge badge--heat">🔥 {step.heat}</span>}
        </div>
        <p className="story__instruction">{step.instruction}</p>
        {step.controlPoints.length > 0 && (
          <p className="story__ctrl">
            <b>Observe:</b> {step.controlPoints.join(' · ')}
          </p>
        )}
        {step.durationSeconds != null && (
          <StepTimer
            stepN={step.n}
            durationSeconds={step.durationSeconds}
            label={step.title ?? `Passo ${step.n}`}
          />
        )}
      </div>

      <div className="story__nav">
        <button
          className="btn btn--ghost"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ‹ Voltar
        </button>
        {isLast ? (
          <button className="btn btn--primary" onClick={() => go('recipe')}>
            Concluir ✓
          </button>
        ) : (
          <button className="btn btn--primary" onClick={() => setIndex((i) => i + 1)}>
            Próximo ›
          </button>
        )}
      </div>

      <button className="help-fab" onClick={() => setHelpOpen(true)} aria-label="Ajuda">
        ?
      </button>

      {helpOpen && <HelpSheet step={step} onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
